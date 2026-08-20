"use client";

import { useState } from "react";

export function InviteForm({ token }: { token: string }) {
  const [attending, setAttending] = useState("yes");
  const [drinks, setDrinks] = useState("yes");
  const [status, setStatus] = useState("");
  const [sending, setSending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setStatus("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/confirmacao", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, name: form.get("name"), attending: attending === "yes", drinks: drinks === "yes", bringsOwnDrink: form.get("bringsOwnDrink") === "yes" }),
    });
    const result = await response.json();
    setStatus(result.message ?? "Não foi possível enviar sua resposta.");
    setSending(false);
    if (response.ok) event.currentTarget.reset();
  }

  return <form className="invite-form" onSubmit={submit}>
    <label>Seu nome completo<input name="name" required minLength={2} maxLength={80} autoComplete="name" placeholder="Digite seu nome" /></label>
    <fieldset><legend>Você vai ao churrasco?</legend><div className="choice-row"><label><input type="radio" name="attending" value="yes" checked={attending === "yes"} onChange={() => setAttending("yes")} /> Sim, eu vou</label><label><input type="radio" name="attending" value="no" checked={attending === "no"} onChange={() => setAttending("no")} /> Não vou</label></div></fieldset>
    {attending === "yes" && <fieldset><legend>Você vai beber?</legend><div className="choice-row"><label><input type="radio" name="drinks" value="yes" checked={drinks === "yes"} onChange={() => setDrinks("yes")} /> Sim</label><label><input type="radio" name="drinks" value="no" checked={drinks === "no"} onChange={() => setDrinks("no")} /> Não</label></div></fieldset>}
    {attending === "yes" && drinks === "no" && <fieldset><legend>Você levará a bebida que prefere?</legend><div className="choice-row"><label><input type="radio" name="bringsOwnDrink" value="yes" defaultChecked /> Sim, vou levar</label><label><input type="radio" name="bringsOwnDrink" value="no" /> Não precisa</label></div></fieldset>}
    <button className="primary full" disabled={sending}>{sending ? "Enviando..." : "Enviar resposta"}</button>
    {status && <p className="form-message" role="status">{status}</p>}
  </form>;
}
