"use client";

// Editor de jugadas (solo entrenador). Pensado para móvil y tablet:
// botones grandes, jugadores que se arrastran con el dedo y un panel debajo
// de la pizarra con lo que se puede hacer con el jugador elegido.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import BoardSvg from "./BoardSvg";
import PlayBoard from "./PlayBoard";
import { PLAYER_IDS, buildShapes, curveHandle, normalizeSteps, stateFromStep } from "../lib/playGeometry";
import {
  MAX_DEFENDERS,
  MAX_STEPS,
  addDefender,
  blankStep,
  clearCurve,
  clearPass,
  getPass,
  hasMoved,
  holderBefore,
  moveDefender,
  movePlayer,
  nextStepFrom,
  playerAction,
  playerCurve,
  removeDefender,
  setBall,
  setCurve,
  setPass,
  setPlayerAction,
} from "../lib/editorModel";

const field =
  "w-full rounded-md bg-linea text-tinta px-3 text-base border-2 border-transparent focus:border-balon outline-none";
const btn =
  "min-h-11 px-4 rounded-md border-2 border-linea/70 font-semibold flex items-center justify-center active:bg-linea active:text-pintura disabled:opacity-35 disabled:active:bg-transparent disabled:active:text-linea";
const chipOn = "bg-linea text-pintura border-linea";

const ACTIONS = [
  { type: null, label: "Quieto" },
  { type: "move", label: "Se mueve" },
  { type: "dribble", label: "Bota" },
  { type: "screen", label: "Bloquea" },
];

