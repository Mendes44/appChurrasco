// Regras de compra ficam isoladas da interface para facilitar ajustes futuros.
export function buildShoppingList(people: number, drinkers: number, gramsPerPerson: number) {
  const meatKg = people * gramsPerPerson / 1000;
  return [
    ["Carne bovina", `${(meatKg * .4).toFixed(2)} kg`], ["Linguiça", `${(meatKg * .25).toFixed(2)} kg`],
    ["Frango", `${(meatKg * .2).toFixed(2)} kg`], ["Carne suína", `${(meatKg * .15).toFixed(2)} kg`],
    ["Pão de alho", `${Math.ceil(people * 1.5)} unidades`], ["Arroz", `${(people * .08).toFixed(2)} kg`],
    ["Farofa", `${(people * .05).toFixed(2)} kg`], ["Vinagrete", `${(people * .08).toFixed(2)} kg`],
    ["Carvão", `${Math.max(3, Math.ceil(meatKg * 1.5))} kg`], ["Gelo", `${Math.max(5, Math.ceil(people * .6))} kg`],
    ["Sal grosso", `${Math.max(1, Math.ceil(meatKg * .1))} pacote`], ["Copos", `${Math.ceil(people * 3)} unidades`],
    ["Pratos", `${Math.ceil(people * 1.5)} unidades`], ["Guardanapos", `${Math.ceil(people * 5)} unidades`],
    ["Chopp", `${(drinkers * 1.5).toFixed(1)} L`], ["Latas (alternativa)", `${drinkers * 5} unidades`],
    ["Garrafas 600 ml (alternativa)", `${Math.ceil(drinkers * 1.7)} unidades`],
  ] as const;
}
