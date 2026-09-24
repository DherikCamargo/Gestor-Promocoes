// Adesão a promoções com Mercado Livre simulado (nenhuma chamada real).
// Executar com: pnpm test
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {participateOffer} from '../lib/participate.ts';
import {activationBlock,participationPayload,verifyParticipation} from '../lib/participation.ts';
import {defaultRules} from '../lib/offer-analysis.ts';

const item={id:'MLB1',seller_id:9,title:'Blusa 3 zíper',currency_id:'BRL',category_id:'MLB108',listing_type_id:'gold_special',price:199.9,
 attributes:[{id:'SELLER_SKU',value_name:'MOL-3ZIP-PRT-G'}],shipping:{mode:'me2',free_shipping:true,logistic_type:'fulfillment'}};
const smart={id:'P-MLB18023020',type:'SMART',name:'Set26 | Top Sellers',status:'candidate',ref_id:'CANDIDATE-MLB1-77183505868',price:112.43,original_price:199.9,meli_percentage:3.96,seller_percentage:40.04};
const started=(o,price=o.price)=>({...o,status:'started',ref_id:'OFFER-MLB1-555',price});

function mockApi({offers=[smart],after=[started(smart)],post=()=>({offer_id:'OFFER-MLB1-555',price:112.43}),sellerId='9'}={}){
 const calls={post:[],reads:0};
 let current=offers;
 const api={sellerId,
  async get(path){
   if(path.startsWith('/items/'))return item;
   if(path.startsWith('/seller-promotions/items/')){calls.reads++;return current}
   if(path.startsWith('/sites/MLB/listing_prices'))return [{listing_type_id:'gold_special',currency_id:'BRL',sale_fee_amount:15.74,sale_fee_details:{percentage_fee:14,fixed_fee:0}}];
   if(path.includes('/shipping_options/free'))return {coverage:{all_country:{list_cost:17.15,currency_id:'BRL'}}};
   throw Error('rota inesperada '+path);
  },
  async post(path,body){calls.post.push({path,body});const r=post(body);current=after;return r},
 };
 return {api,calls};
}
const run=(api,extra={})=>{const log=[];return participateOffer({api,itemId:'MLB1',refId:smart.ref_id,overrides:{},rules:defaultRules,log:async e=>{log.push(e)},wait:async()=>{},...extra}).then(r=>({r,log}))};

test('adesão aprovada: envia o pedido do tipo SMART e confirma o preço depois',async()=>{
 const {api,calls}=mockApi();
 const {r,log}=await run(api);
 assert.equal(r.status,'confirmed');assert.equal(r.price,112.43);assert.equal(r.state,'started');
 assert.deepEqual(calls.post,[{path:'/seller-promotions/items/MLB1?app_version=v2',body:{promotion_id:'P-MLB18023020',promotion_type:'SMART',offer_id:'CANDIDATE-MLB1-77183505868'}}]);
 assert.deepEqual(log.map(e=>e.status),['requested','confirmed']);
});

test('margem reprovada com o custo atual: não envia nada',async()=>{
 const {api,calls}=mockApi();
 const {r,log}=await run(api,{overrides:{BLUSA_3ZIP:100}});
 assert.equal(r.status,'refused');assert.match(r.detail,/Margem abaixo do mínimo/);
 assert.equal(calls.post.length,0);assert.equal(log.length,0);
});

test('tipo em que o vendedor escolhe o preço (DEAL): não envia nada',async()=>{
 const deal={id:'P-MLB18049186',type:'DEAL',status:'candidate',ref_id:'CANDIDATE-MLB1-1',price:0,original_price:199.9,min_discounted_price:43.6,max_discounted_price:189.9,suggested_discounted_price:150};
 const {api,calls}=mockApi({offers:[deal]});
 const r=await participateOffer({api,itemId:'MLB1',refId:deal.ref_id,overrides:{},rules:defaultRules,log:async()=>{},wait:async()=>{}});
 assert.equal(r.status,'refused');assert.match(r.detail,/Central/);assert.equal(calls.post.length,0);
});

test('Mercado Livre recusa: resultado "failed" registrado',async()=>{
 const {api}=mockApi({post:()=>{throw Error('O Mercado Livre recusou a operação (HTTP 400).')}});
 const {r,log}=await run(api);
 assert.equal(r.status,'failed');assert.match(r.detail,/HTTP 400/);
 assert.deepEqual(log.map(e=>e.status),['requested','failed']);
});

test('preço aplicado diferente do analisado: "divergent" (incidente MLB4797014485)',async()=>{
 const {api}=mockApi({after:[started(smart,105)],post:()=>({offer_id:'OFFER-MLB1-555',price:105})});
 const {r,log}=await run(api);
 assert.equal(r.status,'divergent');assert.equal(r.price,105);assert.equal(r.expected,112.43);
 assert.equal(log.at(-1).status,'divergent');
 const {api:api2}=mockApi({post:()=>({offer_id:'OFFER-MLB1-555',price:105})});
 assert.equal((await run(api2)).r.status,'divergent');
});

test('oferta não aparece depois do pedido: "unverified" após 3 leituras',async()=>{
 const {api,calls}=mockApi({after:[smart]});
 const {r}=await run(api);
 assert.equal(r.status,'unverified');assert.equal(calls.reads,1+3);
});

test('anúncio de outra conta ou oferta sumida: recusa sem enviar',async()=>{
 const other=mockApi({sellerId:'77'});
 assert.equal((await run(other.api)).r.status,'refused');assert.equal(other.calls.post.length,0);
 const gone=mockApi({offers:[]});
 assert.match((await run(gone.api)).r.detail,/não está mais disponível/);
});

test('regras de ativação e pedido por tipo',()=>{
 const ok={status:'approved'};
 assert.equal(activationBlock({id:'P-MLB1',refId:null,type:'MARKETPLACE_CAMPAIGN',status:'candidate'},ok),null);
 assert.deepEqual(participationPayload({id:'P-MLB1',refId:null,type:'MARKETPLACE_CAMPAIGN',status:'candidate'}),{promotion_id:'P-MLB1',promotion_type:'MARKETPLACE_CAMPAIGN'});
 assert.match(activationBlock({id:'P-MLB1',refId:'x',type:'SMART',status:'candidate'},ok),/oferta candidata/);
 assert.match(activationBlock({id:'LGH-MLB1000',refId:'CANDIDATE-MLB1-2',type:'LIGHTNING',status:'candidate'},ok),/Central/);
 assert.match(activationBlock({...smart,refId:smart.ref_id,status:'started'},ok),/Já participando/);
 assert.throws(()=>participationPayload({id:'P-MLB1',refId:null,type:'DEAL',status:'candidate'}));
});

test('conferência exige a mesma campanha, tipo e oferta',()=>{
 const x={promotionId:'P-MLB18023020',type:'SMART',expectedPrice:112.43,offerId:'OFFER-MLB1-555'};
 assert.equal(verifyParticipation([started(smart)],x).status,'confirmed');
 assert.equal(verifyParticipation([{...started(smart),status:'pending'}],x).state,'pending');
 assert.equal(verifyParticipation([{...started(smart),ref_id:'OFFER-OUTRA'}],x).status,'not_found');
 assert.equal(verifyParticipation([{...started(smart),type:'DEAL'}],x).status,'not_found');
 assert.equal(verifyParticipation(null,x).status,'not_found');
});
