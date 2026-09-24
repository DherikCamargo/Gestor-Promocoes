// Tarifa de venda (listing_prices) e desconto na tarifa da oferta ativa (seller-promotions).
// Exemplos baseados na documentação oficial; dados simulados, sem consulta à conta.
// Executar com: pnpm test
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {listingSaleFee,activeOffer} from '../lib/listing-fees.ts';

const classico={currency_id:'BRL',listing_type_id:'gold_special',sale_fee_amount:26.99,sale_fee_details:{fixed_fee:0,gross_amount:26.99,percentage_fee:14}};
const premium={currency_id:'BRL',listing_type_id:'gold_pro',sale_fee_amount:36.99,sale_fee_details:{fixed_fee:0,gross_amount:36.99,percentage_fee:19}};

test('tarifa vem do tipo de anúncio exato',()=>{
 assert.deepEqual(listingSaleFee([premium,classico],'gold_special','BRL'),{amount:26.99,percentage:14,fixed:0});
 assert.deepEqual(listingSaleFee([premium,classico],'gold_pro','BRL'),{amount:36.99,percentage:19,fixed:0});
 assert.deepEqual(listingSaleFee(classico,'gold_special','BRL'),{amount:26.99,percentage:14,fixed:0});
});

test('tarifa ausente, ambígua ou em outra moeda não é presumida',()=>{
 assert.equal(listingSaleFee([premium],'gold_special','BRL'),null);
 assert.equal(listingSaleFee([classico,classico],'gold_special','BRL'),null);
 assert.equal(listingSaleFee([{...classico,currency_id:'ARS'}],'gold_special','BRL'),null);
 assert.equal(listingSaleFee([{...classico,sale_fee_amount:undefined}],'gold_special','BRL'),null);
 assert.equal(listingSaleFee(null,'gold_special','BRL'),null);
});

const smart={id:'P-MLB6288014',type:'SMART',ref_id:'OFFER-MLB4561352621-10000263432',status:'started',price:3245,meli_percentage:8,seller_percentage:16,original_price:5000,name:'Desconto no Pix',boosted_offer:true,discount_meli_boosted_percentage:11.1,discount_meli_boost_amount:555,total_price_for_boosted_offer:3245};

test('desconto na tarifa lido de discount_meli_boost_amount (exemplo da documentação)',()=>{
 assert.deepEqual(activeOffer([smart],smart.ref_id,3245),{status:'identified',name:'Desconto no Pix',type:'SMART',feeDiscount:555,meliPercentage:8});
});

test('oferta sem boosted_offer e sem co-participação não tem desconto na tarifa',()=>{
 const deal={type:'DEAL',ref_id:'OFFER-1',status:'started',price:148.35,name:'Top sellers'};
 assert.deepEqual(activeOffer([deal],'OFFER-1',148.35),{status:'identified',name:'Top sellers',type:'DEAL',feeDiscount:0,meliPercentage:null});
});

// Caso real (conferência de 24/09/2026): a Central mostra "Reduzimos R$ 6,91 das suas tarifas",
// a API envia só meli_percentage 3,5. O gestor não pode dizer "Sem desconto" nem inventar R$.
test('co-participação real MLB3575190873: mostra a porcentagem, nunca "sem desconto"',()=>{
 const queima={id:'P-MLB18027014',type:'SMART',name:'Queima de inverno Full',status:'started',ref_id:'OFFER-MLB3575190873-13720667431',price:109,original_price:199.9,meli_percentage:3.5,seller_percentage:42};
 const candidata={id:'P-MLB18023020',type:'SMART',status:'candidate',ref_id:'CANDIDATE-MLB3575190873-77183505868',price:112.43,original_price:199.9,meli_percentage:3.96,seller_percentage:40.04};
 assert.deepEqual(activeOffer([candidata,queima],queima.ref_id,109),{status:'identified',name:'Queima de inverno Full',type:'SMART',feeDiscount:null,meliPercentage:3.5});
});

test('oferta é ligada pelo ref_id do preço de venda, nunca por outra do mesmo anúncio',()=>{
 const candidata={...smart,ref_id:'CANDIDATE-1',status:'candidate'};
 const outra={...smart,ref_id:'OFFER-OUTRA'};
 assert.equal(activeOffer([candidata,outra],smart.ref_id,3245).status,'unconfirmed');
 assert.equal(activeOffer([candidata,outra,smart],smart.ref_id,3245).status,'identified');
});

test('preço da oferta diferente do preço de venda não é confirmado (incidente MLB4797014485)',()=>{
 const r=activeOffer([{type:'SMART',ref_id:'OFFER-X',status:'started',price:159.9}],'OFFER-X',148.35);
 assert.deepEqual(r,{status:'unconfirmed',reason:'O preço da oferta não corresponde ao preço de venda.'});
});

test('sem identificador, duplicada ou formato inválido fica não confirmada',()=>{
 assert.equal(activeOffer([smart],undefined,3245).status,'unconfirmed');
 assert.equal(activeOffer([smart,smart],smart.ref_id,3245).status,'unconfirmed');
 assert.equal(activeOffer({},smart.ref_id,3245).status,'unconfirmed');
});

test('boosted sem valor de desconto não vira zero',()=>{
 const semValor={...smart};delete semValor.discount_meli_boost_amount;
 assert.deepEqual(activeOffer([semValor],smart.ref_id,3245),{status:'unconfirmed',reason:'Desconto na tarifa indicado, mas sem valor informado.'});
});