export default function PlayEditor({ initial, categories }) {
  const router = useRouter();
  const isNew = !initial.id;

  const [name, setName] = useState(initial.name ?? "");
  const [category, setCategory] = useState(initial.category ?? categories[0]);
  const [description, setDescription] = useState(initial.description ?? "");
  const [steps, setSteps] = useState(() => {
    const n = normalizeSteps(initial.steps);
    return n.length ? n : [blankStep()];
  });
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null); // { kind: "p" | "d", id }
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null); // { ok, text }
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [testing, setTesting] = useState(false);

  const svgRef = useRef(null);
  const drag = useRef(null);

  const norm = useMemo(() => normalizeSteps(steps), [steps]);
  const cur = steps[index];
  const prev = index > 0 ? steps[index - 1] : null;
  const shown = useMemo(() => stateFromStep(norm[index]), [norm, index]);
  const shapes = useMemo(() => buildShapes(norm, index), [norm, index]);
  // Puntos naranjas para curvar los movimientos de este paso (en unidades SVG).
  const handles = useMemo(() => {
    if (index === 0) return [];
    return PLAYER_IDS.map((id) => {
      const h = curveHandle(norm[index - 1], norm[index], id);
      return h ? { id, x: (h.x * 500) / 100, y: (h.y * 470) / 100 } : null;
    }).filter(Boolean);
  }, [norm, index]);
  const allCategories = categories.includes(category) ? categories : [...categories, category];

  // Aviso del navegador si se intenta salir con cambios sin guardar.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const touch = () => {
    setDirty(true);
    setMessage(null);
  };
  const updateStep = (i, fn) => {
    setSteps((list) => list.map((s, j) => (j === i ? fn(s) : s)));
    touch();
  };
  const updateCur = (fn) => updateStep(index, fn);

  // --- arrastrar jugadores y defensores ------------------------------------
  const pointerPct = (e) => {
    const r = svgRef.current.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * 100,
      y: ((e.clientY - r.top) / r.height) * 100,
    };
  };

  // Posición (en %) de lo que se arrastra: jugador "p", defensor "d" o punto de curva "c".
  const posOf = (s, kind, id) =>
    kind === "p" ? s.players[id] : kind === "d" ? s.defenders.find((d) => d.id === id) : curveHandle(prev, s, id);
  const placeAt = (s, kind, id, x, y) => {
    if (kind === "p") return movePlayer(s, id, x, y);
    if (kind === "d") return moveDefender(s, id, x, y);
    // El punto está sobre la curva (a mitad); el punto de control real queda más lejos.
    const a = prev.players[id];
    const b = s.players[id];
    const hx = Math.min(98, Math.max(2, x));
    const hy = Math.min(98, Math.max(2, y));
    return setCurve(s, id, 2 * hx - (a.x + b.x) / 2, 2 * hy - (a.y + b.y) / 2);
  };

  const itemProps = (kind, id) => ({
    tabIndex: 0,
    role: "button",
    "aria-label":
      kind === "p" ? `Jugador ${id}` : kind === "d" ? `Defensor ${id.replace("d", "")}` : `Curva del jugador ${id}`,
    onPointerDown: (e) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      const pos = posOf(cur, kind, id);
      if (!pos) return;
      const pt = pointerPct(e);
      drag.current = { kind, id, pid: e.pointerId, dx: pos.x - pt.x, dy: pos.y - pt.y, moved: false };
      setSelected(kind === "c" ? { kind: "p", id } : { kind, id });
      setConfirmDelete(false);
    },
    onPointerMove: (e) => {
      const d = drag.current;
      if (!d || d.pid !== e.pointerId) return;
      const pt = pointerPct(e);
      d.moved = true;
      updateCur((s) => placeAt(s, d.kind, d.id, pt.x + d.dx, pt.y + d.dy));
    },
    onPointerUp: (e) => {
      const d = drag.current;
      if (!d || d.pid !== e.pointerId) return;
      drag.current = null;
      // Si un jugador se ha movido respecto al paso anterior y aún no tiene acción, se marca "se mueve".
      if (d.moved && d.kind === "p" && prev) {
        updateCur((s) =>
          hasMoved(prev, s, d.id) && !playerAction(s, d.id) ? setPlayerAction(s, d.id, "move") : s
        );
      }
    },
    onPointerCancel: () => {
      drag.current = null;
    },
    // Con teclado: flechas para mover el elemento elegido.
    onKeyDown: (e) => {
      const step = e.shiftKey ? 5 : 1.5;
      const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
      const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setSelected(kind === "c" ? { kind: "p", id } : { kind, id });
        return;
      }
      if (!dx && !dy) return;
      e.preventDefault();
      setSelected(kind === "c" ? { kind: "p", id } : { kind, id });
      updateCur((s) => {
        const pos = posOf(s, kind, id);
        return pos ? placeAt(s, kind, id, pos.x + dx, pos.y + dy) : s;
      });
    },
  });

  // --- pasos ---------------------------------------------------------------
  const addStep = () => {
    if (steps.length >= MAX_STEPS) return;
    setSteps((list) => [...list.slice(0, index + 1), nextStepFrom(list[index]), ...list.slice(index + 1)]);
    setIndex(index + 1);
    setSelected(null);
    touch();
  };
  const duplicateStep = () => {
    if (steps.length >= MAX_STEPS) return;
    setSteps((list) => [
      ...list.slice(0, index + 1),
      JSON.parse(JSON.stringify(list[index])),
      ...list.slice(index + 1),
    ]);
    setIndex(index + 1);
    touch();
  };
  const deleteStep = () => {
    if (steps.length <= 1) return;
    setSteps((list) => list.filter((_, i) => i !== index));
    setIndex(Math.max(0, index - 1));
    setSelected(null);
    touch();
  };
  const moveStep = (dir) => {
    const to = index + dir;
    if (to < 0 || to >= steps.length) return;
    setSteps((list) => {
      const copy = [...list];
      [copy[index], copy[to]] = [copy[to], copy[index]];
      return copy;
    });
    setIndex(to);
    touch();
  };

  // --- guardar, duplicar y borrar la jugada --------------------------------
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

  const save = async () => {
    if (!name.trim()) {
      setMessage({ ok: false, text: "Escribe el nombre de la jugada." });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const body = { name, category, description, steps };
      const data = isNew
        ? await request("/api/plays", "POST", body)
        : await request(`/api/plays/${initial.id}`, "PUT", body);
      setDirty(false);
      router.push(`/jugadas/${data.id}`);
      router.refresh();
    } catch (e) {
      setMessage({ ok: false, text: e.message });
      setBusy(false);
    }
  };

  const duplicatePlay = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const data = await request(`/api/plays/${initial.id}/duplicate`, "POST");
      router.push(`/jugadas/${data.id}/editar`);
      router.refresh();
    } catch (e) {
      setMessage({ ok: false, text: e.message });
      setBusy(false);
    }
  };

  const deletePlay = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await request(`/api/plays/${initial.id}`, "DELETE");
      setDirty(false);
      router.push("/jugadas");
      router.refresh();
    } catch (e) {
      setMessage({ ok: false, text: e.message });
      setBusy(false);
      setConfirmDelete(false);
    }
  };

  // --- panel del elemento elegido ------------------------------------------
  const selPlayer = selected?.kind === "p" ? selected.id : null;
  const selDefender = selected?.kind === "d" ? selected.id : null;
  const pass = getPass(cur);
  const selCurve = selPlayer ? playerCurve(cur, selPlayer) : null;
  const canCurve = selPlayer && handles.some((h) => h.id === selPlayer);
  const canPass = selPlayer && holderBefore(cur) === selPlayer;

  return (
    <div className="pb-32">
      <div className="space-y-4">
        <div>
          <label htmlFor="ed-name" className="block font-semibold mb-1">
            Nombre
          </label>
          <input
            id="ed-name"
            className={`${field} h-12`}
            value={name}
            maxLength={80}
            onChange={(e) => {
              setName(e.target.value);
              touch();
            }}
            placeholder="Por ejemplo: Bloqueo directo"
          />
        </div>

        <div>
          <label htmlFor="ed-cat" className="block font-semibold mb-1">
            Categoría
          </label>
          <select
            id="ed-cat"
            className={`${field} h-12`}
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              touch();
            }}
          >
            {allCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="ed-desc" className="block font-semibold mb-1">
            Descripción <span className="font-normal text-linea/70">(opcional)</span>
          </label>
          <textarea
            id="ed-desc"
            className={`${field} py-2 min-h-24`}
            value={description}
            maxLength={600}
            onChange={(e) => {
              setDescription(e.target.value);
              touch();
            }}
            placeholder="Cuándo se usa y qué busca"
          />
        </div>
      </div>

      {/* Pizarra */}
      <h2 className="mt-8 font-display font-bold text-4xl leading-none">Pizarra</h2>
      <p className="mt-1 text-linea/80">
        Arrastra a los jugadores con el dedo. Toca uno para ver qué puede hacer en este paso.
      </p>

      <div className="mt-3 rounded-md overflow-hidden border-b-4 border-arce-dark">
        <BoardSvg
          shown={shown}
          shapes={shapes}
          svgRef={svgRef}
          itemProps={itemProps}
          selected={selected}
          handles={handles}
          label="Pizarra del editor"
        />
      </div>

      {/* Pasos */}
      <p className="mt-5 font-display font-bold text-3xl leading-none">
        Paso {index + 1} de {steps.length}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {steps.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => {
              setIndex(i);
              setSelected(null);
            }}
            aria-label={`Ir al paso ${i + 1}`}
            aria-current={i === index ? "step" : undefined}
            className={`h-11 min-w-11 px-3 rounded-md border-2 font-display font-bold text-xl ${
              i === index ? chipOn : "border-linea/60"
            }`}
          >
            {i + 1}
          </button>
        ))}
        <button
          type="button"
          onClick={addStep}
          disabled={steps.length >= MAX_STEPS}
          className="h-11 px-4 rounded-md bg-balon text-tinta font-display font-bold text-xl disabled:opacity-40"
        >
          + Paso
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" className={btn} onClick={() => moveStep(-1)} disabled={index === 0}>
          Mover antes
        </button>
        <button type="button" className={btn} onClick={() => moveStep(1)} disabled={index === steps.length - 1}>
          Mover después
        </button>
        <button type="button" className={btn} onClick={duplicateStep} disabled={steps.length >= MAX_STEPS}>
          Duplicar paso
        </button>
        <button type="button" className={btn} onClick={deleteStep} disabled={steps.length <= 1}>
          Borrar paso
        </button>
      </div>

      <div className="mt-4">
        <label htmlFor="ed-text" className="block font-semibold mb-1">
          Texto de este paso
        </label>
        <textarea
          id="ed-text"
          className={`${field} py-2 min-h-24`}
          value={cur.text}
          maxLength={400}
          onChange={(e) => updateCur((s) => ({ ...s, text: e.target.value }))}
          placeholder="Qué pasa en este paso, en una frase corta"
        />
      </div>

      {/* Elemento elegido */}
      <section aria-label="Jugador elegido" className="mt-6 rounded-md border-2 border-linea/40 p-4">
        {!selected && (
          <p className="text-linea/80">
            Toca un jugador o un defensor en la pizarra para cambiar lo que hace.
          </p>
        )}

        {selPlayer && (
          <div className="space-y-4">
            <h3 className="font-display font-bold text-3xl leading-none">Jugador {selPlayer}</h3>

            {index > 0 ? (
              <div>
                <p className="font-semibold mb-1">En este paso</p>
                <div className="grid grid-cols-2 gap-2">
                  {ACTIONS.map((a) => {
                    const on = (playerAction(cur, selPlayer) ?? null) === a.type;
                    return (
                      <button
                        key={a.label}
                        type="button"
                        aria-pressed={on}
                        onClick={() => updateCur((s) => setPlayerAction(s, selPlayer, a.type))}
                        className={`${btn} ${on ? chipOn : ""}`}
                      >
                        {a.label}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-1 text-sm text-linea/70">
                  La línea se dibuja desde donde estaba en el paso anterior.
                  {canCurve && " Arrastra el punto naranja de la línea para hacerla curva."}
                </p>
                {selCurve && (
                  <button
                    type="button"
                    className={`${btn} mt-2`}
                    onClick={() => updateCur((s) => clearCurve(s, selPlayer))}
                  >
                    Quitar la curva
                  </button>
                )}
              </div>
            ) : (
              <p className="text-linea/80">
                En el primer paso solo se coloca a los jugadores. Los movimientos se marcan a partir del
                segundo.
              </p>
            )}

            <div>
              <p className="font-semibold mb-1">Balón</p>
              <button
                type="button"
                aria-pressed={cur.ball === selPlayer}
                onClick={() => updateCur((s) => setBall(s, selPlayer))}
                className={`${btn} w-full ${cur.ball === selPlayer ? chipOn : ""}`}
              >
                {cur.ball === selPlayer ? "Tiene el balón" : "Dar el balón a este jugador"}
              </button>
            </div>

            {canPass && (
              <div>
                <p className="font-semibold mb-1">Pasa el balón a</p>
                <div className="flex flex-wrap gap-2">
                  {PLAYER_IDS.filter((id) => id !== selPlayer).map((id) => {
                    const on = pass?.to === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        aria-pressed={on}
                        aria-label={`Pasar al jugador ${id}`}
                        onClick={() => updateCur((s) => (on ? clearPass(s) : setPass(s, selPlayer, id)))}
                        className={`h-11 w-11 rounded-md border-2 font-display font-bold text-2xl ${
                          on ? chipOn : "border-linea/60"
                        }`}
                      >
                        {id}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-1 text-sm text-linea/70">Vuelve a tocar el número para quitar el pase.</p>
              </div>
            )}
          </div>
        )}

        {selDefender && (
          <div className="space-y-3">
            <h3 className="font-display font-bold text-3xl leading-none">
              Defensor {selDefender.replace("d", "")}
            </h3>
            <button
              type="button"
              className={btn}
              onClick={() => {
                updateCur((s) => removeDefender(s, selDefender));
                setSelected(null);
              }}
            >
              Quitar defensor
            </button>
          </div>
        )}
      </section>

      <div className="mt-3">
        <button
          type="button"
          className={`${btn} w-full`}
          disabled={cur.defenders.length >= MAX_DEFENDERS}
          onClick={() => updateCur(addDefender)}
        >
          + Añadir defensor ({cur.defenders.length}/{MAX_DEFENDERS})
        </button>
        <p className="mt-1 text-sm text-linea/70">
          Los defensores del paso se copian al paso siguiente, así que solo hay que moverlos.
        </p>
      </div>

      {/* Probar */}
      <div className="mt-8">
        <button
          type="button"
          aria-expanded={testing}
          className={`${btn} w-full`}
          onClick={() => setTesting((v) => !v)}
        >
          {testing ? "Cerrar la prueba" : "Probar la jugada"}
        </button>
        {testing && (
          <div className="mt-4">
            <PlayBoard steps={steps} title={name || "Jugada"} />
          </div>
        )}
      </div>

      {/* Acciones sobre la jugada entera */}
      {!isNew && (
        <div className="mt-8 grid grid-cols-2 gap-2">
          <button type="button" className={btn} onClick={duplicatePlay} disabled={busy || dirty}>
            Duplicar jugada
          </button>
          <button
            type="button"
            className={`${btn} ${confirmDelete ? "bg-balon text-tinta border-balon" : ""}`}
            onClick={deletePlay}
            disabled={busy}
          >
            {confirmDelete ? "Toca otra vez para borrar" : "Borrar jugada"}
          </button>
          {dirty && (
            <p className="col-span-2 text-sm text-linea/70">Guarda los cambios antes de duplicar.</p>
          )}
        </div>
      )}

      {/* Barra de guardar, siempre a mano */}
      <div className="fixed inset-x-0 bottom-0 z-10 bg-pintura-dark border-t border-linea/30">
        <div className="max-w-xl mx-auto px-5 py-3">
          {message && (
            <p role="status" className={`mb-2 font-semibold ${message.ok ? "" : "text-arce"}`}>
              {message.text}
            </p>
          )}
          <div className="flex gap-3">
            <Link
              href={isNew ? "/jugadas" : `/jugadas/${initial.id}`}
              className={`${btn} shrink-0`}
              onClick={(e) => {
                if (dirty && !window.confirm("Tienes cambios sin guardar. ¿Salir sin guardar?")) {
                  e.preventDefault();
                }
              }}
            >
              Cancelar
            </Link>
            <button
              type="button"
              onClick={save}
              disabled={busy}
              className="min-h-12 flex-1 rounded-md bg-balon text-tinta font-display font-bold text-2xl disabled:opacity-60"
            >
              {busy ? "Guardando…" : dirty || isNew ? "Guardar jugada" : "Guardado"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
