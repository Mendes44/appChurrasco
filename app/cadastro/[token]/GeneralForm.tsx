"use client";

import { useState } from "react";

type GeneralFormProps = { token:string; eventTitle:string; eventDate:string; address:string|null };

// Formulário do link geral: cada envio aceita o titular e apenas um acompanhante.
export function GeneralForm({ token,eventTitle,eventDate,address }: GeneralFormProps) {
  // attending controla tanto a validação do telefone quanto as perguntas exibidas.
  const [attending,setAttending]=useState(true);
  const [plusOne,setPlusOne]=useState(false);
  const [status,setStatus]=useState("");
  const [sending,setSending]=useState(false);
  const [success,setSuccess]=useState(false);

  async function submit(event:React.FormEvent<HTMLFormElement>){
    // A API repete toda validação porque dados vindos do navegador não são confiáveis.
    event.preventDefault(); setSending(true); setStatus("");
    const form=new FormData(event.currentTarget);
    const response=await fetch("/api/cadastro",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token,name:form.get("name"),phone:attending?form.get("phone"):"",attending,companionName:attending&&plusOne?form.get("companionName"):"",primaryDrinks:attending&&form.get("primaryDrinks")==="yes",companionDrinks:attending&&plusOne&&form.get("companionDrinks")==="yes",bringsOwnDrink:attending&&form.get("bringsOwnDrink")==="yes"})});
    const result=await response.json(); setStatus(result.message??"Não foi possível enviar o cadastro."); setSending(false); if(response.ok)setSuccess(true);
  }

  const mapsUrl=address?`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`:null;
  const calendarStart=new Date(eventDate); const calendarEnd=new Date(calendarStart.getTime()+5*60*60*1000);
  const calendarDate=(date:Date)=>date.toISOString().replace(/[-:]/g,"").replace(/\.\d{3}/,"");
  const calendarUrl=`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventTitle)}&dates=${calendarDate(calendarStart)}/${calendarDate(calendarEnd)}&details=${encodeURIComponent("Churrasco organizado pelo Braza.")}&location=${encodeURIComponent(address??"Local a confirmar")}`;

  if(success)return <div className="invite-result"><div className="success-icon">✓</div><span className="eyebrow">CADASTRO</span><h2>CADASTRO REALIZADO<br/>COM SUCESSO!</h2>{attending?<><p>Obrigado por confirmar. Nos vemos em {eventTitle}!</p>{address&&<strong>{address}</strong>}<div className="invite-result-actions">{mapsUrl&&<a className="secondary link-button" href={mapsUrl} target="_blank" rel="noreferrer">Abrir no Google Maps</a>}<a className="primary link-button" href={calendarUrl} target="_blank" rel="noreferrer">Adicionar ao Google Agenda</a></div></>:<p>Obrigado por responder. Sentiremos sua falta!</p>}<small>Para alterar sua resposta, entre em contato com o responsável pelo churrasco.</small></div>;

  return <form className="invite-form" onSubmit={submit}>
    <label>Seu nome completo<input name="name" required minLength={2} maxLength={80}/></label>
    <fieldset><legend>Você vai?</legend><div className="choice-row"><label><input type="radio" name="attending" checked={attending} onChange={()=>setAttending(true)}/>Sim</label><label><input type="radio" name="attending" checked={!attending} onChange={()=>{setAttending(false);setPlusOne(false)}}/>Não</label></div></fieldset>
    {attending&&<><label>Telefone com DDD<input type="tel" name="phone" required minLength={10} maxLength={20} inputMode="tel" autoComplete="tel" placeholder="(31) 99999-9999"/></label>
    <fieldset><legend>Vai levar acompanhante?</legend><div className="choice-row"><label><input type="radio" name="plusOne" checked={!plusOne} onChange={()=>setPlusOne(false)}/>Somente eu</label><label><input type="radio" name="plusOne" checked={plusOne} onChange={()=>setPlusOne(true)}/>Eu + 1</label></div></fieldset>
    {plusOne&&<label>Nome do acompanhante<input name="companionName" required minLength={2} maxLength={80}/></label>}
    <fieldset><legend>Você vai beber?</legend><div className="choice-row"><label><input type="radio" name="primaryDrinks" value="yes" defaultChecked/>Sim</label><label><input type="radio" name="primaryDrinks" value="no"/>Não</label></div></fieldset>
    {plusOne&&<fieldset><legend>O acompanhante vai beber?</legend><div className="choice-row"><label><input type="radio" name="companionDrinks" value="yes"/>Sim</label><label><input type="radio" name="companionDrinks" value="no" defaultChecked/>Não</label></div></fieldset>}
    <fieldset><legend>Quem não beber levará sua bebida?</legend><div className="choice-row"><label><input type="radio" name="bringsOwnDrink" value="yes" defaultChecked/>Sim</label><label><input type="radio" name="bringsOwnDrink" value="no"/>Não</label></div></fieldset></>}
    <button className="primary full" disabled={sending}>{sending?"Enviando...":"Enviar cadastro"}</button>{status&&<p className="form-message">{status}</p>}
  </form>;
}
