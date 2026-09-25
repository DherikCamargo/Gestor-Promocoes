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

// Campanha tradicional (10.10): o vendedor escolhe o preço dentro do mínimo/máximo.
const deal={id:'P-MLB18061082',type:'DEAL',name:'10.10',status:'candidate',price:0,original_price:199.9,min_discounted_price:43.6,max_discounted_price:189.9,suggested_discounted_price:189.9};
const dealRun=(api,choice,extra={})=>{const log=[];return participateOffer({api,itemId:'MLB1',refId:deal.id,overrides:{},rules:defaultRules,log:async e=>{log.push(e)},wait:async()=>{},choice,...extra}).then(r=>({r,log}))};

test('campanha tradicional sem preço informado: não envia nada',async()=>{
 const {api,calls}=mockApi({offers:[deal]});
 const {r}=await dealRun(api,undefined);
 assert.equal(r.status,'refused');assert.match(r.detail,/Informe o preço/);assert.equal(calls.post.length,0);
});

test('campanha tradicional com preço escolhido: envia deal_price e confere o preço aplicado',async()=>{
 const {api,calls}=mockApi({offers:[deal],after:[{...deal,status:'started',price:150}],post:()=>({price:150,original_price:199.9})});
 const {r,log}=await dealRun(api,{price:150});
 assert.equal(r.status,'confirmed');assert.equal(r.price,150);
 assert.deepEqual(calls.post[0].body,{promotion_id:'P-MLB18061082',promotion_type:'DEAL',deal_price:150});
 assert.deepEqual(log.map(e=>e.status),['requested','confirmed']);
});

test('preço escolhido fora dos limites ou com margem reprovada: não envia nada',async()=>{
 for(const [price,msg] of [[190,/Acima do máximo/],[40,/Abaixo do mínimo/],[149.999,/Informe um preço/]]){
  const {api,calls}=mockApi({offers:[deal]});
  const {r}=await dealRun(api,{price});
  assert.equal(r.status,'refused');assert.match(r.detail,msg);assert.equal(calls.post.length,0);
 }
 const {api,calls}=mockApi({offers:[deal]});
 const {r}=await dealRun(api,{price:60});
 assert.equal(r.status,'refused');assert.match(r.detail,/Margem abaixo do mínimo/);assert.equal(calls.post.length,0);
});

test('promoção de preço do Mercado Livre não aceita preço escolhido',async()=>{
 const {api,calls}=mockApi();
 const r=await participateOffer({api,itemId:'MLB1',refId:smart.ref_id,overrides:{},rules:defaultRules,log:async()=>{},wait:async()=>{},choice:{price:100}});
 assert.equal(r.status,'refused');assert.match(r.detail,/definido pelo Mercado Livre/);assert.equal(calls.post.length,0);
});

// Desconto individual: sem id nem ref_id, identificado pelo tipo; 5% a < 80%, até 14 dias.
const discount={type:'PRICE_DISCOUNT',name:'',status:'candidate',price:0,original_price:199.9,min_discounted_price:43.6,max_discounted_price:189.9,suggested_discounted_price:189.9};
test('desconto individual: envia preço e datas (horário de Brasília) e confere pelo tipo',async()=>{
 const now=Date.parse('2026-09-25T15:00:00Z');
 const {api,calls}=mockApi({offers:[discount],after:[{...discount,status:'started',price:170}],post:()=>({price:170,original_price:199.9})});
 const r=await participateOffer({api,itemId:'MLB1',refId:'PRICE_DISCOUNT',overrides:{},rules:defaultRules,log:async()=>{},wait:async()=>{},choice:{price:170,days:7},now});
 assert.equal(r.status,'confirmed');
 assert.deepEqual(calls.post[0].body,{deal_price:170,start_date:'2026-09-25T12:00:00',finish_date:'2026-10-02T11:59:00',promotion_type:'PRICE_DISCOUNT'});
});

test('desconto individual: menos de 5% ou 80% ou mais é recusado',async()=>{
 for(const [price,msg] of [[195,/pelo menos 5%/],[39.98,/Abaixo do mínimo|menor que 80%/]]){
  const {api,calls}=mockApi({offers:[{...discount,min_discounted_price:null,max_discounted_price:null}]});
  const r=await participateOffer({api,itemId:'MLB1',refId:'PRICE_DISCOUNT',overrides:{},rules:defaultRules,log:async()=>{},wait:async()=>{},choice:{price}});
  assert.equal(r.status,'refused');assert.match(r.detail,msg);assert.equal(calls.post.length,0);
 }
});

test('oferta relâmpago continua bloqueada mesmo com preço',async()=>{
 const lgh={id:'LGH-MLB1000',type:'LIGHTNING',status:'candidate',ref_id:'CANDIDATE-MLB1-9',price:150,original_price:199.9};
 const {api,calls}=mockApi({offers:[lgh]});
 const r=await participateOffer({api,itemId:'MLB1',refId:lgh.ref_id,overrides:{},rules:defaultRules,log:async()=>{},wait:async()=>{},choice:{price:150}});
 assert.equal(r.status,'refused');assert.match(r.detail,/não podem ser desfeitas/);assert.equal(calls.post.length,0);
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

test('oferta não aparece depois do pedido: "unverified" após 5 leituras',async()=>{
 const {api,calls}=mockApi({after:[smart]});
 const {r}=await run(api);
 assert.equal(r.status,'unverified');assert.equal(calls.reads,1+5);
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

test('conferência exige a mesma campanha e tipo; o offer_id só desempata',()=>{
 const x={promotionId:'P-MLB18023020',type:'SMART',expectedPrice:112.43,offerId:'OFFER-MLB1-555'};
 assert.equal(verifyParticipation([started(smart)],x).status,'confirmed');
 assert.equal(verifyParticipation([{...started(smart),status:'pending'}],x).state,'pending');
 // 1º teste real (25/09/2026): offer_id do POST diferente do ref_id da lista, oferta ativa na Central.
 assert.equal(verifyParticipation([{...started(smart),ref_id:'OFFER-MLB1-13720667431'}],x).status,'confirmed');
 const duas=[{...started(smart),ref_id:'OFFER-MLB1-555'},{...started(smart),ref_id:'OFFER-OUTRA',price:99}];
 assert.equal(verifyParticipation(duas,x).price,112.43);
 assert.equal(verifyParticipation(duas,{...x,offerId:'OFFER-NENHUMA'}).status,'not_found');
 assert.equal(verifyParticipation([{...started(smart),type:'DEAL'}],x).status,'not_found');
 assert.equal(verifyParticipation([{...started(smart),id:'P-MLB999'}],x).status,'not_found');
 assert.equal(verifyParticipation(null,x).status,'not_found');
});

test('caso real: offer_id do POST diferente do ref_id da lista é confirmado pelo preço',async()=>{
 const {api}=mockApi({after:[{...started(smart),ref_id:'OFFER-MLB1-13720667431'}],post:()=>({offer_id:'OFFER-MLB1-177685',price:112.43})});
 const {r,log}=await run(api);
 assert.equal(r.status,'confirmed');
 const detail=JSON.parse(log.at(-1).detail);
 assert.equal(detail.responseOfferId,'OFFER-MLB1-177685');
});
