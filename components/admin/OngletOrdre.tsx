"use client";

import { useState } from "react";
import { galasDuCours, type Centre, type Cours, type Inscription, type Reglages } from "@/lib/supabase";
import { estTeamShow } from "@/lib/ordre";
import NbGalas from "@/components/admin/NbGalas";
import OrdrePassage from "@/components/admin/OrdrePassage";
import Icone from "@/components/Icone";

// Onglet « Ordre de passage » d'une école : nombre de galas, choix du gala, puis son déroulé
export default function OngletOrdre({
  centre, nbGalas, reglages, cours, inscriptions, titre, onChange,
}: {
  centre: Centre;
  nbGalas: number;
  reglages: Reglages;
  cours: Cours[];
  inscriptions: Inscription[];
  titre: string;
  onChange: () => void;
}) {
  const [gala, setGala] = useState(1);
  const g = Math.min(gala, nbGalas);
  const sansGala = cours.filter((c) => !estTeamShow(c) && !galasDuCours(c, nbGalas).length).length;

  return (
    <div className="space-y-4">
      <div className="mk-carte flex flex-wrap items-center gap-x-6 gap-y-3">
        <NbGalas centre={centre} nb={nbGalas} onChange={onChange} />
        {nbGalas > 1 && (
          <div className="flex gap-1 rounded-lg bg-mk-noir p-1">
            {Array.from({ length: nbGalas }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                onClick={() => setGala(n)}
                className={`rounded-md px-4 py-1.5 text-sm font-extrabold uppercase tracking-wide transition ${
                  n === g ? "bg-mk-rouge text-mk-noir" : "text-mk-gris hover:text-mk-texte"
                }`}
              >
                Gala {n}
                <span className="ml-1.5 text-xs font-semibold opacity-70">
                  {cours.filter((c) => !estTeamShow(c) && galasDuCours(c, nbGalas).includes(n)).length}
                </span>
              </button>
            ))}
          </div>
        )}
        {nbGalas > 1 && sansGala > 0 && (
          <p className="flex items-center gap-2 text-sm font-bold text-amber-300">
            <Icone nom="alerte" /> {sansGala} cours sans gala : ils n&apos;apparaissent dans aucun déroulé (à régler dans l&apos;onglet Cours).
          </p>
        )}
      </div>

      <OrdrePassage
        key={`${centre.slug}-${g}-${nbGalas}`}
        centre={centre}
        gala={g}
        nbGalas={nbGalas}
        reglages={reglages}
        cours={cours}
        inscriptions={inscriptions}
        titre={titre}
      />
    </div>
  );
}