"use client";
// Permite acrescentar itens que não fazem parte da lista sugerida automaticamente.
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Toast } from "@/components/Toast";

type Item={id:string;name:string;quantity:string;checked:boolean};
export function CustomShoppingItems({eventId,items,readOnly}:{eventId:string;items:Item[];readOnly:boolean}){
  const router=useRouter();const[message,setMessage]=useState("");const[error,setError]=useState(false);
  async function add(event:React.FormEvent<HTMLFormElement>){event.preventDefault();const formElement=event.currentTarget;const form=new FormData(formElement);const response=await fetch("/api/compras/personalizadas",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({eventId,name:form.get("name"),quantity:form.get("quantity")})});const result=await response.json();setMessage(result.message);setError(!response.ok);if(response.ok){formElement.reset();router.refresh();}}
  async function update(id:string,checked:boolean){const response=await fetch("/api/compras/personalizadas",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,checked})});const result=await response.json();setMessage(result.message);setError(!response.ok);if(response.ok)router.refresh();}
  async function remove(id:string){const response=await fetch(`/api/compras/personalizadas?id=${id}`,{method:"DELETE"});const result=await response.json();setMessage(result.message);setError(!response.ok);if(response.ok)router.refresh();}
  return <section className="card custom-shopping"><span className="eyebrow">ITENS PERSONALIZADOS</span><h2>Outras compras</h2>{!readOnly&&<form className="custom-shopping-form" onSubmit={add}><input aria-label="Nome do item" name="name" required minLength={2} maxLength={100} placeholder="Ex.: Decoração"/><input aria-label="Quantidade do item" name="quantity" maxLength={60} placeholder="Quantidade ou observação"/><button className="primary">Adicionar</button></form>}<div className="custom-shopping-list">{items.map(item=><article className={item.checked?"is-purchased":""} key={item.id}><div className="custom-item-main"><input aria-label={`Marcar ${item.name} como comprado`} type="checkbox" checked={item.checked} disabled={readOnly} onChange={event=>update(item.id,event.target.checked)}/><span><b>{item.name}</b><small>{item.quantity||"Sem quantidade definida"}</small></span></div>{!readOnly&&<button className="danger-button" onClick={()=>remove(item.id)}>Excluir</button>}</article>)}{!items.length&&<p className="empty-row">Nenhum item adicional.</p>}</div><Toast message={message} error={error} onClose={()=>setMessage("")}/></section>;
}
