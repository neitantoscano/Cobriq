"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutGrid, Users, Settings, Search, Plus, X, Check, Menu, AlertCircle,
} from "lucide-react";

import { CSS } from "./estilos";
import Panel from "./partes/Panel";
import Deuda from "./partes/Deuda";
import Clientes from "./partes/Clientes";
import Ajustes from "./partes/Ajustes";
import Cobrar from "./partes/Cobrar";
import { ModalDeuda, ModalCliente, ModalPago } from "./partes/Modales";

import {
  cargarTodo, cerrarSesion,
  crearClienteNuevo, borrarCliente,
  crearDeudaNueva, cancelarDeuda,
  registrarPagoNuevo, confirmarPagoReportado, rechazarPagoReportado,
  guardarAjustes, anotarRecordatorio, armarMensaje,
  traerDeudas, traerPagos, traerClientes, traerRecordatorios,
} from "./acciones";

export default function Page() {
  const router = useRouter();

  /* ------------------------- estado ------------------------- */
  const [datos, setDatos]       = useState(null);
  const [cargando, setCargando] = useState(true);
  const [fallo, setFallo]       = useState("");

  const [vista, setVista]      = useState("panel");
  const [deudaId, setDeudaId]  = useState(null);
  const [modal, setModal]      = useState(null);
  const [menuAbierto, setMenu] = useState(false);

  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro]     = useState("todos");

  const [ocupado, setOcupado]     = useState(false);
  const [errorModal, setErrorMod] = useState("");
  const [aviso, setAviso]         = useState(null);

  const notificar = (texto, malo = false) => {
    setAviso({ texto, malo });
    setTimeout(() => setAviso(null), 3000);
  };

  /* ---------------------- carga inicial --------------------- */
  const cargar = useCallback(async () => {
    try {
      setFallo("");
      const d = await cargarTodo();
      setDatos(d);
    } catch (e) {
      setFallo(e.message || "No se pudo conectar. Revisa tu internet.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  /* ------------------ historial del navegador --------------- */
  const aplicar = (s) => {
    setVista(s.vista ?? "panel");
    setDeudaId(s.deuda ?? null);
    setModal(s.modal ?? null);
    setMenu(s.menu ?? false);
    setErrorMod("");
  };

  const navegar = (s) => {
    window.history.pushState({ cq: s }, "");
    aplicar(s);
  };

  useEffect(() => {
    window.history.replaceState(
      { cq: { vista: "panel", deuda: null, modal: null, menu: false } }, ""
    );
    const alRegresar = (e) =>
      aplicar((e.state && e.state.cq) || { vista: "panel" });
    window.addEventListener("popstate", alRegresar);
    return () => window.removeEventListener("popstate", alRegresar);
  }, []);

  const abrirDeuda  = (id) => navegar({ vista: "deuda", deuda: id });
  const irA         = (v)  => navegar({ vista: v, deuda: null });
  const irACobrar   = ()   => navegar({ vista: "cobrar", deuda: null });
  const abrirModal  = (m)  => navegar({ vista, deuda: deudaId, modal: m });
  const abrirMenu   = ()   => navegar({ vista, deuda: deudaId, modal, menu: true });
  const cerrarModal = ()   => { if (modal) window.history.back(); };
  const cerrarMenu  = ()   => { if (menuAbierto) window.history.back(); };
  const regresar    = ()   => window.history.back();

  /* ---------------------- refrescos ------------------------- */
  const refrescarDeudasYPagos = async () => {
    const [deudas, pagos] = await Promise.all([traerDeudas(), traerPagos()]);
    setDatos((d) => ({ ...d, deudas, pagos }));
  };

  /* ---------------------- acciones -------------------------- */
  const hacer = async (fn, exito) => {
    setOcupado(true);
    setErrorMod("");
    try {
      await fn();
      if (exito) notificar(exito);
      return true;
    } catch (e) {
      const msg = e.message || "Algo fallo. Intenta de nuevo.";
      setErrorMod(msg);
      if (!modal) notificar(msg, true);
      return false;
    } finally {
      setOcupado(false);
    }
  };

  const guardarCliente = async (form) => {
    const ok = await hacer(async () => {
      await crearClienteNuevo(form);
      const clientes = await traerClientes();
      setDatos((d) => ({ ...d, clientes }));
    }, "Cliente agregado");
    if (ok) cerrarModal();
  };

  const quitarCliente = async (c) => {
    if (!window.confirm(`Borrar a ${c.name}? No se puede deshacer.`)) return;
    await hacer(async () => {
      await borrarCliente(c.id);
      const clientes = await traerClientes();
      setDatos((d) => ({ ...d, clientes }));
    }, "Cliente borrado");
  };

  const guardarDeuda = async (form) => {
    const ok = await hacer(async () => {
      await crearDeudaNueva(form);
      await refrescarDeudasYPagos();
    }, "Deuda registrada");
    if (ok) cerrarModal();
  };

  const guardarPago = async (form) => {
    const ok = await hacer(async () => {
      await registrarPagoNuevo(form);
      await refrescarDeudasYPagos();
    }, "Pago registrado");
    if (ok) cerrarModal();
  };

  const confirmarPago = (id) =>
    hacer(async () => {
      await confirmarPagoReportado(id);
      await refrescarDeudasYPagos();
    }, "Pago confirmado");

  const rechazarPago = (id) =>
    hacer(async () => {
      await rechazarPagoReportado(id);
      await refrescarDeudasYPagos();
    }, "Pago rechazado");

  const cancelar = async (id) => {
    if (!window.confirm("Cancelar esta deuda? Dejara de contar en tus totales."))
      return;
    const ok = await hacer(async () => {
      await cancelarDeuda(id);
      await refrescarDeudasYPagos();
    }, "Deuda cancelada");
    if (ok) regresar();
  };

  const salvarAjustes = (form) =>
    hacer(async () => {
      await guardarAjustes(form);
      setDatos((d) => ({
        ...d,
        ajustes: {
          ...d.ajustes,
          days_before: form.diasAntes,
          days_after: form.diasDespues,
          email_enabled: form.correoActivo,
          message_template: form.plantilla,
        },
      }));
    }, "Ajustes guardados");

  const salir = async () => {
    await cerrarSesion();
    router.push("/login");
    router.refresh();
  };

  /* ------------------- recordatorios ------------------------ */
  const deudaActual = datos?.deudas.find((d) => d.id === deudaId) ?? null;
  const clienteDe   = (id) => datos?.clientes.find((c) => c.id === id) ?? null;
  const clienteActual = clienteDe(deudaActual?.customer_id);

  const armarTexto = (deuda, cliente) =>
    armarMensaje({
      plantilla: datos.ajustes.message_template,
      cliente,
      deuda,
      saldoCentavos: deuda.balance_cents,
      origen: window.location.origin,
    });

  const escribirWhatsApp = async (deuda, cliente) => {
    const texto = armarTexto(deuda, cliente);
    window.open(
      `https://wa.me/52${cliente.phone}?text=${encodeURIComponent(texto)}`,
      "_blank",
      "noopener,noreferrer"
    );
    await hacer(async () => {
      await anotarRecordatorio({
        deudaId: deuda.id,
        clienteId: cliente.id,
        canal: "whatsapp",
        texto,
      });
      const recordatorios = await traerRecordatorios();
      setDatos((d) => ({ ...d, recordatorios }));
    });
  };

  const mandarWhatsApp = () => escribirWhatsApp(deudaActual, clienteActual);

  const mandarDesdeCobrar = (deuda) =>
    escribirWhatsApp(deuda, clienteDe(deuda.customer_id));

  const mandarCorreo = async () => {
    const texto  = armarTexto(deudaActual, clienteActual);
    const asunto = `Recordatorio de pago · ${datos.perfil.business_name}`;
    window.location.href = `mailto:${clienteActual.email}?subject=${encodeURIComponent(
      asunto
    )}&body=${encodeURIComponent(texto)}`;
    await hacer(async () => {
      await anotarRecordatorio({
        deudaId: deudaActual.id,
        clienteId: clienteActual.id,
        canal: "email",
        texto,
      });
      const recordatorios = await traerRecordatorios();
      setDatos((d) => ({ ...d, recordatorios }));
    });
  };

  const copiarLink = async () => {
    const link = `${window.location.origin}/d/${deudaActual.public_token}`;
    try {
      await navigator.clipboard.writeText(link);
      notificar("Link copiado");
    } catch {
      window.prompt("Copia este link:", link);
    }
  };

  /* ------------------------ pantallas ----------------------- */
  if (cargando) return <Esqueleto />;

  if (fallo) {
    return (
      <div className="cq" style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
        <style>{CSS}</style>
        <div style={{ textAlign: "center", maxWidth: 320 }}>
          <AlertCircle size={28} style={{ margin: "0 auto 12px", display: "block" }} />
          <p className="font-semibold mb-1">No se pudo cargar</p>
          <p className="text-sm mb-5" style={{ color: "var(--tenue)" }}>{fallo}</p>
          <button className="btn" onClick={() => { setCargando(true); cargar(); }}>
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const navegacion = [
    { id: "panel",    icono: LayoutGrid, texto: "Panel" },
    { id: "clientes", icono: Users,      texto: "Clientes" },
    { id: "ajustes",  icono: Settings,   texto: "Ajustes" },
  ];

  const activo = (id) =>
    vista === id ||
    (id === "panel" && (vista === "deuda" || vista === "cobrar"));

  return (
    <div className="cq flex min-h-screen">
      <style>{CSS}</style>

      {/* barra lateral */}
      <aside className="hidden md:flex flex-col justify-between w-56 shrink-0 p-4"
             style={{ borderRight: "1px solid var(--linea)" }}>
        <div>
          <div className="flex items-center gap-2 px-2 pb-7 pt-1">
            <div className="grid place-items-center w-7 h-7 rounded font-bold text-sm"
                 style={{ background: "#000", color: "#fff" }}>C</div>
            <span className="font-bold tracking-tight text-lg">Cobriq</span>
          </div>
          <nav className="flex flex-col gap-1">
            {navegacion.map((n) => (
              <button key={n.id} onClick={() => irA(n.id)}
                      className={`nav ${activo(n.id) ? "nav-on" : ""}`}>
                <n.icono size={17} strokeWidth={2} />{n.texto}
              </button>
            ))}
          </nav>
        </div>
        <div className="rounded-lg p-3" style={{ background: "var(--humo)" }}>
          <p className="text-xs" style={{ color: "var(--tenue)" }}>Plan base · $249 al mes</p>
          <p className="text-xs font-semibold mt-1">
            {datos.perfil.plan === "trial" ? "Periodo de prueba" : "Activo"}
          </p>
        </div>
      </aside>

      {/* columna principal */}
      <div className="flex-1 min-w-0 flex flex-col pb-16 md:pb-0">
        <header className="flex items-center gap-3 px-4 md:px-8 py-3 sticky top-0 z-20"
                style={{ borderBottom: "1px solid var(--linea)", background: "var(--papel)" }}>
          <button className="btn-ico md:hidden" onClick={abrirMenu} aria-label="Menu">
            <Menu size={17} />
          </button>

          <span className="font-semibold text-sm truncate hidden sm:block">
            {datos.perfil.business_name}
          </span>

          <div className="flex-1 relative max-w-xs ml-auto">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2"
                    style={{ color: "var(--tenue)" }} />
            <input className="campo" placeholder="Buscar"
                   value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          </div>

          <button className="btn btn-solido flex items-center gap-1.5 shrink-0"
                  onClick={() => abrirModal({ tipo: "deuda" })}>
            <Plus size={15} strokeWidth={2.5} />
            <span className="hidden sm:inline">Nueva deuda</span>
          </button>
        </header>

        <main className="flex-1 px-4 md:px-8 py-6 max-w-5xl w-full">
          {vista === "panel" && (
            <Panel
              deudas={datos.deudas} pagos={datos.pagos} clientes={datos.clientes}
              filtro={filtro} setFiltro={setFiltro} busqueda={busqueda}
              abrirDeuda={abrirDeuda} abrirModal={abrirModal}
              irACobrar={irACobrar}
              onConfirmarPago={confirmarPago} onRechazarPago={rechazarPago}
              ocupado={ocupado}
            />
          )}

          {vista === "cobrar" && (
            <Cobrar
              deudas={datos.deudas} clientes={datos.clientes}
              regresar={regresar} onMandar={mandarDesdeCobrar}
              armarTexto={armarTexto} ocupado={ocupado}
            />
          )}

          {vista === "deuda" && (
            <Deuda
              deuda={deudaActual} cliente={clienteActual}
              pagos={datos.pagos} recordatorios={datos.recordatorios}
              regresar={regresar} abrirModal={abrirModal}
              onWhatsApp={mandarWhatsApp} onCorreo={mandarCorreo}
              onCopiarLink={copiarLink}
              onConfirmarPago={confirmarPago} onRechazarPago={rechazarPago}
              onCancelar={() => cancelar(deudaActual.id)}
              ocupado={ocupado}
            />
          )}

          {vista === "clientes" && (
            <Clientes
              clientes={datos.clientes} deudas={datos.deudas} busqueda={busqueda}
              abrirModal={abrirModal} onBorrar={quitarCliente} ocupado={ocupado}
            />
          )}

          {vista === "ajustes" && (
            <Ajustes
              perfil={datos.perfil} ajustes={datos.ajustes}
              onGuardar={salvarAjustes} onSalir={salir} ocupado={ocupado}
            />
          )}
        </main>
      </div>

      {/* navegacion inferior */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 flex z-30"
           style={{ borderTop: "1px solid var(--linea)", background: "var(--papel)" }}>
        {navegacion.map((n) => (
          <button key={n.id} onClick={() => irA(n.id)}
                  className="flex-1 flex flex-col items-center gap-1 py-2.5"
                  style={{
                    background: "none", border: 0, cursor: "pointer",
                    color: activo(n.id) ? "var(--tinta)" : "var(--tenue)",
                    fontWeight: activo(n.id) ? 600 : 500, fontSize: 11,
                  }}>
            <n.icono size={19} strokeWidth={activo(n.id) ? 2.4 : 2} />
            {n.texto}
          </button>
        ))}
      </nav>

      {/* menu lateral en celular */}
      {menuAbierto && (
        <div className="md:hidden fixed inset-0 z-40"
             style={{ background: "rgba(0,0,0,.45)" }} onClick={cerrarMenu}>
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
             style={{
               background: aviso.malo ? "var(--rojo)" : "#000",
               color: "#fff", maxWidth: "90vw",
             }}>
          {aviso.malo
            ? <AlertCircle size={15} strokeWidth={2.5} className="shrink-0" />
            : <Check size={15} strokeWidth={3} className="shrink-0" />}
          <span>{aviso.texto}</span>
        </div>
      )}

      {/* modales */}
      {modal?.tipo === "deuda" && (
        <ModalDeuda clientes={datos.clientes} cerrar={cerrarModal}
                    onGuardar={guardarDeuda} ocupado={ocupado} error={errorModal} />
      )}
      {modal?.tipo === "cliente" && (
        <ModalCliente cerrar={cerrarModal} onGuardar={guardarCliente}
                      ocupado={ocupado} error={errorModal} />
      )}
      {modal?.tipo === "pago" && (() => {
        const d = datos.deudas.find((x) => x.id === modal.deudaId);
        return d ? (
          <ModalPago deuda={d} cerrar={cerrarModal} onGuardar={guardarPago}
                     ocupado={ocupado} error={errorModal} />
        ) : null;
      })()}
    </div>
  );
}

/* --------------------- esqueleto de carga --------------------- */

function Esqueleto() {
  return (
    <div className="cq flex min-h-screen">
      <style>{CSS}</style>
      <aside className="hidden md:block w-56 shrink-0 p-4"
             style={{ borderRight: "1px solid var(--linea)" }}>
        <div className="hueso" style={{ height: 28, width: 110, marginBottom: 28 }} />
        {[0, 1, 2].map((i) => (
          <div key={i} className="hueso" style={{ height: 34, marginBottom: 8 }} />
        ))}
      </aside>

      <div className="flex-1 p-4 md:p-8">
        <div className="hueso" style={{ height: 40, maxWidth: 300, marginBottom: 30 }} />
        <div className="hueso" style={{ height: 58, maxWidth: 340, marginBottom: 12 }} />
        <div className="hueso" style={{ height: 8, maxWidth: 420, marginBottom: 34 }} />

        <div className="grid grid-cols-3 gap-3 mb-8" style={{ maxWidth: 640 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} className="hueso" style={{ height: 92 }} />
          ))}
        </div>

        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="hueso" style={{ height: 72, marginBottom: 10 }} />
        ))}
      </div>
    </div>
  );
}
