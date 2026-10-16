import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "../../../lib/supabaseServer";
import PlayBoard from "../../../components/PlayBoard";
import { isCoach } from "../../../lib/session";
import { teamBySlug } from "../../../lib/teams";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function loadPlay(id) {
  try {
    const { data, error } = await supabaseAdmin()
      .from("plays")
      .select("id, name, team, category, description, steps")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return { play: data, failed: false };
  } catch (e) {
    console.error("Error cargando la jugada:", e);
    return { play: null, failed: true };
  }
}

const backTo = (team) => (
  <Link
    href={team ? `/jugadas?eq=${team}` : "/jugadas"}
    className="inline-flex items-center h-11 -ml-2 px-2 font-semibold underline underline-offset-4"
  >
    Volver a jugadas
  </Link>
);

export default async function PlayPage({ params }) {
  if (!UUID.test(params.id)) notFound();

  const { play, failed } = await loadPlay(params.id);

  if (failed) {
    return (
      <main className="min-h-dvh max-w-xl mx-auto px-5 pt-6 pb-12">
        {backTo(null)}
        <p className="mt-6 text-lg">
          No se ha podido cargar la jugada. Prueba otra vez en un momento; si sigue igual, avisa
          al entrenador.
        </p>
      </main>
    );
  }

  if (!play) notFound();

  const coach = await isCoach();

  return (
    <main className="min-h-dvh max-w-xl mx-auto px-5 pt-6 pb-12">
      {backTo(play.team)}

      <h1 className="mt-2 font-display font-extrabold text-5xl leading-[0.9]">{play.name}</h1>
      <p className="mt-2 text-linea/80">
        {teamBySlug(play.team)?.name ?? "Sin equipo"} · {play.category}
      </p>
      {play.description && <p className="mt-3 text-lg max-w-prose">{play.description}</p>}

      {coach && (
        <Link
          href={`/jugadas/${play.id}/editar`}
          className="mt-4 inline-flex items-center h-11 px-4 rounded-md border-2 border-linea/70 font-semibold"
        >
          Editar jugada
        </Link>
      )}

      <div className="mt-6">
        <PlayBoard steps={play.steps} title={play.name} />
      </div>
    </main>
  );
}
