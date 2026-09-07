"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { pesos, aPesos, hoyISO } from "../acciones";

/* Ventanas emergentes: nueva deuda, nuevo cliente y registrar pago. */

/* ----------------------------- marco ----------------------------- */

export function Marco({ titulo, cerrar, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4"
         style={{ background: "rgba(0,0,0,.45)" }} onClick={cerrar}>
      <div className="w-full md:max-w-md p-5 surge"
           style={{
             background: "var(--papel)",
             borderRadius: "14px 14px 0 0",
             maxHeight: "90vh",
             overflowY: "auto",
           }}
           onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <p className="font-bold text-lg tracking-tight">{titulo}</p>
          <button className="btn-ico" onClick={cerrar} aria-label="Cerrar">
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* -------------------------- nueva deuda -------------------------- */

export function ModalDeuda({ clientes, cerrar, onGuardar, ocupado, error }) {
  const [clienteId, setCli] = useState(clientes[0]?.id ?? "");
  const [concepto, setCon]  = useState("");
  const [monto, setMonto]   = useState("");
  const [vence, setVence]   = useState(hoyISO());

  if (clientes.length === 0) {
    return (
      <Marco titulo="Nueva deuda" cerrar={cerrar}>
        <p className="text-sm mb-5">
          Primero agrega un cliente. Sin cliente no se puede registrar una deuda.
        </p>
        <button className="btn btn-solido w-full" onClick={cerrar}>
          Entendido
        </button>
      </Marco>
    );
  }

  return (
    <Marco titulo="Nueva deuda" cerrar={cerrar}>
      <label className="block text-sm font-medium mb-1.5">Cliente</label>
      <select className="campo mb-4" value={clienteId} disabled={ocupado}
              onChange={(e) => setCli(e.target.value)}>
        {clientes.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>

      <label className="block text-sm font-medium mb-1.5">Concepto</label>
      <input className="campo mb-4" placeholder="Afinacion, mensualidad, pedido"
             value={concepto} disabled={ocupado}
             onChange={(e) => setCon(e.target.value)} />

      <div className="grid grid-cols-2 gap-3 mb-5">
        <div>
          <label className="block text-sm font-medium mb-1.5">Monto</label>
          <input className="campo num" type="number" inputMode="decimal"
                 placeholder="0" min="0" step="0.01"
                 value={monto} disabled={ocupado}
                 onChange={(e) => setMonto(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Vence</label>
          <input className="campo" type="date" value={vence} disabled={ocupado}
                 onChange={(e) => setVence(e.target.value)} />
        </div>
      </div>

      {error && (
        <p className="text-sm font-medium mb-4" style={{ color: "var(--rojo)" }}>
          {error}
        </p>
      )}

      <button className="btn btn-solido w-full" disabled={ocupado}
        onClick={() => onGuardar({ clienteId, concepto, montoPesos: monto, vence })}>
        {ocupado ? "Guardando..." : "Guardar deuda"}
      </button>
    </Marco>
  );
}

/* ------------------------- nuevo cliente ------------------------- */

export function ModalCliente({ cerrar, onGuardar, ocupado, error }) {
  const [nombre, setNom]   = useState("");
  const [telefono, setTel] = useState("");
  const [correo, setCor]   = useState("");

  return (
    <Marco titulo="Nuevo cliente" cerrar={cerrar}>
      <label className="block text-sm font-medium mb-1.5">Nombre</label>
      <input className="campo mb-4" value={nombre} disabled={ocupado}
             placeholder="Juan Ramirez"
             onChange={(e) => setNom(e.target.value)} />

      <label className="block text-sm font-medium mb-1.5">WhatsApp</label>
      <input className="campo mb-1 num" type="tel" inputMode="numeric"
             placeholder="7351234567" value={telefono} disabled={ocupado}
             onChange={(e) => setTel(e.target.value)} />
      <p className="text-xs mb-4" style={{ color: "var(--tenue)" }}>
        10 digitos, sin el 52 ni espacios.
      </p>

      <label className="block text-sm font-medium mb-1.5">Correo</label>
      <input className="campo mb-5" type="email" placeholder="opcional"
             value={correo} disabled={ocupado}
             onChange={(e) => setCor(e.target.value)} />

      {error && (
        <p className="text-sm font-medium mb-4" style={{ color: "var(--rojo)" }}>
          {error}
        </p>
      )}

      <button className="btn btn-solido w-full" disabled={ocupado}
        onClick={() => onGuardar({ nombre, telefono, correo })}>
        {ocupado ? "Guardando..." : "Guardar cliente"}
      </button>
    </Marco>
  );
}

/* ------------------------- registrar pago ------------------------ */

export function ModalPago({ deuda, cerrar, onGuardar, ocupado, error }) {
  const saldoPesos = aPesos(deuda.balance_cents);

  const [monto, setMonto]   = useState(String(saldoPesos));
  const [metodo, setMetodo] = useState("efectivo");

  const n       = Number(monto) || 0;
  const liquida = n >= saldoPesos;
  const restan  = Math.max(saldoPesos - n, 0);

  return (
    <Marco titulo="Registrar pago" cerrar={cerrar}>
      <p className="text-sm mb-4" style={{ color: "var(--tenue)" }}>
        Saldo de {deuda.customer_name}:{" "}
        <span className="num font-semibold" style={{ color: "#000" }}>
          {pesos(deuda.balance_cents)}
        </span>
      </p>

      <label className="block text-sm font-medium mb-1.5">Cuanto pago</label>
      <input className="campo num mb-2" type="number" inputMode="decimal"
             min="0" step="0.01" max={saldoPesos}
             value={monto} disabled={ocupado}
             onChange={(e) => setMonto(e.target.value)} />

      <div className="flex gap-2 mb-2">
        <button className="btn text-xs" disabled={ocupado}
          onClick={() => setMonto(String(saldoPesos))}>
          Todo
        </button>
        <button className="btn text-xs" disabled={ocupado}
          onClick={() => setMonto(String(Math.round(saldoPesos / 2)))}>
          Mitad
        </button>
      </div>

      <p className="text-xs mb-4" style={{ color: "var(--tenue)" }}>
        {n <= 0
          ? "Escribe cuanto abono."
          : liquida
          ? "Liquida la deuda completa."
          : `Queda debiendo ${restan.toLocaleString("es-MX", {
              style: "currency",
              currency: "MXN",
              minimumFractionDigits: 0,
            })}.`}
      </p>

      <label className="block text-sm font-medium mb-1.5">Como pago</label>
      <select className="campo mb-5" value={metodo} disabled={ocupado}
              onChange={(e) => setMetodo(e.target.value)}>
        <option value="efectivo">Efectivo</option>
        <option value="transferencia">Transferencia</option>
        <option value="mercado pago">Mercado Pago</option>
        <option value="otro">Otro</option>
      </select>

      {error && (
        <p className="text-sm font-medium mb-4" style={{ color: "var(--rojo)" }}>
          {error}
        </p>
      )}

      <button className="btn btn-solido w-full" disabled={ocupado || n <= 0}
        onClick={() =>
          onGuardar({
            deudaId: deuda.id,
            montoPesos: monto,
            metodo,
            saldoCentavos: deuda.balance_cents,
          })
        }>
        {ocupado ? "Guardando..." : "Registrar pago"}
      </button>
    </Marco>
  );
}
