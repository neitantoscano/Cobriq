import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/* Mercado Pago regresa aqui despues de que el dueno autoriza.
   Cambiamos el codigo por el token y lo guardamos. */

export async function GET(request) {
  const url    = new URL(request.url);
  const origen = url.origin;

  const code  = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const negado = url.searchParams.get("error");

  const volver = (motivo) =>
    NextResponse.redirect(`${origen}/?mp=${motivo}`);

  // El dueno le dio cancelar en Mercado Pago
  if (negado || !code) return volver("cancelado");

  /* Comprobar que el 'state' es el mismo que mandamos.
     Si no coincide, alguien esta intentando meter mano. */
  const guardado = request.cookies.get("mp_state")?.value;
  if (!state || !guardado || state !== guardado) {
    return volver("invalido");
  }

  const ownerId = state.split(".")[0];
  if (!ownerId) return volver("invalido");

  try {
    /* 1. Cambiar el codigo por el token del dueno */
    const r = await fetch("https://api.mercadopago.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: process.env.MP_CLIENT_ID,
        client_secret: process.env.MP_CLIENT_SECRET,
        code,
        redirect_uri: `${origen}/api/mp/callback`,
      }),
    });

    const datos = await r.json();

    if (!r.ok || !datos.access_token) {
      console.error("MP callback fallo:", r.status);
      return volver("fallo");
    }

    /* 2. Guardar con la llave de servicio.
       mp_accounts tiene RLS sin politicas: solo entra por aqui. */
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } }
    );

    const vence = datos.expires_in
      ? new Date(Date.now() + datos.expires_in * 1000).toISOString()
      : null;

    const { error: errCuenta } = await admin
      .from("mp_accounts")
      .upsert({
        owner_id: ownerId,
        mp_user_id: String(datos.user_id ?? ""),
        access_token: datos.access_token,
        refresh_token: datos.refresh_token ?? null,
        public_key: datos.public_key ?? null,
        expires_at: vence,
        updated_at: new Date().toISOString(),
      });

    if (errCuenta) {
      console.error("No se guardo la cuenta MP");
      return volver("fallo");
    }

    /* 3. Prender la bandera que si ve el dueno */
    await admin
      .from("profiles")
      .update({ mp_connected: true })
      .eq("id", ownerId);

    const ok = NextResponse.redirect(`${origen}/?mp=listo`);
    ok.cookies.delete("mp_state");
    return ok;

  } catch (e) {
    console.error("MP callback excepcion");
    return volver("fallo");
  }
}
