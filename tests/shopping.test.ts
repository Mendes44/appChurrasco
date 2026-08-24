// Este teste protege as fórmulas configuráveis da lista de compras.
import test from "node:test";
import assert from "node:assert/strict";
import { buildShoppingList } from "../lib/shopping.ts";

test("lista respeita gramas e litros configurados",()=>{
  const list=Object.fromEntries(buildShoppingList(10,4,400,1.2));
  assert.equal(list["Carne bovina"],"1.60 kg");
  assert.equal(list.Chopp,"4.8 L");
  assert.equal(list["Garrafas 600 ml (alternativa)"],"8 unidades");
});
