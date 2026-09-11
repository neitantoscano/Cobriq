"use client";

import { useState, useEffect, use } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { Check, AlertCircle } from "lucide-react";

/* Pantalla que ve el deudor al abrir su link.
   No necesita cuenta. Solo ve su deuda y puede avisar que ya pago. */

const pesos = (c) =>
  (Number(c || 0) / 100).toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

const fechaLarga = (s) =>
  new Date(s + "T00:00:00").toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

export default function PaginaDeudor({ params }) {
  const { token } = use(params);

  const sb = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const [deuda, setDeuda]       = useState(null);
  const [cargando, setCargando] = useState(true);
  const [noExiste, setNoExiste] = useState(false);

  const [abriendo, setAbrir]  = useState(false);
  const [monto, setMonto]     = useState("");
  const [metodo, setMetodo]   = useState("transferencia");
  const [enviando, setEnviar] = useState(false);
  const [error, setError]     = useState("");
  const [listo, setListo]     = useState(false);

  /* --------------------- traer la deuda --------------------- */
  const traer = async () => {
    const { data, error: err } = await sb.rpc("deuda_publica", { token });
    setCargando(false);

    if (err || !data || data.length === 0) {
      setNoExiste(true);
      return;
    }

    const d = data[0];
    setDeuda(d);
    setMonto(String(Number(d.saldo_cents) / 100));
  };

  useEffect(() => { traer(); }, []);

  /* --------------------- reportar pago ---------------------- */
  const reportar = async () => {
    setError("");

    const n = Number(monto);
    if (!n || n <= 0) {
      setError("Escribe cuanto pagaste.");
      return;
    }
    if (Math.round(n * 100) > Number(deuda.saldo_cents)) {
      setError("Ese monto es mayor a lo que debes.");
      return;
    }

    setEnviar(true);
    const { data, error: err } = await sb.rpc("reportar_pago", {
      token,
      centavos: Math.round(n * 100),
      metodo,
    });
    setEnviar(false);

    if (err) {
      setError("No se pudo enviar. Revisa tu internet e intenta de nuevo.");
      return;
    }
    if (!data?.ok) {
      setError(data?.error || "No se pudo enviar.");
      return;
    }

    setListo(true);
  };

  /* ------------------------ estilos ------------------------- */
  const CSS = `
    .dd { --tinta:#000; --papel:#fff; --humo:#f4f4f4; --linea:#e4e4e4; --tenue:#8a8a8a;
          --verde:#0F7B3D; --verde-suave:#E8F5EC; --rojo:#C0392B; --rojo-suave:#FCEBE9;
          font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
          color:#000; background:#fff; min-height:100vh;
          display:flex; align-items:center; justify-content:center; padding:20px; }
    .dd * { box-sizing:border-box; }
    .dd .caja { width:100%; max-width:400px; }
    .dd .num { font-variant-numeric:tabular-nums; letter-spacing:-0.02em; }

    .dd .campo { width:100%; border:1.5px solid var(--linea); border-radius:8px;
                 padding:12px 13px; font-size:16px; background:#fff; color:#000;
                 font-family:inherit; transition:border-color .18s; }
    .dd .campo:focus { outline:none; border-color:#000; }

    .dd .btn { width:100%; border:1.5px solid #000; background:#000; color:#fff;
               font-weight:600; font-size:16px; padding:14px 16px; border-radius:8px;
               cursor:pointer; font-family:inherit;
               transition:opacity .2s, transform .08s; }
    .dd .btn:hover { opacity:.85; }
    .dd .btn:active { transform:translateY(1px); }
    .dd .btn:disabled { opacity:.5; cursor:not-allowed; }

    .dd .btn-2 { width:100%; border:1.5px solid var(--linea); background:#fff; color:#000;
                 font-weight:600; font-size:15px; padding:13px 16px; border-radius:8px;
                 cursor:pointer; font-family:inherit;
                 transition:border-color .2s, background .2s; }
    .dd .btn-2:hover { border-color:#000; background:var(--humo); }

    .dd .chip { display:inline-flex; align-items:center; gap:5px; font-size:12px;
                font-weight:600; padding:4px 10px; border-radius:99px;
                border:1.5px solid var(--linea); }

    @keyframes surge { from{opacity:0; transform:translateY(8px)} to{opacity:1; transform:none} }
    .dd .surge { animation:surge .3s ease both; }
    @media (prefers-reduced-motion:reduce) { .dd * { animation:none !important; } }
  `;

  /* ------------------------ cargando ------------------------ */
  if (cargando) {
    return (
      <div className="dd">
        <style>{CSS}</style>
        <p style={{ color: "var(--tenue)", fontSize: 15 }}>Un momento...</p>
      </div>
    );
  }

  /* ---------------------- link invalido --------------------- */
  if (noExiste) {
    return (
      <div className="dd">
        <style>{CSS}</style>
        <div className="caja" style={{ textAlign: "center" }}>
          <AlertCircle size={30} style={{ margin: "0 auto 14px", display: "block" }} />
          <p style={{ fontWeight: 700, fontSize: 19, margin: 0 }}>
            Este link ya no esta activo
          </p>
          <p style={{ fontSize: 15, color: "var(--tenue)", marginTop: 8 }}>
            Puede que la cuenta ya se haya cerrado. Pregunta directo con el negocio.
          </p>
        </div>
      </div>
    );
  }

  /* -------------------- ya reporto el pago ------------------ */
  if (listo) {
    return (
      <div className="dd">
        <style>{CSS}</style>
        <div className="caja surge" style={{ textAlign: "center" }}>
          <div style={{
            display: "grid", placeItems: "center", width: 54, height: 54,
            borderRadius: 99, background: "var(--verde-suave)", color: "var(--verde)",
            margin: "0 auto 16px",
          }}>
            <Check size={28} strokeWidth={3} />
          </div>
          <p style={{ fontWeight: 700, fontSize: 20, margin: 0, letterSpacing: "-0.02em" }}>
            Aviso enviado
          </p>
          <p style={{ fontSize: 15, color: "var(--tenue)", marginTop: 10, lineHeight: 1.5 }}>
            {deuda.negocio} va a revisar tu pago y lo confirma.
            Tu saldo se actualiza cuando lo haga.
          </p>
        </div>
      </div>
    );
  }

  /* ------------------------ liquidada ----------------------- */
  if (deuda.estado === "paid") {
    return (
      <div className="dd">
        <style>{CSS}</style>
        <div className="caja surge" style={{ textAlign: "center" }}>
          <div style={{
            display: "grid", placeItems: "center", width: 54, height: 54,
            borderRadius: 99, background: "var(--verde-suave)", color: "var(--verde)",
            margin: "0 auto 16px",
          }}>
            <Check size={28} strokeWidth={3} />
          </div>
          <p style={{ fontWeight: 700, fontSize: 20, margin: 0, letterSpacing: "-0.02em" }}>
            No debes nada
          </p>
          <p style={{ fontSize: 15, color: "var(--tenue)", marginTop: 10 }}>
            Tu cuenta con {deuda.negocio} esta al corriente.
          </p>
        </div>
      </div>
    );
  }

  /* ------------------------ la deuda ------------------------ */
  const atraso  = Number(deuda.dias_atraso);
  const vencida = atraso > 0;

  return (
    <div className="dd">
      <style>{CSS}</style>

      <div className="caja surge">
        <p style={{ fontSize: 14, color: "var(--tenue)", margin: 0 }}>
          Hola {deuda.cliente},
        </p>
        <p style={{ fontSize: 15, marginTop: 4, marginBottom: 24 }}>
          esto es lo que debes en{" "}
          <span style={{ fontWeight: 700 }}>{deuda.negocio}</span>
        </p>

        <div style={{
          border: `1.5px solid ${vencida ? "var(--rojo)" : "var(--linea)"}`,
          background: vencida ? "var(--rojo-suave)" : "#fff",
          borderRadius: 12, padding: 20, marginBottom: 22,
        }}>
          <p style={{ fontSize: 13, color: "var(--tenue)", margin: 0 }}>
            {deuda.concepto}
          </p>
          <p className="num" style={{
            fontSize: 40, fontWeight: 700, lineHeight: 1.1, margin: "6px 0 0",
            color: vencida ? "var(--rojo)" : "#000",
          }}>
            {pesos(deuda.saldo_cents)}
          </p>

          {Number(deuda.pagado_cents) > 0 && (
            <p className="num" style={{ fontSize: 13, color: "var(--tenue)", marginTop: 6 }}>
              Ya llevas abonado {pesos(deuda.pagado_cents)} de {pesos(deuda.monto_cents)}
            </p>
          )}

          <div style={{ marginTop: 14 }}>
            <span className="chip" style={{
              borderColor: vencida ? "var(--rojo)" : "var(--linea)",
              background: vencida ? "var(--rojo)" : "transparent",
              color: vencida ? "#fff" : "var(--tenue)",
            }}>
              {vencida
                ? `Vencio hace ${atraso} ${atraso === 1 ? "dia" : "dias"}`
                : atraso === 0
                ? "Vence hoy"
                : `Vence el ${fechaLarga(deuda.vence)}`}
            </span>
          </div>
        </div>

        {!abriendo ? (
          <>
            <button className="btn-2" onClick={() => setAbrir(true)}>
              Ya pague, quiero avisar
            </button>
            <p style={{ fontSize: 13, color: "var(--tenue)", marginTop: 14, lineHeight: 1.5 }}>
              Paga como siempre lo haces con {deuda.negocio}. Aqui solo avisas
              para que quede registrado.
            </p>
          </>
        ) : (
          <div className="surge">
            <p style={{ fontWeight: 700, fontSize: 16, marginTop: 0, marginBottom: 16 }}>
              Cuentanos de tu pago
            </p>

            <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 6 }}>
              Cuanto pagaste
            </label>
            <input className="campo num" type="number" inputMode="decimal"
                   min="0" step="0.01" value={monto} disabled={enviando}
                   onChange={(e) => setMonto(e.target.value)}
                   style={{ marginBottom: 14 }} />

            <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 6 }}>
              Como pagaste
            </label>
            <select className="campo" value={metodo} disabled={enviando}
                    onChange={(e) => setMetodo(e.target.value)}
                    style={{ marginBottom: 18 }}>
              <option value="transferencia">Transferencia</option>
              <option value="efectivo">Efectivo</option>
              <option value="deposito">Deposito en banco</option>
              <option value="otro">Otro</option>
            </select>

            {error && (
              <p style={{
                fontSize: 14, color: "var(--rojo)", fontWeight: 500, marginBottom: 16,
              }}>
                {error}
              </p>
            )}

            <button className="btn" onClick={reportar} disabled={enviando}>
              {enviando ? "Enviando..." : "Enviar aviso"}
            </button>

            <button className="btn-2" onClick={() => { setAbrir(false); setError(""); }}
                    disabled={enviando} style={{ marginTop: 10 }}>
              Cancelar
            </button>

            <p style={{ fontSize: 13, color: "var(--tenue)", marginTop: 14, lineHeight: 1.5 }}>
              El negocio revisa y confirma. Tu saldo se actualiza cuando lo haga.
            </p>
          </div>
        )}

        <p style={{
          fontSize: 12, color: "var(--tenue)", textAlign: "center",
          marginTop: 32, paddingTop: 18, borderTop: "1px solid var(--linea)",
        }}>
          Cobriq
        </p>
      </div>
    </div>
  );
}
