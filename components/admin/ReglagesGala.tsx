"use client";

import { useEffect, useRef, useState } from "react";
import { supabase, formulaireOuvert, appliquerSaison, CENTRES, type Reglages, type Saison } from "@/lib/supabase";
import ChoixDate from "@/components/admin/ChoixDate";
import Icone from "@/components/Icone";

// ISO → valeur d'un champ <input type="datetime-local"> (heure locale)
function versChampDate(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

// "Gala d'hiver 2026" ⇄ "Gala d'été 2026" : on remplace le mot de la saison, le reste du titre ne bouge pas
function titreSaison(titre: string, saison: Saison) {
  const nouveau = saison === "ete" ? "été" : "hiver";
  return titre.replace(/(^|[^a-zà-ÿ])(hiver|été|ete)(?![a-zà-ÿ])/gi, (_, avant: string, mot: string) => {
    if (mot === mot.toUpperCase()) return avant + nouveau.toUpperCase();
    if (mot[0] === mot[0].toUpperCase()) return avant + nouveau[0].toUpperCase() + nouveau.slice(1);
    return avant + nouveau;
  });
}

export default function ReglagesGala({
  reglages, nbInscrits, onChange, onReinitialise,
}: {
  reglages: Reglages;
  nbInscrits: number;
  onChange: () => void; // rechargement léger
  onReinitialise: () => void; // rechargement complet (après un reset)
}) {
  const [titre, setTitre] = useState(reglages.titre);
  const [dateLimite, setDateLimite] = useState(versChampDate(reglages.date_limite));
  const [message, setMessage] = useState(reglages.message_ferme);
  const [enCours, setEnCours] = useState(false);
  const [etat, setEtat] = useState(""); // « Enregistré ✓ »
  const [lienCopie, setLienCopie] = useState("");
  const [origine, setOrigine] = useState("");
  useEffect(() => setOrigine(window.location.origin), []);
  useEffect(() => setTitre(reglages.titre), [reglages.titre]);

  const ouvert = formulaireOuvert(reglages);
  const dateDepassee = reglages.formulaire_ouvert && !ouvert;

  // Tout s'enregistre automatiquement
  async function maj(changements: Partial<Reglages>) {
    setEnCours(true);
    setEtat("Enregistrement…");
    const { error } = await supabase.from("gala_reglages").update(changements).eq("id", 1);
    setEnCours(false);
    if (error) {
      setEtat("");
      return alert("Erreur : " + error.message);
    }
    setEtat("Enregistré ✓");
    setTimeout(() => setEtat(""), 1500);
    onChange();
  }

  // Titre et message : enregistrés quand on a fini de taper (petite pause) ou en quittant le champ
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);
  function plusTard(changements: Partial<Reglages>) {
    if (minuteur.current) clearTimeout(minuteur.current);
    minuteur.current = setTimeout(() => maj(changements), 800);
  }
  function choisirDate(v: string) {
    setDateLimite(v);
    maj({ date_limite: v ? new Date(v).toISOString() : null });
  }

  // Nouveau gala : on vide les inscriptions et on remet les cours des plannings (avec leurs profs et galas)
  async function reinitialiser() {
    const ok = prompt(
      `Réinitialiser pour un nouveau gala ?\n\n` +
        `• Les ${nbInscrits} inscriptions seront SUPPRIMÉES (Bron et Saint-Priest)\n` +
        `• Les ordres de passage seront effacés\n` +
        `• Les cours redeviennent ceux des plannings, chacun avec son prof et ses galas\n` +
        `• Les cours ajoutés à la main sont supprimés\n\n` +
        `Pense à faire un Export Excel avant !\n\nTape SUPPRIMER pour confirmer :`
    );
    if (ok?.trim().toUpperCase() !== "SUPPRIMER") return;
    setEnCours(true);
    const { data, error } = await supabase.rpc("gala_reinitialiser");
    setEnCours(false);
    if (error) return alert("Erreur : " + error.message);
    alert(`C'est fait : ${data.inscriptions} inscription(s) supprimée(s), ${data.cours} cours remis comme sur les plannings.`);
    onReinitialise();
  }

  function copierLien(url: string) {
    navigator.clipboard?.writeText(url).catch(() => prompt("Copie ce lien :", url));
    setLienCopie(url);
    setTimeout(() => setLienCopie(""), 1500);
  }

  const etiquette = "block text-[11px] font-bold uppercase tracking-wider text-mk-gris";

  return (
    <section className="grid grid-cols-2 items-start gap-4">
      {/* ── Colonne de gauche : formulaires + liens ── */}
      <div className={`mk-carte space-y-4 ${ouvert ? "border-ok/60" : "border-red-500/60"}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="mk-titre text-lg">Formulaires d&apos;inscription</p>
            <p className={`flex items-center gap-2 text-2xl font-extrabold ${ouvert ? "text-ok" : "text-red-300"}`}>
              <Icone nom={ouvert ? "ok" : "cadenas"} className="h-6 w-6" />
              {ouvert ? "OUVERTS" : "FERMÉS"}
            </p>
            {dateDepassee && <p className="text-sm text-amber-300">Fermés automatiquement : la date limite est passée.</p>}
          </div>
          <button
            onClick={() => maj({ formulaire_ouvert: !reglages.formulaire_ouvert })}
            disabled={enCours}
            className={`mk-btn px-6 py-4 text-base ${reglages.formulaire_ouvert ? "mk-btn-sombre border border-mk-ligne" : "bg-ok text-white hover:brightness-110"}`}
          >
            {reglages.formulaire_ouvert ? "Fermer les formulaires" : "Ouvrir les formulaires"}
          </button>
        </div>

        <div className="space-y-2">
          <p className={etiquette}>Liens à envoyer aux familles</p>
          {CENTRES.map((c) => {
            const url = `${origine}/formulaire/${c.slug}`;
            return (
              <div key={c.slug} className="flex items-center gap-2 rounded-md bg-mk-carte2 px-3 py-2 text-sm">
                <b className="w-24 shrink-0">{c.nom}</b>
                <a href={`/formulaire/${c.slug}`} target="_blank" className="min-w-0 flex-1 truncate text-mk-gris hover:text-mk-texte hover:underline">
                  {url}
                </a>
                <button onClick={() => copierLien(url)} className="mk-btn mk-btn-sombre gap-1.5 border border-mk-ligne px-2 py-1 text-[11px]">
                  <Icone nom="copier" className="h-3.5 w-3.5" /> {lienCopie === url ? "Copié ✓" : "Copier"}
                </button>
              </div>
            );
          })}
        </div>

        <div className="space-y-1">
          <span className={etiquette}>Date limite (fermeture automatique, facultatif)</span>
          <ChoixDate valeur={dateLimite} onChange={choisirDate} />
        </div>
        <label className="block space-y-1">
          <span className={etiquette}>Message affiché quand les formulaires sont fermés</span>
          <textarea
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              plusTard({ message_ferme: e.target.value.trim() || "Les inscriptions au gala sont closes." });
            }}
            rows={2}
            placeholder="Les inscriptions au gala sont closes."
            className="mk-input"
          />
        </label>
      </div>

      {/* ── Colonne de droite : le gala + nouveau gala ── */}
      <div className="space-y-4">
        <div className="mk-carte space-y-4">
          <div className="flex items-center justify-between">
            <p className="mk-titre text-lg">Le gala</p>
            {etat && <span className="text-sm text-mk-gris">{etat}</span>}
          </div>
          <label className="block space-y-1">
            <span className={etiquette}>Titre du gala</span>
            <input
              value={titre}
              onChange={(e) => {
                setTitre(e.target.value);
                plusTard({ titre: e.target.value.trim() || "Gala" });
              }}
              className="mk-input"
            />
          </label>
          <div className="space-y-1">
            <span className={etiquette}>Saison (couleurs du site et mot « hiver » / « été » du titre)</span>
            <div className="inline-flex rounded-lg bg-mk-noir p-1">
              {([
                ["hiver", "flocon", "Hiver"],
                ["ete", "soleil", "Été"],
              ] as [Saison, string, string][]).map(([sa, icone, label]) => (
                <button
                  key={sa}
                  disabled={enCours}
                  onClick={() => {
                    if (sa === reglages.saison) return;
                    appliquerSaison(sa); // effet immédiat, puis enregistrement
                    const t = titreSaison(titre, sa);
                    setTitre(t);
                    maj({ saison: sa, titre: t });
                  }}
                  className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-bold uppercase transition ${
                    reglages.saison === sa ? "bg-mk-rouge text-mk-noir" : "text-mk-gris hover:text-mk-texte"
                  }`}
                >
                  <Icone nom={icone} /> {label}
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs text-mk-gris">Les modifications sont enregistrées automatiquement.</p>
        </div>

        {/* Remise à zéro pour un nouveau gala */}
        <div className="mk-carte space-y-3 border-red-500/40">
          <p className="mk-titre text-lg text-red-300">Nouveau gala</p>
          <ul className="list-disc space-y-0.5 pl-5 text-sm text-mk-gris">
            <li>Supprime les <b className="text-mk-texte">{nbInscrits} danseurs inscrits</b> et les ordres de passage.</li>
            <li>Remet les cours comme sur les plannings, <b className="text-mk-texte">chacun avec son prof et ses galas</b>.</li>
            <li>Supprime les cours ajoutés à la main.</li>
            <li>Garde les profs, le nombre de galas, le titre et la saison.</li>
          </ul>
          <button onClick={reinitialiser} disabled={enCours} className="mk-btn gap-2 border border-red-500/60 text-red-300 hover:bg-red-500/15">
            <Icone nom="reset" /> Réinitialiser
          </button>
        </div>
      </div>
    </section>
  );
}