import { Suspense } from "react";
import { notFound } from "next/navigation";
import FormulaireGala from "@/components/FormulaireGala";
import { Etat } from "@/components/Entete";
import { centreDepuisSlug } from "@/lib/supabase";

// Formulaire d'un centre : /formulaire/bron ou /formulaire/saint-priest
type Params = Promise<{ centre: string }>;

export default function PageFormulaire({ params }: { params: Params }) {
  return (
    <Suspense fallback={<Etat texte="Chargement…" />}>
      <Contenu params={params} />
    </Suspense>
  );
}

async function Contenu({ params }: { params: Params }) {
  const { centre } = await params;
  const c = centreDepuisSlug(centre);
  if (!c) notFound();
  return <FormulaireGala centre={c} />;
}