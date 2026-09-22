import {pick,record} from './promotion-evidence';
import {promotionPriceIssues} from './promotion-price';
type Api={get:<T>(path:string)=>Promise<T>};
const fields=['id','item_id','promotion_id','type','status','ref_id','offer_id','price','original_price','min_discounted_price','max_discounted_price','suggested_discounted_price','start_date','finish_date','boosted_offer','discount_meli_boost_amount','total_price_for_boosted_offer'];
export async function lightningEvidence(api:Api,itemId:string,offers:unknown[]){
 const candidates=offers.map(record).filter(o=>o.type==='LIGHTNING'&&o.status==='candidate');
 if(candidates.length!==1)return {ok:false,error:'Não há uma única proposta relâmpago candidata para comparar.',candidateCount:candidates.length};
 const offer=candidates[0],promotionId=String(offer.id??''),refId=String(offer.ref_id??'');
 if(!/^[A-Za-z0-9_-]+$/.test(promotionId)||!refId.startsWith('CANDIDATE-'+itemId+'-')||!/^CANDIDATE-MLB\d+-\d+$/.test(refId))return {ok:false,error:'Identificadores da proposta não confirmados.'};
 const candidatePath='/seller-promotions/candidates/'+encodeURIComponent(refId)+'?app_version=v2';
 const campaignPath='/seller-promotions/promotions/'+encodeURIComponent(promotionId)+'/items?'+new URLSearchParams({promotion_type:'LIGHTNING',item_id:itemId,status:'candidate',app_version:'v2',limit:'50'});
 async function read(path:string){try{return {ok:true as const,value:await api.get<unknown>(path)}}catch{return {ok:false as const,error:'A consulta desta fonte falhou. Nenhum preço foi substituído.'}}}
 const [candidate,campaign]=await Promise.all([read(candidatePath),read(campaignPath)]);
 const c=candidate.ok?record(candidate.value):{};
 const status=typeof c.status==='string'?c.status:record(c.status).id;
 const identityConfirmed=candidate.ok&&c.id===refId&&c.item_id===itemId&&c.promotion_id===promotionId&&c.type==='LIGHTNING'&&status==='candidate';
 const page=campaign.ok?record(campaign.value):{};
 const rows=Array.isArray(page.results)?page.results.map(record):[];
 const matches=rows.filter(r=>r.id===itemId&&r.status==='candidate');
 const paging=record(page.paging);
 const complete=campaign.ok&&Array.isArray(page.results)&&rows.length===matches.length&&!paging.searchAfter&&!paging.search_after&&!(typeof paging.total==='number'&&paging.total>rows.length);
 const unique=complete&&matches.length===1;
 return {ok:identityConfirmed&&unique,queriedAt:new Date().toISOString(),itemId,promotionId,refId,
  automaticPriceSelection:false,
  note:'Fontes apresentadas separadamente para conferência. A identidade confirmada não comprova igualdade com o preço exibido na Central.',
  itemSource:{...pick(offer,fields),issues:promotionPriceIssues(offer)},
  candidateSource:{source:candidatePath,ok:candidate.ok,identityConfirmed,data:{...pick(c,fields),status},...(!candidate.ok?{error:candidate.error}:{})},
  campaignSource:{source:campaignPath,ok:campaign.ok,complete,unique,rows:matches.map(r=>({...pick(r,fields),issues:promotionPriceIssues(r)})),...(!campaign.ok?{error:campaign.error}:{})},
 };
}
