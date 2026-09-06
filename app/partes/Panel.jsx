"use client";

import { Check, Clock, Plus } from "lucide-react";
import { pesos, diasDeAtraso, fechaCorta } from "../acciones";

/* Pantalla principal: total por cobrar, contadores por estado,
   pagos que reportaron los deudores y la lista de deudas. */

export default function Panel({
  deudas,
  pagos,
  clientes,
  filtro,
  setFiltro,
  busqueda,
  abrirDeuda,
  abrirModal,
  onConfirmarPago,
  onRechazarPago,
  ocupado,
}) {
  const nombreDe = (id) => clientes.find((c) => c.id === id)?.name ?? "—";

  /* --- totales --- */
  const activas   = deudas.filter((d) => d.status !== "cancelled");
  const pend      = activas.filter((d) => d.status === "pending");
  const vencidas  = pend.filter((d) => diasDeAtraso(d.due_date) > 0);
  const porVencer = pend.filter((d) => diasDeAtraso(d.due_date) <= 0);
  const pagadas   = activas.filter((d) => d.status === "paid");

  const porCobrar    = pend.reduce((s, d) => s + d.balance_cents, 0);
  const cobrado      = activas.reduce((s, d) => s + d.paid_cents, 0);
  const vencido      = vencidas.reduce((s, d) => s + d.balance_cents, 0);
  const montoPorVenc = porVencer.reduce((s, d) => s + d.balance_cents, 0);
  const montoPagado  = pagadas.reduce((s, d) => s + d.amount_cents, 0);

  const porRevisar = pagos.filter((p) => p.status === "pending_review");

  const meta = porCobrar + cobrado;
  const pct  = meta ? (cobrado / meta) * 100 : 0;

  /* --- lista filtrada --- */
  let lista = activas;
  if (filtro === "vencidas")  lista = vencidas;
  if (filtro === "porvencer") lista = porVencer;
  if (filtro === "pagadas")   lista = pagadas;

  if (busqueda.trim()) {
    const q = busqueda.toLowerCase();
    lista = lista.filter(
      (d) =>
        (d.customer_name ?? "").toLowerCase().includes(q) ||
        (d.concept ?? "").toLowerCase().includes(q)
    );
  }

  lista = [...lista].sort(
    (a, b) => diasDeAtraso(b.due_date) - diasDeAtraso(a.due_date)
  );

  return (
    <div className="surge">
      {/* numero grande */}
      <section className="pb-8">
        <p className="text-sm mb-1" style={{ color: "var(--tenue)" }}>Por cobrar</p>
        <p className="num font-bold leading-none text-5xl md:text-6xl">
          {pesos(porCobrar)}
        </p>

        <div className="mt-6 max-w-md">
          <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--humo)" }}>
            <div className="barra" style={{ width: `${pct}%`, background: "var(--verde)" }} />
          </div>
          <p className="text-xs mt-2" style={{ color: "var(--tenue)" }}>
            Ya cobraste{" "}
            <span className="font-semibold" style={{ color: "var(--verde)" }}>
              {pesos(cobrado)}
            </span>{" "}
            de {pesos(meta)}
          </p>
        </div>
      </section>

      {/* tres estados */}
      <section className="grid grid-cols-3 gap-2 md:gap-3 pb-8 max-w-2xl">
        <Contador
          n={vencidas.length} etiqueta="Vencidas" monto={vencido}
          color="var(--rojo)" fondo="var(--rojo-suave)"
          activo={filtro === "vencidas"}
          onClick={() => setFiltro(filtro === "vencidas" ? "todos" : "vencidas")}
        />
        <Contador
          n={porVencer.length} etiqueta="Por vencer" monto={montoPorVenc}
          color="var(--gris)" fondo="var(--gris-suave)"
          activo={filtro === "porvencer"}
          onClick={() => setFiltro(filtro === "porvencer" ? "todos" : "porvencer")}
        />
        <Contador
          n={pagadas.length} etiqueta="Pagadas" monto={montoPagado}
          color="var(--verde)" fondo="var(--verde-suave)"
          activo={filtro === "pagadas"}
          onClick={() => setFiltro(filtro === "pagadas" ? "todos" : "pagadas")}
        />
      </section>

      {/* pagos por confirmar */}
      {porRevisar.length > 0 && (
        <section className="mb-8 rounded-lg p-4" style={{ border: "1.5px solid #000" }}>
          <p className="font-semibold text-sm mb-3">Pagos que tus clientes reportaron</p>
          {porRevisar.map((p) => {
            const d = deudas.find((x) => x.id === p.debt_id);
            return (
              <div key={p.id} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {d ? d.customer_name : nombreDe(p.customer_id)}
                  </p>
                  <p className="text-xs" style={{ color: "var(--tenue)" }}>
                    {pesos(p.amount_cents)} · {p.method} · {fechaCorta(p.paid_at)}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button className="btn" disabled={ocupado}
                    onClick={() => onConfirmarPago(p.id)}>
                    Confirmar
                  </button>
                  <button className="btn" disabled={ocupado}
                    onClick={() => onRechazarPago(p.id)}>
                    Rechazar
                  </button>
                </div>
              </div>
            );
          })}
          <p className="text-xs mt-2" style={{ color: "var(--tenue)" }}>
            Revisa tu banco antes de confirmar.
          </p>
        </section>
      )}

      {/* filtros */}
      <div className="flex gap-2 overflow-x-auto pb-4">
        {[
          ["todos", "Todos", null],
          ["vencidas", "Vencidas", "var(--rojo)"],
          ["porvencer", "Por vencer", "var(--gris)"],
          ["pagadas", "Pagadas", "var(--verde)"],
        ].map(([id, txt, color]) => (
          <button key={id} onClick={() => setFiltro(id)}
            className="text-xs font-semibold px-3 py-1.5 rounded-full shrink-0 flex items-center gap-1.5"
            style={{
              cursor: "pointer",
              border: `1.5px solid ${filtro === id ? "#000" : "var(--linea)"}`,
              background: filtro === id ? "#000" : "transparent",
              color: filtro === id ? "#fff" : "var(--tenue)",
            }}>
            {color && <span className="punto" style={{ background: color, width: 6, height: 6 }} />}
            {txt}
          </button>
        ))}
      </div>

      {/* lista */}
      {lista.length === 0 ? (
        <div className="py-14 text-center">
          <p className="font-semibold">
            {busqueda.trim()
              ? "Nada coincide con tu busqueda"
              : deudas.length === 0
              ? "Aqui no hay nada todavia"
              : "Sin deudas en este filtro"}
          </p>
          {deudas.length === 0 && !busqueda.trim() && (
            <>
              <p className="text-sm mt-1 mb-4" style={{ color: "var(--tenue)" }}>
                Registra tu primera deuda para empezar a llevar la cuenta.
              </p>
              <button className="btn inline-flex items-center gap-1.5"
                onClick={() => abrirModal({ tipo: "deuda" })}>
                <Plus size={15} /> Nueva deuda
              </button>
            </>
          )}
        </div>
      ) : (
        <div style={{ borderTop: "1px solid var(--linea)" }}>
          {lista.map((d) => {
            const atraso = diasDeAtraso(d.due_date);
            const pagada = d.status === "paid";
            return (
              <button key={d.id} className="fila" onClick={() => abrirDeuda(d.id)}>
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{d.customer_name}</p>
                    <p className="text-xs truncate mt-0.5" style={{ color: "var(--tenue)" }}>
                      {d.concept} · vence {fechaCorta(d.due_date)}
                    </p>
                    <div className="mt-2">
                      {pagada ? (
                        <span className="chip chip-verde">
                          <Check size={11} strokeWidth={3} />Pagada
                        </span>
                      ) : atraso > 0 ? (
                        <span className="chip chip-rojo">
                          <Clock size={11} strokeWidth={2.5} />
                          {atraso} {atraso === 1 ? "dia" : "dias"} de atraso
                        </span>
                      ) : atraso === 0 ? (
                        <span className="chip chip-gris">Vence hoy</span>
                      ) : (
                        <span className="chip chip-gris">
                          Vence en {Math.abs(atraso)} dias
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="num font-bold"
                       style={{
                         color: pagada
                           ? "var(--verde)"
                           : atraso > 0
                           ? "var(--rojo)"
                           : "var(--tinta)",
                       }}>
                      {pesos(pagada ? d.amount_cents : d.balance_cents)}
                    </p>
                    {!pagada && d.paid_cents > 0 && (
                      <p className="text-xs mt-0.5" style={{ color: "var(--tenue)" }}>
                        abono {pesos(d.paid_cents)}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Contador({ n, etiqueta, monto, color, fondo, activo, onClick }) {
  return (
    <button onClick={onClick} className="rounded-lg p-3 md:p-4 text-left w-full"
      style={{
        cursor: "pointer",
        background: activo ? fondo : "transparent",
        border: `1.5px solid ${activo ? color : "var(--linea)"}`,
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
