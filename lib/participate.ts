import {record} from './listing-summary';
import {buildOfferReport} from './offer-report';
import {participationPayload,verifyParticipation} from './participation';
import type {MarginRules} from './offer-analysis';
type Api={sellerId:string;get:<T>(path:string)=>Promise<T>;post:<T>(path:string,body:unknown)=>Promise<T>};
export type LogEntry={itemId:string;promotionId:string|null;type:string|null;refId:string;expectedPrice:number|null;resultPrice:number|null;status:string;detail:string};
export type ParticipationResult=
 {status:'confirmed';price:number;state:'started'|'pending';margin:number}|
 {status:'divergent';price:number|null;expected:number;detail:string}|
 {status:'unverified';expected:number;detail:string}|
 {status:'refused'|'failed';detail:string};

// Adesão a uma oferta com revalidação e conferência:
// 1) relê anúncio e ofertas e refaz a análise com os custos e regras atuais;
// 2) só envia se a oferta continuar candidata, de tipo suportado e com margem aprovada;
// 3) confere depois que a oferta aparece ativa/programada com o preço esperado.
// Cada tentativa é registrada antes do envio e ao final.
export async function participateOffer(d:{api:Api;itemId:string;refId:string;overrides:Record<string,number>;rules:MarginRules;log:(e:LogEntry)=>Promise<void>;wait?:(ms:number)=>Promise<void>}):Promise<ParticipationResult>{
 const {api,itemId,refId}=d,wait=d.wait??(ms=>new Promise(r=>setTimeout(r,ms)));
 const item=await api.get<Record<string,unknown>>('/items/'+itemId+'?include_attributes=all');
 if(item.id!==itemId||String(item.seller_id)!==api.sellerId)return {status:'refused',detail:'Anúncio não encontrado na conta conectada.'};
 const raw=await api.get<unknown>('/seller-promotions/items/'+itemId+'?app_version=v2');
 if(!Array.isArray(raw))return {status:'refused',detail:'Formato de ofertas não reconhecido.'};
 const {offers}=await buildOfferReport(api,item,raw,d.overrides,d.rules);
 const offer=offers.find(o=>o.refId===refId||(!o.refId&&o.id===refId));
 const base={itemId,promotionId:offer?.id??null,type:offer?.type??null,refId};
 if(!offer)return {status:'refused',detail:'A oferta não está mais disponível para este anúncio.'};
 if(offer.blockReason||!offer.analysis)return {status:'refused',detail:offer.blockReason??'Oferta sem análise.'};
 const expected=offer.analysis.price,payload=participationPayload(offer);
 await d.log({...base,expectedPrice:expected,resultPrice:null,status:'requested',detail:JSON.stringify(payload)});
 let response:Record<string,unknown>;
 try{response=record(await api.post<unknown>('/seller-promotions/items/'+itemId+'?app_version=v2',payload))}
 catch(e){
  const detail=e instanceof Error?e.message:'O Mercado Livre recusou a adesão.';
  await d.log({...base,expectedPrice:expected,resultPrice:null,status:'failed',detail});
  return {status:'failed',detail};
 }
 const responseOfferId=typeof response.offer_id==='string'?response.offer_id:null;
 // A oferta pode demorar alguns segundos para aparecer; até 3 leituras.
 let v=verifyParticipation(null,{promotionId:offer.id!,type:offer.type!,expectedPrice:expected,offerId:responseOfferId});
 for(let i=0;i<3&&v.status==='not_found';i++){
  if(i)await wait(2000);
  const after=await api.get<unknown>('/seller-promotions/items/'+itemId+'?app_version=v2').catch(()=>null);
  v=verifyParticipation(after,{promotionId:offer.id!,type:offer.type!,expectedPrice:expected,offerId:responseOfferId});
 }
 const responsePrice=typeof response.price==='number'?response.price:null;
 if(v.status==='confirmed'&&responsePrice!==null&&Math.round(responsePrice*100)!==Math.round(expected*100))
  v={status:'divergent',price:responsePrice,expected,offerId:v.offerId};
 const result:ParticipationResult=v.status==='confirmed'?{status:'confirmed',price:v.price,state:v.state,margin:offer.analysis.margin!}
  :v.status==='divergent'?{status:'divergent',price:v.price,expected,detail:'O preço aplicado pelo Mercado Livre é diferente do analisado. Confira na Central.'}
  :{status:'unverified',expected,detail:'O Mercado Livre aceitou o pedido, mas a oferta ainda não apareceu ativa. Confira na Central.'};
 await d.log({...base,expectedPrice:expected,resultPrice:'price' in result?result.price:null,status:result.status,detail:'detail' in result?result.detail:''});
 return result;
}
