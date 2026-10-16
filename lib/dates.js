// Fechas del calendario. Todo se muestra y se escribe en hora de Madrid (con su cambio
// de horario de verano/invierno), sea cual sea la hora del móvil o del servidor.
export const TZ = "Europe/Madrid";

const partsFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function madridParts(ms) {
  const o = {};
  for (const p of partsFmt.formatToParts(new Date(ms))) o[p.type] = p.value;
  return o;
}

// Diferencia entre la hora de Madrid y UTC en ese instante (ms).
function offsetMs(utcMs) {
  const p = madridParts(utcMs);
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute);
  return asUtc - Math.floor(utcMs / 60000) * 60000;
}

// "2026-10-17T19:30" (hora de Madrid) -> "2026-10-17T17:30:00.000Z". Null si no es válida
// (también si esa hora no existe, como las 02:30 del día que se adelanta el reloj).
export function madridLocalToIso(local) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(String(local ?? ""));
  if (!m) return null;
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  if (y < 2000 || y > 2100) return null;
  const wall = Date.UTC(y, mo - 1, d, h, mi);
  let utc = wall;
  for (let i = 0; i < 3; i++) utc = wall - offsetMs(utc);
  if (Number.isNaN(utc)) return null;
  const iso = new Date(utc).toISOString();
  return isoToMadridLocal(iso) === local ? iso : null;
}

// "2026-10-17T17:30:00Z" -> "2026-10-17T19:30" (para rellenar el campo de fecha y hora).
export function isoToMadridLocal(iso) {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return "";
  const p = madridParts(ms);
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

// "2026-10-17": sirve para agrupar eventos por día.
export function dayKey(iso) {
  return isoToMadridLocal(iso).slice(0, 10);
}

const dayFmt = new Intl.DateTimeFormat("es-ES", {
  timeZone: TZ,
  weekday: "long",
  day: "numeric",
  month: "long",
});
export function formatDay(iso) {
  const s = dayFmt.format(new Date(iso)).replace(",", "");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function formatTime(iso) {
  return isoToMadridLocal(iso).slice(11, 16);
}
