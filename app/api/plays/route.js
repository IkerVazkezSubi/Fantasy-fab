import { NextResponse } from "next/server";
import { isCoach } from "../../../lib/session";
import { supabaseAdmin } from "../../../lib/supabaseServer";
import { readJson, sanitizePlay } from "../../../lib/playInput";

export const dynamic = "force-dynamic";

const fail = (error, status) => NextResponse.json({ error }, { status });

async function nextSortOrder(db) {
  const { data, error } = await db
    .from("plays")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1);
  if (error) throw error;
  return (data?.[0]?.sort_order ?? -1) + 1;
}

// Crear una jugada (solo entrenador).
export async function POST(request) {
  if (!(await isCoach())) return fail("Solo el entrenador puede hacer esto.", 403);

  const { value, error } = sanitizePlay(await readJson(request));
  if (error) return fail(error, 400);

  try {
    const db = supabaseAdmin();
    const sort_order = await nextSortOrder(db);
    const { data, error: dbError } = await db
      .from("plays")
      .insert({ ...value, sort_order })
      .select("id")
      .single();
    if (dbError) throw dbError;
    return NextResponse.json({ id: data.id });
  } catch (e) {
    console.error("Error creando la jugada:", e);
    return fail("No se ha podido guardar. Prueba otra vez.", 500);
  }
}
