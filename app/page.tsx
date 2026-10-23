"use client";

import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, formulaireOuvert, trierCours, appliquerSaison, CENTRES, COMMUN, coursDuCentre, inscriptionsDuCentre, type Cours, type Inscription, type Prof, type Reglages } from "@/lib/supabase";
import { Etat } from "@/components/Entete";
import LogoMarkadas from "@/components/LogoMarkadas";
import Connexion from "@/components/admin/Connexion";
import ReglagesGala from "@/components/admin/ReglagesGala";
import GestionCours from "@/components/admin/GestionCours";
import Profs from "@/components/admin/Profs";
import Inscriptions from "@/components/admin/Inscriptions";
import ParCours from "@/components/admin/ParCours";
import OrdrePassage from "@/components/admin/OrdrePassage";

type Onglet = "inscriptions" | "parcours" | "cours" | "ordre" | "profs" | "reglages";

// Supabase renvoie 1000 lignes maximum par requête : on charge par paquets
async function chargerInscriptions(): Promise<Inscription[]> {
  const toutes: Inscription[] = [];
  for (let debut = 0; ; debut += 1000) {
    const { data, error } = await supabase
      .from("gala_inscriptions")
      .select("*, gala_inscriptions_cours(cours_id)")
      .order("created_at")
      .range(debut, debut + 999);
    if (error) throw error;
    for (const r of data ?? []) {
      const { gala_inscriptions_cours: liens, ...ins } = r as Inscription & { gala_inscriptions_cours: { cours_id: string }[] };
      toutes.push({ ...ins, cours: (liens ?? []).map((l) => l.cours_id) });
    }
    if (!data || data.length < 1000) break;
  }
  return toutes;
}

