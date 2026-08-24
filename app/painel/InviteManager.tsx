"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Invitation = { id:string; guest_name:string; token:string; responded_at:string|null };

export function InviteManager({ eventId, invitations, defaultOpen=false }: { eventId:string; invitations:Invitation[]; defaultOpen?:boolean }) {
  const router=useRouter(); const[name,setName]=useState(""); const[message,setMessage]=useState(""); const[sending,setSending]=useState(false); const[createdLink,setCreatedLink]=useState(""); const[isError,setIsError]=useState(false); const[expanded,setExpanded]=useState(defaultOpen);

  async function createInvitation(event:React.FormEvent<HTMLFormElement>){event.preventDefault();setSending(true);const response=await fetch("/api/convites",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({eventId,guestName:name})});const result=await response.json();setMessage(result.message);setIsError(!response.ok);setSending(false);if(response.ok&&result.invitation?.path){setCreatedLink(`${window.location.origin}${result.invitation.path}`);setName("");router.refresh();}}
  async function copyInvitation(token:string){await navigator.clipboard.writeText(`${window.location.origin}/convite/${token}`);setMessage("Link copiado. Envie somente para esse convidado.");setIsError(false);}

  return <section className="card invitation-card" id="convites"><details className="invite-disclosure" open={expanded} onToggle={(event)=>setExpanded(event.currentTarget.open)}>
    <summary><span><span className="eyebrow">CONVITES INDIVIDUAIS</span><b>Criar e consultar convites</b></span><span className="disclosure-action">{expanded?"Recolher":"Abrir"}</span></summary>
    <div className="invite-disclosure-content"><p>Crie links individuais e acompanhe quem já respondeu.</p>
      <form className="invite-create-form" onSubmit={createInvitation}><label>Nome do convidado<input value={name} onChange={(event)=>setName(event.target.value)} required minLength={2} maxLength={80} placeholder="Ex.: Ana Souza"/></label><button className="primary" disabled={sending}>{sending?"Criando...":"Criar convite"}</button></form>
      {message&&<p className={`manager-message${isError?" is-error":""}`} role="status">{message}</p>}
      {createdLink&&<div className="created-link"><input value={createdLink} readOnly aria-label="Link do convite criado"/><button className="primary" type="button" onClick={async()=>{await navigator.clipboard.writeText(createdLink);setMessage("Link copiado. Agora é só enviar ao convidado.")}}>Copiar link</button></div>}
      <div className="invitation-list">{invitations.map((invitation)=><div key={invitation.id}><span><b>{invitation.guest_name}</b><small>{invitation.responded_at?"Respondido":"Aguardando resposta"}</small></span><div className="row-actions"><button className="secondary" type="button" onClick={()=>copyInvitation(invitation.token)}>Copiar link</button></div></div>)}{!invitations.length&&<p className="empty-row">Crie o primeiro convite individual.</p>}</div>
    </div>
  </details></section>;
}
