// Petites icônes au trait (même style partout, prennent la couleur du texte)
const TRACES: Record<string, React.ReactNode> = {
  inscrits: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5" />
      <path d="M16 4.8a3.5 3.5 0 0 1 0 6.4M18.5 14.8c1.7.8 2.7 2.5 3 5.2" />
    </>
  ),
  listes: (
    <>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4V3h6v1M9 10h6M9 14h6M9 18h3" />
    </>
  ),
  cours: (
    <>
      <path d="M9 18V5l11-2v13" />
      <circle cx="6.5" cy="18" r="2.5" />
      <circle cx="17.5" cy="16" r="2.5" />
    </>
  ),
  ordre: (
    <>
      <path d="M10 6h10M10 12h10M10 18h10" />
      <path d="M4 5l1.5-1v5M3.5 13.5c.3-.9 2.5-1.2 2.5.2 0 1-2.5 2-2.5 3.3h2.7" />
    </>
  ),
  profs: (
    <>
      <path d="M2 9l10-5 10 5-10 5z" />
      <path d="M6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5M22 9v6" />
    </>
  ),
  reglages: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" />
    </>
  ),
  imprimer: (
    <>
      <path d="M7 9V3h10v6" />
      <rect x="3" y="9" width="18" height="8" rx="2" />
      <path d="M7 14h10v7H7z" />
    </>
  ),
  telecharger: (
    <>
      <path d="M12 3v12M7 10l5 5 5-5" />
      <path d="M4 17v3h16v-3" />
    </>
  ),
  magie: (
    <>
      <path d="M4 20L15 9M13 7l4 4" />
      <path d="M18 2v4M16 4h4M20 13v3M18.5 14.5h3M8 3v3M6.5 4.5h3" />
    </>
  ),
  reset: (
    <>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 3v6h6" />
    </>
  ),
  calendrier: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  cadenas: (
    <>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </>
  ),
  alerte: (
    <>
      <path d="M12 3l10 18H2z" />
      <path d="M12 10v4M12 17.5v.5" />
    </>
  ),
  ok: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l2.7 2.7L16 9.8" />
    </>
  ),
  poignee: (
    <>
      <circle cx="9" cy="6" r="1" />
      <circle cx="15" cy="6" r="1" />
      <circle cx="9" cy="12" r="1" />
      <circle cx="15" cy="12" r="1" />
      <circle cx="9" cy="18" r="1" />
      <circle cx="15" cy="18" r="1" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  crayon: (
    <>
      <path d="M4 20h4L19 9l-4-4L4 16z" />
      <path d="M13.5 6.5l4 4" />
    </>
  ),
  croix: <path d="M6 6l12 12M18 6L6 18" />,
  recherche: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l5 5" />
    </>
  ),
  copier: (
    <>
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" />
    </>
  ),
  sortie: (
    <>
      <path d="M15 4h4v16h-4M10 12h10M10 12l3-3M10 12l3 3" transform="rotate(180 12 12)" />
    </>
  ),
  flocon: <path d="M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7M9 4l3 2 3-2M9 20l3-2 3 2" />,
  soleil: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
};

export type NomIcone = keyof typeof TRACES;

export default function Icone({ nom, className = "h-4 w-4" }: { nom: NomIcone | string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
    >
      {TRACES[nom]}
    </svg>
  );
}