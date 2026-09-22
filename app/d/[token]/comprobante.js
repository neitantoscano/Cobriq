/* Comprobante de pago en imagen.
   Se dibuja a mano en un canvas, igual que el reporte, para que
   siempre salga igual en cualquier celular.
   OJO: es un comprobante, no una factura fiscal, y lo dice. */

const C = {
  negro: "#000000",
  blanco: "#FFFFFF",
  verde: "#0F7B3D",
  verdeSuave: "#E8F5EC",
  tenue: "#6B7280",
  linea: "#E5E7EB",
  humo: "#F3F4F6",
};

const FUENTE = "Helvetica, Arial, sans-serif";

const pesos = (c) =>
  (Number(c || 0) / 100).toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const METODOS = {
  transferencia: "Transferencia",
  efectivo: "Efectivo",
  deposito: "Deposito en banco",
  mercadopago: "Mercado Pago",
  mercado_pago: "Mercado Pago",
  mp: "Mercado Pago",
  tarjeta: "Tarjeta",
  otro: "Otro",
};

export const nombreMetodo = (m) => {
  const k = String(m || "otro").toLowerCase();
  if (METODOS[k]) return METODOS[k];
  return k.charAt(0).toUpperCase() + k.slice(1);
};

export const fechaLargaPago = (s) => {
  if (!s) return "";
  return new Date(s + "T00:00:00").toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

/* Solo bold o normal: los pesos con numero no los entienden
   todos los celulares y la letra sale diminuta. */
function letra(ctx, grueso, tam) {
  ctx.font = (grueso ? "bold" : "normal") + " " + tam + "px " + FUENTE;
}

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

function recortar(ctx, texto, ancho) {
  const t0 = String(texto ?? "");
  if (ctx.measureText(t0).width <= ancho) return t0;
  let t = t0;
  while (t.length > 1 && ctx.measureText(t + "...").width > ancho) t = t.slice(0, -1);
  return t + "...";
}

/* crear(w, h) regresa un canvas nuevo.
   d = { negocio, cliente, concepto, folio, monto, fecha, metodo, saldo } */
export function pintarComprobante(crear, d) {
  const W = 1080;
  const M = 72;
  const A = W - M * 2;

  const lienzo = crear(W, 2000);
  const ctx = lienzo.getContext("2d");
  ctx.textBaseline = "alphabetic";

  ctx.fillStyle = C.blanco;
  ctx.fillRect(0, 0, W, 2000);

  /* ---------- encabezado ---------- */
  ctx.fillStyle = C.negro;
  ctx.fillRect(0, 0, W, 210);

  const lx = M, ly = 58, ls = 92;
  ctx.fillStyle = "#111111";
  cajaRedonda(ctx, lx, ly, ls, ls, 20);
  ctx.fill();
  const grad = ctx.createLinearGradient(lx, ly, lx + ls, ly + ls);
  grad.addColorStop(0, "#39FF14");
  grad.addColorStop(0.5, "#00F0FF");
  grad.addColorStop(1, "#B14BFF");
  ctx.fillStyle = grad;
  letra(ctx, true, 64);
  ctx.textAlign = "center";
  ctx.fillText("C", lx + ls / 2, ly + 70);
  ctx.textAlign = "left";

  ctx.fillStyle = C.blanco;
  letra(ctx, true, 46);
  ctx.fillText(recortar(ctx, d.negocio || "Negocio", A - ls - 40), lx + ls + 30, ly + 44);
  ctx.fillStyle = "#9CA3AF";
  letra(ctx, false, 30);
  ctx.fillText("Comprobante de pago", lx + ls + 30, ly + 84);

  let y = 300;

  /* ---------- palomita y monto ---------- */
  const cx = W / 2, cr = 58;
  ctx.fillStyle = C.verdeSuave;
  ctx.beginPath();
  ctx.arc(cx, y, cr, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = C.verde;
  ctx.lineWidth = 12;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(cx - 26, y + 2);
  ctx.lineTo(cx - 6, y + 22);
  ctx.lineTo(cx + 28, y - 18);
  ctx.stroke();
  y += cr + 70;

  ctx.textAlign = "center";
  ctx.fillStyle = C.tenue;
  letra(ctx, false, 34);
  ctx.fillText("Pago recibido", cx, y);
  y += 110;

  ctx.fillStyle = C.verde;
  letra(ctx, true, 110);
  ctx.fillText(recortar(ctx, pesos(d.monto), A), cx, y);
  y += 60;

  ctx.fillStyle = C.tenue;
  letra(ctx, false, 30);
  ctx.fillText(fechaLargaPago(d.fecha), cx, y);
  ctx.textAlign = "left";
  y += 70;

  /* ---------- detalle ---------- */
  const filas = [
    ["Folio", d.folio || "-"],
    ["Pago de", d.cliente || "-"],
    ["Concepto", d.concepto || "-"],
    ["Metodo", nombreMetodo(d.metodo)],
  ];

  const altoFila = 84;
  const altoCaja = filas.length * altoFila + 40;
  ctx.fillStyle = C.humo;
  cajaRedonda(ctx, M, y, A, altoCaja, 28);
  ctx.fill();

  let fy = y + 20;
  filas.forEach(([k, v], i) => {
    if (i > 0) {
      ctx.strokeStyle = C.linea;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(M + 36, fy);
      ctx.lineTo(M + A - 36, fy);
      ctx.stroke();
    }
    const base = fy + 54;
    ctx.fillStyle = C.tenue;
    letra(ctx, false, 30);
    ctx.fillText(k, M + 36, base);

    letra(ctx, true, 32);
    const anchoK = 260;
    ctx.fillStyle = C.negro;
    ctx.textAlign = "right";
    ctx.fillText(recortar(ctx, v, A - 72 - anchoK), M + A - 36, base);
    ctx.textAlign = "left";
    fy += altoFila;
  });
  y += altoCaja + 40;

  /* ---------- saldo ---------- */
  const liquidado = Number(d.saldo || 0) <= 0;
  ctx.strokeStyle = liquidado ? C.verde : C.linea;
  ctx.lineWidth = 3;
  cajaRedonda(ctx, M, y, A, 120, 28);
  ctx.stroke();

  ctx.fillStyle = C.tenue;
  letra(ctx, false, 30);
  ctx.fillText(liquidado ? "Estado" : "Te queda por pagar", M + 36, y + 72);

  ctx.textAlign = "right";
  ctx.fillStyle = liquidado ? C.verde : C.negro;
  letra(ctx, true, 40);
  ctx.fillText(liquidado ? "Liquidado" : pesos(d.saldo), M + A - 36, y + 74);
  ctx.textAlign = "left";
  y += 120 + 70;

  /* ---------- aviso legal y pie ---------- */
  ctx.textAlign = "center";
  ctx.fillStyle = C.tenue;
  letra(ctx, false, 26);
  ctx.fillText("Este comprobante no es una factura fiscal.", cx, y);
  y += 42;
  ctx.fillText("Si necesitas factura, pidela directo al negocio.", cx, y);
  y += 70;

  ctx.strokeStyle = C.linea;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(M, y);
  ctx.lineTo(M + A, y);
  ctx.stroke();
  y += 56;

  letra(ctx, true, 26);
  ctx.fillText("Cobriq", cx, y);
  ctx.textAlign = "left";
  y += 56;

  const final = crear(W, Math.ceil(y));
  final.getContext("2d").drawImage(lienzo, 0, 0);
  return final;
}

/* Comparte la imagen en celular o la descarga en computadora.
   Regresa false si algo fallo. */
export async function entregarImagen(canvas, nombreArchivo, titulo) {
  const blob = await new Promise((ok) => canvas.toBlob(ok, "image/png"));
  if (!blob) return false;

  const archivo = new File([blob], nombreArchivo, { type: "image/png" });

  if (navigator.canShare && navigator.canShare({ files: [archivo] })) {
    try {
      await navigator.share({ files: [archivo], title: titulo });
      return true;
    } catch (e) {
      /* Cancelar el menu no es error */
      if (e && e.name === "AbortError") return true;
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  return true;
}
