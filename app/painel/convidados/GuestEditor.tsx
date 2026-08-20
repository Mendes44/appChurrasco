"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Guest = { id:string; name:string; companion_name:string|null; party_size:number; drinkers_count:number; brings_own_drink:boolean };

export function GuestEditor({ guests }: { guests: Guest[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Guest|null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!editing) return;
    setSending(true); setMessage("");
    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/convidados/${editing.id}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ name:form.get("name"), companionName:form.get("companionName"), partySize:Number(form.get("partySize")), drinkersCount:Number(form.get("drinkersCount")), bringsOwnDrink:form.get("bringsOwnDrink")==="on" }) });
    const result = await response.json(); setMessage(result.message); setSending(false);
    if (response.ok) { setEditing(null); router.refresh(); }
  }

  async function remove(guest: Guest) {
    if (!confirm(`Excluir a resposta de ${guest.name}?`)) return;
    const response = await fetch(`/api/convidados/${guest.id}`, { method:"DELETE" });
    const result = await response.json(); setMessage(result.message);
    if (response.ok) { setEditing(null); router.refresh(); }
  }

  return <section className="card guest-admin">
    {message && <p className="manager-message" role="status">{message}</p>}
    <div className="guest-management-list">{guests.map((guest) => <article key={guest.id}><div><b>{guest.name}{guest.companion_name?` + ${guest.companion_name}`:""}</b><small>{guest.party_size===0?"Não vai":`${guest.party_size} pessoa(s) · ${guest.drinkers_count} bebem`}</small></div><div className="row-actions"><button className="primary" type="button" onClick={()=>{setEditing(guest);setMessage("")}}>Gerenciar</button><button className="danger-button" type="button" onClick={()=>remove(guest)}>Excluir</button></div></article>)}</div>
    {!guests.length && <p className="empty-row">Nenhuma resposta recebida.</p>}
    {editing && <form className="admin-form edit-response" key={editing.id} onSubmit={save}><span className="eyebrow">GERENCIAR CONVIDADO</span><h2>Editar tudo</h2><label>Nome do titular<input name="name" required minLength={2} maxLength={80} defaultValue={editing.name}/></label><label>Nome do acompanhante<input name="companionName" defaultValue={editing.companion_name??""}/></label><label>Presença e total<select name="partySize" defaultValue={editing.party_size}><option value="0">Não vai</option><option value="1">Vai sozinho</option><option value="2">Vai com acompanhante</option></select></label><label>Quantas pessoas bebem?<select name="drinkersCount" defaultValue={editing.drinkers_count}><option value="0">Nenhuma</option><option value="1">1 pessoa</option><option value="2">2 pessoas</option></select></label><label className="check-label"><input type="checkbox" name="bringsOwnDrink" defaultChecked={editing.brings_own_drink}/> Levará bebida própria</label><div className="form-actions"><button className="primary" disabled={sending}>{sending?"Salvando...":"Salvar alterações"}</button><button type="button" className="secondary" onClick={()=>setEditing(null)}>Cancelar</button></div></form>}
  </section>;
}
