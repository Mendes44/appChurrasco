import { getAdminContext } from "@/lib/admin";
import { calculateCharges } from "@/lib/finance";
import { buildShoppingList } from "@/lib/shopping";
import { NextResponse } from "next/server";

export const runtime="nodejs";

// Converte centavos para o padrão brasileiro usado no arquivo PDF.
const money=(cents:number)=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(cents/100);

// Remove caracteres incompatíveis com nomes de arquivo sem alterar o título salvo.
function safeName(title:string){return title.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zA-Z0-9]+/g,"_").replace(/^_|_$/g,"").toLowerCase()||"braza";}

export async function GET(request:Request,{params}:{params:Promise<{format:string}>}){
  // Somente o administrador autenticado consegue gerar os arquivos.
  const context=await getAdminContext();
  if(!context)return NextResponse.json({message:"Não autorizado."},{status:403});
  const eventId=new URL(request.url).searchParams.get("evento")??"";
  const{data:event}=await context.database.from("events").select("id,title,event_date,address,grams_per_person,beer_liters_per_drinker,shopping_checked,status").eq("id",eventId).eq("owner_id",context.user.id).maybeSingle();
  if(!event)return NextResponse.json({message:"Evento não encontrado."},{status:404});

  // Reunimos todas as áreas do sistema para produzir um relatório realmente completo.
  const[{data:guests},{data:expenses},{data:shopping}]=await Promise.all([
    context.database.from("guests").select("id,name,companion_name,party_size,drinkers_count,is_attending,attended,paid_at").eq("event_id",event.id).order("name"),
    context.database.from("expenses").select("description,category,amount_cents,notes,payer_name,payment_method,purchased_at,included_in_split,expense_group").eq("event_id",event.id).order("created_at"),
    context.database.from("event_shopping_items").select("name,quantity,checked").eq("event_id",event.id).order("created_at"),
  ]);
  const confirmed=(guests??[]).filter(guest=>guest.is_attending);
  const present=confirmed.filter(guest=>guest.attended??guest.is_attending);
  const confirmedPeople=confirmed.reduce((sum,guest)=>sum+guest.party_size,0);
  const presentPeople=present.reduce((sum,guest)=>sum+guest.party_size,0);
  const absentPeople=confirmed.filter(guest=>guest.attended===false).reduce((sum,guest)=>sum+guest.party_size,0);
  const drinkers=present.reduce((sum,guest)=>sum+guest.drinkers_count,0);
  const generalTotal=(expenses??[]).filter(item=>item.included_in_split&&item.category==="general").reduce((sum,item)=>sum+item.amount_cents,0);
  const beerTotal=(expenses??[]).filter(item=>item.included_in_split&&item.category==="beer").reduce((sum,item)=>sum+item.amount_cents,0);
  const totalSpent=(expenses??[]).reduce((sum,item)=>sum+item.amount_cents,0);
  const{charges}=calculateCharges(present,generalTotal,beerTotal);
  const received=charges.filter(charge=>charge.paid_at).reduce((sum,charge)=>sum+charge.cents,0);
  const splitTotal=charges.reduce((sum,charge)=>sum+charge.cents,0);
  const pending=splitTotal-received;
  const suggestedShopping=buildShoppingList(confirmedPeople,confirmed.reduce((sum,guest)=>sum+guest.drinkers_count,0),event.grams_per_person,Number(event.beer_liters_per_drinker??1.5));
  const{format}=await params;
  const filename=`${safeName(event.title)}_relatorio_completo`;

  if(format==="xlsx"){
    // Cada assunto recebe uma planilha própria para facilitar filtros e conferência.
    const ExcelJS=(await import("exceljs")).default;
    const workbook=new ExcelJS.Workbook();
    workbook.creator="Braza";
    workbook.created=new Date();
    const summary=workbook.addWorksheet("Resumo");
    summary.addRows([["BRAZA  RELATÓRIO COMPLETO"],["Evento",event.title],["Data",new Date(event.event_date).toLocaleString("pt-BR")],["Endereço",event.address??"Não informado"],[],["Indicador","Valor"],["Confirmados",confirmedPeople],["Presentes",presentPeople],["Não compareceram",absentPeople],["Pessoas que beberam",drinkers],["Total gasto",totalSpent/100],["Total no rateio",splitTotal/100],["Recebido",received/100],["Pendente",pending/100]]);
    summary.mergeCells("A1:B1"); summary.getCell("A1").font={bold:true,size:18,color:{argb:"FFF2643B"}}; summary.getColumn(1).width=28; summary.getColumn(2).width=42;
    [11,12,13,14].forEach(row=>summary.getCell(`B${row}`).numFmt='R$ #,##0.00');
    // O ExcelJS não cria gráficos nativos. Estas barras com células coloridas
    // mantêm uma visualização gráfica compatível com Excel e LibreOffice.
    const charts=workbook.addWorksheet("Gráficos");
    charts.addRow(["Presença",...Array.from({length:20},(_,index)=>index+1)]);
    const chartRows=[["Presentes",presentPeople,confirmedPeople,"FF5F8F68"],["Não compareceram",absentPeople,confirmedPeople,"FFF2643B"],["Recebido",received,Math.max(1,splitTotal),"FF5F8F68"],["Pendente",pending,Math.max(1,splitTotal),"FFF1A63A"]] as const;
    chartRows.forEach(([label,value,max,color],index)=>{const row=index+2;charts.getCell(row,1).value=`${label}: ${label==="Recebido"||label==="Pendente"?money(value):value}`;const filled=Math.round(value/Math.max(1,max)*20);for(let column=2;column<=21;column++){charts.getCell(row,column).fill={type:"pattern",pattern:"solid",fgColor:{argb:column<=filled?color:"FFE8ECE9"}};}});
    charts.getColumn(1).width=28; for(let column=2;column<=21;column++)charts.getColumn(column).width=3;
    const guestSheet=workbook.addWorksheet("Convidados");
    guestSheet.columns=[{header:"Nome",key:"name",width:30},{header:"Acompanhante",key:"companion",width:28},{header:"Pessoas",key:"people",width:12},{header:"Bebem",key:"drinkers",width:12},{header:"Presença",key:"attendance",width:18},{header:"Valor",key:"amount",width:16},{header:"Pagamento",key:"payment",width:16}];
    guestSheet.addRows(charges.map(charge=>({name:charge.name,companion:(guests??[]).find(guest=>guest.id===charge.id)?.companion_name??"",people:charge.party_size,drinkers:charge.drinkers_count,attendance:charge.attended===false?"Não compareceu":charge.attended===true?"Compareceu":"A conferir",amount:charge.cents/100,payment:charge.paid_at?"Pago":"Pendente"}))); guestSheet.getColumn("amount").numFmt='R$ #,##0.00';
    const expenseSheet=workbook.addWorksheet("Despesas");
    expenseSheet.columns=[{header:"Descrição",key:"description",width:32},{header:"Categoria",key:"group",width:22},{header:"Tipo",key:"type",width:18},{header:"Valor",key:"amount",width:16},{header:"Rateio",key:"split",width:18},{header:"Pago por",key:"payer",width:24},{header:"Observações",key:"notes",width:42}];
    expenseSheet.addRows((expenses??[]).map(item=>({description:item.description,group:item.expense_group??"",type:item.category==="beer"?"Cerveja":"Churrasco",amount:item.amount_cents/100,split:item.included_in_split?"Incluída":"Despesa própria",payer:item.payer_name??"",notes:item.notes??""}))); expenseSheet.getColumn("amount").numFmt='R$ #,##0.00';
    const shoppingSheet=workbook.addWorksheet("Compras extras");
    shoppingSheet.columns=[{header:"Item",key:"name",width:34},{header:"Quantidade",key:"quantity",width:20},{header:"Situação",key:"status",width:18}];
    shoppingSheet.addRows([...suggestedShopping.map(([name,quantity])=>({name,quantity,status:event.shopping_checked?.includes(name)?"Comprado":"Pendente"})),...(shopping??[]).map(item=>({name:item.name,quantity:item.quantity,status:item.checked?"Comprado":"Pendente"}))]);
    for(const sheet of workbook.worksheets){sheet.views=[{state:"frozen",ySplit:1}];sheet.getRow(1).font={bold:true};}
    const buffer=await workbook.xlsx.writeBuffer();
    return new Response(buffer,{headers:{"Content-Type":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","Content-Disposition":`attachment; filename="${filename}.xlsx"`,"Cache-Control":"private, no-store"}});
  }

  if(format==="pdf"){
    // O PDF é montado no servidor e não depende da renderização do navegador.
    const{jsPDF}=await import("jspdf");
    const document=new jsPDF();
    // Funções pequenas padronizam títulos e criam novas páginas quando necessário.
    const header=()=>{document.setTextColor(242,100,59);document.setFontSize(18);document.text("BRAZA  RELATÓRIO COMPLETO",14,17);document.setTextColor(30,35,31);document.setFontSize(11);document.text(event.title,14,25);};
    let y=0; const ensure=(space:number)=>{if(y+space>282){document.addPage();header();y=34;}};
    header(); y=34;
    document.setFontSize(9);document.text(`Data: ${new Date(event.event_date).toLocaleString("pt-BR")}`,14,y);y+=6;document.text(`Endereço: ${event.address??"Não informado"}`,14,y);y+=10;
    document.setFontSize(11);document.text(`Confirmados: ${confirmedPeople}   Presentes: ${presentPeople}   Pessoas que beberam: ${drinkers}`,14,y);y+=8;document.text(`Total gasto: ${money(totalSpent)}   Recebido: ${money(received)}   Pendente: ${money(pending)}`,14,y);y+=14;
    // Gráficos vetoriais continuam nítidos ao ampliar ou imprimir o PDF.
    const bar=(label:string,value:number,max:number,color:[number,number,number])=>{document.setFontSize(9);document.setTextColor(30,35,31);document.text(label,14,y);document.setFillColor(232,236,233);document.rect(62,y-4,120,5,"F");document.setFillColor(...color);document.rect(62,y-4,120*Math.min(1,value/Math.max(1,max)),5,"F");y+=10;};
    bar(`Presentes  ${presentPeople}`,presentPeople,confirmedPeople,[95,143,104]);bar(`Ausentes  ${absentPeople}`,absentPeople,confirmedPeople,[242,100,59]);bar(`Recebido  ${money(received)}`,received,splitTotal,[95,143,104]);bar(`Pendente  ${money(pending)}`,pending,splitTotal,[241,166,58]);y+=5;
    document.setFontSize(13);document.text("Convidados e pagamentos",14,y);y+=8;document.setFontSize(9);
    for(const charge of charges){ensure(8);document.text(charge.name.slice(0,42),14,y);document.text(money(charge.cents),120,y);document.text(charge.paid_at?"Pago":"Pendente",160,y);y+=7;}
    y+=7;ensure(16);document.setFontSize(13);document.text("Despesas",14,y);y+=8;document.setFontSize(9);
    for(const item of expenses??[]){ensure(8);document.text(item.description.slice(0,65),14,y);document.text(money(item.amount_cents),158,y);y+=7;}
    y+=7;ensure(16);document.setFontSize(13);document.text("Compras extras",14,y);y+=8;document.setFontSize(9);
    for(const item of [...suggestedShopping.map(([name,quantity])=>({name,quantity,checked:event.shopping_checked?.includes(name)})),...(shopping??[])]){ensure(8);document.text(`${item.name}  ${item.quantity}`.slice(0,70),14,y);document.text(item.checked?"Comprado":"Pendente",158,y);y+=7;}
    const buffer=document.output("arraybuffer");
    return new Response(buffer,{headers:{"Content-Type":"application/pdf","Content-Disposition":`attachment; filename="${filename}.pdf"`,"Cache-Control":"private, no-store"}});
  }
  return NextResponse.json({message:"Formato inválido."},{status:404});
}
