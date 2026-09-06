"use client";

import { crearCliente } from "../lib/supabase/client";

/* ------------------------------------------------------------------
   COBRIQ · Acciones contra Supabase
   Aqui vive TODO lo que lee o escribe en la base.
   Las pantallas nunca hablan con Supabase directo.

   Regla del dinero: en la base se guardan CENTAVOS (enteros).
   En pantalla se muestran pesos. La conversion pasa aqui.
------------------------------------------------------------------- */

const sb = () => crearCliente();

/* ---------------------------- dinero ---------------------------- */

export const aCentavos = (pesos) => Math.round(Number(pesos || 0) * 100);
export const aPesos    = (centavos) => Number(centavos || 0) / 100;

export const pesos = (centavos) =>
  aPesos(centavos).toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

/* ---------------------------- fechas ---------------------------- */

export const hoyISO = () => new Date().toISOString().slice(0, 10);

export const diasDeAtraso = (vence) => {
  const hoy = new Date(hoyISO() + "T00:00:00");
  const fin = new Date(vence + "T00:00:00");
  return Math.floor((hoy - fin) / 86400000);
};

export const fechaCorta = (s) =>
  new Date(s + "T00:00:00").toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
  });

/* --------------------------- validacion -------------------------- */

export const limpiarTelefono = (t) => (t || "").replace(/\D/g, "");

export const telefonoValido = (t) => {
  const n = limpiarTelefono(t);
  return n.length === 0 || (n.length >= 10 && n.length <= 13);
};

export const correoValido = (c) =>
  !c || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.trim());

/* --------------------------- perfil ------------------------------ */

export async function traerPerfil() {
  const s = sb();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return null;

  const { data, error } = await s
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) throw new Error("No se pudo cargar tu negocio.");
  return { ...data, email: user.email };
}

export async function cerrarSesion() {
  await sb().auth.signOut();
}

/* --------------------------- ajustes ----------------------------- */

export async function traerAjustes() {
  const { data, error } = await sb()
    .from("reminder_settings")
    .select("*")
    .single();

  if (error) throw new Error("No se pudieron cargar los ajustes.");
  return data;
}

export async function guardarAjustes({ diasAntes, diasDespues, correoActivo, plantilla }) {
  const s = sb();
  const { data: { user } } = await s.auth.getUser();
  if (!user) throw new Error("Tu sesion expiro. Vuelve a entrar.");

  const { error } = await s
    .from("reminder_settings")
    .update({
      days_before: diasAntes,
      days_after: diasDespues,
      email_enabled: correoActivo,
      message_template: plantilla,
      updated_at: new Date().toISOString(),
    })
    .eq("owner_id", user.id);

  if (error) throw new Error("No se pudieron guardar los ajustes.");
}

/* --------------------------- clientes ---------------------------- */

export async function traerClientes() {
  const { data, error } = await sb()
    .from("customers")
    .select("*")
    .order("name");

  if (error) throw new Error("No se pudieron cargar los clientes.");
  return data ?? [];
}

export async function crearClienteNuevo({ nombre, telefono, correo }) {
  if (!nombre?.trim()) throw new Error("Escribe el nombre del cliente.");
  if (!telefonoValido(telefono)) throw new Error("Ese telefono no parece valido.");
  if (!correoValido(correo)) throw new Error("Ese correo no parece valido.");

  const s = sb();
  const { data: { user } } = await s.auth.getUser();
  if (!user) throw new Error("Tu sesion expiro. Vuelve a entrar.");

  const { data, error } = await s
    .from("customers")
    .insert({
      owner_id: user.id,
      name: nombre.trim(),
      phone: limpiarTelefono(telefono) || null,
      email: correo?.trim() || null,
    })
    .select()
    .single();

  if (error) throw new Error("No se pudo guardar el cliente.");
  return data;
}

export async function borrarCliente(id) {
  const { error } = await sb().from("customers").delete().eq("id", id);
  if (error) throw new Error("No se pudo borrar. Puede que tenga deudas activas.");
}

/* ---------------------------- deudas ----------------------------- */

export async function traerDeudas() {
  const { data, error } = await sb()
    .from("debts_view")
    .select("*")
    .order("due_date", { ascending: true });

  if (error) throw new Error("No se pudieron cargar las deudas.");
  return data ?? [];
}

