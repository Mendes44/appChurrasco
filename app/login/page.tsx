// Página pública de entrada. A autenticação efetiva acontece pelo Supabase.
import { ADMIN_EMAIL } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { LoginButton } from "./LoginButton";
import Image from "next/image";

export default function LoginPage() {
  const configured = isSupabaseConfigured();
  return <main className="public-shell"><section className="auth-card"><Image className="entry-logo" src="/braza-logo.png" alt="Churrasqueira e cerveja" width={180} height={180}/><span className="eyebrow">PAINEL DO ORGANIZADOR</span><h1>Bem-vindo ao Braza</h1><p>Entre com sua conta Google para gerenciar eventos, convidados e compras.</p>{configured ? <LoginButton /> : <div className="setup-notice"><b>Configuração pendente</b><span>Adicione as variáveis do Supabase para ativar o login.</span></div>}<small>Acesso protegido para {ADMIN_EMAIL}</small></section></main>;
}
