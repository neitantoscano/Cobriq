import { NextResponse } from "next/server";
import { crearClienteServidor } from "../../../../lib/supabase/server";

/* Manda al dueno a Mercado Pago para que autorice a Cobriq
   a generar cobros a su nombre. */

export async function GET(request) {
  const origen = new URL(request.url).origin;

  // Solo un dueno con sesion puede conectar su cuenta
  const supabase = await crearClienteServidor();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origen}/login`);
  }

  const clientId = process.env.MP_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(`${origen}/?mp=sin_config`);
  }

  /* El 'state' viaja a Mercado Pago y regresa igual.
     Sirve para saber quien volvio y para frenar ataques CSRF:
     guardamos una copia en cookie y al regresar las comparamos. */
  const azar = crypto.randomUUID();
  const state = `${user.id}.${azar}`;

  const url = new URL("https://auth.mercadopago.com.mx/authorization");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("platform_id", "mp");
  url.searchParams.set("state", state);
  url.searchParams.set("redirect_uri", `${origen}/api/mp/callback`);

  const respuesta = NextResponse.redirect(url.toString());

  respuesta.cookies.set("mp_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10 minutos, igual que el codigo de MP
  });

  return respuesta;
}
