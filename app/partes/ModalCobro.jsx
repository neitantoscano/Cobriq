"use client";

import { useState } from "react";
import { Check, Copy, Send, Plus, Link2 } from "lucide-react";
import { Marco } from "./Modales";
import { pesos } from "../acciones";

/* Cobro suelto: nombre, que paga y cuanto.
   Al guardarlo entrega el link listo para mandar. */

export default function ModalCobro({
  cerrar, onGuardar, creado, onOtro, ocupado, error, origen,
}) {
  const [nombre, setNom]  = useState("");
  const [concepto, setCon] = useState("");
  const [monto, setMonto]  = useState("");
  const [copiado, setCop]  = useState(false);

  /* ---------- paso 2: ya quedo, aqui esta el link ---------- */
  if (creado) {
    const link = origen + "/d/" + creado.public_token;

    const copiar = async () => {
      try {
        await navigator.clipboard.writeText(link);
        setCop(true);
        setTimeout(() => setCop(false), 2000);
      } catch {
        window.prompt("Copia este link:", link);
      }
    };

    const texto =
      "Hola " + creado.payer_name + ", aqui puedes pagar " +
      creado.concept + " por " + pesos(creado.amount_cents) + ": " + link;

    return (
      <Marco titulo="Cobro listo" cerrar={cerrar}>
        <div className="rounded-lg p-4 mb-5"
             style={{ background: "var(--verde-suave)", border: "1.5px solid var(--verde)" }}>
          <div className="flex items-center gap-2 mb-3">
            <Check size={17} strokeWidth={3} style={{ color: "var(--verde)" }} />
            <p className="font-semibold text-sm">{creado.payer_name}</p>
          </div>
          <p className="text-sm" style={{ color: "var(--tenue)" }}>{creado.concept}</p>
          <p className="num text-3xl font-bold mt-1">{pesos(creado.amount_cents)}</p>
        </div>

        <label className="block text-sm font-medium mb-1.5">Su link de pago</label>
        <div className="flex items-center gap-2 p-3 rounded-lg mb-4"
             style={{ background: "var(--humo)" }}>
          <Link2 size={15} className="shrink-0" style={{ color: "var(--tenue)" }} />
          <span className="text-xs truncate flex-1" style={{ color: "var(--tenue)" }}>
            {link}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <button className="btn flex items-center justify-center gap-1.5" onClick={copiar}>
            {copiado
              ? <><Check size={15} strokeWidth={3} /> Copiado</>
              : <><Copy size={15} /> Copiar</>}
          </button>

          <a className="btn btn-solido flex items-center justify-center gap-1.5"
             style={{ textDecoration: "none" }}
             href={"https://wa.me/?text=" + encodeURIComponent(texto)}
             target="_blank" rel="noopener noreferrer">
            <Send size={15} /> Mandar
          </a>
        </div>

        <button className="btn w-full flex items-center justify-center gap-1.5"
                onClick={onOtro}>
          <Plus size={15} /> Hacer otro cobro
        </button>

        <p className="text-xs mt-4" style={{ color: "var(--tenue)" }}>
          Cuando pague te va a aparecer en Cobros. Si tienes Mercado Pago
          conectado puede pagar con tarjeta ahi mismo.
        </p>
      </Marco>
    );
  }

  /* ---------- paso 1: el formulario ---------- */
  const n = Number(monto) || 0;

  return (
    <Marco titulo="Nuevo cobro" cerrar={cerrar}>
      <p className="text-sm mb-5" style={{ color: "var(--tenue)" }}>
        Para algo que se paga de una vez. No entra a tus cuentas por cobrar
        ni manda recordatorios.
      </p>

      <label className="block text-sm font-medium mb-1.5">Quien paga</label>
      <input className="campo mb-4" placeholder="Don Chuy"
             value={nombre} disabled={ocupado}
             onChange={(e) => setNom(e.target.value)} />

      <label className="block text-sm font-medium mb-1.5">Que va a pagar</label>
      <input className="campo mb-1" placeholder="Una caja de tomates"
             value={concepto} disabled={ocupado}
             onChange={(e) => setCon(e.target.value)} />
      <p className="text-xs mb-4" style={{ color: "var(--tenue)" }}>
        Esto es lo que va a ver en su link.
      </p>

      <label className="block text-sm font-medium mb-1.5">Cuanto</label>
      <div className="relative mb-1">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm"
              style={{ color: "var(--tenue)" }}>$</span>
        <input className="campo num" type="number" inputMode="decimal"
               placeholder="0.00" style={{ paddingLeft: 26 }}
               value={monto} disabled={ocupado}
               onChange={(e) => setMonto(e.target.value)} />
      </div>
      <p className="text-xs mb-5" style={{ color: "var(--tenue)" }}>
        {n > 0 ? "Le vas a cobrar " + pesos(Math.round(n * 100)) : "En pesos."}
      </p>

      {error && (
        <p className="text-sm font-medium mb-4" style={{ color: "var(--rojo)" }}>
          {error}
        </p>
      )}

      <button className="btn btn-solido w-full" disabled={ocupado}
              onClick={() => onGuardar({ nombre, concepto, montoPesos: monto })}>
        {ocupado ? "Creando..." : "Crear cobro y sacar link"}
      </button>
    </Marco>
  );
}
