import { createClient } from "@supabase/supabase-js";
import type { OrdrePassage } from "./ordre";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export type Reglages = {
  id: number;
  titre: string;
  formulaire_ouvert: boolean;
  date_limite: string | null; // ISO
  message_ferme: string;
  saison: Saison;
  ordre_passage: Record<string, OrdrePassage> | null; // ordres de passage (clé = "bron", "bron-2", "saint-priest-3"…)
  nb_galas: Record<string, number> | null; // nombre de galas par école (clé = slug), 1 par défaut
};

// ───── Plusieurs galas par école ─────
export const NB_GALAS_MAX = 4;
export const nbGalasDe = (r: Reglages | null, slug: string) =>
  Math.min(NB_GALAS_MAX, Math.max(1, r?.nb_galas?.[slug] ?? 1));
// Les galas choisis pour un cours (on ignore ceux au-delà du nombre de galas actuel)
export const galasDuCours = (c: Pick<Cours, "galas">, nb: number) => (c.galas ?? []).filter((g) => g >= 1 && g <= nb);
// Clé de l'ordre de passage : le gala 1 garde l'ancienne clé ("bron") pour ne rien perdre
export const cleOrdre = (slug: string, gala: number) => (gala === 1 ? slug : `${slug}-${gala}`);

// Saison du gala : hiver = bleu givré, été = orange (voir globals.css)
export type Saison = "hiver" | "ete";
// On garde aussi la saison dans le navigateur : au prochain chargement, les bonnes couleurs
// s'affichent tout de suite (voir le petit script dans app/layout.tsx), sans flash bleu → orange.
export function appliquerSaison(saison: string | null | undefined) {
  if (typeof document === "undefined") return;
  const s = saison === "ete" ? "ete" : "hiver";
  document.documentElement.dataset.saison = s;
  try {
    localStorage.setItem("mk-saison", s);
  } catch {}
}

export type Prof = { id: string; nom: string; code: string };

export type Cours = {
  id: string;
  jour: string;
  nom: string;
  horaire: string;
  lieu: string;
  prof_id: string | null;
  ordre: number;
  galas: number[]; // galas où le cours passe (1, 2…) ; vide = pas encore choisi
  ref?: string | null; // code du cours dans la liste de référence des plannings (c001…)
};

export type Inscription = {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  created_at: string;
  centre: string | null; // formulaire d'origine : "Bron" ou "Saint-Priest"
  cours: string[]; // ids des cours cochés
};

// Les jours proposés dans le formulaire, dans l'ordre d'affichage
export const JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche", "Autres"];
// Les centres qui ont chacun leur formulaire : /formulaire/bron et /formulaire/saint-priest
// ("nom" doit être écrit exactement comme le lieu choisi pour les cours)
export const CENTRES = [
  { slug: "bron", nom: "Bron" },
  { slug: "saint-priest", nom: "Saint-Priest" },
];
export type Centre = (typeof CENTRES)[number];
export const centreDepuisSlug = (slug: string) => CENTRES.find((c) => c.slug === slug.toLowerCase()) ?? null;

// « Commun » : cours partagé par les deux écoles (Team Show…), visible dans les deux formulaires
export const COMMUN = "Commun";

// Lieux proposés pour un cours ("" = pas encore choisi : le cours n'apparaît dans aucun formulaire)
export const LIEUX = ["", ...CENTRES.map((c) => c.nom), COMMUN];

// Regroupe des cours par école : Bron, Saint-Priest, Commun, puis ceux sans centre
export function grouperParEcole<T extends { lieu: string }>(cours: T[]) {
  const ordre = [...CENTRES.map((c) => c.nom), COMMUN];
  const groupes = ordre.map((lieu) => ({ lieu, cours: cours.filter((c) => c.lieu === lieu) }));
  groupes.push({ lieu: "Sans centre", cours: cours.filter((c) => !ordre.includes(c.lieu)) });
  return groupes.filter((g) => g.cours.length);
}

// Les cours d'un centre = les siens + les cours communs
export const coursDuCentre = (cours: Cours[], centre: Centre) =>
  cours.filter((c) => c.lieu === centre.nom || c.lieu === COMMUN);

// Les inscrits d'un centre (anciennes inscriptions sans centre : déduit de leurs cours)
export function inscriptionsDuCentre(inscriptions: Inscription[], cours: Cours[], centre: Centre) {
  const ids = new Set(cours.filter((c) => c.lieu === centre.nom).map((c) => c.id));
  return inscriptions.filter((i) => (i.centre ? i.centre === centre.nom : i.cours.some((id) => ids.has(id))));
}

// Formulaire ouvert = interrupteur sur ON et date limite non dépassée
export function formulaireOuvert(r: Reglages | null) {
  if (!r || !r.formulaire_ouvert) return false;
  return !r.date_limite || new Date(r.date_limite).getTime() > Date.now();
}

// Tri des cours : par jour (ordre de la semaine), puis par heure réelle, puis par nom
// "18h" → 1080, "17h30" → 1050, "9h" → 540, "19:45" → 1185 (minutes). Sans horaire : à la fin du jour.
export function minutes(horaire: string) {
  const m = horaire.match(/(\d{1,2})\s*[h:]\s*(\d{2})?/i);
  return m ? +m[1] * 60 + (m[2] ? +m[2] : 0) : 24 * 60;
}

export function trierCours<T extends Pick<Cours, "jour" | "horaire" | "nom">>(cours: T[]) {
  const rang = (j: string) => (JOURS.indexOf(j) === -1 ? 99 : JOURS.indexOf(j));
  return [...cours].sort(
    (a, b) => rang(a.jour) - rang(b.jour) || minutes(a.horaire) - minutes(b.horaire) || a.nom.localeCompare(b.nom)
  );
}

// Catégorie d'un cours, devinée d'après son nom (pour les filtres du formulaire)
export type Categorie = "enfant" | "ado" | "couple" | "autre";
export function categorieCours(c: Pick<Cours, "nom" | "lieu" | "jour">): Categorie {
  const n = c.nom.toLowerCase();
  if (c.lieu === COMMUN || c.jour === "Autres") return "autre";
  if (/salsa|bachata|kizomba|boogie|west coast|^rock (d[ée]butant|interm|perfect)/.test(n)) return "couple";
  if (/ados|adulte/.test(n)) return "ado";
  if (/kids|\d+\s*-\s*\d+\s*ans|d[èe]s \d+ ans|rock saut|avec les stars/.test(n)) return "enfant";
  return "ado";
}
export const CATEGORIES: { id: Categorie | "tous"; label: string }[] = [
  { id: "tous", label: "Tous les cours" },
  { id: "enfant", label: "Enfants" },
  { id: "ado", label: "Ados / Adultes" },
  { id: "couple", label: "Danses à deux" },
];

// Téléphone français : 10 chiffres commençant par 0, ou +33 suivi de 9 chiffres
export function telephoneValide(t: string) {
  const c = t.replace(/[^\d+]/g, "");
  return /^0\d{9}$/.test(c) || /^\+33\d{9}$/.test(c) || /^0033\d{9}$/.test(c);
}
export const emailValide = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e.trim());

export const libelleCours = (c: Pick<Cours, "jour" | "nom" | "horaire" | "lieu">) =>
  [c.jour, c.nom, c.horaire, c.lieu].filter(Boolean).join(" · ");