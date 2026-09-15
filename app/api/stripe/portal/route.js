import { NextResponse } from "next/server";
import Stripe from "stripe";
import { crearClienteServidor } from "../../../../lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

/* Abre el portal de Stripe donde el dueno puede cancelar su plan,
   cambiar de tarjeta o ver sus recibos. */

export async function GET(request) {
  const origen = new URL(request.url).origin;

  try {
    const supabase = await crearClienteServidor();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.redirect(`${origen}/login`);

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } }
    );

    const { data: perfil } = await admin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle();

    /* Si nunca ha pagado no tiene cliente en Stripe,
       asi que no hay nada que administrar. */
    if (!perfil?.stripe_customer_id) {
      return NextResponse.redirect(`${origen}/?plan=sincuenta`);
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    const sesion = await stripe.billingPortal.sessions.create({
      customer: perfil.stripe_customer_id,
      return_url: `${origen}/?vista=ajustes`,
      locale: "es",
    });

    return NextResponse.redirect(sesion.url, { status: 303 });

  } catch (e) {
    console.error("stripe portal:", e.message);
    return NextResponse.redirect(`${origen}/?plan=fallo`);
  }
}
