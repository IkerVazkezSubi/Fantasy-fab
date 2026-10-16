import { NextResponse } from "next/server";
import { COOKIE_NAME, verifyToken } from "./lib/token";

export async function middleware(req) {
  const { pathname } = req.nextUrl;

  // El login por contraseña tiene que poder llamarse sin sesión.
  if (pathname === "/api/auth") return NextResponse.next();

  const session = await verifyToken(req.cookies.get(COOKIE_NAME)?.value);
  const isLoginPage = pathname === "/login";

  if (session) {
    // Con sesión, el login no hace falta.
    if (isLoginPage) return NextResponse.redirect(new URL("/", req.url));
    return NextResponse.next();
  }

  if (isLoginPage) return NextResponse.next();

  // Sin sesión: la API responde 401 y las páginas mandan al login.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/login", req.url));
}

export const config = {
  // Todo menos los ficheros estáticos de Next, el icono y robots.txt
  // (los buscadores tienen que poder leer que no deben indexar nada).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|robots.txt).*)"],
};
