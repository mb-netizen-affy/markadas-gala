"use client";

import { useEffect, useState } from "react";
import { supabase, JOURS, LIEUX, galasDuCours, type Centre, type Cours, type Inscription, type Prof } from "@/lib/supabase";
import { estTeamShow } from "@/lib/ordre";
import NbGalas from "@/components/admin/NbGalas";
import Icone from "@/components/Icone";

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
  cours, profs, inscriptions, centre, nbGalas, onChange,
}: {
  cours: Cours[];
  profs: Prof[];
  inscriptions: Inscription[];
  centre: Centre;
  nbGalas: number;
  onChange: () => void;
}) {
  const lieuParDefaut = centre.nom;
  const [nouveau, setNouveau] = useState({ jour: "Lundi", nom: "", horaire: "", lieu: lieuParDefaut, prof_id: null as string | null });
  const [enCours, setEnCours] = useState(false);
  // Le bloc « Ajouter un cours » peut être réduit (retenu d'une visite à l'autre)
  const [ajoutOuvert, setAjoutOuvert] = useState(false);
  useEffect(() => {
    try {
      setAjoutOuvert(localStorage.getItem("mk-ajout-cours") === "1");
    } catch {}
  }, []);
  function basculerAjout(v: boolean) {
    setAjoutOuvert(v);
    try {
      localStorage.setItem("mk-ajout-cours", v ? "1" : "0");
    } catch {}
  }

  const nbInscrits = (id: string) => inscriptions.filter((i) => i.cours.includes(id)).length;

  // ── Plusieurs galas : la Team Show passe dans tous, les autres cours dans le(s) gala(s) choisi(s) ──
  const aRepartir = cours.filter((c) => !estTeamShow(c));
  const sansGala = aRepartir.filter((c) => !galasDuCours(c, nbGalas).length);
  const parGala = Array.from({ length: nbGalas }, (_, i) => aRepartir.filter((c) => galasDuCours(c, nbGalas).includes(i + 1)).length);

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
      <form onSubmit={ajouter} className="mk-carte space-y-2 py-3">
        <button
          type="button"
          onClick={() => basculerAjout(!ajoutOuvert)}
          className="flex w-full items-center gap-2 text-left"
        >
          <span className="mk-titre flex items-center gap-2 text-sm"><Icone nom="plus" /> Ajouter un cours</span>
          <span className="text-xs text-mk-gris">{ajoutOuvert ? "▴" : "▾"}</span>
        </button>
        {ajoutOuvert && (
        <>
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
        </>
        )}
      </form>

      {/* Nombre de galas + nombre de cours par gala */}
      <div className="mk-carte flex flex-wrap items-center gap-x-6 gap-y-3">
        <NbGalas centre={centre} nb={nbGalas} onChange={onChange} />
        {nbGalas > 1 && (
          <>
            <div className="flex flex-wrap gap-2 text-sm">
              {parGala.map((n, i) => (
                <span key={i} className="rounded-md bg-mk-carte2 px-2.5 py-1">
                  <b>Gala {i + 1}</b> <span className="text-mk-gris">· {n} cours</span>
                </span>
              ))}
              {sansGala.length > 0 && (
                <span className="flex items-center gap-1.5 rounded-md bg-amber-500/15 px-2.5 py-1 font-bold text-amber-300"><Icone nom="alerte" /> {sansGala.length} sans gala</span>
              )}
            </div>
          </>
        )}
      </div>


      {cours.length ? (
        <div className="mk-tableau">
          <table className="w-full text-sm">
            <thead className="bg-mk-carte2 text-left text-[11px] uppercase tracking-wider text-mk-gris">
              <tr>
                <th className="w-28 min-w-28 px-3 py-2.5">Jour</th>
                <th className="min-w-48 px-3 py-2.5">Cours</th>
                <th className="w-20 px-3 py-2.5">Horaire</th>
                <th className="w-28 min-w-28 px-3 py-2.5">Centre</th>
                <th className="w-40 min-w-40 px-3 py-2.5">Prof</th>
                {nbGalas > 1 && <th className="w-32 min-w-32 px-3 py-2.5">Galas</th>}
                <th className="w-16 px-2 py-2.5 text-center">Inscrits</th>
                <th className="w-px" />
              </tr>
            </thead>
            {JOURS.map((jour) => {
              const liste = cours.filter((c) => c.jour === jour);
              if (!liste.length) return null;
              return (
                <tbody key={jour}>
                  <tr className="mk-separateur">
                    <td colSpan={nbGalas > 1 ? 8 : 7} className="border-t border-mk-ligne bg-mk-noir/40 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-widest text-mk-texte">
                      {jour} <span className="font-semibold text-mk-gris">· {liste.length} cours</span>
                    </td>
                  </tr>
                  {liste.map((c) => (
                    <LigneCours key={c.id} c={c} profs={profs} nb={nbInscrits(c.id)} nbGalas={nbGalas} onChange={onChange} />
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

function LigneCours({
  c, profs, nb, nbGalas, onChange,
}: {
  c: Cours;
  profs: Prof[];
  nb: number;
  nbGalas: number;
  onChange: () => void;
}) {
  // Galas affichés tout de suite au clic, puis enregistrés en arrière-plan
  const [galasLocaux, setGalasLocaux] = useState(c.galas ?? []);
  useEffect(() => setGalasLocaux(c.galas ?? []), [c.galas]);
  const galas = galasDuCours({ galas: galasLocaux }, nbGalas);
  async function basculerGala(g: number) {
    const avant = galasLocaux;
    const nouveaux = galas.includes(g) ? galas.filter((x) => x !== g) : [...galas, g].sort();
    setGalasLocaux(nouveaux);
    const { error } = await supabase.from("gala_cours").update({ galas: nouveaux }).eq("id", c.id);
    if (error) {
      setGalasLocaux(avant);
      alert("Erreur : " + error.message);
    } else onChange();
  }
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
      {nbGalas > 1 && (
        <td className={cellule}>
          {estTeamShow(c) ? (
            <span className="text-xs font-bold text-mk-gris">Tous les galas</span>
          ) : (
            <div className={`inline-flex gap-1 rounded-md p-0.5 ${galas.length ? "" : "ring-1 ring-amber-500/70"}`}>
              {Array.from({ length: nbGalas }, (_, i) => i + 1).map((g) => (
                <button
                  key={g}
                  onClick={() => basculerGala(g)}
                  title={`Gala ${g}`}
                  className={`h-7 w-8 rounded text-xs font-extrabold transition ${
                    galas.includes(g) ? "bg-mk-rouge text-mk-noir" : "bg-mk-noir text-mk-gris hover:text-mk-texte"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          )}
        </td>
      )}
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
            <Icone nom="croix" />
          </button>
        </div>
      </td>
    </tr>
  );
}