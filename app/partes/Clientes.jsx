"use client";

import { Plus, Trash2, MessageCircle } from "lucide-react";
import { pesos, diasDeAtraso } from "../acciones";

/* Lista de clientes con lo que debe cada uno. */

export default function Clientes({
  clientes,
  deudas,
  busqueda,
  abrirModal,
  onBorrar,
  ocupado,
}) {
  let lista = clientes;

  if (busqueda.trim()) {
    const q = busqueda.toLowerCase();
    lista = lista.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone ?? "").includes(q) ||
        (c.email ?? "").toLowerCase().includes(q)
    );
  }

  return (
    <div className="surge">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
        <button className="btn flex items-center gap-1.5"
          onClick={() => abrirModal({ tipo: "cliente" })}>
          <Plus size={15} /> Agregar
        </button>
      </div>

      {lista.length === 0 ? (
        <div className="py-14 text-center">
          <p className="font-semibold">
            {busqueda.trim() ? "Nadie coincide con tu busqueda" : "Sin clientes todavia"}
          </p>
          {!busqueda.trim() && (
            <>
              <p className="text-sm mt-1 mb-4" style={{ color: "var(--tenue)" }}>
                Agrega a quien te deba para empezar a llevar la cuenta.
              </p>
              <button className="btn inline-flex items-center gap-1.5"
                onClick={() => abrirModal({ tipo: "cliente" })}>
                <Plus size={15} /> Agregar cliente
              </button>
            </>
          )}
        </div>
      ) : (
        <div style={{ borderTop: "1px solid var(--linea)" }}>
          {lista.map((c) => {
            const suyas = deudas.filter(
              (d) => d.customer_id === c.id && d.status === "pending"
            );
            const debe    = suyas.reduce((s, d) => s + d.balance_cents, 0);
            const atrasos = suyas.filter((d) => diasDeAtraso(d.due_date) > 0).length;
            const puedeBorrar = deudas.every(
              (d) => d.customer_id !== c.id || d.status === "cancelled"
            );

            const tono =
              atrasos > 0 ? "var(--rojo)" : debe > 0 ? "var(--tinta)" : "var(--verde)";

            return (
              <div key={c.id} className="flex items-center gap-3 py-4"
                   style={{ borderBottom: "1px solid var(--linea)" }}>
                <span className="punto" style={{ background: tono }} />

                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm truncate">{c.name}</p>
                  <p className="text-xs mt-0.5 truncate" style={{ color: "var(--tenue)" }}>
                    {c.phone || "Sin WhatsApp"}
                    {c.email && ` · ${c.email}`}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <p className="num font-bold text-sm" style={{ color: tono }}>
                    {pesos(debe)}
                  </p>
                  <p className="text-xs" style={{ color: "var(--tenue)" }}>
                    {atrasos > 0
                      ? `${atrasos} vencida${atrasos === 1 ? "" : "s"}`
                      : `${suyas.length} ${suyas.length === 1 ? "deuda" : "deudas"}`}
                  </p>
                </div>

                <div className="flex gap-1.5 shrink-0">
                  {c.phone && (
                    <a className="btn-ico"
                       href={`https://wa.me/52${c.phone}`}
                       target="_blank"
                       rel="noopener noreferrer"
                       aria-label={`Escribir a ${c.name}`}>
                      <MessageCircle size={15} />
                    </a>
                  )}
                  {puedeBorrar && (
                    <button className="btn-ico" disabled={ocupado}
                      onClick={() => onBorrar(c)} aria-label={`Borrar a ${c.name}`}>
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
