import Link from "next/link";
import { redirect } from "next/navigation";
import { isCoach } from "../../../lib/session";
import { CATEGORIES } from "../../../lib/categories";
import { DEFAULT_TEAM, TEAMS, teamBySlug } from "../../../lib/teams";
import PlayEditor from "../../../components/PlayEditor";

export const dynamic = "force-dynamic";

export default async function NuevaJugadaPage({ searchParams }) {
  if (!(await isCoach())) redirect("/jugadas");

  const team = teamBySlug(searchParams?.eq)?.slug ?? DEFAULT_TEAM;

  return (
    <main className="min-h-dvh max-w-xl mx-auto px-5 pt-6 pb-12">
      <Link
        href={`/jugadas?eq=${team}`}
        className="inline-flex items-center h-11 -ml-2 px-2 font-semibold underline underline-offset-4"
      >
        Volver a jugadas
      </Link>
      <h1 className="mt-2 mb-6 font-display font-extrabold text-6xl leading-[0.85]">Nueva jugada</h1>
      <PlayEditor
        initial={{ name: "", team, category: CATEGORIES[0], description: "", steps: [] }}
        categories={CATEGORIES}
        teams={TEAMS}
      />
    </main>
  );
}
