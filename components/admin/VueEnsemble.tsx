"use client";

import { useMemo, useState } from "react";
import {
  CENTRES, COMMUN, JOURS, cleOrdre, galasDuCours, inscriptionsDuCentre, nbGalasDe, coursDuCentre, minutes,
  type Cours, type Inscription, type Prof, type Reglages,
} from "@/lib/supabase";
import { conflits, danseursParCours, estTeamShow, type OrdrePassage } from "@/lib/ordre";
import { normaliser } from "@/lib/texte";
import Icone from "@/components/Icone";

// « Vue d'ensemble » : les deux écoles sur une seule page (chiffres clés, galas, profs, cours).
// Lecture seule : les modifications se font dans les onglets de chaque école.
export default function VueEnsemble({
  reglages, cours, profs, inscriptions, onAller,
}: {
  reglages: Reglages;
  cours: Cours[];
  profs: Prof[];
  inscriptions: Inscription[];
  onAller: (slug: string, onglet: "ordre" | "cours" | "inscriptions" | "profs") => void;
}) {
  const danseurs = useMemo(() => danseursParCours(inscriptions), [inscriptions]);
  const nbDanseurs = (id: string) => danseurs.get(id)?.size ?? 0;
  const nomProf = (id: string | null) => profs.find((p) => p.id === id)?.nom ?? "";
  const [recherche, setRecherche] = useState("");

  // ── Par école : inscrits, cours, galas ──
  const ecoles = CENTRES.map((centre) => {
    const coursC = coursDuCentre(cours, centre);
    const inscrits = inscriptionsDuCentre(inscriptions, cours, centre);
    const nb = nbGalasDe(reglages, centre.slug);
    const galas = Array.from({ length: nb }, (_, i) => {
      const g = i + 1;
      const o = reglages.ordre_passage?.[cleOrdre(centre.slug, g)] as OrdrePassage | undefined;
      const ts = o?.teamShow ?? coursC.find(estTeamShow)?.id ?? null;
      const danses = nb === 1 ? coursC.filter((c) => c.id !== ts) : coursC.filter((c) => c.id !== ts && galasDuCours(c, nb).includes(g));
      // Danseurs différents dans ce gala
      const personnes = new Set<string>();
      for (const c of [...danses, ...(ts ? coursC.filter((c) => c.id === ts) : [])])
        for (const cle of danseurs.get(c.id)?.keys() ?? []) personnes.add(cle);
      const liste = (o?.liste ?? []).filter((l) => l.t !== "danse" || coursC.some((c) => c.id === l.id));
      const passages = liste.filter((l) => l.t !== "entracte").length;
      const nbConflits = liste.length ? conflits(liste, danseurs, o?.ecart ?? 2).length : 0;
      return { g, danses: danses.length, personnes: personnes.size, passages, nbConflits, genere: liste.length > 0 };
    });
    const sansGala = nb > 1 ? coursC.filter((c) => !estTeamShow(c) && !galasDuCours(c, nb).length).length : 0;
    return { centre, coursC, inscrits, nb, galas, sansGala };
  });

  const total = inscriptions.length;
  const totalDanses = inscriptions.reduce((n, i) => n + i.cours.length, 0);

  // ── Profs : leurs cours dans chaque école ──
  const lignesProfs = profs
    .map((p) => {
      const ses = cours.filter((c) => c.prof_id === p.id);
      return {
        p,
        bron: ses.filter((c) => c.lieu === "Bron"),
        sp: ses.filter((c) => c.lieu === "Saint-Priest"),
        commun: ses.filter((c) => c.lieu === COMMUN),
        eleves: new Set(ses.flatMap((c) => [...(danseurs.get(c.id)?.keys() ?? [])])).size,
      };
    })
    .sort((a, b) => a.p.nom.localeCompare(b.p.nom));
  const coursSansProf = cours.filter((c) => !c.prof_id).length;

  // ── Tous les cours ──
  const q = normaliser(recherche);
  const tousLesCours = cours
    .filter((c) => !q || normaliser(`${c.nom}${c.lieu}${c.jour}${nomProf(c.prof_id)}`).includes(q))
    .sort(
      (a, b) =>
        a.lieu.localeCompare(b.lieu) ||
        JOURS.indexOf(a.jour) - JOURS.indexOf(b.jour) ||
        minutes(a.horaire) - minutes(b.horaire) ||
        a.nom.localeCompare(b.nom)
    );

  const Chiffre = ({ valeur, label, detail }: { valeur: number | string; label: string; detail?: string }) => (
    <div className="mk-carte">
      <p className="text-3xl font-extrabold tabular-nums">{valeur}</p>
      <p className="text-xs font-bold uppercase tracking-wider text-mk-gris">{label}</p>
      {detail && <p className="mt-1 text-xs text-mk-gris">{detail}</p>}
    </div>
  );

  return (
    <section className="space-y-6">
      {/* Chiffres clés */}
      <div className="grid grid-cols-5 gap-4">
        <Chiffre valeur={total} label="Danseurs inscrits" detail={ecoles.map((e) => `${e.centre.nom} ${e.inscrits.length}`).join(" · ")} />
        <Chiffre valeur={totalDanses} label="Participations" detail={total ? `${(totalDanses / total).toFixed(1)} danses par danseur en moyenne` : undefined} />
        <Chiffre valeur={cours.length} label="Cours" detail={ecoles.map((e) => `${e.centre.nom} ${e.coursC.filter((c) => c.lieu !== COMMUN).length}`).join(" · ") + ` · Commun ${cours.filter((c) => c.lieu === COMMUN).length}`} />
        <Chiffre valeur={ecoles.reduce((n, e) => n + e.nb, 0)} label="Galas" detail={ecoles.map((e) => `${e.centre.nom} ${e.nb}`).join(" · ")} />
        <Chiffre valeur={profs.length} label="Profs" detail={coursSansProf ? `${coursSansProf} cours sans prof` : "tous les cours ont un prof"} />
      </div>

      {/* Les galas des deux écoles */}
      <div className="grid grid-cols-2 items-start gap-4">
        {ecoles.map((e) => (
          <div key={e.centre.slug} className="mk-carte space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="mk-titre text-xl">Galas · {e.centre.nom}</h2>
              <button onClick={() => onAller(e.centre.slug, "ordre")} className="text-xs text-mk-gris hover:text-mk-texte hover:underline">
                Ouvrir l&apos;ordre de passage →
              </button>
            </div>
            {e.sansGala > 0 && (
              <p className="flex items-center gap-2 text-sm font-bold text-amber-300">
                <Icone nom="alerte" /> {e.sansGala} cours sans gala
              </p>
            )}
            <div className="grid grid-cols-2 gap-3">
              {e.galas.map((g) => (
                <div key={g.g} className="rounded-md border border-mk-ligne bg-mk-carte2/50 p-3">
                  <p className="text-sm font-extrabold uppercase tracking-wider">{e.nb > 1 ? `Gala ${g.g}` : "Gala"}</p>
                  <dl className="mt-2 grid grid-cols-2 gap-y-1 text-sm">
                    <dt className="text-mk-gris">Danses</dt>
                    <dd className="text-right font-bold tabular-nums">{g.danses}</dd>
                    <dt className="text-mk-gris">Danseurs</dt>
                    <dd className="text-right font-bold tabular-nums">{g.personnes}</dd>
                    <dt className="text-mk-gris">Ordre</dt>
                    <dd className="text-right font-bold">{g.genere ? `${g.passages} passages` : <span className="text-mk-gris">à générer</span>}</dd>
                  </dl>
                  {g.genere && (
                    <p className={`mt-2 flex items-center gap-1.5 text-xs font-bold ${g.nbConflits ? "text-amber-300" : "text-ok"}`}>
                      <Icone nom={g.nbConflits ? "alerte" : "ok"} className="h-3.5 w-3.5" />
                      {g.nbConflits ? `${g.nbConflits} conflit${g.nbConflits > 1 ? "s" : ""}` : "Aucun conflit"}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Tous les profs */}
      <div className="space-y-2">
        <h2 className="mk-titre text-xl">Tous les profs</h2>
        <div className="mk-tableau">
          <table className="w-full text-sm">
            <thead className="text-left text-[11px] uppercase tracking-wider text-mk-gris">
              <tr>
                <th className="w-48 px-4 py-2.5">Prof</th>
                <th className="px-4 py-2.5">Bron</th>
                <th className="px-4 py-2.5">Saint-Priest</th>
                <th className="w-40 px-4 py-2.5">Commun</th>
                <th className="w-24 px-4 py-2.5 text-center">Élèves</th>
              </tr>
            </thead>
            <tbody>
              {lignesProfs.map(({ p, bron, sp, commun, eleves }) => (
                <tr key={p.id} className="border-t border-mk-ligne/60 align-top">
                  <td className="px-4 py-2.5 font-extrabold">{p.nom}</td>
                  {[bron, sp, commun].map((liste, i) => (
                    <td key={i} className="px-4 py-2.5">
                      {liste.length ? (
                        <ul className="space-y-0.5">
                          {liste.map((c) => (
                            <li key={c.id}>
                              {c.nom} <span className="text-xs text-mk-gris">{c.jour !== "Autres" && c.jour} {c.horaire}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-mk-gris">—</span>
                      )}
                    </td>
                  ))}
                  <td className="px-4 py-2.5 text-center font-bold tabular-nums">{eleves}</td>
                </tr>
              ))}
              {!lignesProfs.length && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-mk-gris">Aucun prof pour l&apos;instant.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tous les cours */}
      <div className="space-y-2">
        <div className="flex items-end justify-between gap-3">
          <h2 className="mk-titre text-xl">Tous les cours</h2>
          <label className="relative w-80">
            <Icone nom="recherche" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mk-gris" />
            <input
              type="search"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher un cours, une école, un prof…"
              className="mk-input py-1.5 pl-9 text-sm"
            />
          </label>
        </div>
        <div className="mk-tableau">
          <table className="w-full text-sm">
            <thead className="text-left text-[11px] uppercase tracking-wider text-mk-gris">
              <tr>
                <th className="w-32 px-4 py-2.5">École</th>
                <th className="w-28 px-4 py-2.5">Jour</th>
                <th className="w-20 px-4 py-2.5">Heure</th>
                <th className="px-4 py-2.5">Cours</th>
                <th className="w-44 px-4 py-2.5">Prof</th>
                <th className="w-32 px-4 py-2.5">Gala(s)</th>
                <th className="w-24 px-4 py-2.5 text-center">Danseurs</th>
              </tr>
            </thead>
            <tbody>
              {tousLesCours.map((c) => {
                const ecole = CENTRES.find((x) => x.nom === c.lieu);
                const nb = ecole ? nbGalasDe(reglages, ecole.slug) : 1;
                const galas = estTeamShow(c) ? "Tous" : nb === 1 ? "—" : galasDuCours(c, nb).join(", ") || "aucun";
                return (
                  <tr key={c.id} className="border-t border-mk-ligne/60">
                    <td className="px-4 py-2 text-mk-gris">{c.lieu || "—"}</td>
                    <td className="px-4 py-2 text-mk-gris">{c.jour}</td>
                    <td className="px-4 py-2 tabular-nums text-mk-gris">{c.horaire}</td>
                    <td className="px-4 py-2 font-semibold">{c.nom}</td>
                    <td className="px-4 py-2">{nomProf(c.prof_id) || <span className="text-mk-gris">—</span>}</td>
                    <td className={`px-4 py-2 ${galas === "aucun" ? "font-bold text-amber-300" : "text-mk-gris"}`}>{galas}</td>
                    <td className="px-4 py-2 text-center font-bold tabular-nums">{nbDanseurs(c.id)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}