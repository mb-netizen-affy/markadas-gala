"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase, JOURS, formulaireOuvert, trierCours, COMMUN, appliquerSaison, type Centre, type Cours, type Reglages } from "@/lib/supabase";
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
  }, [centre.nom]);

  const parJour = useMemo(
    () => JOURS.map((j) => ({ jour: j, cours: cours.filter((c) => c.jour === j) })).filter((g) => g.cours.length),
    [cours]
  );

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
    if (!coches.size) return setErreur(MESSAGES_ERREUR.AUCUN_COURS);
    if (!accord) return setErreur("Merci d'accepter l'utilisation de vos données pour l'organisation du gala.");
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
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-mk-rouge">Inscription · {centre.nom}</p>
          </div>
          {ouvert && !confirme && reglages?.date_limite && (
            <p className="text-sm text-mk-gris">
              📅 Inscriptions ouvertes jusqu&apos;au{" "}
              <b className="text-mk-texte">
                {new Date(reglages.date_limite).toLocaleString("fr-FR", { dateStyle: "full", timeStyle: "short" })}
              </b>
            </p>
          )}
        </header>

        {!ouvert ? (
          <div className="mk-carte mx-auto max-w-xl space-y-2 py-10 text-center">
            <p className="text-4xl">🔒</p>
            <p className="mk-titre text-xl">Inscriptions fermées</p>
            <p className="text-mk-gris">{reglages?.message_ferme}</p>
          </div>
        ) : confirme ? (
          <div className="mk-carte mx-auto max-w-xl space-y-4 py-8 text-center">
            <p className="text-5xl">✅</p>
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
                  {champ("nom", "Nom", "text", "family-name")}
                  {champ("prenom", "Prénom", "text", "given-name")}
                  {champ("email", "Email", "email", "email")}
                  {champ("telephone", "Téléphone", "tel", "tel")}
                </div>
              </section>

              <section className="mk-carte order-3 space-y-3 lg:order-none">
                <h2 className="mk-titre text-lg">
                  Cours choisis <span className="text-mk-rouge">{coches.size || ""}</span>
                </h2>
                {choisis.length ? (
                  <ul className="max-h-48 space-y-1 overflow-y-auto text-sm">
                    {choisis.map((c) => (
                      <li key={c.id} className="flex items-center gap-2 rounded bg-mk-carte2 px-2 py-1">
                        <span className="min-w-0 flex-1 truncate">
                          <b>{c.nom}</b> <span className="text-mk-gris">· {c.jour} {c.horaire}</span>
                        </span>
                        <button type="button" onClick={() => basculer(c.id)} className="text-mk-gris hover:text-red-300" title="Retirer">
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-mk-gris">Coche les cours dans le planning.</p>
                )}

                <label className="flex items-start gap-3 text-sm text-mk-gris">
                  <input type="checkbox" checked={accord} onChange={(e) => setAccord(e.target.checked)} className="mt-1 h-4 w-4 shrink-0" />
                  <span>
                    J&apos;accepte que ces informations soient utilisées par les écoles Markadas uniquement pour
                    l&apos;organisation du gala.
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
              <div>
                <h2 className="mk-titre text-lg">Ses cours</h2>
                <p className="text-sm text-mk-gris">Coche tous les cours dans lesquels le danseur participera au gala.</p>
              </div>
              {parJour.length === 0 && <p className="text-mk-gris">Aucun cours n&apos;est encore proposé à {centre.nom}.</p>}
              <div
                className="grid gap-3 lg:[grid-template-columns:repeat(var(--nb-jours),minmax(0,1fr))]"
                style={{ "--nb-jours": parJour.length } as React.CSSProperties}
              >
                {parJour.map((g) => (
                  <div key={g.jour} className="space-y-2">
                    <p className="rounded-md bg-mk-noir px-2 py-1.5 text-center text-sm font-extrabold uppercase tracking-wider text-mk-rouge">
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
                              {c.horaire && <span className="block text-xs font-bold text-mk-rouge">{c.horaire}</span>}
                              <span className="block text-sm font-bold leading-snug">{c.nom}</span>
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