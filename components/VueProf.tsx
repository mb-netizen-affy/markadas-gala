"use client";

import { useEffect, useState } from "react";
import { supabase, trierCours, appliquerSaison, grouperParEcole } from "@/lib/supabase";
import Entete, { Etat } from "@/components/Entete";
import Icone from "@/components/Icone";

type CoursProf = {
  id: string; jour: string; nom: string; horaire: string; lieu: string;
  danseurs: { nom: string; prenom: string }[];
};
type Donnees = { prof: string; titre: string; saison?: string; cours: CoursProf[] } | null;

// Vue d'un prof : ses cours et les danseurs inscrits (noms et prénoms uniquement)
export default function VueProf({ code }: { code: string }) {
  const [donnees, setDonnees] = useState<Donnees | undefined>(undefined);

  useEffect(() => {
    supabase.rpc("gala_liste_prof", { p_code: code }).then(({ data }) => {
      const d = (data as Donnees) ?? null;
      appliquerSaison(d?.saison);
      setDonnees(d);
    });
  }, [code]);

  if (donnees === undefined) return <Etat texte="Chargement…" />;
  if (!donnees) return <Etat texte="Lien invalide ou expiré." erreur />;

  const cours = trierCours(donnees.cours.map((c) => ({ ...c, ordre: 0 })));
  const total = cours.reduce((a, c) => a + c.danseurs.length, 0);

  return (
    <main className="min-h-screen">
      <Entete
        titre={donnees.titre}
        sousTitre={`${donnees.prof} · ${cours.length} cours · ${total} inscription${total > 1 ? "s" : ""}`}
        droite={
          <button onClick={() => window.print()} className="mk-btn mk-btn-contour shrink-0 px-3 py-1.5 text-xs print:hidden">
            <Icone nom="imprimer" /> Imprimer
          </button>
        }
      />
      <div className="mx-auto max-w-5xl space-y-6 p-3">
        {grouperParEcole(cours).map((g) => (
          <div key={g.lieu} className="space-y-3">
            <h2 className="flex items-baseline gap-3 border-b-2 border-mk-rouge pb-1 break-after-avoid">
              <span className="mk-titre text-2xl">{g.lieu === "Commun" ? "Commun aux 2 écoles" : g.lieu}</span>
              <span className="text-sm text-mk-gris">
                {g.cours.length} cours · {g.cours.reduce((a, c) => a + c.danseurs.length, 0)} inscription(s)
              </span>
            </h2>
        {g.cours.map((c) => (
          <section key={c.id} className="mk-carte space-y-2 break-inside-avoid">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="mk-titre text-lg">
                <span className="text-mk-gris">{c.jour}</span> · {c.nom}
              </h2>
              <span className="text-sm font-bold text-mk-gris">
                {c.horaire && `${c.horaire} · `}{c.danseurs.length} inscrit{c.danseurs.length > 1 ? "s" : ""}
              </span>
            </div>
            <ol className="grid gap-x-6 gap-y-0.5 pl-6 text-sm sm:grid-cols-2 lg:grid-cols-3">
              {c.danseurs.map((d, n) => (
                <li key={n} className="list-decimal">
                  <b className="uppercase">{d.nom}</b> {d.prenom}
                </li>
              ))}
            </ol>
            {!c.danseurs.length && <p className="text-sm text-mk-gris">Aucun inscrit pour l&apos;instant.</p>}
          </section>
        ))}
          </div>
        ))}
        {!cours.length && <p className="mk-carte text-center text-mk-gris">Aucun cours ne t&apos;est encore attribué.</p>}
      </div>
    </main>
  );
}