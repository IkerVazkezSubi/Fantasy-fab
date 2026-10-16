// Dibujo para el bloque de "Jugadas": media pista con un jugador (1)
// y su recorrido hasta el bloqueo. Decorativo, hereda currentColor.
export default function PlayArt({ className = "" }) {
  return (
    <svg
      viewBox="0 0 240 190"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {/* Pista */}
      <rect x="2" y="2" width="236" height="186" />
      <rect x="80" y="2" width="80" height="90" />
      <circle cx="120" cy="92" r="28" />
      <path d="M14 2V66A112 112 0 0 0 226 66V2" />
      <circle cx="120" cy="26" r="5" />
      {/* Recorrido con flecha */}
      <path d="M44 150C60 110 92 104 112 100" strokeWidth="4" />
      <path d="M102 90L114 100L102 111" strokeWidth="4" />
      {/* Jugador 1 */}
      <circle cx="44" cy="150" r="14" fill="currentColor" stroke="none" />
      <text
        x="44"
        y="156"
        textAnchor="middle"
        fontSize="17"
        fontWeight="700"
        fill="#E2B070"
        stroke="none"
        fontFamily="Barlow Condensed, system-ui, sans-serif"
      >
        1
      </text>
      {/* Bloqueo (línea terminada en T) */}
      <path d="M176 150L176 122" strokeWidth="4" />
      <path d="M162 122H190" strokeWidth="4" />
    </svg>
  );
}
