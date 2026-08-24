// Atualiza a presença real de um cadastro pertencente ao administrador autenticado.
import { getAdminContext } from "@/lib/admin";
import { writeAudit } from "@/lib/audit";
import { NextResponse } from "next/server";

export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
  const context=await getAdminContext();if(!context)return NextResponse.json({message:"Não autorizado."},{status:403});
  const{id}=await params;const body=await request.json();const attended=body.attended===null?null:Boolean(body.attended);
  const{data:guest}=await context.database.from("guests").select("id,event_id,name").eq("id",id).maybeSingle();if(!guest)return NextResponse.json({message:"Convidado não encontrado."},{status:404});
  const{data:event}=await context.database.from("events").select("status").eq("id",guest.event_id).eq("owner_id",context.user.id).maybeSingle();if(!event)return NextResponse.json({message:"Não autorizado."},{status:403});if(event.status==="closed")return NextResponse.json({message:"Este evento está encerrado."},{status:409});
  const{error}=await context.database.from("guests").update({attended}).eq("id",id);if(error)return NextResponse.json({message:"Não foi possível confirmar."},{status:500});
  await writeAudit(context.database,guest.event_id,context.user.id,"attendance_updated",{guest:guest.name,attended});
  return NextResponse.json({message:attended?"Presença confirmada.":attended===false?"Ausência registrada.":"Conferência removida."});
}
