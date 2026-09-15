import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

/* Stripe avisa aqui cuando alguien paga, renueva o cancela. */

export const runtime = "nodejs";

const admin = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );

export async function POST(request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const firma  = request.headers.get("stripe-signature");
  const crudo  = await request.text();

  let evento;
  try {
    /* Verificar que el aviso viene de Stripe de verdad.
       Sin esto, cualquiera podria activar cuentas gratis. */
    evento = stripe.webhooks.constructEvent(
      crudo,
      firma,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (e) {
    console.error("stripe firma invalida");
    return NextResponse.json({ error: "firma invalida" }, { status: 400 });
  }

  const sb = admin();

  const porCustomer = async (customerId, cambios) => {
    if (!customerId) return;
    await sb.from("profiles").update(cambios).eq("stripe_customer_id", customerId);
  };

  try {
    switch (evento.type) {

      case "checkout.session.completed": {
        const s = evento.data.object;
        if (s.mode !== "subscription") break;

        const sub = await stripe.subscriptions.retrieve(s.subscription);

        await sb.from("profiles").update({
          plan: "active",
          stripe_customer_id: s.customer,
          stripe_subscription_id: sub.id,
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        }).eq("id", s.client_reference_id);
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.created": {
        const sub = evento.data.object;

        const plan =
          sub.status === "active" || sub.status === "trialing" ? "active"
          : sub.status === "past_due" || sub.status === "unpaid" ? "past_due"
          : "canceled";

        await porCustomer(sub.customer, {
          plan,
          stripe_subscription_id: sub.id,
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        });
        break;
      }

      case "customer.subscription.deleted": {
        const sub = evento.data.object;
        await porCustomer(sub.customer, {
          plan: "canceled",
          stripe_subscription_id: null,
        });
        break;
      }

      case "invoice.payment_succeeded": {
        const f = evento.data.object;
        if (!f.subscription) break;
        const sub = await stripe.subscriptions.retrieve(f.subscription);
        await porCustomer(f.customer, {
          plan: "active",
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        });
        break;
      }

      case "invoice.payment_failed": {
        const f = evento.data.object;
        await porCustomer(f.customer, { plan: "past_due" });
        break;
      }
    }
  } catch (e) {
    console.error("stripe webhook:", evento.type, e.message);
  }

  return NextResponse.json({ recibido: true });
}
