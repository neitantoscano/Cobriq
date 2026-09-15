"use client";

import { useState, useEffect } from "react";
import { Check, LogOut, CreditCard, ExternalLink, Sparkles, AlertTriangle } from "lucide-react";

/* Ajustes: plan, Mercado Pago, cuando mandar recordatorios,
   plantilla del mensaje y cerrar sesion. */

export default function Ajustes({ perfil, ajustes, onGuardar, onSalir, ocupado }) {
  const aTexto = (arr) => (arr ?? []).join(", ");

  const [antes, setAntes]     = useState(aTexto(ajustes?.days_before));
  const [despues, setDespues] = useState(aTexto(ajustes?.days_after));
  const [correo, setCorreo]   = useState(ajustes?.email_enabled ?? true);
  const [plantilla, setPlant] = useState(ajustes?.message_template ?? "");
  const [error, setError]     = useState("");

  /* Las fechas se calculan ya montado el componente para que el
     servidor y el navegador no dibujen cosas distintas. */
  const [diasPrueba, setDiasPrueba] = useState(null);
  const [renueva, setRenueva]       = useState("");

  useEffect(() => {
    if (perfil?.trial_ends_at) {
      const ms = new Date(perfil.trial_ends_at).getTime() - Date.now();
      setDiasPrueba(Math.max(0, Math.ceil(ms / 86400000)));
    }
    if (perfil?.current_period_end) {
      setRenueva(
        new Date(perfil.current_period_end).toLocaleDateString("es-MX", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      );
    }
  }, [perfil?.trial_ends_at, perfil?.current_period_end]);

  const plan      = perfil?.plan ?? "trial";
  const conectado = perfil?.mp_connected === true;

  const enPrueba     = plan === "trial" && diasPrueba !== null && diasPrueba > 0;
  const yaFuePagando = Boolean(perfil?.stripe_customer_id);

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

  const tituloSinPlan = enPrueba
    ? diasPrueba === 1
      ? "Te queda 1 dia de prueba"
      : "Te quedan " + diasPrueba + " dias de prueba"
    : plan === "canceled"
      ? "Cancelaste tu plan"
      : "Tu prueba termino";

  const textoSinPlan = enPrueba
    ? "Cuando se acabe vas a poder seguir viendo todo y registrando pagos, pero ya no podras dar de alta deudores nuevos."
    : "Puedes seguir viendo todo y registrando pagos, pero ya no puedes dar de alta deudores nuevos. Activa el plan para volver a la normalidad.";

  return (
    <div className="surge max-w-lg">
      <h1 className="text-2xl font-bold tracking-tight mb-1">Ajustes</h1>
      <p className="text-sm mb-8" style={{ color: "var(--tenue)" }}>
        {perfil?.business_name} &middot; {perfil?.email}
      </p>

      {/* ---------------- plan activo ---------------- */}
      {plan === "active" && (
        <section className="mb-8 rounded-lg p-4"
                 style={{ border: "1.5px solid var(--verde)", background: "var(--verde-suave)" }}>
          <div className="flex items-start gap-3">
            <Check size={19} className="shrink-0 mt-0.5" style={{ color: "var(--verde)" }} />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm">Tu plan esta activo</p>
              <p className="text-xs mt-1" style={{ color: "var(--tenue)" }}>
                $249 al mes.{renueva ? " Se renueva el " + renueva + "." : ""}
              </p>
              <div className="mt-3">
                <a href="/api/stripe/portal"
                   className="text-xs font-semibold inline-flex items-center gap-1"
                   style={{ color: "var(--tenue)", textDecoration: "underline" }}>
                  Cambiar tarjeta o cancelar
                  <ExternalLink size={12} />
                </a>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ---------------- pago rechazado ---------------- */}
      {plan === "past_due" && (
        <section className="mb-8 rounded-lg p-4" style={{ border: "1.5px solid var(--rojo)" }}>
          <div className="flex items-start gap-3">
            <AlertTriangle size={19} className="shrink-0 mt-0.5" style={{ color: "var(--rojo)" }} />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm">No pudimos cobrar tu plan</p>
              <p className="text-xs mt-1" style={{ color: "var(--tenue)" }}>
                Tu tarjeta rechazo el cargo. Cambiala para que Cobriq siga trabajando.
              </p>
              <div className="mt-3">
                <a href="/api/stripe/portal"
                   className="btn btn-solido inline-flex items-center gap-1.5"
                   style={{ textDecoration: "none" }}>
                  Cambiar tarjeta
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ---------------- prueba o sin plan ---------------- */}
      {plan !== "active" && plan !== "past_due" && (
        <section className="mb-8 rounded-lg p-4"
                 style={{ border: "1.5px solid " + (enPrueba ? "var(--linea)" : "var(--rojo)") }}>
          <div className="flex items-start gap-3">
            <Sparkles size={19} className="shrink-0 mt-0.5"
                      style={{ color: enPrueba ? "var(--tinta)" : "var(--rojo)" }} />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm">{tituloSinPlan}</p>
              <p className="text-xs mt-1" style={{ color: "var(--tenue)" }}>
                {textoSinPlan}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-4">
                <a href="/api/stripe/suscribir"
                   className="btn btn-solido inline-flex items-center gap-1.5"
                   style={{ textDecoration: "none" }}>
                  Activar plan &middot; $249 al mes
                  <ExternalLink size={14} />
                </a>

                {yaFuePagando && (
                  <a href="/api/stripe/portal"
                     className="text-xs font-semibold inline-flex items-center gap-1"
                     style={{ color: "var(--tenue)", textDecoration: "underline" }}>
                    Ver mis recibos
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ---------------- Mercado Pago ---------------- */}
      <section className="mb-8 rounded-lg p-4"
               style={{
                 border: "1.5px solid " + (conectado ? "var(--verde)" : "var(--linea)"),
                 background: conectado ? "var(--verde-suave)" : "transparent",
               }}>
        <div className="flex items-start gap-3">
          <CreditCard size={19} className="shrink-0 mt-0.5"
                      style={{ color: conectado ? "var(--verde)" : "var(--tinta)" }} />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm">
              {conectado ? "Cobras con Mercado Pago" : "Cobra con Mercado Pago"}
            </p>

            {conectado ? (
              <p className="text-xs mt-1" style={{ color: "var(--tenue)" }}>
                Tus deudores ya pueden pagarte con tarjeta o en efectivo desde
                el link. El dinero cae directo en tu cuenta y el saldo se
                actualiza solo.
              </p>
            ) : (
              <p className="text-xs mt-1" style={{ color: "var(--tenue)" }}>
                Conecta tu cuenta y tus deudores van a poder pagarte desde el
                link, sin que tengas que confirmar nada. El dinero llega a tu
                cuenta de Mercado Pago, Cobriq nunca lo toca.
              </p>
            )}

            <div className="mt-3">
              {conectado ? (
                <a href="/api/mp/conectar"
                   className="text-xs font-semibold"
                   style={{ color: "var(--tenue)", textDecoration: "underline" }}>
                  Volver a conectar
                </a>
              ) : (
                <a href="/api/mp/conectar"
                   className="btn btn-solido inline-flex items-center gap-1.5"
                   style={{ textDecoration: "none" }}>
                  Conectar Mercado Pago
                  <ExternalLink size={14} />
                </a>
              )}
            </div>
          </div>

          {conectado && (
            <span className="chip chip-verde shrink-0">
              <Check size={11} strokeWidth={3} />Listo
            </span>
          )}
        </div>
      </section>

      {/* ---------------- recordatorios ---------------- */}
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

      {/* ---------------- correo ---------------- */}
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

      {/* ---------------- plantilla ---------------- */}
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
