import type {OfferReport} from './offer-report';
// Classificação de um anúncio para o Painel de promoções.
// "active": já em promoção (ativa ou programada) — fora da ativação em lote, para não trocar a
// promoção atual; "available": sem promoção e com oferta apta; "none": sem promoção e sem oferta apta.
export type AptOffer={refId:string;id:string|null;name:string;type:string|null;price:number;margin:number;profit:number};
export type ListingClass=
 {status:'active';active:{name:string;status:string;price:number|null};apt:AptOffer[];candidates:number}|
 {status:'available';apt:AptOffer[];candidates:number}|
 {status:'none';candidates:number;reason:string};

export function classifyListing(offers:OfferReport[]):ListingClass{
 const apt:AptOffer[]=offers
  .filter(o=>o.status==='candidate'&&!o.blockReason&&o.analysis?.status==='approved'&&(o.refId||o.id))
  .map(o=>({refId:(o.refId??o.id)!,id:o.id,name:o.name||o.type||'Promoção',type:o.type,price:o.analysis!.price,margin:o.analysis!.margin!,profit:o.analysis!.profit!}))
  .sort((a,b)=>b.margin-a.margin);
 const candidates=offers.filter(o=>o.status==='candidate').length;
 const current=offers.find(o=>o.status==='started')??offers.find(o=>o.status==='pending');
 if(current)return {status:'active',active:{name:current.name||current.type||'Promoção',status:current.status,price:current.analysis?.price??current.price??null},apt,candidates};
 if(apt.length)return {status:'available',apt,candidates};
 return {status:'none',candidates,reason:candidates?`${candidates} oferta${candidates>1?'s':''} disponíve${candidates>1?'is':'l'}, nenhuma apta (margem, dados ou tipo não suportado).`:'O Mercado Livre não ofereceu nenhuma promoção para este anúncio.'};
}
