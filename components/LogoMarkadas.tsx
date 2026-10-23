// Le « M » de Markadas en SVG (calqué sur le logo officiel : 2 jambages épais + 1 trait fin au milieu).
// Il prend la couleur du texte (currentColor) : className="text-mk-rouge" le met en bleu givré.
export default function LogoMarkadas({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="14 11 204 204" className={className} role="img" aria-label="Markadas">
      <g fill="none" stroke="currentColor" strokeLinecap="round">
        <path d="M38.5 170 L82.3 55.8" strokeWidth="44.8" />
        <path d="M93 59.8 L124.4 132.8" strokeWidth="28" />
        <path d="M148.7 56.2 L193 169.8" strokeWidth="45" />
      </g>
    </svg>
  );
}