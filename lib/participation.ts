import {record} from './listing-summary';
import {promotionPrice} from './promotion-price';
import type {Analysis} from './offer-analysis';
// Regras de adesão. Primeira versão: só tipos em que o preço é definido pelo Mercado Livre e a
// adesão pode ser desfeita (documentação seller-promotions, 09/06/2026):
//  SMART / PRICE_MATCHING: POST {promotion_id, promotion_type, offer_id = ref_id CANDIDATE-…}
//  MARKETPLACE_CAMPAIGN:   POST {promotion_id, promotion_type}
// DEAL/PRICE_DISCOUNT (preço escolhido pelo vendedor) e LIGHTNING/DOD (irreversíveis, com estoque)
// ficam para depois.
export const activatableTypes=new Set(['SMART','PRICE_MATCHING','MARKETPLACE_CAMPAIGN']);
const promotionIdPattern=/^[A-Z]{1,4}-MLB\d{1,20}$/,candidatePattern=/^CANDIDATE-MLB\d{1,20}-\d{1,30}$/;
type OfferIdentity={id:string|null;refId:string|null;type:string|null;status:string};

// Motivo para não ativar; null = pode ativar.
export function activationBlock(o:OfferIdentity,analysis?:Analysis):string|null{
 if(o.status==='started')return 'Já participando.';
 if(o.status==='pending')return 'Adesão já programada.';
 if(o.status!=='candidate')return 'Oferta não disponível para adesão.';
 if(!o.type||!activatableTypes.has(o.type))return 'Neste tipo você escolhe o preço ou a adesão é irreversível: ative pela Central por enquanto.';
 if(!o.id||!promotionIdPattern.test(o.id))return 'Identificador da campanha não reconhecido.';
 if(o.type!=='MARKETPLACE_CAMPAIGN'&&(!o.refId||!candidatePattern.test(o.refId)))return 'Identificador da oferta candidata não reconhecido.';
 if(!analysis)return 'Oferta sem análise de margem.';
 if(analysis.status==='missing')return 'Faltam dados para calcular a margem.';
 if(analysis.status!=='approved')return 'Margem abaixo do mínimo.';
 return null;
}

export function participationPayload(o:OfferIdentity):Record<string,string>{
 if(activationBlock({...o,status:'candidate'},{status:'approved'} as Analysis))throw Error('Oferta não ativável.');
 return o.type==='MARKETPLACE_CAMPAIGN'
  ?{promotion_id:o.id!,promotion_type:o.type}
  :{promotion_id:o.id!,promotion_type:o.type!,offer_id:o.refId!};
}

export type Verification={status:'confirmed';price:number;state:'started'|'pending';offerId:string|null}|{status:'divergent';price:number|null;expected:number;offerId:string|null}|{status:'not_found'};
// Depois da adesão: a oferta da mesma campanha precisa aparecer ativa ou programada com o preço esperado.
// O offer_id devolvido pelo POST nem sempre é igual ao ref_id da lista (1º teste real, MLB com Set26 |
// Top Sellers em 25/09/2026: ativa na Central, mas não reconhecida). Ele só desempata quando a mesma
// campanha tem mais de uma oferta ativa/programada.
export function verifyParticipation(after:unknown,x:{promotionId:string;type:string;expectedPrice:number;offerId:string|null}):Verification{
 if(!Array.isArray(after))return {status:'not_found'};
 const active=after.map(record).filter(o=>o.id===x.promotionId&&o.type===x.type&&(o.status==='started'||o.status==='pending'));
 const matches=active.length>1&&x.offerId?active.filter(o=>o.ref_id===x.offerId):active;
 if(matches.length!==1)return {status:'not_found'};
 const o=matches[0],price=promotionPrice(o),offerId=typeof o.ref_id==='string'?o.ref_id:null;
 if(price===null||Math.round(price*100)!==Math.round(x.expectedPrice*100))return {status:'divergent',price,expected:x.expectedPrice,offerId};
 return {status:'confirmed',price,state:o.status as 'started'|'pending',offerId};
}
