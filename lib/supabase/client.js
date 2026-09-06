"use client";

import { createBrowserClient } from "@supabase/ssr";

/* Conexion a Supabase desde el navegador.
   Usa la llave anon, que es publica a proposito.
   La seguridad real la pone el RLS de la base de datos. */

export function crearCliente() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
