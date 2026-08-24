"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Toast } from "@/components/Toast";

type ShoppingItem = readonly [string, string];

// As marcações são salvas no evento para acompanharem o usuário em qualquer aparelho.
export function ShoppingChecklist({ eventId, items, initialPurchased, readOnly=false }: { eventId: string; items: readonly ShoppingItem[]; initialPurchased: string[]; readOnly?: boolean }) {
  // purchased espelha no navegador os itens já marcados no banco.
  const [purchased, setPurchased] = useState<string[]>(initialPurchased);
  const [beverage, setBeverage] = useState<"chopp"|"latas"|"garrafas">("chopp");
  const [saveMessage, setSaveMessage] = useState("");

  const purchasedSet = useMemo(() => new Set(purchased), [purchased]);
  // Somente uma apresentação de cerveja é mostrada por vez para evitar duplicidade.
  const visibleItems = useMemo(() => items.filter(([name]) => {
    if (name === "Chopp") return beverage === "chopp";
    if (name.startsWith("Latas")) return beverage === "latas";
    if (name.startsWith("Garrafas")) return beverage === "garrafas";
    return true;
  }), [items, beverage]);

  async function persist(next: string[]) {
    // A atualização otimista deixa a marcação imediata e depois confirma no servidor.
    const previous = purchased;
    setPurchased(next);
    if (eventId === "sem-evento") return;
    const response = await fetch("/api/compras", { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ eventId, items:next }) });
    if (!response.ok) {
      setPurchased(previous);
      setSaveMessage("Não foi possível salvar a marcação.");
    } else setSaveMessage("");
  }

  function toggle(name: string) {
    // Set evita itens duplicados e simplifica adicionar ou retirar a marcação.
    if (readOnly) return;
    const next = purchasedSet.has(name) ? purchased.filter((item) => item !== name) : [...purchased, name];
    void persist(next);
  }

  function clear() {
    // Limpa somente os itens visíveis e mantém a escolha da apresentação da cerveja.
    if (readOnly) return;
    void persist([]);
  }

  return (
    <section className="shopping-checklist" aria-label="Lista de compras">
      <div className="shopping-toolbar">
        <div className="beverage-picker"><label>Bebida alcoólica<select value={beverage} onChange={(event)=>setBeverage(event.target.value as typeof beverage)}><option value="chopp">Chopp</option><option value="latas">Latas</option><option value="garrafas">Garrafas 600 ml</option></select></label></div>
        <div className="export-block"><span>Gerar lista em</span><div className="export-actions"><Link className="secondary link-button" href={`/api/exportar/pdf?bebida=${beverage}&evento=${eventId}`}>PDF</Link><Link className="primary link-button" href={`/api/exportar/xlsx?bebida=${beverage}&evento=${eventId}`}>Excel</Link></div></div>
      </div>
      <div className="shopping-progress"><p><b>{visibleItems.filter(([name])=>purchasedSet.has(name)).length}</b> de {visibleItems.length} itens comprados</p>
        {purchased.length > 0 && !readOnly && <button className="text-button" type="button" onClick={clear}>Limpar marcações</button>}
      </div>
      <div className="shopping-grid">
        {visibleItems.map(([name, quantity]) => {
          const checked = purchasedSet.has(name);
          return (
            <label className={`shopping-item${checked ? " is-purchased" : ""}`} key={name}>
              <input type="checkbox" checked={checked} disabled={readOnly} onChange={() => toggle(name)} />
              <span className="shopping-check" aria-hidden="true">✓</span>
              <span className="shopping-copy"><b>{name}</b><small>{quantity}</small></span>
            </label>
          );
        })}
      </div>
      {readOnly && <p className="readonly-notice">Evento encerrado: lista disponível somente para consulta.</p>}
      <Toast message={saveMessage} error onClose={()=>setSaveMessage("")} />
    </section>
  );
}
