"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type ShoppingItem = readonly [string, string];

// As marcações ficam no aparelho para continuarem disponíveis mesmo sem alterar o banco.
export function ShoppingChecklist({ eventId, items }: { eventId: string; items: readonly ShoppingItem[] }) {
  const storageKey = `braza:compras:${eventId}`;
  const [purchased, setPurchased] = useState<string[]>([]);
  const [beverage, setBeverage] = useState<"chopp"|"latas"|"garrafas">("chopp");

  useEffect(() => {
    // A leitura ocorre apenas no navegador porque localStorage não existe no servidor.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    try { setPurchased(JSON.parse(localStorage.getItem(storageKey) ?? "[]")); } catch { setPurchased([]); }
  }, [storageKey]);

  const purchasedSet = useMemo(() => new Set(purchased), [purchased]);
  const visibleItems = useMemo(() => items.filter(([name]) => {
    if (name === "Chopp") return beverage === "chopp";
    if (name.startsWith("Latas")) return beverage === "latas";
    if (name.startsWith("Garrafas")) return beverage === "garrafas";
    return true;
  }), [items, beverage]);

  function toggle(name: string) {
    const next = purchasedSet.has(name) ? purchased.filter((item) => item !== name) : [...purchased, name];
    setPurchased(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
  }

  function clear() {
    setPurchased([]);
    localStorage.removeItem(storageKey);
  }

  return (
    <section className="shopping-checklist" aria-label="Lista de compras">
      <div className="shopping-toolbar">
        <div className="beverage-picker"><label>Bebida alcoólica<select value={beverage} onChange={(event)=>setBeverage(event.target.value as typeof beverage)}><option value="chopp">Chopp</option><option value="latas">Latas</option><option value="garrafas">Garrafas 600 ml</option></select></label></div>
        <div className="export-actions"><Link className="secondary link-button" href={`/api/exportar/pdf?bebida=${beverage}`}>PDF</Link><Link className="primary link-button" href={`/api/exportar/xlsx?bebida=${beverage}`}>Excel</Link></div>
      </div>
      <div className="shopping-progress"><p><b>{visibleItems.filter(([name])=>purchasedSet.has(name)).length}</b> de {visibleItems.length} itens comprados</p>
        {purchased.length > 0 && <button className="text-button" type="button" onClick={clear}>Limpar marcações</button>}
      </div>
      <div className="shopping-grid">
        {visibleItems.map(([name, quantity]) => {
          const checked = purchasedSet.has(name);
          return (
            <label className={`shopping-item${checked ? " is-purchased" : ""}`} key={name}>
              <input type="checkbox" checked={checked} onChange={() => toggle(name)} />
              <span className="shopping-check" aria-hidden="true">✓</span>
              <span className="shopping-copy"><b>{name}</b><small>{quantity}</small></span>
            </label>
          );
        })}
      </div>
    </section>
  );
}
