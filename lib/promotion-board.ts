import type {OfferReport} from './offer-report';
import {parseMlDate,coverage,continuesAfter,type Coverage} from './promotion-dates';
// Classificação de um anúncio para o Painel de promoções.
// "active": já em promoção (ativa ou programada) — fora da ativação em lote, para não trocar a
// promoção atual; "available": sem promoção e com oferta apta; "none": sem promoção e sem oferta apta.
// Datas em milissegundos (null = não informada pelo Mercado Livre).
export type AptOffer={refId:string;id:string|null;name:string;type:string|null;price:number;margin:number;profit:number;start:number|null;finish:number|null};
export type ActivePromotion={name:string;status:string;price:number|null;start:number|null;finish:number|null;coverage:Coverage;next:AptOffer[]};
export type ListingClass=
 {status:'active';active:ActivePromotion;apt:AptOffer[];candidates:number}|
 {status:'available';apt:AptOffer[];candidates:number}|
 {status:'none';candidates:number;reason:string};

export function classifyListing(offers:OfferReport[],now=Date.now()):ListingClass{
 const apt:AptOffer[]=offers
  .filter(o=>o.status==='candidate'&&!o.blockReason&&o.analysis?.status==='approved'&&(o.refId||o.id))
  .map(o=>({refId:(o.refId??o.id)!,id:o.id,name:o.name||o.type||'Promoção',type:o.type,price:o.analysis!.price,margin:o.analysis!.margin!,profit:o.analysis!.profit!,start:parseMlDate(o.start),finish:parseMlDate(o.finish)}))
  .sort((a,b)=>b.margin-a.margin);
 const candidates=offers.filter(o=>o.status==='candidate').length;
 const current=offers.find(o=>o.status==='started')??offers.find(o=>o.status==='pending');
 if(current){
  const period={start:parseMlDate(current.start),finish:parseMlDate(current.finish),status:current.status};
  const pending=offers.filter(o=>o!==current&&o.status==='pending').map(o=>({start:parseMlDate(o.start),finish:parseMlDate(o.finish)}));
  const cov=coverage(period,pending,now);
  // Próximas opções: aptas que continuam depois do fim da atual.
  const next=period.finish===null?[]:apt.filter(a=>continuesAfter(a,period.finish!));
  return {status:'active',active:{name:current.name||current.type||'Promoção',status:current.status,price:current.analysis?.price??current.price??null,start:period.start,finish:period.finish,coverage:cov,next},apt,candidates};
 }
 if(apt.length)return {status:'available',apt,candidates};
 return {status:'none',candidates,reason:candidates?`${candidates} oferta${candidates>1?'s':''} disponíve${candidates>1?'is':'l'}, nenhuma apta (margem, dados ou tipo não suportado).`:'O Mercado Livre não ofereceu nenhuma promoção para este anúncio.'};
}
