"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { crearCliente } from "../../lib/supabase/client";

export default function Login() {
  const router = useRouter();
  const supabase = crearCliente();

  const [modo, setModo]       = useState("entrar"); // entrar | registro
  const [negocio, setNegocio] = useState("");
  const [correo, setCorreo]   = useState("");
  const [clave, setClave]     = useState("");
  const [error, setError]     = useState("");
  const [cargando, setCarga]  = useState(false);

  const enviar = async () => {
    setError("");

    if (!correo.trim() || !clave) {
      setError("Llena tu correo y contraseña.");
      return;
    }
    if (modo === "registro") {
      if (!negocio.trim()) {
        setError("Escribe el nombre de tu negocio.");
        return;
      }
      if (clave.length < 8) {
        setError("La contraseña necesita al menos 8 caracteres.");
        return;
      }
    }

    setCarga(true);

    const { error: err } =
      modo === "entrar"
        ? await supabase.auth.signInWithPassword({
            email: correo.trim(),
            password: clave,
          })
        : await supabase.auth.signUp({
            email: correo.trim(),
            password: clave,
            options: { data: { business_name: negocio.trim() } },
          });

    setCarga(false);

    if (err) {
      setError(
        err.message.includes("Invalid login")
          ? "Correo o contraseña incorrectos."
          : err.message.includes("already registered")
          ? "Ese correo ya tiene cuenta. Inicia sesión."
          : "Algo falló. Intenta de nuevo."
      );
      return;
    }

    router.push("/");
    router.refresh();
  };

  const CSS = `
    .lg { --tinta:#000; --papel:#fff; --linea:#e4e4e4; --tenue:#8a8a8a; --rojo:#C0392B;
          font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
          color:var(--tinta); }
    .lg * { box-sizing:border-box; }
    .lg .campo { width:100%; border:1.5px solid var(--linea); border-radius:6px;
                 padding:11px 12px; font-size:15px; background:#fff; color:#000;
                 transition:border-color .18s; font-family:inherit; }
    .lg .campo:focus { outline:none; border-color:#000; }
    .lg .campo::placeholder { color:var(--tenue); }
    .lg .btn { position:relative; overflow:hidden; isolation:isolate; width:100%;
               border:1.5px solid #000; background:#000; color:#fff;
               font-weight:600; font-size:15px; padding:12px 16px; border-radius:6px;
               cursor:pointer; transition:color .28s ease, transform .08s ease; }
    .lg .btn::before { content:""; position:absolute; inset:0; z-index:-1; background:#fff;
                       transform:scaleX(0); transform-origin:left;
                       transition:transform .32s cubic-bezier(.65,0,.35,1); }
    .lg .btn:hover::before { transform:scaleX(1); }
    .lg .btn:hover { color:#000; }
    .lg .btn:active { transform:translateY(1px); }
    .lg .btn:disabled { opacity:.5; cursor:not-allowed; }
    .lg .btn:focus-visible { outline:2px solid #000; outline-offset:3px; }
    .lg .liga { background:none; border:0; cursor:pointer; color:var(--tenue);
                font-size:14px; font-family:inherit; text-decoration:underline; }
    .lg .liga:hover { color:#000; }
  `;

  return (
    <div
      className="lg"
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 20,
        background: "#fff",
      }}
    >
      <style>{CSS}</style>

      <div style={{ width: "100%", maxWidth: 360 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 28 }}>
          <div
            style={{
              display: "grid",
              placeItems: "center",
              width: 30,
              height: 30,
              borderRadius: 6,
              background: "#000",
              color: "#fff",
              fontWeight: 700,
              fontSize: 15,
            }}
          >
            C
          </div>
          <span style={{ fontWeight: 700, fontSize: 21, letterSpacing: "-0.02em" }}>
            Cobriq
          </span>
        </div>

        <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em", margin: 0 }}>
          {modo === "entrar" ? "Entra a tu cuenta" : "Crea tu cuenta"}
        </h1>
        <p style={{ fontSize: 14, color: "var(--tenue)", marginTop: 6, marginBottom: 26 }}>
          {modo === "entrar"
            ? "Lleva la cuenta de quien te debe."
            : "Empieza a cobrar sin perseguir a nadie."}
        </p>

        {modo === "registro" && (
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 6 }}>
              Nombre de tu negocio
            </label>
            <input
              className="campo"
              value={negocio}
              onChange={(e) => setNegocio(e.target.value)}
              placeholder="Taller Los Pinos"
            />
          </div>
        )}

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 6 }}>
            Correo
          </label>
          <input
            className="campo"
            type="email"
            autoComplete="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            placeholder="tucorreo@gmail.com"
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 6 }}>
            Contraseña
          </label>
          <input
            className="campo"
            type="password"
            autoComplete={modo === "entrar" ? "current-password" : "new-password"}
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && enviar()}
            placeholder={modo === "registro" ? "Minimo 8 caracteres" : ""}
          />
        </div>

        {error && (
          <p
            style={{
              fontSize: 14,
              color: "var(--rojo)",
              marginTop: 0,
              marginBottom: 16,
              fontWeight: 500,
            }}
          >
            {error}
          </p>
        )}

        <button className="btn" onClick={enviar} disabled={cargando}>
          {cargando
            ? "Un momento..."
            : modo === "entrar"
            ? "Entrar"
            : "Crear cuenta"}
        </button>

        <div style={{ textAlign: "center", marginTop: 18 }}>
          <button
            className="liga"
            onClick={() => {
              setModo(modo === "entrar" ? "registro" : "entrar");
              setError("");
            }}
          >
            {modo === "entrar"
              ? "No tengo cuenta, quiero registrarme"
              : "Ya tengo cuenta, quiero entrar"}
          </button>
        </div>
      </div>
    </div>
  );
}
