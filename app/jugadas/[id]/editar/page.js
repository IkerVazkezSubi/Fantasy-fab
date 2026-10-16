import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isCoach } from "../../../../lib/session";
import { supabaseAdmin } from "../../../../lib/supabaseServer";
import { CATEGORIES } from "../../../../lib/categories";
import PlayEditor from "../../../../components/PlayEditor";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditarJugadaPage({ params }) {
  if (!(await isCoach())) redirect(`/jugadas/${params.id}`);
  if (!UUID.test(params.id)) notFound();

  let play = null;
  let failed = false;
  try {
    const { data, error } = await supabaseAdmin()
      .from("plays")
      .select("id, name, category, description, steps")
      .eq("id", params.id)
      .maybeSingle();
    if (error) throw error;
    play = data;
  } catch (e) {
    console.error("Error cargando la jugada para editar:", e);
    failed = true;
  }

  if (!failed && !play) notFound();

  return (
    <main className="min-h-dvh max-w-xl mx-auto px-5 pt-6 pb-12">
      <Link
        href={failed ? "/jugadas" : `/jugadas/${params.id}`}
        className="inline-flex items-center h-11 -ml-2 px-2 font-semibold underline underline-offset-4"
      >
        Volver
      </Link>
      <h1 className="mt-2 mb-6 font-display font-extrabold text-6xl leading-[0.85]">Editar jugada</h1>
      {failed ? (
        <p className="text-lg">No se ha podido cargar la jugada. Prueba otra vez en un momento.</p>
      ) : (
        <PlayEditor initial={play} categories={CATEGORIES} />
      )}
    </main>
  );
}
