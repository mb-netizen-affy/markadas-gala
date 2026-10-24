"use client";

import { useMemo, useState } from "react";
import { supabase, JOURS, emailValide, telephoneValide, type Cours, type Inscription } from "@/lib/supabase";
import { normaliser } from "@/lib/texte";
import Icone from "@/components/Icone";

// Liste complète des inscrits : recherche, doublons, modification, suppression
export default function Inscriptions({
  inscriptions, cours, coursCentre, onChange,
}: {
  inscriptions: Inscription[];
  cours: Cours[]; // tous les cours (pour afficher les noms)
  coursCentre: Cours[]; // les cours proposés dans cette école (pour la modification)
  onChange: () => void;
}) {
  const [recherche, setRecherche] = useState("");
  const [fiche, setFiche] = useState<Inscription | null>(null);
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
    if (!confirm(`Supprimer l'inscription de ${i.prenom} ${i.nom} ?`)) return false;
    const { error } = await supabase.from("gala_inscriptions").delete().eq("id", i.id);
    if (error) {
      alert("Erreur : " + error.message);
      return false;
    }
    onChange();
    return true;
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="relative w-full max-w-md">
          <Icone nom="recherche" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mk-gris" />
          <input
            type="search"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher un nom, un email, un téléphone…"
            className="mk-input pl-9"
          />
        </label>
        {doublons.size > 0 && (
          <button
            onClick={() => setDoublonsSeuls(!doublonsSeuls)}
            className={`mk-btn gap-1.5 text-xs ${doublonsSeuls ? "mk-btn-rouge" : "mk-btn-sombre border border-amber-500/60 text-amber-300"}`}
          >
            <Icone nom="alerte" /> {doublons.size} doublon{doublons.size > 1 ? "s" : ""}
          </button>
        )}
        <p className="ml-auto text-sm text-mk-gris">
          <b className="text-mk-texte">{liste.length}</b> inscrit{liste.length > 1 ? "s" : ""}
          {liste.length !== inscriptions.length && ` sur ${inscriptions.length}`}
        </p>
      </div>

      <p className="text-xs text-mk-gris">Clique sur une ligne pour modifier l&apos;inscription.</p>
      <div className="mk-tableau">
        <table className="w-full text-sm">
          <thead className="text-left text-[11px] uppercase tracking-wider text-mk-gris">
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
                <tr
                  key={i.id}
                  onClick={() => setFiche(i)}
                  className={`group cursor-pointer border-t border-mk-ligne/60 align-top ${doublon ? "!bg-amber-500/10" : ""}`}
                >
                  <td className="whitespace-nowrap px-4 py-2.5 font-extrabold uppercase">
                    {i.nom}
                    {doublon && <span className="ml-2 text-[10px] font-bold normal-case text-amber-300">doublon</span>}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 font-semibold">{i.prenom}</td>
                  <td className="px-4 py-2.5"><span className="text-mk-gris">{i.email}</span></td>
                  <td className="whitespace-nowrap px-4 py-2.5"><span className="tabular-nums text-mk-gris">{i.telephone}</span></td>
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
                    <span className="inline-flex rounded p-1.5 text-mk-gris opacity-0 transition group-hover:opacity-100" title="Modifier">
                      <Icone nom="crayon" />
                    </span>
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

      {fiche && (
        <FicheInscription
          inscription={fiche}
          cours={coursCentre}
          coursParId={coursParId}
          onFermer={() => setFiche(null)}
          onSupprimer={async () => {
            if (await supprimer(fiche)) setFiche(null);
          }}
          onEnregistre={() => {
            setFiche(null);
            onChange();
          }}
        />
      )}
    </section>
  );
}

