"use client";

import { useEffect, useState } from "react";
import { supabase, formulaireOuvert, appliquerSaison, CENTRES, type Reglages, type Saison } from "@/lib/supabase";
import ChoixDate from "@/components/admin/ChoixDate";

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
  reglages, nbInscrits, onChange,
}: {
  reglages: Reglages;
  nbInscrits: number;
  onChange: () => void;
}) {
  const [titre, setTitre] = useState(reglages.titre);
  const [dateLimite, setDateLimite] = useState(versChampDate(reglages.date_limite));
  const [message, setMessage] = useState(reglages.message_ferme);
  const [enCours, setEnCours] = useState(false);
  const [lienCopie, setLienCopie] = useState("");
  const [origine, setOrigine] = useState("");
  useEffect(() => setOrigine(window.location.origin), []);

  const ouvert = formulaireOuvert(reglages);
  const dateDepassee = reglages.formulaire_ouvert && !ouvert;

  async function maj(changements: Partial<Reglages>) {
    setEnCours(true);
    const { error } = await supabase.from("gala_reglages").update(changements).eq("id", 1);
    setEnCours(false);
    if (error) alert("Erreur : " + error.message);
    else onChange();
  }

  function enregistrer() {
    maj({
      titre: titre.trim() || "Gala",
      message_ferme: message.trim() || "Les inscriptions au gala sont closes.",
      date_limite: dateLimite ? new Date(dateLimite).toISOString() : null,
    });
  }

  // Nouveau gala : on vide les inscriptions et on remet tous les cours des plannings
  async function reinitialiser() {
    const ok = prompt(
      `Réinitialiser pour un nouveau gala ?\n\n` +
        `• Les ${nbInscrits} inscriptions seront SUPPRIMÉES (Bron et Saint-Priest)\n` +
        `• Les ordres de passage seront effacés\n` +
        `• La liste des cours redevient celle des plannings : les cours renommés ou ajoutés à la main sont remplacés\n\n` +
        `Pense à faire un Export Excel avant !\n\nTape SUPPRIMER pour confirmer :`
    );
    if (ok?.trim().toUpperCase() !== "SUPPRIMER") return;
    setEnCours(true);
    const { data, error } = await supabase.rpc("gala_reinitialiser");
    setEnCours(false);
    if (error) return alert("Erreur : " + error.message);
    alert(`C'est fait : ${data.inscriptions} inscription(s) supprimée(s), ${data.cours} cours remis comme sur les plannings.`);
    onChange();
  }

  function copierLien(url: string) {
    navigator.clipboard?.writeText(url).catch(() => prompt("Copie ce lien :", url));
    setLienCopie(url);
    setTimeout(() => setLienCopie(""), 1500);
  }

  return (
    <section className="grid grid-cols-2 items-start gap-4">
      <div className="space-y-4">
      {/* Gros interrupteur ouvert / fermé */}
      <div className={`mk-carte space-y-3 ${ouvert ? "border-ok/60" : "border-red-500/60"}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="mk-titre text-lg">Formulaires d&apos;inscription</p>
            <p className={`text-2xl font-extrabold ${ouvert ? "text-ok" : "text-red-300"}`}>
              {ouvert ? "● OUVERT" : "● FERMÉ"}
            </p>
            {dateDepassee && <p className="text-sm text-amber-300">Fermé automatiquement : la date limite est passée.</p>}
          </div>
          <button
            onClick={() => maj({ formulaire_ouvert: !reglages.formulaire_ouvert })}
            disabled={enCours}
            className={`mk-btn px-6 py-4 text-base ${reglages.formulaire_ouvert ? "mk-btn-sombre border border-mk-rouge" : "bg-ok text-white"}`}
          >
            {reglages.formulaire_ouvert ? "Fermer les formulaires" : "Ouvrir les formulaires"}
          </button>
        </div>
        <p className="text-sm text-mk-gris">Liens à envoyer aux familles (un par centre) :</p>
        {CENTRES.map((c) => {
          const url = `${origine}/formulaire/${c.slug}`;
          return (
            <div key={c.slug} className="flex flex-wrap items-center gap-2 rounded-md bg-mk-carte2 px-3 py-2 text-sm">
              <b className="w-24 shrink-0">{c.nom}</b>
              <a href={`/formulaire/${c.slug}`} target="_blank" className="mk-lien min-w-0 flex-1 truncate">{url}</a>
              <button onClick={() => copierLien(url)} className="mk-btn mk-btn-rouge px-2 py-1 text-[11px]">
                {lienCopie === url ? "Copié ✓" : "Copier"}
              </button>
            </div>
          );
        })}
      </div>

      {/* Saison : change les couleurs de tout le site (admin, formulaires, pages profs) */}
      <div className="mk-carte flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="mk-titre text-lg">Saison du gala</p>
          <p className="text-sm text-mk-gris">Change les couleurs du site et « hiver » / « été » dans le titre.</p>
        </div>
        <div className="flex rounded-lg bg-mk-noir p-1">
          {([
            ["hiver", "❄️ Hiver"],
            ["ete", "☀️ Été"],
          ] as [Saison, string][]).map(([s, label]) => (
            <button
              key={s}
              disabled={enCours}
              onClick={() => {
                if (s === reglages.saison) return;
                appliquerSaison(s); // effet immédiat, puis enregistrement
                const t = titreSaison(reglages.titre, s);
                setTitre(t);
                maj({ saison: s, titre: t });
              }}
              className={`rounded-md px-4 py-2 text-sm font-bold uppercase transition ${
                reglages.saison === s ? "bg-mk-rouge text-mk-noir" : "text-mk-gris hover:text-mk-texte"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Remise à zéro pour un nouveau gala */}
      <div className="mk-carte space-y-3 border-red-500/40">
        <div>
          <p className="mk-titre text-lg text-red-300">Nouveau gala</p>
          <p className="text-sm text-mk-gris">
            Supprime tous les danseurs inscrits ({nbInscrits}) et les ordres de passage, puis remet la liste des cours
            exactement comme sur les plannings (les cours renommés ou ajoutés à la main sont remplacés). Les profs restent
            sur les cours qui ont gardé leur nom ; le titre et la saison sont gardés.
          </p>
        </div>
        <button onClick={reinitialiser} disabled={enCours} className="mk-btn border border-red-500/60 text-red-300 hover:bg-red-500/15">
          ♻️ Réinitialiser
        </button>
      </div>
      </div>

      <div className="mk-carte space-y-3">
        <p className="mk-titre text-lg">Paramètres</p>
        <label className="block space-y-1">
          <span className="text-xs font-bold uppercase text-mk-gris">Titre du gala</span>
          <input value={titre} onChange={(e) => setTitre(e.target.value)} className="mk-input" />
        </label>
        <div className="space-y-1">
          <span className="block text-xs font-bold uppercase text-mk-gris">Date limite (fermeture automatique, facultatif)</span>
          <ChoixDate valeur={dateLimite} onChange={setDateLimite} />
        </div>
        <label className="block space-y-1">
          <span className="text-xs font-bold uppercase text-mk-gris">Message affiché quand le formulaire est fermé</span>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2} className="mk-input" />
        </label>
        <button onClick={enregistrer} disabled={enCours} className="mk-btn mk-btn-rouge">
          {enCours ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </section>
  );
}