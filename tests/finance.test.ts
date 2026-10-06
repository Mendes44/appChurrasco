// Testes de regressão garantem que o rateio sempre feche até o último centavo.
import test from "node:test";
import assert from "node:assert/strict";
import { calculateCharges, calculateDetailedCharges } from "../lib/finance.ts";

test("rateio fecha exatamente mesmo quando há arredondamento",()=>{
  const result=calculateCharges([{party_size:2,drinkers_count:1},{party_size:1,drinkers_count:1}],10000,5000);
  assert.equal(result.charges.reduce((sum,item)=>sum+item.cents,0),15000);
});

test("cerveja é cobrada apenas de quem bebe",()=>{
  const result=calculateCharges([{party_size:1,drinkers_count:0},{party_size:1,drinkers_count:1}],2000,1000);
  assert.deepEqual(result.charges.map(item=>item.cents),[1000,2000]);
});

test("despesa selecionada cobra somente os convidados escolhidos",()=>{
  const guests=[{id:"a",party_size:1,drinkers_count:1},{id:"b",party_size:2,drinkers_count:1}];
  const expenses=[{id:"sitio",description:"Sítio",amount_cents:9000,category:"general" as const,included_in_split:true,split_mode:"selected" as const,participant_ids:["a"]},{id:"carne",description:"Carne",amount_cents:3000,category:"general" as const,included_in_split:true,split_mode:"general" as const}];
  const result=calculateDetailedCharges(guests,expenses);
  assert.deepEqual(result.charges.map(item=>item.cents),[10000,2000]);
  assert.deepEqual(result.charges[1].breakdown.map(item=>item.description),["Carne"]);
});
