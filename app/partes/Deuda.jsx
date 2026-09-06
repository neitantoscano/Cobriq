"use client";

import {
  ArrowLeft, Check, Clock, Wallet, MessageCircle, Mail, Link2, X,
} from "lucide-react";
import { pesos, diasDeAtraso, fechaCorta } from "../acciones";

/* Detalle de una deuda: saldo, historial de abonos,
   recordatorios enviados y el link publico del deudor. */

export default function Deuda({
  deuda,
  cliente,
  pagos,
  recordatorios,
  regresar,
  abrirModal,
  onWhatsApp,
  onCorreo,
  onCopiarLink,
  onConfirmarPago,
  onRechazarPago,
  onCancelar,
  ocupado,
}) {
  if (!deuda) return null;

  const atraso    = diasDeAtraso(deuda.due_date);
  const pagada    = deuda.status === "paid";
  const cancelada = deuda.status === "cancelled";
  const pct       = deuda.amount_cents ? (deuda.paid_cents / deuda.amount_cents) * 100 : 0;

  const misPagos = pagos.filter((p) => p.debt_id === deuda.id);
  const misRec   = recordatorios.filter((r) => r.debt_id === deuda.id);

  const tono = cancelada
    ? "var(--tenue)"
    : pagada
    ? "var(--verde)"
    : atraso > 0
    ? "var(--rojo)"
    : "var(--tinta)";

  const fondoTono = pagada
    ? "var(--verde-suave)"
    : atraso > 0 && !cancelada
    ? "var(--rojo-suave)"
    : "transparent";

  const etiquetaPago = {
    confirmed: "Confirmado",
    pending_review: "Por confirmar",
    rejected: "Rechazado",
  };

  return (
    <div className="surge">
      <button onClick={regresar}
        className="flex items-center gap-1.5 text-sm font-medium mb-5"
        style={{ background: "none", border: 0, cursor: "pointer", color: "var(--tenue)" }}>
        <ArrowLeft size={15} /> Volver
      </button>

      <p className="text-2xl font-bold tracking-tight">{deuda.customer_name}</p>
      <p className="text-sm mb-6" style={{ color: "var(--tenue)" }}>{deuda.concept}</p>

      <div className="rounded-lg p-5 mb-6"
           style={{ border: `1.5px solid ${tono}`, background: fondoTono }}>
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs mb-1" style={{ color: "var(--tenue)" }}>Saldo</p>
            <p className="num font-bold text-4xl leading-none" style={{ color: tono }}>
              {pesos(deuda.balance_cents)}
            </p>
          </div>

          {cancelada ? (
            <span className="chip chip-gris">Cancelada</span>
          ) : pagada ? (
            <span className="chip chip-verde">
              <Check size={11} strokeWidth={3} />Liquidada
            </span>
          ) : atraso > 0 ? (
            <span className="chip chip-rojo">
              <Clock size={11} strokeWidth={2.5} />
              {atraso} {atraso === 1 ? "dia" : "dias"} de atraso
            </span>
          ) : (
            <span className="chip chip-gris">Vence {fechaCorta(deuda.due_date)}</span>
          )}
        </div>

        <div className="h-1.5 rounded-full overflow-hidden mt-5"
             style={{ background: "rgba(0,0,0,.08)" }}>
          <div className="barra" style={{ width: `${pct}%`, background: tono }} />
        </div>
        <p className="text-xs mt-2" style={{ color: "var(--tenue)" }}>
          {pesos(deuda.paid_cents)} abonado de {pesos(deuda.amount_cents)}
        </p>

        {!pagada && !cancelada && (
          <div className="flex flex-wrap gap-2 mt-5">
            <button className="btn btn-solido flex items-center gap-1.5" disabled={ocupado}
              onClick={() => abrirModal({ tipo: "pago", deudaId: deuda.id })}>
              <Wallet size={15} /> Registrar pago
            </button>
            <button className="btn flex items-center gap-1.5" disabled={ocupado || !cliente?.phone}
              onClick={onWhatsApp}
              title={cliente?.phone ? "" : "Este cliente no tiene WhatsApp guardado"}>
              <MessageCircle size={15} /> WhatsApp
            </button>
            <button className="btn flex items-center gap-1.5" disabled={ocupado || !cliente?.email}
              onClick={onCorreo}
              title={cliente?.email ? "" : "Este cliente no tiene correo guardado"}>
              <Mail size={15} /> Correo
            </button>
            <button className="btn flex items-center gap-1.5" disabled={ocupado}
              onClick={onCopiarLink}>
              <Link2 size={15} /> Copiar link
            </button>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <section>
          <p className="font-semibold text-sm mb-3">Pagos</p>
          {misPagos.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--tenue)" }}>Sin pagos todavia.</p>
          ) : (
            misPagos.map((p) => (
              <div key={p.id}
                   className="flex justify-between items-start gap-3 py-2.5"
                   style={{
                     borderBottom: "1px solid var(--linea)",
                     opacity: p.status === "rejected" ? 0.45 : 1,
                   }}>
                <div className="min-w-0">
                  <p className="text-sm num font-semibold">{pesos(p.amount_cents)}</p>
                  <p className="text-xs" style={{ color: "var(--tenue)" }}>
                    {p.method} · {fechaCorta(p.paid_at)}
                    {p.reported_by === "customer" && " · lo reporto el cliente"}
                  </p>
                </div>

                {p.status === "pending_review" ? (
                  <div className="flex gap-1.5 shrink-0">
                    <button className="btn text-xs" disabled={ocupado}
                      onClick={() => onConfirmarPago(p.id)}>
                      <Check size={13} strokeWidth={3} />
                    </button>
                    <button className="btn text-xs" disabled={ocupado}
                      onClick={() => onRechazarPago(p.id)}>
                      <X size={13} strokeWidth={3} />
                    </button>
                  </div>
                ) : (
                  <span className="chip shrink-0"
                        style={{
                          borderColor: p.status === "confirmed" ? "var(--verde)" : "var(--linea)",
                          color: p.status === "confirmed" ? "var(--verde)" : "var(--tenue)",
                          background: p.status === "confirmed" ? "var(--verde-suave)" : "transparent",
                        }}>
                    {etiquetaPago[p.status]}
                  </span>
                )}
              </div>
            ))
          )}
        </section>

        <section>
          <p className="font-semibold text-sm mb-3">Recordatorios enviados</p>
          {misRec.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--tenue)" }}>Ninguno todavia.</p>
          ) : (
            misRec.map((r) => (
              <div key={r.id} className="flex items-start gap-2.5 py-2.5"
                   style={{ borderBottom: "1px solid var(--linea)" }}>
                <span className="mt-0.5">
                  {r.channel === "email" ? <Mail size={14} /> : <MessageCircle size={14} />}
                </span>
                <span className="text-sm flex-1 min-w-0" style={{ wordBreak: "break-word" }}>
                  {r.trigger_type === "auto" ? "Recordatorio automatico" : "Recordatorio manual"}
                </span>
                <span className="text-xs shrink-0" style={{ color: "var(--tenue)" }}>
                  {fechaCorta(r.scheduled_for)}
                </span>
              </div>
            ))
          )}
        </section>
      </div>

      {!pagada && !cancelada && (
        <div className="mt-10 pt-6" style={{ borderTop: "1px solid var(--linea)" }}>
          <button className="btn" disabled={ocupado} onClick={onCancelar}
                  style={{ borderColor: "var(--rojo)", color: "var(--rojo)" }}>
            Cancelar esta deuda
          </button>
          <p className="text-xs mt-2" style={{ color: "var(--tenue)" }}>
            No se borra, solo deja de contar en tus totales.
          </p>
        </div>
      )}
    </div>
  );
}
