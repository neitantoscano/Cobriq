"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { crearCliente } from "../../lib/supabase/client";

export default function Login() {
  const router = useRouter();
  const supabase = crearCliente();

  // Arranca en registro: la mayoria que llega aqui no tiene cuenta.
  const [modo, setModo]       = useState("registro");
  const [negocio, setNegocio] = useState("");
  const [correo, setCorreo]   = useState("");
  const [clave, setClave]     = useState("");
  const [verClave, setVer]    = useState(false);
  const [error, setError]     = useState("");
  const [cargando, setCarga]  = useState(false);

  const esRegistro = modo === "registro";

  const enviar = async () => {
    setError("");

    if (!correo.trim() || !clave) {
      setError("Llena tu correo y contrasena.");
      return;
    }
    if (esRegistro) {
      if (!negocio.trim()) {
        setError("Escribe el nombre de tu negocio.");
        return;
      }
      if (clave.length < 8) {
        setError("La contrasena necesita al menos 8 caracteres.");
        return;
      }
    }

    setCarga(true);

    const { error: err } = esRegistro
      ? await supabase.auth.signUp({
          email: correo.trim(),
          password: clave,
          options: { data: { business_name: negocio.trim() } },
        })
      : await supabase.auth.signInWithPassword({
          email: correo.trim(),
          password: clave,
        });

    setCarga(false);

    if (err) {
      const m = err.message || "";
      setError(
        m.includes("Invalid login")
          ? "Correo o contrasena incorrectos."
          : m.includes("already registered") || m.includes("already been registered")
          ? "Ese correo ya tiene cuenta. Entra abajo."
          : m.includes("Password")
          ? "La contrasena necesita al menos 8 caracteres."
          : "Algo fallo. Intenta de nuevo."
      );
      return;
    }

    router.push("/");
    router.refresh();
  };

  const cambiarModo = () => {
    setModo(esRegistro ? "entrar" : "registro");
    setError("");
  };

  return (
    <div className="lg">
      <style>{`
        .lg { --tinta:#000; --papel:#fff; --linea:#e4e4e4; --tenue:#8a8a8a;
              --humo:#f4f4f4; --rojo:#C0392B;
              font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
              color:#000; background:#fff; min-height:100vh;
              display:grid; place-items:center; padding:20px; }
        .lg * { box-sizing:border-box; }

        .lg .caja { width:100%; max-width:380px; }

        .lg .campo { width:100%; border:1.5px solid var(--linea); border-radius:8px;
                     padding:12px 13px; font-size:16px; background:#fff; color:#000;
                     transition:border-color .18s; font-family:inherit; }
        .lg .campo:focus { outline:none; border-color:#000; }
        .lg .campo::placeholder { color:var(--tenue); }

        .lg .btn { position:relative; overflow:hidden; isolation:isolate; width:100%;
                   border:1.5px solid #000; background:#000; color:#fff;
                   font-weight:600; font-size:16px; padding:14px 16px; border-radius:8px;
                   cursor:pointer; transition:color .28s ease, transform .08s ease; }
        .lg .btn::before { content:""; position:absolute; inset:0; z-index:-1; background:#fff;
                           transform:scaleX(0); transform-origin:left;
                           transition:transform .32s cubic-bezier(.65,0,.35,1); }
        .lg .btn:hover::before { transform:scaleX(1); }
        .lg .btn:hover { color:#000; }
        .lg .btn:active { transform:translateY(1px); }
        .lg .btn:disabled { opacity:.5; cursor:not-allowed; }
        .lg .btn:disabled::before { transform:scaleX(0); }
        .lg .btn:focus-visible { outline:2px solid #000; outline-offset:3px; }

        /* boton secundario: contorno, mismo tamano que el principal */
        .lg .btn-2 { width:100%; border:1.5px solid var(--linea); background:#fff; color:#000;
                     font-weight:600; font-size:16px; padding:14px 16px; border-radius:8px;
                     cursor:pointer; font-family:inherit;
                     transition:border-color .2s, background .2s, transform .08s; }
        .lg .btn-2:hover { border-color:#000; background:var(--humo); }
        .lg .btn-2:active { transform:translateY(1px); }
        .lg .btn-2:focus-visible { outline:2px solid #000; outline-offset:3px; }

        .lg .ojo { position:absolute; right:12px; top:50%; transform:translateY(-50%);
                   background:none; border:0; cursor:pointer; font-size:13px;
                   color:var(--tenue); font-weight:600; font-family:inherit; padding:4px; }
        .lg .ojo:hover { color:#000; }

        .lg .campo-grupo { position:relative; margin-bottom:14px; }
        .lg label { display:block; font-size:14px; font-weight:500; margin-bottom:6px; }

        @media (prefers-reduced-motion:reduce) {
          .lg *, .lg *::before { transition:none !important; }
        }
      `}</style>

      <div className="caja">
        {/* marca */}
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 30 }}>
          <div style={{
            display: "grid", placeItems: "center", width: 32, height: 32,
            borderRadius: 7, background: "#000", color: "#fff",
            fontWeight: 700, fontSize: 16,
          }}>C</div>
          <span style={{ fontWeight: 700, fontSize: 22, letterSpacing: "-0.02em" }}>
            Cobriq
          </span>
        </div>

        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em", margin: 0 }}>
          {esRegistro ? "Crea tu cuenta" : "Entra a tu cuenta"}
        </h1>
        <p style={{ fontSize: 15, color: "var(--tenue)", marginTop: 7, marginBottom: 28 }}>
          {esRegistro
            ? "Empieza a cobrar sin perseguir a nadie."
            : "Lleva la cuenta de quien te debe."}
        </p>

        {esRegistro && (
          <div className="campo-grupo">
            <label>Nombre de tu negocio</label>
            <input className="campo" value={negocio} disabled={cargando}
                   placeholder="Taller Los Pinos"
                   onChange={(e) => setNegocio(e.target.value)} />
          </div>
        )}

        <div className="campo-grupo">
          <label>Correo</label>
          <input className="campo" type="email" autoComplete="email"
                 value={correo} disabled={cargando}
                 placeholder="tucorreo@gmail.com"
                 onChange={(e) => setCorreo(e.target.value)} />
        </div>

        <div className="campo-grupo" style={{ marginBottom: 22 }}>
          <label>Contrasena</label>
          <div style={{ position: "relative" }}>
            <input className="campo" style={{ paddingRight: 58 }}
                   type={verClave ? "text" : "password"}
                   autoComplete={esRegistro ? "new-password" : "current-password"}
                   value={clave} disabled={cargando}
                   placeholder={esRegistro ? "Minimo 8 caracteres" : ""}
                   onChange={(e) => setClave(e.target.value)}
                   onKeyDown={(e) => e.key === "Enter" && !cargando && enviar()} />
            <button type="button" className="ojo" onClick={() => setVer(!verClave)}>
              {verClave ? "Ocultar" : "Ver"}
            </button>
          </div>
        </div>

        {error && (
          <p style={{
            fontSize: 14, color: "var(--rojo)", fontWeight: 500,
            marginTop: 0, marginBottom: 18,
          }}>
            {error}
          </p>
        )}

        <button className="btn" onClick={enviar} disabled={cargando}>
          {cargando ? "Un momento..." : esRegistro ? "Crear cuenta" : "Entrar"}
        </button>

        {/* separador */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          margin: "24px 0 16px",
        }}>
          <span style={{ flex: 1, height: 1, background: "var(--linea)" }} />
          <span style={{ fontSize: 13, color: "var(--tenue)" }}>
            {esRegistro ? "ya tienes cuenta?" : "eres nuevo?"}
          </span>
          <span style={{ flex: 1, height: 1, background: "var(--linea)" }} />
        </div>

        <button className="btn-2" onClick={cambiarModo} disabled={cargando}>
          {esRegistro ? "Entrar a mi cuenta" : "Crear una cuenta"}
        </button>
      </div>
    </div>
  );
}
