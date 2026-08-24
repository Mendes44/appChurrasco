"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { compressReceipt } from "@/lib/compress-receipt";
import { Toast } from "@/components/Toast";


export type Expense = {
  id: string;
  description: string;
  category: "general" | "beer";
  amount_cents: number;
  receipt_url: string | null;
  notes: string | null;
};
export type FinanceGuest = {
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
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sendingReceiptId, setSendingReceiptId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "paid" | "pending">("all");
  const [isError, setIsError] = useState(false);

  // Até a conferência real ser feita, a confirmação do convite funciona como previsão.
  const attending = guests.filter(
    (guest) => guest.attended ?? guest.is_attending,
  );
  const people = attending.reduce((sum, guest) => sum + guest.party_size, 0);
  const drinkers = attending.reduce(
    (sum, guest) => sum + guest.drinkers_count,
    0,
  );
  const generalTotal = expenses
    .filter((item) => item.category === "general")
    .reduce((sum, item) => sum + item.amount_cents, 0);
  const beerTotal = expenses
    .filter((item) => item.category === "beer")
    .reduce((sum, item) => sum + item.amount_cents, 0);
  const generalPerPerson = people ? generalTotal / people : 0;
  const beerPerDrinker = drinkers ? beerTotal / drinkers : 0;
  const charges = useMemo(
    () => {
      const calculated = attending.map((guest) => ({
        ...guest,
        cents: Math.round(
          generalPerPerson * guest.party_size +
            beerPerDrinker * guest.drinkers_count,
        ),
      }));
      // Ajusta no último rateio eventual diferença de centavos causada pelo arredondamento.
      if (calculated.length) {
        const roundedTotal = calculated.reduce((sum, guest) => sum + guest.cents, 0);
        calculated[calculated.length - 1].cents += generalTotal + beerTotal - roundedTotal;
      }
      return calculated;
    },
    [attending, generalPerPerson, beerPerDrinker, generalTotal, beerTotal],
  );
  const paidCharges = charges.filter((guest) => guest.paid_at);
  const paidTotal = paidCharges.reduce((sum, guest) => sum + guest.cents, 0);
  const pendingTotal = charges.reduce((sum, guest) => sum + guest.cents, 0) - paidTotal;
  const filteredCharges = charges.filter((guest) =>
    filter === "all" ? true : filter === "paid" ? Boolean(guest.paid_at) : !guest.paid_at,
  );

  async function add(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setMessage("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    form.set("eventId", eventId);
    const receipt = form.get("receipt");
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
    if (!confirm("Excluir esta despesa e seu comprovante?")) return;
    const response = await fetch(`/api/despesas/${id}`, { method: "DELETE" });
    const result = await response.json();
    setMessage(result.message);
    setIsError(!response.ok);
    if (response.ok) router.refresh();
  }

  async function attachReceipt(expenseId: string, originalFile: File) {
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
    const response = await fetch(`/api/pagamentos/${guest.id}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ paid }) });
    const result = await response.json(); setMessage(result.message); setIsError(!response.ok);
    if (response.ok) router.refresh();
  }

  function whatsapp(guest: FinanceGuest & { cents: number }) {
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
    if (!guest.phone || guest.paid_at) return null;
    let digits = guest.phone.replace(/\D/g, "");
    if (digits.length <= 11) digits = `55${digits}`;
    const pixDetails = pixKey ? `\n\nPix: ${pixKey}${pixHolder ? `\nTitular: ${pixHolder}` : ""}` : "";
    const text = `Olá, ${guest.name}! Passando para lembrar que o pagamento de *${money(guest.cents)}* referente ao ${eventTitle} continua pendente.${pixDetails}`;
    return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
  }

  return (
    <>
      <section className="finance-summary">
        <article>
          <small>Total gasto</small>
          <b>{money(generalTotal + beerTotal)}</b>
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
      <section className="finance-grid">
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
                  {item.notes && <small className="expense-notes">{item.notes}</small>}
                </span>
                <div className="row-actions">
                  {item.receipt_url ? (
                    <a
                      className="secondary link-button"
                      href={item.receipt_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Ver nota
                    </a>
                  ) : !readOnly ? (
                    <label className="secondary receipt-upload-button">
                      {sendingReceiptId === item.id ? "Enviando..." : "Adicionar nota"}
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
                  ) : null}
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
        <div><small>Total recebido</small><b>{money(paidTotal)}</b><span>{paidCharges.length} de {charges.length} pagamentos</span></div>
        <div><small>A receber</small><b>{money(pendingTotal)}</b><span>Atualizado ao marcar cada convidado</span></div>
      </section>
      <Toast message={message} error={isError} onClose={() => setMessage("")} />
    </>
  );
}
