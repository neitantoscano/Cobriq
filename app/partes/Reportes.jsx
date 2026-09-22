"use client";

import { useState } from "react";
import { CalendarRange, Check, Clock, AlertTriangle, ChevronRight, Share2 } from "lucide-react";
import { pesos, diasDeAtraso } from "../acciones";

/* Reporte de cobranza por semana o por mes.
   Solo usa lo que el negocio registro: deudas, pagos y fechas.
   Nada se inventa ni se adivina.

   Tambien arma una tarjeta en imagen para mandarla por WhatsApp
   o descargarla. */

/* Fecha local a "2026-09-21" para comparar con lo que guarda la base */
const aTexto = (f) =>
  f.getFullYear() + "-" +
  String(f.getMonth() + 1).padStart(2, "0") + "-" +
  String(f.getDate()).padStart(2, "0");

function rangoDe(periodo) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  if (periodo === "semana") {
    /* La semana va de lunes a domingo */
    const ini = new Date(hoy);
    ini.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7));
    const fin = new Date(ini);
    fin.setDate(ini.getDate() + 6);
    return { ini, fin };
  }

  const ini = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const fin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
  return { ini, fin };
}

function nombreDelRango(periodo, ini, fin) {
  if (periodo === "mes") {
    const m = ini.toLocaleDateString("es-MX", { month: "long", year: "numeric" });
    return m.charAt(0).toUpperCase() + m.slice(1);
  }
  const d = (f) => f.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
  return "Del " + d(ini) + " al " + d(fin);
}

/* ================================================================
   TARJETA EN IMAGEN
   Se dibuja a mano en un canvas. Asi siempre sale igual, sin
   depender de como se vea la pantalla ni de librerias extra.
   ================================================================ */

const C = {
  negro: "#000000",
  blanco: "#FFFFFF",
  verde: "#0F7B3D",
  rojo: "#C0392B",
  naranja: "#C2410C",
  tenue: "#6B7280",
  linea: "#E5E7EB",
  humo: "#F3F4F6",
};

const FUENTE = "Helvetica, Arial, sans-serif";

/* Rectangulo con esquinas redondas, sin depender de roundRect,
   que algunos celulares viejos no tienen. */
