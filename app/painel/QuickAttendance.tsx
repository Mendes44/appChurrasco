"use client";
// Controle rápido de presença usado no resumo depois do evento.
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Toast } from "@/components/Toast";

type Guest={id:string;name:string;party_size:number;is_attending:boolean;attended:boolean|null};
export function QuickAttendance({guests,readOnly}:{guests:Guest[];readOnly:boolean}){
  const router=useRouter();const[message,setMessage]=useState("");const[error,setError]=useState(false);
  async function setAttendance(id:string,attended:boolean|null){const response=await fetch(`/api/presencas/${id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({attended})});const result=await response.json();setMessage(result.message);setError(!response.ok);if(response.ok)router.refresh();}
  const confirmed=guests.filter(guest=>guest.is_attending);
  return <section className="card quick-attendance"><details><summary><span><span className="eyebrow">PRESENÇA REAL</span><b>Confirmar chegada rapidamente</b></span><span className="disclosure-action">Abrir</span></summary><div>{confirmed.map(guest=><article key={guest.id}><span><b>{guest.name}</b><small>{guest.party_size} pessoa(s)</small></span><div className="attendance-actions"><button disabled={readOnly} className={guest.attended===true?"payment-button":"secondary"} onClick={()=>setAttendance(guest.id,true)}>Compareceu</button><button disabled={readOnly} className={guest.attended===false?"danger-button":"secondary"} onClick={()=>setAttendance(guest.id,false)}>Não foi</button></div></article>)}{!confirmed.length&&<p className="empty-row">Nenhum convidado confirmado.</p>}</div></details><Toast message={message} error={error} onClose={()=>setMessage("")}/></section>;
}
