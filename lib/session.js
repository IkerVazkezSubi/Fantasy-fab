// Para usar en componentes de servidor y rutas de la API.
import { cookies } from "next/headers";
import { COOKIE_NAME, verifyToken } from "./token";

export async function getSession() {
  const token = cookies().get(COOKIE_NAME)?.value;
  return verifyToken(token);
}

export async function isCoach() {
  const session = await getSession();
  return session?.role === "coach";
}
