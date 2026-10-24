"use client";

import { useState } from "react";
import { supabase, NB_GALAS_MAX, type Centre } from "@/lib/supabase";

// Choix du nombre de galas pour une école (1 à 4). Enregistré dans gala_reglages.nb_galas[slug].
export default function NbGalas({ centre, nb, onChange }: { centre: Centre; nb: number; onChange: () => void }) {
  const [enCours, setEnCours] = useState(false);

  async function choisir(n: number) {
    if (n === nb) return;
    setEnCours(true);
    // on relit la valeur de l'autre école pour ne pas l'écraser
    const { data } = await supabase.from("gala_reglages").select("nb_galas").eq("id", 1).maybeSingle();
    const tous = { ...((data?.nb_galas as Record<string, number> | null) ?? {}), [centre.slug]: n };
    const { error } = await supabase.from("gala_reglages").update({ nb_galas: tous }).eq("id", 1);
    setEnCours(false);
    if (error) alert("Erreur : " + error.message);
    else onChange();
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-bold text-mk-gris">Nombre de galas à {centre.nom}</span>
      <div className="flex rounded-lg bg-mk-noir p-1">
        {Array.from({ length: NB_GALAS_MAX }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            disabled={enCours}
            onClick={() => choisir(n)}
            className={`h-8 w-10 rounded-md text-sm font-extrabold transition ${
              n === nb ? "bg-mk-rouge text-mk-noir" : "text-mk-gris hover:text-mk-texte"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}