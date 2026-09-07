"use client";

import { useState } from "react";
import { Check, LogOut } from "lucide-react";

/* Ajustes: cuando mandar recordatorios, plantilla del mensaje
   y cerrar sesion. */

export default function Ajustes({ perfil, ajustes, onGuardar, onSalir, ocupado }) {
  const aTexto = (arr) => (arr ?? []).join(", ");

  const [antes, setAntes]       = useState(aTexto(ajustes?.days_before));
  const [despues, setDespues]   = useState(aTexto(ajustes?.days_after));
  const [correo, setCorreo]     = useState(ajustes?.email_enabled ?? true);
  const [plantilla, setPlant]   = useState(ajustes?.message_template ?? "");
  const [error, setError]       = useState("");

  /* Convierte "1, 7, 15" en [1,7,15]. Ignora basura. */
  const aNumeros = (txt) =>
    txt
      .split(",")
      .map((n) => parseInt(n.trim(), 10))
      .filter((n) => Number.isInteger(n) && n >= 0 && n <= 365);

  const guardar = () => {
    setError("");

    const arrAntes   = aNumeros(antes);
    const arrDespues = aNumeros(despues);

    if (arrAntes.length === 0 && arrDespues.length === 0) {
      setError("Pon al menos un dia, antes o despues del vencimiento.");
      return;
    }
    if (!plantilla.includes("{saldo}")) {
      setError("El mensaje necesita incluir {saldo}.");
      return;
    }

    onGuardar({
      diasAntes: arrAntes,
      diasDespues: arrDespues,
      correoActivo: correo,
      plantilla: plantilla.trim(),
    });
  };

  return (
    <div className="surge max-w-lg">
      <h1 className="text-2xl font-bold tracking-tight mb-1">Ajustes</h1>
      <p className="text-sm mb-8" style={{ color: "var(--tenue)" }}>
        {perfil?.business_name} · {perfil?.email}
      </p>

      <section className="mb-8">
        <p className="font-semibold text-sm mb-1">Cuando mandar recordatorios</p>
        <p className="text-xs mb-4" style={{ color: "var(--tenue)" }}>
          Cobriq los manda solos a las 9 de la manana.
        </p>

        <label className="block text-sm font-medium mb-1.5">
          Dias antes de que venza
        </label>
        <input className="campo mb-1" value={antes} disabled={ocupado}
               onChange={(e) => setAntes(e.target.value)} placeholder="3" />
        <p className="text-xs mb-4" style={{ color: "var(--tenue)" }}>
          Separa con comas. Dejalo vacio si no quieres avisar antes.
        </p>

        <label className="block text-sm font-medium mb-1.5">
          Dias despues de vencida
        </label>
        <input className="campo mb-1" value={despues} disabled={ocupado}
               onChange={(e) => setDespues(e.target.value)} placeholder="1, 7, 15" />
        <p className="text-xs" style={{ color: "var(--tenue)" }}>
          Separa con comas.
        </p>
      </section>

      <section className="mb-8">
        <p className="font-semibold text-sm mb-3">Correo automatico</p>
        <button onClick={() => setCorreo(!correo)} disabled={ocupado}
          className="flex items-center gap-3 w-full p-3 rounded-lg"
          style={{
            border: "1.5px solid var(--linea)",
            background: "none",
            cursor: ocupado ? "not-allowed" : "pointer",
          }}>
          <span className="grid place-items-center w-5 h-5 rounded shrink-0"
            style={{
              border: "1.5px solid #000",
              background: correo ? "#000" : "transparent",
            }}>
            {correo && <Check size={13} color="#fff" strokeWidth={3.5} />}
          </span>
          <span className="text-sm text-left">
            Mandar recordatorios por correo sin que yo haga nada
          </span>
        </button>
        <p className="text-xs mt-2" style={{ color: "var(--tenue)" }}>
          WhatsApp siempre sale de tu numero, con un clic.
        </p>
      </section>

      <section className="mb-8">
        <p className="font-semibold text-sm mb-3">Mensaje que reciben</p>
        <textarea className="campo" rows={4} value={plantilla} disabled={ocupado}
                  onChange={(e) => setPlant(e.target.value)} />
        <p className="text-xs mt-1.5" style={{ color: "var(--tenue)" }}>
          Lo que va entre llaves se llena solo:{" "}
          <span style={{ color: "#000", fontWeight: 600 }}>
            {"{nombre} {saldo} {concepto} {link}"}
          </span>
        </p>
      </section>

      {error && (
        <p className="text-sm font-medium mb-4" style={{ color: "var(--rojo)" }}>
          {error}
        </p>
      )}

      <button className="btn btn-solido" onClick={guardar} disabled={ocupado}>
        {ocupado ? "Guardando..." : "Guardar cambios"}
      </button>

      <div className="mt-12 pt-6" style={{ borderTop: "1px solid var(--linea)" }}>
        <button className="btn flex items-center gap-1.5" onClick={onSalir}>
          <LogOut size={15} /> Cerrar sesion
        </button>
      </div>
    </div>
  );
}
