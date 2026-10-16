import Link from "next/link";

export default function JugadasPage() {
  return (
    <main className="min-h-dvh max-w-xl mx-auto px-5 pt-6 pb-12">
      <Link
        href="/"
        className="inline-flex items-center h-11 -ml-2 px-2 font-semibold underline underline-offset-4"
      >
        Volver al menú
      </Link>

      <h1 className="mt-4 font-display font-extrabold text-6xl leading-[0.85]">Jugadas</h1>
      <p className="mt-6 text-lg text-linea/80 max-w-prose">
        Todavía no hay jugadas. El entrenador las irá subiendo y aparecerán aquí.
      </p>
    </main>
  );
}
