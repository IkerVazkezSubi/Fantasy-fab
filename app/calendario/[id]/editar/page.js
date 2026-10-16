import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isCoach } from "../../../../lib/session";
import { supabaseAdmin } from "../../../../lib/supabaseServer";
import { isoToMadridLocal } from "../../../../lib/dates";
import EventForm from "../../../../components/EventForm";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditarEventoPage({ params }) {
  if (!(await isCoach())) redirect("/calendario");
  if (!UUID.test(params.id)) notFound();

  let ev = null;
  let failed = false;
  try {
    const { data, error } = await supabaseAdmin()
      .from("events")
      .select("id, title, kind, starts_at, location, notes")
      .eq("id", params.id)
      .maybeSingle();
    if (error) throw error;
    ev = data;
  } catch (e) {
    console.error("Error cargando el evento para editar:", e);
    failed = true;
  }
  if (!failed && !ev) notFound();

  return (
    <main className="min-h-dvh max-w-xl mx-auto px-5 pt-6 pb-12">
      <Link
        href="/calendario"
        className="inline-flex items-center h-11 -ml-2 px-2 font-semibold underline underline-offset-4"
      >
        Volver al calendario
      </Link>
      <h1 className="mt-2 mb-6 font-display font-extrabold text-6xl leading-[0.85]">Editar evento</h1>
      {failed ? (
        <p className="text-lg">No se ha podido cargar el evento. Prueba otra vez en un momento.</p>
      ) : (
        <EventForm
          initial={{
            id: ev.id,
            title: ev.title,
            kind: ev.kind,
            starts_local: isoToMadridLocal(ev.starts_at),
            location: ev.location ?? "",
            notes: ev.notes ?? "",
          }}
        />
      )}
    </main>
  );
}
