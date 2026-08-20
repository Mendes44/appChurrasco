import { ADMIN_EMAIL } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { LoginButton } from "./LoginButton";

export default function LoginPage() {
  const configured = isSupabaseConfigured();
  return <main className="public-shell"><section className="auth-card"><span className="brand-mark large">B</span><span className="eyebrow">ÁREA PRIVADA</span><h1>Acesse seu painel</h1><p>Somente o organizador autorizado pode visualizar convidados e quantidades.</p>{configured ? <LoginButton /> : <div className="setup-notice"><b>Configuração pendente</b><span>Adicione as variáveis do Supabase para ativar o login.</span></div>}<small>Acesso permitido exclusivamente para {ADMIN_EMAIL}</small></section></main>;
}
