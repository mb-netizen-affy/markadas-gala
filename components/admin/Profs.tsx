"use client";

import { useEffect, useState } from "react";
import { supabase, grouperParEcole, COMMUN, type Centre, type Cours, type Prof } from "@/lib/supabase";

// Chaque prof a un lien personnel (avec un code secret) : il y voit ses cours
// et la liste des danseurs inscrits (noms et prénoms uniquement).
// profs = ceux de l'école affichée ; dans chaque tuile on ne montre que les cours de cette école (+ communs)
export default function Profs({
  profs, cours, centre, onChange,
}: {
  profs: Prof[];
  cours: Cours[]; // tous les cours
  centre: Centre;
  onChange: () => void;
}) {
  const [origine, setOrigine] = useState("");
  const [copie, setCopie] = useState("");
  const [nom, setNom] = useState("");
  useEffect(() => setOrigine(window.location.origin), []);

  function copier(url: string) {
    navigator.clipboard?.writeText(url).catch(() => prompt("Copie ce lien :", url));
    setCopie(url);
    setTimeout(() => setCopie(""), 1500);
  }

  async function ajouter(e: React.FormEvent) {
    e.preventDefault();
    if (!nom.trim()) return;
    const { error } = await supabase.from("gala_profs").insert({ nom: nom.trim() });
    if (error) return alert("Erreur : " + error.message);
    setNom("");
    onChange();
  }

  async function renommer(p: Prof) {
    const n = prompt("Nouveau nom :", p.nom)?.trim();
    if (!n || n === p.nom) return;
    await supabase.from("gala_profs").update({ nom: n }).eq("id", p.id);
    onChange();
  }

  async function supprimer(p: Prof) {
    if (!confirm(`Supprimer ${p.nom} ? Ses cours resteront, sans prof.`)) return;
    await supabase.from("gala_profs").delete().eq("id", p.id);
    onChange();
  }

  // Nouveau code = l'ancien lien ne marche plus (si un lien a circulé par erreur)
  async function nouveauLien(p: Prof) {
    if (!confirm(`Générer un nouveau lien pour ${p.nom} ? L'ancien ne fonctionnera plus.`)) return;
    const code = Math.random().toString(36).slice(2, 12);
    await supabase.from("gala_profs").update({ code }).eq("id", p.id);
    onChange();
  }

  return (
    <section className="space-y-3">
      <form onSubmit={ajouter} className="mk-carte flex max-w-xl gap-2">
        <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Nom du professeur" className="mk-input flex-1" />
        <button type="submit" className="mk-btn mk-btn-rouge">+ Ajouter</button>
      </form>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(480px,1fr))] gap-4">
      {profs.map((p) => {
        const tous = cours.filter((c) => c.prof_id === p.id);
        const ses = tous.filter((c) => c.lieu === centre.nom || c.lieu === COMMUN);
        const ailleurs = tous.length - ses.length;
        const url = `${origine}/prof/${p.code}`;
        return (
          <div key={p.id} className="mk-carte flex flex-col gap-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="mk-titre text-lg">{p.nom}</h3>
              <div className="flex gap-3 text-xs">
                <button onClick={() => renommer(p)} className="mk-lien">Renommer</button>
                <button onClick={() => nouveauLien(p)} className="mk-lien">Nouveau lien</button>
                <button onClick={() => supprimer(p)} className="mk-lien">Supprimer</button>
              </div>
            </div>
            <div className="flex-1 text-sm text-mk-gris">
              {ses.length ? (
                <div className="space-y-2">
                  {grouperParEcole(ses).map((g) => (
                    <div key={g.lieu}>
                      <p className="text-[11px] font-extrabold uppercase tracking-widest text-mk-rouge">
                        {g.lieu} <span className="font-semibold text-mk-gris">· {g.cours.length}</span>
                      </p>
                      <ul>
                        {g.cours.map((c) => (
                          <li key={c.id} className="flex items-baseline gap-3 border-b border-mk-ligne/40 py-0.5 last:border-0">
                            <b className="min-w-0 flex-1 truncate text-mk-texte" title={c.nom}>{c.nom}</b>
                            <span className="shrink-0 whitespace-nowrap">{c.jour} {c.horaire}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                  {ailleurs > 0 && (
                    <p className="text-xs italic">+ {ailleurs} cours dans l&apos;autre école</p>
                  )}
                </div>
              ) : (
                "Aucun cours attribué (à choisir dans l'onglet Cours)"
              )}
            </div>
            <div className="flex items-center gap-2 rounded-md bg-mk-carte2 px-3 py-2 text-sm">
              <a href={url} target="_blank" className="mk-lien flex-1 truncate">{url}</a>
              <button onClick={() => copier(url)} className="mk-btn mk-btn-rouge shrink-0 px-2 py-1 text-[11px]">
                {copie === url ? "Copié ✓" : "Copier"}
              </button>
            </div>
          </div>
        );
      })}
      </div>
      {!profs.length && <p className="mk-carte text-center text-mk-gris">Aucun professeur pour l&apos;instant.</p>}
    </section>
  );
}