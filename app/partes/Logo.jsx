"use client";

/* Logo de Cobriq.
   La C se llena de verde como un tanque de dinero, con su ola
   y sus salpicaduras. Al lado, el signo de peso con una luz
   que lo recorre.

   Todo es SVG y animacion de CSS: no pesa nada y no necesita
   imagenes. El tamano se controla con la prop alto. */

export default function Logo({ alto = 30 }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", lineHeight: 0 }}>
      <svg
        width={(alto * 74) / 34}
        height={alto}
        viewBox="0 0 74 34"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Cobriq"
      >
        <style>{`
          /* El nivel del liquido sube y baja despacio */
          @keyframes cq-llenar {
            0%   { transform: translateY(30px); }
            55%  { transform: translateY(3px);  }
            100% { transform: translateY(3px);  }
          }
          /* La ola corre de lado para que la superficie se mueva */
          @keyframes cq-olear {
            from { transform: translateX(0);     }
            to   { transform: translateX(-24px); }
          }
          /* Las gotas salen, suben y caen */
          @keyframes cq-gota {
            0%   { opacity: 0; transform: translate(0, 0) scale(.4); }
            18%  { opacity: 1; }
            60%  { opacity: 1; transform: translate(var(--dx), -7px) scale(1); }
            100% { opacity: 0; transform: translate(var(--dx2), 4px) scale(.5); }
          }

          .cq-nivel { animation: cq-llenar 5.2s cubic-bezier(.4,0,.3,1) infinite alternate; }
          .cq-ola   { animation: cq-olear 1.9s linear infinite; }

          .cq-gota  { animation: cq-gota 5.2s ease-out infinite; transform-origin: center; }
          .cq-g1 { --dx: -2px;  --dx2: -4px; animation-delay: 1.5s; }
          .cq-g2 { --dx: 2.5px; --dx2: 5px;  animation-delay: 2.1s; }
          .cq-g3 { --dx: .5px;  --dx2: 2px;  animation-delay: 2.7s; }

          @media (prefers-reduced-motion: reduce) {
            .cq-nivel, .cq-ola, .cq-gota { animation: none; }
            .cq-nivel { transform: translateY(3px); }
            .cq-gota  { opacity: 0; }
          }
        `}</style>

        <defs>
          {/* La C recortada: solo se pinta el liquido que cae dentro */}
          <mask id="cqMascaraC">
            <circle
              cx="17" cy="17" r="11"
              stroke="#fff" strokeWidth="6" fill="none"
              strokeLinecap="round"
              strokeDasharray="49 21" strokeDashoffset="10"
              transform="rotate(-2 17 17)"
            />
          </mask>

          {/* Profundidad del liquido: mas oscuro abajo */}
          <linearGradient id="cqVerde" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#19A855" />
            <stop offset="100%" stopColor="#0B6230" />
          </linearGradient>

          {/* Luz que recorre el signo de peso */}
          <linearGradient id="cqNeon" x1="-1" y1="0" x2="0" y2="0">
            <stop offset="0%"   stopColor="#0F7B3D" />
            <stop offset="42%"  stopColor="#38F5A0" />
            <stop offset="50%"  stopColor="#B6FFE0" />
            <stop offset="58%"  stopColor="#38F5A0" />
            <stop offset="100%" stopColor="#0F7B3D" />
            <animate
              attributeName="x1" values="-1;1" dur="2.6s" repeatCount="indefinite" />
            <animate
              attributeName="x2" values="0;2"  dur="2.6s" repeatCount="indefinite" />
          </linearGradient>

          <filter id="cqBrillo" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="1.6" result="borroso" />
            <feMerge>
              <feMergeNode in="borroso" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* -------- la C vacia, como el vidrio del tanque -------- */}
        <circle
          cx="17" cy="17" r="11"
          stroke="currentColor" strokeOpacity=".16" strokeWidth="6" fill="none"
          strokeLinecap="round"
          strokeDasharray="49 21" strokeDashoffset="10"
          transform="rotate(-2 17 17)"
        />

        {/* -------- el liquido dentro de la C -------- */}
        <g mask="url(#cqMascaraC)">
          <g className="cq-nivel">
            <g className="cq-ola">
              {/* El patron mide 24 de ancho y se dibuja tres veces,
                  para que al correrse nunca se vea el borde. */}
              <path
                d="M-4 5 q6 -4 12 0 t12 0 t12 0 t12 0 t12 0 V40 H-4 Z"
                fill="url(#cqVerde)"
              />
            </g>
          </g>
        </g>

        {/* -------- salpicaduras -------- */}
        <g fill="#19A855">
          <circle className="cq-gota cq-g1" cx="12.5" cy="11" r="1.15" />
          <circle className="cq-gota cq-g2" cx="17"   cy="9.5" r="1.5" />
          <circle className="cq-gota cq-g3" cx="21"   cy="11.5" r="1" />
        </g>

        {/* -------- signo de peso con la luz corriendo -------- */}
        <g filter="url(#cqBrillo)">
          <path
            d="M46.4 9.2 L52.6 17.4 L58.8 9.2
               M46.4 24.8 L52.6 16.6 L58.8 24.8
               M44.6 18.4 H60.6
               M44.6 21.6 H60.6"
            stroke="url(#cqNeon)"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </g>
      </svg>
    </span>
  );
}
