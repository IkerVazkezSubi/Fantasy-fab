import Link from "next/link";
import { redirect } from "next/navigation";
import { isCoach } from "../../../lib/session";
import EventForm from "../../../components/EventForm";

export const dynamic = "force-dynamic";

export default async function NuevoEventoPage() {
  if (!(await isCoach())) redirect("/calendario");

  return (
    <main className="min-h-dvh max-w-xl mx-auto px-5 pt-6 pb-12">
      <Link
        href="/calendario"
        className="inline-flex items-center h-11 -ml-2 px-2 font-semibold underline underline-offset-4"
      >
        Volver al calendario
      </Link>
      <h1 className="mt-2 mb-6 font-display font-extrabold text-6xl leading-[0.85]">Nuevo evento</h1>
      <EventForm initial={{}} />
    </main>
  );
}
