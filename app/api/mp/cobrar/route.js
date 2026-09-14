import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/* El deudor pica "Pagar ahora" y esto genera la orden en
   Mercado Pago usando el token del dueno.
   Sigue en modo diagnostico: devuelve el detalle a la pantalla. */

const admin = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );

async function tokenVigente(sb, cuenta) {
  const margen = 5 * 60 * 1000;
  const vence  = cuenta.expires_at ? new Date(cuenta.expires_at).getTime() : 0;

  if (vence && vence - margen > Date.now()) return cuenta.access_token;
  if (!cuenta.refresh_token) return cuenta.access_token;

  const r = await fetch("https://api.mercadopago.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      grant_type: "refresh_token",
      client_id: process.env.MP_CLIENT_ID,
      client_secret: process.env.MP_CLIENT_SECRET,
      refresh_token: cuenta.refresh_token,
    }),
  });

  const d = await r.json();
  if (!r.ok || !d.access_token) return cuenta.access_token;

  await sb.from("mp_accounts").update({
    access_token: d.access_token,
    refresh_token: d.refresh_token ?? cuenta.refresh_token,
    expires_at: d.expires_in
      ? new Date(Date.now() + d.expires_in * 1000).toISOString()
      : null,
    updated_at: new Date().toISOString(),
  }).eq("owner_id", cuenta.owner_id);

  return d.access_token;
}

export async function POST(request) {
  const origen = new URL(request.url).origin;

  const malo = (mensaje, detalle) =>
    NextResponse.json({ ok: false, error: mensaje, detalle }, { status: 200 });

  try {
    const cuerpo = await request.json();
    const token  = String(cuerpo?.token ?? "").trim();
    const monto  = Number(cuerpo?.montoPesos);

    if (!token) return malo("Link invalido.");
    if (!monto || monto <= 0) return malo("El monto debe ser mayor a cero.");

    const sb = admin();

    const { data: deuda } = await sb
      .from("debts")
      .select("id, owner_id, concept, amount_cents, paid_cents, status, customer_id")
      .eq("public_token", token)
      .eq("status", "pending")
      .maybeSingle();

    if (!deuda) return malo("Este link ya no esta activo.");

    const saldo = deuda.amount_cents - deuda.paid_cents;
    const centavos = Math.round(monto * 100);

    if (centavos > saldo) return malo("El monto es mayor a lo que debes.");

    const { data: cuenta } = await sb
      .from("mp_accounts")
      .select("*")
      .eq("owner_id", deuda.owner_id)
      .maybeSingle();

    if (!cuenta) return malo("Este negocio todavia no acepta pagos en linea.");

    const accessToken = await tokenVigente(sb, cuenta);

    const { data: cliente } = await sb
      .from("customers")
      .select("name, email")
      .eq("id", deuda.customer_id)
      .maybeSingle();

    const importe    = (centavos / 100).toFixed(2);
    const referencia = `cobriq_${deuda.id}_${Date.now()}`;

    /* Estructura corregida segun el error que devolvio MP:
       - items NO acepta unit_measure ni total_amount
       - el monto va dentro de transactions.payments */
    const peticion = {
      type: "online",
      processing_mode: "automatic",
      total_amount: importe,
      external_reference: referencia,
      payer: {
        email: cliente?.email || "comprador@cobriq.mx",
      },
      transactions: {
        payments: [
          { amount: importe },
        ],
      },
      items: [
        {
          title: (deuda.concept || "Pago de adeudo").slice(0, 60),
          unit_price: importe,
          quantity: 1,
        },
      ],
      config: {
        notification_url: `${origen}/api/mp/webhook`,
        online: {
          success_url: `${origen}/d/${token}?pago=listo`,
          failure_url: `${origen}/d/${token}?pago=fallo`,
          pending_url: `${origen}/d/${token}?pago=pendiente`,
          auto_return: "approved",
        },
      },
    };

    const r = await fetch("https://api.mercadopago.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
        "X-Idempotency-Key": crypto.randomUUID(),
      },
      body: JSON.stringify(peticion),
    });

    const crudo = await r.text();
    let orden = null;
    try { orden = JSON.parse(crudo); } catch { /* no era JSON */ }

    if (!r.ok) {
      return malo(
        "No se pudo generar el cobro.",
        `HTTP ${r.status} · ${crudo.slice(0, 500)}`
      );
    }

    const liga =
      orden?.checkout_url ||
      orden?.init_point ||
      orden?.sandbox_init_point ||
      orden?.type_response?.checkout_url ||
      orden?.transactions?.payments?.[0]?.payment_url ||
      null;

    if (!liga) {
      return malo(
        "No se pudo generar el cobro.",
        `Sin liga · campos: ${Object.keys(orden || {}).join(", ")} · ${crudo.slice(0, 400)}`
      );
    }

    return NextResponse.json({ ok: true, url: liga });

  } catch (e) {
    return malo("No se pudo generar el cobro.", `Excepcion: ${e.message}`);
  }
}
