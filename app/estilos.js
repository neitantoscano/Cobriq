/* Estilos de Cobriq.
   Vivian dentro de page.jsx. Ahora estan aqui para que
   cualquier pantalla los use sin repetirlos. */

export const CSS = `
  .cq { --tinta:#000; --papel:#fff; --humo:#f4f4f4; --linea:#e4e4e4; --tenue:#8a8a8a;
        --verde:#0F7B3D; --verde-suave:#E8F5EC;
        --rojo:#C0392B;  --rojo-suave:#FCEBE9;
        --gris:#6B7280;  --gris-suave:#F1F2F4; }
  .cq * { box-sizing:border-box; }
  .cq { font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
        color:var(--tinta); background:var(--papel);
        -webkit-font-smoothing:antialiased; }
  .num { font-variant-numeric: tabular-nums; letter-spacing:-0.02em; }

  /* --- boton principal: relleno que barre --- */
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
  .btn:disabled { opacity:.45; cursor:not-allowed; }
  .btn:disabled::before { transform:scaleX(0); }
  .btn:focus-visible { outline:2px solid var(--tinta); outline-offset:3px; }

  .btn-solido { background:var(--tinta); color:var(--papel); }
  .btn-solido::before { background:var(--papel); }
  .btn-solido:hover { color:var(--tinta); }

  /* --- icono cuadrado --- */
  .btn-ico { border:1.5px solid var(--linea); background:var(--papel); border-radius:6px;
             padding:8px; cursor:pointer; display:grid; place-items:center;
             transition:border-color .2s, background .2s, color .2s, transform .08s; }
  .btn-ico:hover { border-color:var(--tinta); background:var(--tinta); color:var(--papel); }
  .btn-ico:active { transform:translateY(1px); }
  .btn-ico:focus-visible { outline:2px solid var(--tinta); outline-offset:2px; }

  /* --- navegacion --- */
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
  .campo:disabled { background:var(--humo); cursor:not-allowed; }

  .barra { height:100%; background:var(--tinta); border-radius:99px;
           transition:width .7s cubic-bezier(.22,1,.36,1); }

  /* --- barra superior pareja --- */
  .cq header .campo { padding-left:38px; padding-right:12px; min-width:0; }
  .cq header .campo,
  .cq header .btn,
  .cq header .btn-ico { height:40px; padding-top:0; padding-bottom:0; }
  .cq header .btn,
  .cq header .btn-ico { display:inline-flex; align-items:center; justify-content:center; }
  .cq header .btn-ico { width:40px; padding:0; }

  /* --- esqueleto de carga --- */
  .hueso { background:var(--humo); border-radius:6px; position:relative; overflow:hidden; }
  .hueso::after { content:""; position:absolute; inset:0;
                  background:linear-gradient(90deg, transparent, rgba(255,255,255,.75), transparent);
                  animation:brillo 1.3s infinite; }
  @keyframes brillo { from{transform:translateX(-100%)} to{transform:translateX(100%)} }

  @keyframes surge { from{opacity:0; transform:translateY(8px)} to{opacity:1; transform:none} }
  .surge { animation:surge .3s ease both; }

  @keyframes gira { to { transform:rotate(360deg); } }
  .gira { animation:gira .9s linear infinite; }

  @media (prefers-reduced-motion:reduce) {
    .cq *, .cq *::before, .cq *::after { transition:none !important; animation:none !important; }
  }
`;
