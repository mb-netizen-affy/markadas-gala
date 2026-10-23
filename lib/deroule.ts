import * as XLSX from "xlsx";

// Déroulé du gala : uniquement N° + Ballet, en 2 parties (Yoan ajoute ensuite le jour et le timing)
export type Partie = { numero: number; ballet: string }[];

const n2 = (n: number) => String(n).padStart(2, "0");
const nomPartie = (i: number) => `PARTIE ${i === 0 ? "I" : "II"}.`;
const propre = (s: string) => s.replace(/[^\w\- ]/g, "").trim();

export function exporterDeroule(parties: Partie[], titre: string) {
  const lignes: (string | number)[][] = [];
  parties.forEach((p, i) => {
    if (i > 0) lignes.push([]);
    lignes.push([nomPartie(i)]);
    lignes.push(["N°", "BALLET"]);
    for (const l of p) lignes.push([n2(l.numero), l.ballet]);
  });
  const ws = XLSX.utils.aoa_to_sheet(lignes);
  ws["!cols"] = [{ wch: 6 }, { wch: 55 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Déroulé");
  XLSX.writeFile(wb, `Déroulé - ${propre(titre)}.xlsx`);
}

// Feuille A4 dans le style du déroulé papier (bandeau gris par partie, tableau encadré)
export function imprimerDeroule(parties: Partie[], titre: string) {
  const e = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const blocs = parties
    .map(
      (p, i) => `
  <div class="partie">${nomPartie(i)}</div>
  <table>
    <thead><tr><th class="num">N°</th><th>BALLET</th></tr></thead>
    <tbody>${p.map((l) => `<tr><td class="num">${n2(l.numero)}</td><td>${e(l.ballet)}</td></tr>`).join("")}</tbody>
  </table>`
    )
    .join("");
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Déroulé - ${e(titre)}</title>
<style>
  @page { size: A4; margin: 12mm; }
  body { font-family: "Times New Roman", serif; color: #000; }
  h1 { font-size: 16px; text-align: center; margin: 0 0 10px; }
  .partie { border: 1.5px solid #000; background: #d9d9d9; text-align: center; font-weight: bold;
            padding: 3px; margin: 14px 0 6px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; page-break-inside: auto; }
  tr { page-break-inside: avoid; }
  th, td { border: 1px solid #000; padding: 2px 6px; }
  th { font-size: 13px; }
  .num { width: 40px; text-align: center; font-weight: bold; }
</style></head><body>
  <h1>${e(titre)}</h1>${blocs}
  <script>window.onload = () => setTimeout(() => window.print(), 300);</script>
</body></html>`;
  const f = window.open("", "_blank");
  if (!f) return alert("Autorise les fenêtres pop-up pour ce site, puis réessaie.");
  f.document.open();
  f.document.write(html);
  f.document.close();
}