import Link from "next/link";
import Image from "next/image";

// A entrada do sistema não revela dados do evento nem a área administrativa.
export default function Home() {
  return (
    <main className="public-shell">
      <section className="landing-card">
        <Image className="entry-logo" src="/braza-logo.png" alt="Churrasqueira e cerveja" width={220} height={220}/>
        <span className="eyebrow">PLANEJAMENTO SIMPLES</span>
        <h1>Seu churrasco,<br />sem complicação.</h1>
        <p>Crie convites individuais, acompanhe confirmações e leve a lista certa para as compras.</p>
        <Link className="primary link-button" href="/login">Acessar painel</Link>
      </section>
    </main>
  );
}
