import { getAdminContext } from "@/lib/admin";
import { writeAudit } from "@/lib/audit";
import { NextResponse } from "next/server";

// Permite registrar quem apareceu depois, sem criar um convite retroativo.
export async function POST(request:Request){
  const context=await getAdminContext();
  if(!context)return NextResponse.json({message:"Não autorizado."},{status:403});
  const body=await request.json();
  const eventId=String(body.eventId??"");
  const name=String(body.name??"").trim();
  const phone=String(body.phone??"").replace(/\D/g,"");
  const partySize=Math.min(2,Math.max(1,Number(body.partySize)||1));
  const drinkersCount=Math.min(partySize,Math.max(0,Number(body.drinkersCount)||0));
  const companionName=partySize===2?String(body.companionName??"").trim():null;
  const participationNotes=String(body.participationNotes??"").trim();
  if(!/^[0-9a-f-]{36}$/i.test(eventId)||name.length<2||name.length>80||(phone&&(phone.length<10||phone.length>13))||(partySize===2&&(!companionName||companionName.length<2))||participationNotes.length>300)
    return NextResponse.json({message:"Revise os dados do convidado."},{status:400});
  const{data:event}=await context.database.from("events").select("id,status").eq("id",eventId).eq("owner_id",context.user.id).maybeSingle();
  if(!event)return NextResponse.json({message:"Evento não encontrado."},{status:404});
  if(event.status==="closed")return NextResponse.json({message:"Este evento está encerrado."},{status:409});
  const{error}=await context.database.from("guests").insert({event_id:eventId,name,phone:phone||null,companion_name:companionName,party_size:partySize,drinkers_count:drinkersCount,is_attending:true,attended:true,drinks:drinkersCount>0,brings_own_drink:false,added_by_admin:true,participation_notes:participationNotes||null});
  if(error)return NextResponse.json({message:error.code==="23505"?"Já existe um convidado com esse nome.":`Não foi possível cadastrar (${error.code}).`},{status:error.code==="23505"?409:500});
  await writeAudit(context.database,eventId,context.user.id,"guest_added_by_admin",{name,party_size:partySize,drinkers_count:drinkersCount});
  return NextResponse.json({message:"Convidado adicionado e presença confirmada."});
}
