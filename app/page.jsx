"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  LayoutGrid, Users, Settings, Search, Plus, X, Check,
  MessageCircle, Mail, ArrowLeft, Clock, Wallet, Menu
} from "lucide-react";

/* ------------------------------------------------------------------
   COBRIQ · Frontend con datos de prueba
   Todo vive en useState. Nada toca Supabase todavía.
------------------------------------------------------------------- */

const HOY = new Date("2026-09-04");

const CLIENTES_INICIALES = [
  { id: "c1", nombre: "Juan Ramírez",       tel: "7351234567", email: "juan@correo.com" },
  { id: "c2", nombre: "Taller Los Pinos",   tel: "7359876543", email: "pinos@correo.com" },
  { id: "c3", nombre: "María Fernanda Cruz",tel: "7355551212", email: "mfcruz@correo.com" },
  { id: "c4", nombre: "Abarrotes El Sol",   tel: "7354443322", email: "" },
  { id: "c5", nombre: "Rogelio Bautista",   tel: "7351119988", email: "roge@correo.com" },
];

const DEUDAS_INICIALES = [
  { id: "d1", clienteId: "c1", concepto: "Afinación mayor",        monto: 2400, abonado: 800,  vence: "2026-08-15", estado: "pendiente" },
  { id: "d2", clienteId: "c2", concepto: "Refacciones a crédito",  monto: 8600, abonado: 0,    vence: "2026-08-28", estado: "pendiente" },
  { id: "d3", clienteId: "c3", concepto: "Mensualidad septiembre", monto: 1200, abonado: 0,    vence: "2026-09-10", estado: "pendiente" },
  { id: "d4", clienteId: "c4", concepto: "Pedido semanal",         monto: 3150, abonado: 3150, vence: "2026-08-30", estado: "pagado"    },
  { id: "d5", clienteId: "c5", concepto: "Tratamiento dental",     monto: 5000, abonado: 2000, vence: "2026-09-20", estado: "pendiente" },
];

const PAGOS_INICIALES = [
  { id: "p1", deudaId: "d1", monto: 800,  fecha: "2026-08-10", metodo: "Efectivo",     origen: "dueño",   estado: "confirmado" },
  { id: "p2", deudaId: "d4", monto: 3150, fecha: "2026-08-29", metodo: "Mercado Pago", origen: "sistema", estado: "confirmado" },
  { id: "p3", deudaId: "d5", monto: 2000, fecha: "2026-08-22", metodo: "Transferencia",origen: "deudor",  estado: "por confirmar" },
];

const RECORDATORIOS_INICIALES = [
  { id: "r1", deudaId: "d1", canal: "email",    fecha: "2026-08-16", texto: "Recordatorio de pago vencido" },
  { id: "r2", deudaId: "d1", canal: "whatsapp", fecha: "2026-08-24", texto: "Segundo recordatorio" },
  { id: "r3", deudaId: "d2", canal: "email",    fecha: "2026-08-29", texto: "Recordatorio de pago vencido" },
];

/* ---------------------------- utilidades ---------------------------- */

