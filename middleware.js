import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

/* El portero de Cobriq.
   Corre antes de cada pagina. Si no hay sesion, manda al login.
   Tambien refresca la sesion para que no se caiga sola. */

const PUBLICAS = ["/login", "/registro", "/d"];

export async function middleware(request) {
  let respuesta = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(lista) {
          lista.forEach(({ name, value }) => request.cookies.set(name, value));
          respuesta = NextResponse.next({ request });
          lista.forEach(({ name, value, options }) =>
            respuesta.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // No quitar: refresca la sesion en cada visita.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const ruta = request.nextUrl.pathname;
  const esPublica = PUBLICAS.some((p) => ruta === p || ruta.startsWith(p + "/"));

  // Sin sesion y en ruta privada: al login
  if (!user && !esPublica) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Con sesion y en el login: al panel
  if (user && (ruta === "/login" || ruta === "/registro")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return respuesta;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
