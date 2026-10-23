"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import LogoMarkadas from "@/components/LogoMarkadas";

// L'espace admin contient des emails et téléphones : il est protégé par un compte
// (créé dans Supabase → Authentication → Users → Add user)
export default function Connexion() {
  const [email, setEmail] = useState("");
  const [mdp, setMdp] = useState("");
  const [erreur, setErreur] = useState("");
  const [enCours, setEnCours] = useState(false);

  async function seConnecter(e: React.FormEvent) {
    e.preventDefault();
    setEnCours(true);
    setErreur("");
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: mdp });
    setEnCours(false);
    if (error) setErreur("Email ou mot de passe incorrect.");
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <form onSubmit={seConnecter} className="w-full max-w-sm space-y-5">
        <div className="space-y-2 text-center">
          <LogoMarkadas className="mk-halo-logo mx-auto h-20 w-20 text-mk-rouge" />
          <h1 className="mk-titre text-xl">Administration du gala</h1>
          <p className="text-xs font-semibold uppercase tracking-widest text-mk-gris">Accès réservé</p>
        </div>
        <div className="mk-carte space-y-3">
          <label className="block space-y-1">
            <span className="text-xs font-bold uppercase text-mk-gris">Email</span>
            <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mk-input" />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-bold uppercase text-mk-gris">Mot de passe</span>
            <input type="password" required autoComplete="current-password" value={mdp} onChange={(e) => setMdp(e.target.value)} className="mk-input" />
          </label>
          {erreur && <p className="text-sm font-semibold text-red-300">{erreur}</p>}
          <button type="submit" disabled={enCours} className="mk-btn mk-btn-rouge w-full">
            {enCours ? "Connexion…" : "Se connecter"}
          </button>
        </div>
      </form>
    </main>
  );
}