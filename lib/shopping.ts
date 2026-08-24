// Regras de compra ficam isoladas da interface para facilitar ajustes futuros.
export function buildShoppingList(people: number, drinkers: number, gramsPerPerson: number, litersPerDrinker = 1.5) {
  const meatKg = people * gramsPerPerson / 1000;
  const beerLiters = drinkers * litersPerDrinker;
  // O carvão cresce por faixas práticas de compra conforme o número de convidados.
  const charcoalKg = people === 0 ? 0 : people <= 4 ? 3 : people <= 8 ? 5 : Math.ceil(people * .6);
  return [
    ["Carne bovina", `${(meatKg * .4).toFixed(2)} kg`], ["Linguiça", `${(meatKg * .25).toFixed(2)} kg`],
    ["Frango", `${(meatKg * .2).toFixed(2)} kg`], ["Carne suína", `${(meatKg * .15).toFixed(2)} kg`],
    ["Pão de alho", `${people} ${people === 1 ? "unidade" : "unidades"}`], ["Arroz cru", `${(people * .025).toFixed(2)} kg`],
    ["Farofa", `${(people * .05).toFixed(2)} kg`], ["Vinagrete", `${(people * .06).toFixed(2)} kg`],
    ["Carvão", `${charcoalKg} kg`], ["Gelo", `${Math.max(5, Math.ceil(people * .6))} kg`],
    ["Sal grosso", `${Math.max(1, Math.ceil(meatKg * .1))} pacote`], ["Copos reutilizáveis", `${Math.ceil(people * 1.1)} unidades`],
    ["Pratos", `${Math.ceil(people * 1.1)} unidades`], ["Guardanapos", `${Math.ceil(people * 3)} unidades`],
    ["Chopp", `${beerLiters.toFixed(1)} L`], ["Latas (alternativa)", `${Math.ceil(beerLiters / .35)} unidades`],
    ["Garrafas 600 ml (alternativa)", `${Math.ceil(beerLiters / .6)} unidades`],
  ] as const;
}
