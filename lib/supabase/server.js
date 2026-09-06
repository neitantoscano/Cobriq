import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/* Conexion a Supabase desde el servidor.
   Lee la sesion desde las cookies para saber quien esta logueado. */

export async function crearClienteServidor() {
  const galleta = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return galleta.getAll();
        },
        setAll(lista) {
          try {
            lista.forEach(({ name, value, options }) =>
              galleta.set(name, value, options)
            );
          } catch {
            // Pasa cuando se llama desde un Server Component.
            // El middleware refresca la sesion, asi que no afecta.
          }
        },
      },
    }
  );
}
