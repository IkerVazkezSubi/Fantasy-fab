# Pizarra

Web privada del equipo para ver las jugadas. Pensada para el móvil.

## Acceso

- Una contraseña común para los jugadores y otra para el entrenador.
- Todo está protegido: sin sesión, cualquier página redirige a `/login` y cualquier
  llamada a la API devuelve 401.
- La sesión dura 30 días y se guarda en una cookie firmada (httpOnly).
- La web no se indexa: `noindex` en las páginas, en la cabecera `X-Robots-Tag` y en `robots.txt`.

## Variables de entorno (Vercel → Settings → Environment Variables)

| Variable | Para qué sirve |
|---|---|
| `TEAM_PASSWORD` | Contraseña del equipo (rol jugador) |
| `COACH_PASSWORD` | Contraseña del entrenador (rol admin) |
| `SESSION_SECRET` | Cadena aleatoria de 32 caracteres o más para firmar la sesión |
| `NEXT_PUBLIC_SUPABASE_URL` | Conexión con Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Conexión con Supabase |

Cambiar `SESSION_SECRET` cierra la sesión de todo el mundo. Cambiar una contraseña no
cierra las sesiones ya abiertas (para eso, cambia también `SESSION_SECRET`).

## Estructura

```
app/
  login/          pantalla de contraseña
  page.js         menú principal
  jugadas/        sección de jugadas
  api/auth/       entrar (POST) y salir (DELETE)
  robots.js       robots.txt
components/       piezas de la interfaz
lib/
  token.js        crear y comprobar la sesión
  session.js      leer la sesión en el servidor
  sections.js     secciones del menú (activar una nueva = ready: true)
middleware.js     bloquea todo lo que no tenga sesión
```

## Desarrollo

```bash
npm install
TEAM_PASSWORD=equipo COACH_PASSWORD=entrenador SESSION_SECRET=una-cadena-de-32-o-mas-caracteres npm run dev
```
