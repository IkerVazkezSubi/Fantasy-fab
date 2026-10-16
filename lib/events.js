// Tipos de evento y comprobación de lo que llega al guardar (solo servidor).
import { madridLocalToIso } from "./dates";

export const EVENT_KINDS = ["Entreno", "Partido", "Otro"];

const str = (v) => (typeof v === "string" ? v.trim() : "");

export function sanitizeEvent(body) {
  if (!body || typeof body !== "object") return { error: "Datos no válidos." };

  const title = str(body.title);
  const kind = str(body.kind);
  const location = str(body.location);
  const notes = str(body.notes);
  const starts_at = madridLocalToIso(body.starts_local);

  if (!title) return { error: "Falta el título." };
  if (title.length > 80) return { error: "El título es demasiado largo (máximo 80)." };
  if (!EVENT_KINDS.includes(kind)) return { error: "El tipo no es válido." };
  if (!starts_at) return { error: "La fecha y la hora no son válidas." };
  if (location.length > 120) return { error: "El lugar es demasiado largo (máximo 120)." };
  if (notes.length > 600) return { error: "Las notas son demasiado largas (máximo 600)." };

  return { value: { title, kind, starts_at, location: location || null, notes: notes || null } };
}