export async function crearDeudaNueva({ clienteId, concepto, montoPesos, vence }) {
  if (!clienteId) throw new Error("Elige un cliente.");
  if (!concepto?.trim()) throw new Error("Escribe el concepto.");

  const centavos = aCentavos(montoPesos);
  if (centavos <= 0) throw new Error("El monto tiene que ser mayor a cero.");
  if (!vence) throw new Error("Elige la fecha de vencimiento.");

  const s = sb();
  const { data: { user } } = await s.auth.getUser();
  if (!user) throw new Error("Tu sesion expiro. Vuelve a entrar.");

  const { data, error } = await s
    .from("debts")
    .insert({
      owner_id: user.id,
      customer_id: clienteId,
      concept: concepto.trim(),
      amount_cents: centavos,
      due_date: vence,
    })
    .select()
    .single();

  if (error) throw new Error("No se pudo guardar la deuda.");
  return data;
}

export async function cancelarDeuda(id) {
  const { error } = await sb()
    .from("debts")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw new Error("No se pudo cancelar la deuda.");
}

/* ----------------------------- pagos ----------------------------- */

export async function traerPagos() {
  const { data, error } = await sb()
    .from("payments")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error("No se pudieron cargar los pagos.");
  return data ?? [];
}

export async function registrarPagoNuevo({ deudaId, montoPesos, metodo, saldoCentavos }) {
  const centavos = aCentavos(montoPesos);
  if (centavos <= 0) throw new Error("El monto tiene que ser mayor a cero.");
  if (centavos > saldoCentavos) throw new Error("El pago no puede ser mayor al saldo.");

  const s = sb();
  const { data: { user } } = await s.auth.getUser();
  if (!user) throw new Error("Tu sesion expiro. Vuelve a entrar.");

  const { data, error } = await s
    .from("payments")
    .insert({
      owner_id: user.id,
      debt_id: deudaId,
      amount_cents: centavos,
      method: metodo,
      status: "confirmed",
      reported_by: "owner",
      paid_at: hoyISO(),
    })
    .select()
    .single();

  if (error) throw new Error("No se pudo registrar el pago.");
  return data;
}

export async function confirmarPagoReportado(pagoId) {
  const { error } = await sb()
    .from("payments")
    .update({ status: "confirmed" })
    .eq("id", pagoId)
    .eq("status", "pending_review");

  if (error) throw new Error("No se pudo confirmar el pago.");
}

export async function rechazarPagoReportado(pagoId) {
  const { error } = await sb()
    .from("payments")
    .update({ status: "rejected" })
    .eq("id", pagoId)
    .eq("status", "pending_review");

  if (error) throw new Error("No se pudo rechazar el pago.");
}

/* ------------------------- recordatorios ------------------------- */

export async function traerRecordatorios() {
  const { data, error } = await sb()
    .from("reminders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw new Error("No se pudo cargar el historial.");
  return data ?? [];
}

export function armarMensaje({ plantilla, cliente, deuda, saldoCentavos, origen }) {
  const link = deuda.public_token ? `${origen}/d/${deuda.public_token}` : "";
  return (plantilla || "")
    .replace(/{nombre}/g, cliente?.name ?? "")
    .replace(/{saldo}/g, pesos(saldoCentavos))
    .replace(/{concepto}/g, deuda.concept ?? "")
    .replace(/{link}/g, link);
}

export async function anotarRecordatorio({ deudaId, clienteId, canal, texto }) {
  const s = sb();
  const { data: { user } } = await s.auth.getUser();
  if (!user) throw new Error("Tu sesion expiro. Vuelve a entrar.");

  const { error } = await s.from("reminders").insert({
    owner_id: user.id,
    debt_id: deudaId,
    customer_id: clienteId,
    channel: canal,
    trigger_type: "manual",
    status: "sent",
    body: texto,
    scheduled_for: hoyISO(),
    sent_at: new Date().toISOString(),
  });

  if (error) throw new Error("El mensaje salio, pero no se pudo guardar en el historial.");
}

/* -------------------- carga inicial de todo ---------------------- */

export async function cargarTodo() {
  const [perfil, ajustes, clientes, deudas, pagos, recordatorios] = await Promise.all([
    traerPerfil(),
    traerAjustes(),
    traerClientes(),
    traerDeudas(),
    traerPagos(),
    traerRecordatorios(),
  ]);

  return { perfil, ajustes, clientes, deudas, pagos, recordatorios };
}
