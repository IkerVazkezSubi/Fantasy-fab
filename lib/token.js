// Token de sesión firmado (JWT HS256). Sin dependencias de Next, así que
// sirve tanto en el middleware (edge) como en las rutas de la API.
import { SignJWT, jwtVerify } from "jose";

export const COOKIE_NAME = "pz_session";
export const SESSION_DAYS = 30;

function secretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) return null;
  return new TextEncoder().encode(secret);
}

export function isSecretConfigured() {
  return secretKey() !== null;
}

export async function createToken(role) {
  const key = secretKey();
  if (!key) throw new Error("SESSION_SECRET no configurado o demasiado corto");
  return new SignJWT({ role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(key);
}

// Devuelve { role: "player" | "coach" } o null si no hay sesión válida.
export async function verifyToken(token) {
  const key = secretKey();
  if (!key || !token) return null;
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    if (payload.role === "coach" || payload.role === "player") {
      return { role: payload.role };
    }
    return null;
  } catch {
    return null;
  }
}
