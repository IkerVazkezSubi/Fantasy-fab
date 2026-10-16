import { NextResponse } from "next/server";
import { isCoach } from "../../../lib/session";
import { supabaseAdmin } from "../../../lib/supabaseServer";
import { sanitizeEvent } from "../../../lib/events";
import { readJson } from "../../../lib/playInput";

export const dynamic = "force-dynamic";

const fail = (error, status) => NextResponse.json({ error }, { status });

// Crear un evento (solo entrenador).
export async function POST(request) {
  if (!(await isCoach())) return fail("Solo el entrenador puede hacer esto.", 403);

  const { value, error } = sanitizeEvent(await readJson(request));
  if (error) return fail(error, 400);

  try {
    const { data, error: dbError } = await supabaseAdmin().from("events").insert(value).select("id").single();
    if (dbError) throw dbError;
    return NextResponse.json({ id: data.id });
  } catch (e) {
    console.error("Error creando el evento:", e);
    return fail("No se ha podido guardar. Prueba otra vez.", 500);
  }
}
