"use client";

import { useState } from "react";
import { X, Search, Check, UserPlus } from "lucide-react";
import { pesos, aPesos, hoyISO } from "../acciones";

/* Ventanas emergentes: nueva deuda, nuevo deudor y registrar pago. */

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

/* ------------------ campos de deuda compartidos ------------------ */

function CamposDeuda({ concepto, setCon, monto, setMonto, vence, setVence, ocupado }) {
  return (
    <>
      <label className="block text-sm font-medium mb-1.5">De que es la deuda</label>
      <input className="campo mb-4" placeholder="Afinacion, mensualidad, pedido"
             value={concepto} disabled={ocupado}
             onChange={(e) => setCon(e.target.value)} />

      <div className="grid grid-cols-2 gap-3 mb-5">
        <div>
          <label className="block text-sm font-medium mb-1.5">Cuanto debe</label>
          <input className="campo num" type="number" inputMode="decimal"
                 placeholder="0" min="0" step="0.01"
                 value={monto} disabled={ocupado}
                 onChange={(e) => setMonto(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Para cuando</label>
          <input className="campo" type="date" value={vence} disabled={ocupado}
                 onChange={(e) => setVence(e.target.value)} />
        </div>
      </div>
    </>
  );
}

/* -------------------------- nueva deuda -------------------------- */
/* Para alguien que YA esta en la lista de clientes. */

export function ModalDeuda({ clientes, clienteFijo, cerrar, onGuardar, irANuevoDeudor, ocupado, error }) {
  const [clienteId, setCli] = useState(clienteFijo ?? clientes[0]?.id ?? "");
  const [busca, setBusca]   = useState("");
  const [concepto, setCon]  = useState("");
  const [monto, setMonto]   = useState("");
  const [vence, setVence]   = useState(hoyISO());

  /* Sin clientes: mandarlo directo a crear uno */
  if (clientes.length === 0) {
    return (
      <Marco titulo="Nueva deuda" cerrar={cerrar}>
        <p className="text-sm mb-5" style={{ color: "var(--tenue)" }}>
          Todavia no tienes a nadie en tu lista. Registra a tu primer deudor
          con su deuda de una vez.
        </p>
        <button className="btn btn-solido w-full flex items-center justify-center gap-1.5"
                onClick={irANuevoDeudor}>
          <UserPlus size={16} /> Registrar deudor nuevo
        </button>
      </Marco>
    );
  }

  const lista = busca.trim()
    ? clientes.filter((c) => c.name.toLowerCase().includes(busca.toLowerCase()))
    : clientes;

  const muchos = clientes.length > 6;

  return (
    <Marco titulo="Nueva deuda" cerrar={cerrar}>
      {/* --- elegir cliente, bien visible --- */}
      <label className="block text-sm font-medium mb-2">Quien te debe</label>

      {muchos && (
        <div className="relative mb-2">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--tenue)" }} />
          <input className="campo" style={{ paddingLeft: 36 }}
                 placeholder="Buscar en tus clientes"
                 value={busca} disabled={ocupado}
                 onChange={(e) => setBusca(e.target.value)} />
        </div>
      )}

      <div className="rounded-lg mb-2"
           style={{
             border: "1.5px solid var(--linea)",
             maxHeight: 190,
             overflowY: "auto",
           }}>
        {lista.length === 0 ? (
          <p className="text-sm p-3" style={{ color: "var(--tenue)" }}>
            Nadie con ese nombre.
          </p>
        ) : (
          lista.map((c, i) => {
            const elegido = c.id === clienteId;
            return (
              <button key={c.id} disabled={ocupado}
                onClick={() => setCli(c.id)}
                className="flex items-center justify-between gap-3 w-full text-left px-3 py-2.5"
                style={{
                  background: elegido ? "var(--humo)" : "transparent",
                  border: 0,
                  borderTop: i === 0 ? "none" : "1px solid var(--linea)",
                  cursor: ocupado ? "not-allowed" : "pointer",
                }}>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold truncate">{c.name}</span>
                  {c.phone && (
                    <span className="block text-xs" style={{ color: "var(--tenue)" }}>
                      {c.phone}
                    </span>
                  )}
                </span>
                {elegido && <Check size={16} strokeWidth={3} className="shrink-0" />}
              </button>
            );
          })
        )}
      </div>

      <button onClick={irANuevoDeudor} disabled={ocupado}
        className="text-xs font-semibold mb-5"
        style={{
          background: "none", border: 0, padding: 0,
          cursor: "pointer", textDecoration: "underline",
          color: "var(--tenue)",
        }}>
        No esta en la lista, es alguien nuevo
      </button>

      <CamposDeuda
        concepto={concepto} setCon={setCon}
        monto={monto} setMonto={setMonto}
        vence={vence} setVence={setVence}
        ocupado={ocupado}
      />

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

/* -------------------------- nuevo deudor ------------------------- */
/* Crea el cliente Y su deuda de un jalon. */

export function ModalDeudor({ cerrar, onGuardar, ocupado, error }) {
  const [nombre, setNom]   = useState("");
  const [telefono, setTel] = useState("");
  const [correo, setCor]   = useState("");
  const [concepto, setCon] = useState("");
  const [monto, setMonto]  = useState("");
  const [vence, setVence]  = useState(hoyISO());

  return (
    <Marco titulo="Nuevo deudor" cerrar={cerrar}>
      <p className="text-sm mb-5" style={{ color: "var(--tenue)" }}>
        Registra a la persona y lo que te debe en un solo paso.
      </p>

      <label className="block text-sm font-medium mb-1.5">Nombre</label>
      <input className="campo mb-4" value={nombre} disabled={ocupado}
             placeholder="Juan Ramirez"
             onChange={(e) => setNom(e.target.value)} />

      <label className="block text-sm font-medium mb-1.5">WhatsApp</label>
      <input className="campo mb-1 num" type="tel" inputMode="numeric"
             placeholder="7351234567" value={telefono} disabled={ocupado}
             onChange={(e) => setTel(e.target.value)} />
      <p className="text-xs mb-4" style={{ color: "var(--tenue)" }}>
        10 digitos, sin el 52 ni espacios. Sin esto no le puedes mandar recordatorios.
      </p>

      <label className="block text-sm font-medium mb-1.5">Correo</label>
      <input className="campo mb-5" type="email" placeholder="opcional"
             value={correo} disabled={ocupado}
             onChange={(e) => setCor(e.target.value)} />

      <div className="mb-5" style={{ borderTop: "1px solid var(--linea)" }} />

      <CamposDeuda
        concepto={concepto} setCon={setCon}
        monto={monto} setMonto={setMonto}
        vence={vence} setVence={setVence}
        ocupado={ocupado}
      />

      {error && (
        <p className="text-sm font-medium mb-4" style={{ color: "var(--rojo)" }}>
          {error}
        </p>
      )}

      <button className="btn btn-solido w-full" disabled={ocupado}
        onClick={() =>
          onGuardar({ nombre, telefono, correo, concepto, montoPesos: monto, vence })
        }>
        {ocupado ? "Guardando..." : "Guardar deudor y su deuda"}
      </button>
    </Marco>
  );
}

/* ------------------- solo cliente, sin deuda --------------------- */

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
