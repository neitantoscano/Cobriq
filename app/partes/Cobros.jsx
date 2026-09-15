"use client";

import { useState } from "react";
import { Check, Plus, Copy, Send, Link2, X, Clock } from "lucide-react";
import { pesos, fechaCorta } from "../acciones";

/* Cobros sueltos: ventas de una vez que no son deuda.
   Cada uno tiene su link para mandar y cobrar. */

export default function Cobros({
  cobros, busqueda, abrirModal, onCancelar, ocupado, origen,
}) {
  const [filtro, setFiltro] = useState("todos");
  const [copiado, setCop]   = useState(null);

  const activos    = cobros.filter((c) => c.status !== "cancelled");
  const pendientes = activos.filter((c) => c.status === "pending");
  const cobrados   = activos.filter((c) => c.status === "paid");

  const montoPend  = pendientes.reduce((s, c) => s + c.balance_cents, 0);
  const montoCobr  = cobrados.reduce((s, c) => s + c.amount_cents, 0);

  let lista = activos;
  if (filtro === "pendientes") lista = pendientes;
  if (filtro === "cobrados")   lista = cobrados;

  if (busqueda.trim()) {
    const q = busqueda.toLowerCase();
    lista = lista.filter(
      (c) =>
        (c.payer_name ?? "").toLowerCase().includes(q) ||
        (c.concept ?? "").toLowerCase().includes(q)
    );
  }

  lista = [...lista].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );

  const linkDe = (c) => origen + "/d/" + c.public_token;

  const copiar = async (c) => {
    try {
      await navigator.clipboard.writeText(linkDe(c));
      setCop(c.id);
      setTimeout(() => setCop(null), 2000);
    } catch {
      window.prompt("Copia este link:", linkDe(c));
    }
  };

  const textoDe = (c) =>
    "Hola " + c.payer_name + ", aqui puedes pagar " + c.concept +
    " por " + pesos(c.balance_cents) + ": " + linkDe(c);

  const waDe = (c) =>
    c.payer_phone
      ? "https://wa.me/52" + c.payer_phone + "?text=" + encodeURIComponent(textoDe(c))
      : "https://wa.me/?text=" + encodeURIComponent(textoDe(c));

  const vacio = cobros.length === 0;

  return (
    <div className="surge">
      <h1 className="text-2xl font-bold tracking-tight mb-1">Cobros</h1>
      <p className="text-sm mb-7" style={{ color: "var(--tenue)" }}>
        Ventas que se pagan de una vez. No son deuda ni entran a tus
        cuentas por cobrar.
      </p>

      {/* dos numeros */}
      <section className="grid grid-cols-2 gap-2 md:gap-3 pb-7 max-w-lg">
        <Caja
          etiqueta="Sin pagar" n={pendientes.length} monto={montoPend}
          color="var(--gris)" fondo="var(--gris-suave)"
          activo={filtro === "pendientes"}
          onClick={() => setFiltro(filtro === "pendientes" ? "todos" : "pendientes")}
        />
        <Caja
          etiqueta="Ya cobrados" n={cobrados.length} monto={montoCobr}
          color="var(--verde)" fondo="var(--verde-suave)"
          activo={filtro === "cobrados"}
          onClick={() => setFiltro(filtro === "cobrados" ? "todos" : "cobrados")}
        />
      </section>

      <section className="pb-8">
        <button className="btn btn-solido flex items-center gap-1.5"
                onClick={() => abrirModal({ tipo: "cobro" })}>
          <Plus size={16} /> Nuevo cobro
        </button>
      </section>

      {/* lista */}
      {lista.length === 0 ? (
        <div className="py-12 text-center">
          <p className="font-semibold">
            {busqueda.trim()
              ? "Nada coincide con tu busqueda"
              : vacio
              ? "Todavia no has hecho ningun cobro"
              : "Sin cobros en este filtro"}
          </p>
          {vacio && !busqueda.trim() && (
            <>
              <p className="text-sm mt-1 mb-4 mx-auto max-w-sm"
                 style={{ color: "var(--tenue)" }}>
                Sirve para cuando vendes algo de una vez: pones el monto,
                sacas el link y se lo mandas a quien te va a pagar.
              </p>
              <button className="btn btn-solido inline-flex items-center gap-1.5"
                      onClick={() => abrirModal({ tipo: "cobro" })}>
                <Plus size={16} /> Hacer mi primer cobro
              </button>
            </>
          )}
        </div>
      ) : (
        <div style={{ borderTop: "1px solid var(--linea)" }}>
          {lista.map((c) => {
            const pagado = c.status === "paid";
            return (
              <div key={c.id} className="py-4"
                   style={{ borderBottom: "1px solid var(--linea)" }}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm truncate">{c.payer_name}</p>
                    <p className="text-xs truncate mt-0.5" style={{ color: "var(--tenue)" }}>
                      {c.concept} &middot; {fechaCorta(c.created_at)}
                    </p>
                    <div className="mt-2">
                      {pagado ? (
                        <span className="chip chip-verde">
                          <Check size={11} strokeWidth={3} />Pagado
                        </span>
                      ) : c.paid_cents > 0 ? (
                        <span className="chip chip-gris">
                          <Clock size={11} strokeWidth={2.5} />
                          Abono de {pesos(c.paid_cents)}
                        </span>
                      ) : (
                        <span className="chip chip-gris">Sin pagar</span>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="num font-bold"
                       style={{ color: pagado ? "var(--verde)" : "var(--tinta)" }}>
                      {pesos(pagado ? c.amount_cents : c.balance_cents)}
                    </p>
                  </div>
                </div>

                {/* acciones solo mientras no este pagado */}
                {!pagado && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    <a className="btn btn-solido flex items-center gap-1.5"
                       style={{ textDecoration: "none" }}
                       href={waDe(c)} target="_blank" rel="noopener noreferrer">
                      <Send size={14} />
                      {c.payer_phone ? "Mandar" : "Mandar por WhatsApp"}
                    </a>

                    <button className="btn flex items-center gap-1.5"
                            onClick={() => copiar(c)}>
                      {copiado === c.id
                        ? <><Check size={14} strokeWidth={3} /> Copiado</>
                        : <><Copy size={14} /> Copiar link</>}
                    </button>

                    <button className="btn flex items-center gap-1.5"
                            disabled={ocupado}
                            onClick={() => onCancelar(c)}>
                      <X size={14} /> Cancelar
                    </button>
                  </div>
                )}

                {pagado && (
                  <div className="flex items-center gap-1.5 mt-3">
                    <Link2 size={13} style={{ color: "var(--tenue)" }} />
                    <span className="text-xs" style={{ color: "var(--tenue)" }}>
                      Su link ya no acepta pagos
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Caja({ etiqueta, n, monto, color, fondo, activo, onClick }) {
  return (
    <button onClick={onClick} className="rounded-lg p-3 md:p-4 text-left w-full"
      style={{
        cursor: "pointer",
        background: activo ? fondo : "transparent",
        border: "1.5px solid " + (activo ? color : "var(--linea)"),
        transition: "background .2s, border-color .2s",
      }}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="punto" style={{ background: color }} />
        <span className="text-xs font-medium" style={{ color: "var(--tenue)" }}>
          {etiqueta}
        </span>
      </div>
      <p className="num font-bold text-2xl md:text-3xl leading-none" style={{ color }}>
        {n}
      </p>
      <p className="num text-xs mt-1.5" style={{ color: "var(--tenue)" }}>
        {pesos(monto)}
      </p>
    </button>
  );
}
