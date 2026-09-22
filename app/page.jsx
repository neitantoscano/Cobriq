"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutGrid, Users, Settings, Search, X, Check, Menu,
  AlertCircle, Receipt, BarChart3,
} from "lucide-react";

import { CSS } from "./estilos";
import Panel from "./partes/Panel";
import Deuda from "./partes/Deuda";
import Clientes from "./partes/Clientes";
import Ajustes from "./partes/Ajustes";
import Cobrar from "./partes/Cobrar";
import Cobros from "./partes/Cobros";
import Reportes from "./partes/Reportes";
import Logo from "./partes/Logo";
import ModalCobro from "./partes/ModalCobro";
import { ModalDeuda, ModalDeudor, ModalCliente, ModalPago } from "./partes/Modales";

import {
  cargarTodo, cerrarSesion,
  crearClienteNuevo, borrarCliente,
  crearDeudaNueva, cancelarDeuda,
  registrarPagoNuevo, confirmarPagoReportado, rechazarPagoReportado,
  guardarAjustes, anotarRecordatorio, armarMensaje,
  traerDeudas, traerPagos, traerClientes, traerRecordatorios,
} from "./acciones";

import { crearCobroNuevo, cancelarCobro } from "./accionesCobros";

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

  /* Cobro recien creado, para ensenar su link sin cerrar el modal */
  const [cobroCreado, setCobroCreado] = useState(null);

  /* La direccion de la pagina se guarda ya montados, porque
     window no existe cuando esto se dibuja en el servidor. */
  const [origen, setOrigen] = useState("");

  const notificar = (texto, malo = false) => {
    setAviso({ texto, malo });
    setTimeout(() => setAviso(null), 3200);
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

  const reemplazar = (s) => {
    window.history.replaceState({ cq: s }, "");
    aplicar(s);
  };

  /* ----------- arranque: parametros de la URL + historial ----------- */
  useEffect(() => {
    setOrigen(window.location.origin);

    const params = new URLSearchParams(window.location.search);
    const mp     = params.get("mp");
    const plan   = params.get("plan");
    const pedida = params.get("vista");

    const inicial = {
      vista: pedida === "ajustes" || plan ? "ajustes" : "panel",
      deuda: null,
      modal: null,
      menu: false,
    };

    aplicar(inicial);
    window.history.replaceState({ cq: inicial }, "", window.location.pathname);

    const avisosMp = {
      listo:      ["Mercado Pago conectado", false],
      cancelado:  ["No autorizaste la conexion", true],
      invalido:   ["La conexion no se pudo verificar", true],
      fallo:      ["No se pudo conectar Mercado Pago", true],
      sin_config: ["Falta configurar Mercado Pago", true],
    };

    const avisosPlan = {
      listo:     ["Listo, tu plan quedo activo", false],
      cancelado: ["No se completo el pago", false],
      fallo:     ["No se pudo abrir el pago", true],
      sincuenta: ["Todavia no tienes un plan que administrar", true],
    };

    if (mp) {
      const [texto, malo] = avisosMp[mp] || ["Algo paso con Mercado Pago", true];
      setTimeout(() => notificar(texto, malo), 700);
    }

    if (plan) {
      const [texto, malo] = avisosPlan[plan] || ["Algo paso con tu plan", true];
      setTimeout(() => notificar(texto, malo), 700);
      if (plan === "listo") setTimeout(() => { cargar(); }, 4000);
    }

    const alRegresar = (e) =>
      aplicar((e.state && e.state.cq) || { vista: "panel" });

    window.addEventListener("popstate", alRegresar);
    return () => window.removeEventListener("popstate", alRegresar);
  }, [cargar]);

  const abrirDeuda  = (id) => navegar({ vista: "deuda", deuda: id });
  const irA         = (v)  => navegar({ vista: v, deuda: null });
  const irACobrar   = ()   => navegar({ vista: "cobrar", deuda: null });
  const irACobros   = ()   => navegar({ vista: "cobros", deuda: null });
  const abrirModal  = (m)  => navegar({ vista, deuda: deudaId, modal: m });
  const abrirMenu   = ()   => navegar({ vista, deuda: deudaId, modal, menu: true });
  const cerrarMenu  = ()   => { if (menuAbierto) window.history.back(); };
  const regresar    = ()   => window.history.back();

  /* Al cerrar el modal de cobro hay que olvidar el recien creado,
     si no, la proxima vez abriria directo en la pantalla del link. */
  const cerrarModal = () => {
    if (modal) {
      setCobroCreado(null);
      window.history.back();
    }
  };

  const cambiarModal = (m) =>
    reemplazar({ vista, deuda: deudaId, modal: m });

  /* ---------------------- refrescos ------------------------- */
  const refrescarTodo = async () => {
    const [deudas, pagos, clientes] = await Promise.all([
      traerDeudas(), traerPagos(), traerClientes(),
    ]);
    setDatos((d) => ({ ...d, deudas, pagos, clientes }));
  };

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

  const guardarDeudor = async (form) => {
    const ok = await hacer(async () => {
      const cliente = await crearClienteNuevo({
        nombre: form.nombre,
        telefono: form.telefono,
        correo: form.correo,
      });

      try {
        await crearDeudaNueva({
          clienteId: cliente.id,
          concepto: form.concepto,
          montoPesos: form.montoPesos,
          vence: form.vence,
        });
      } catch (e) {
        await refrescarTodo();
        throw new Error(
          `${form.nombre} ya quedo guardado, pero la deuda no: ${e.message}`
        );
      }

      await refrescarTodo();
    }, "Deudor y deuda registrados");

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

  /* ---- cobros sueltos ---- */
  const guardarCobro = async (form) => {
    await hacer(async () => {
      const nuevo = await crearCobroNuevo(form);
      await refrescarDeudasYPagos();
      /* No se cierra: el modal pasa a ensenar el link. */
      setCobroCreado(nuevo);
    });
  };

  const otroCobro = () => setCobroCreado(null);

  const quitarCobro = async (c) => {
    if (!window.confirm(`Cancelar el cobro de ${c.payer_name}? Su link dejara de servir.`))
      return;
    await hacer(async () => {
      await cancelarCobro(c.id);
      await refrescarDeudasYPagos();
    }, "Cobro cancelado");
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
  const deudaActual   = datos?.deudas.find((d) => d.id === deudaId) ?? null;
  const clienteDe     = (id) => datos?.clientes.find((c) => c.id === id) ?? null;
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

  const mandarWhatsApp    = () => escribirWhatsApp(deudaActual, clienteActual);
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

  /* Las deudas y los cobros viven en la misma tabla, asi que se
     separan aqui. Un solo viaje a la base, dos listas limpias. */
  const soloDeudas = datos.deudas.filter((d) => d.kind !== "cobro");
  const soloCobros = datos.deudas.filter((d) => d.kind === "cobro");

  const navegacion = [
    { id: "panel",    icono: LayoutGrid, texto: "Panel" },
    { id: "cobros",   icono: Receipt,    texto: "Cobros" },
    { id: "reportes", icono: BarChart3,  texto: "Reportes" },
    { id: "clientes", icono: Users,      texto: "Clientes" },
    { id: "ajustes",  icono: Settings,   texto: "Ajustes" },
  ];

  const activo = (id) =>
    vista === id ||
    (id === "panel" && (vista === "deuda" || vista === "cobrar"));

  const estadoPlan = () => {
    const p = datos.perfil.plan ?? "trial";

    if (p === "active")   return { texto: "Plan activo", color: "var(--verde)" };
    if (p === "past_due") return { texto: "Revisa tu pago", color: "var(--rojo)" };

    if (p === "trial" && datos.perfil.trial_ends_at) {
      const dias = Math.max(
        0,
        Math.ceil((new Date(datos.perfil.trial_ends_at).getTime() - Date.now()) / 86400000)
      );
      if (dias > 0)
        return {
          texto: dias === 1 ? "Queda 1 dia de prueba" : `Quedan ${dias} dias de prueba`,
          color: dias <= 3 ? "var(--rojo)" : "var(--tinta)",
        };
    }

    return { texto: "Prueba terminada", color: "var(--rojo)" };
  };

  const plan = estadoPlan();

  return (
    <div className="cq flex min-h-screen">
      <style>{CSS}</style>

      {/* barra lateral */}
      <aside className="hidden md:flex flex-col justify-between w-56 shrink-0 p-4"
             style={{ borderRight: "1px solid var(--linea)" }}>
        <div>
          <div className="flex items-center gap-2 px-2 pb-7 pt-1">
            <Logo alto={30} />
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

        <button onClick={() => irA("ajustes")}
                className="rounded-lg p-3 text-left w-full"
                style={{ background: "var(--humo)", border: 0, cursor: "pointer" }}>
          <p className="text-xs" style={{ color: "var(--tenue)" }}>Plan base · $249 al mes</p>
          <p className="text-xs font-semibold mt-1" style={{ color: plan.color }}>
            {plan.texto}
          </p>
        </button>
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

          {/* En computadora el logo ya vive en la barra lateral,
              asi que aqui solo sale en celular. */}
          <span className="md:hidden shrink-0">
            <Logo alto={28} />
          </span>
        </header>

        <main className="flex-1 px-4 md:px-8 py-6 max-w-5xl w-full">
          {vista === "panel" && (
            <Panel
              deudas={soloDeudas} cobros={soloCobros}
              pagos={datos.pagos} clientes={datos.clientes}
              filtro={filtro} setFiltro={setFiltro} busqueda={busqueda}
              abrirDeuda={abrirDeuda} abrirModal={abrirModal}
              irACobrar={irACobrar} irACobros={irACobros}
              onConfirmarPago={confirmarPago} onRechazarPago={rechazarPago}
              ocupado={ocupado}
            />
          )}

          {vista === "cobros" && (
            <Cobros
              cobros={soloCobros} busqueda={busqueda}
              abrirModal={abrirModal} onCancelar={quitarCobro}
              ocupado={ocupado} origen={origen}
            />
          )}

          {vista === "reportes" && (
            <Reportes
              deudas={soloDeudas} pagos={datos.pagos}
              abrirDeuda={abrirDeuda}
              negocio={datos.perfil.business_name}
            />
          )}

          {vista === "cobrar" && (
            <Cobrar
              deudas={soloDeudas} clientes={datos.clientes}
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
              clientes={datos.clientes} deudas={soloDeudas} busqueda={busqueda}
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
                    minWidth: 0,
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
              <span className="flex items-center gap-2">
                <Logo alto={28} />
                <span className="font-bold text-lg tracking-tight">Cobriq</span>
              </span>
              <button className="btn-ico" onClick={cerrarMenu}><X size={16} /></button>
            </div>
            {navegacion.map((n) => (
              <button key={n.id} onClick={() => irA(n.id)}
                      className={`nav ${vista === n.id ? "nav-on" : ""}`}>
                <n.icono size={17} /> {n.texto}
              </button>
            ))}

            <div className="rounded-lg p-3 mt-6" style={{ background: "var(--humo)" }}>
              <p className="text-xs" style={{ color: "var(--tenue)" }}>Plan base · $249 al mes</p>
              <p className="text-xs font-semibold mt-1" style={{ color: plan.color }}>
                {plan.texto}
              </p>
            </div>
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
      {modal?.tipo === "deudor" && (
        <ModalDeudor cerrar={cerrarModal} onGuardar={guardarDeudor}
                     ocupado={ocupado} error={errorModal} />
      )}
      {modal?.tipo === "deuda" && (
        <ModalDeuda clientes={datos.clientes} clienteFijo={modal.clienteId}
                    cerrar={cerrarModal} onGuardar={guardarDeuda}
                    irANuevoDeudor={() => cambiarModal({ tipo: "deudor" })}
                    ocupado={ocupado} error={errorModal} />
      )}
      {modal?.tipo === "cobro" && (
        <ModalCobro cerrar={cerrarModal} onGuardar={guardarCobro}
                    creado={cobroCreado} onOtro={otroCobro}
                    ocupado={ocupado} error={errorModal} origen={origen} />
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
        {[0, 1, 2, 3, 4].map((i) => (
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
