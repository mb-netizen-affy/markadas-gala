"use client";

import { useMemo, useState } from "react";
import { supabase, type Cours, type Inscription } from "@/lib/supabase";
import { normaliser } from "@/lib/texte";

// Liste complète des inscrits : recherche, doublons, suppression
export default function Inscriptions({
  inscriptions, cours, onChange,
}: {
  inscriptions: Inscription[];
  cours: Cours[];
  onChange: () => void;
}) {
  const [recherche, setRecherche] = useState("");
  const [doublonsSeuls, setDoublonsSeuls] = useState(false);
  const coursParId = useMemo(() => new Map(cours.map((c) => [c.id, c])), [cours]);

  // Même nom + prénom inscrit plusieurs fois (formulaire envoyé deux fois, correction…)
  const doublons = useMemo(() => {
    const compte = new Map<string, number>();
    for (const i of inscriptions) {
      const cle = normaliser(i.nom + i.prenom);
      compte.set(cle, (compte.get(cle) ?? 0) + 1);
    }
    return new Set([...compte].filter(([, n]) => n > 1).map(([k]) => k));
  }, [inscriptions]);

  const liste = useMemo(() => {
    const q = normaliser(recherche);
    return [...inscriptions]
      .filter((i) => !doublonsSeuls || doublons.has(normaliser(i.nom + i.prenom)))
      .filter((i) => !q || normaliser(`${i.nom}${i.prenom}${i.email}${i.telephone}`).includes(q))
      .sort((a, b) => a.nom.localeCompare(b.nom) || a.prenom.localeCompare(b.prenom) || a.created_at.localeCompare(b.created_at));
  }, [inscriptions, recherche, doublonsSeuls, doublons]);

  async function supprimer(i: Inscription) {
    if (!confirm(`Supprimer l'inscription de ${i.prenom} ${i.nom} ?`)) return;
    const { error } = await supabase.from("gala_inscriptions").delete().eq("id", i.id);
    if (error) alert("Erreur : " + error.message);
    else onChange();
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <input
          type="search"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Rechercher un nom, un email, un téléphone…"
          className="mk-input max-w-md"
        />
        {doublons.size > 0 && (
          <button
            onClick={() => setDoublonsSeuls(!doublonsSeuls)}
            className={`mk-btn text-xs ${doublonsSeuls ? "mk-btn-rouge" : "mk-btn-sombre border border-amber-500/60 text-amber-300"}`}
          >
            ⚠️ {doublons.size} doublon{doublons.size > 1 ? "s" : ""}
          </button>
        )}
        <p className="ml-auto text-sm text-mk-gris">
          <b className="text-mk-texte">{liste.length}</b> inscrit{liste.length > 1 ? "s" : ""}
          {liste.length !== inscriptions.length && ` sur ${inscriptions.length}`}
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-mk-ligne bg-mk-carte">
        <table className="w-full text-sm">
          <thead className="bg-mk-carte2 text-left text-[11px] uppercase tracking-wider text-mk-gris">
            <tr>
              <th className="px-4 py-2.5">Nom</th>
              <th className="px-4 py-2.5">Prénom</th>
              <th className="px-4 py-2.5">Email</th>
              <th className="px-4 py-2.5">Téléphone</th>
              <th className="px-4 py-2.5">Cours</th>
              <th className="px-4 py-2.5">Inscrit le</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {liste.map((i) => {
              const doublon = doublons.has(normaliser(i.nom + i.prenom));
              return (
                <tr key={i.id} className={`group border-t border-mk-ligne/60 align-top hover:bg-mk-carte2/60 ${doublon ? "bg-amber-500/10" : ""}`}>
                  <td className="whitespace-nowrap px-4 py-2.5 font-extrabold uppercase">
                    {i.nom}
                    {doublon && <span className="ml-2 text-[10px] font-bold normal-case text-amber-300">⚠️ doublon</span>}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 font-semibold">{i.prenom}</td>
                  <td className="px-4 py-2.5"><a href={`mailto:${i.email}`} className="text-mk-gris hover:text-mk-texte hover:underline">{i.email}</a></td>
                  <td className="whitespace-nowrap px-4 py-2.5"><a href={`tel:${i.telephone}`} className="text-mk-gris hover:text-mk-texte hover:underline">{i.telephone}</a></td>
                  <td className="px-4 py-2">
                    <div className="flex flex-wrap gap-1">
                      {i.cours.map((id) => {
                        const c = coursParId.get(id);
                        return (
                          <span key={id} className="rounded bg-mk-carte2 px-1.5 py-0.5 text-xs" title={c ? `${c.jour} ${c.horaire} · ${c.lieu}` : ""}>
                            {c?.nom ?? "cours supprimé"}
                          </span>
                        );
                      })}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-mk-gris">{new Date(i.created_at).toLocaleDateString("fr-FR")}</td>
                  <td className="px-2 py-2 text-right">
                    <button
                      onClick={() => supprimer(i)}
                      className="rounded px-2 py-1 text-mk-gris opacity-0 transition hover:bg-red-500/20 hover:text-red-300 group-hover:opacity-100"
                      title="Supprimer cette inscription"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              );
            })}
            {!liste.length && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-mk-gris">Aucune inscription</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}