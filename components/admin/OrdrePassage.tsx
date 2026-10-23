"use client";

import { useMemo, useState } from "react";
import { supabase, type Centre, type Cours, type Inscription, type Reglages } from "@/lib/supabase";
import {
  ECART_DEFAUT, ajouterALaFin, conflits, danseursParCours, estTeamShow, generer,
  type Ligne, type OrdrePassage as Ordre,
} from "@/lib/ordre";
import { exporterDeroule, imprimerDeroule, type Partie } from "@/lib/deroule";

const n2 = (n: number) => String(n).padStart(2, "0");

// Onglet « Ordre » : déroulé du gala d'un centre (Partie I / Partie II, n° + ballet),
// généré automatiquement puis ajustable à la main. Enregistré dans gala_reglages.ordre_passage[slug du centre].
export default function OrdrePassage({
  centre, reglages, cours, inscriptions, titre,
}: {
  centre: Centre;
  reglages: Reglages;
  cours: Cours[]; // les cours du centre (+ communs)
  inscriptions: Inscription[]; // toutes (une Team Show commune réunit les 2 écoles)
  titre: string;
}) {
  const coursParId = useMemo(() => new Map(cours.map((c) => [c.id, c])), [cours]);
  const danseurs = useMemo(() => danseursParCours(inscriptions), [inscriptions]);
  const candidatsTS = cours.filter(estTeamShow);

  const [ordre, setOrdre] = useState<Ordre>(() => {
    const o = reglages.ordre_passage?.[centre.slug];
    return {
      ecart: o?.ecart ?? ECART_DEFAUT,
      teamShow: o?.teamShow ?? candidatsTS[0]?.id ?? null,
      liste: o?.liste ?? [],
    };
  });
  const [etat, setEtat] = useState("");

  // On ignore les danses supprimées depuis
  const liste = ordre.liste.filter((l) => l.t === "entracte" || coursParId.has(l.id));
  const presents = new Set(liste.flatMap((l) => (l.t === "danse" ? [l.id] : [])));
  const manquants = cours.filter((c) => c.id !== ordre.teamShow && !presents.has(c.id));
  const listeConflits = conflits(liste, danseurs, ordre.ecart);

  // On relit l'ordre de l'autre centre juste avant d'enregistrer, pour ne pas l'écraser
  async function sauver(o: Ordre) {
    setOrdre(o);
    setEtat("Enregistrement…");
    const { data } = await supabase.from("gala_reglages").select("ordre_passage").eq("id", 1).maybeSingle();
    const tous = { ...((data?.ordre_passage as Record<string, Ordre> | null) ?? {}), [centre.slug]: o };
    const { error } = await supabase.from("gala_reglages").update({ ordre_passage: tous }).eq("id", 1);
    setEtat(error ? "Erreur : " + error.message : "Enregistré ✓");
    if (!error) setTimeout(() => setEtat(""), 1500);
  }

  function lancerGeneration() {
    if (liste.length && !confirm("Remplacer l'ordre actuel par un nouvel ordre généré automatiquement ?")) return;
    sauver({ ...ordre, liste: generer(cours, danseurs, ordre.ecart, ordre.teamShow) });
  }

  // ▲ / ▼ : échange avec la danse précédente / suivante (la Team Show et l'entracte restent fixes)
  const fixe = (l: Ligne) => l.t === "entracte" || l.id === ordre.teamShow;
  function deplacer(idx: number, sens: -1 | 1) {
    let cible = idx + sens;
    while (cible >= 0 && cible < liste.length && fixe(liste[cible])) cible += sens;
    if (cible < 0 || cible >= liste.length) return;
    const l = [...liste];
    [l[idx], l[cible]] = [l[cible], l[idx]];
    sauver({ ...ordre, liste: l });
  }

  // Numéros de passage (l'entracte n'a pas de numéro) et découpage en 2 parties
  const numeros: (number | null)[] = [];
  let n = 0;
  for (const l of liste) numeros.push(l.t === "danse" ? ++n : null);
  const idxEntracte = liste.findIndex((l) => l.t === "entracte");
  const indices = liste.map((_, i) => i);
  const parties: number[][] =
    idxEntracte === -1 ? [indices] : [indices.slice(0, idxEntracte), indices.slice(idxEntracte + 1)];

  const conflitsDe = (idx: number) =>
    listeConflits.flatMap((c) => (c.a === idx ? [{ autre: c.b, d: c.danseurs }] : c.b === idx ? [{ autre: c.a, d: c.danseurs }] : []));

  // Pour l'export et l'impression : uniquement n° + ballet
  const pourExport: Partie[] = parties.map((p) =>
    p.map((idx) => ({ numero: numeros[idx]!, ballet: coursParId.get((liste[idx] as { id: string }).id)!.nom }))
  );
  const nomFichier = `${titre} - ${centre.nom}`;

  return (
    <section className="space-y-3">
      {/* Réglages de la génération */}
      <div className="mk-carte space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <label className="space-y-1">
            <span className="block text-xs font-bold uppercase text-mk-gris">Team Show (intro, avant l&apos;entracte, final)</span>
            <select
              value={ordre.teamShow ?? ""}
              onChange={(e) => {
                const ts = e.target.value || null;
                // la Team Show change → on refait l'ordre
                sauver({ ...ordre, teamShow: ts, liste: liste.length ? generer(cours, danseurs, ordre.ecart, ts) : [] });
              }}
              className="mk-input w-auto"
            >
              <option value="">— Aucune —</option>
              {cours.map((c) => (
                <option key={c.id} value={c.id}>{c.nom}{c.lieu ? ` (${c.lieu})` : ""}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="block text-xs font-bold uppercase text-mk-gris">Danses minimum entre 2 passages</span>
            <select value={ordre.ecart} onChange={(e) => sauver({ ...ordre, ecart: +e.target.value })} className="mk-input w-auto">
              {[1, 2, 3, 4].map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </label>
          <button onClick={lancerGeneration} className="mk-btn mk-btn-rouge">
            ✨ {liste.length ? "Régénérer" : "Générer"} l&apos;ordre
          </button>
          {etat && <span className="text-sm text-mk-gris">{etat}</span>}
        </div>
        {!ordre.teamShow && (
          <p className="text-sm text-amber-300">
            Aucune Team Show choisie : crée un cours « Team Show » (centre « Commun ») ou choisis-la dans la liste.
          </p>
        )}
        {candidatsTS.length > 1 && (
          <p className="text-sm text-amber-300">
            Plusieurs cours s&apos;appellent « Team Show » : vérifie que la bonne est choisie, les autres comptent comme des danses normales.
          </p>
        )}
      </div>

      {/* Bilan + export */}
      {liste.length > 0 && (
        <div
          className={`mk-carte flex flex-wrap items-center justify-between gap-3 ${
            listeConflits.length ? "border-amber-500/60" : "border-ok/60"
          }`}
        >
          <div>
            <p className={`font-extrabold ${listeConflits.length ? "text-amber-300" : "text-ok"}`}>
              {listeConflits.length
                ? `⚠️ ${listeConflits.length} conflit${listeConflits.length > 1 ? "s" : ""} : des danseurs n'ont pas assez de temps entre deux passages`
                : "✅ Aucun conflit : chaque danseur a le temps de se changer"}
            </p>
            <p className="text-sm text-mk-gris">{n} passages · {centre.nom}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => imprimerDeroule(pourExport, nomFichier)} className="mk-btn mk-btn-sombre border border-mk-ligne text-xs">
              🖨 Imprimer
            </button>
            <button onClick={() => exporterDeroule(pourExport, nomFichier)} className="mk-btn mk-btn-rouge text-xs">
              Export Excel
            </button>
          </div>
        </div>
      )}

      {manquants.length > 0 && liste.length > 0 && (
        <div className="mk-carte flex flex-wrap items-center justify-between gap-2 border-amber-500/60">
          <p className="text-sm">
            <b className="text-amber-300">{manquants.length} danse{manquants.length > 1 ? "s" : ""} pas encore dans l&apos;ordre</b>{" "}
            <span className="text-mk-gris">({manquants.map((c) => c.nom).join(", ")})</span>
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => sauver({ ...ordre, liste: ajouterALaFin(liste, manquants.map((c) => c.id), ordre.teamShow) })}
              className="mk-btn mk-btn-sombre text-xs"
            >
              Ajouter à la fin
            </button>
            <button onClick={lancerGeneration} className="mk-btn mk-btn-rouge text-xs">Régénérer</button>
          </div>
        </div>
      )}

      {/* Le déroulé : Partie I / Partie II, n° + ballet */}
      {liste.length === 0 ? (
        <p className="mk-carte text-center text-mk-gris">
          {cours.length ? "Clique sur « Générer l'ordre » pour obtenir un premier déroulé." : "Ajoute d'abord les cours dans l'onglet Cours."}
        </p>
      ) : (
        <div className="grid grid-cols-2 items-start gap-4">
        {parties.map((p, iPartie) => (
          <div key={iPartie} className="overflow-hidden rounded-lg border border-mk-ligne">
            <p className="flex items-center justify-between bg-mk-carte2 px-3 py-2 font-extrabold uppercase tracking-widest">
              <span>Partie {iPartie === 0 ? "I" : "II"}.</span>
              <span className="text-xs font-semibold normal-case tracking-normal text-mk-gris">
                {p.length} passages{iPartie === 0 && parties.length > 1 ? " · puis entracte" : ""}
              </span>
            </p>
            <table className="w-full bg-mk-carte text-sm">
              <thead>
                <tr className="border-b border-mk-ligne text-[11px] uppercase tracking-wider text-mk-gris">
                  <th className="w-14 border-r border-mk-ligne px-2 py-1.5 text-center">N°</th>
                  <th className="px-3 py-1.5 text-center">Ballet</th>
                  <th className="w-20" />
                </tr>
              </thead>
              <tbody>
                {p.map((idx) => {
                  const l = liste[idx] as { id: string };
                  const c = coursParId.get(l.id)!;
                  const ts = l.id === ordre.teamShow;
                  const alertes = conflitsDe(idx);
                  return (
                    <tr key={`${l.id}-${idx}`} className={`border-b border-mk-ligne/60 last:border-0 ${alertes.length ? "bg-amber-500/10" : ""}`}>
                      <td className="border-r border-mk-ligne px-2 py-1.5 text-center font-extrabold">{n2(numeros[idx]!)}</td>
                      <td className="px-3 py-1.5">
                        <span className={ts ? "font-extrabold text-mk-rouge" : "font-semibold"}>{c.nom}</span>
                        {alertes.map((a) => (
                          <span key={a.autre} className="block text-xs text-amber-300" title={a.d.join(", ")}>
                            ⚠️ {a.d.length} en commun avec le n°{n2(numeros[a.autre]!)} : {a.d.slice(0, 3).join(", ")}
                            {a.d.length > 3 && ` +${a.d.length - 3}`}
                          </span>
                        ))}
                      </td>
                      <td className="px-2 py-1">
                        {!ts && (
                          <div className="flex justify-end gap-1">
                            <button onClick={() => deplacer(idx, -1)} className="mk-btn mk-btn-sombre h-7 w-7 p-0 text-xs" title="Monter">▲</button>
                            <button onClick={() => deplacer(idx, 1)} className="mk-btn mk-btn-sombre h-7 w-7 p-0 text-xs" title="Descendre">▼</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
        </div>
      )}
    </section>
  );
}