const pesos = (n) =>
  n.toLocaleString("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 0 });

const diasDeAtraso = (vence) =>
  Math.floor((HOY - new Date(vence)) / 86400000);

const fechaCorta = (s) =>
  new Date(s).toLocaleDateString("es-MX", { day: "numeric", month: "short" });

/* ------------------------------ estilos ----------------------------- */

const CSS = `
  .cq { --tinta:#000; --papel:#fff; --humo:#f4f4f4; --linea:#e4e4e4; --tenue:#8a8a8a;
        --verde:#0F7B3D; --verde-suave:#E8F5EC;
        --rojo:#C0392B;  --rojo-suave:#FCEBE9;
        --gris:#6B7280;  --gris-suave:#F1F2F4; }
  .cq * { box-sizing:border-box; }
  .cq { font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
        color:var(--tinta); background:var(--papel);
        -webkit-font-smoothing:antialiased; }
  .num { font-variant-numeric: tabular-nums; letter-spacing:-0.02em; }

  /* --- botón principal: relleno que barre --- */
  .btn { position:relative; overflow:hidden; isolation:isolate;
         border:1.5px solid var(--tinta); background:var(--papel); color:var(--tinta);
         font-weight:600; font-size:14px; padding:9px 16px; border-radius:6px;
         cursor:pointer; transition:color .28s ease, transform .08s ease; }
  .btn::before { content:""; position:absolute; inset:0; z-index:-1;
                 background:var(--tinta); transform:scaleX(0); transform-origin:left;
                 transition:transform .32s cubic-bezier(.65,0,.35,1); }
  .btn:hover::before { transform:scaleX(1); }
  .btn:hover { color:var(--papel); }
  .btn:active { transform:translateY(1px); }
  .btn:focus-visible { outline:2px solid var(--tinta); outline-offset:3px; }

  .btn-solido { background:var(--tinta); color:var(--papel); }
  .btn-solido::before { background:var(--papel); }
  .btn-solido:hover { color:var(--tinta); }

  /* --- ícono cuadrado --- */
  .btn-ico { border:1.5px solid var(--linea); background:var(--papel); border-radius:6px;
             padding:8px; cursor:pointer; display:grid; place-items:center;
             transition:border-color .2s, background .2s, color .2s, transform .08s; }
  .btn-ico:hover { border-color:var(--tinta); background:var(--tinta); color:var(--papel); }
  .btn-ico:active { transform:translateY(1px); }
  .btn-ico:focus-visible { outline:2px solid var(--tinta); outline-offset:2px; }

  /* --- navegación --- */
  .nav { position:relative; display:flex; align-items:center; gap:11px; width:100%;
         padding:9px 12px; border:0; background:transparent; border-radius:6px;
         font-size:14px; font-weight:500; color:var(--tenue); cursor:pointer;
         transition:color .2s, background .2s; text-align:left; }
  .nav:hover { color:var(--tinta); background:var(--humo); }
  .nav-on { color:var(--tinta); background:var(--humo); font-weight:600; }
  .nav-on::after { content:""; position:absolute; left:0; top:7px; bottom:7px;
                   width:3px; background:var(--tinta); border-radius:2px; }
  .nav:focus-visible { outline:2px solid var(--tinta); outline-offset:-2px; }

  /* --- fila de deudor --- */
  .fila { display:block; width:100%; text-align:left; border:0; background:transparent;
          border-bottom:1px solid var(--linea); padding:15px 4px; cursor:pointer;
          transition:background .18s, padding-left .18s; }
  .fila:hover { background:var(--humo); padding-left:10px; }
  .fila:focus-visible { outline:2px solid var(--tinta); outline-offset:-2px; }

  .chip { display:inline-flex; align-items:center; gap:5px; font-size:11px; font-weight:600;
          padding:3px 8px; border-radius:99px; border:1.5px solid var(--tinta); }
  .chip-lleno { background:var(--tinta); color:var(--papel); }

  .chip-verde { border-color:var(--verde); background:var(--verde-suave); color:var(--verde); }
  .chip-rojo  { border-color:var(--rojo);  background:var(--rojo);        color:#fff; }
  .chip-gris  { border-color:var(--linea); background:var(--gris-suave);  color:var(--gris); }

  .punto { width:8px; height:8px; border-radius:99px; display:inline-block; flex-shrink:0; }

  .campo { width:100%; border:1.5px solid var(--linea); border-radius:6px;
           padding:9px 12px; font-size:14px; background:var(--papel); color:var(--tinta);
           transition:border-color .18s; font-family:inherit; }
  .campo:focus { outline:none; border-color:var(--tinta); }
  .campo::placeholder { color:var(--tenue); }

  .barra { height:100%; background:var(--tinta); border-radius:99px;
           transition:width .7s cubic-bezier(.22,1,.36,1); }

  @keyframes surge { from{opacity:0; transform:translateY(8px)} to{opacity:1; transform:none} }
  .surge { animation:surge .3s ease both; }

  @media (prefers-reduced-motion:reduce) {
    .cq *, .cq *::before { transition:none !important; animation:none !important; }
  }
`;

/* ------------------------------ app ------------------------------ */

export default function Page() {
  const [vista, setVista]         = useState("panel");
  const [deudaAbierta, setAbierta]= useState(null);
  const [menuAbierto, setMenu]    = useState(false);
  const [busqueda, setBusqueda]   = useState("");
  const [filtro, setFiltro]       = useState("todos");

  const [clientes, setClientes]           = useState(CLIENTES_INICIALES);
  const [deudas, setDeudas]               = useState(DEUDAS_INICIALES);
  const [pagos, setPagos]                 = useState(PAGOS_INICIALES);
  const [recordatorios, setRecordatorios] = useState(RECORDATORIOS_INICIALES);

  const [modal, setModal] = useState(null);
  const [aviso, setAviso] = useState(null);

  const nombreDe = (id) => clientes.find((c) => c.id === id)?.nombre ?? "—";
  const clienteDe = (id) => clientes.find((c) => c.id === id);

  const notificar = (t) => { setAviso(t); setTimeout(() => setAviso(null), 2600); };

  /* --- historial del navegador ---
     Hace que el boton de regresar del celular vuelva a la pantalla
     anterior en vez de sacar al usuario de la web. Cada pantalla,
     modal y el menu lateral empujan una entrada al historial. */

  const aplicarEstado = (s) => {
    setVista(s.vista ?? "panel");
    setAbierta(s.deuda ?? null);
    setModal(s.modal ?? null);
    setMenu(s.menu ?? false);
  };

  const navegar = (s) => {
    if (typeof window !== "undefined") {
      window.history.pushState({ cq: s }, "");
    }
    aplicarEstado(s);
  };

  useEffect(() => {
    window.history.replaceState({ cq: { vista: "panel", deuda: null, modal: null, menu: false } }, "");

    const alRegresar = (e) => {
      const s = (e.state && e.state.cq) || { vista: "panel", deuda: null, modal: null, menu: false };
      aplicarEstado(s);
    };

    window.addEventListener("popstate", alRegresar);
    return () => window.removeEventListener("popstate", alRegresar);
  }, []);

  /* --- totales --- */
  const totales = useMemo(() => {
    const pend = deudas.filter((d) => d.estado === "pendiente");
    const porCobrar = pend.reduce((s, d) => s + (d.monto - d.abonado), 0);
    const cobrado   = deudas.reduce((s, d) => s + d.abonado, 0);

    const vencidas  = pend.filter((d) => diasDeAtraso(d.vence) > 0);
    const porVencer = pend.filter((d) => diasDeAtraso(d.vence) <= 0);
    const pagadas   = deudas.filter((d) => d.estado === "pagado");

    const vencido      = vencidas.reduce((s, d) => s + (d.monto - d.abonado), 0);
    const montoPorVenc = porVencer.reduce((s, d) => s + (d.monto - d.abonado), 0);
    const montoPagado  = pagadas.reduce((s, d) => s + d.monto, 0);

    const porRevisar = pagos.filter((p) => p.estado === "por confirmar").length;

    return {
      porCobrar, cobrado, porRevisar,
      vencido,      nVencidas:  vencidas.length,
      montoPorVenc, nPorVencer: porVencer.length,
      montoPagado,  nPagadas:   pagadas.length,
    };
  }, [deudas, pagos]);

  /* --- lista filtrada --- */
  const lista = useMemo(() => {
    let r = deudas;
    if (filtro === "vencidas")  r = r.filter((d) => d.estado === "pendiente" && diasDeAtraso(d.vence) > 0);
    if (filtro === "porvencer") r = r.filter((d) => d.estado === "pendiente" && diasDeAtraso(d.vence) <= 0);
    if (filtro === "pagadas")   r = r.filter((d) => d.estado === "pagado");
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      r = r.filter((d) =>
        nombreDe(d.clienteId).toLowerCase().includes(q) ||
        d.concepto.toLowerCase().includes(q));
    }
    return [...r].sort((a, b) => diasDeAtraso(b.vence) - diasDeAtraso(a.vence));
  }, [deudas, filtro, busqueda, clientes]);

  /* --- acciones --- */
  const registrarPago = (deudaId, monto, metodo) => {
    setPagos((p) => [...p, {
      id: crypto.randomUUID(), deudaId, monto, metodo,
      fecha: HOY.toISOString().slice(0, 10), origen: "dueño", estado: "confirmado",
    }]);
    setDeudas((ds) => ds.map((d) => {
      if (d.id !== deudaId) return d;
      const abonado = d.abonado + monto;
      return { ...d, abonado, estado: abonado >= d.monto ? "pagado" : "pendiente" };
    }));
    notificar(`Pago de ${pesos(monto)} registrado`);
  };

  const confirmarPago = (pagoId) => {
    const pago = pagos.find((p) => p.id === pagoId);
    setPagos((ps) => ps.map((p) => p.id === pagoId ? { ...p, estado: "confirmado" } : p));
    setDeudas((ds) => ds.map((d) => {
      if (d.id !== pago.deudaId) return d;
      const abonado = d.abonado + pago.monto;
      return { ...d, abonado, estado: abonado >= d.monto ? "pagado" : "pendiente" };
    }));
    notificar("Pago confirmado");
  };

  const mandarRecordatorio = (deuda, canal) => {
    setRecordatorios((r) => [...r, {
      id: crypto.randomUUID(), deudaId: deuda.id, canal,
      fecha: HOY.toISOString().slice(0, 10), texto: "Recordatorio manual",
    }]);
    if (canal === "whatsapp") {
      const c = clienteDe(deuda.clienteId);
      const saldo = deuda.monto - deuda.abonado;
      const msg = `Hola ${c.nombre}, le recuerdo su saldo pendiente de ${pesos(saldo)} por ${deuda.concepto}. Puede pagar aquí: cobriq.mx/d/xxxx`;
      window.open(`https://wa.me/52${c.tel}?text=${encodeURIComponent(msg)}`, "_blank");
    }
    notificar(canal === "email" ? "Correo enviado" : "WhatsApp abierto");
  };

  const abrirDeuda = (id) => navegar({ vista: "deuda", deuda: id });
  const irA = (v)        => navegar({ vista: v, deuda: null });
  const abrirModal = (m) => navegar({ vista, deuda: deudaAbierta, modal: m });
  const abrirMenu = ()   => navegar({ vista, deuda: deudaAbierta, modal, menu: true });

  const cerrarModal = () => { if (modal) window.history.back(); };
  const cerrarMenu  = () => { if (menuAbierto) window.history.back(); };
  const regresar    = () => window.history.back();

  const navegacion = [
    { id: "panel",    icono: LayoutGrid, texto: "Panel" },
    { id: "clientes", icono: Users,      texto: "Clientes" },
    { id: "ajustes",  icono: Settings,   texto: "Ajustes" },
  ];

  return (
    <div className="cq flex min-h-screen">
      <style>{CSS}</style>

      {/* ---------------- barra lateral (escritorio) ---------------- */}
      <aside
        className="hidden md:flex flex-col justify-between w-56 shrink-0 p-4"
        style={{ borderRight: "1px solid var(--linea)" }}
      >
        <div>
          <div className="flex items-center gap-2 px-2 pb-7 pt-1">
            <div
              className="grid place-items-center w-7 h-7 rounded font-bold text-sm"
              style={{ background: "#000", color: "#fff" }}
            >C</div>
            <span className="font-bold tracking-tight text-lg">Cobriq</span>
          </div>
          <nav className="flex flex-col gap-1">
            {navegacion.map((n) => (
              <button key={n.id} onClick={() => irA(n.id)}
                className={`nav ${vista === n.id || (n.id === "panel" && vista === "deuda") ? "nav-on" : ""}`}>
                <n.icono size={17} strokeWidth={2} />
                {n.texto}
              </button>
            ))}
          </nav>
        </div>

        <div className="rounded-lg p-3" style={{ background: "var(--humo)" }}>
          <p className="text-xs leading-relaxed" style={{ color: "var(--tenue)" }}>
            Plan base · $249 al mes
          </p>
          <p className="text-xs font-semibold mt-1">Renueva el 30 de septiembre</p>
        </div>
      </aside>

      {/* ---------------- columna principal ---------------- */}
      <div className="flex-1 min-w-0 flex flex-col pb-16 md:pb-0">

        {/* barra superior */}
        <header
          className="flex items-center gap-3 px-4 md:px-8 py-3 sticky top-0 z-20"
          style={{ borderBottom: "1px solid var(--linea)", background: "var(--papel)" }}
        >
          <button className="btn-ico md:hidden" onClick={abrirMenu} aria-label="Menú">
            <Menu size={17} />
          </button>

          <span className="font-semibold text-sm truncate hidden sm:block">Taller Mecánico Ometepec</span>

          <div className="flex-1 relative max-w-xs ml-auto">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--tenue)" }} />
            <input
              className="campo pl-9" placeholder="Buscar deudor"
              value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>

          <button className="btn btn-solido flex items-center gap-1.5 shrink-0"
            onClick={() => abrirModal({ tipo: "deuda" })}>
            <Plus size={15} strokeWidth={2.5} />
            <span className="hidden sm:inline">Nueva deuda</span>
          </button>
        </header>

        <main className="flex-1 px-4 md:px-8 py-6 max-w-5xl w-full">
          {vista === "panel"    && <Panel />}
          {vista === "clientes" && <Clientes />}
          {vista === "ajustes"  && <Ajustes />}
          {vista === "deuda"    && <Deuda />}
        </main>
      </div>

      {/* ---------------- navegación inferior (celular) ---------------- */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 flex z-30"
        style={{ borderTop: "1px solid var(--linea)", background: "var(--papel)" }}
      >
        {navegacion.map((n) => {
          const activo = vista === n.id || (n.id === "panel" && vista === "deuda");
          return (
            <button key={n.id} onClick={() => irA(n.id)}
              className="flex-1 flex flex-col items-center gap-1 py-2.5"
              style={{ background: "none", border: 0, cursor: "pointer",
                       color: activo ? "var(--tinta)" : "var(--tenue)",
                       fontWeight: activo ? 600 : 500, fontSize: 11 }}>
              <n.icono size={19} strokeWidth={activo ? 2.4 : 2} />
              {n.texto}
            </button>
          );
        })}
      </nav>

      {/* menú lateral en celular */}
      {menuAbierto && (
        <div className="md:hidden fixed inset-0 z-40" style={{ background: "rgba(0,0,0,.45)" }}
             onClick={cerrarMenu}>
          <div className="w-60 h-full p-4 surge" style={{ background: "var(--papel)" }}
               onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-6">
              <span className="font-bold text-lg tracking-tight">Cobriq</span>
              <button className="btn-ico" onClick={cerrarMenu}><X size={16} /></button>
            </div>
            {navegacion.map((n) => (
              <button key={n.id} onClick={() => irA(n.id)}
                className={`nav ${vista === n.id ? "nav-on" : ""}`}>
                <n.icono size={17} /> {n.texto}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* aviso flotante */}
      {aviso && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 surge
                        px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2"
             style={{ background: "#000", color: "#fff" }}>
          <Check size={15} strokeWidth={3} /> {aviso}
        </div>
      )}

      {modal?.tipo === "deuda"   && <ModalDeuda />}
      {modal?.tipo === "cliente" && <ModalCliente />}
      {modal?.tipo === "pago" && deudas.some((x) => x.id === modal.deudaId) &&
        <ModalPago deuda={deudas.find((x) => x.id === modal.deudaId)} />}
    </div>
  );

  /* ========================= PANEL ========================= */
  function Panel() {
    const meta = totales.porCobrar + totales.cobrado;
    const pct = meta ? (totales.cobrado / meta) * 100 : 0;

    return (
      <div className="surge">
        {/* número grande */}
        <section className="pb-8">
          <p className="text-sm mb-1" style={{ color: "var(--tenue)" }}>Por cobrar</p>
          <p className="num font-bold leading-none text-5xl md:text-6xl">
            {pesos(totales.porCobrar)}
          </p>

          <div className="mt-6 max-w-md">
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--humo)" }}>
              <div className="barra" style={{ width: `${pct}%`, background: "var(--verde)" }} />
            </div>
            <p className="text-xs mt-2" style={{ color: "var(--tenue)" }}>
              Ya cobraste <span className="font-semibold" style={{ color: "var(--verde)" }}>{pesos(totales.cobrado)}</span> de {pesos(meta)}
            </p>
          </div>
        </section>

        {/* tres estados */}
        <section className="grid grid-cols-3 gap-2 md:gap-3 pb-8 max-w-2xl">
          <Contador
            n={totales.nVencidas} etiqueta="Vencidas" monto={totales.vencido}
            color="var(--rojo)" fondo="var(--rojo-suave)"
            activo={filtro === "vencidas"} onClick={() => setFiltro("vencidas")}
          />
          <Contador
            n={totales.nPorVencer} etiqueta="Por vencer" monto={totales.montoPorVenc}
            color="var(--gris)" fondo="var(--gris-suave)"
            activo={filtro === "porvencer"} onClick={() => setFiltro("porvencer")}
          />
          <Contador
            n={totales.nPagadas} etiqueta="Pagadas" monto={totales.montoPagado}
            color="var(--verde)" fondo="var(--verde-suave)"
            activo={filtro === "pagadas"} onClick={() => setFiltro("pagadas")}
          />
        </section>

        {/* pagos por confirmar */}
        {totales.porRevisar > 0 && (
          <section className="mb-8 rounded-lg p-4" style={{ border: "1.5px solid #000" }}>
            <p className="font-semibold text-sm mb-3">Pagos que tus clientes reportaron</p>
            {pagos.filter((p) => p.estado === "por confirmar").map((p) => {
              const d = deudas.find((x) => x.id === p.deudaId);
              return (
                <div key={p.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{nombreDe(d.clienteId)}</p>
                    <p className="text-xs" style={{ color: "var(--tenue)" }}>
                      {pesos(p.monto)} · {p.metodo} · {fechaCorta(p.fecha)}
                    </p>
                  </div>
                  <button className="btn shrink-0" onClick={() => confirmarPago(p.id)}>Confirmar</button>
                </div>
              );
            })}
            <p className="text-xs mt-2" style={{ color: "var(--tenue)" }}>
              Revisa tu banco antes de confirmar.
            </p>
          </section>
        )}

        {/* filtros */}
        <div className="flex gap-2 overflow-x-auto pb-4">
          {[["todos","Todos",null],
            ["vencidas","Vencidas","var(--rojo)"],
            ["porvencer","Por vencer","var(--gris)"],
            ["pagadas","Pagadas","var(--verde)"]]
            .map(([id, txt, color]) => (
            <button key={id} onClick={() => setFiltro(id)}
              className="text-xs font-semibold px-3 py-1.5 rounded-full shrink-0 flex items-center gap-1.5"
              style={{ cursor:"pointer",
                border: `1.5px solid ${filtro === id ? "#000" : "var(--linea)"}`,
                background: filtro === id ? "#000" : "transparent",
                color: filtro === id ? "#fff" : "var(--tenue)" }}>
              {color && <span className="punto" style={{ background: color, width: 6, height: 6 }} />}
              {txt}
            </button>
          ))}
        </div>

        {/* lista */}
        {lista.length === 0 ? (
          <div className="py-14 text-center">
            <p className="font-semibold">Aquí no hay nada todavía</p>
            <p className="text-sm mt-1 mb-4" style={{ color: "var(--tenue)" }}>
              Registra tu primera deuda para empezar a llevar la cuenta.
            </p>
            <button className="btn" onClick={() => abrirModal({ tipo: "deuda" })}>Nueva deuda</button>
          </div>
        ) : (
          <div style={{ borderTop: "1px solid var(--linea)" }}>
            {lista.map((d) => {
              const atraso = diasDeAtraso(d.vence);
              const saldo  = d.monto - d.abonado;
              const pagada = d.estado === "pagado";
              return (
                <button key={d.id} className="fila" onClick={() => abrirDeuda(d.id)}>
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{nombreDe(d.clienteId)}</p>
                      <p className="text-xs truncate mt-0.5" style={{ color: "var(--tenue)" }}>
                        {d.concepto} · vence {fechaCorta(d.vence)}
                      </p>
                      <div className="mt-2">
                        {pagada
                          ? <span className="chip chip-verde"><Check size={11} strokeWidth={3} />Pagada</span>
                          : atraso > 0
                            ? <span className="chip chip-rojo"><Clock size={11} strokeWidth={2.5} />{atraso} días de atraso</span>
                            : <span className="chip chip-gris">Vence en {Math.abs(atraso)} días</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="num font-bold"
                         style={{ color: pagada ? "var(--verde)" : atraso > 0 ? "var(--rojo)" : "var(--tinta)" }}>
                        {pesos(pagada ? d.monto : saldo)}
                      </p>
                      {!pagada && d.abonado > 0 && (
                        <p className="text-xs mt-0.5" style={{ color: "var(--tenue)" }}>
                          abonó {pesos(d.abonado)}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  function Contador({ n, etiqueta, monto, color, fondo, activo, onClick }) {
    return (
      <button
        onClick={onClick}
        className="rounded-lg p-3 md:p-4 text-left w-full"
        style={{
          cursor: "pointer",
          background: activo ? fondo : "transparent",
          border: `1.5px solid ${activo ? color : "var(--linea)"}`,
          transition: "background .2s, border-color .2s, transform .08s",
        }}
      >
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="punto" style={{ background: color }} />
          <span className="text-xs font-medium" style={{ color: "var(--tenue)" }}>{etiqueta}</span>
        </div>
        <p className="num font-bold text-2xl md:text-3xl leading-none" style={{ color }}>{n}</p>
        <p className="num text-xs mt-1.5" style={{ color: "var(--tenue)" }}>{pesos(monto)}</p>
      </button>
    );
  }

  /* ========================= DETALLE DE DEUDA ========================= */
  function Deuda() {
    const d = deudas.find((x) => x.id === deudaAbierta);
    if (!d) return null;
    const c      = clienteDe(d.clienteId);
    const saldo  = d.monto - d.abonado;
    const atraso = diasDeAtraso(d.vence);
    const pct    = (d.abonado / d.monto) * 100;
    const misPagos = pagos.filter((p) => p.deudaId === d.id);
    const misRec   = recordatorios.filter((r) => r.deudaId === d.id);

    const pagada = d.estado === "pagado";
    const tono      = pagada ? "var(--verde)"       : atraso > 0 ? "var(--rojo)"       : "var(--tinta)";
    const fondoTono = pagada ? "var(--verde-suave)" : atraso > 0 ? "var(--rojo-suave)" : "transparent";

    return (
      <div className="surge">
        <button onClick={regresar}
          className="flex items-center gap-1.5 text-sm font-medium mb-5"
          style={{ background: "none", border: 0, cursor: "pointer", color: "var(--tenue)" }}>
          <ArrowLeft size={15} /> Volver
        </button>

        <p className="text-2xl font-bold tracking-tight">{c.nombre}</p>
        <p className="text-sm mb-6" style={{ color: "var(--tenue)" }}>{d.concepto}</p>

        <div className="rounded-lg p-5 mb-6"
             style={{ border: `1.5px solid ${tono}`, background: fondoTono }}>
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs mb-1" style={{ color: "var(--tenue)" }}>Saldo</p>
              <p className="num font-bold text-4xl leading-none" style={{ color: tono }}>{pesos(saldo)}</p>
            </div>
            {d.estado === "pagado"
              ? <span className="chip chip-verde"><Check size={11} strokeWidth={3} />Liquidada</span>
              : atraso > 0
                ? <span className="chip chip-rojo"><Clock size={11} strokeWidth={2.5} />{atraso} días de atraso</span>
                : <span className="chip chip-gris">Vence {fechaCorta(d.vence)}</span>}
          </div>

          <div className="h-1.5 rounded-full overflow-hidden mt-5" style={{ background: "rgba(0,0,0,.08)" }}>
            <div className="barra" style={{ width: `${pct}%`, background: tono }} />
          </div>
          <p className="text-xs mt-2" style={{ color: "var(--tenue)" }}>
            {pesos(d.abonado)} abonado de {pesos(d.monto)}
          </p>

          {d.estado !== "pagado" && (
            <div className="flex flex-wrap gap-2 mt-5">
              <button className="btn btn-solido flex items-center gap-1.5"
                onClick={() => abrirModal({ tipo: "pago", deudaId: d.id })}>
                <Wallet size={15} /> Registrar pago
              </button>
              <button className="btn flex items-center gap-1.5"
                onClick={() => mandarRecordatorio(d, "whatsapp")}>
                <MessageCircle size={15} /> WhatsApp
              </button>
              <button className="btn flex items-center gap-1.5"
                onClick={() => mandarRecordatorio(d, "email")}>
                <Mail size={15} /> Correo
              </button>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <section>
            <p className="font-semibold text-sm mb-3">Pagos</p>
            {misPagos.length === 0
              ? <p className="text-sm" style={{ color: "var(--tenue)" }}>Sin pagos todavía.</p>
              : misPagos.map((p) => (
                <div key={p.id} className="flex justify-between items-start gap-3 py-2.5"
                     style={{ borderBottom: "1px solid var(--linea)" }}>
                  <div>
                    <p className="text-sm num font-semibold">{pesos(p.monto)}</p>
                    <p className="text-xs" style={{ color: "var(--tenue)" }}>
                      {p.metodo} · {fechaCorta(p.fecha)}
                    </p>
                  </div>
                  {p.estado === "por confirmar"
                    ? <button className="btn text-xs" onClick={() => confirmarPago(p.id)}>Confirmar</button>
                    : <Check size={15} strokeWidth={2.5} className="mt-1" />}
                </div>
              ))}
          </section>

          <section>
            <p className="font-semibold text-sm mb-3">Recordatorios enviados</p>
            {misRec.length === 0
              ? <p className="text-sm" style={{ color: "var(--tenue)" }}>Ninguno todavía.</p>
              : misRec.map((r) => (
                <div key={r.id} className="flex items-center gap-2.5 py-2.5"
                     style={{ borderBottom: "1px solid var(--linea)" }}>
                  {r.canal === "email" ? <Mail size={14} /> : <MessageCircle size={14} />}
                  <span className="text-sm flex-1">{r.texto}</span>
                  <span className="text-xs" style={{ color: "var(--tenue)" }}>{fechaCorta(r.fecha)}</span>
                </div>
              ))}
          </section>
        </div>
      </div>
    );
  }

  /* ========================= CLIENTES ========================= */
  function Clientes() {
    return (
      <div className="surge">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
          <button className="btn flex items-center gap-1.5" onClick={() => abrirModal({ tipo: "cliente" })}>
            <Plus size={15} /> Agregar
          </button>
        </div>

        <div style={{ borderTop: "1px solid var(--linea)" }}>
          {clientes.map((c) => {
            const suyas   = deudas.filter((d) => d.clienteId === c.id && d.estado === "pendiente");
            const debe    = suyas.reduce((s, d) => s + (d.monto - d.abonado), 0);
            const atrasos = suyas.filter((d) => diasDeAtraso(d.vence) > 0).length;
            const tono    = atrasos > 0 ? "var(--rojo)" : debe > 0 ? "var(--tinta)" : "var(--verde)";
            return (
              <div key={c.id} className="flex items-center gap-3 py-4"
                   style={{ borderBottom: "1px solid var(--linea)" }}>
                <span className="punto" style={{ background: tono }} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm truncate">{c.nombre}</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--tenue)" }}>
                    {c.tel}{c.email && ` · ${c.email}`}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="num font-bold text-sm" style={{ color: tono }}>{pesos(debe)}</p>
                  <p className="text-xs" style={{ color: "var(--tenue)" }}>
                    {atrasos > 0
                      ? `${atrasos} vencida${atrasos === 1 ? "" : "s"}`
                      : `${suyas.length} ${suyas.length === 1 ? "deuda" : "deudas"}`}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  /* ========================= AJUSTES ========================= */
  function Ajustes() {
    const [antes, setAntes]   = useState(3);
    const [despues, setDesp]  = useState("1, 7, 15");
    const [correo, setCorreo] = useState(true);

    return (
      <div className="surge max-w-lg">
        <h1 className="text-2xl font-bold tracking-tight mb-6">Ajustes</h1>

        <section className="mb-8">
          <p className="font-semibold text-sm mb-1">Cuándo mandar recordatorios</p>
          <p className="text-xs mb-4" style={{ color: "var(--tenue)" }}>
            Cobriq los manda solos a las 9 de la mañana.
          </p>

          <label className="block text-sm font-medium mb-1.5">Días antes de que venza</label>
          <input className="campo mb-4" type="number" value={antes}
                 onChange={(e) => setAntes(e.target.value)} />

          <label className="block text-sm font-medium mb-1.5">Días después de vencida</label>
          <input className="campo" value={despues} onChange={(e) => setDesp(e.target.value)} />
          <p className="text-xs mt-1.5" style={{ color: "var(--tenue)" }}>
            Sepáralos con comas.
          </p>
        </section>

        <section className="mb-8">
          <p className="font-semibold text-sm mb-3">Correo automático</p>
          <button onClick={() => setCorreo(!correo)}
            className="flex items-center gap-3 w-full p-3 rounded-lg"
            style={{ border: "1.5px solid var(--linea)", background: "none", cursor: "pointer" }}>
            <span className="grid place-items-center w-5 h-5 rounded shrink-0"
              style={{ border: "1.5px solid #000", background: correo ? "#000" : "transparent" }}>
              {correo && <Check size={13} color="#fff" strokeWidth={3.5} />}
            </span>
            <span className="text-sm text-left">Mandar recordatorios por correo sin que yo haga nada</span>
          </button>
          <p className="text-xs mt-2" style={{ color: "var(--tenue)" }}>
            WhatsApp siempre sale de tu número, con un clic.
          </p>
        </section>

        <section className="mb-8">
          <p className="font-semibold text-sm mb-3">Mensaje que reciben</p>
          <textarea className="campo" rows={4} defaultValue={
            "Hola {nombre}, le recuerdo su saldo pendiente de {saldo} por {concepto}. Puede pagar aquí: {link}"} />
          <p className="text-xs mt-1.5" style={{ color: "var(--tenue)" }}>
            Lo que va entre llaves se llena solo.
          </p>
        </section>

        <button className="btn btn-solido" onClick={() => notificar("Ajustes guardados")}>
          Guardar cambios
        </button>
      </div>
    );
  }

  /* ========================= MODALES ========================= */
  function Marco({ titulo, children }) {
    return (
      <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4"
           style={{ background: "rgba(0,0,0,.45)" }} onClick={cerrarModal}>
        <div className="w-full md:max-w-md p-5 surge"
             style={{ background: "var(--papel)", borderRadius: "14px 14px 0 0" }}
             onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-5">
            <p className="font-bold text-lg tracking-tight">{titulo}</p>
            <button className="btn-ico" onClick={cerrarModal} aria-label="Cerrar">
              <X size={16} />
            </button>
          </div>
          {children}
        </div>
      </div>
    );
  }

  function ModalDeuda() {
    const [clienteId, setCli] = useState(clientes[0].id);
    const [concepto, setCon]  = useState("");
    const [monto, setMonto]   = useState("");
    const [vence, setVence]   = useState("2026-09-30");

    const guardar = () => {
      if (!concepto.trim() || !Number(monto)) return;
      setDeudas((ds) => [...ds, {
        id: crypto.randomUUID(), clienteId, concepto,
        monto: Number(monto), abonado: 0, vence, estado: "pendiente",
      }]);
      cerrarModal();
      notificar("Deuda registrada");
    };

    return (
      <Marco titulo="Nueva deuda">
        <label className="block text-sm font-medium mb-1.5">Cliente</label>
        <select className="campo mb-4" value={clienteId} onChange={(e) => setCli(e.target.value)}>
          {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>

        <label className="block text-sm font-medium mb-1.5">Concepto</label>
        <input className="campo mb-4" placeholder="Afinación, mensualidad, pedido"
               value={concepto} onChange={(e) => setCon(e.target.value)} />

        <div className="grid grid-cols-2 gap-3 mb-5">
          <div>
            <label className="block text-sm font-medium mb-1.5">Monto</label>
            <input className="campo num" type="number" placeholder="0"
                   value={monto} onChange={(e) => setMonto(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Vence</label>
            <input className="campo" type="date" value={vence} onChange={(e) => setVence(e.target.value)} />
          </div>
        </div>

        <button className="btn btn-solido w-full" onClick={guardar}>Guardar deuda</button>
      </Marco>
    );
  }

  function ModalCliente() {
    const [nombre, setNom] = useState("");
    const [tel, setTel]    = useState("");
    const [email, setMail] = useState("");

    const guardar = () => {
      if (!nombre.trim()) return;
      setClientes((cs) => [...cs, { id: crypto.randomUUID(), nombre, tel, email }]);
      cerrarModal();
      notificar("Cliente agregado");
    };

    return (
      <Marco titulo="Nuevo cliente">
        <label className="block text-sm font-medium mb-1.5">Nombre</label>
        <input className="campo mb-4" value={nombre} onChange={(e) => setNom(e.target.value)} />

        <label className="block text-sm font-medium mb-1.5">WhatsApp</label>
        <input className="campo mb-4 num" placeholder="7351234567"
               value={tel} onChange={(e) => setTel(e.target.value)} />

        <label className="block text-sm font-medium mb-1.5">Correo</label>
        <input className="campo mb-5" type="email" placeholder="opcional"
               value={email} onChange={(e) => setMail(e.target.value)} />

        <button className="btn btn-solido w-full" onClick={guardar}>Guardar cliente</button>
      </Marco>
    );
  }

  function ModalPago({ deuda }) {
    const saldo = deuda.monto - deuda.abonado;
    const [monto, setMonto]   = useState(String(saldo));
    const [metodo, setMetodo] = useState("Efectivo");
    const n = Number(monto) || 0;

    return (
      <Marco titulo="Registrar pago">
        <p className="text-sm mb-4" style={{ color: "var(--tenue)" }}>
          Saldo actual de {nombreDe(deuda.clienteId)}: <span className="num font-semibold" style={{ color:"#000" }}>{pesos(saldo)}</span>
        </p>

        <label className="block text-sm font-medium mb-1.5">Cuánto pagó</label>
        <input className="campo num mb-2" type="number" value={monto}
               onChange={(e) => setMonto(e.target.value)} />
        <p className="text-xs mb-4" style={{ color: "var(--tenue)" }}>
          {n >= saldo ? "Liquida la deuda completa." : `Queda debiendo ${pesos(saldo - n)}.`}
        </p>

        <label className="block text-sm font-medium mb-1.5">Cómo pagó</label>
        <select className="campo mb-5" value={metodo} onChange={(e) => setMetodo(e.target.value)}>
          <option>Efectivo</option>
          <option>Transferencia</option>
          <option>Mercado Pago</option>
        </select>

        <button className="btn btn-solido w-full"
          onClick={() => { registrarPago(deuda.id, Math.min(n, saldo), metodo); cerrarModal(); }}>
          Registrar pago
        </button>
      </Marco>
    );
  }
}
