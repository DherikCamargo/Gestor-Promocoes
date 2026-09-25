// Análise de promoções: preço da oferta, tarifa líquida, frete, lucro e margem.
// Valores simulados; o caso base reproduz os números reais do MLB3575190873 conferidos na Central.
// Executar com: pnpm test
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {analyzeOffer,offerTerms,parseRules,defaultRules} from '../lib/offer-analysis.ts';

const rules=defaultRules;
const base={price:109,saleFee:15.26,mlSubsidy:6.91,feeDiscount:0,mlFreight:17.15,cost:42,rules};

test('caso real MLB3575190873: recebido pela Central e lucro pelas regras',()=>{
 const a=analyzeOffer(base);
 // Recebido na Central: 109 − (15,26 − 6,91) − 17,15 = 83,50.
 assert.equal(Math.round((a.price-a.commission-a.freight)*100)/100,83.5);
 // 109 − 42 − 9,81 − 5,45 − 2,51 − 14 − 8,35 − 17,15 = 9,73 → 8,93%.
 assert.deepEqual({tax:a.tax,advertising:a.advertising,internalCommission:a.internalCommission,commission:a.commission,profit:a.profit},{tax:9.81,advertising:5.45,internalCommission:2.51,commission:8.35,profit:9.73});
 assert.equal(a.status,'approved');
 assert.equal(a.freightSource,'ml');
});

test('limite de margem: igual ao mínimo aprova, abaixo pede atenção, prejuízo não recomenda',()=>{
 const p=100,withProfit=profit=>analyzeOffer({price:p,saleFee:0,mlSubsidy:0,feeDiscount:0,mlFreight:0,cost:p-p*.09-p*.05-p*.03-14-profit,rules:{...rules,lowPriceThreshold:0}});
 assert.equal(withProfit(3).status,'approved');
 assert.equal(withProfit(2.99).status,'attention');
 assert.equal(withProfit(-0.01).status,'not_recommended');
});

test('abaixo de R$ 78,90 usa o frete da regra, não o do Mercado Livre',()=>{
 const a=analyzeOffer({...base,price:78.89,mlFreight:null});
 assert.equal(a.freight,9);assert.equal(a.freightSource,'rule');assert.notEqual(a.status,'missing');
 assert.equal(analyzeOffer({...base,price:78.90,mlFreight:null}).status,'missing');
});

test('dado ausente nunca vira zero: status "missing" com a lista do que falta',()=>{
 const a=analyzeOffer({...base,cost:null,saleFee:null,mlSubsidy:null,feeDiscount:null,mlFreight:null});
 assert.equal(a.status,'missing');assert.equal(a.profit,null);assert.equal(a.margin,null);
 assert.deepEqual(a.missing,['custo do produto','tarifa do Mercado Livre','subsídio do Mercado Livre','desconto na tarifa','frete']);
});

test('subsídio e desconto automático reduzem a tarifa, sem deixá-la negativa',()=>{
 assert.equal(analyzeOffer({...base,feeDiscount:5}).commission,3.35);
 assert.equal(analyzeOffer({...base,mlSubsidy:20}).commission,0);
});

test('regras editadas mudam o resultado',()=>{
 const a=analyzeOffer({...base,rules:{...rules,taxRate:.12,minimumMarginRate:.1}});
 assert.equal(a.tax,13.08);assert.equal(a.status,'attention');
});

test('termos da oferta: preço proposto, sugestão, contradição e cupom',()=>{
 const smart={type:'SMART',status:'candidate',price:112.43,original_price:199.9,meli_percentage:3.96,seller_percentage:40.04};
 assert.deepEqual(offerTerms(smart),{ok:true,price:112.43,priceSource:'offer',mlSubsidy:7.91,feeDiscount:0});
 const deal={type:'DEAL',status:'candidate',price:0,original_price:199.9,min_discounted_price:43.6,max_discounted_price:189.9,suggested_discounted_price:189.9};
 assert.deepEqual(offerTerms(deal),{ok:true,price:189.9,priceSource:'suggested',mlSubsidy:0,feeDiscount:0});
 assert.equal(offerTerms({type:'LIGHTNING',status:'candidate',price:180.48,max_discounted_price:170.99}).ok,false);
 assert.equal(offerTerms({type:'SELLER_COUPON_CAMPAIGN',status:'candidate',price:0,original_price:199.9}).ok,false);
 assert.equal(offerTerms({type:'SMART',status:'candidate',price:0}).ok,false);
});

test('regras só são aceitas completas e dentro dos limites',()=>{
 assert.deepEqual(parseRules(defaultRules),defaultRules);
 assert.equal(parseRules({...defaultRules,taxRate:1.5}),null);
 assert.equal(parseRules({...defaultRules,fixedExpense:-1}),null);
 const incomplete={...defaultRules};delete incomplete.minimumMarginRate;
 assert.equal(parseRules(incomplete),null);
 assert.equal(parseRules({...defaultRules,taxRate:'0.09'}),null);
});

test('preço contraditório explica o motivo (caso do incidente: 180,48 acima do máximo 170,99)',()=>{
 const r=offerTerms({type:'LIGHTNING',status:'candidate',price:180.48,max_discounted_price:170.99});
 assert.equal(r.ok,false);
 assert.equal(r.reason,'preço contraditório do Mercado Livre (preço da oferta acima do máximo informado). Confira na Central.');
});