export default function AdminGala() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [onglet, setOnglet] = useState<Onglet>("inscriptions");
  const [reglages, setReglages] = useState<Reglages | null>(null);
  const [cours, setCours] = useState<Cours[]>([]);
  const [profs, setProfs] = useState<Prof[]>([]);
  const [inscriptions, setInscriptions] = useState<Inscription[]>([]);
  const [erreur, setErreur] = useState("");
  // Centre affiché (Bron / Saint-Priest), retenu d'une visite à l'autre
  const [slugCentre, setSlugCentre] = useState("bron");
  useEffect(() => {
    try {
      const s = localStorage.getItem("mk-centre");
      if (s && CENTRES.some((c) => c.slug === s)) setSlugCentre(s);
    } catch {}
  }, []);
  function choisirCentre(slug: string) {
    setSlugCentre(slug);
    try {
      localStorage.setItem("mk-centre", slug);
    } catch {}
  }

  // Couleurs de la saison dès l'écran de connexion
  useEffect(() => {
    supabase.from("gala_reglages").select("saison").eq("id", 1).maybeSingle().then(({ data }) => appliquerSaison(data?.saison));
  }, []);

  // Session de l'admin (connexion par email + mot de passe Supabase)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const charger = useCallback(async () => {
    try {
      const [r, c, p, i] = await Promise.all([
        supabase.from("gala_reglages").select("*").eq("id", 1).maybeSingle(),
        supabase.from("gala_cours").select("*"),
        supabase.from("gala_profs").select("*").order("nom"),
        chargerInscriptions(),
      ]);
      setReglages(r.data);
      appliquerSaison(r.data?.saison);
      setCours(trierCours(c.data ?? []));
      setProfs(p.data ?? []);
      setInscriptions(i);
      setErreur("");
    } catch (e) {
      setErreur((e as Error).message);
    }
  }, []);

  useEffect(() => {
    if (session) charger();
  }, [session, charger]);

  if (session === undefined) return <Etat texte="Chargement…" />;
  if (!session) return <Connexion />;

  const ouvert = formulaireOuvert(reglages);
  const dateLimite = reglages?.date_limite ? new Date(reglages.date_limite) : null;
  const detailEtat = ouvert
    ? dateLimite
      ? `jusqu'au ${dateLimite.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} à ${dateLimite.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`
      : "sans date limite"
    : reglages?.formulaire_ouvert && dateLimite
      ? "date limite dépassée"
      : "les familles ne peuvent pas s'inscrire";
  const centre = CENTRES.find((c) => c.slug === slugCentre) ?? CENTRES[0];
  const coursC = coursDuCentre(cours, centre);
  const inscritsC = inscriptionsDuCentre(inscriptions, cours, centre);
  const titreGala = reglages?.titre || "Gala Markadas";
  // Profs de l'école affichée : ceux qui ont au moins un cours ici (ou un cours commun).
  // Un prof sans aucun cours reste visible des deux côtés (sinon on ne le retrouverait plus).
  const profsC = profs.filter((p) => {
    const ses = cours.filter((c) => c.prof_id === p.id);
    return !ses.length || ses.some((c) => c.lieu === centre.nom || c.lieu === COMMUN);
  });

  const onglets: { id: Onglet; label: string; icone: string; info?: number; centre: boolean }[] = [
    { id: "inscriptions", label: "Inscrits", icone: "👥", info: inscritsC.length, centre: true },
    { id: "parcours", label: "Inscrits par cours", icone: "📋", centre: true },
    { id: "cours", label: "Cours", icone: "🩰", info: coursC.length, centre: true },
    { id: "ordre", label: "Ordre de passage", icone: "🎬", centre: true },
    { id: "profs", label: "Profs", icone: "🎓", info: profsC.length, centre: true },
    { id: "reglages", label: "Réglages", icone: "⚙️", centre: false },
  ];
  const actif = onglets.find((o) => o.id === onglet)!;

  return (
    <div className="flex min-h-screen">
      {/* ───── Barre latérale ───── */}
      <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-mk-ligne bg-mk-noir">
        <div className="flex items-center gap-3 border-b border-mk-ligne p-4">
          <LogoMarkadas className="h-10 w-10 shrink-0 text-mk-rouge" />
          <div className="min-w-0">
            <p className="mk-titre truncate leading-tight" title={titreGala}>{titreGala}</p>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-mk-gris">Administration</p>
          </div>
        </div>

        {/* État des formulaires : bien visible, cliquable pour aller l'ouvrir / fermer */}
        <div className="border-b border-mk-ligne p-3">
          <button
            onClick={() => setOnglet("reglages")}
            title="Ouvrir / fermer les formulaires dans Réglages"
            className={`w-full rounded-lg px-3 py-3 text-left text-white shadow-lg transition hover:brightness-110 ${
              ouvert ? "bg-ok shadow-ok/20" : "bg-red-600 shadow-red-600/20"
            }`}
          >
            <span className="flex items-center gap-2">
              {ouvert ? (
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-white" />
                </span>
              ) : (
                <span className="text-base leading-none">🔒</span>
              )}
              <span className="text-[11px] font-bold uppercase tracking-widest opacity-90">Inscriptions</span>
            </span>
            <span className="mt-0.5 block text-xl font-extrabold uppercase tracking-wide">{ouvert ? "Ouvertes" : "Fermées"}</span>
            <span className="block text-xs opacity-90">{detailEtat}</span>
          </button>
        </div>

        {/* Centre affiché */}
        <div className="space-y-1 border-b border-mk-ligne p-3">
          <p className="px-1 text-[10px] font-bold uppercase tracking-widest text-mk-gris">École</p>
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-mk-carte p-1">
            {CENTRES.map((c) => (
              <button
                key={c.slug}
                onClick={() => choisirCentre(c.slug)}
                className={`rounded-md py-1.5 text-xs font-extrabold uppercase tracking-wide transition ${
                  c.slug === centre.slug ? "bg-mk-rouge text-mk-noir" : "text-mk-gris hover:text-mk-texte"
                }`}
              >
                {c.nom}
              </button>
            ))}
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {onglets.map((o, i) => (
            <div key={o.id}>
              {i > 0 && o.centre !== onglets[i - 1].centre && (
                <p className="px-2 pb-1 pt-4 text-[10px] font-bold uppercase tracking-widest text-mk-gris">Commun aux 2 écoles</p>
              )}
              <button
                onClick={() => setOnglet(o.id)}
                className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-bold transition ${
                  onglet === o.id ? "bg-mk-rouge text-mk-noir" : "text-mk-gris hover:bg-mk-carte hover:text-mk-texte"
                }`}
              >
                <span className="w-5 text-center">{o.icone}</span>
                <span className="flex-1">{o.label}</span>
                {o.info !== undefined && (
                  <span className={`rounded px-1.5 text-xs ${onglet === o.id ? "bg-mk-noir/15" : "bg-mk-carte2"}`}>{o.info}</span>
                )}
              </button>
            </div>
          ))}
        </nav>

        <div className="space-y-2 border-t border-mk-ligne p-3">
          <button onClick={() => supabase.auth.signOut()} className="mk-btn mk-btn-contour w-full py-1.5 text-xs">
            Déconnexion
          </button>
        </div>
      </aside>

      {/* ───── Contenu ───── */}
      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-mk-ligne bg-mk-fond/90 px-8 py-4 backdrop-blur">
          <h1 className="mk-titre text-2xl">
            {actif.label}
            {actif.centre && <span className="text-mk-rouge"> · {centre.nom}</span>}
          </h1>
          <button
            onClick={() => setOnglet("reglages")}
            title="Ouvrir / fermer les formulaires dans Réglages"
            className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-extrabold uppercase tracking-wide text-white ${
              ouvert ? "bg-ok" : "bg-red-600"
            }`}
          >
            {ouvert ? "● Inscriptions ouvertes" : "🔒 Inscriptions fermées"}
          </button>
        </header>
        <div className="space-y-4 px-8 py-6">
          {erreur && <p className="mk-carte text-red-300">Erreur : {erreur}</p>}
          {onglet === "inscriptions" && <Inscriptions inscriptions={inscritsC} cours={cours} onChange={charger} />}
          {onglet === "parcours" && (
            <ParCours key={centre.slug} inscriptions={inscriptions} inscritsCentre={inscritsC} cours={coursC} profs={profs} titre={`${titreGala} - ${centre.nom}`} />
          )}
          {onglet === "cours" && (
            <GestionCours key={centre.slug} cours={coursC} profs={profs} inscriptions={inscriptions} lieuParDefaut={centre.nom} onChange={charger} />
          )}
          {onglet === "ordre" && reglages && (
            <OrdrePassage key={centre.slug} centre={centre} reglages={reglages} cours={coursC} inscriptions={inscriptions} titre={titreGala} />
          )}
          {onglet === "profs" && <Profs profs={profsC} cours={cours} centre={centre} onChange={charger} />}
          {onglet === "reglages" && reglages && <ReglagesGala reglages={reglages} nbInscrits={inscriptions.length} onChange={charger} />}
        </div>
      </main>
    </div>
  );
}