"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { compressReceipt } from "@/lib/compress-receipt";
import { Toast } from "@/components/Toast";
import { calculateCharges } from "@/lib/finance";


export type Expense = {
  // Identificador único usado nas rotas de edição, comprovante e exclusão.
  id: string;
  description: string;
  category: "general" | "beer";
  amount_cents: number;
  receipt_url: string | null;
  notes: string | null;
  payer_name: string | null;
  payment_method: string | null;
  purchased_at: string | null;
  included_in_split: boolean;
  expense_group: string | null;
};
export type FinanceGuest = {
  // O convidado representa um cadastro, que pode incluir até duas pessoas.
  id: string;
  name: string;
  phone: string | null;
  party_size: number;
  drinkers_count: number;
  is_attending: boolean;
  attended: boolean | null;
  paid_at: string | null;
};

const money = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    cents / 100,
  );

export function FinanceManager({
  eventId,
  eventTitle,
  pixKey,
  pixHolder,
  expenses,
  guests,
  readOnly,
}: {
  eventId: string;
  eventTitle: string;
  pixKey: string | null;
  pixHolder: string | null;
  expenses: Expense[];
  guests: FinanceGuest[];
  readOnly: boolean;
}) {
  // O roteador atualiza os dados vindos do servidor depois de cada gravação.
  const router = useRouter();
  // Estes estados controlam mensagens, carregamento, filtros e ordenação da tela.
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sendingReceiptId, setSendingReceiptId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "paid" | "pending">("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"name"|"amount">("name");
  const [isError, setIsError] = useState(false);

  // Até a conferência real ser feita, a confirmação do convite funciona como previsão.
  // Depois que attended recebe true ou false, a presença real passa a prevalecer.
  const attending = guests.filter(
    (guest) => guest.attended ?? guest.is_attending,
  );
  const generalTotal = expenses
    .filter((item) => item.included_in_split && item.category === "general")
    .reduce((sum, item) => sum + item.amount_cents, 0);
  const beerTotal = expenses
    .filter((item) => item.included_in_split && item.category === "beer")
    .reduce((sum, item) => sum + item.amount_cents, 0);
  const expenseTotal = expenses.reduce((sum,item)=>sum+item.amount_cents,0);
  // Despesas próprias aparecem no total gasto, mas não são cobradas dos convidados.
  const excludedTotal = expenseTotal-generalTotal-beerTotal;
  const split=useMemo(()=>calculateCharges(attending,generalTotal,beerTotal),[attending,generalTotal,beerTotal]);
  // A função central de rateio devolve contagens, valores unitários e cobranças exatas.
  const {people,drinkers,generalPerPerson,beerPerDrinker,charges}=split;
  const paidCharges = charges.filter((guest) => guest.paid_at);
  const paidTotal = paidCharges.reduce((sum, guest) => sum + guest.cents, 0);
  const pendingTotal = charges.reduce((sum, guest) => sum + guest.cents, 0) - paidTotal;
  const splitTotal=generalTotal+beerTotal;
  const paidPercent=splitTotal?Math.min(100,Math.round((paidTotal/splitTotal)*100)):0;
  const filteredCharges = charges.filter((guest) =>
    filter === "all" ? true : filter === "paid" ? Boolean(guest.paid_at) : !guest.paid_at,
  ).filter(guest=>guest.name.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR"))).sort((a,b)=>sort==="amount"?b.cents-a.cents:a.name.localeCompare(b.name,"pt-BR"));

  async function add(event: React.FormEvent<HTMLFormElement>) {
    // Impede o envio tradicional do formulário e prepara um FormData para arquivos.
    event.preventDefault();
    setSending(true);
    setMessage("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    form.set("eventId", eventId);
    const receipt = form.get("receipt");
    // A compactação acontece antes do upload para economizar armazenamento e tráfego.
    try {
      if (receipt instanceof File && receipt.size)
        form.set("receipt", await compressReceipt(receipt));
    } catch {
      setMessage("Não foi possível compactar a imagem.");
      setSending(false);
      return;
    }
    const response = await fetch("/api/despesas", {
      method: "POST",
      body: form,
    });
    const result = await response.json();
    setMessage(result.message);
    setIsError(!response.ok);
    setSending(false);
    if (response.ok) {
      formElement.reset();
      router.refresh();
    }
  }
  async function remove(id: string) {
    // A confirmação evita exclusão acidental de uma despesa e de seu comprovante.
    if (!confirm("Excluir esta despesa e seu comprovante?")) return;
    const response = await fetch(`/api/despesas/${id}`, { method: "DELETE" });
    const result = await response.json();
    setMessage(result.message);
    setIsError(!response.ok);
    if (response.ok) router.refresh();
  }

  async function attachReceipt(expenseId: string, originalFile: File) {
    // Um comprovante também pode ser anexado depois que a despesa já existe.
    setSendingReceiptId(expenseId);
    setMessage("");
    try {
      const form = new FormData();
      form.set("receipt", await compressReceipt(originalFile));
      const response = await fetch(`/api/despesas/${expenseId}/comprovante`, {
        method: "POST",
        body: form,
      });
      const result = await response.json();
      setMessage(result.message);
      setIsError(!response.ok);
      if (response.ok) router.refresh();
    } catch {
      setMessage("Não foi possível preparar ou enviar a imagem.");
      setIsError(true);
    } finally {
      setSendingReceiptId(null);
    }
  }

  async function setPaid(guest: FinanceGuest, paid: boolean) {
    // A API registra ou remove a data de pagamento e mantém a auditoria no servidor.
    const response = await fetch(`/api/pagamentos/${guest.id}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ paid }) });
    const result = await response.json(); setMessage(result.message); setIsError(!response.ok);
    if (response.ok) router.refresh();
  }

  function whatsapp(guest: FinanceGuest & { cents: number }) {
    // Sem telefone não existe destino seguro para montar o endereço do WhatsApp.
    if (!guest.phone) return null;

    let digits = guest.phone.replace(/\D/g, "");
    if (digits.length <= 11) digits = `55${digits}`;

    // Os subtotais explicam a cobrança sem obrigar o convidado a recalcular valores por pessoa.
    const generalShare = Math.round(generalPerPerson * guest.party_size);
    const beerShare = guest.cents - generalShare;
    const companionDetails = guest.party_size > 1
      ? "Este valor já inclui você e seu acompanhante."
      : "Este valor corresponde à sua participação no Churras.";
    const beerDetails = guest.drinkers_count > 0
      ? `\n• Cerveja: ${money(beerShare)}`
      : "";
    const pixDetails = pixKey
      ? `\n\n*Pagamento via Pix*\nChave: ${pixKey}${pixHolder ? `\nTitular: ${pixHolder}` : ""}`
      : "";

    // O WhatsApp interpreta textos entre asteriscos como negrito.
    const text = `Olá, ${guest.name}! Tudo bem?

O rateio do ${eventTitle} foi concluído.

*Valor total a pagar: ${money(guest.cents)}*
${companionDetails}

Resumo do seu rateio:
• Churrasco: ${money(generalShare)}${beerDetails}${pixDetails}

Obrigado!`;

    return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
  }

  function reminder(guest: FinanceGuest & { cents: number }) {
    // Lembretes são criados somente para cobranças pendentes com telefone disponível.
    if (!guest.phone || guest.paid_at) return null;
    let digits = guest.phone.replace(/\D/g, "");
    if (digits.length <= 11) digits = `55${digits}`;
    const pixDetails = pixKey ? `\n\nPix: ${pixKey}${pixHolder ? `\nTitular: ${pixHolder}` : ""}` : "";
    const text = `Olá, ${guest.name}! Passando para lembrar que o pagamento de *${money(guest.cents)}* referente ao ${eventTitle} continua pendente.${pixDetails}`;
    return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
  }

  return (
    <>
      {/* Resumo principal com os valores que alimentam todos os demais relatórios. */}
      <section className="finance-summary">
        <article>
          <small>Total gasto</small>
          <b>{money(expenseTotal)}</b>
          <span>{excludedTotal?`${money(excludedTotal)} fora do rateio`:"Todas as despesas no rateio"}</span>
        </article>
        <article>
          <small>Despesas gerais</small>
          <b>{money(generalTotal)}</b>
          <span>
            {people
              ? `${money(Math.round(generalPerPerson))} por pessoa`
              : "Sem confirmados"}
          </span>
        </article>
        <article>
          <small>Cerveja</small>
          <b>{money(beerTotal)}</b>
          <span>
            {drinkers
              ? `${money(Math.round(beerPerDrinker))} por pessoa que bebeu`
              : "Sem pessoas que bebem"}
          </span>
        </article>
      </section>
      <section className="card finance-dashboard">
        {/* O details mantém o dashboard recolhido até o administrador solicitar. */}
        <details>
          <summary><span><span className="eyebrow">DASHBOARD FINANCEIRO</span><b>Visão geral do evento</b></span><span className="disclosure-action">Gerar dashboard</span></summary>
          <div className="finance-dashboard-content">
            <div className="payment-chart" style={{"--paid-percent":`${paidPercent}%`} as React.CSSProperties}><span><b>{paidPercent}%</b><small>recebido</small></span></div>
            <div className="finance-dashboard-metrics">
              <article><small>Total no rateio</small><b>{money(splitTotal)}</b></article>
              <article><small>Total recebido</small><b>{money(paidTotal)}</b></article>
              <article><small>A receber</small><b>{money(pendingTotal)}</b></article>
              <article><small>Despesas próprias</small><b>{money(excludedTotal)}</b></article>
            </div>
          </div>
          <div className="dashboard-actions"><a className="secondary link-button" href={`/painel/relatorio?evento=${eventId}`}>Abrir relatório completo</a><button className="secondary print-button" type="button" onClick={()=>window.print()}>Imprimir dashboard</button><a className="secondary link-button" href={`/api/exportar-financeiro/pdf?evento=${eventId}`}>Exportar PDF financeiro</a><a className="primary link-button" href={`/api/exportar-financeiro/xlsx?evento=${eventId}`}>Exportar Excel financeiro</a></div>
        </details>
      </section>
      <section className="finance-grid">
        {/* A primeira coluna registra gastos e a segunda lista os comprovantes. */}
        <article className="card">
          <span className="eyebrow">NOVA DESPESA</span>
          <h2>Registrar compra</h2>
          <form className="admin-form" onSubmit={add}>
            <label>
              Descrição
              <input
                name="description"
                required
                minLength={2}
                maxLength={120}
                placeholder="Ex.: Compra no açougue"
              />
            </label>
            <label>
              Tipo de rateio
              <select name="category" defaultValue="general">
                <option value="general">Geral — dividir entre todos</option>
                <option value="beer">Cerveja — somente quem bebeu</option>
              </select>
            </label>
            <label>Categoria<select name="expenseGroup" defaultValue="Carnes"><option>Carnes</option><option>Acompanhamentos</option><option>Bebidas sem álcool</option><option>Cerveja</option><option>Descartáveis</option><option>Decoração</option><option>Transporte</option><option>Aluguel</option><option>Outros</option></select></label>
            <label>
              Valor pago
              <input
                type="number"
                name="amount"
                required
                min="0.01"
                step="0.01"
                placeholder="0,00"
              />
            </label>
            <label>
              Foto do comprovante (opcional)
              <input
                type="file"
                name="receipt"
                capture="environment"
                accept="image/jpeg,image/png,image/webp"
              />
            </label>
            <label>
              Observações (opcional)
              <textarea name="notes" maxLength={500} placeholder="Ex.: Compra dividida em dois cartões" />
            </label>
            <label>Quem pagou? <input name="payerName" maxLength={100} placeholder="Ex.: Marcos"/></label>
            <label>Forma de pagamento<select name="paymentMethod" defaultValue=""><option value="">Não informar</option><option>Pix</option><option>Dinheiro</option><option>Crédito</option><option>Débito</option></select></label>
            <label>Data da compra<input type="date" name="purchasedAt"/></label>
            <label>Entrar no rateio?<select name="includedInSplit" defaultValue="true"><option value="true">Sim, dividir com os participantes</option><option value="false">Não, é uma despesa própria</option></select></label>
            <small className="field-help">
              A imagem é compactada e armazenada de forma privada.
            </small>
            <button className="primary" disabled={sending || readOnly}>
              {sending ? "Salvando..." : "Adicionar despesa"}
            </button>
            {readOnly && <p className="readonly-notice">Evento encerrado: dados disponíveis somente para consulta.</p>}
          </form>
        </article>
        <article className="card">
          <div className="card-heading">
            <div>
              <span className="eyebrow">COMPROVANTES</span>
              <h2>Despesas registradas</h2>
            </div>
          </div>
          <div className="expense-list">
            {expenses.map((item) => (
              <div key={item.id}>
                <span>
                  <b>{item.description}</b>
                  <small>
                    {item.category === "beer" ? "Cerveja" : "Geral"} ·{" "}
                    {money(item.amount_cents)}
                  </small>
                  {item.expense_group&&<small>{item.expense_group}</small>}
                  {item.notes && <small className="expense-notes">{item.notes}</small>}
                  <small>{item.included_in_split?"Incluída no rateio":"Despesa própria · fora do rateio"}{item.payer_name?` · Pago por ${item.payer_name}`:""}</small>
                </span>
                <div className="row-actions">
                  {item.receipt_url && (
                    <a
                      className="secondary link-button"
                      href={item.receipt_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Ver ou baixar
                    </a>
                  )}
                  {!readOnly && (
                    <label className="secondary receipt-upload-button">
                      {sendingReceiptId === item.id ? "Enviando..." : item.receipt_url ? "Substituir nota" : "Adicionar nota"}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        capture="environment"
                        disabled={sendingReceiptId === item.id}
                        onChange={(event) => {
                          const file = event.currentTarget.files?.[0];
                          if (file) void attachReceipt(item.id, file);
                          event.currentTarget.value = "";
                        }}
                      />
                    </label>
                  )}
                  {!readOnly && <button
                    className="danger-button"
                    onClick={() => remove(item.id)}
                  >
                    Excluir
                  </button>}
                </div>
              </div>
            ))}
            {!expenses.length && (
              <p className="empty-row">Nenhuma despesa registrada.</p>
            )}
          </div>
        </article>
      </section>
      <section className="card charge-report">
        {/* O relatório usa exatamente as cobranças calculadas pela função central. */}
        <div className="card-heading">
          <div>
            <span className="eyebrow">RELATÓRIO DE RATEIO</span>
            <h2>Valores por convidado</h2>
          </div>
          <button
            className="secondary print-button"
            onClick={() => window.print()}
          >
            Imprimir ou salvar PDF
          </button>
        </div>
        <div className="finance-tools">
          <div className="finance-filters" aria-label="Filtrar pagamentos">
            <button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>Todos ({charges.length})</button>
            <button className={filter === "paid" ? "active" : ""} onClick={() => setFilter("paid")}>Pagos ({paidCharges.length})</button>
            <button className={filter === "pending" ? "active" : ""} onClick={() => setFilter("pending")}>Pendentes ({charges.length - paidCharges.length})</button>
          </div>
          <input className="finance-search" type="search" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Buscar convidado" aria-label="Buscar convidado no financeiro"/>
          <select className="finance-sort" value={sort} onChange={event=>setSort(event.target.value as typeof sort)} aria-label="Ordenar pagamentos"><option value="name">Ordenar por nome</option><option value="amount">Ordenar por maior valor</option></select>
          <button className="secondary" type="button" onClick={()=>setFilter("pending")}>Exibir lembretes pendentes</button>
          <div className="finance-export"><span>Exportar relatório</span><a className="secondary link-button" href={`/api/exportar-financeiro/pdf?evento=${eventId}`}>PDF</a><a className="primary link-button" href={`/api/exportar-financeiro/xlsx?evento=${eventId}`}>Excel</a></div>
        </div>
        <p className="rate-note">
          As despesas gerais são divididas por todos os presentes. A cerveja é
          cobrada somente de quem bebeu. Pode ocorrer diferença de centavos por
          arredondamento.
        </p>
        <div className="charge-list">
          {filteredCharges.map((guest) => {
            const url = whatsapp(guest);
            const reminderUrl = reminder(guest);
            return (
              <div key={guest.id}>
                <span>
                  <b>{guest.name}</b>
                  <small>
                    {guest.party_size} pessoa(s) · {guest.drinkers_count} bebem
                  </small>
                  <small className={guest.paid_at?"payment-paid":"payment-pending"}>{guest.paid_at?`Pago em ${new Date(guest.paid_at).toLocaleDateString("pt-BR")}`:"Pagamento pendente"}</small>
                </span>
                <strong>{money(guest.cents)}</strong>
                <div className="charge-actions">{guest.paid_at ? (url && <a className="secondary link-button" href={url} target="_blank" rel="noreferrer">Ver mensagem</a>) : reminderUrl ? <a className="primary link-button" href={reminderUrl} target="_blank" rel="noreferrer">Enviar lembrete</a> : <span className="missing-phone">Cadastre o telefone</span>}{!readOnly && <button className={guest.paid_at?"secondary":"payment-button"} type="button" onClick={()=>setPaid(guest,!guest.paid_at)}>{guest.paid_at?"Marcar pendente":"Marcar como pago"}</button>}</div>
              </div>
            );
          })}
          {!filteredCharges.length && (
            <p className="empty-row">Nenhum pagamento encontrado neste filtro.</p>
          )}
        </div>
      </section>
      <section className="payment-total" aria-label="Resumo dos pagamentos">
        {/* Este rodapé muda automaticamente sempre que um pagamento é confirmado. */}
        <div><small>Total recebido</small><b>{money(paidTotal)}</b><span>{paidCharges.length} de {charges.length} pagamentos</span></div>
        <div><small>A receber</small><b>{money(pendingTotal)}</b><span>Atualizado ao marcar cada convidado</span></div>
      </section>
      <Toast message={message} error={isError} onClose={() => setMessage("")} />
    </>
  );
}
