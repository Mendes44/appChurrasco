"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Toast } from "@/components/Toast";
type EventItem = {
  id: string;
  title: string;
  event_date: string;
  address: string | null;
  grams_per_person: number;
  beer_liters_per_drinker: number;
  invite_token: string;
  pix_key: string | null;
  pix_holder: string | null;
  status: "active" | "closed";
};
// Componente cliente responsável pelos formulários de criação, edição e exclusão.
export function EventManager({ events }: { events: EventItem[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<EventItem | null>(null);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const body = {
      title: form.get("title"),
      address: form.get("address"),
      eventDate: new Date(String(form.get("eventDate"))).toISOString(),
      gramsPerPerson: Number(form.get("grams")),
      beerLitersPerDrinker: Number(form.get("beerLiters")),
      pixKey: form.get("pixKey"),
      pixHolder: form.get("pixHolder"),
    };
    const response = await fetch(
      editing ? `/api/eventos/${editing.id}` : "/api/eventos",
      {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    const result = await response.json();
    setMessage(result.message);
    setIsError(!response.ok);
    if (response.ok) {
      formElement.reset();
      setEditing(null);
      router.refresh();
    }
  }
  async function remove(id: string) {
    if (!confirm("Excluir este churrasco e todos os seus convidados?")) return;
    await fetch(`/api/eventos/${id}`, { method: "DELETE" });
    router.refresh();
  }
  async function toggleClosed(item: EventItem) {
    const closing = item.status !== "closed";
    if (closing && !confirm("Encerrar este evento? Ele ficará disponível apenas para consulta.")) return;
    const response = await fetch(`/api/eventos/${item.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ closed: closing }),
    });
    const result = await response.json();
    setMessage(result.message);
    setIsError(!response.ok);
    if (response.ok) {
      setEditing(null);
      router.refresh();
    }
  }
  function localDate(value: string) {
    const date = new Date(value);
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  }
  return (
    <div className="management-grid">
      <section className="card">
        <span className="eyebrow">
          {editing ? "EDITAR EVENTO" : "NOVO EVENTO"}
        </span>
        <h2>{editing ? `Editar ${editing.title}` : "Criar churrasco"}</h2>
        <form
          className="admin-form"
          key={editing?.id ?? "novo"}
          onSubmit={save}
        >
          <label>
            Nome do evento
            <input
              name="title"
              required
              minLength={3}
              maxLength={100}
              defaultValue={editing?.title}
              placeholder="Ex.: Churrasco de aniversário"
            />
          </label>
          <label>
            Data e horário
            <input
              type="datetime-local"
              name="eventDate"
              required
              defaultValue={editing ? localDate(editing.event_date) : ""}
            />
          </label>
          <label>
            Endereço
            <input name="address" defaultValue={editing?.address ?? ""} />
          </label>
          <label>
            Chave Pix
            <input
                name="pixKey"
                maxLength={120}
                defaultValue={editing?.pix_key ?? ""}
                placeholder="CPF, telefone, email ou chave aleatória"
            />
          </label>
          <label>
            Titular do PIX
            <input 
                name="pixHolder"
                maxLength={120}
                defaultValue={editing?.pix_holder ?? ""}
                placeholder="Nome do Titular da conta"
            />
          </label>
          <label>
            Gramas por pessoa
            <input
              type="number"
              name="grams"
              min="200"
              max="1000"
              defaultValue={editing?.grams_per_person ?? 350}
            />
          </label>
          <label>
            Litros de cerveja por pessoa que bebe
            <input
              type="number"
              name="beerLiters"
              min="0.1"
              max="5"
              step="0.1"
              defaultValue={editing?.beer_liters_per_drinker ?? 1.5}
            />
            <small className="field-help">Padrão sugerido: 1,5 L.</small>
          </label>
          <div className="form-actions">
            <button className="primary">
              {editing ? "Salvar alterações" : "Criar evento"}
            </button>
            {editing && (
              <button
                type="button"
                className="secondary"
                onClick={() => setEditing(null)}
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      </section>
      <section className="card">
        <span className="eyebrow">SEUS EVENTOS</span>
        <h2>Churrascos</h2>
        <div className="event-list">
          {events.map((item) => (
            <article key={item.id}>
              <div>
                <b>{item.title}</b>
                <small>
                  {new Date(item.event_date).toLocaleString("pt-BR")} ·{" "}
                  {item.address || "Sem endereço"}
                </small>
                <small className={item.status === "closed" ? "event-closed" : "event-active"}>{item.status === "closed" ? "Encerrado · somente leitura" : "Ativo"}</small>
              </div>
              <div className="row-actions">
                <Link
                  className="primary link-button"
                  href={`/painel?evento=${item.id}`}
                >
                  Abrir painel
                </Link>
                {item.status !== "closed" && <button className="text-button" onClick={() => setEditing(item)}>Editar</button>}
                <button className="secondary" onClick={() => toggleClosed(item)}>{item.status === "closed" ? "Reabrir" : "Encerrar"}</button>
                {item.status !== "closed" && <button
                  className="danger-button"
                  onClick={() => remove(item.id)}
                >
                  Excluir
                </button>}
              </div>
            </article>
          ))}
        </div>
      </section>
      <Toast message={message} error={isError} onClose={() => setMessage("")} />
    </div>
  );
}
