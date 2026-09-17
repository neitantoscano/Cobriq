"use client";

import { TrendingUp, CalendarDays, Info } from "lucide-react";
import { pesos } from "../acciones";

/* Como va el mes y que tan bien te pagan.
   Los dos primeros numeros son hechos: lo que toca cobrar y lo
   que ya entro. Los de abajo son estadistica, y solo salen
   cuando hay suficientes deudas cerradas para que no mientan. */

const MINIMO = 5; // deudas cerradas antes de mostrar promedios

export default function Avance({ deudas, pagos }) {
  const hoy = new Date();
  const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
  const iniMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

  const aFecha = (s) => (s ? new Date(s + "T00:00:00") : null);

  const activas = deudas.filter((d) => d.status !== "cancelled");

  /* ---------- 1. lo que toca cobrar antes de que acabe el mes ----------
     Incluye lo ya vencido de antes, porque sigue sin pagarse. */
  const delMes = activas.filter((d) => {
    if (d.status !== "pending" || !d.due_date) return false;
    return aFecha(d.due_date) <= finMes;
  });
  const tocaCobrar = delMes.reduce((s, d) => s + d.balance_cents, 0);

  /* ---------- 2. lo que ya entro este mes ---------- */
  const cobradoMes = pagos
    .filter((p) => {
      if (p.status !== "confirmed" || !p.paid_at) return false;
      const f = aFecha(p.paid_at);
      return f >= iniMes && f <= finMes;
    })
    .reduce((s, p) => s + p.amount_cents, 0);

  const meta = tocaCobrar + cobradoMes;
  const pct  = meta > 0 ? Math.min(100, (cobradoMes / meta) * 100) : 0;

  /* ---------- 3. tasa de cobro ----------
     De las deudas que ya llegaron a su fecha, cuantas quedaron
     saldadas. Las que todavia no vencen no cuentan: no han
     tenido oportunidad de fallar. */
  const pagadas = activas.filter((d) => d.status === "paid");
  const vencidasSinPagar = activas.filter(
    (d) => d.status === "pending" && d.due_date && aFecha(d.due_date) < hoy
  );

  const universo = pagadas.length + vencidasSinPagar.length;
  const tasa = universo > 0 ? Math.round((pagadas.length / universo) * 100) : 0;

  /* ---------- 4. cuanto tardan en pagarte ----------
     Del vencimiento al ultimo pago confirmado de esa deuda. */
  const diasPorDeuda = [];
  for (const d of pagadas) {
    if (!d.due_date) continue;
    const suyos = pagos.filter(
      (p) => p.debt_id === d.id && p.status === "confirmed" && p.paid_at
    );
    if (suyos.length === 0) continue;

    const ultimo = suyos.reduce((a, b) => (a.paid_at > b.paid_at ? a : b));
    const dias = Math.round(
      (aFecha(ultimo.paid_at) - aFecha(d.due_date)) / 86400000
    );
    diasPorDeuda.push(dias);
  }

  const promedio =
    diasPorDeuda.length > 0
      ? Math.round(diasPorDeuda.reduce((a, b) => a + b, 0) / diasPorDeuda.length)
      : null;

  const hayEstadistica = universo >= MINIMO;

  /* ---------- 5. estimado de cierre ----------
     Esto si es una suposicion, y se dice que lo es. */
  const estimado = cobradoMes + Math.round(tocaCobrar * (tasa / 100));

  const nombreMes = hoy.toLocaleDateString("es-MX", { month: "long" });
  const faltanDias = Math.max(0, Math.round((finMes - hoy) / 86400000));

  /* Sin nada que cobrar ni cobrado, no hay que ensenar */
  if (meta === 0 && !hayEstadistica) return null;

  return (
    <section className="mb-8 rounded-lg overflow-hidden"
             style={{ border: "1.5px solid var(--linea)" }}>

      {/* ---------- avance del mes ---------- */}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <CalendarDays size={15} style={{ color: "var(--tenue)" }} />
          <p className="text-xs font-semibold" style={{ textTransform: "capitalize" }}>
            {nombreMes}
          </p>
          <span className="text-xs ml-auto" style={{ color: "var(--tenue)" }}>
            {faltanDias === 0
              ? "ultimo dia"
              : faltanDias === 1
              ? "queda 1 dia"
              : `quedan ${faltanDias} dias`}
          </span>
        </div>

        <div className="flex items-end justify-between gap-3 mb-3 flex-wrap">
          <div>
            <p className="text-xs mb-0.5" style={{ color: "var(--tenue)" }}>
              Llevas cobrado
            </p>
            <p className="num font-bold text-3xl leading-none"
               style={{ color: "var(--verde)" }}>
              {pesos(cobradoMes)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs mb-0.5" style={{ color: "var(--tenue)" }}>
              Te falta
            </p>
            <p className="num font-bold text-xl leading-none">
              {pesos(tocaCobrar)}
            </p>
          </div>
        </div>

        <div className="h-2 rounded-full overflow-hidden mb-2"
             style={{ background: "var(--humo)" }}>
          <div className="barra"
               style={{ width: `${pct}%`, background: "var(--verde)" }} />
        </div>

        <p className="text-xs" style={{ color: "var(--tenue)" }}>
          De {pesos(meta)} que te tocaba cobrar en {nombreMes}
        </p>
      </div>

      {/* ---------- estadistica, solo cuando ya significa algo ---------- */}
      {hayEstadistica ? (
        <div style={{ borderTop: "1px solid var(--linea)" }}>
          <div className="grid grid-cols-2">
            <div className="p-4" style={{ borderRight: "1px solid var(--linea)" }}>
              <p className="text-xs mb-1" style={{ color: "var(--tenue)" }}>
                Te pagan
              </p>
              <p className="num font-bold text-2xl leading-none"
                 style={{ color: tasa >= 70 ? "var(--verde)" : tasa >= 40 ? "var(--tinta)" : "var(--rojo)" }}>
                {tasa}%
              </p>
              <p className="text-xs mt-1.5" style={{ color: "var(--tenue)" }}>
                {pagadas.length} de {universo} deudas vencidas
              </p>
            </div>

            <div className="p-4">
              <p className="text-xs mb-1" style={{ color: "var(--tenue)" }}>
                Tardan en pagarte
              </p>
              {promedio === null ? (
                <p className="text-sm font-semibold" style={{ color: "var(--tenue)" }}>
                  Sin datos
                </p>
              ) : (
                <>
                  <p className="num font-bold text-2xl leading-none">
                    {promedio <= 0
                      ? "A tiempo"
                      : `${promedio} ${promedio === 1 ? "dia" : "dias"}`}
                  </p>
                  <p className="text-xs mt-1.5" style={{ color: "var(--tenue)" }}>
                    {promedio <= 0
                      ? "pagan antes de vencer"
                      : "despues de la fecha"}
                  </p>
                </>
              )}
            </div>
          </div>

          {tocaCobrar > 0 && (
            <div className="px-4 pb-4 pt-1 flex items-start gap-2">
              <TrendingUp size={13} className="shrink-0 mt-0.5"
                          style={{ color: "var(--tenue)" }} />
              <p className="text-xs" style={{ color: "var(--tenue)" }}>
                Si te siguen pagando igual, cierras {nombreMes} cerca de{" "}
                <span className="num font-semibold" style={{ color: "var(--tinta)" }}>
                  {pesos(estimado)}
                </span>
                . Es un calculo, no una promesa.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="px-4 py-3 flex items-start gap-2"
             style={{ borderTop: "1px solid var(--linea)", background: "var(--humo)" }}>
          <Info size={13} className="shrink-0 mt-0.5" style={{ color: "var(--tenue)" }} />
          <p className="text-xs" style={{ color: "var(--tenue)" }}>
            Cuando se venzan {MINIMO} deudas vas a ver aqui que tan bien te
            pagan y cuanto tardan.
          </p>
        </div>
      )}
    </section>
  );
}
