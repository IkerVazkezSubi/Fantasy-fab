// Secciones del menú. Para activar una nueva basta con crear su página
// y cambiar `ready` a true (y poner `href` y `hint`).
export const SECTIONS = [
  {
    key: "jugadas",
    label: "Jugadas",
    hint: "Repasa las jugadas del equipo",
    href: "/jugadas",
    ready: true,
    wide: true,
  },
  {
    key: "calendario",
    label: "Calendario",
    hint: "Entrenos y partidos",
    href: "/calendario",
    ready: true,
  },
  { key: "avisos", label: "Avisos", ready: false },
  { key: "defensa", label: "Conceptos defensivos", ready: false, wide: true },
];
