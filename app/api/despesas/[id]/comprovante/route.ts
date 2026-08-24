import { getAdminContext } from "@/lib/admin";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

const allowedTypes=new Set(["image/jpeg","image/png","image/webp"]);

// Anexa uma nota a uma despesa existente sem alterar seu valor ou rateio.
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  const context=await getAdminContext();if(!context)return NextResponse.json({message:"Não autorizado."},{status:403});
  const{id}=await params;const form=await request.formData();const receipt=form.get("receipt");
  if(!(receipt instanceof File)||!receipt.size||!allowedTypes.has(receipt.type)||receipt.size>2*1024*1024)return NextResponse.json({message:"Use uma imagem JPG, PNG ou WebP de até 2 MB."},{status:400});
  const{data:expense}=await context.database.from("expenses").select("id,event_id,receipt_path").eq("id",id).maybeSingle();if(!expense)return NextResponse.json({message:"Despesa não encontrada."},{status:404});
  const{data:event}=await context.database.from("events").select("id").eq("id",expense.event_id).eq("owner_id",context.user.id).maybeSingle();if(!event)return NextResponse.json({message:"Não autorizado."},{status:403});
  const extension=receipt.type==="image/png"?"png":receipt.type==="image/webp"?"webp":"jpg";const path=`${context.user.id}/${expense.event_id}/${randomUUID()}.${extension}`;
  const{error:uploadError}=await context.database.storage.from("receipts").upload(path,new Uint8Array(await receipt.arrayBuffer()),{contentType:receipt.type,upsert:false});if(uploadError)return NextResponse.json({message:"Não foi possível armazenar o comprovante."},{status:500});
  const{error}=await context.database.from("expenses").update({receipt_path:path,updated_at:new Date().toISOString()}).eq("id",id);if(error){await context.database.storage.from("receipts").remove([path]);return NextResponse.json({message:"Não foi possível vincular o comprovante."},{status:500});}
  if(expense.receipt_path)await context.database.storage.from("receipts").remove([expense.receipt_path]);
  return NextResponse.json({message:"Comprovante anexado."});
}
