import Link from "next/link";
import { getSession } from "../lib/session";
import { SECTIONS } from "../lib/sections";
import LogoutButton from "../components/LogoutButton";
import PlayArt from "../components/PlayArt";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getSession();
  const isCoach = session?.role === "coach";

  return (
    <main className="min-h-dvh max-w-xl mx-auto px-5 pt-6 pb-12">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display font-extrabold text-6xl leading-[0.85]">Pizarra</h1>
          <p className="mt-2 text-linea/80">
            {isCoach ? "Sesión de entrenador" : "Sesión de jugador"}
          </p>
        </div>
        <LogoutButton />
      </header>

      <nav aria-label="Secciones" className="mt-8 grid grid-cols-2 gap-3">
        {SECTIONS.map((s) => {
          const span = s.wide ? "col-span-2" : "col-span-1";

          if (s.ready) {
            return (
              <Link
                key={s.key}
                href={s.href}
                className={`${span} parquet relative overflow-hidden rounded-md border-b-4 border-arce-dark text-tinta ${
                  s.wide ? "min-h-44 p-5" : "min-h-32 p-4"
                } flex flex-col justify-end active:translate-y-px`}
              >
                {s.wide && (
                  <PlayArt className="pointer-events-none absolute -top-2 -right-4 w-60 text-tinta opacity-30" />
                )}
                <span
                  className={`relative font-display font-extrabold leading-[0.85] ${
                    s.wide ? "text-6xl" : "text-[clamp(1.5rem,8vw,2.25rem)]"
                  }`}
                >
                  {s.label}
                </span>
                <span className={`relative font-medium ${s.wide ? "mt-2 text-lg" : "mt-1 text-base"}`}>
                  {s.hint}
                </span>
              </Link>
            );
          }

          return (
            <div
              key={s.key}
              className={`${span} rounded-md border-2 border-dashed border-linea/40 min-h-24 p-4 flex flex-col justify-end`}
            >
              <span className="font-display font-bold text-3xl leading-none text-linea/90">
                {s.label}
              </span>
              <span className="mt-1 text-sm text-linea/80">Próximamente</span>
            </div>
          );
        })}
      </nav>
    </main>
  );
}
