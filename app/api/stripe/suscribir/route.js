import { NextResponse } from "next/server";
import Stripe from "stripe";
import { crearClienteServidor } from "../../../../lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

/* Manda al dueno a pagar su plan de Cobriq en Stripe. */

export async function GET(request) {
  const origen = new URL(request.url).origin;

  try {
    const supabase = await crearClienteServidor();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.redirect(`${origen}/login`);

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } }
    );

    const { data: perfil } = await admin
      .from("profiles")
      .select("stripe_customer_id, business_name")
      .eq("id", user.id)
      .maybeSingle();

    /* Reusar el cliente de Stripe si ya existe, para no
       crear uno nuevo cada vez que abre el checkout. */
    let customerId = perfil?.stripe_customer_id;

    if (!customerId) {
      const cliente = await stripe.customers.create({
        email: user.email,
        name: perfil?.business_name || undefined,
        metadata: { owner_id: user.id },
      });
      customerId = cliente.id;

      await admin
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id);
    }

    const sesion = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      success_url: `${origen}/?plan=listo`,
      cancel_url: `${origen}/?plan=cancelado`,
      locale: "es",
      allow_promotion_codes: true,
      client_reference_id: user.id,
      subscription_data: {
        metadata: { owner_id: user.id },
      },
    });

    return NextResponse.redirect(sesion.url, { status: 303 });

  } catch (e) {
    console.error("stripe suscribir:", e.message);
    return NextResponse.redirect(`${origen}/?plan=fallo`);
  }
}
