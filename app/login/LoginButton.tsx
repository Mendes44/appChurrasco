"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

export function LoginButton() {
  const [error, setError] = useState("");

  async function signIn() {
    setError("");
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/painel` },
    });
    if (authError) setError("Não foi possível iniciar o login. Tente novamente.");
  }

  return <><button className="google-button" onClick={signIn}><span>G</span> Continuar com Google</button>{error && <p className="form-error">{error}</p>}</>;
}
