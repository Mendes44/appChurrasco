"use client";

import { compressReceipt } from "@/lib/compress-receipt";
import { Toast } from "@/components/Toast";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Receipt={id:string;description:string;amount_cents:number;receipt_url:string};
const money=(cents:number)=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(cents/100);

// Permite fotografar a nota durante as compras e já lança o valor no financeiro.
export function PurchaseReceiptForm({eventId,receipts}:{eventId:string;receipts:Receipt[]}){
  const router=useRouter();const[message,setMessage]=useState("");const[sending,setSending]=useState(false);const[isError,setIsError]=useState(false);
  async function submit(event:React.FormEvent<HTMLFormElement>){event.preventDefault();setSending(true);setMessage("");const formElement=event.currentTarget;const form=new FormData(formElement);form.set("eventId",eventId);const receipt=form.get("receipt");try{if(receipt instanceof File&&receipt.size)form.set("receipt",await compressReceipt(receipt));}catch{setMessage("Não foi possível compactar a foto.");setIsError(true);setSending(false);return;}const response=await fetch("/api/despesas",{method:"POST",body:form});const result=await response.json();setMessage(result.message);setIsError(!response.ok);setSending(false);if(response.ok){formElement.reset();router.refresh();}}
  return <section className="card purchase-receipts"><details><summary><span><span className="eyebrow">NOTAS E RECIBOS</span><b>Anexar comprovante da compra</b></span><span className="disclosure-action">Abrir</span></summary><div className="receipt-content"><p>O valor será lançado automaticamente no Financeiro.</p><form className="admin-form receipt-form" onSubmit={submit}><label>Descrição<input name="description" required minLength={2} maxLength={120} placeholder="Ex.: Açougue"/></label><label>Tipo de gasto<select name="category" defaultValue="general"><option value="general">Churrasco — dividir entre todos</option><option value="beer">Cerveja — somente quem bebeu</option></select></label><label>Valor da nota<input type="number" name="amount" required min="0.01" step="0.01" placeholder="0,00"/></label><label>Foto da nota<input type="file" name="receipt" required capture="environment" accept="image/jpeg,image/png,image/webp"/></label><label>Observações (opcional)<textarea name="notes" maxLength={500} placeholder="Ex.: Itens comprados em promoção"/></label><button className="primary" disabled={sending}>{sending?"Enviando...":"Salvar nota"}</button></form><div className="receipt-list">{receipts.map(item=><a key={item.id} href={item.receipt_url} target="_blank" rel="noreferrer"><span><b>{item.description}</b><small>{money(item.amount_cents)}</small></span><span>Ver nota</span></a>)}{!receipts.length&&<p className="empty-row">Nenhuma nota anexada.</p>}</div></div></details><Toast message={message} error={isError} onClose={()=>setMessage("")} /></section>;
}
