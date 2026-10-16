// Geometría de la pizarra. Todo son funciones puras (sin React), para poder
// usarlas igual en el visor y, más adelante, en el editor.
//
// Los datos de la jugada usan coordenadas 0-100 sobre la media pista
// (x: izquierda-derecha, y: 0 = línea de fondo bajo el aro, 100 = medio campo).
// El dibujo trabaja en unidades de SVG (500 x 470).

export const W = 500;
export const H = 470;
export const PLAYER_R = 17;
export const PLAYER_IDS = ["1", "2", "3", "4", "5"];
export const ACTION_TYPES = ["move", "dribble", "screen", "pass"];
export const BALL_OFFSET = { x: 16, y: -16 };

// Si a un paso le faltan jugadores, se colocan aquí (solo el primer paso).
const DEFAULT_POS = {
  1: { x: 50, y: 74 },
  2: { x: 12, y: 52 },
  3: { x: 88, y: 52 },
  4: { x: 68, y: 30 },
  5: { x: 34, y: 30 },
};

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const num = (v, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};
const pct = (v) => clamp(v, 0, 100);

// Exacta en los extremos: con t = 0 devuelve a y con t = 1 devuelve b, sin errores de redondeo.
export const lerp = (a, b, t) => a * (1 - t) + b * t;
export const easeInOut = (t) =>
  t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

// ---------------------------------------------------------------------------
// Datos: limpia lo que venga de la base de datos para que el visor nunca falle
// ---------------------------------------------------------------------------
export function normalizeSteps(rawSteps) {
  if (!Array.isArray(rawSteps)) return [];
  const steps = [];
  let prev = null;

  for (const raw of rawSteps) {
    if (!raw || typeof raw !== "object") continue;

    const players = {};
    for (const id of PLAYER_IDS) {
      const p = raw.players?.[id];
      const base = prev ? prev.players[id] : DEFAULT_POS[id];
      players[id] = { x: pct(num(p?.x, base.x)), y: pct(num(p?.y, base.y)) };
    }

    const defenders = (Array.isArray(raw.defenders) ? raw.defenders : [])
      .filter((d) => d && typeof d === "object")
      .slice(0, 5)
      .map((d, i) => ({
        id: String(d.id ?? `d${i + 1}`),
        x: pct(num(d.x, 50)),
        y: pct(num(d.y, 50)),
      }));

    let ball;
    if (raw.ball === undefined) ball = prev ? prev.ball : null;
    else ball = PLAYER_IDS.includes(String(raw.ball)) ? String(raw.ball) : null;

    const actions = (Array.isArray(raw.actions) ? raw.actions : [])
      .filter((a) => a && ACTION_TYPES.includes(a.type))
      .map((a) => ({
        type: a.type,
        player: a.player !== undefined ? String(a.player) : undefined,
        from: a.from !== undefined ? String(a.from) : undefined,
        to: a.to !== undefined ? String(a.to) : undefined,
      }));

    const step = {
      text: typeof raw.text === "string" ? raw.text : "",
      players,
      defenders,
      ball,
      actions,
    };
    steps.push(step);
    prev = step;
  }
  return steps;
}

// ---------------------------------------------------------------------------
// Estado dibujable (en unidades SVG) e interpolación entre pasos
// ---------------------------------------------------------------------------
const toPoint = (p) => ({ x: (p.x * W) / 100, y: (p.y * H) / 100 });

export function stateFromStep(step) {
  const players = {};
  for (const id of PLAYER_IDS) players[id] = toPoint(step.players[id]);

  const defenders = {};
  for (const d of step.defenders) defenders[d.id] = toPoint(d);

  const holder = step.ball && players[step.ball] ? step.ball : null;
  const ball = holder
    ? { x: players[holder].x + BALL_OFFSET.x, y: players[holder].y + BALL_OFFSET.y }
    : null;

  return { players, defenders, ball, holder };
}

const lerpPoint = (a, b, t) => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) });

export function lerpState(a, b, t) {
  const players = {};
  for (const id of PLAYER_IDS) players[id] = lerpPoint(a.players[id], b.players[id], t);

  // Los defensores que ya estaban se mueven; los nuevos aparecen; los que ya no están, desaparecen.
  const defenders = {};
  for (const id of Object.keys(b.defenders)) {
    defenders[id] = a.defenders[id] ? lerpPoint(a.defenders[id], b.defenders[id], t) : b.defenders[id];
  }

  const ball = a.ball && b.ball ? lerpPoint(a.ball, b.ball, t) : b.ball;
  const holder = t < 0.5 ? a.holder : b.holder;
  return { players, defenders, ball, holder };
}

