"use client";

import { useState } from "react";
import Icone from "@/components/Icone";

// Agenda pour choisir la date limite.
// valeur = "AAAA-MM-JJTHH:MM" (heure locale) ou "" pour aucune date.
const MOIS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const JOURS_COURTS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const HEURES = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 15, 30, 45, 59];

const p2 = (n: number) => String(n).padStart(2, "0");
const versTexte = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}T${p2(d.getHours())}:${p2(d.getMinutes())}`;
const memeJour = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export default function ChoixDate({ valeur, onChange }: { valeur: string; onChange: (v: string) => void }) {
  const choisie = valeur ? new Date(valeur) : null;
  const [ouvert, setOuvert] = useState(false);
  const [vue, setVue] = useState(() => {
    const d = choisie ?? new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const aujourdhui = new Date();
  aujourdhui.setHours(0, 0, 0, 0);

  // Cases du mois : on commence la semaine le lundi
  const decalage = (vue.getDay() + 6) % 7;
  const nbJours = new Date(vue.getFullYear(), vue.getMonth() + 1, 0).getDate();
  const cases: (Date | null)[] = [
    ...Array(decalage).fill(null),
    ...Array.from({ length: nbJours }, (_, i) => new Date(vue.getFullYear(), vue.getMonth(), i + 1)),
  ];

  function choisirJour(j: Date) {
    const d = new Date(j);
    // on garde l'heure déjà choisie, sinon fin de journée
    if (choisie) d.setHours(choisie.getHours(), choisie.getMinutes());
    else d.setHours(23, 59);
    onChange(versTexte(d));
  }

  function choisirHeure(h: number, m: number) {
    if (!choisie) return;
    const d = new Date(choisie);
    d.setHours(h, m);
    onChange(versTexte(d));
  }

  const changerMois = (n: number) => setVue(new Date(vue.getFullYear(), vue.getMonth() + n, 1));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setOuvert(!ouvert)}
          className={`flex min-w-0 flex-1 items-center gap-3 rounded-md border bg-mk-noir px-3 py-2.5 text-left ${
            ouvert ? "border-mk-rouge" : "border-mk-ligne hover:border-mk-gris"
          }`}
        >
          <Icone nom="calendrier" className="h-5 w-5 text-mk-gris" />
          <span className="min-w-0 flex-1">
            {choisie ? (
              <>
                <span className="block font-bold capitalize">
                  {choisie.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                </span>
                <span className="block text-sm text-mk-gris">à {p2(choisie.getHours())}h{p2(choisie.getMinutes())}</span>
              </>
            ) : (
              <span className="text-mk-gris">Aucune date limite — clique pour en choisir une</span>
            )}
          </span>
          <span className="text-mk-gris">{ouvert ? "▴" : "▾"}</span>
        </button>
        {choisie && (
          <button type="button" onClick={() => onChange("")} className="mk-btn mk-btn-sombre shrink-0 text-xs">
            Effacer
          </button>
        )}
      </div>

      {ouvert && (
        <div className="max-w-sm space-y-3 rounded-lg border border-mk-ligne bg-mk-noir p-3">
          {/* Mois */}
          <div className="flex items-center justify-between">
            <button type="button" onClick={() => changerMois(-1)} className="mk-btn mk-btn-sombre h-9 w-9 p-0 text-lg">‹</button>
            <p className="mk-titre">{MOIS[vue.getMonth()]} {vue.getFullYear()}</p>
            <button type="button" onClick={() => changerMois(1)} className="mk-btn mk-btn-sombre h-9 w-9 p-0 text-lg">›</button>
          </div>

          {/* Jours */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {JOURS_COURTS.map((j) => (
              <span key={j} className="pb-1 text-[11px] font-bold uppercase text-mk-gris">{j}</span>
            ))}
            {cases.map((j, i) => {
              if (!j) return <span key={i} />;
              const passe = j < aujourdhui;
              const actif = choisie && memeJour(j, choisie);
              const ajd = memeJour(j, aujourdhui);
              return (
                <button
                  type="button"
                  key={i}
                  disabled={passe}
                  onClick={() => choisirJour(j)}
                  className={`aspect-square rounded-md text-sm font-semibold transition ${
                    actif
                      ? "bg-mk-rouge font-extrabold text-mk-noir"
                      : passe
                        ? "text-mk-ligne"
                        : `bg-mk-carte2 hover:bg-mk-ligne ${ajd ? "ring-1 ring-mk-rouge" : ""}`
                  }`}
                >
                  {j.getDate()}
                </button>
              );
            })}
          </div>

          {/* Heure */}
          <div className={`flex flex-wrap items-center gap-2 border-t border-mk-ligne pt-3 ${choisie ? "" : "opacity-40"}`}>
            <span className="text-xs font-bold uppercase text-mk-gris">Heure</span>
            <select
              disabled={!choisie}
              value={choisie?.getHours() ?? 23}
              onChange={(e) => choisirHeure(+e.target.value, choisie!.getMinutes())}
              className="mk-input w-auto py-1.5"
            >
              {HEURES.map((h) => <option key={h} value={h}>{p2(h)}h</option>)}
            </select>
            <select
              disabled={!choisie}
              value={choisie?.getMinutes() ?? 59}
              onChange={(e) => choisirHeure(choisie!.getHours(), +e.target.value)}
              className="mk-input w-auto py-1.5"
            >
              {(choisie && !MINUTES.includes(choisie.getMinutes()) ? [choisie.getMinutes(), ...MINUTES] : MINUTES).map((m) => (
                <option key={m} value={m}>{p2(m)}</option>
              ))}
            </select>
            <button type="button" disabled={!choisie} onClick={() => choisirHeure(23, 59)} className="text-xs text-mk-gris underline hover:text-mk-texte">
              fin de journée
            </button>
          </div>

          <button type="button" onClick={() => setOuvert(false)} className="mk-btn mk-btn-rouge w-full py-1.5 text-xs">
            OK
          </button>
        </div>
      )}
    </div>
  );
}