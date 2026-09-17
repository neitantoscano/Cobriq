"use client";

/* Logo de Cobriq: cuadro negro con la C.
   La C no es de un color fijo, trae un degradado neon que
   se desliza sin parar. El tamano se controla con la prop alto. */

export default function Logo({ alto = 28 }) {
  return (
    <span
      className="cq-logo"
      style={{ width: alto, height: alto, borderRadius: Math.round(alto * 0.22) }}
      aria-label="Cobriq"
      role="img"
    >
      <style>{`
        @keyframes cq-neon {
          from { background-position:   0% 50%; }
          to   { background-position: 300% 50%; }
        }

        .cq-logo {
          display: inline-grid;
          place-items: center;
          background: #000;
          flex-shrink: 0;
          line-height: 1;
          overflow: hidden;
        }

        .cq-logo .cq-c {
          font-weight: 800;
          letter-spacing: -0.03em;
          background-image: linear-gradient(
            90deg,
            #39FF14, #00F0FF, #B14BFF, #FF3DCB, #39FF14
          );
          background-size: 300% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          -webkit-text-fill-color: transparent;
          animation: cq-neon 3.4s linear infinite;
        }

        /* Si el navegador no sabe recortar el fondo al texto,
           la C se veria invisible. Aqui se pinta de verde neon. */
        @supports not ((-webkit-background-clip: text) or (background-clip: text)) {
          .cq-logo .cq-c {
            background: none;
            color: #39FF14;
            -webkit-text-fill-color: #39FF14;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .cq-logo .cq-c { animation: none; background-position: 50% 50%; }
        }
      `}</style>

      <span
        className="cq-c"
        style={{ fontSize: Math.round(alto * 0.62) }}
      >
        C
      </span>
    </span>
  );
}
