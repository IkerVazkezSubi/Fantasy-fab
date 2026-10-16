import "@fontsource/barlow-condensed/latin-600.css";
import "@fontsource/barlow-condensed/latin-700.css";
import "@fontsource/barlow-condensed/latin-800.css";
import "@fontsource/barlow/latin-400.css";
import "@fontsource/barlow/latin-500.css";
import "./globals.css";

export const metadata = {
  title: "Pizarra",
  description: "Zona privada del equipo.",
  robots: { index: false, follow: false, nocache: true },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1B3A9E",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
