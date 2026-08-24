"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Toast } from "@/components/Toast";

type Invitation = { id:string; guest_name:string; token:string; responded_at:string|null };

export function InviteManager({ eventId, inviteToken, invitations, defaultOpen=false, readOnly=false }: { eventId:string; inviteToken:string; invitations:Invitation[]; defaultOpen?:boolean; readOnly?:boolean }) {
  // Estados locais mantêm o formulário rápido sem recarregar a página inteira.
  const router=useRouter(); const[name,setName]=useState(""); const[message,setMessage]=useState(""); const[sending,setSending]=useState(false); const[createdLink,setCreatedLink]=useState(""); const[isError,setIsError]=useState(false); const[expanded,setExpanded]=useState(defaultOpen);

  async function createInvitation(event:React.FormEvent<HTMLFormElement>){event.preventDefault();setSending(true);const response=await fetch("/api/convites",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({eventId,guestName:name})});const result=await response.json();setMessage(result.message);setIsError(!response.ok);setSending(false);if(response.ok&&result.invitation?.path){setCreatedLink(`${window.location.origin}${result.invitation.path}`);setName("");router.refresh();}}
  // A área de transferência permite compartilhar sem expor outros convites.
  async function copyInvitation(token:string){await navigator.clipboard.writeText(`${window.location.origin}/convite/${token}`);setMessage("Link copiado. Envie somente para esse convidado.");setIsError(false);}

  return <section className="card invitation-card" id="convites"><details className="invite-disclosure" open={expanded} onToggle={(event)=>setExpanded(event.currentTarget.open)}>
    <summary><span><span className="eyebrow">CONVITES INDIVIDUAIS</span><b>Criar e consultar convites</b></span><span className="disclosure-action">{expanded?"Recolher":"Abrir"}</span></summary>
    <div className="invite-disclosure-content"><p>{readOnly?"Evento encerrado: convites disponíveis somente para consulta.":"Crie links individuais e acompanhe quem já respondeu."}</p>
      <div className="general-invite"><span><b>Link geral do evento</b><small>Quem receber poderá cadastrar o próprio nome e um acompanhante.</small></span><button className="primary" type="button" onClick={async()=>{await navigator.clipboard.writeText(`${window.location.origin}/cadastro/${inviteToken}`);setMessage("Link geral copiado.");setIsError(false)}}>Copiar link geral</button></div>
      {!readOnly&&<><form className="invite-create-form" onSubmit={createInvitation}><label>Nome do convidado<input value={name} onChange={(event)=>setName(event.target.value)} required minLength={2} maxLength={80} placeholder="Ex.: Ana Souza"/></label><button className="primary" disabled={sending}>{sending?"Criando...":"Criar convite"}</button></form>
      {createdLink&&<div className="created-link"><input value={createdLink} readOnly aria-label="Link do convite criado"/><button className="primary" type="button" onClick={async()=>{await navigator.clipboard.writeText(createdLink);setMessage("Link copiado. Agora é só enviar ao convidado.")}}>Copiar link</button></div>}</>}
      <div className="invitation-list">{invitations.map((invitation)=><div key={invitation.id}><span><b>{invitation.guest_name}</b><small>{invitation.responded_at?"Respondido":"Aguardando resposta"}</small></span><div className="row-actions"><button className="secondary" type="button" onClick={()=>copyInvitation(invitation.token)}>Copiar link</button></div></div>)}{!invitations.length&&<p className="empty-row">Crie o primeiro convite individual.</p>}</div>
    </div><Toast message={message} error={isError} onClose={()=>setMessage("")} />
  </details></section>;
}
