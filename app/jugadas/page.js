import Link from "next/link";
import { supabaseAdmin } from "../../lib/supabaseServer";
import { CATEGORIES } from "../../lib/categories";
import { DEFAULT_TEAM, TEAMS, teamBySlug } from "../../lib/teams";
import { isCoach } from "../../lib/session";

export const dynamic = "force-dynamic";

async function loadPlays() {
  try {
    const { data, error } = await supabaseAdmin()
      .from("plays")
      .select("id, name, team, category, description, sort_order, created_at")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw error;
    // Una jugada sin equipo válido se muestra en el primero, para que nunca se pierda.
    const plays = (data ?? []).map((p) => ({ ...p, team: teamBySlug(p.team) ? p.team : DEFAULT_TEAM }));
    return { plays, failed: false };
  } catch (e) {
    console.error("Error cargando las jugadas:", e);
    return { plays: [], failed: true };
  }
}

const back =
  "inline-flex items-center h-11 -ml-2 px-2 font-semibold underline underline-offset-4";

export default async function JugadasPage({ searchParams }) {
  const team = teamBySlug(typeof searchParams?.eq === "string" ? searchParams.eq : null);
  const selected = typeof searchParams?.cat === "string" ? searchParams.cat : null;
  const [{ plays, failed }, coach] = await Promise.all([loadPlays(), isCoach()]);

  // --- Paso 1: elegir equipo ---------------------------------------------------
  if (!team) {
    return (
      <main className="min-h-dvh max-w-xl mx-auto px-5 pt-6 pb-12">
        <Link href="/" className={back}>
          Volver al menú
        </Link>
        <h1 className="mt-2 font-display font-extrabold text-6xl leading-[0.85]">Jugadas</h1>
        <p className="mt-3 text-lg text-linea/80">Elige tu equipo</p>

        {failed ? (
          <p className="mt-8 text-lg">
            No se han podido cargar las jugadas. Prueba otra vez en un momento; si sigue igual,
            avisa al entrenador.
          </p>
        ) : (
          <nav aria-label="Equipos" className="mt-6 grid gap-3">
            {TEAMS.map((t) => {
              const n = plays.filter((p) => p.team === t.slug).length;
              return (
                <Link
                  key={t.slug}
                  href={`/jugadas?eq=${t.slug}`}
                  className="parquet rounded-md border-b-4 border-arce-dark text-tinta min-h-28 p-4 flex flex-col justify-end active:translate-y-px"
                >
                  <span className="font-display font-extrabold text-5xl leading-[0.9]">{t.name}</span>
                  <span className="mt-1 font-medium">
                    {n === 0 ? "Todavía sin jugadas" : n === 1 ? "1 jugada" : `${n} jugadas`}
                  </span>
                </Link>
              );
            })}
          </nav>
        )}
      </main>
    );
  }

  // --- Paso 2: jugadas del equipo ----------------------------------------------
  const ofTeam = plays.filter((p) => p.team === team.slug);

  // Categorías de la configuración, más cualquier otra que exista en los datos
  // (así ninguna jugada queda escondida si se renombra una categoría).
  const extra = [...new Set(ofTeam.map((p) => p.category))].filter((c) => !CATEGORIES.includes(c));
  const categories = [...CATEGORIES, ...extra];
  const visible = selected ? ofTeam.filter((p) => p.category === selected) : ofTeam;

  const base = `/jugadas?eq=${team.slug}`;
  const chip = "shrink-0 h-11 px-4 rounded-md border-2 flex items-center font-semibold whitespace-nowrap";

  return (
    <main className="min-h-dvh max-w-xl mx-auto px-5 pt-6 pb-12">
      <Link href="/jugadas" className={back}>
        Cambiar de equipo
      </Link>

      <h1 className="mt-2 font-display font-extrabold text-6xl leading-[0.85]">Jugadas</h1>
      <p className="mt-2 font-display font-bold text-3xl leading-none text-arce">{team.name}</p>

      {coach && (
        <Link
          href={`/jugadas/nueva?eq=${team.slug}`}
          className="mt-4 inline-flex items-center h-12 px-5 rounded-md bg-balon text-tinta font-display font-bold text-2xl"
        >
          + Nueva jugada
        </Link>
      )}

      <nav
        aria-label="Filtrar por categoría"
        className="mt-6 -mx-5 px-5 flex gap-2 overflow-x-auto pb-2"
      >
        <Link
          href={base}
          aria-current={!selected ? "page" : undefined}
          className={`${chip} ${!selected ? "bg-linea text-pintura border-linea" : "border-linea/60"}`}
        >
          Todas
        </Link>
        {categories.map((c) => (
          <Link
            key={c}
            href={`${base}&cat=${encodeURIComponent(c)}`}
            aria-current={selected === c ? "page" : undefined}
            className={`${chip} ${selected === c ? "bg-linea text-pintura border-linea" : "border-linea/60"}`}
          >
            {c}
          </Link>
        ))}
      </nav>

      {failed ? (
        <p className="mt-8 text-lg">
          No se han podido cargar las jugadas. Prueba otra vez en un momento; si sigue igual,
          avisa al entrenador.
        </p>
      ) : visible.length === 0 ? (
        <p className="mt-8 text-lg text-linea/80">
          {selected
            ? `Todavía no hay jugadas en ${selected}.`
            : "Todavía no hay jugadas. El entrenador las irá subiendo y aparecerán aquí."}
        </p>
      ) : (
        <ul className="mt-4">
          {visible.map((p) => (
            <li key={p.id}>
              <Link
                href={`/jugadas/${p.id}`}
                className="block py-4 border-b border-linea/25 active:bg-pintura-dark"
              >
                <span className="block font-display font-bold text-3xl leading-tight">{p.name}</span>
                <span className="block mt-0.5 text-linea/80">{p.category}</span>
                {p.description && (
                  <span className="block mt-1 text-linea/80 line-clamp-2">{p.description}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
