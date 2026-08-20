"use client";

import { useMemo, useState } from "react";

// Dados de demonstração: na versão conectada, esta lista virá do Supabase.
const initialGuests = [
  { id: 1, name: "Marcos Mendes", drinks: "Chopp", confirmed: true },
  { id: 2, name: "Ana Clara", drinks: "Não bebe", confirmed: true },
  { id: 3, name: "Lucas Rocha", drinks: "Lata", confirmed: true },
  { id: 4, name: "Bia Santos", drinks: "Garrafa", confirmed: true },
];

// Distribuição padrão dos 350 g de carne por pessoa.
const meatMix = [
  { name: "Bovina", ratio: 0.4, color: "#ed6a3a" },
  { name: "Linguiça", ratio: 0.25, color: "#f1a33b" },
  { name: "Frango", ratio: 0.2, color: "#efc86c" },
  { name: "Suína", ratio: 0.15, color: "#9bc49c" },
];

type Guest = (typeof initialGuests)[number];

export default function Home() {
  const [guests, setGuests] = useState<Guest[]>(initialGuests);
  const [isInviteOpen, setInviteOpen] = useState(false);
  const [name, setName] = useState("");
  const [drink, setDrink] = useState("Não bebe");
  const [message, setMessage] = useState("");

  // Todos os cálculos são derivados da lista para evitar dados duplicados no estado.
  const totals = useMemo(() => {
    const confirmed = guests.filter((guest) => guest.confirmed);
    const drinkers = confirmed.filter((guest) => guest.drinks !== "Não bebe");
    return { confirmed, drinkers, meatKg: confirmed.length * 0.35 };
  }, [guests]);

  // Impede duplicidade também na interface; o banco terá uma restrição definitiva.
  function addGuest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedName = name.trim().toLocaleLowerCase("pt-BR");
    const exists = guests.some((guest) => guest.name.trim().toLocaleLowerCase("pt-BR") === normalizedName);
    if (!normalizedName || exists) {
      setMessage(exists ? "Esse nome já confirmou presença." : "Digite seu nome completo.");
      return;
    }
    setGuests((current) => [...current, { id: Date.now(), name: name.trim(), drinks: drink, confirmed: true }]);
    setName("");
    setMessage("Presença confirmada. Até lá!");
  }

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#inicio" aria-label="Brasa - início"><span className="brand-mark">B</span><span>BRASA</span></a>
        <nav aria-label="Navegação principal"><a className="active" href="#inicio">Visão geral</a><a href="#convidados">Convidados</a><a href="#planejamento">Planejamento</a></nav>
        <button className="avatar" aria-label="Abrir perfil">MM</button>
      </header>

      <section className="hero" id="inicio">
        <div><span className="eyebrow">CHURRASCO DE SÁBADO</span><h1>Tudo certo para<br />acender a brasa.</h1><p>Organize os convidados, calcule as quantidades e curta o encontro.</p></div>
        <div className="hero-actions"><button className="secondary" onClick={() => setInviteOpen(true)}>Copiar link do convite</button><button className="primary" onClick={() => setInviteOpen(true)}>+ Adicionar pessoa</button></div>
      </section>

      <section className="stats" aria-label="Resumo do churrasco">
        <article><span className="stat-icon coral">●</span><div><b>{totals.confirmed.length}</b><span>confirmados</span></div><small>Meta: 20</small></article>
        <article><span className="stat-icon orange">◆</span><div><b>{totals.meatKg.toFixed(1)} kg</b><span>de carnes</span></div><small>350 g / pessoa</small></article>
        <article><span className="stat-icon green">●</span><div><b>{totals.drinkers.length}</b><span>vão beber</span></div><small>{totals.confirmed.length - totals.drinkers.length} sem álcool</small></article>
        <article><span className="stat-icon yellow">◷</span><div><b>3 dias</b><span>para o evento</span></div><small>Sáb, 23 ago</small></article>
      </section>

      <section className="content-grid" id="planejamento">
        <article className="card meat-card">
          <div className="card-heading"><div><span className="eyebrow">PLANEJAMENTO</span><h2>Distribuição das carnes</h2></div><button className="more" aria-label="Mais opções">•••</button></div>
          <div className="meat-content">
            <div className="donut" data-total={`${totals.meatKg.toFixed(1)} kg`} aria-label={`${totals.meatKg.toFixed(1)} quilos no total`} />
            <div className="legend">{meatMix.map((meat) => <div className="legend-row" key={meat.name}><span className="dot" style={{ background: meat.color }} /><span>{meat.name}</span><b>{(totals.meatKg * meat.ratio).toFixed(2)} kg</b><small>{meat.ratio * 100}%</small></div>)}</div>
          </div>
          <p className="tip"><span>✦</span><strong>Dica da Brasa</strong> A proporção pode ser ajustada ao gosto da turma.</p>
        </article>

        <article className="card drink-card">
          <div className="card-heading"><div><span className="eyebrow">BEBIDAS</span><h2>Estimativa de consumo</h2></div><button className="more" aria-label="Mais opções">•••</button></div>
          <div className="drink-feature"><span className="beer">▥</span><div><small>CHOPP</small><b>{(totals.drinkers.length * 1.5).toFixed(1)} L</b><p>1,5 L por pessoa que bebe</p></div></div>
          <div className="drink-options"><div><span>▣</span><p><b>{totals.drinkers.length * 5} latas</b>350 ml cada</p></div><div><span>⌁</span><p><b>{Math.ceil(totals.drinkers.length * 1.7)} garrafas</b>600 ml cada</p></div></div>
          <p className="drink-note">Escolha uma opção — as quantidades não são somadas.</p>
        </article>
      </section>

      <section className="card guests-card" id="convidados">
        <div className="card-heading"><div><span className="eyebrow">LISTA</span><h2>Quem já confirmou</h2></div><button className="text-button" onClick={() => setInviteOpen(true)}>+ Nova confirmação</button></div>
        <div className="guest-list">{guests.slice(-4).map((guest) => <div key={guest.id}><span className="guest-avatar">{guest.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span><p><b>{guest.name}</b><small>{guest.drinks}</small></p><span className="confirmed">Confirmado</span></div>)}</div>
      </section>

      {isInviteOpen && <div className="modal-backdrop" role="presentation" onMouseDown={() => setInviteOpen(false)}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="invite-title" onMouseDown={(event) => event.stopPropagation()}>
        <button className="close" onClick={() => setInviteOpen(false)} aria-label="Fechar">×</button><span className="eyebrow">CONFIRMAÇÃO SEGURA</span><h2 id="invite-title">Você vem para o churrasco?</h2><p>Seu nome será usado somente para organizar este evento.</p>
        <form onSubmit={addGuest}><label>Nome completo<input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" maxLength={80} placeholder="Ex.: João da Silva" /></label><label>O que você vai beber?<select value={drink} onChange={(event) => setDrink(event.target.value)}><option>Não bebe</option><option>Chopp</option><option>Lata</option><option>Garrafa</option></select></label><button className="primary full" type="submit">Confirmar presença</button>{message && <p className="form-message" role="status">{message}</p>}</form>
        <small className="privacy">🔒 Protegido contra envios duplicados</small>
      </section></div>}
    </main>
  );
}
