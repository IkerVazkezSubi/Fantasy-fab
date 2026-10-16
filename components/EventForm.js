"use client";

// Formulario de evento del calendario (solo entrenador): crear, editar y borrar.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { EVENT_KINDS } from "../lib/events";

const field =
  "w-full rounded-md bg-linea text-tinta px-3 text-base border-2 border-transparent focus:border-balon outline-none";
const btn =
  "min-h-11 px-4 rounded-md border-2 border-linea/70 font-semibold flex items-center justify-center active:bg-linea active:text-pintura disabled:opacity-35";

export default function EventForm({ initial }) {
  const router = useRouter();
  const isNew = !initial.id;

  const [title, setTitle] = useState(initial.title ?? "");
  const [kind, setKind] = useState(initial.kind ?? EVENT_KINDS[0]);
  const [startsLocal, setStartsLocal] = useState(initial.starts_local ?? "");
  const [location, setLocation] = useState(initial.location ?? "");
  const [notes, setNotes] = useState(initial.notes ?? "");
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const change = (setter) => (e) => {
    setter(e.target.value);
    setDirty(true);
    setError(null);
  };

  const request = async (url, method, body) => {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Algo ha fallado. Prueba otra vez.");
    return data;
  };

  const done = () => {
    setDirty(false);
    router.push("/calendario");
    router.refresh();
  };

  const save = async (e) => {
    e.preventDefault();
    if (!title.trim()) return setError("Escribe el título.");
    if (!startsLocal) return setError("Elige la fecha y la hora.");
    setBusy(true);
    setError(null);
    try {
      const body = { title, kind, starts_local: startsLocal, location, notes };
      if (isNew) await request("/api/events", "POST", body);
      else await request(`/api/events/${initial.id}`, "PUT", body);
      done();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirmDelete) return setConfirmDelete(true);
    setBusy(true);
    setError(null);
    try {
      await request(`/api/events/${initial.id}`, "DELETE");
      done();
    } catch (err) {
      setError(err.message);
      setBusy(false);
      setConfirmDelete(false);
    }
  };

  return (
    <form onSubmit={save} className="space-y-4 pb-28">
      <div>
        <label htmlFor="ev-title" className="block font-semibold mb-1">
          Título
        </label>
        <input
          id="ev-title"
          className={`${field} h-12`}
          value={title}
          maxLength={80}
          onChange={change(setTitle)}
          placeholder="Por ejemplo: Entreno de martes"
        />
      </div>

      <fieldset>
        <legend className="font-semibold mb-1">Tipo</legend>
        <div className="flex gap-2">
          {EVENT_KINDS.map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={kind === k}
              onClick={() => {
                setKind(k);
                setDirty(true);
              }}
              className={`${btn} flex-1 ${kind === k ? "bg-linea text-pintura border-linea" : ""}`}
            >
              {k}
            </button>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="ev-when" className="block font-semibold mb-1">
          Fecha y hora
        </label>
        <input
          id="ev-when"
          type="datetime-local"
          step="300"
          className={`${field} h-12`}
          value={startsLocal}
          onChange={change(setStartsLocal)}
        />
        <p className="mt-1 text-sm text-linea/70">Hora de Madrid.</p>
      </div>

      <div>
        <label htmlFor="ev-loc" className="block font-semibold mb-1">
          Lugar <span className="font-normal text-linea/70">(opcional)</span>
        </label>
        <input
          id="ev-loc"
          className={`${field} h-12`}
          value={location}
          maxLength={120}
          onChange={change(setLocation)}
          placeholder="Pabellón, dirección…"
        />
      </div>

      <div>
        <label htmlFor="ev-notes" className="block font-semibold mb-1">
          Notas <span className="font-normal text-linea/70">(opcional)</span>
        </label>
        <textarea
          id="ev-notes"
          className={`${field} py-2 min-h-24`}
          value={notes}
          maxLength={600}
          onChange={change(setNotes)}
          placeholder="Qué llevar, a qué hora llegar…"
        />
      </div>

      {!isNew && (
        <button
          type="button"
          onClick={remove}
          disabled={busy}
          className={`${btn} w-full ${confirmDelete ? "bg-balon text-tinta border-balon" : ""}`}
        >
          {confirmDelete ? "Toca otra vez para borrar" : "Borrar evento"}
        </button>
      )}

      <div className="fixed inset-x-0 bottom-0 z-10 bg-pintura-dark border-t border-linea/30">
        <div className="max-w-xl mx-auto px-5 py-3">
          {error && (
            <p role="alert" className="mb-2 font-semibold text-arce">
              {error}
            </p>
          )}
          <div className="flex gap-3">
            <Link
              href="/calendario"
              className={`${btn} shrink-0`}
              onClick={(e) => {
                if (dirty && !window.confirm("Tienes cambios sin guardar. ¿Salir sin guardar?")) e.preventDefault();
              }}
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={busy}
              className="min-h-12 flex-1 rounded-md bg-balon text-tinta font-display font-bold text-2xl disabled:opacity-60"
            >
              {busy ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
