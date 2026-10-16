import Link from "next/link";
import { supabaseAdmin } from "../../lib/supabaseServer";
import { CATEGORIES } from "../../lib/categories";

export const dynamic = "force-dynamic";

async function loadPlays() {
  try {
    const { data, error } = await supabaseAdmin()
      .from("plays")
      .select("id, name, category, description, sort_order, created_at")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw error;
    return { plays: data ?? [], failed: false };
  } catch (e) {
    console.error("Error cargando las jugadas:", e);
    return { plays: [], failed: true };
  }
}

export default async function JugadasPage({ searchParams }) {
  const selected = typeof searchParams?.cat === "string" ? searchParams.cat : null;
  const { plays, failed } = await loadPlays();

  // Categorías de la configuración, más cualquier otra que exista en los datos
  // (así ninguna jugada queda escondida si se renombra una categoría).
  const extra = [...new Set(plays.map((p) => p.category))].filter((c) => !CATEGORIES.includes(c));
  const categories = [...CATEGORIES, ...extra];

  const visible = selected ? plays.filter((p) => p.category === selected) : plays;

  const chip = "shrink-0 h-11 px-4 rounded-md border-2 flex items-center font-semibold whitespace-nowrap";

  return (
    <main className="min-h-dvh max-w-xl mx-auto px-5 pt-6 pb-12">
      <Link
        href="/"
        className="inline-flex items-center h-11 -ml-2 px-2 font-semibold underline underline-offset-4"
      >
        Volver al menú
      </Link>

      <h1 className="mt-2 font-display font-extrabold text-6xl leading-[0.85]">Jugadas</h1>

      <nav
        aria-label="Filtrar por categoría"
        className="mt-6 -mx-5 px-5 flex gap-2 overflow-x-auto pb-2"
      >
        <Link
          href="/jugadas"
          aria-current={!selected ? "page" : undefined}
          className={`${chip} ${!selected ? "bg-linea text-pintura border-linea" : "border-linea/60"}`}
        >
          Todas
        </Link>
        {categories.map((c) => (
          <Link
            key={c}
            href={`/jugadas?cat=${encodeURIComponent(c)}`}
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
