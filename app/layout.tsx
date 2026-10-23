import type { Metadata, Viewport } from "next";
import { Open_Sans } from "next/font/google";
import "./globals.css";

// Même police et même direction artistique que l'app de compétition
const openSans = Open_Sans({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-open-sans",
});

export const metadata: Metadata = {
  title: "Gala Markadas",
  description: "Inscriptions au gala des écoles de danse Markadas",
};

export const viewport: Viewport = {
  themeColor: "#0d131a",
};

const SCRIPT_SAISON = `try{var s=localStorage.getItem("mk-saison");if(s)document.documentElement.dataset.saison=s}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={openSans.variable} suppressHydrationWarning>
      <head>
        {/* Applique la dernière saison connue AVANT l'affichage (évite le flash de couleur) */}
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_SAISON }} />
      </head>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}