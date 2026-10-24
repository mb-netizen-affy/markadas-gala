"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase, cleOrdre, galasDuCours, type Centre, type Cours, type Inscription, type Reglages } from "@/lib/supabase";
import {
  ECART_DEFAUT, ajouterALaFin, conflits, danseursParCours, deplacerVers, estTeamShow, generer, reinsererLibres,
  type Ligne, type OrdrePassage as Ordre,
} from "@/lib/ordre";
import Icone from "@/components/Icone";
import { exporterDeroule, imprimerDeroule, type Partie } from "@/lib/deroule";

const n2 = (n: number) => String(n).padStart(2, "0");

// Onglet « Ordre » : déroulé d'UN gala d'un centre (Partie I / Partie II, n° + ballet),
// généré automatiquement puis ajustable à la main.
// Enregistré dans gala_reglages.ordre_passage["bron"], ["bron-2"], ["saint-priest-3"]…
export default function OrdrePassage({
  centre, gala, nbGalas, reglages, cours: coursCentre, inscriptions, titre,
}: {
  centre: Centre;
  gala: number; // 1, 2, 3 ou 4
  nbGalas: number;
  reglages: Reglages;
  cours: Cours[]; // les cours du centre (+ communs)
  inscriptions: Inscription[]; // toutes (une Team Show commune réunit les 2 écoles)
  titre: string;
}) {
  const cle = cleOrdre(centre.slug, gala);
  const candidatsTS = coursCentre.filter(estTeamShow);
  const depart = (o: Ordre | undefined | null): Ordre => ({
    ecart: o?.ecart ?? ECART_DEFAUT,
    teamShow: o?.teamShow ?? candidatsTS[0]?.id ?? null,
    liste: o?.liste ?? [],
  });
  const [ordre, setOrdre] = useState<Ordre>(() => depart(reglages.ordre_passage?.[cle]));
  const [etat, setEtat] = useState("");

  // On relit l'ordre enregistré (il a pu changer depuis le chargement de la page)
  useEffect(() => {
    supabase.from("gala_reglages").select("ordre_passage").eq("id", 1).maybeSingle().then(({ data }) => {
      const o = (data?.ordre_passage as Record<string, Ordre> | null)?.[cle];
      if (o) setOrdre(depart(o));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cle]);

  // Les danses de CE gala : la Team Show passe dans tous, les autres selon leur(s) gala(s)
  const coursDuGala = (ts: string | null) =>
    nbGalas === 1 ? coursCentre : coursCentre.filter((c) => c.id === ts || galasDuCours(c, nbGalas).includes(gala));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const cours = useMemo(() => coursDuGala(ordre.teamShow), [coursCentre, nbGalas, gala, ordre.teamShow]);
  const coursParId = useMemo(() => new Map(cours.map((c) => [c.id, c])), [cours]);
  const danseurs = useMemo(() => danseursParCours(inscriptions), [inscriptions]);

  // On ignore les danses supprimées depuis
  const liste = ordre.liste.filter((l) => l.t !== "danse" || coursParId.has(l.id));
  const [glisse, setGlisse] = useState<number | null>(null); // ligne en train d'être déplacée
  const [survol, setSurvol] = useState<number | null>(null); // ligne survolée pendant le déplacement
  const presents = new Set(liste.flatMap((l) => (l.t === "danse" ? [l.id] : [])));
  const manquants = cours.filter((c) => c.id !== ordre.teamShow && !presents.has(c.id));
  const listeConflits = conflits(liste, danseurs, ordre.ecart);

  // On relit les ordres des autres galas juste avant d'enregistrer, pour ne pas les écraser
  async function sauver(o: Ordre) {
    setOrdre(o);
    setEtat("Enregistrement…");
    const { data } = await supabase.from("gala_reglages").select("ordre_passage").eq("id", 1).maybeSingle();
    const tous = { ...((data?.ordre_passage as Record<string, Ordre> | null) ?? {}), [cle]: o };
    const { error } = await supabase.from("gala_reglages").update({ ordre_passage: tous }).eq("id", 1);
    setEtat(error ? "Erreur : " + error.message : "Enregistré ✓");
    if (!error) setTimeout(() => setEtat(""), 1500);
  }

  function lancerGeneration() {
    if (liste.length && !confirm("Remplacer l'ordre actuel par un nouvel ordre généré automatiquement ?")) return;
    sauver({ ...ordre, liste: reinsererLibres(generer(cours, danseurs, ordre.ecart, ordre.teamShow), liste) });
  }

  // Numéro hors cours : chanteuse, solo, présentation des profs…
  function ajouterLibre() {
    const nom = prompt("Nom du numéro (ex. Chanteuse, Solo Nathan, Présentation des profs) :")?.trim();
    if (!nom) return;
    const libre: Ligne = { t: "libre", id: `libre-${Date.now()}`, nom };
    const dernier = liste[liste.length - 1];
    const l = dernier && dernier.t === "danse" && dernier.id === ordre.teamShow ? [...liste.slice(0, -1), libre, dernier] : [...liste, libre];
    sauver({ ...ordre, liste: l });
  }
  function renommerLibre(idx: number) {
    const l = liste[idx];
    if (l.t !== "libre") return;
    const nom = prompt("Nouveau nom :", l.nom)?.trim();
    if (!nom) return;
    sauver({ ...ordre, liste: liste.map((x, i) => (i === idx ? { ...l, nom } : x)) });
  }
  function supprimerLibre(idx: number) {
    if (!confirm("Retirer ce numéro du déroulé ?")) return;
    sauver({ ...ordre, liste: liste.filter((_, i) => i !== idx) });
  }

  // ▲ / ▼ : échange avec la danse précédente / suivante (la Team Show et l'entracte restent fixes)
  const fixe = (l: Ligne) => l.t === "entracte" || (l.t === "danse" && l.id === ordre.teamShow);
  function deposer(vers: number) {
    if (glisse !== null && glisse !== vers) sauver({ ...ordre, liste: deplacerVers(liste, glisse, vers, fixe) });
    setGlisse(null);
    setSurvol(null);
  }
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
  for (const l of liste) numeros.push(l.t !== "entracte" ? ++n : null);
  const nomLigne = (l: Ligne) => (l.t === "libre" ? l.nom : l.t === "danse" ? coursParId.get(l.id)!.nom : "");
  const idxEntracte = liste.findIndex((l) => l.t === "entracte");
  const indices = liste.map((_, i) => i);
  const parties: number[][] =
    idxEntracte === -1 ? [indices] : [indices.slice(0, idxEntracte), indices.slice(idxEntracte + 1)];

  // Rôle des passages de la Team Show
  function roleTeamShow(idx: number) {
    if (idx === 0) return "Intro";
    if (idx === idxEntracte - 1) return "Fin 1re partie";
    if (idx === liste.length - 1) return "Final";
    return "Team Show";
  }

  const conflitsDe = (idx: number) =>
    listeConflits.flatMap((c) => (c.a === idx ? [{ autre: c.b, d: c.danseurs }] : c.b === idx ? [{ autre: c.a, d: c.danseurs }] : []));

  // Pour l'export et l'impression : uniquement n° + ballet
  const pourExport: Partie[] = parties.map((p) =>
    p.map((idx) => ({ numero: numeros[idx]!, ballet: nomLigne(liste[idx]) }))
  );
  const nomGala = nbGalas > 1 ? ` - Gala ${gala}` : "";
  const nomFichier = `${titre} - ${centre.nom}${nomGala}`;

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
                sauver({ ...ordre, teamShow: ts, liste: liste.length ? generer(coursDuGala(ts), danseurs, ordre.ecart, ts) : [] });
              }}
              className="mk-input w-auto"
            >
              <option value="">— Aucune —</option>
              {coursCentre.map((c) => (
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
            <Icone nom="magie" /> {liste.length ? "Régénérer" : "Générer"} l&apos;ordre
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
            <p className={`flex items-center gap-2 font-extrabold ${listeConflits.length ? "text-amber-300" : "text-ok"}`}>
              <Icone nom={listeConflits.length ? "alerte" : "ok"} className="h-5 w-5" />
              {listeConflits.length
                ? `${listeConflits.length} conflit${listeConflits.length > 1 ? "s" : ""} : des danseurs n'ont pas assez de temps entre deux passages`
                : "Aucun conflit : chaque danseur a le temps de se changer"}
            </p>
            <p className="text-sm text-mk-gris">{n} passages · {centre.nom}{nbGalas > 1 && ` · Gala ${gala}`}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={ajouterLibre} className="mk-btn mk-btn-sombre gap-1.5 border border-mk-ligne text-xs">
              <Icone nom="plus" /> Numéro hors cours
            </button>
            <button onClick={() => imprimerDeroule(pourExport, nomFichier)} className="mk-btn mk-btn-sombre gap-1.5 border border-mk-ligne text-xs">
              <Icone nom="imprimer" /> Imprimer
            </button>
            <button onClick={() => exporterDeroule(pourExport, nomFichier)} className="mk-btn mk-btn-rouge gap-1.5 text-xs">
              <Icone nom="telecharger" /> Export Excel
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
          {cours.length
            ? "Clique sur « Générer l'ordre » pour obtenir un premier déroulé."
            : nbGalas > 1
              ? `Aucun cours n'est encore placé dans le gala ${gala} : choisis les galas des cours dans l'onglet Cours.`
              : "Ajoute d'abord les cours dans l'onglet Cours."}
        </p>
      ) : (
        <>
        <p className="text-xs text-mk-gris">Astuce : attrape une ligne pour la glisser à sa nouvelle place (la Team Show et l&apos;entracte restent fixes).</p>
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
                  const l = liste[idx];
                  const ts = l.t === "danse" && l.id === ordre.teamShow;
                  const libre = l.t === "libre";
                  const alertes = conflitsDe(idx);
                  const cible = survol === idx && glisse !== null && glisse !== idx && !ts;
                  return (
                    <tr
                      key={`${l.t === "entracte" ? "e" : l.id}-${idx}`}
                      draggable={!ts}
                      onDragStart={(e) => {
                        setGlisse(idx);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onDragEnd={() => {
                        setGlisse(null);
                        setSurvol(null);
                      }}
                      onDragOver={(e) => {
                        if (ts || glisse === null) return;
                        e.preventDefault();
                        setSurvol(idx);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        deposer(idx);
                      }}
                      className={`border-b border-mk-ligne/60 transition last:border-0 even:bg-mk-carte2/30 ${
                        alertes.length ? "bg-amber-500/10" : ""
                      } ${glisse === idx ? "opacity-40" : ""} ${cible ? "outline outline-2 -outline-offset-2 outline-mk-rouge" : ""} ${
                        ts ? "" : "cursor-grab active:cursor-grabbing"
                      }`}
                    >
                      <td className="border-r border-mk-ligne px-2 py-1.5 text-center font-extrabold tabular-nums">{n2(numeros[idx]!)}</td>
                      <td className="px-3 py-1.5">
                        <span className="flex items-center gap-2">
                          {!ts && <Icone nom="poignee" className="h-4 w-4 text-mk-gris/60" />}
                          <span className={ts ? "font-extrabold" : libre ? "font-semibold italic" : "font-semibold"}>{nomLigne(l)}</span>
                          {ts && (
                            <span className="rounded bg-mk-rouge px-1.5 py-0.5 text-[10px] font-extrabold uppercase text-mk-noir">
                              {roleTeamShow(idx)}
                            </span>
                          )}
                          {libre && (
                            <span className="rounded border border-mk-ligne px-1.5 py-0.5 text-[10px] font-bold uppercase text-mk-gris">
                              Hors cours
                            </span>
                          )}
                        </span>
                        {alertes.map((a) => (
                          <span key={a.autre} className="ml-6 flex items-center gap-1 text-xs text-amber-300" title={a.d.join(", ")}>
                            <Icone nom="alerte" className="h-3.5 w-3.5" />
                            {a.d.length} en commun avec le n°{n2(numeros[a.autre]!)} : {a.d.slice(0, 3).join(", ")}
                            {a.d.length > 3 && ` +${a.d.length - 3}`}
                          </span>
                        ))}
                      </td>
                      <td className="px-2 py-1">
                        {libre ? (
                          <div className="flex justify-end gap-1">
                            <button onClick={() => renommerLibre(idx)} className="rounded p-1.5 text-mk-gris hover:bg-mk-carte2 hover:text-mk-texte" title="Renommer">
                              <Icone nom="crayon" />
                            </button>
                            <button onClick={() => supprimerLibre(idx)} className="rounded p-1.5 text-mk-gris hover:bg-red-500/20 hover:text-red-300" title="Retirer">
                              <Icone nom="croix" />
                            </button>
                          </div>
                        ) : (
                          !ts && (
                            <div className="flex justify-end gap-1">
                              <button onClick={() => deplacer(idx, -1)} className="rounded p-1 text-xs text-mk-gris hover:bg-mk-carte2 hover:text-mk-texte" title="Monter">▲</button>
                              <button onClick={() => deplacer(idx, 1)} className="rounded p-1 text-xs text-mk-gris hover:bg-mk-carte2 hover:text-mk-texte" title="Descendre">▼</button>
                            </div>
                          )
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
        </>
      )}
    </section>
  );
}