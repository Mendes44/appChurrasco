export type SplitGuest = { party_size:number; drinkers_count:number };

export type DetailedSplitGuest = SplitGuest & { id:string; included_by_default?:boolean };
export type SplitExpense = {
  id:string;
  description:string;
  amount_cents:number;
  category:"general"|"beer";
  included_in_split:boolean;
  split_mode?:"general"|"beer"|"selected"|null;
  participant_ids?:string[];
};

// Centraliza o rateio e garante que os centavos fechem exatamente com as despesas.
export function calculateCharges<T extends SplitGuest>(guests:T[],generalTotal:number,beerTotal:number){
  const people=guests.reduce((sum,guest)=>sum+guest.party_size,0);
  const drinkers=guests.reduce((sum,guest)=>sum+guest.drinkers_count,0);
  const generalPerPerson=people?generalTotal/people:0;
  const beerPerDrinker=drinkers?beerTotal/drinkers:0;
  const charges=guests.map(guest=>({...guest,cents:Math.round(generalPerPerson*guest.party_size+beerPerDrinker*guest.drinkers_count)}));
  if(charges.length){const rounded=charges.reduce((sum,guest)=>sum+guest.cents,0);charges[charges.length-1].cents+=generalTotal+beerTotal-rounded;}
  return{people,drinkers,generalPerPerson,beerPerDrinker,charges};
}

// Calcula cada despesa separadamente para permitir participantes diferentes e
// produzir uma memória de cálculo legível por convidado.
export function calculateDetailedCharges<T extends DetailedSplitGuest>(guests:T[],expenses:SplitExpense[]){
  const charges=guests.map(guest=>({...guest,cents:0,breakdown:[] as {expense_id:string;description:string;cents:number}[]}));
  for(const expense of expenses.filter(item=>item.included_in_split)){
    const mode=expense.split_mode??expense.category;
    const eligible=charges.filter(guest=>mode==="selected"
      ? (expense.participant_ids??[]).includes(guest.id)
      : guest.included_by_default!==false&&(mode==="beer" ? guest.drinkers_count>0 : guest.party_size>0));
    const weights=eligible.map(guest=>mode==="beer"?guest.drinkers_count:mode==="selected"?Math.max(1,guest.party_size):guest.party_size);
    const totalWeight=weights.reduce((sum,value)=>sum+value,0);
    if(!totalWeight)continue;
    let allocated=0;
    eligible.forEach((guest,index)=>{
      const cents=index===eligible.length-1
        ? expense.amount_cents-allocated
        : Math.round(expense.amount_cents*weights[index]/totalWeight);
      allocated+=cents;
      guest.cents+=cents;
      guest.breakdown.push({expense_id:expense.id,description:expense.description,cents});
    });
  }
  return {charges:charges.filter(guest=>guest.included_by_default!==false||guest.breakdown.length>0)};
}
