import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/* Mercado Pago avisa aqui cuando alguien paga.
   Cobriq confirma con MP y actualiza el saldo solo. */

const admin = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );

/* Siempre respondemos 200. Si devolvemos error, Mercado Pago
   reintenta durante horas y nos llena de ruido. */
const ok = () => NextResponse.json({ recibido: true }, { status: 200 });

export async function POST(request) {
  try {
    const aviso = await request.json().catch(() => ({}));

    /* Nos interesan los avisos de orden o de pago */
    const tipo = aviso?.type || aviso?.topic || "";
    const id   = String(aviso?.data?.id || aviso?.resource || "").split("/").pop();

    if (!id) return ok();
    if (!["payment", "order", "merchant_order"].includes(tipo)) return ok();

    const sb = admin();

    /* Probamos con cada cuenta conectada hasta que una reconozca
       el pago. MP no nos dice de quien es en el aviso. */
    const { data: cuentas } = await sb
      .from("mp_accounts")
      .select("owner_id, access_token");

    if (!cuentas?.length) return ok();

    let pago = null;
    let duenoId = null;

    for (const cuenta of cuentas) {
      const ruta =
        tipo === "payment"
          ? `https://api.mercadopago.com/v1/payments/${id}`
          : `https://api.mercadopago.com/v1/orders/${id}`;

      const r = await fetch(ruta, {
        headers: { Authorization: `Bearer ${cuenta.access_token}` },
      });

      if (r.ok) {
        pago = await r.json();
        duenoId = cuenta.owner_id;
        break;
      }
    }

    if (!pago || !duenoId) return ok();

    /* Solo nos importan los pagos aprobados */
    const estado =
      pago?.status ||
      pago?.transactions?.payments?.[0]?.status ||
      "";

    if (!["approved", "processed", "accredited"].includes(estado)) return ok();

    /* La referencia trae el id de la deuda: cobriq_UUID_timestamp */
    const referencia = String(pago?.external_reference || "");
    if (!referencia.startsWith("cobriq_")) return ok();

    const deudaId = referencia.split("_")[1];
    if (!deudaId) return ok();

    /* Cuanto pagaron */
    const importe = Number(
      pago?.transaction_amount ??
      pago?.total_amount ??
      pago?.transactions?.payments?.[0]?.amount ??
      0
    );

    if (!importe || importe <= 0) return ok();

    /* Confirmar que la deuda existe y es de ese dueno */
    const { data: deuda } = await sb
      .from("debts")
      .select("id, owner_id, amount_cents, paid_cents, status")
      .eq("id", deudaId)
      .eq("owner_id", duenoId)
      .maybeSingle();

    if (!deuda || deuda.status !== "pending") return ok();

    const centavos = Math.round(importe * 100);
    const saldo = deuda.amount_cents - deuda.paid_cents;

    /* Insertar el pago. El indice unico en provider_payment_id
       frena que se aplique dos veces si MP avisa repetido. */
    const { error } = await sb.from("payments").insert({
      owner_id: duenoId,
      debt_id: deuda.id,
      amount_cents: Math.min(centavos, saldo),
      method: "mercado pago",
      status: "confirmed",
      reported_by: "mercadopago",
      provider_payment_id: `mp_${id}`,
      paid_at: new Date().toISOString().slice(0, 10),
    });

    if (error && error.code !== "23505") {
      console.error("webhook insert fallo:", error.code);
    }

    return ok();

  } catch (e) {
    console.error("webhook excepcion");
    return ok();
  }
}

/* Mercado Pago a veces valida la URL con un GET */
export async function GET() {
  return NextResponse.json({ vivo: true }, { status: 200 });
}
