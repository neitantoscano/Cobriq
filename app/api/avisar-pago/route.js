import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { mandarCorreo, envoltura, boton, pesosCorreo } from "../../../lib/correo";

/* Le avisa al dueno que alguien reporto un pago por fuera.
   La llama la pantalla del deudor justo despues de reportarlo.

   Ojo: cualquiera con el link puede llamarla, asi que solo
   manda correo si de verdad hay un pago recien reportado.
   Sin eso, alguien podria llenarle el correo al dueno. */

export const runtime = "nodejs";

const VENTANA_MS = 2 * 60 * 1000; // 2 minutos

export async function POST(request) {
  try {
    const { token } = await request.json();
    if (!token) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } }
    );

    /* La deuda del link */
    const { data: deuda } = await admin
      .from("debts")
      .select("id, owner_id, customer_id, concept, kind, payer_name, amount_cents, paid_cents")
      .eq("public_token", token)
      .neq("status", "cancelled")
      .maybeSingle();

    if (!deuda) return NextResponse.json({ ok: false }, { status: 404 });

    /* El pago reportado mas reciente */
    const { data: pago } = await admin
      .from("payments")
      .select("amount_cents, method, created_at")
      .eq("debt_id", deuda.id)
      .eq("status", "pending_review")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!pago) return NextResponse.json({ ok: true, enviado: false });

    /* Si el pago no es de hace ratito, no se manda nada.
       Esto es lo que evita que alguien pique mil veces. */
    const edad = Date.now() - new Date(pago.created_at).getTime();
    if (edad > VENTANA_MS) {
      return NextResponse.json({ ok: true, enviado: false });
    }

    /* A quien le avisamos */
    const { data: perfil } = await admin
      .from("profiles")
      .select("email, business_name")
      .eq("id", deuda.owner_id)
      .maybeSingle();

    if (!perfil?.email) return NextResponse.json({ ok: true, enviado: false });

    /* Quien dice que pago */
    let quien = deuda.payer_name;
    if (!quien && deuda.customer_id) {
      const { data: cliente } = await admin
        .from("customers")
        .select("name")
        .eq("id", deuda.customer_id)
        .maybeSingle();
      quien = cliente?.name;
    }
    quien = quien || "Alguien";

    const monto   = pesosCorreo(pago.amount_cents);
    const metodos = {
      transferencia: "transferencia",
      efectivo: "efectivo",
      deposito: "deposito en banco",
      otro: "otro medio",
    };
    const comoPago = metodos[pago.method] || pago.method || "otro medio";

    const origen = new URL(request.url).origin;

    const html = envoltura({
      titulo: `${quien} dice que te pago ${monto}`,
      cuerpo: `
        <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#333333;">
          Reporto un pago en <strong>${comoPago}</strong> por
          <strong>${monto}</strong>, del concepto "${deuda.concept}".
        </p>
        <p style="margin:0 0 4px;font-size:15px;line-height:1.55;color:#333333;">
          Revisa que el dinero si te haya llegado antes de confirmarlo.
          El saldo se actualiza hasta que tu lo confirmes.
        </p>
        ${boton("Revisar el pago", origen + "/")}
      `,
      pie: "Te llega porque alguien reporto un pago en tu cuenta de Cobriq.",
    });

    const texto =
      `${quien} dice que te pago ${monto} en ${comoPago}, del concepto "${deuda.concept}". ` +
      `Revisa que el dinero te haya llegado y confirmalo en ${origen}`;

    const r = await mandarCorreo({
      para: perfil.email,
      asunto: `${quien} dice que te pago ${monto}`,
      html,
      texto,
    });

    return NextResponse.json({ ok: true, enviado: r.ok === true });
  } catch (e) {
    /* Que falle el aviso no debe romperle nada al deudor:
       su pago ya quedo reportado antes de llegar aqui. */
    console.error("avisar-pago:", e.message);
    return NextResponse.json({ ok: true, enviado: false });
  }
}
