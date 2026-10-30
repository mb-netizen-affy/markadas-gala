"use client";

import { useEffect, useMemo, useState } from "react";
import {
  supabase, JOURS, formulaireOuvert, trierCours, COMMUN, appliquerSaison, CATEGORIES, categorieCours,
  telephoneValide, emailValide, type Categorie, type Centre, type Cours, type Reglages,
} from "@/lib/supabase";
import { normaliser } from "@/lib/texte";
import Icone from "@/components/Icone";
import { Etat } from "@/components/Entete";
import LogoMarkadas from "@/components/LogoMarkadas";

const VIDE = { nom: "", prenom: "", email: "", telephone: "" };

const MESSAGES_ERREUR: Record<string, string> = {
  FORMULAIRE_FERME: "Les inscriptions viennent d'être fermées.",
  CHAMPS_MANQUANTS: "Merci de remplir tous les champs.",
  AUCUN_COURS: "Merci de cocher au moins un cours.",
};

// Formulaire public d'un centre : il ne propose que les cours de ce centre.
// Les deux formulaires enregistrent dans la même base.
export default function FormulaireGala({ centre }: { centre: Centre }) {
  const [reglages, setReglages] = useState<Reglages | null>(null);
  const [cours, setCours] = useState<Cours[]>([]);
  const [chargement, setChargement] = useState(true);
  const [champs, setChamps] = useState(VIDE);
  const [coches, setCoches] = useState<Set<string>>(new Set());
  const [accord, setAccord] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");
  const [confirme, setConfirme] = useState<{ nom: string; prenom: string; cours: Cours[] } | null>(null);
  const [profs, setProfs] = useState<Map<string, string>>(new Map()); // id → nom du prof
  const [filtre, setFiltre] = useState<Categorie | "tous">("tous");
  const [recherche, setRecherche] = useState("");
  // Doublon : même nom + prénom déjà inscrit dans cette école
  const [doublon, setDoublon] = useState(false);
  const [doublonAccepte, setDoublonAccepte] = useState(false);

  useEffect(() => {
    Promise.all([
      supabase.from("gala_reglages").select("*").eq("id", 1).maybeSingle(),
      supabase.from("gala_cours").select("*").in("lieu", [centre.nom, COMMUN]),
    ]).then(([r, c]) => {
      setReglages(r.data);
      appliquerSaison(r.data?.saison);
      setCours(trierCours(c.data ?? []));
      setChargement(false);
    });
    // Noms des profs (affichés sous chaque cours) — si ça échoue, on fait sans
    supabase
      .from("gala_profs")
      .select("id, nom")
      .then(({ data }) => setProfs(new Map((data ?? []).map((p: { id: string; nom: string }) => [p.id, p.nom]))));
  }, [centre.nom]);

  // Filtres : catégorie + recherche (les cours déjà cochés restent toujours visibles)
  const parJour = useMemo(() => {
    const q = normaliser(recherche);
    const visible = (c: Cours) =>
      coches.has(c.id) ||
      ((filtre === "tous" || categorieCours(c) === filtre || categorieCours(c) === "autre") &&
        (!q || normaliser(`${c.nom}${c.jour}${c.horaire}`).includes(q)));
    return JOURS.map((j) => ({ jour: j, cours: cours.filter((c) => c.jour === j && visible(c)) })).filter((g) => g.cours.length);
  }, [cours, filtre, recherche, coches]);

  // Vérifie le doublon dès que nom et prénom sont remplis
  async function verifierDoublon() {
    if (!champs.nom.trim() || !champs.prenom.trim()) return setDoublon(false);
    const { data, error } = await supabase.rpc("gala_deja_inscrit", { p_nom: champs.nom, p_prenom: champs.prenom, p_centre: centre.nom });
    if (!error) {
      setDoublon(!!data);
      setDoublonAccepte(false);
    }
  }

  if (chargement) return <Etat texte="Chargement…" />;

  const titre = reglages?.titre || "Gala Markadas";
  const ouvert = formulaireOuvert(reglages);

  function basculer(id: string) {
    setCoches((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });
  }

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    setErreur("");
    if (!emailValide(champs.email)) return setErreur("L'adresse email ne semble pas correcte.");
    if (!telephoneValide(champs.telephone)) return setErreur("Le numéro de téléphone doit contenir 10 chiffres (ex. 06 12 34 56 78).");
    if (doublon && !doublonAccepte)
      return setErreur(`${champs.prenom} ${champs.nom.toUpperCase()} est déjà inscrit(e) : coche la case de confirmation si c'est bien une autre inscription.`);
    if (!coches.size) return setErreur(MESSAGES_ERREUR.AUCUN_COURS);
    if (!accord) return setErreur("Merci d'accepter l'utilisation de vos données et le droit à l'image pour valider l'inscription.");
    setEnvoi(true);
    const { error } = await supabase.rpc("gala_inscrire", {
      p_nom: champs.nom,
      p_prenom: champs.prenom,
      p_email: champs.email,
      p_telephone: champs.telephone,
      p_cours: [...coches],
      p_centre: centre.nom,
    });
    setEnvoi(false);
    if (error) {
      const code = Object.keys(MESSAGES_ERREUR).find((k) => error.message.includes(k));
      setErreur(code ? MESSAGES_ERREUR[code] : "Erreur d'envoi, vérifie ta connexion et réessaie.");
      return;
    }
    setConfirme({ nom: champs.nom.toUpperCase(), prenom: champs.prenom, cours: cours.filter((c) => coches.has(c.id)) });
  }

  // Après l'envoi : récapitulatif + possibilité d'inscrire un autre danseur (frère, sœur…)
  function autreDanseur() {
    setChamps((c) => ({ ...VIDE, email: c.email, telephone: c.telephone }));
    setCoches(new Set());
    setDoublon(false);
    setDoublonAccepte(false);
    setConfirme(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const champ = (cle: keyof typeof VIDE, label: string, type = "text", auto = "") => (
    <label className="space-y-1">
      <span className="block text-xs font-bold uppercase tracking-wider text-mk-gris">{label}</span>
      <input
        type={type}
        required
        autoComplete={auto}
        value={champs[cle]}
        onChange={(e) => setChamps({ ...champs, [cle]: e.target.value })}
        onBlur={cle === "nom" || cle === "prenom" ? verifierDoublon : undefined}
        className="mk-input"
      />
    </label>
  );

  const choisis = cours.filter((c) => coches.has(c.id));

  return (
    <main className="min-h-screen px-4 pb-12 pt-8 lg:px-8">
      <div className="mx-auto max-w-[1700px] space-y-6">
        {/* Gros logo centré + titre */}
        <header className="space-y-3 text-center">
          <LogoMarkadas className="mx-auto h-28 w-28 mk-halo-logo text-mk-rouge sm:h-32 sm:w-32" />
          <div>
            <h1 className="mk-titre text-2xl sm:text-4xl">{titre}</h1>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-mk-gris">Inscription · {centre.nom}</p>
          </div>
          {ouvert && !confirme && reglages?.date_limite && (
            <p className="flex items-center justify-center gap-2 text-sm text-mk-gris">
              <Icone nom="calendrier" /> Inscriptions ouvertes jusqu&apos;au{" "}
              <b className="text-mk-texte">
                {new Date(reglages.date_limite).toLocaleString("fr-FR", { dateStyle: "full", timeStyle: "short" })}
              </b>
            </p>
          )}
        </header>

        {!ouvert ? (
          <div className="mk-carte mx-auto max-w-xl space-y-2 py-10 text-center">
            <Icone nom="cadenas" className="mx-auto h-10 w-10 text-mk-gris" />
            <p className="mk-titre text-xl">Inscriptions fermées</p>
            <p className="text-mk-gris">{reglages?.message_ferme}</p>
          </div>
        ) : confirme ? (
          <div className="mk-carte mx-auto max-w-xl space-y-4 py-8 text-center">
            <Icone nom="ok" className="mx-auto h-12 w-12 text-ok" />
            <p className="mk-titre text-2xl">Inscription enregistrée</p>
            <p>
              <b>{confirme.prenom} {confirme.nom}</b> est inscrit(e) au gala pour :
            </p>
            <ul className="mx-auto max-w-md space-y-1 text-left text-sm">
              {confirme.cours.map((c) => (
                <li key={c.id} className="rounded-md bg-mk-carte2 px-3 py-2">
                  <b>{c.jour}</b> · {c.nom} {c.horaire && <span className="text-mk-gris">· {c.horaire}</span>}
                </li>
              ))}
            </ul>
            <button onClick={autreDanseur} className="mk-btn mk-btn-rouge">
              Inscrire un autre danseur
            </button>
          </div>
        ) : (
          <form onSubmit={envoyer} className="grid items-start gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
            {/* ── Colonne de gauche : le danseur + validation (reste visible en faisant défiler).
                 Sur téléphone : le danseur, puis le planning, puis la validation ── */}
            <div className="contents lg:sticky lg:top-6 lg:block lg:space-y-4">
              <section className="mk-carte order-1 space-y-3 lg:order-none">
                <h2 className="mk-titre text-lg">Le danseur</h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  {champ("nom", "Nom de famille", "text", "family-name")}
                  {champ("prenom", "Prénom", "text", "given-name")}
                  {champ("email", "Email", "email", "email")}
                  {champ("telephone", "Téléphone", "tel", "tel")}
                </div>
                {doublon && (
                  <div className="space-y-2 rounded-md border border-amber-500/60 bg-amber-500/10 p-3 text-sm">
                    <p className="flex items-start gap-2 font-bold text-amber-300">
                      <Icone nom="alerte" className="mt-0.5 h-4 w-4" />
                      {champs.prenom} {champs.nom.toUpperCase()} est déjà inscrit(e) à {centre.nom}.
                    </p>
                    <p className="text-mk-gris">Pour ajouter des cours, contacte l&apos;école plutôt que de refaire une inscription.</p>
                    <label className="flex items-start gap-2">
                      <input type="checkbox" checked={doublonAccepte} onChange={(e) => setDoublonAccepte(e.target.checked)} className="mt-0.5 h-4 w-4" />
                      <span>C&apos;est bien une autre personne / une nouvelle inscription</span>
                    </label>
                  </div>
                )}
              </section>

              <section className="mk-carte order-3 space-y-3 lg:order-none">
                <h2 className="mk-titre text-lg">
                  Cours choisis <span className="text-mk-gris">{coches.size || ""}</span>
                </h2>
                {choisis.length ? (
                  <ul className="max-h-48 space-y-1 overflow-y-auto text-sm">
                    {choisis.map((c) => (
                      <li key={c.id} className="flex items-center gap-2 rounded bg-mk-carte2 px-2 py-1">
                        <span className="min-w-0 flex-1 truncate">
                          <b>{c.nom}</b> <span className="text-mk-gris">· {c.jour} {c.horaire}</span>
                        </span>
                        <button type="button" onClick={() => basculer(c.id)} className="text-mk-gris hover:text-red-300" title="Retirer">
                          <Icone nom="croix" className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-mk-gris">Coche les cours dans le planning.</p>
                )}

                <label className="flex items-start gap-3 text-sm text-mk-gris">
                  <input type="checkbox" checked={accord} onChange={(e) => setAccord(e.target.checked)} className="mt-1 h-4 w-4 shrink-0" />
                  <span className="space-y-1.5">
                       <span className="block">
                       J&apos;autorise les écoles Markadas à photographier
                       et filmer le danseur pendant le gala, et à utiliser ces images pour leur communication 
                    </span>
                  </span>
                </label>

                {erreur && <p className="rounded-md bg-red-500/15 px-3 py-2 text-sm font-semibold text-red-300">{erreur}</p>}

                <button type="submit" disabled={envoi} className="mk-btn mk-btn-rouge w-full py-4 text-base">
                  {envoi ? "Envoi…" : `Valider l'inscription${coches.size ? ` (${coches.size} cours)` : ""}`}
                </button>
              </section>
            </div>

            {/* ── Le planning de la semaine : une colonne par jour ── */}
            <section className="mk-carte order-2 space-y-4 lg:order-none">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="mk-titre text-lg">Ses cours</h2>
                  <p className="text-sm text-mk-gris">Coche tous les cours dans lesquels le danseur participera au gala.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex flex-wrap gap-1 rounded-lg bg-mk-noir p-1">
                    {CATEGORIES.map((c) => (
                      <button
                        type="button"
                        key={c.id}
                        onClick={() => setFiltre(c.id)}
                        className={`rounded-md px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition ${
                          filtre === c.id ? "bg-mk-rouge text-mk-noir" : "text-mk-gris hover:text-mk-texte"
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                  <label className="relative">
                    <Icone nom="recherche" className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-mk-gris" />
                    <input
                      type="search"
                      value={recherche}
                      onChange={(e) => setRecherche(e.target.value)}
                      placeholder="Rechercher une danse…"
                      className="mk-input w-56 py-1.5 pl-8 text-sm"
                    />
                  </label>
                </div>
              </div>
              {parJour.length === 0 && (
                <p className="text-mk-gris">
                  {cours.length ? "Aucun cours ne correspond à ce filtre." : `Aucun cours n'est encore proposé à ${centre.nom}.`}
                </p>
              )}
              <div
                className="grid gap-3 sm:[grid-template-columns:repeat(auto-fill,minmax(175px,1fr))]"
              >
                {parJour.map((g) => (
                  <div key={g.jour} className="space-y-2">
                    <p className="rounded-md bg-mk-noir px-2 py-1.5 text-center text-sm font-extrabold uppercase tracking-wider text-mk-texte">
                      {g.jour}
                    </p>
                    <div className="space-y-2">
                      {g.cours.map((c) => {
                        const actif = coches.has(c.id);
                        return (
                          <button
                            type="button"
                            key={c.id}
                            onClick={() => basculer(c.id)}
                            className={`flex w-full items-start gap-2 rounded-md border px-2.5 py-2 text-left transition ${
                              actif ? "border-mk-rouge bg-mk-rouge/15" : "border-mk-ligne bg-mk-carte2 hover:border-mk-gris"
                            }`}
                          >
                            <span
                              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 text-xs font-bold ${
                                actif ? "border-mk-rouge bg-mk-rouge text-mk-noir" : "border-mk-gris"
                              }`}
                            >
                              {actif && "✓"}
                            </span>
                            <span className="min-w-0">
                              {c.horaire && <span className="block text-xs font-bold text-mk-gris">{c.horaire}</span>}
                              <span className="block text-sm font-bold leading-snug [overflow-wrap:anywhere]">{c.nom}</span>
                              {c.prof_id && profs.get(c.prof_id) && (
                                <span className="block text-xs text-mk-gris">avec {profs.get(c.prof_id)}</span>
                              )}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </form>
        )}
      </div>
    </main>
  );
}