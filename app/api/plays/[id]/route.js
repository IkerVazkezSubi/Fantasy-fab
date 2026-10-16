import { NextResponse } from "next/server";
import { isCoach } from "../../../../lib/session";
import { supabaseAdmin } from "../../../../lib/supabaseServer";
import { readJson, sanitizePlay } from "../../../../lib/playInput";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fail = (error, status) => NextResponse.json({ error }, { status });

async function guard(params) {
  if (!(await isCoach())) return fail("Solo el entrenador puede hacer esto.", 403);
  if (!UUID.test(params.id)) return fail("Jugada no encontrada.", 404);
  return null;
}

// Guardar los cambios de una jugada.
export async function PUT(request, { params }) {
  const blocked = await guard(params);
  if (blocked) return blocked;

  const { value, error } = sanitizePlay(await readJson(request));
  if (error) return fail(error, 400);

  try {
    const { data, error: dbError } = await supabaseAdmin()
      .from("plays")
      .update(value)
      .eq("id", params.id)
      .select("id");
    if (dbError) throw dbError;
    if (!data?.length) return fail("Esa jugada ya no existe.", 404);
    return NextResponse.json({ id: params.id });
  } catch (e) {
    console.error("Error guardando la jugada:", e);
    return fail("No se ha podido guardar. Prueba otra vez.", 500);
  }
}

// Borrar una jugada.
export async function DELETE(_request, { params }) {
  const blocked = await guard(params);
  if (blocked) return blocked;

  try {
    const { error: dbError } = await supabaseAdmin().from("plays").delete().eq("id", params.id);
    if (dbError) throw dbError;
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Error borrando la jugada:", e);
    return fail("No se ha podido borrar. Prueba otra vez.", 500);
  }
}
