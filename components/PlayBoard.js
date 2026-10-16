"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import BoardSvg from "./BoardSvg";
import {
  buildShapes,
  easeInOut,
  lerpState,
  normalizeSteps,
  stateFromStep,
} from "../lib/playGeometry";

const MOVE_MS = 550; // lo que tarda cada movimiento
const HOLD_BASE_MS = 600; // pausa mínima antes del siguiente paso al reproducir
const HOLD_PER_CHAR_MS = 10; // más pausa si el texto del paso es largo
const HOLD_MAX_MS = 1800;

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reduced;
}

const iconProps = {
  width: 26,
  height: 26,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

export default function PlayBoard({ steps, title }) {
  const norm = useMemo(() => normalizeSteps(steps), [steps]);
  const total = norm.length;

  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [shown, setShown] = useState(() => (total ? stateFromStep(norm[0]) : null));
  const shownRef = useRef(shown);
  const firstRun = useRef(true);
  const reduced = useReducedMotion();

  // Cada vez que cambia el paso, los jugadores se mueven suavemente desde donde
  // estén ahora hasta su posición en ese paso (también si se interrumpe a mitad).
  useEffect(() => {
    if (!total) return;
    const target = stateFromStep(norm[Math.min(index, total - 1)]);

    if (firstRun.current || reduced) {
      firstRun.current = false;
      shownRef.current = target;
      setShown(target);
      return;
    }

    const from = shownRef.current ?? target;
    const start = performance.now();
    let raf = 0;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / MOVE_MS);
      const next = lerpState(from, target, easeInOut(t));
      shownRef.current = next;
      setShown(next);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [index, norm, reduced, total]);

  // Reproducción automática: espera a que acabe el movimiento, deja leer el
  // texto y pasa al siguiente. Al llegar al último paso se detiene sola.
  useEffect(() => {
    if (!playing) return;
    if (index >= total - 1) {
      setPlaying(false);
      return;
    }
    const readTime = Math.min(
      HOLD_MAX_MS,
      HOLD_BASE_MS + HOLD_PER_CHAR_MS * (norm[index]?.text.length ?? 0)
    );
    const wait = (reduced ? 0 : MOVE_MS) + readTime;
    const id = setTimeout(() => setIndex((i) => Math.min(i + 1, total - 1)), wait);
    return () => clearTimeout(id);
  }, [playing, index, total, norm, reduced]);

  const goPrev = () => {
    setPlaying(false);
    setIndex((i) => Math.max(0, i - 1));
  };
  const goNext = () => {
    setPlaying(false);
    setIndex((i) => Math.min(total - 1, i + 1));
  };
  const goTo = (i) => {
    setPlaying(false);
    setIndex(i);
  };
  const togglePlay = () => {
    if (playing) {
      setPlaying(false);
      return;
    }
    if (index >= total - 1) setIndex(0);
    setPlaying(true);
  };

  // Flechas del teclado ← → (en ordenador o tablet con teclado).
  useEffect(() => {
    const onKey = (e) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const tag = e.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const shapes = useMemo(() => buildShapes(norm, index), [norm, index]);

  if (!total || !shown) {
    return (
      <p className="mt-6 text-lg text-linea/80">
        Esta jugada todavía no tiene pasos. El entrenador los añadirá pronto.
      </p>
    );
  }

  const atStart = index === 0;
  const atEnd = index >= total - 1;
  const playLabel = playing ? "Pausar" : atEnd && total > 1 ? "Repetir" : "Reproducir";
  const btn =
    "h-14 rounded-md border-2 border-linea/70 flex items-center justify-center active:bg-linea active:text-pintura disabled:opacity-35 disabled:active:bg-transparent disabled:active:text-linea";

  return (
    <section aria-label="Pizarra de la jugada">
      <div className="rounded-md overflow-hidden border-b-4 border-arce-dark">
        <BoardSvg shown={shown} shapes={shapes} label={title ? `Pizarra: ${title}` : undefined} />
      </div>

      <div className="mt-4 flex items-stretch gap-3">
        <button type="button" onClick={goPrev} disabled={atStart} aria-label="Paso anterior" className={`${btn} w-16`}>
          <svg {...iconProps}>
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>

        <button
          type="button"
          onClick={togglePlay}
          className="h-14 flex-1 rounded-md bg-balon text-tinta font-display font-bold text-2xl flex items-center justify-center gap-2 active:translate-y-px"
        >
          <svg {...iconProps} fill="currentColor" strokeWidth={1.5}>
            {playing ? (
              <>
                <rect x="6" y="5" width="4" height="14" rx="1" />
                <rect x="14" y="5" width="4" height="14" rx="1" />
              </>
            ) : (
              <path d="M8 5l11 7-11 7z" />
            )}
          </svg>
          {playLabel}
        </button>

        <button type="button" onClick={goNext} disabled={atEnd} aria-label="Paso siguiente" className={`${btn} w-16`}>
          <svg {...iconProps}>
            <path d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <p className="mt-6 font-display font-bold text-4xl leading-none">
        Paso {index + 1} de {total}
      </p>

      {total > 1 && (
        <div className="mt-2 -ml-1.5 flex flex-wrap">
          {norm.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Ir al paso ${i + 1}`}
              aria-current={i === index ? "step" : undefined}
              className="h-8 w-8 flex items-center justify-center"
            >
              <span
                className={`block rounded-full ${
                  i === index ? "h-3.5 w-3.5 bg-balon" : "h-2.5 w-2.5 bg-linea/50"
                }`}
              />
            </button>
          ))}
        </div>
      )}

      <p aria-live="polite" className="mt-3 text-xl leading-snug min-h-[5.5rem] max-w-prose">
        {norm[index].text || "Este paso no tiene explicación."}
      </p>
    </section>
  );
}
