"use client";

import { useState } from "react";
import { ArrowLeft, Check, MessageCircle, Eye } from "lucide-react";
import { pesos, diasDeAtraso } from "../acciones";

/* Pantalla para escribirle de corrido a todos los que ya se pasaron
   de fecha. WhatsApp abre un chat a la vez, asi que esto es una fila:
   mandas uno, regresas, sigue el que falta. */

export default function Cobrar({
  deudas,
  clientes,
  regresar,
  onMandar,
  armarTexto,
  ocupado,
}) {
  const [hechos, setHechos] = useState([]);
  const [viendo, setViendo] = useState(null);

  const vencidas = deudas
    .filter((d) => d.status === "pending" && diasDeAtraso(d.due_date) > 0)
    .sort((a, b) => diasDeAtraso(b.due_date) - diasDeAtraso(a.due_date));

  const clienteDe = (id) => clientes.find((c) => c.id === id);

  const pendientes = vencidas.filter((d) => !hechos.includes(d.id));
  const total = vencidas.length;
  const listos = hechos.length;

  const mandar = async (deuda) => {
    await onMandar(deuda);
    setHechos((h) => [...h, deuda.id]);
  };

  /* ---------------------- ya termino ---------------------- */
  if (total > 0 && pendientes.length === 0) {
    return (
      <div className="surge" style={{ maxWidth: 520 }}>
        <button onClick={regresar}
          className="flex items-center gap-1.5 text-sm font-medium mb-8"
          style={{ background: "none", border: 0, cursor: "pointer", color: "var(--tenue)" }}>
          <ArrowLeft size={15} /> Volver
        </button>

        <div className="text-center py-10">
          <div className="grid place-items-center mx-auto mb-4"
               style={{
                 width: 52, height: 52, borderRadius: 99,
                 background: "var(--verde-suave)", color: "var(--verde)",
               }}>
            <Check size={26} strokeWidth={3} />
          </div>
          <p className="text-xl font-bold tracking-tight">
            Listo, ya les escribiste a {total === 1 ? "esa persona" : `las ${total}`}
          </p>
          <p className="text-sm mt-2 mb-6" style={{ color: "var(--tenue)" }}>
            Cuando alguien te pague, registra el pago en su deuda.
          </p>
          <button className="btn" onClick={regresar}>Volver al panel</button>
        </div>
      </div>
    );
  }

  /* ---------------------- nadie debe ---------------------- */
  if (total === 0) {
    return (
      <div className="surge" style={{ maxWidth: 520 }}>
        <button onClick={regresar}
          className="flex items-center gap-1.5 text-sm font-medium mb-8"
          style={{ background: "none", border: 0, cursor: "pointer", color: "var(--tenue)" }}>
          <ArrowLeft size={15} /> Volver
        </button>

        <div className="text-center py-10">
          <p className="text-xl font-bold tracking-tight">Nadie se ha pasado de fecha</p>
          <p className="text-sm mt-2" style={{ color: "var(--tenue)" }}>
            Todo al corriente por ahora.
          </p>
        </div>
      </div>
    );
  }

  /* ---------------------- la fila ---------------------- */
  return (
    <div className="surge" style={{ maxWidth: 560 }}>
      <button onClick={regresar}
        className="flex items-center gap-1.5 text-sm font-medium mb-5"
        style={{ background: "none", border: 0, cursor: "pointer", color: "var(--tenue)" }}>
        <ArrowLeft size={15} /> Volver
      </button>

      <h1 className="text-2xl font-bold tracking-tight">Cobrarles</h1>
      <p className="text-sm mt-1.5 mb-6" style={{ color: "var(--tenue)" }}>
        Pica el boton de cada persona. Se abre su WhatsApp con el mensaje ya
        escrito, tu solo le das enviar y regresas aqui.
      </p>

      {listos > 0 && (
        <div className="mb-6">
          <div className="flex justify-between text-xs font-medium mb-2">
            <span>Van {listos} de {total}</span>
            <span style={{ color: "var(--tenue)" }}>
              {total - listos} por escribir
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--humo)" }}>
            <div className="barra"
                 style={{ width: `${(listos / total) * 100}%`, background: "var(--verde)" }} />
          </div>
        </div>
      )}

      <div style={{ borderTop: "1px solid var(--linea)" }}>
        {vencidas.map((d) => {
          const c       = clienteDe(d.customer_id);
          const hecho   = hechos.includes(d.id);
          const atraso  = diasDeAtraso(d.due_date);
          const sinTel  = !c?.phone;

          return (
            <div key={d.id} className="py-4"
                 style={{
                   borderBottom: "1px solid var(--linea)",
                   opacity: hecho ? 0.45 : 1,
                 }}>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0" style={{ flex: "1 1 190px" }}>
                  <p className="font-semibold text-sm truncate">{d.customer_name}</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--tenue)" }}>
                    debe{" "}
                    <span className="num font-semibold" style={{ color: "var(--rojo)" }}>
                      {pesos(d.balance_cents)}
                    </span>
                    {" · "}
                    {atraso} {atraso === 1 ? "dia" : "dias"} de atraso
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {hecho ? (
                    <span className="chip chip-verde">
                      <Check size={11} strokeWidth={3} />Ya le escribiste
                    </span>
                  ) : sinTel ? (
                    <span className="chip chip-gris">Sin WhatsApp guardado</span>
                  ) : (
                    <>
                      <button className="btn-ico" disabled={ocupado}
                        onClick={() => setViendo(viendo === d.id ? null : d.id)}
                        aria-label="Ver el mensaje">
                        <Eye size={15} />
                      </button>
                      <button className="btn btn-solido flex items-center gap-1.5"
                        disabled={ocupado} onClick={() => mandar(d)}>
                        <MessageCircle size={15} /> Mandar WhatsApp
                      </button>
                    </>
                  )}
                </div>
              </div>

              {viendo === d.id && !hecho && !sinTel && (
                <div className="mt-3 p-3 rounded-lg text-sm surge"
                     style={{
                       background: "var(--humo)",
                       whiteSpace: "pre-wrap",
                       wordBreak: "break-word",
                     }}>
                  {armarTexto(d, c)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs mt-6" style={{ color: "var(--tenue)" }}>
        Puedes cambiar el texto del mensaje en Ajustes.
      </p>
    </div>
  );
}
