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

/* Stripe movio la fecha de renovacion: antes vivia en la suscripcion,
   ahora vive en cada item de la suscripcion. Buscamos en los dos
   lugares y nos quedamos con la fecha mas lejana. Si no hay ninguna,
   devolvemos null en vez de tronar. */
function finDePeriodo(sub) {
  const candidatos = [];

  const items = sub?.items?.data ?? [];
  for (const it of items) {
    if (typeof it?.current_period_end === "number") {
      candidatos.push(it.current_period_end);
    }
  }

  /* Por si algun dia vuelve, o si la cuenta usa una version vieja */
  if (typeof sub?.current_period_end === "number") {
    candidatos.push(sub.current_period_end);
  }

  if (candidatos.length === 0) return null;

  return new Date(Math.max(...candidatos) * 1000).toISOString();
}

/* Saca el id de la suscripcion de una factura. Tambien cambio de
   lugar entre versiones de la API, asi que revisamos ambos. */
function subDeFactura(f) {
  if (typeof f?.subscription === "string") return f.subscription;
  const anidado = f?.parent?.subscription_details?.subscription;
  if (typeof anidado === "string") return anidado;
  if (typeof anidado?.id === "string") return anidado.id;
  return null;
}

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
    console.error("stripe firma invalida:", e.message);
    return NextResponse.json({ error: "firma invalida" }, { status: 400 });
  }

  const sb = admin();

  /* Quita las llaves en null para no borrar datos buenos
     con valores vacios. */
  const limpiar = (obj) => {
    const salida = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v !== null && v !== undefined) salida[k] = v;
    }
    return salida;
  };

  const porCustomer = async (customerId, cambios) => {
    if (!customerId) {
      console.error("stripe webhook: evento sin customer", evento.type);
      return;
    }
    const { data, error } = await sb
      .from("profiles")
      .update(cambios)
      .eq("stripe_customer_id", customerId)
      .select("id");

    if (error) {
      console.error("stripe webhook supabase:", error.message);
      return;
    }
    if (!data || data.length === 0) {
      console.error("stripe webhook: ningun perfil con customer", customerId);
    }
  };

  try {
    switch (evento.type) {

      case "checkout.session.completed": {
        const s = evento.data.object;
        if (s.mode !== "subscription") break;

        const sub = await stripe.subscriptions.retrieve(s.subscription);

        const cambios = limpiar({
          plan: "active",
          stripe_customer_id: s.customer,
          stripe_subscription_id: sub.id,
          current_period_end: finDePeriodo(sub),
        });

        /* Aqui si sabemos exactamente de quien es, porque mandamos
           su id al abrir el checkout. */
        if (s.client_reference_id) {
          const { error } = await sb
            .from("profiles")
            .update(cambios)
            .eq("id", s.client_reference_id);
          if (error) console.error("stripe checkout supabase:", error.message);
        } else {
          await porCustomer(s.customer, cambios);
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.created": {
        const sub = evento.data.object;

        const plan =
          sub.status === "active" || sub.status === "trialing" ? "active"
          : sub.status === "past_due" || sub.status === "unpaid" ? "past_due"
          : "canceled";

        await porCustomer(sub.customer, limpiar({
          plan,
          stripe_subscription_id: sub.id,
          current_period_end: finDePeriodo(sub),
        }));
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
        const subId = subDeFactura(f);
        if (!subId) break;

        const sub = await stripe.subscriptions.retrieve(subId);

        await porCustomer(f.customer, limpiar({
          plan: "active",
          stripe_subscription_id: sub.id,
          current_period_end: finDePeriodo(sub),
        }));
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
