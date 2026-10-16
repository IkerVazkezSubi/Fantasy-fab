import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-dvh max-w-xl mx-auto px-5 pt-6 pb-12">
      <h1 className="font-display font-extrabold text-6xl leading-[0.85]">No está</h1>
      <p className="mt-4 text-lg text-linea/80">
        Esta página no existe o la han borrado.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center h-12 px-5 rounded-md bg-balon text-tinta font-display font-bold text-2xl"
      >
        Volver al menú
      </Link>
    </main>
  );
}
