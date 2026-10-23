"use client";

import { useState } from "react";
import { JOURS, type Cours, type Inscription, type Prof } from "@/lib/supabase";
import { exporterCours, exporterTout, imprimerCours } from "@/lib/export";

// Les listes par cours, à envoyer aux profs : la liste des cours à gauche,
// les danseurs du cours sélectionné à droite (Excel, impression)
export default function ParCours({
  inscriptions, inscritsCentre, cours, profs, titre,
}: {
  titre: string;
  inscriptions: Inscription[];
  inscritsCentre: Inscription[]; // les inscrits du centre affiché (feuille « Tous les inscrits »)
  cours: Cours[];
  profs: Prof[];
}) {
  const [choisi, setChoisi] = useState<string | null>(cours[0]?.id ?? null);
  const inscritsDe = (id: string) =>
    inscriptions
      .filter((i) => i.cours.includes(id))
      .sort((a, b) => a.nom.localeCompare(b.nom) || a.prenom.localeCompare(b.prenom));
  const nomProf = (c: Cours) => profs.find((p) => p.id === c.prof_id)?.nom;

  const c = cours.find((x) => x.id === choisi) ?? null;
  const inscrits = c ? inscritsDe(c.id) : [];

  if (!cours.length) return <p className="mk-carte text-center text-mk-gris">Ajoute d&apos;abord les cours dans l&apos;onglet Cours.</p>;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-mk-gris">Choisis un cours pour voir ses danseurs, l&apos;imprimer ou l&apos;exporter pour le prof.</p>
        <button onClick={() => exporterTout(inscritsCentre, cours, profs, titre, inscriptions)} className="mk-btn mk-btn-rouge">
          Export Excel complet
        </button>
      </div>

      <div className="grid grid-cols-[minmax(340px,5fr)_7fr] items-start gap-4">
        {/* Liste des cours */}
        <div className="overflow-hidden rounded-lg border border-mk-ligne bg-mk-carte">
          {JOURS.map((jour) => {
            const liste = cours.filter((x) => x.jour === jour);
            if (!liste.length) return null;
            return (
              <div key={jour}>
                <p className="bg-mk-carte2 px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-widest text-mk-rouge">
                  {jour}
                </p>
                {liste.map((x) => {
                  const nb = inscritsDe(x.id).length;
                  const actif = x.id === choisi;
                  return (
                    <button
                      key={x.id}
                      onClick={() => setChoisi(x.id)}
                      className={`flex w-full items-center gap-3 border-t border-mk-ligne/50 px-4 py-2 text-left transition ${
                        actif ? "bg-mk-rouge/15" : "hover:bg-mk-carte2/60"
                      }`}
                    >
                      <span className={`h-8 w-1 shrink-0 rounded ${actif ? "bg-mk-rouge" : "bg-transparent"}`} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold">{x.nom}</span>
                        <span className="block truncate text-xs text-mk-gris">
                          {[x.horaire, x.lieu === "Commun" ? "Commun" : null, nomProf(x)].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                      <span className={`min-w-8 rounded px-2 py-0.5 text-center text-sm font-extrabold ${nb ? "bg-mk-noir" : "bg-mk-noir/40 text-mk-gris"}`}>
                        {nb}
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Détail du cours choisi */}
        <div className="sticky top-[85px]">
          {c ? (
            <div className="mk-carte space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-mk-rouge">{c.jour}</p>
                  <h2 className="mk-titre text-2xl">{c.nom}</h2>
                  <p className="text-sm text-mk-gris">
                    {[c.horaire, c.lieu, nomProf(c) && `Prof : ${nomProf(c)}`].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button onClick={() => imprimerCours(c, inscriptions, profs, titre)} className="mk-btn mk-btn-sombre border border-mk-ligne text-xs">
                    🖨 Imprimer
                  </button>
                  <button onClick={() => exporterCours(c, inscriptions, profs)} className="mk-btn mk-btn-rouge text-xs">
                    Excel
                  </button>
                </div>
              </div>

              <p className="text-sm">
                <b className="text-2xl font-extrabold">{inscrits.length}</b> <span className="text-mk-gris">danseur{inscrits.length > 1 ? "s" : ""} inscrit{inscrits.length > 1 ? "s" : ""}</span>
              </p>

              {inscrits.length ? (
                <div className="max-h-[calc(100vh-320px)] overflow-y-auto rounded-md border border-mk-ligne">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-mk-carte2 text-left text-[11px] uppercase tracking-wider text-mk-gris">
                      <tr>
                        <th className="w-10 px-3 py-2 text-center">#</th>
                        <th className="px-3 py-2">Nom</th>
                        <th className="px-3 py-2">Prénom</th>
                        <th className="px-3 py-2">Téléphone</th>
                        <th className="px-3 py-2">Email</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inscrits.map((i, n) => (
                        <tr key={i.id} className="border-t border-mk-ligne/60">
                          <td className="px-3 py-1.5 text-center text-mk-gris">{n + 1}</td>
                          <td className="px-3 py-1.5 font-bold uppercase">{i.nom}</td>
                          <td className="px-3 py-1.5">{i.prenom}</td>
                          <td className="whitespace-nowrap px-3 py-1.5 text-mk-gris">{i.telephone}</td>
                          <td className="px-3 py-1.5 text-mk-gris">{i.email}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="rounded-md border border-dashed border-mk-ligne py-10 text-center text-mk-gris">Aucun inscrit pour l&apos;instant</p>
              )}
            </div>
          ) : (
            <p className="mk-carte text-center text-mk-gris">Choisis un cours dans la liste.</p>
          )}
        </div>
      </div>
    </section>
  );
}