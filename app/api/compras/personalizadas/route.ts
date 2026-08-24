// Gerencia os itens extras que o administrador adiciona à lista de compras.
import { getAdminContext } from "@/lib/admin";
import { writeAudit } from "@/lib/audit";
import { NextResponse } from "next/server";

async function activeOwnedEvent(eventId: string) {
  const context = await getAdminContext();
  if (!context) return { error: NextResponse.json({message:"Não autorizado."},{status:403}) };
  const { data:event } = await context.database.from("events").select("id,status").eq("id",eventId).eq("owner_id",context.user.id).maybeSingle();
  if (!event) return { error:NextResponse.json({message:"Evento não encontrado."},{status:404}) };
  if (event.status === "closed") return { error:NextResponse.json({message:"Este evento está encerrado."},{status:409}) };
  return { context, event };
}

export async function POST(request:Request){
  const body=await request.json();const eventId=String(body.eventId??"");const name=String(body.name??"").trim();const quantity=String(body.quantity??"").trim();
  if(!/^[0-9a-f-]{36}$/i.test(eventId)||name.length<2||name.length>100||quantity.length>60)return NextResponse.json({message:"Revise o item."},{status:400});
  const result=await activeOwnedEvent(eventId);if(result.error)return result.error;
  const{context}=result;const{error}=await context.database.from("event_shopping_items").insert({event_id:eventId,name,quantity});
  if(error)return NextResponse.json({message:"Não foi possível adicionar."},{status:500});
  await writeAudit(context.database,eventId,context.user.id,"shopping_item_created",{name});
  return NextResponse.json({message:"Item adicionado."});
}

export async function PATCH(request:Request){
  const body=await request.json();const id=String(body.id??"");const{data:itemContext}=await (await getAdminContext())?.database.from("event_shopping_items").select("id,event_id") .eq("id",id).maybeSingle() ?? {data:null};
  if(!itemContext)return NextResponse.json({message:"Item não encontrado."},{status:404});
  const result=await activeOwnedEvent(itemContext.event_id);if(result.error)return result.error;
  const{context}=result;const{error}=await context.database.from("event_shopping_items").update({checked:Boolean(body.checked)}).eq("id",id);
  return error?NextResponse.json({message:"Não foi possível atualizar."},{status:500}):NextResponse.json({message:"Item atualizado."});
}

export async function DELETE(request:Request){
  const id=new URL(request.url).searchParams.get("id")??"";const context=await getAdminContext();if(!context)return NextResponse.json({message:"Não autorizado."},{status:403});
  const{data:item}=await context.database.from("event_shopping_items").select("id,event_id,name").eq("id",id).maybeSingle();if(!item)return NextResponse.json({message:"Item não encontrado."},{status:404});
  const result=await activeOwnedEvent(item.event_id);if(result.error)return result.error;
  const{error}=await context.database.from("event_shopping_items").delete().eq("id",id);
  if(!error)await writeAudit(context.database,item.event_id,context.user.id,"shopping_item_deleted",{name:item.name});
  return error?NextResponse.json({message:"Não foi possível excluir."},{status:500}):NextResponse.json({message:"Item excluído."});
}