// ---------------------------------------------------------------------------
// Líneas de acción de un paso: movimiento, bote, bloqueo y pase
// ---------------------------------------------------------------------------
const pointAt = (step, id) =>
  step && id !== undefined && step.players[id] ? toPoint(step.players[id]) : null;

// Recorta un segmento por los dos extremos para no tapar los círculos.
function shorten(p0, p1, startGap, endGap) {
  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  const len = Math.hypot(dx, dy);
  if (len < startGap + endGap + 6) return null;
  const ux = dx / len;
  const uy = dy / len;
  return {
    a: { x: p0.x + ux * startGap, y: p0.y + uy * startGap },
    b: { x: p1.x - ux * endGap, y: p1.y - uy * endGap },
    ux,
    uy,
    len: len - startGap - endGap,
  };
}

const f = (n) => Math.round(n * 10) / 10;

function arrowHead(b, ux, uy, size = 13) {
  const px = -uy;
  const py = ux;
  const bx = b.x - ux * size;
  const by = b.y - uy * size;
  const w = size * 0.55;
  return `M${f(b.x)} ${f(b.y)}L${f(bx + px * w)} ${f(by + py * w)}L${f(bx - px * w)} ${f(by - py * w)}Z`;
}

function zigzag(a, b, ux, uy, len) {
  const px = -uy;
  const py = ux;
  const amp = 6.5;
  const n = Math.max(2, Math.floor(len / 15));
  let d = `M${f(a.x)} ${f(a.y)}`;
  for (let i = 1; i < n; i++) {
    const t = i / n;
    const side = i % 2 ? amp : -amp;
    d += `L${f(a.x + (b.x - a.x) * t + px * side)} ${f(a.y + (b.y - a.y) * t + py * side)}`;
  }
  return d + `L${f(b.x)} ${f(b.y)}`;
}

export function buildShapes(steps, index) {
  const cur = steps[index];
  if (!cur) return [];
  const prev = index > 0 ? steps[index - 1] : null;
  const shapes = [];

  cur.actions.forEach((action, i) => {
    const key = `${index}-${i}`;

    if (action.type === "pass") {
      const p0 = pointAt(cur, action.from);
      const p1 = pointAt(cur, action.to);
      if (!p0 || !p1) return;
      const seg = shorten(p0, p1, PLAYER_R + 3, PLAYER_R + 4);
      if (!seg) return;
      shapes.push({
        key,
        kind: "pass",
        d: `M${f(seg.a.x)} ${f(seg.a.y)}L${f(seg.b.x)} ${f(seg.b.y)}`,
        dash: "9 8",
        head: arrowHead(seg.b, seg.ux, seg.uy),
      });
      return;
    }

    // Movimiento, bote y bloqueo parten de la posición del paso anterior.
    if (!prev) return;
    const p0 = pointAt(prev, action.player);
    const p1 = pointAt(cur, action.player);
    if (!p0 || !p1) return;
    const dist = Math.hypot(p1.x - p0.x, p1.y - p0.y);

    if (action.type === "screen") {
      // Línea que acaba en T, justo delante del jugador que bloquea.
      const moved = dist >= 6;
      const ux = moved ? (p1.x - p0.x) / dist : 0;
      const uy = moved ? (p1.y - p0.y) / dist : -1;
      const a = moved
        ? { x: p0.x + ux * (PLAYER_R + 3), y: p0.y + uy * (PLAYER_R + 3) }
        : { x: p1.x + ux * PLAYER_R, y: p1.y + uy * PLAYER_R };
      const reach = moved ? PLAYER_R + 11 : PLAYER_R + 17;
      const c = { x: p1.x + ux * reach, y: p1.y + uy * reach };
      const px = -uy * 18;
      const py = ux * 18;
      shapes.push({
        key,
        kind: "screen",
        d: `M${f(a.x)} ${f(a.y)}L${f(c.x)} ${f(c.y)}M${f(c.x + px)} ${f(c.y + py)}L${f(c.x - px)} ${f(c.y - py)}`,
      });
      return;
    }

    const seg = dist >= PLAYER_R * 2 + 6 ? shorten(p0, p1, PLAYER_R + 3, PLAYER_R + 4) : null;
    if (!seg) return; // apenas se mueve: no hay nada que dibujar

    if (action.type === "move") {
      shapes.push({
        key,
        kind: "move",
        d: `M${f(seg.a.x)} ${f(seg.a.y)}L${f(seg.b.x)} ${f(seg.b.y)}`,
        head: arrowHead(seg.b, seg.ux, seg.uy),
      });
    } else if (action.type === "dribble") {
      shapes.push({
        key,
        kind: "dribble",
        d: zigzag(seg.a, seg.b, seg.ux, seg.uy, seg.len),
        head: arrowHead(seg.b, seg.ux, seg.uy),
      });
    }
  });

  return shapes;
}
