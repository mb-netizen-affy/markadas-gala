import { Suspense } from "react";
import VueProf from "@/components/VueProf";
import { Etat } from "@/components/Entete";

// Lien personnel d'un prof : /prof/<code>
type Params = Promise<{ code: string }>;

export default function ProfPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<Etat texte="Chargement…" />}>
      <Contenu params={params} />
    </Suspense>
  );
}

async function Contenu({ params }: { params: Params }) {
  const { code } = await params;
  return <VueProf code={code} />;
}