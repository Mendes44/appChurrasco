"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

export type Expense = { id:string; description:string; category:"general"|"beer"; amount_cents:number; receipt_url:string|null };
export type FinanceGuest = { id:string; name:string; phone:string|null; party_size:number; drinkers_count:number; is_attending:boolean; attended:boolean|null };

const money = (cents:number) => new Intl.NumberFormat("pt-BR", { style:"currency", currency:"BRL" }).format(cents/100);

// Reduz a foto no navegador para economizar armazenamento e transferência.
async function compressReceipt(file: File) {
  if (file.size <= 450_000) return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas"); canvas.width = Math.round(bitmap.width*scale); canvas.height = Math.round(bitmap.height*scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
  const blob = await new Promise<Blob|null>((resolve)=>canvas.toBlob(resolve,"image/jpeg",.78));
  if (!blob) throw new Error("compression_failed");
  return new File([blob], `${file.name.replace(/\.[^.]+$/,"")}.jpg`, { type:"image/jpeg" });
}

export function FinanceManager({ eventId, eventTitle, expenses, guests }: { eventId:string; eventTitle:string; expenses:Expense[]; guests:FinanceGuest[] }) {
  const router = useRouter(); const [message,setMessage]=useState(""); const [sending,setSending]=useState(false);
  // Até a conferência real ser feita, a confirmação do convite funciona como previsão.
  const attending = guests.filter((guest)=>guest.attended ?? guest.is_attending);
  const people = attending.reduce((sum,guest)=>sum+guest.party_size,0);
  const drinkers = attending.reduce((sum,guest)=>sum+guest.drinkers_count,0);
  const generalTotal = expenses.filter((item)=>item.category==="general").reduce((sum,item)=>sum+item.amount_cents,0);
  const beerTotal = expenses.filter((item)=>item.category==="beer").reduce((sum,item)=>sum+item.amount_cents,0);
  const generalPerPerson = people ? generalTotal/people : 0;
  const beerPerDrinker = drinkers ? beerTotal/drinkers : 0;
  const charges = useMemo(()=>attending.map((guest)=>({ ...guest, cents:Math.round(generalPerPerson*guest.party_size+beerPerDrinker*guest.drinkers_count) })),[attending,generalPerPerson,beerPerDrinker]);

  async function add(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSending(true); setMessage("");
    const formElement=event.currentTarget; const form=new FormData(formElement); form.set("eventId",eventId);
    const receipt=form.get("receipt");
    try { if(receipt instanceof File&&receipt.size) form.set("receipt",await compressReceipt(receipt)); }
    catch { setMessage("Não foi possível compactar a imagem."); setSending(false); return; }
    const response=await fetch("/api/despesas",{method:"POST",body:form}); const result=await response.json(); setMessage(result.message); setSending(false);
    if(response.ok){formElement.reset();router.refresh();}
  }
  async function remove(id:string){if(!confirm("Excluir esta despesa e seu comprovante?"))return;const response=await fetch(`/api/despesas/${id}`,{method:"DELETE"});const result=await response.json();setMessage(result.message);if(response.ok)router.refresh();}
  function whatsapp(guest:FinanceGuest&{cents:number}){if(!guest.phone)return null;let digits=guest.phone.replace(/\D/g,"");if(digits.length<=11)digits=`55${digits}`;const text=`Olá, ${guest.name}! O rateio do ${eventTitle} ficou em ${money(guest.cents)} para você${guest.party_size>1?" e seu acompanhante":""}. Despesas gerais: ${money(generalPerPerson)} por pessoa${guest.drinkers_count?`; cerveja: ${money(beerPerDrinker)} por pessoa que bebeu`:""}.`;return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;}

  return <>
    <section className="finance-summary">
      <article><small>Total gasto</small><b>{money(generalTotal+beerTotal)}</b></article><article><small>Despesas gerais</small><b>{money(generalTotal)}</b><span>{people?`${money(Math.round(generalPerPerson))} por pessoa`:"Sem confirmados"}</span></article><article><small>Cerveja</small><b>{money(beerTotal)}</b><span>{drinkers?`${money(Math.round(beerPerDrinker))} por pessoa que bebeu`:"Sem pessoas que bebem"}</span></article>
    </section>
    <section className="finance-grid">
      <article className="card"><span className="eyebrow">NOVA DESPESA</span><h2>Registrar compra</h2><form className="admin-form" onSubmit={add}><label>Descrição<input name="description" required minLength={2} maxLength={120} placeholder="Ex.: Compra no açougue"/></label><label>Tipo de rateio<select name="category" defaultValue="general"><option value="general">Geral — dividir entre todos</option><option value="beer">Cerveja — somente quem bebeu</option></select></label><label>Valor pago<input type="number" name="amount" required min="0.01" step="0.01" placeholder="0,00"/></label><label>Foto do comprovante (opcional)<input type="file" name="receipt" accept="image/jpeg,image/png,image/webp"/></label><small className="field-help">A imagem é compactada e armazenada de forma privada.</small><button className="primary" disabled={sending}>{sending?"Salvando...":"Adicionar despesa"}</button>{message&&<p className="manager-message">{message}</p>}</form></article>
      <article className="card"><div className="card-heading"><div><span className="eyebrow">COMPROVANTES</span><h2>Despesas registradas</h2></div></div><div className="expense-list">{expenses.map((item)=><div key={item.id}><span><b>{item.description}</b><small>{item.category==="beer"?"Cerveja":"Geral"} · {money(item.amount_cents)}</small></span><div className="row-actions">{item.receipt_url&&<a className="secondary link-button" href={item.receipt_url} target="_blank" rel="noreferrer">Ver nota</a>}<button className="danger-button" onClick={()=>remove(item.id)}>Excluir</button></div></div>)}{!expenses.length&&<p className="empty-row">Nenhuma despesa registrada.</p>}</div></article>
    </section>
    <section className="card charge-report"><div className="card-heading"><div><span className="eyebrow">RELATÓRIO DE RATEIO</span><h2>Valores por convidado</h2></div><button className="secondary print-button" onClick={()=>window.print()}>Imprimir ou salvar PDF</button></div><p className="rate-note">As despesas gerais são divididas por todos os presentes. A cerveja é cobrada somente de quem bebeu. Pode ocorrer diferença de centavos por arredondamento.</p><div className="charge-list">{charges.map((guest)=>{const url=whatsapp(guest);return <div key={guest.id}><span><b>{guest.name}</b><small>{guest.party_size} pessoa(s) · {guest.drinkers_count} bebem</small></span><strong>{money(guest.cents)}</strong>{url?<a className="primary link-button" href={url} target="_blank" rel="noreferrer">Enviar no WhatsApp</a>:<span className="missing-phone">Cadastre o telefone</span>}</div>})}{!charges.length&&<p className="empty-row">Nenhum convidado confirmou presença.</p>}</div></section>
  </>;
}
