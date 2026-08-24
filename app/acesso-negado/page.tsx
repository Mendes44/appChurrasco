// Informa que a conta Google autenticada não possui permissão administrativa.
import Link from "next/link";

export default function AccessDenied() {
  return <main className="public-shell"><section className="auth-card"><span className="eyebrow">ACESSO NEGADO</span><h1>Esta conta não tem permissão.</h1><p>Entre com a conta Google autorizada pelo organizador.</p><Link className="primary link-button" href="/login">Voltar ao login</Link></section></main>;
}
