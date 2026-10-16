// Lógica del editor: funciones puras que reciben un paso y devuelven uno nuevo.
// Sin React, para poder probarlas aparte. El formato del paso es el mismo que
// se guarda en la base de datos (ver supabase/plays.sql).
import { PLAYER_IDS } from "./playGeometry";

export const MAX_STEPS = 30;
export const MAX_DEFENDERS = 5;
export const MOVE_TYPES = ["move", "dribble", "screen"];

const START = {
  1: { x: 50, y: 74 },
  2: { x: 12, y: 52 },
  3: { x: 88, y: 52 },
  4: { x: 68, y: 30 },
  5: { x: 34, y: 30 },
};

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const r1 = (n) => Math.round(n * 10) / 10;

export const cloneStep = (s) => JSON.parse(JSON.stringify(s));

export function blankStep() {
  const players = {};
  for (const id of PLAYER_IDS) players[id] = { ...START[id] };
  return { text: "", players, defenders: [], ball: "1", actions: [] };
}

// Paso nuevo a partir de otro: mismas posiciones y balón, sin texto ni acciones.
export function nextStepFrom(prev) {
  const s = cloneStep(prev);
  s.text = "";
  s.actions = [];
  return s;
}

export function movePlayer(step, id, x, y) {
  const s = cloneStep(step);
  s.players[id] = { x: r1(clamp(x, 2, 98)), y: r1(clamp(y, 2, 98)) };
  return s;
}

export function moveDefender(step, id, x, y) {
  const s = cloneStep(step);
  s.defenders = s.defenders.map((d) =>
    d.id === id ? { ...d, x: r1(clamp(x, 2, 98)), y: r1(clamp(y, 2, 98)) } : d
  );
  return s;
}

// --- acciones de un jugador (mover / botar / bloquear) ---------------------
export function playerAction(step, id) {
  return step.actions.find((a) => MOVE_TYPES.includes(a.type) && a.player === id)?.type ?? null;
}

export function setPlayerAction(step, id, type) {
  const s = cloneStep(step);
  s.actions = s.actions.filter((a) => !(MOVE_TYPES.includes(a.type) && a.player === id));
  if (type && MOVE_TYPES.includes(type)) s.actions.push({ type, player: id });
  return s;
}

// --- pase y balón ----------------------------------------------------------
export const getPass = (step) => step.actions.find((a) => a.type === "pass") ?? null;

// El pase va de `from` a `to` y el balón acaba en `to`.
export function setPass(step, from, to) {
  const s = cloneStep(step);
  s.actions = s.actions.filter((a) => a.type !== "pass");
  s.actions.push({ type: "pass", from, to });
  s.ball = to;
  return s;
}

// Quitar el pase devuelve el balón a quien lo pasaba.
export function clearPass(step) {
  const s = cloneStep(step);
  const pass = getPass(s);
  s.actions = s.actions.filter((a) => a.type !== "pass");
  if (pass) s.ball = pass.from;
  return s;
}

// Da el balón a un jugador (o lo quita si ya lo tenía). Cualquier pase del paso se borra.
export function setBall(step, id) {
  const s = cloneStep(step);
  s.actions = s.actions.filter((a) => a.type !== "pass");
  s.ball = s.ball === id ? null : id;
  return s;
}

// Quién tenía el balón al empezar el paso (antes de pasarlo).
export function holderBefore(step) {
  const pass = getPass(step);
  return pass ? pass.from : step.ball;
}

// --- defensores ------------------------------------------------------------
export function addDefender(step) {
  if (step.defenders.length >= MAX_DEFENDERS) return step;
  const s = cloneStep(step);
  const used = new Set(s.defenders.map((d) => d.id));
  let n = 1;
  while (used.has(`d${n}`)) n++;
  const i = s.defenders.length;
  s.defenders.push({ id: `d${n}`, x: r1(25 + i * 12.5), y: 44 });
  return s;
}

export function removeDefender(step, id) {
  const s = cloneStep(step);
  s.defenders = s.defenders.filter((d) => d.id !== id);
  return s;
}

// ¿Se ha movido el jugador respecto al paso anterior?
export function hasMoved(prevStep, step, id, minDist = 3) {
  if (!prevStep) return false;
  const a = prevStep.players[id];
  const b = step.players[id];
  return Math.hypot(a.x - b.x, a.y - b.y) >= minDist;
}
