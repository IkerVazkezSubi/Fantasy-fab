import "./globals.css";

export const metadata = {
  title: "Pizarra",
  description: "Zona privada del equipo.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
