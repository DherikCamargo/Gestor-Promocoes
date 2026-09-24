// Regras que impedem exibir preço de proposta contraditório (incidente LIGHTNING, v28/v29).
// Executar com: pnpm test
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {promotionPrice,promotionPriceIssues} from '../lib/promotion-price.ts';

test('LIGHTNING com preço acima do máximo é bloqueada (caso real MLB7000972334)',()=>{
 const oferta={status:'candidate',price:180.48,min_discounted_price:38,max_discounted_price:170.99,suggested_discounted_price:161.48};
 assert.deepEqual(promotionPriceIssues(oferta),['Preço da oferta acima do máximo informado.']);
 assert.equal(promotionPrice(oferta),null);
});

test('preço coerente dentro dos limites continua disponível',()=>{
 const oferta={status:'candidate',price:165,min_discounted_price:38,max_discounted_price:170.99};
 assert.deepEqual(promotionPriceIssues(oferta),[]);
 assert.equal(promotionPrice(oferta),165);
});

test('mínimo maior que o máximo é contradição',()=>{
 const oferta={status:'candidate',price:100,min_discounted_price:120,max_discounted_price:110};
 assert.ok(promotionPriceIssues(oferta).includes('Limite mínimo maior que o máximo.'));
 assert.equal(promotionPrice(oferta),null);
});

test('sugestão só é usada por candidato sem preço positivo',()=>{
 assert.equal(promotionPrice({status:'candidate',price:0,suggested_discounted_price:174.5}),174.5);
 assert.equal(promotionPrice({status:'candidate',price:170,suggested_discounted_price:174.5}),170);
 assert.equal(promotionPrice({status:'started',price:0,suggested_discounted_price:174.5}),null);
});

test('limites sozinhos nunca viram preço',()=>{
 assert.equal(promotionPrice({status:'candidate',min_discounted_price:38,max_discounted_price:170.99}),null);
});

test('sugestão fora dos limites também é bloqueada',()=>{
 const oferta={status:'candidate',price:0,suggested_discounted_price:162.45,max_discounted_price:162};
 assert.deepEqual(promotionPriceIssues(oferta),['Preço sugerido acima do máximo informado.']);
 assert.equal(promotionPrice(oferta),null);
});

test('comparação em centavos não bloqueia preço igual ao limite',()=>{
 assert.equal(promotionPrice({status:'candidate',price:170.99,max_discounted_price:170.99}),170.99);
 assert.equal(promotionPrice({status:'candidate',price:0.1+0.2,min_discounted_price:0.3}),0.1+0.2);
});

test('oferta impulsionada usa somente total_price_for_boosted_offer',()=>{
 assert.equal(promotionPrice({status:'candidate',boosted_offer:true,price:150,total_price_for_boosted_offer:140}),140);
 assert.equal(promotionPrice({status:'candidate',boosted_offer:true,price:150}),null);
});
