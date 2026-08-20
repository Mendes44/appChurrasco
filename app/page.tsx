import Link from "next/link";

// A entrada do sistema não revela dados do evento nem a área administrativa.
export default function Home() {
  return (
    <main className="public-shell">
      <section className="landing-card">
        <span className="brand-mark large">B</span>
        <span className="eyebrow">PLANEJAMENTO SIMPLES</span>
        <h1>Churrasco organizado,<br />do convite à brasa.</h1>
        <p>Confirmações, carnes e bebidas em um só lugar.</p>
        <Link className="primary link-button" href="/login">Acessar painel</Link>
      </section>
    </main>
  );
}