function cajaRedonda(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/* Corta un texto con "..." si no cabe en el ancho */
function recortar(ctx, texto, ancho) {
  if (ctx.measureText(texto).width <= ancho) return texto;
  let t = texto;
  while (t.length > 1 && ctx.measureText(t + "...").width > ancho) {
    t = t.slice(0, -1);
  }
  return t + "...";
}

/* Solo "bold" o "normal": los pesos con numero (800, 600)
   no los entienden todos los celulares y la letra sale chiquita. */
function letra(ctx, peso, tam) {
  const grueso = Number(peso) >= 600 ? "bold" : "normal";
  ctx.font = grueso + " " + tam + "px " + FUENTE;
}

/* Dibuja la tarjeta y regresa un canvas del alto exacto.
   crear(w, h) debe regresar un canvas nuevo. */
export function pintarTarjeta(crear, r) {
  const W = 1080;
  const M = 72;              // margen
  const A = W - M * 2;       // ancho util

  /* Se dibuja en uno alto y al final se recorta a lo que se uso */
  const lienzo = crear(W, 2400);
  const ctx = lienzo.getContext("2d");
  ctx.textBaseline = "alphabetic";

  ctx.fillStyle = C.blanco;
  ctx.fillRect(0, 0, W, 2400);

  /* ---------- encabezado negro ---------- */
  ctx.fillStyle = C.negro;
  ctx.fillRect(0, 0, W, 210);

  /* cuadro del logo con la C en degradado neon */
  const lx = M, ly = 58, ls = 92;
  ctx.fillStyle = "#111111";
  cajaRedonda(ctx, lx, ly, ls, ls, 20);
  ctx.fill();

  const grad = ctx.createLinearGradient(lx, ly, lx + ls, ly + ls);
  grad.addColorStop(0, "#39FF14");
  grad.addColorStop(0.5, "#00F0FF");
  grad.addColorStop(1, "#B14BFF");
  ctx.fillStyle = grad;
  letra(ctx, "800", 64);
  ctx.textAlign = "center";
  ctx.fillText("C", lx + ls / 2, ly + 70);
  ctx.textAlign = "left";

  ctx.fillStyle = C.blanco;
  letra(ctx, "700", 46);
  ctx.fillText(recortar(ctx, r.negocio || "Mi negocio", A - ls - 40), lx + ls + 30, ly + 44);

  ctx.fillStyle = "#9CA3AF";
  letra(ctx, "500", 30);
  ctx.fillText("Reporte de cobranza", lx + ls + 30, ly + 84);

  let y = 290;

  /* ---------- periodo ---------- */
  ctx.fillStyle = C.tenue;
  letra(ctx, "600", 32);
  ctx.fillText(r.rango, M, y);
  y += 90;

  /* ---------- cobraste ---------- */
  ctx.fillStyle = C.tenue;
  letra(ctx, "500", 34);
  ctx.fillText("Cobraste", M, y);
  y += 108;

  ctx.fillStyle = C.verde;
  letra(ctx, "800", 118);
  ctx.fillText(recortar(ctx, pesos(r.cobrado), A), M, y);
  y += 56;

  ctx.fillStyle = C.tenue;
  letra(ctx, "500", 30);
  ctx.fillText(
    r.numPagos === 0
      ? "Ningun pago confirmado en este periodo"
      : r.numPagos === 1
      ? "En 1 pago confirmado"
      : "En " + r.numPagos + " pagos confirmados",
    M, y
  );
  y += 70;

  /* ---------- lo que vencia ---------- */
  const altoVencia = r.debiste === 0 ? 150 : 290;
  ctx.strokeStyle = C.linea;
  ctx.lineWidth = 3;
  cajaRedonda(ctx, M, y, A, altoVencia, 28);
  ctx.stroke();

  let yy = y + 68;
  ctx.fillStyle = C.negro;
  letra(ctx, "700", 34);
  ctx.fillText("Lo que vencia en este periodo", M + 40, yy);

  if (r.debiste === 0) {
    yy += 52;
    ctx.fillStyle = C.tenue;
    letra(ctx, "500", 30);
    ctx.fillText("No vencia ninguna deuda en estas fechas.", M + 40, yy);
  } else {
    yy += 56;
    ctx.fillStyle = C.tenue;
    letra(ctx, "500", 28);
    ctx.fillText("Te pagaron", M + 40, yy);
    ctx.textAlign = "right";
    ctx.fillText("Debiste cobrar", M + A - 40, yy);

    yy += 58;
    ctx.fillStyle = C.negro;
    letra(ctx, "800", 52);
    ctx.fillText(pesos(r.debiste), M + A - 40, yy);
    ctx.textAlign = "left";
    ctx.fillText(pesos(r.deEsoPagaron), M + 40, yy);

    /* barra */
    yy += 40;
    const bw = A - 80, bh = 20;
    ctx.fillStyle = C.humo;
    cajaRedonda(ctx, M + 40, yy, bw, bh, 10);
    ctx.fill();
    const lleno = Math.max(0, Math.min(1, r.pct / 100)) * bw;
    if (lleno > 0) {
      ctx.fillStyle = C.verde;
      cajaRedonda(ctx, M + 40, yy, Math.max(lleno, bh), bh, 10);
      ctx.fill();
    }

    yy += 62;
    ctx.fillStyle = C.tenue;
    letra(ctx, "500", 28);
    ctx.fillText("Cobraste el " + r.pct + "% de lo que te tocaba", M + 40, yy);
  }
  y += altoVencia + 36;

  /* ---------- pagaron / deben ---------- */
  if (r.personas > 0) {
    const gap = 28;
    const cw = (A - gap) / 2;
    const ch = 200;
    const cajas = [
      { tit: "Pagaron", n: r.pagaron, color: C.verde },
      { tit: "Deben", n: r.deben, color: r.deben > 0 ? C.rojo : C.negro },
    ];
    cajas.forEach((c, i) => {
      const cx = M + i * (cw + gap);
      ctx.strokeStyle = C.linea;
      ctx.lineWidth = 3;
      cajaRedonda(ctx, cx, y, cw, ch, 28);
      ctx.stroke();

      ctx.fillStyle = C.tenue;
      letra(ctx, "600", 28);
      ctx.fillText(c.tit, cx + 36, y + 60);

      ctx.fillStyle = c.color;
      letra(ctx, "800", 80);
      ctx.fillText(String(c.n), cx + 36, y + 142);

      ctx.fillStyle = C.tenue;
      letra(ctx, "500", 26);
      ctx.fillText(
        "de " + r.personas + (r.personas === 1 ? " persona" : " personas"),
        cx + 36, y + 180
      );
    });
    y += ch + 60;
  }

  /* ---------- mas atrasados ---------- */
  ctx.fillStyle = C.rojo;
  cajaRedonda(ctx, M, y - 26, 10, 34, 5);
  ctx.fill();
  ctx.fillStyle = C.negro;
  letra(ctx, "700", 36);
  ctx.fillText("Los mas atrasados", M + 26, y);
  y += 30;

  if (r.top.length === 0) {
    y += 50;
    ctx.fillStyle = C.tenue;
    letra(ctx, "500", 30);
    ctx.fillText("Nadie esta atrasado.", M, y);
    y += 30;
  } else {
    r.top.forEach((c) => {
      ctx.strokeStyle = C.linea;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(M, y + 14);
      ctx.lineTo(M + A, y + 14);
      ctx.stroke();

      y += 72;

      letra(ctx, "800", 36);
      const monto = pesos(c.saldo);
      const anchoMonto = ctx.measureText(monto).width;
      ctx.fillStyle = C.rojo;
      ctx.textAlign = "right";
      ctx.fillText(monto, M + A, y);
      ctx.textAlign = "left";

      ctx.fillStyle = C.negro;
      letra(ctx, "700", 34);
      ctx.fillText(recortar(ctx, c.nombre || "Sin nombre", A - anchoMonto - 40), M, y - 8);

      ctx.fillStyle = c.dias > 60 ? C.rojo : c.dias > 30 ? C.naranja : C.tenue;
      letra(ctx, "600", 26);
      ctx.fillText(c.dias + (c.dias === 1 ? " dia" : " dias") + " de atraso", M, y + 30);

      y += 38;
    });
  }

  /* ---------- pie ---------- */
  y += 60;
  ctx.strokeStyle = C.linea;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(M, y);
  ctx.lineTo(M + A, y);
  ctx.stroke();

  y += 56;
  ctx.fillStyle = C.tenue;
  letra(ctx, "500", 26);
  ctx.fillText("Generado el " + r.generado, M, y);
  ctx.textAlign = "right";
  letra(ctx, "700", 26);
  ctx.fillText("Cobriq", M + A, y);
  ctx.textAlign = "left";
  y += 60;

  /* ---------- recortar al alto usado ---------- */
  const final = crear(W, Math.ceil(y));
  final.getContext("2d").drawImage(lienzo, 0, 0);
  return final;
}

/* ================================================================
   PANTALLA
   ================================================================ */

export default function Reportes({ deudas, pagos, abrirDeuda, negocio }) {
  const [periodo, setPeriodo]   = useState("semana");
  const [armando, setArmando]   = useState(false);
  const [falloImg, setFalloImg] = useState("");

  const { ini, fin } = rangoDe(periodo);
  const iniT = aTexto(ini);
  const finT = aTexto(fin);
  const dentro = (s) => !!s && s >= iniT && s <= finT;

  const activas = deudas.filter((d) => d.status !== "cancelled");

  /* ---------- 1. cuanto entro en el periodo ----------
     Todos los pagos confirmados, aunque sean de deudas viejas. */
  const pagosDelPeriodo = pagos.filter(
    (p) => p.status === "confirmed" && dentro(p.paid_at)
  );
  const cobrado = pagosDelPeriodo.reduce((s, p) => s + p.amount_cents, 0);

  /* ---------- 2. cuanto debiste haber cobrado ----------
     Lo que vencia dentro del periodo, y de eso cuanto te pagaron. */
  const vencian = activas.filter((d) => dentro(d.due_date));
  const debiste = vencian.reduce((s, d) => s + d.amount_cents, 0);
  const deEsoPagaron = vencian.reduce((s, d) => s + d.paid_cents, 0);
  const pct = debiste > 0 ? Math.round((deEsoPagaron / debiste) * 100) : 0;

  /* ---------- 3. cuantos pagaron y cuantos deben ----------
     Por persona, no por deuda. Si alguien tiene dos deudas del
     periodo y le falta una, cuenta como que debe. */
  const porCliente = new Map();
  for (const d of vencian) {
    const id = d.customer_id;
    if (!id) continue;
    const debe = porCliente.get(id) || false;
    porCliente.set(id, debe || d.status === "pending");
  }
  const personas = porCliente.size;
  const deben = [...porCliente.values()].filter(Boolean).length;
  const pagaron = personas - deben;

  /* ---------- 4. los mas atrasados ----------
     No depende del periodo: son los que hoy siguen sin pagar
     y llevan mas dias pasados de fecha. */
  const atrasados = new Map();
  for (const d of activas) {
    if (d.status !== "pending" || !d.due_date) continue;
    const dias = diasDeAtraso(d.due_date);
    if (dias <= 0) continue;

    const actual = atrasados.get(d.customer_id);
    if (!actual) {
      atrasados.set(d.customer_id, {
        nombre: d.customer_name,
        saldo: d.balance_cents,
        dias,
        deudaId: d.id,
      });
    } else {
      actual.saldo += d.balance_cents;
      if (dias > actual.dias) {
        actual.dias = dias;
        actual.deudaId = d.id;
      }
    }
  }
  const top = [...atrasados.values()]
    .sort((a, b) => b.dias - a.dias)
    .slice(0, 5);

  const colorDias = (dias) =>
    dias > 60 ? "var(--rojo)" : dias > 30 ? "#C2410C" : "var(--tinta)";

  const rango = nombreDelRango(periodo, ini, fin);

  /* ---------- compartir o descargar la tarjeta ---------- */
  const compartir = async () => {
    setFalloImg("");
    setArmando(true);

    try {
      const canvas = pintarTarjeta(
        (w, h) => {
          const c = document.createElement("canvas");
          c.width = w;
          c.height = h;
          return c;
        },
        {
          negocio,
          rango,
          cobrado,
          numPagos: pagosDelPeriodo.length,
          debiste,
          deEsoPagaron,
          pct,
          personas,
          pagaron,
          deben,
          top,
          generado: new Date().toLocaleDateString("es-MX", {
            day: "numeric", month: "long", year: "numeric",
          }),
        }
      );

      const blob = await new Promise((ok) => canvas.toBlob(ok, "image/png"));
      if (!blob) throw new Error("sin imagen");

      const nombre = "reporte-cobriq-" + periodo + "-" + iniT + ".png";
      const archivo = new File([blob], nombre, { type: "image/png" });

      /* En celular: menu de compartir con la imagen.
         Si no se puede, se descarga. */
      if (navigator.canShare && navigator.canShare({ files: [archivo] })) {
        try {
          await navigator.share({ files: [archivo], title: "Reporte de cobranza" });
          return;
        } catch (e) {
          /* Si le pico cancelar no es error; no hay que descargar */
          if (e && e.name === "AbortError") return;
        }
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = nombre;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    } catch {
      setFalloImg("No se pudo armar la imagen. Intenta de nuevo.");
    } finally {
      setArmando(false);
    }
  };

  return (
    <div className="surge max-w-2xl">
      <h1 className="text-2xl font-bold tracking-tight mb-1">Reportes</h1>
      <p className="text-sm mb-6" style={{ color: "var(--tenue)" }}>
        Como te fue cobrando, con tus datos reales.
      </p>

      {/* ---------- selector ---------- */}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        {[
          ["semana", "Esta semana"],
          ["mes", "Este mes"],
        ].map(([id, txt]) => (
          <button key={id} onClick={() => setPeriodo(id)}
            className="text-sm font-semibold px-4 py-2 rounded-full"
            style={{
              cursor: "pointer",
              border: "1.5px solid " + (periodo === id ? "#000" : "var(--linea)"),
              background: periodo === id ? "#000" : "transparent",
              color: periodo === id ? "#fff" : "var(--tenue)",
            }}>
            {txt}
          </button>
        ))}
      </div>
      <p className="text-xs flex items-center gap-1.5 mb-4" style={{ color: "var(--tenue)" }}>
        <CalendarRange size={13} /> {rango}
      </p>

      <div className="mb-7">
        <button className="btn flex items-center gap-1.5" onClick={compartir} disabled={armando}>
          <Share2 size={15} />
          {armando ? "Armando imagen..." : "Compartir reporte"}
        </button>
        {falloImg && (
          <p className="text-xs mt-2 font-medium" style={{ color: "var(--rojo)" }}>{falloImg}</p>
        )}
      </div>

      {/* ---------- 1. cobrado ---------- */}
      <section className="pb-7">
        <p className="text-sm mb-1" style={{ color: "var(--tenue)" }}>Cobraste</p>
        <p className="num font-bold leading-none text-5xl" style={{ color: "var(--verde)" }}>
          {pesos(cobrado)}
        </p>
        <p className="text-xs mt-2" style={{ color: "var(--tenue)" }}>
          {pagosDelPeriodo.length === 0
            ? "Ningun pago confirmado en este periodo"
            : pagosDelPeriodo.length === 1
            ? "En 1 pago confirmado"
            : "En " + pagosDelPeriodo.length + " pagos confirmados"}
        </p>
      </section>

      {/* ---------- 2. debiste cobrar ---------- */}
      <section className="mb-6 rounded-lg p-4" style={{ border: "1.5px solid var(--linea)" }}>
        <p className="font-semibold text-sm mb-3">Lo que vencia en este periodo</p>

        {debiste === 0 ? (
          <p className="text-sm" style={{ color: "var(--tenue)" }}>
            No vencia ninguna deuda en estas fechas.
          </p>
        ) : (
          <>
            <div className="flex items-end justify-between gap-3 mb-3 flex-wrap">
              <div>
                <p className="text-xs mb-0.5" style={{ color: "var(--tenue)" }}>Te pagaron</p>
                <p className="num font-bold text-2xl leading-none">{pesos(deEsoPagaron)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs mb-0.5" style={{ color: "var(--tenue)" }}>Debiste cobrar</p>
                <p className="num font-bold text-xl leading-none">{pesos(debiste)}</p>
              </div>
            </div>

            <div className="h-2 rounded-full overflow-hidden mb-2" style={{ background: "var(--humo)" }}>
              <div className="barra" style={{ width: pct + "%", background: "var(--verde)" }} />
            </div>
            <p className="text-xs" style={{ color: "var(--tenue)" }}>
              Cobraste el <span className="num font-semibold" style={{ color: "var(--tinta)" }}>{pct}%</span> de lo que te tocaba
            </p>
          </>
        )}
      </section>

      {/* ---------- 3. personas ---------- */}
      {personas > 0 && (
        <section className="grid grid-cols-2 gap-3 mb-8">
          <div className="rounded-lg p-4" style={{ border: "1.5px solid var(--linea)" }}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Check size={14} strokeWidth={3} style={{ color: "var(--verde)" }} />
              <span className="text-xs font-medium" style={{ color: "var(--tenue)" }}>Pagaron</span>
            </div>
            <p className="num font-bold text-3xl leading-none" style={{ color: "var(--verde)" }}>
              {pagaron}
            </p>
            <p className="text-xs mt-1.5" style={{ color: "var(--tenue)" }}>
              de {personas} {personas === 1 ? "persona" : "personas"}
            </p>
          </div>

          <div className="rounded-lg p-4" style={{ border: "1.5px solid var(--linea)" }}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Clock size={14} strokeWidth={2.5} style={{ color: "var(--rojo)" }} />
              <span className="text-xs font-medium" style={{ color: "var(--tenue)" }}>Deben</span>
            </div>
            <p className="num font-bold text-3xl leading-none" style={{ color: deben > 0 ? "var(--rojo)" : "var(--tinta)" }}>
              {deben}
            </p>
            <p className="text-xs mt-1.5" style={{ color: "var(--tenue)" }}>
              de {personas} {personas === 1 ? "persona" : "personas"}
            </p>
          </div>
        </section>
      )}

      {/* ---------- 4. mas atrasados ---------- */}
      <section>
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle size={15} style={{ color: "var(--rojo)" }} />
          <p className="font-semibold text-sm">Los mas atrasados</p>
        </div>
        <p className="text-xs mb-3" style={{ color: "var(--tenue)" }}>
          Hoy, sin importar la semana o el mes.
        </p>

        {top.length === 0 ? (
          <p className="text-sm py-6 text-center" style={{ color: "var(--tenue)" }}>
            Nadie esta atrasado. Asi da gusto.
          </p>
        ) : (
          <div style={{ borderTop: "1px solid var(--linea)" }}>
            {top.map((c) => (
              <button key={c.deudaId} className="fila" onClick={() => abrirDeuda(c.deudaId)}>
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{c.nombre}</p>
                    <p className="text-xs mt-0.5 font-semibold" style={{ color: colorDias(c.dias) }}>
                      {c.dias} {c.dias === 1 ? "dia" : "dias"} de atraso
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <p className="num font-bold" style={{ color: "var(--rojo)" }}>
                      {pesos(c.saldo)}
                    </p>
                    <ChevronRight size={16} style={{ color: "var(--tenue)" }} />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
