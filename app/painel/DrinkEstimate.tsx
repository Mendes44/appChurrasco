"use client";

import { useState } from "react";

type DrinkType = "chopp" | "lata" | "garrafa";

export function DrinkEstimate({ drinkers, people, litersPerDrinker }: { drinkers: number; people: number; litersPerDrinker: number }) {
  // Todas as embalagens representam o mesmo volume configurado no evento.
  const [type, setType] = useState<DrinkType>("chopp");
  const totalLiters = drinkers * litersPerDrinker;
  const estimates = {
    chopp: { label:"Chopp", value:`${totalLiters.toFixed(1)} L`, detail:`${litersPerDrinker.toLocaleString("pt-BR")} L por pessoa que bebe`, icon:"/beer-glass.svg" },
    lata: { label:"Latas", value:`${Math.ceil(totalLiters / .35)} unidades`, detail:"350 ml cada", icon:"/beer-can.svg" },
    garrafa: { label:"Garrafas", value:`${Math.ceil(totalLiters / .6)} unidades`, detail:"600 ml cada", icon:"/beer-bottle.svg" },
  };
  const selected = estimates[type];

  return <>
    <div className="drink-selector" aria-label="Escolha o tipo de cerveja">{(["chopp","lata","garrafa"] as DrinkType[]).map(option=><button type="button" className={type===option?"active":""} onClick={()=>setType(option)} key={option}>{estimates[option].label}</button>)}</div>
    <div className="drink-feature"><span className="drink-symbol" style={{backgroundImage:`url(${selected.icon})`}} aria-hidden="true"/><div><small>{selected.label.toUpperCase()} · ESTIMATIVA SUGERIDA</small><b>{selected.value}</b><p>{selected.detail}</p></div></div>
    <div className="soft-drink-estimate"><p><b>{(people * .6).toFixed(1)} L de refrigerante</b>Estimativa sugerida · 600 ml por pessoa</p></div>
  </>;
}
