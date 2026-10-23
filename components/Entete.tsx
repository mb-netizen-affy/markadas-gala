"use client";

import LogoMarkadas from "@/components/LogoMarkadas";

// En-tête commun (admin, pages profs). Le « M » prend la couleur de la saison.
export default function Entete({
  titre,
  sousTitre,
  droite,
  children,
}: {
  titre: string;
  sousTitre?: string;
  droite?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-mk-ligne bg-mk-noir/95 backdrop-blur">
      <div className="mx-auto max-w-5xl space-y-3 p-4">
        <div className="flex items-center gap-3">
          <LogoMarkadas className="h-10 w-10 shrink-0 text-mk-rouge" />
          <div className="min-w-0 flex-1 border-l border-mk-ligne pl-3">
            <h1 className="mk-titre line-clamp-2 break-words text-lg leading-tight sm:text-2xl">{titre}</h1>
            {sousTitre && <p className="text-xs font-semibold uppercase tracking-wider text-mk-gris">{sousTitre}</p>}
          </div>
          {droite}
        </div>
        {children}
      </div>
    </header>
  );
}

export function Etat({ texte, erreur = false }: { texte: string; erreur?: boolean }) {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <p className={`text-center font-semibold ${erreur ? "text-red-300" : "text-mk-gris"}`}>{texte}</p>
    </div>
  );
}