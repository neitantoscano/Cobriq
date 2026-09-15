"use client";

import { crearCliente } from "../lib/supabase/client";

/* Todo lo que toca la base para los cobros sueltos.
   Un cobro vive en la misma tabla que las deudas pero con
   kind = 'cobro': lleva nombre de quien paga, no lleva
   cliente registrado y no vence. */

const sb = () => crearCliente();

/* Pesos a centavos sin usar decimales flotantes.
   "1,250.50" -> 125050. Trabajar con floats en dinero
   termina en centavos perdidos. */
export function aCentavosCobro(valor) {
  if (typeof valor === "number") return Math.round(valor * 100);

  const limpio = String(valor ?? "")
    .replace(/[^0-9.,-]/g, "")
    .replace(/,/g, "");

  if (limpio === "" || limpio === "-") return 0;

  const partes = limpio.split(".");
  const enteros = partes[0] || "0";
  const decimales = (partes[1] ?? "").slice(0, 2).padEnd(2, "0");

  const n = parseInt(enteros, 10);
  if (!Number.isFinite(n)) return 0;

  const signo = enteros.trim().startsWith("-") ? -1 : 1;
  return signo * (Math.abs(n) * 100 + parseInt(decimales, 10));
}

export async function crearCobroNuevo({ nombre, concepto, montoPesos }) {
  if (!nombre?.trim())   throw new Error("Escribe el nombre de quien paga.");
  if (!concepto?.trim()) throw new Error("Escribe que esta pagando.");

  const centavos = aCentavosCobro(montoPesos);
  if (centavos <= 0) throw new Error("El monto tiene que ser mayor a cero.");

  const s = sb();
  const { data: { user } } = await s.auth.getUser();
  if (!user) throw new Error("Tu sesion expiro. Vuelve a entrar.");

  const { data, error } = await s
    .from("debts")
    .insert({
      owner_id: user.id,
      kind: "cobro",
      payer_name: nombre.trim(),
      concept: concepto.trim(),
      amount_cents: centavos,
      customer_id: null,
      due_date: null,
    })
    .select()
    .single();

  if (error) {
    /* Si el plan vencio, el RLS bloquea los registros nuevos.
       Vale la pena decirlo claro en vez de "algo fallo". */
    throw new Error(
      error.message?.includes("policy")
        ? "Tu plan no esta activo, por eso no puedes crear cobros nuevos."
        : "No se pudo crear el cobro."
    );
  }

  return data;
}

export async function cancelarCobro(id) {
  const { error } = await sb()
    .from("debts")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("kind", "cobro");

  if (error) throw new Error("No se pudo cancelar el cobro.");
}

/* El link que se le manda a quien va a pagar.
   Es el mismo que ya usan las deudas. */
export function linkDeCobro(cobro, origen) {
  return `${origen}/d/${cobro.public_token}`;
}