// ───── Fenêtre de modification d'une inscription ─────
function FicheInscription({
  inscription: i, cours, coursParId, onFermer, onSupprimer, onEnregistre,
}: {
  inscription: Inscription;
  cours: Cours[];
  coursParId: Map<string, Cours>;
  onFermer: () => void;
  onSupprimer: () => void;
  onEnregistre: () => void;
}) {
  const [f, setF] = useState({ nom: i.nom, prenom: i.prenom, email: i.email, telephone: i.telephone });
  const [coches, setCoches] = useState(new Set(i.cours));
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState("");
  // Cours d'une autre école déjà cochés (rare) : on les garde dans la liste pour ne pas les perdre
  const proposes = [...cours, ...i.cours.map((id) => coursParId.get(id)).filter((c): c is Cours => !!c && !cours.includes(c))];

  function basculer(id: string) {
    const s = new Set(coches);
    if (s.has(id)) s.delete(id);
    else s.add(id);
    setCoches(s);
  }

  async function enregistrer() {
    setErreur("");
    if (!f.nom.trim() || !f.prenom.trim()) return setErreur("Le nom et le prénom sont obligatoires.");
    if (!emailValide(f.email)) return setErreur("L'adresse email ne semble pas correcte.");
    if (!telephoneValide(f.telephone)) return setErreur("Le téléphone doit contenir 10 chiffres.");
    if (!coches.size) return setErreur("Il faut au moins un cours.");
    setEnCours(true);
    const r1 = await supabase
      .from("gala_inscriptions")
      .update({ nom: f.nom.trim().toUpperCase(), prenom: f.prenom.trim(), email: f.email.trim().toLowerCase(), telephone: f.telephone.trim() })
      .eq("id", i.id);
    const retires = i.cours.filter((id) => !coches.has(id));
    const ajoutes = [...coches].filter((id) => !i.cours.includes(id));
    const r2 = retires.length
      ? await supabase.from("gala_inscriptions_cours").delete().eq("inscription_id", i.id).in("cours_id", retires)
      : { error: null };
    const r3 = ajoutes.length
      ? await supabase.from("gala_inscriptions_cours").insert(ajoutes.map((cours_id) => ({ inscription_id: i.id, cours_id })))
      : { error: null };
    setEnCours(false);
    const err = r1.error || r2.error || r3.error;
    if (err) return setErreur("Erreur : " + err.message);
    onEnregistre();
  }

  const champ = (cle: keyof typeof f, label: string) => (
    <label className="space-y-1">
      <span className="block text-[11px] font-bold uppercase tracking-wider text-mk-gris">{label}</span>
      <input value={f[cle]} onChange={(e) => setF({ ...f, [cle]: e.target.value })} className="mk-input" />
    </label>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6" onClick={onFermer}>
      <div
        className="mk-carte flex max-h-[90vh] w-full max-w-4xl flex-col gap-4 overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-mk-gris">Modifier l&apos;inscription</p>
            <h2 className="mk-titre text-xl">
              {i.prenom} {i.nom}
            </h2>
          </div>
          <button onClick={onFermer} className="rounded p-1.5 text-mk-gris hover:bg-mk-carte2 hover:text-mk-texte" title="Fermer">
            <Icone nom="croix" className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {champ("nom", "Nom")}
          {champ("prenom", "Prénom")}
          {champ("email", "Email")}
          {champ("telephone", "Téléphone")}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto rounded-md border border-mk-ligne p-3">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-mk-gris">
            Cours ({coches.size} coché{coches.size > 1 ? "s" : ""})
          </p>
          <div className="grid grid-cols-3 gap-x-4 gap-y-3">
            {JOURS.map((jour) => {
              const liste = proposes.filter((c) => c.jour === jour);
              if (!liste.length) return null;
              return (
                <div key={jour} className="space-y-1">
                  <p className="text-xs font-extrabold uppercase tracking-wider text-mk-texte">{jour}</p>
                  {liste.map((c) => (
                    <label key={c.id} className="flex cursor-pointer items-start gap-2 rounded px-1.5 py-1 text-sm hover:bg-mk-carte2">
                      <input type="checkbox" checked={coches.has(c.id)} onChange={() => basculer(c.id)} className="mt-0.5 h-4 w-4 accent-[var(--color-mk-rouge)]" />
                      <span>
                        {c.nom} <span className="text-xs text-mk-gris">{c.horaire}</span>
                      </span>
                    </label>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        {erreur && <p className="rounded-md bg-red-500/15 px-3 py-2 text-sm font-semibold text-red-300">{erreur}</p>}

        <div className="flex items-center justify-between gap-3">
          <button onClick={onSupprimer} className="mk-btn gap-1.5 border border-red-500/50 text-xs text-red-300 hover:bg-red-500/15">
            <Icone nom="croix" /> Supprimer l&apos;inscription
          </button>
          <div className="flex gap-2">
            <button onClick={onFermer} className="mk-btn mk-btn-sombre">Annuler</button>
            <button onClick={enregistrer} disabled={enCours} className="mk-btn mk-btn-rouge">
              {enCours ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}