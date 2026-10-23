import * as XLSX from "xlsx";
import { trierCours, type Cours, type Inscription, type Prof } from "./supabase";

const nomFeuille = (s: string) => s.replace(/[[\]:*?/\\]/g, " ").slice(0, 31) || "Feuille";

const triNom = (a: Inscription, b: Inscription) => a.nom.localeCompare(b.nom) || a.prenom.localeCompare(b.prenom);

// Classeur complet : 1 feuille « Tous les inscrits » + 1 feuille par cours
// (pourCours : inscriptions utilisées pour les feuilles des cours, ex. les 2 écoles pour la Team Show)
export function exporterTout(inscriptions: Inscription[], cours: Cours[], profs: Prof[], titre: string, pourCours = inscriptions) {
  const wb = XLSX.utils.book_new();
  const nomCours = new Map(cours.map((c) => [c.id, `${c.jour} – ${c.nom}`]));

  const tous = [...inscriptions].sort(triNom).map((i) => ({
    Nom: i.nom,
    Prénom: i.prenom,
    Email: i.email,
    Téléphone: i.telephone,
    "Nb cours": i.cours.length,
    Cours: i.cours.map((id) => nomCours.get(id) ?? "?").join(" ; "),
    "Inscrit le": new Date(i.created_at).toLocaleString("fr-FR"),
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(tous), "Tous les inscrits");

  const pris = new Set(["Tous les inscrits"]);
  for (const c of trierCours(cours)) {
    let nom = nomFeuille(`${c.jour.slice(0, 3)} ${c.nom}`);
    for (let n = 2; pris.has(nom); n++) nom = nomFeuille(`${c.jour.slice(0, 3)} ${c.nom}`.slice(0, 27) + ` ${n}`);
    pris.add(nom);
    XLSX.utils.book_append_sheet(wb, feuilleCours(c, pourCours, profs), nom);
  }
  XLSX.writeFile(wb, `${titre.replace(/[^\w\- ]/g, "")} - inscriptions.xlsx`);
}

function feuilleCours(c: Cours, inscriptions: Inscription[], profs: Prof[]) {
  const prof = profs.find((p) => p.id === c.prof_id)?.nom ?? "";
  const liste = inscriptions.filter((i) => i.cours.includes(c.id)).sort(triNom);
  return XLSX.utils.aoa_to_sheet([
    [`${c.jour} – ${c.nom}`, [c.horaire, c.lieu, prof && `Prof : ${prof}`].filter(Boolean).join(" · ")],
    [`${liste.length} inscrit${liste.length > 1 ? "s" : ""}`],
    [],
    ["Nom", "Prénom", "Email", "Téléphone"],
    ...liste.map((i) => [i.nom, i.prenom, i.email, i.telephone]),
  ]);
}

// Un seul cours (pour l'envoyer à un prof)
export function exporterCours(c: Cours, inscriptions: Inscription[], profs: Prof[]) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, feuilleCours(c, inscriptions, profs), nomFeuille(c.nom));
  XLSX.writeFile(wb, `Gala - ${c.jour} - ${c.nom.replace(/[^\w\- ]/g, "")}.xlsx`);
}

// Feuille imprimable d'un cours : liste des danseurs
export function imprimerCours(c: Cours, inscriptions: Inscription[], profs: Prof[], titre: string) {
  const prof = profs.find((p) => p.id === c.prof_id)?.nom ?? "";
  const liste = inscriptions.filter((i) => i.cours.includes(c.id)).sort(triNom);
  const e = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const lignes = liste
    .map((i, n) => `<tr><td>${n + 1}</td><td><b>${e(i.nom)}</b></td><td>${e(i.prenom)}</td><td>${e(i.telephone)}</td><td>${e(i.email)}</td></tr>`)
    .join("");
  // couleur de la saison en cours (bleu l'hiver, jaune doré l'été)
  const accent = document.documentElement.dataset.saison === "ete" ? "#d9a400" : "#2a86c2";
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${e(c.nom)}</title>
<style>
  @page { size: A4; margin: 14mm; }
  body { font-family: Arial, sans-serif; color: #111; }
  .marque { color: ${accent}; font-weight: 800; letter-spacing: .08em; font-size: 12px; }
  h1 { margin: 2px 0; font-size: 26px; text-transform: uppercase; }
  .infos { color: #444; margin-bottom: 14px; border-bottom: 4px solid ${accent}; padding-bottom: 8px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { border-bottom: 1px solid #ccc; padding: 6px 4px; text-align: left; }
  th { font-size: 11px; text-transform: uppercase; color: #555; }
  td:first-child { color: #888; width: 28px; }
</style></head><body>
  <div class="marque">MARKADAS · ${e(titre)}</div>
  <h1>${e(c.jour)} · ${e(c.nom)}</h1>
  <div class="infos">${e([c.horaire, c.lieu, prof && `Prof : ${prof}`].filter(Boolean).join(" · "))} — <b>${liste.length} inscrit${liste.length > 1 ? "s" : ""}</b></div>
  <table><thead><tr><th>#</th><th>Nom</th><th>Prénom</th><th>Téléphone</th><th>Email</th></tr></thead><tbody>${lignes}</tbody></table>
  <script>window.onload = () => setTimeout(() => window.print(), 300);</script>
</body></html>`;
  const f = window.open("", "_blank");
  if (!f) return alert("Autorise les fenêtres pop-up pour ce site, puis réessaie.");
  f.document.open();
  f.document.write(html);
  f.document.close();
}