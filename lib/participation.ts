import {record} from './listing-summary';
import {promotionPrice} from './promotion-price';
import type {Analysis} from './offer-analysis';
// Regras de adesão (documentação seller-promotions, 09/06/2026).
// Preço definido pelo Mercado Livre, reversível:
//  SMART / PRICE_MATCHING: POST {promotion_id, promotion_type, offer_id = ref_id CANDIDATE-…}
//  MARKETPLACE_CAMPAIGN:   POST {promotion_id, promotion_type}
// Preço escolhido pelo vendedor, reversível (pedido de Dherik, 25/09/2026):
//  DEAL:           POST {promotion_id, promotion_type, deal_price} — dentro do mínimo/máximo da campanha
//  PRICE_DISCOUNT: POST {deal_price, start_date, finish_date, promotion_type} — desconto de 5% a < 80%,
//                  até 14 dias; a oferta vem sem id nem ref_id (identificada pelo tipo).
// LIGHTNING e DOD (irreversíveis; relâmpago com estoque) ficam para depois.
export const activatableTypes=new Set(['SMART','PRICE_MATCHING','MARKETPLACE_CAMPAIGN']);
export const priceTypes=new Set(['DEAL','PRICE_DISCOUNT']);
const promotionIdPattern=/^[A-Z]{1,4}-MLB\d{1,20}$/,candidatePattern=/^CANDIDATE-MLB\d{1,20}-\d{1,30}$/;
type OfferIdentity={id:string|null;refId:string|null;type:string|null;status:string};

// Chave estável da oferta para tela e adesão: ref_id, id ou, no desconto individual, o próprio tipo.
export const offerKey=(o:{id:string|null;refId:string|null;type:string|null})=>o.refId??o.id??(o.type==='PRICE_DISCOUNT'?'PRICE_DISCOUNT':null);

// Motivo estrutural para não ativar (status, tipo, identificadores); não olha a margem.
export function structuralBlock(o:OfferIdentity):string|null{
 if(o.status==='started')return 'Já participando.';
 if(o.status==='pending')return 'Adesão já programada.';
 if(o.status!=='candidate')return 'Oferta não disponível para adesão.';
 if(o.type==='LIGHTNING'||o.type==='DOD')return 'Oferta relâmpago e oferta do dia não podem ser desfeitas: ative pela Central por enquanto.';
 if(!o.type||!(activatableTypes.has(o.type)||priceTypes.has(o.type)))return 'Tipo de promoção ainda não suportado pelo gestor: ative pela Central.';
 if(o.type!=='PRICE_DISCOUNT'&&(!o.id||!promotionIdPattern.test(o.id)))return 'Identificador da campanha não reconhecido.';
 if((o.type==='SMART'||o.type==='PRICE_MATCHING')&&(!o.refId||!candidatePattern.test(o.refId)))return 'Identificador da oferta candidata não reconhecido.';
 return null;
}

// Motivo para não ativar; null = pode ativar. Nos tipos de preço escolhido, a análise é a do preço escolhido.
export function activationBlock(o:OfferIdentity,analysis?:Analysis):string|null{
 const s=structuralBlock(o);if(s)return s;
 if(!analysis)return 'Oferta sem análise de margem.';
 if(analysis.status==='missing')return 'Faltam dados para calcular a margem.';
 if(analysis.status!=='approved')return 'Margem abaixo do mínimo.';
 return null;
}

// Preço escolhido: limites da campanha (mínimo/máximo) e, no desconto individual, de 5% a menos de 80%.
export function priceChoiceProblem(o:{type:string|null;min:number|null;max:number|null;originalPrice:number|null},price:number):string|null{
 if(!Number.isFinite(price)||price<=0||Math.abs(price*100-Math.round(price*100))>1e-6)return 'Informe um preço como 150 ou 149,90.';
 const c=(n:number)=>Math.round(n*100);
 if(o.min!==null&&c(price)<c(o.min))return 'Abaixo do mínimo aceito pelo Mercado Livre.';
 if(o.max!==null&&c(price)>c(o.max))return 'Acima do máximo aceito pelo Mercado Livre.';
 if(o.type==='PRICE_DISCOUNT'){
  if(o.originalPrice===null)return 'Preço original não informado: não dá para conferir o desconto.';
  const discount=1-price/o.originalPrice;
  if(discount<0.05-1e-9)return 'O desconto individual precisa ser de pelo menos 5%.';
  if(discount>=0.8)return 'O desconto individual precisa ser menor que 80%.';
 }
 return null;
}

// Datas do desconto individual no formato da documentação ("2023-04-19T00:00:00", horário de Brasília).
export function discountDates(now:number,days:number):{start_date:string;finish_date:string}{
 const brt=(t:number)=>new Date(t-3*3600000).toISOString().slice(0,19);
 return {start_date:brt(now),finish_date:brt(now+days*86400000-60000)};
}

export function participationPayload(o:OfferIdentity,choice?:{price:number;days?:number;now?:number}):Record<string,string|number>{
 if(structuralBlock({...o,status:'candidate'}))throw Error('Oferta não ativável.');
 if(priceTypes.has(o.type!)){
  if(!choice)throw Error('Preço não informado.');
  if(o.type==='DEAL')return {promotion_id:o.id!,promotion_type:'DEAL',deal_price:choice.price};
  const days=choice.days??14;
  if(!Number.isInteger(days)||days<1||days>14)throw Error('Duração do desconto individual: de 1 a 14 dias.');
  return {deal_price:choice.price,...discountDates(choice.now??Date.now(),days),promotion_type:'PRICE_DISCOUNT'};
 }
 return o.type==='MARKETPLACE_CAMPAIGN'
  ?{promotion_id:o.id!,promotion_type:o.type}
  :{promotion_id:o.id!,promotion_type:o.type!,offer_id:o.refId!};
}

export type Verification={status:'confirmed';price:number;state:'started'|'pending';offerId:string|null}|{status:'divergent';price:number|null;expected:number;offerId:string|null}|{status:'not_found'};
// Depois da adesão: a oferta da mesma campanha (ou, sem id, do mesmo tipo) precisa aparecer ativa ou
// programada com o preço esperado. O offer_id devolvido pelo POST nem sempre é igual ao ref_id da lista
// (1º teste real, 25/09/2026); ele só desempata quando há mais de uma oferta ativa/programada.
export function verifyParticipation(after:unknown,x:{promotionId:string|null;type:string;expectedPrice:number;offerId:string|null}):Verification{
 if(!Array.isArray(after))return {status:'not_found'};
 const active=after.map(record).filter(o=>(x.promotionId===null||o.id===x.promotionId)&&o.type===x.type&&(o.status==='started'||o.status==='pending'));
 const matches=active.length>1&&x.offerId?active.filter(o=>o.ref_id===x.offerId):active;
 if(matches.length!==1)return {status:'not_found'};
 const o=matches[0],price=promotionPrice(o),offerId=typeof o.ref_id==='string'?o.ref_id:null;
 if(price===null||Math.round(price*100)!==Math.round(x.expectedPrice*100))return {status:'divergent',price,expected:x.expectedPrice,offerId};
 return {status:'confirmed',price,state:o.status as 'started'|'pending',offerId};
}
