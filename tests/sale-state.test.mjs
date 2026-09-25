// Anúncio no preço normal (sem promoção) × com promoção, pelo sale_price.
// Executar com: pnpm test
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {saleState} from '../lib/sale-state.ts';

test('com promoção: regular_amount maior que amount (caso real MLB3575190873)',()=>{
 assert.deepEqual(saleState({amount:109,regular_amount:199.9,currency_id:'BRL'}),{state:'promotion',price:109,regularPrice:199.9});
});

test('no preço normal: sem regular_amount ou igual ao amount',()=>{
 assert.deepEqual(saleState({amount:189.98}),{state:'regular',price:189.98,regularPrice:189.98});
 assert.deepEqual(saleState({amount:189.98,regular_amount:189.98}),{state:'regular',price:189.98,regularPrice:189.98});
});

test('sem preço informado: desconhecido, nunca "sem promoção"',()=>{
 for(const s of [null,undefined,{},{amount:0},{amount:'100'}])assert.deepEqual(saleState(s),{state:'unknown'});
});
