import { Oswald, Karla } from "next/font/google";
import "./globals.css";
import NavBar from "../components/NavBar";

const display = Oswald({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
});

const body = Karla({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-body",
});

export const metadata = {
  title: "Fantasy FAB Huelva",
  description:
    "Fantasy no oficial de la Liga Nacional N1 Masculina, Grupo A (FAB).",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={`${display.variable} ${body.variable}`}>
      <body>
        <NavBar />
        <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
        <footer className="max-w-5xl mx-auto px-4 py-8 text-xs text-ink/60 border-t border-line mt-12">
          Proyecto de aficionados, sin relación oficial con la FAB ni la FEB.
          Los datos de partidos se introducen manualmente a partir de las actas
          y pueden contener errores.
        </footer>
      </body>
    </html>
  );
}
