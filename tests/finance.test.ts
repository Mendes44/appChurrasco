// Testes de regressão garantem que o rateio sempre feche até o último centavo.
import test from "node:test";
import assert from "node:assert/strict";
import { calculateCharges } from "../lib/finance.ts";

test("rateio fecha exatamente mesmo quando há arredondamento",()=>{
  const result=calculateCharges([{party_size:2,drinkers_count:1},{party_size:1,drinkers_count:1}],10000,5000);
  assert.equal(result.charges.reduce((sum,item)=>sum+item.cents,0),15000);
});

test("cerveja é cobrada apenas de quem bebe",()=>{
  const result=calculateCharges([{party_size:1,drinkers_count:0},{party_size:1,drinkers_count:1}],2000,1000);
  assert.deepEqual(result.charges.map(item=>item.cents),[1000,2000]);
});
