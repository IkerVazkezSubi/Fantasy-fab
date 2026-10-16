// Media pista dibujada con líneas (medidas FIBA, 1 pie = 10 unidades).
// Es solo decoración: hereda el color del texto (currentColor).
export default function CourtLines({ className = "" }) {
  return (
    <svg
      viewBox="-10 -10 520 490"
      fill="none"
      stroke="currentColor"
      strokeWidth="5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {/* Límites */}
      <rect x="0" y="0" width="500" height="470" />
      {/* Zona (pintura) y círculo de tiros libres */}
      <rect x="170" y="0" width="160" height="190" />
      <circle cx="250" cy="190" r="60" />
      {/* Tablero, aro y semicírculo bajo el aro */}
      <path d="M220 40H280" />
      <circle cx="250" cy="52.5" r="7.5" />
      <path d="M210 52.5A40 40 0 0 0 290 52.5" />
      {/* Línea de triple */}
      <path d="M30 0V142A237.5 237.5 0 0 0 470 142V0" />
      {/* Medio campo */}
      <path d="M190 470A60 60 0 0 1 310 470" />
    </svg>
  );
}
