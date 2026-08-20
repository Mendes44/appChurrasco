"use client";

import { useState } from "react";

export function InviteForm({ token, guestName, alreadyAnswered }: { token: string; guestName: string; alreadyAnswered: boolean }) {
  const [attending, setAttending] = useState("yes");
  const [hasCompanion, setHasCompanion] = useState(false);
  const [primaryDrinks, setPrimaryDrinks] = useState("yes");
  const [companionDrinks, setCompanionDrinks] = useState("no");
  const [status, setStatus] = useState(alreadyAnswered ? "Este convite já foi respondido." : "");
  const [sending, setSending] = useState(false);
  const someoneDoesNotDrink = primaryDrinks === "no" || (hasCompanion && companionDrinks === "no");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setStatus("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/confirmacao", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
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
  }

  if (alreadyAnswered) return <div className="answered-notice"><b>Resposta já registrada</b><span>Se precisar alterar algo, fale com o organizador.</span></div>;

  return <form className="invite-form" onSubmit={submit}>
    <label>Convite individual<input value={guestName} disabled aria-label="Nome do convidado" /></label>
    <fieldset><legend>Você vai ao churrasco?</legend><div className="choice-row"><label><input type="radio" name="attending" checked={attending === "yes"} onChange={() => setAttending("yes")} /> Sim, eu vou</label><label><input type="radio" name="attending" checked={attending === "no"} onChange={() => setAttending("no")} /> Não vou</label></div></fieldset>
    {attending === "yes" && <fieldset><legend>Vai levar um acompanhante?</legend><div className="choice-row"><label><input type="radio" name="companion" checked={!hasCompanion} onChange={() => setHasCompanion(false)} /> Somente eu</label><label><input type="radio" name="companion" checked={hasCompanion} onChange={() => setHasCompanion(true)} /> Eu + 1</label></div></fieldset>}
    {attending === "yes" && hasCompanion && <label>Nome do acompanhante<input name="companionName" required minLength={2} maxLength={80} placeholder="Nome completo" /></label>}
    {attending === "yes" && <fieldset><legend>{guestName} vai beber?</legend><div className="choice-row"><label><input type="radio" name="primaryDrinks" checked={primaryDrinks === "yes"} onChange={() => setPrimaryDrinks("yes")} /> Sim</label><label><input type="radio" name="primaryDrinks" checked={primaryDrinks === "no"} onChange={() => setPrimaryDrinks("no")} /> Não</label></div></fieldset>}
    {attending === "yes" && hasCompanion && <fieldset><legend>O acompanhante vai beber?</legend><div className="choice-row"><label><input type="radio" name="companionDrinks" checked={companionDrinks === "yes"} onChange={() => setCompanionDrinks("yes")} /> Sim</label><label><input type="radio" name="companionDrinks" checked={companionDrinks === "no"} onChange={() => setCompanionDrinks("no")} /> Não</label></div></fieldset>}
    {attending === "yes" && someoneDoesNotDrink && <fieldset><legend>Quem não beberá levará a bebida que prefere?</legend><div className="choice-row"><label><input type="radio" name="bringsOwnDrink" value="yes" defaultChecked /> Sim, vai levar</label><label><input type="radio" name="bringsOwnDrink" value="no" /> Não precisa</label></div></fieldset>}
    <button className="primary full" disabled={sending}>{sending ? "Enviando..." : "Enviar resposta"}</button>
    {status && <p className="form-message" role="status">{status}</p>}
  </form>;
}
