"use client";

import { useState } from "react";

export function InviteForm({ token, guestName, alreadyAnswered, wasAttending, address, eventTitle, eventDate }: { token: string; guestName: string; alreadyAnswered: boolean; wasAttending: boolean; address: string | null; eventTitle: string; eventDate: string }) {
  // Cada resposta representa o titular e, opcionalmente, um acompanhante.
  const [attending, setAttending] = useState("yes");
  const [hasCompanion, setHasCompanion] = useState(false);
  const [primaryDrinks, setPrimaryDrinks] = useState("yes");
  const [companionDrinks, setCompanionDrinks] = useState("no");
  const [status, setStatus] = useState(alreadyAnswered ? "Este convite já foi respondido." : "");
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const someoneDoesNotDrink = primaryDrinks === "no" || (hasCompanion && companionDrinks === "no");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    // O token identifica o convite sem expor dados de outros convidados.
    event.preventDefault();
    setSending(true);
    setStatus("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/confirmacao", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        phone: attending === "yes" ? form.get("phone") : "",
        attending: attending === "yes",
        companionName: attending === "yes" && hasCompanion ? form.get("companionName") : "",
        primaryDrinks: primaryDrinks === "yes",
        companionDrinks: companionDrinks === "yes",
        bringsOwnDrink: form.get("bringsOwnDrink") === "yes",
      }),
    });
    const result = await response.json();
    setStatus(result.message ?? "Não foi possível enviar sua resposta.");
    setSending(false);
    if (response.ok) setSuccess(true);
  }

  const mapsUrl = address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : null;
  // O Google Agenda recebe datas UTC no formato compacto exigido pela URL.
  const calendarStart = new Date(eventDate);
  const calendarEnd = new Date(calendarStart.getTime() + 5 * 60 * 60 * 1000);
  const calendarDate = (date: Date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventTitle)}&dates=${calendarDate(calendarStart)}/${calendarDate(calendarEnd)}&details=${encodeURIComponent("Churrasco organizado pelo Braza.")}&location=${encodeURIComponent(address ?? "Local a confirmar")}`;

  if (success) return <div className="invite-result"><div className="success-icon">✓</div><span className="eyebrow">CONFIRMAÇÃO</span><h2>RESPOSTA ENVIADA<br/>COM SUCESSO!</h2>{attending === "yes" && <><p>Nos vemos em {eventTitle}!</p>{address&&<strong>{address}</strong>}<div className="invite-result-actions">{mapsUrl&&<a className="secondary link-button" href={mapsUrl} target="_blank" rel="noreferrer">Abrir no Google Maps</a>}<a className="primary link-button" href={calendarUrl} target="_blank" rel="noreferrer">Adicionar ao Google Agenda</a></div></>}<small>Para alterar sua resposta, entre em contato com o responsável pelo churrasco.</small></div>;

  if (alreadyAnswered) return <div className="invite-result"><div className="success-icon">✓</div><h2>RESPOSTA JÁ REGISTRADA</h2>{wasAttending&&<><p>Você confirmou presença em {eventTitle}.</p>{address&&<strong>{address}</strong>}<div className="invite-result-actions">{mapsUrl&&<a className="secondary link-button" href={mapsUrl} target="_blank" rel="noreferrer">Abrir no Google Maps</a>}<a className="primary link-button" href={calendarUrl} target="_blank" rel="noreferrer">Adicionar ao Google Agenda</a></div></>}<small>Para alterar sua resposta, entre em contato com o responsável pelo churrasco.</small></div>;

  return <form className="invite-form" onSubmit={submit}>
    <label>Convite individual<input value={guestName} disabled aria-label="Nome do convidado" /></label>
    <fieldset><legend>Você vai ao churrasco?</legend><div className="choice-row"><label><input type="radio" name="attending" checked={attending === "yes"} onChange={() => setAttending("yes")} /> Sim, eu vou</label><label><input type="radio" name="attending" checked={attending === "no"} onChange={() => setAttending("no")} /> Não vou</label></div></fieldset>
    {attending === "yes" && <label>Telefone com DDD<input type="tel" name="phone" required minLength={10} maxLength={20} inputMode="tel" autoComplete="tel" placeholder="(31) 99999-9999" /></label>}
    {attending === "yes" && <fieldset><legend>Vai levar um acompanhante?</legend><div className="choice-row"><label><input type="radio" name="companion" checked={!hasCompanion} onChange={() => setHasCompanion(false)} /> Somente eu</label><label><input type="radio" name="companion" checked={hasCompanion} onChange={() => setHasCompanion(true)} /> Eu + 1</label></div></fieldset>}
    {attending === "yes" && hasCompanion && <label>Nome do acompanhante<input name="companionName" required minLength={2} maxLength={80} placeholder="Nome completo" /></label>}
    {attending === "yes" && <fieldset><legend>{guestName} vai beber?</legend><div className="choice-row"><label><input type="radio" name="primaryDrinks" checked={primaryDrinks === "yes"} onChange={() => setPrimaryDrinks("yes")} /> Sim</label><label><input type="radio" name="primaryDrinks" checked={primaryDrinks === "no"} onChange={() => setPrimaryDrinks("no")} /> Não</label></div></fieldset>}
    {attending === "yes" && hasCompanion && <fieldset><legend>O acompanhante vai beber?</legend><div className="choice-row"><label><input type="radio" name="companionDrinks" checked={companionDrinks === "yes"} onChange={() => setCompanionDrinks("yes")} /> Sim</label><label><input type="radio" name="companionDrinks" checked={companionDrinks === "no"} onChange={() => setCompanionDrinks("no")} /> Não</label></div></fieldset>}
    {attending === "yes" && someoneDoesNotDrink && <fieldset><legend>Quem não beberá levará a bebida que prefere?</legend><div className="choice-row"><label><input type="radio" name="bringsOwnDrink" value="yes" defaultChecked /> Sim, vai levar</label><label><input type="radio" name="bringsOwnDrink" value="no" /> Não precisa</label></div></fieldset>}
    <button className="primary full" disabled={sending}>{sending ? "Enviando..." : "Enviar resposta"}</button>
    {status && <p className="form-message" role="status">{status}</p>}
  </form>;
}
