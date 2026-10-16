// Dibuja la pizarra en un instante concreto. Es un componente "tonto" (sin
// estado ni animación): recibe qué dibujar y lo pinta. El reproductor se
// encarga de ir cambiando `shown` para animar.
import Court from "./Court";
import { PLAYER_IDS, PLAYER_R } from "../lib/playGeometry";

const INK = "#15171C";
const LINE = "#FBF8F1";
const BALL = "#E8590C";
const FONT = "'Barlow Condensed', system-ui, sans-serif";

function Shape({ shape }) {
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      {/* Contorno oscuro para que se lea sobre el parqué y sobre la pintura */}
      <path d={shape.d} stroke={INK} strokeOpacity="0.6" strokeWidth="7.5" strokeDasharray={shape.dash} />
      <path d={shape.d} stroke={LINE} strokeWidth="3.5" strokeDasharray={shape.dash} />
      {shape.head && (
        <>
          <path d={shape.head} fill={INK} fillOpacity="0.6" stroke={INK} strokeOpacity="0.6" strokeWidth="4" />
          <path d={shape.head} fill={LINE} stroke={LINE} strokeWidth="1" />
        </>
      )}
    </g>
  );
}

function Defender({ x, y }) {
  const d = `M${x - 11} ${y - 11}L${x + 11} ${y + 11}M${x + 11} ${y - 11}L${x - 11} ${y + 11}`;
  return (
    <g fill="none" strokeLinecap="round">
      <path d={d} stroke={LINE} strokeWidth="9" />
      <path d={d} stroke={INK} strokeWidth="4.5" />
    </g>
  );
}

// Modo editor (opcional): `itemProps(kind, id)` devuelve los manejadores para arrastrar
// cada jugador ("p") o defensor ("d"); `selected` marca el elemento elegido.
const HIT = { touchAction: "none", cursor: "grab", outline: "none" };

export default function BoardSvg({
  shown,
  shapes = [],
  label = "Pizarra de la jugada",
  svgRef,
  itemProps,
  selected,
  handles = [],
}) {
  const edit = (kind, id) => (itemProps ? { ...itemProps(kind, id), style: HIT } : {});
  const isSel = (kind, id) => selected && selected.kind === kind && selected.id === id;
  const ring = (x, y) => (
    <circle cx={x} cy={y} r={PLAYER_R + 11} fill="none" stroke="#E2B070" strokeWidth="3" strokeDasharray="5 5" />
  );
  const hit = (x, y) => (itemProps ? <circle cx={x} cy={y} r="28" fill="transparent" /> : null);

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 500 470"
      role="img"
      aria-label={label}
      className="block w-full h-auto select-none"
    >
      <Court />

      {shapes.map((s) => (
        <Shape key={s.key} shape={s} />
      ))}

      {Object.entries(shown.defenders).map(([id, p]) => (
        <g key={id} {...edit("d", id)}>
          {isSel("d", id) && ring(p.x, p.y)}
          <Defender x={p.x} y={p.y} />
          {hit(p.x, p.y)}
        </g>
      ))}

      {PLAYER_IDS.map((id) => {
        const p = shown.players[id];
        const hasBall = shown.holder === id;
        return (
          <g key={id} {...edit("p", id)}>
            {isSel("p", id) && ring(p.x, p.y)}
            {hasBall && <circle cx={p.x} cy={p.y} r={PLAYER_R + 5} fill="none" stroke={BALL} strokeWidth="4" />}
            <circle cx={p.x} cy={p.y} r={PLAYER_R} fill={LINE} stroke={INK} strokeWidth="3" />
            <text
              x={p.x}
              y={p.y + 7.5}
              textAnchor="middle"
              fontSize="23"
              fontWeight="700"
              fill={INK}
              style={{ fontFamily: FONT }}
            >
              {id}
            </text>
            {hit(p.x, p.y)}
          </g>
        );
      })}

      {itemProps &&
        handles.map((h) => (
          <g key={`c${h.id}`} {...edit("c", h.id)}>
            <circle cx={h.x} cy={h.y} r="9" fill="#E8590C" stroke={INK} strokeWidth="2.5" />
            <circle cx={h.x} cy={h.y} r="3" fill={LINE} />
            {hit(h.x, h.y)}
          </g>
        ))}

      {shown.ball && (
        <g transform={`translate(${shown.ball.x} ${shown.ball.y})`}>
          <circle r="8" fill={BALL} stroke={INK} strokeWidth="2.5" />
          <path d="M-8 0H8M0 -8V8" stroke={INK} strokeWidth="1.5" />
        </g>
      )}
    </svg>
  );
}
