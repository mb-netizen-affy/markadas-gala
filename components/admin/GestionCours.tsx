"use client";

import { useEffect, useState } from "react";
import { supabase, JOURS, LIEUX, type Cours, type Inscription, type Prof } from "@/lib/supabase";

const champ =
  "rounded-md border border-mk-ligne bg-mk-noir px-2 py-1.5 text-sm text-mk-texte focus:border-mk-rouge focus:outline-none";

// Crée un prof à la volée depuis la liste déroulante (« + Nouveau prof… »)
async function creerProf(): Promise<string | null> {
  const nom = prompt("Nom du professeur :")?.trim();
  if (!nom) return null;
  const { data, error } = await supabase.from("gala_profs").insert({ nom }).select().single();
  if (error) {
    alert("Erreur : " + error.message);
    return null;
  }
  return data.id;
}

function ChoixProf({
  valeur, profs, onChange, onProfCree, className = "",
}: {
  className?: string;
  valeur: string | null;
  profs: Prof[];
  onChange: (id: string | null) => void;
  onProfCree: () => void;
}) {
  return (
    <select
      value={valeur ?? ""}
      onChange={async (e) => {
        if (e.target.value === "__nouveau") {
          const id = await creerProf();
          if (id) {
            onProfCree();
            onChange(id);
          }
        } else onChange(e.target.value || null);
      }}
      className={`${champ} w-full ${className}`}
    >
      <option value="">— Prof —</option>
      {profs.map((p) => (
        <option key={p.id} value={p.id}>{p.nom}</option>
      ))}
      <option value="__nouveau">+ Nouveau prof…</option>
    </select>
  );
}

export default function GestionCours({
  cours, profs, inscriptions, lieuParDefaut, onChange,
}: {
  cours: Cours[];
  profs: Prof[];
  inscriptions: Inscription[];
  lieuParDefaut: string;
  onChange: () => void;
}) {
  const [nouveau, setNouveau] = useState({ jour: "Lundi", nom: "", horaire: "", lieu: lieuParDefaut, prof_id: null as string | null });
  const [enCours, setEnCours] = useState(false);

  const nbInscrits = (id: string) => inscriptions.filter((i) => i.cours.includes(id)).length;

  async function ajouter(e: React.FormEvent) {
    e.preventDefault();
    if (!nouveau.nom.trim()) return;
    setEnCours(true);
    const ordre = Math.max(0, ...cours.filter((c) => c.jour === nouveau.jour).map((c) => c.ordre)) + 1;
    const { error } = await supabase.from("gala_cours").insert({ ...nouveau, nom: nouveau.nom.trim(), ordre });
    setEnCours(false);
    if (error) return alert("Erreur : " + error.message);
    setNouveau({ ...nouveau, nom: "", horaire: "" }); // on garde le jour, le lieu et le prof pour enchaîner
    onChange();
  }

  return (
    <section className="space-y-4">
      <form onSubmit={ajouter} className="mk-carte space-y-2">
        <div className="flex items-end gap-2">
          <label className="w-32 space-y-1">
            <span className="block text-[10px] font-bold uppercase text-mk-gris">Jour</span>
            <select value={nouveau.jour} onChange={(e) => setNouveau({ ...nouveau, jour: e.target.value })} className={`${champ} w-full`}>
              {JOURS.map((j) => <option key={j}>{j}</option>)}
            </select>
          </label>
          <label className="flex-1 space-y-1">
            <span className="block text-[10px] font-bold uppercase text-mk-gris">Nom du cours</span>
            <input
              value={nouveau.nom}
              onChange={(e) => setNouveau({ ...nouveau, nom: e.target.value })}
              placeholder="ex. Hip-Hop 9-14 ans Deb/Int"
              className={`${champ} w-full`}
              required
            />
          </label>
          <label className="w-28 space-y-1">
            <span className="block text-[10px] font-bold uppercase text-mk-gris">Horaire</span>
            <input value={nouveau.horaire} onChange={(e) => setNouveau({ ...nouveau, horaire: e.target.value })} placeholder="18h" className={`${champ} w-full`} />
          </label>
          <label className="w-40 space-y-1">
            <span className="block text-[10px] font-bold uppercase text-mk-gris">Centre</span>
            <select required value={nouveau.lieu} onChange={(e) => setNouveau({ ...nouveau, lieu: e.target.value })} className={`${champ} w-full`}>
              {LIEUX.map((l) => <option key={l} value={l}>{l || "— Centre —"}</option>)}
            </select>
          </label>
          <label className="w-48 space-y-1">
            <span className="block text-[10px] font-bold uppercase text-mk-gris">Prof</span>
            <ChoixProf valeur={nouveau.prof_id} profs={profs} onChange={(id) => setNouveau({ ...nouveau, prof_id: id })} onProfCree={onChange} />
          </label>
          <button type="submit" disabled={enCours} className="mk-btn mk-btn-rouge h-[34px] shrink-0">
            {enCours ? "Ajout…" : "+ Ajouter"}
          </button>
        </div>
        <p className="text-xs text-mk-gris">
          Le centre décide du formulaire où le cours apparaît : Bron, Saint-Priest, ou « Commun » pour les deux. Le jour « Autres » sert pour ce qui n&apos;est pas un cours de la semaine : Team Show, Crew…
        </p>
      </form>

      {cours.length ? (
        <div className="overflow-hidden rounded-lg border border-mk-ligne bg-mk-carte">
          <table className="w-full text-sm">
            <thead className="bg-mk-carte2 text-left text-[11px] uppercase tracking-wider text-mk-gris">
              <tr>
                <th className="w-32 px-3 py-2.5">Jour</th>
                <th className="px-3 py-2.5">Cours</th>
                <th className="w-24 px-3 py-2.5">Horaire</th>
                <th className="w-36 px-3 py-2.5">Centre</th>
                <th className="w-48 px-3 py-2.5">Prof</th>
                <th className="w-20 px-3 py-2.5 text-center">Inscrits</th>
                <th className="w-36" />
              </tr>
            </thead>
            {JOURS.map((jour) => {
              const liste = cours.filter((c) => c.jour === jour);
              if (!liste.length) return null;
              return (
                <tbody key={jour}>
                  <tr>
                    <td colSpan={7} className="border-t border-mk-ligne bg-mk-noir/40 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-widest text-mk-rouge">
                      {jour} <span className="font-semibold text-mk-gris">· {liste.length} cours</span>
                    </td>
                  </tr>
                  {liste.map((c) => (
                    <LigneCours key={c.id} c={c} profs={profs} nb={nbInscrits(c.id)} onChange={onChange} />
                  ))}
                </tbody>
              );
            })}
          </table>
        </div>
      ) : (
        <p className="mk-carte text-center text-mk-gris">Aucun cours pour l&apos;instant.</p>
      )}
    </section>
  );
}

