// Regras de preço e frete da tela simplificada (Continuidade-Gestor-Promocoes-v32.md).
// Executar com: pnpm test
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {listingPrices,listingFreight} from '../lib/listing-summary.ts';

const item={currency_id:'BRL',variations:[]};

test('promoção ativa: regular_amount maior que amount mostra normal e promocional',()=>{
 assert.deepEqual(listingPrices(item,{amount:109,regular_amount:199.9,currency_id:'BRL'}),
  {currency:'BRL',variationPrices:false,regularPrice:199.9,promotionPrice:109,currentPrice:109});
});

test('sem promoção informada: amount vira preço normal',()=>{
 for(const sale of [{amount:189.98,currency_id:'BRL'},{amount:189.98,regular_amount:189.98,currency_id:'BRL'}]){
  const r=listingPrices(item,sale);
  assert.equal(r.regularPrice,189.98);
  assert.equal(r.promotionPrice,null);
 }
});

test('falha no sale_price deixa tudo não informado, nunca zero',()=>{
 for(const sale of [null,undefined,{},{amount:0,currency_id:'BRL'}]){
  const r=listingPrices(item,sale);
  assert.equal(r.currentPrice,null);
  assert.equal(r.regularPrice,null);
  assert.equal(r.promotionPrice,null);
 }
});

test('variações com preços diferentes ou incompletos não recebem preço único',()=>{
 const sale={amount:100,regular_amount:120,currency_id:'BRL'};
 for(const variations of [[{price:100},{price:120}],[{price:100},{}]]){
  const r=listingPrices({currency_id:'BRL',variations},sale);
  assert.equal(r.variationPrices,true);
  assert.equal(r.currentPrice,null);
  assert.equal(r.promotionPrice,null);
 }
});

test('variações com o mesmo preço usam o preço do anúncio',()=>{
 const r=listingPrices({currency_id:'BRL',variations:[{price:100},{price:100}]},{amount:100,currency_id:'BRL'});
 assert.equal(r.variationPrices,false);
 assert.equal(r.currentPrice,100);
});

test('moeda diferente da do anúncio não é usada',()=>{
 assert.equal(listingPrices(item,{amount:100,currency_id:'USD'}).currentPrice,null);
 assert.equal(listingFreight({coverage:{all_country:{list_cost:21.75,currency_id:'USD'}}},'BRL'),null);
});

test('frete usa exatamente coverage.all_country.list_cost',()=>{
 assert.equal(listingFreight({coverage:{all_country:{list_cost:21.75,currency_id:'BRL'}}},'BRL'),21.75);
});

test('campos de frete do comprador não são usados',()=>{
 assert.equal(listingFreight({options:[{list_cost:30,currency_id:'BRL'}],list_cost:30},'BRL'),null);
});

test('frete zero é válido; ausente ou negativo não é',()=>{
 assert.equal(listingFreight({coverage:{all_country:{list_cost:0,currency_id:'BRL'}}},'BRL'),0);
 assert.equal(listingFreight(null,'BRL'),null);
 assert.equal(listingFreight({coverage:{all_country:{list_cost:-1,currency_id:'BRL'}}},'BRL'),null);
});
