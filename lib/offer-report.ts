import {listingPrices,record} from './listing-summary';
import {rowsFromItem,type Item} from './ml-catalog';
import {listingCost,type ListingCost} from './product-costs';
import {offerTerms,analyzeOffer,type Analysis,type MarginRules} from './offer-analysis';
import {quoteSaleFee,quoteFreight} from './ml-quotes';
import {activationBlock,structuralBlock,offerKey,priceTypes,priceChoiceProblem} from './participation';
import type {SaleFee} from './listing-fees';
type Api={sellerId:string;get:<T>(path:string)=>Promise<T>};
export type OfferReport={id:string|null;refId:string|null;type:string|null;name:string|null;status:string;start:string|null;finish:string|null;
 min:number|null;max:number|null;originalPrice:number|null;price?:number;priceSource?:'offer'|'suggested';feePercentage?:number|null;
 analysis?:Analysis;reason?:string;blockReason:string|null;
 key:string|null;priceChoice:{min:number|null;max:number|null;originalPrice:number|null;suggested:number|null}|null};
const statuses=new Set(['candidate','pending','started']);
const order={approved:0,attention:1,not_recommended:2,missing:3};
const text=(v:unknown)=>typeof v==='string'&&v?v:null;
const num=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)&&v>0?v:null;

// Análise das ofertas de um anúncio, usada igualmente pela tela (análise) e pela adesão,
// para que a adesão nunca use um cálculo diferente do exibido.
// priceFor: analisa uma oferta de preço escolhido (DEAL/PRICE_DISCOUNT) no preço informado pelo vendedor.
export async function buildOfferReport(api:Api,item:Record<string,unknown>,rawOffers:unknown[],overrides:Record<string,number>,rules:MarginRules,priceFor?:{key:string;price:number}):Promise<{cost:ListingCost;offers:OfferReport[]}>{
 const currency=typeof item.currency_id==='string'?item.currency_id:'BRL';
 const cost=listingCost(rowsFromItem(item as unknown as Item),overrides),costValue=cost.state==='ok'?cost.cost:null;
 // Variações internas com preços diferentes: uma oferta tem preço único, então a margem seria ambígua.
 const variationPrices=listingPrices(item,null).variationPrices;
 const fees=new Map<number,Promise<SaleFee|null>>(),freights=new Map<number,Promise<number|null>>();
 const cached=<T,>(map:Map<number,Promise<T>>,price:number,load:()=>Promise<T>)=>{const k=Math.round(price*100);if(!map.has(k))map.set(k,load());return map.get(k)!};
 const offers:OfferReport[]=[];
 // Consultas em sequência: poucas ofertas por anúncio e menos risco de limite de requisições.
 for(const o of rawOffers.map(record).filter(o=>statuses.has(String(o.status))).slice(0,20)){
  const base0={id:text(o.id),refId:text(o.ref_id),type:text(o.type),name:text(o.name),status:String(o.status),start:text(o.start_date),finish:text(o.finish_date)??text(o.end_date),min:num(o.min_discounted_price),max:num(o.max_discounted_price),originalPrice:num(o.original_price)};
  const key=offerKey(base0),priceType=priceTypes.has(base0.type??'')&&!structuralBlock(base0);
  const suggested=priceType?offerTerms(o):null;
  const info={...base0,key,priceChoice:priceType?{min:base0.min,max:base0.max,originalPrice:base0.originalPrice,suggested:suggested?.ok?suggested.price:null}:null};
  // Preço escolhido pelo vendedor: limites conferidos antes; a análise usa esse preço como o da oferta.
  const chosen=priceType&&priceFor&&priceFor.key===key?priceFor.price:null;
  if(chosen!==null){const problem=priceChoiceProblem(base0,chosen);if(problem){offers.push({...info,price:chosen,reason:problem,blockReason:problem});continue}}
  const terms=offerTerms(chosen!==null?{...o,price:chosen}:o);
  if(!terms.ok){offers.push({...info,reason:terms.reason,blockReason:activationBlock(info)});continue}
  if(variationPrices){offers.push({...info,price:terms.price,reason:'Anúncio com variações de preços diferentes: a margem por variação ainda não é calculada.',blockReason:activationBlock(info)});continue}
  const lowPrice=Math.round(terms.price*100)<Math.round(rules.lowPriceThreshold*100);
  const fee=await cached(fees,terms.price,()=>quoteSaleFee(api,item,terms.price,currency));
  const freight=lowPrice?null:await cached(freights,terms.price,()=>quoteFreight(api,item,terms.price,currency));
  const analysis=analyzeOffer({price:terms.price,saleFee:fee?.amount??null,mlSubsidy:terms.mlSubsidy,feeDiscount:terms.feeDiscount,mlFreight:freight,cost:costValue,rules});
  offers.push({...info,priceSource:terms.priceSource,feePercentage:fee?.percentage??null,analysis,blockReason:activationBlock(info,analysis)});
 }
 offers.sort((a,b)=>{
  const ra=a.analysis?order[a.analysis.status]:9,rb=b.analysis?order[b.analysis.status]:9;
  return ra-rb||(b.analysis?.margin??-1)-(a.analysis?.margin??-1);
 });
 return {cost,offers};
}