function LigneCours({ c, profs, nb, onChange }: { c: Cours; profs: Prof[]; nb: number; onChange: () => void }) {
  const [f, setF] = useState(c);
  useEffect(() => setF(c), [c]);
  const modifie = JSON.stringify(f) !== JSON.stringify(c);

  async function enregistrer() {
    const { error } = await supabase
      .from("gala_cours")
      .update({ jour: f.jour, nom: f.nom.trim(), horaire: f.horaire, lieu: f.lieu, prof_id: f.prof_id, ordre: f.ordre })
      .eq("id", c.id);
    if (error) alert("Erreur : " + error.message);
    else onChange();
  }

  async function supprimer() {
    const msg = nb
      ? `Supprimer « ${c.nom} » ?\n\n⚠️ ${nb} danseur(s) l'ont coché : ils perdront ce cours.`
      : `Supprimer « ${c.nom} » ?`;
    if (!confirm(msg)) return;
    const { error } = await supabase.from("gala_cours").delete().eq("id", c.id);
    if (error) alert("Erreur : " + error.message);
    else onChange();
  }

  const cellule = "px-2 py-1.5";
  const sansFond = "border-transparent bg-transparent hover:border-mk-ligne";
  return (
    <tr className={`group border-t border-mk-ligne/50 hover:bg-mk-carte2/50 ${modifie ? "bg-mk-rouge/10" : ""}`}>
      <td className={cellule}>
        <select value={f.jour} onChange={(e) => setF({ ...f, jour: e.target.value })} className={`${champ} ${sansFond} w-full`}>
          {JOURS.map((j) => <option key={j}>{j}</option>)}
        </select>
      </td>
      <td className={cellule}>
        <input value={f.nom} onChange={(e) => setF({ ...f, nom: e.target.value })} className={`${champ} ${sansFond} w-full font-bold`} />
      </td>
      <td className={cellule}>
        <input value={f.horaire} onChange={(e) => setF({ ...f, horaire: e.target.value })} placeholder="—" className={`${champ} ${sansFond} w-full`} />
      </td>
      <td className={cellule}>
        <select
          value={f.lieu}
          onChange={(e) => setF({ ...f, lieu: e.target.value })}
          className={`${champ} w-full ${LIEUX.includes(f.lieu) && f.lieu ? sansFond : "border-red-500 text-red-300"}`}
          title={f.lieu ? "" : "Sans centre, ce cours n'apparaît dans aucun formulaire"}
        >
          {!LIEUX.includes(f.lieu) && <option value={f.lieu}>{f.lieu} (aucun formulaire)</option>}
          {LIEUX.map((l) => <option key={l} value={l}>{l || "⚠ Aucun centre"}</option>)}
        </select>
      </td>
      <td className={cellule}>
        <ChoixProf className={f.prof_id ? sansFond : "border-transparent bg-transparent text-mk-gris hover:border-mk-ligne"} valeur={f.prof_id} profs={profs} onChange={(id) => setF({ ...f, prof_id: id })} onProfCree={onChange} />
      </td>
      <td className={`${cellule} text-center font-bold ${nb ? "" : "text-mk-gris"}`}>{nb}</td>
      <td className={`${cellule} text-right`}>
        <div className="flex justify-end gap-1">
          {modifie && (
            <>
              <button onClick={() => setF(c)} className="mk-btn mk-btn-sombre px-2 py-1 text-[11px]" title="Annuler">↺</button>
              <button onClick={enregistrer} className="mk-btn mk-btn-rouge px-2 py-1 text-[11px]">Enregistrer</button>
            </>
          )}
          <button
            onClick={supprimer}
            className="rounded px-2 py-1 text-mk-gris opacity-0 transition hover:bg-red-500/20 hover:text-red-300 group-hover:opacity-100"
            title="Supprimer"
          >
            ✕
          </button>
        </div>
      </td>
    </tr>
  );
}