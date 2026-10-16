// Comprueba y limpia lo que llega del editor antes de guardarlo. Se usa solo en el servidor.
import { normalizeSteps } from "./playGeometry";
import { MAX_STEPS } from "./editorModel";

const NAME_MAX = 80;
const CATEGORY_MAX = 40;
const DESCRIPTION_MAX = 600;
const TEXT_MAX = 400;

const str = (v) => (typeof v === "string" ? v.trim() : "");

export function sanitizePlay(body) {
  if (!body || typeof body !== "object") return { error: "Datos no válidos." };

  const name = str(body.name);
  const category = str(body.category);
  const description = str(body.description);

  if (!name) return { error: "Falta el nombre de la jugada." };
  if (name.length > NAME_MAX) return { error: `El nombre es demasiado largo (máximo ${NAME_MAX}).` };
  if (!category) return { error: "Falta la categoría." };
  if (category.length > CATEGORY_MAX) return { error: "La categoría es demasiado larga." };
  if (description.length > DESCRIPTION_MAX) {
    return { error: `La descripción es demasiado larga (máximo ${DESCRIPTION_MAX}).` };
  }
  if (!Array.isArray(body.steps)) return { error: "Faltan los pasos." };
  if (body.steps.length < 1) return { error: "La jugada necesita al menos un paso." };
  if (body.steps.length > MAX_STEPS) return { error: `Demasiados pasos (máximo ${MAX_STEPS}).` };

  const steps = normalizeSteps(body.steps).map((s) => ({
    ...s,
    text: s.text.slice(0, TEXT_MAX),
    defenders: s.defenders.map((d) => ({ ...d, id: d.id.slice(0, 10) })),
  }));

  return { value: { name, category, description: description || null, steps } };
}

export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
