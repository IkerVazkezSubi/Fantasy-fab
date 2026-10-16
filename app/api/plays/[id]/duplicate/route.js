import { NextResponse } from "next/server";
import { isCoach } from "../../../../../lib/session";
import { supabaseAdmin } from "../../../../../lib/supabaseServer";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fail = (error, status) => NextResponse.json({ error }, { status });

// Duplicar una jugada: copia con " (copia)" al final, al final de la lista.
export async function POST(_request, { params }) {
  if (!(await isCoach())) return fail("Solo el entrenador puede hacer esto.", 403);
  if (!UUID.test(params.id)) return fail("Jugada no encontrada.", 404);

  try {
    const db = supabaseAdmin();
    const { data: src, error: e1 } = await db
      .from("plays")
      .select("name, category, description, steps")
      .eq("id", params.id)
      .maybeSingle();
    if (e1) throw e1;
    if (!src) return fail("Esa jugada ya no existe.", 404);

    const { data: last, error: e2 } = await db
      .from("plays")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1);
    if (e2) throw e2;

    const suffix = " (copia)";
    const { data, error: e3 } = await db
      .from("plays")
      .insert({
        name: src.name.slice(0, 80 - suffix.length) + suffix,
        category: src.category,
        description: src.description,
        steps: src.steps,
        sort_order: (last?.[0]?.sort_order ?? -1) + 1,
      })
      .select("id")
      .single();
    if (e3) throw e3;
    return NextResponse.json({ id: data.id });
  } catch (e) {
    console.error("Error duplicando la jugada:", e);
    return fail("No se ha podido duplicar. Prueba otra vez.", 500);
  }
}
