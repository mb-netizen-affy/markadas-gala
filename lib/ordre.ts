// ───────── Ordre de passage du gala ─────────
// Règles (demandées par Yoan) :
//  • La Team Show fait l'intro, la dernière danse avant l'entracte et la dernière du show.
//  • L'entracte coupe les autres danses en 2, la 1re partie est la plus longue si c'est impair.
//  • Un danseur doit avoir au moins « ecart » danses entre deux de ses passages (2 par défaut).
//    L'entracte laisse le temps de se changer : on ne compte pas d'écart à travers l'entracte.
import { normaliser } from "./texte";
import type { Cours, Inscription } from "./supabase";

export type Ligne = { t: "danse"; id: string } | { t: "entracte" };
export type OrdrePassage = { ecart: number; teamShow: string | null; liste: Ligne[] };

export const ECART_DEFAUT = 2;

// "Team Show", "TEAM-SHOW", "Teamshow"… → c'est la Team Show
export const estTeamShow = (c: Pick<Cours, "nom">) => normaliser(c.nom).includes("teamshow");

// Danseurs de chaque cours : clé = nom+prénom normalisés (une personne inscrite 2 fois = 1 danseur)
export type Danseurs = Map<string, Map<string, string>>;
export function danseursParCours(inscriptions: Inscription[]): Danseurs {
  const res: Danseurs = new Map();
  for (const i of inscriptions) {
    const cle = normaliser(i.nom + i.prenom);
    const libelle = `${i.prenom} ${i.nom.toUpperCase()}`;
    for (const id of i.cours) {
      if (!res.has(id)) res.set(id, new Map());
      res.get(id)!.set(cle, libelle);
    }
  }
  return res;
}

function enCommun(danseurs: Danseurs, a: string, b: string): string[] {
  const da = danseurs.get(a);
  const db = danseurs.get(b);
  if (!da || !db) return [];
  const res: string[] = [];
  for (const [cle, libelle] of da) if (db.has(cle)) res.push(libelle);
  return res.sort((x, y) => x.localeCompare(y));
}

// Conflits : deux danses trop proches (même partie) qui ont des danseurs en commun.
// a et b sont des positions dans la liste.
export type Conflit = { a: number; b: number; danseurs: string[] };
export function conflits(liste: Ligne[], danseurs: Danseurs, ecart: number): Conflit[] {
  const res: Conflit[] = [];
  let partie: number[] = [];
  const verifier = () => {
    for (let i = 0; i < partie.length; i++)
      for (let j = i + 1; j < partie.length && j - i <= ecart; j++) {
        const la = liste[partie[i]] as { id: string };
        const lb = liste[partie[j]] as { id: string };
        const communs = enCommun(danseurs, la.id, lb.id);
        if (communs.length) res.push({ a: partie[i], b: partie[j], danseurs: communs });
      }
  };
  liste.forEach((l, idx) => {
    if (l.t === "entracte") {
      verifier();
      partie = [];
    } else partie.push(idx);
  });
  verifier();
  return res;
}

// Place la Team Show et l'entracte autour d'un ordre des autres danses
function assembler(autres: string[], teamShow: string | null): Ligne[] {
  const d = (id: string): Ligne => ({ t: "danse", id });
  const p1 = Math.ceil(autres.length / 2);
  const ts = teamShow ? [d(teamShow)] : [];
  return [
    ...ts,
    ...autres.slice(0, p1).map(d),
    ...ts,
    { t: "entracte" },
    ...autres.slice(p1).map(d),
    ...ts,
  ];
}

// Génération automatique : on mélange les danses et on améliore l'ordre par petits échanges
// (recuit simulé) pour avoir le moins de conflits possible. Prend quelques millisecondes.
export function generer(cours: Cours[], danseurs: Danseurs, ecart: number, teamShow: string | null): Ligne[] {
  const autres = cours.filter((c) => c.id !== teamShow).map((c) => c.id);
  if (autres.length < 2) return assembler(autres, teamShow);

  // Matrice « nombre de danseurs en commun » (index 0 = Team Show si elle existe)
  const ids = teamShow ? [teamShow, ...autres] : autres;
  const commun = ids.map((a) => ids.map((b) => enCommun(danseurs, a, b).length));
  const p1 = Math.ceil(autres.length / 2);
  const TS = teamShow ? 0 : -1;
  const decalage = teamShow ? 1 : 0;

  // Coût d'un ordre : un conflit compte beaucoup (1000), puis le nombre de danseurs concernés,
  // un peu plus si les deux danses sont collées.
  const sequence = new Int32Array(autres.length + 4);
  function cout(perm: Int32Array) {
    let total = 0;
    const partie = (debut: number, fin: number, avant: boolean, apres: boolean) => {
      let k = 0;
      if (avant) sequence[k++] = TS;
      for (let i = debut; i < fin; i++) sequence[k++] = perm[i];
      if (apres) sequence[k++] = TS;
      for (let i = 0; i < k; i++)
        for (let j = i + 1; j < k && j - i <= ecart; j++) {
          const c = commun[sequence[i]][sequence[j]];
          if (c) total += 1000 + c * (ecart + 1 - (j - i));
        }
    };
    partie(0, p1, TS >= 0, TS >= 0);
    partie(p1, perm.length, false, TS >= 0);
    return total;
  }

  let meilleur: Int32Array | null = null;
  let meilleurCout = Infinity;
  for (let essai = 0; essai < 8 && meilleurCout > 0; essai++) {
    const perm = Int32Array.from({ length: autres.length }, (_, i) => i + decalage);
    for (let i = perm.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [perm[i], perm[j]] = [perm[j], perm[i]];
    }
    let c = cout(perm);
    const etapes = 80000;
    for (let e = 0; e < etapes && c > 0; e++) {
      const temperature = 1500 * Math.pow(0.0005, e / etapes);
      const i = Math.floor(Math.random() * perm.length);
      const j = Math.floor(Math.random() * perm.length);
      if (i === j) continue;
      [perm[i], perm[j]] = [perm[j], perm[i]];
      const c2 = cout(perm);
      if (c2 <= c || Math.random() < Math.exp((c - c2) / temperature)) c = c2;
      else [perm[i], perm[j]] = [perm[j], perm[i]];
    }
    if (c < meilleurCout) {
      meilleurCout = c;
      meilleur = Int32Array.from(perm);
    }
  }
  return assembler(Array.from(meilleur!, (k) => ids[k]), teamShow);
}

// Ajoute des danses oubliées (cours créés après la génération) à la fin, avant le final
export function ajouterALaFin(liste: Ligne[], ids: string[], teamShow: string | null): Ligne[] {
  const nouvelles: Ligne[] = ids.map((id) => ({ t: "danse", id }));
  const dernier = liste[liste.length - 1];
  if (teamShow && dernier?.t === "danse" && dernier.id === teamShow)
    return [...liste.slice(0, -1), ...nouvelles, dernier];
  return [...liste, ...nouvelles];
}