// Compacta comprovantes grandes no navegador antes do envio ao Supabase.
export async function compressReceipt(file:File){
  if(file.size<=450_000)return file;
  const bitmap=await createImageBitmap(file);const scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height));
  const canvas=document.createElement("canvas");canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);
  canvas.getContext("2d")?.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
  const blob=await new Promise<Blob|null>((resolve)=>canvas.toBlob(resolve,"image/jpeg",.78));
  if(!blob)throw new Error("compression_failed");
  return new File([blob],`${file.name.replace(/\.[^.]+$/,"")}.jpg`,{type:"image/jpeg"});
}
