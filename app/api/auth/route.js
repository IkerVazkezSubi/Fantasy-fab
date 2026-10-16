import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import {
  COOKIE_NAME,
  SESSION_DAYS,
  createToken,
  isSecretConfigured,
} from "../../../lib/token";

// Límite sencillo de intentos fallidos por IP. Vive en la memoria de cada
// instancia, así que frena a quien prueba contraseñas a ritmo de bot, aunque
// no sea una barrera perfecta.
const MAX_FAILS = 8;
const WINDOW_MS = 10 * 60 * 1000;
const fails = new Map(); // ip -> { count, resetAt }

function clientIp(req) {
  return (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "desconocida";
}

function sameText(a, b) {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(req) {
  const team = (process.env.TEAM_PASSWORD || "").trim();
  const coach = (process.env.COACH_PASSWORD || "").trim();
  if (!team || !coach || !isSecretConfigured()) {
    console.error(
      "Faltan TEAM_PASSWORD, COACH_PASSWORD o SESSION_SECRET (mínimo 32 caracteres)."
    );
    return NextResponse.json(
      { error: "La web no está configurada del todo. Avisa al entrenador." },
      { status: 500 }
    );
  }

  const ip = clientIp(req);
  const now = Date.now();
  const record = fails.get(ip);
  if (record && record.resetAt > now && record.count >= MAX_FAILS) {
    return NextResponse.json(
      { error: "Demasiados intentos. Espera unos minutos y vuelve a probar." },
      { status: 429 }
    );
  }

  let password = "";
  try {
    const body = await req.json();
    if (typeof body?.password === "string") password = body.password.trim();
  } catch {
    // cuerpo vacío o inválido: se trata como contraseña vacía
  }

  // Se comparan las dos siempre, para no delatar cuál ha fallado.
  const isCoach = sameText(password, coach);
  const isPlayer = sameText(password, team);
  const role = isCoach ? "coach" : isPlayer ? "player" : null;

  if (!role) {
    const current = record && record.resetAt > now ? record : { count: 0, resetAt: now + WINDOW_MS };
    current.count += 1;
    fails.set(ip, current);
    if (fails.size > 500) {
      for (const [key, value] of fails) if (value.resetAt <= now) fails.delete(key);
    }
    await sleep(600);
    return NextResponse.json(
      { error: "Contraseña incorrecta. Revisa mayúsculas y espacios." },
      { status: 401 }
    );
  }

  fails.delete(ip);
  const token = await createToken(role);
  const res = NextResponse.json({ ok: true, role });
  res.cookies.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * SESSION_DAYS,
  });
  return res;
}

// Cerrar sesión.
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
