// Suelo y líneas de media pista (medidas FIBA, 1 pie = 10 unidades; 500 x 470).
// Devuelve solo el contenido del SVG, para reutilizarlo en el visor y en el editor.
const LINE = "#FBF8F1";

export default function Court() {
  const planks = Array.from({ length: 19 }, (_, i) => 25 * (i + 1));
  return (
    <g>
      {/* Parqué de arce con juntas entre tablas */}
      <rect x="0" y="0" width="500" height="470" fill="#E2B070" />
      {planks.map((x) => (
        <path key={x} d={`M${x} 0V470`} stroke="#5E340C" strokeOpacity="0.2" strokeWidth="1.5" />
      ))}

      {/* Pintura de la zona */}
      <rect x="170" y="0" width="160" height="190" fill="#1B3A9E" />

      <g fill="none" stroke={LINE} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        {/* Límites de la pista */}
        <rect x="2" y="2" width="496" height="466" />
        {/* Zona */}
        <rect x="170" y="0" width="160" height="190" />
        {/* Tiros libres: media circunferencia sólida fuera, discontinua dentro */}
        <path d="M190 190A60 60 0 0 0 310 190" />
        <path d="M190 190A60 60 0 0 1 310 190" strokeDasharray="8 8" />
        {/* Semicírculo bajo el aro */}
        <path d="M210 52.5A40 40 0 0 0 290 52.5" />
        {/* Línea de triple */}
        <path d="M30 0V142A237.5 237.5 0 0 0 470 142V0" />
        {/* Círculo central (medio campo) */}
        <path d="M190 470A60 60 0 0 1 310 470" />
        {/* Tablero */}
        <path d="M220 40H280" strokeWidth="4" />
      </g>

      {/* Aro */}
      <circle cx="250" cy="52.5" r="7.5" fill="none" stroke="#E8590C" strokeWidth="3.5" />
    </g>
  );
}
