export type SplitGuest = { party_size:number; drinkers_count:number };

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

