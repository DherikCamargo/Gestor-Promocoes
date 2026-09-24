import {actor,json} from '@/lib/mercado-livre';
import {mlSession,MlError} from '@/lib/ml-api';
import {listingPrices,record} from '@/lib/listing-summary';
import {rowsFromItem,type Item} from '@/lib/ml-catalog';
import {listingCost} from '@/lib/product-costs';
import {offerTerms,analyzeOffer,defaultRules,type Analysis} from '@/lib/offer-analysis';
import {quoteSaleFee,quoteFreight} from '@/lib/ml-quotes';
import {loadCostOverrides,loadRules} from '@/lib/owner-settings';
import type {SaleFee} from '@/lib/listing-fees';
// Análise somente leitura das promoções de um anúncio: nenhuma adesão, nenhuma escrita no Mercado Livre.
const statuses=new Set(['candidate','pending','started']);
const order={approved:0,attention:1,not_recommended:2,missing:3};
const text=(v:unknown)=>typeof v==='string'&&v?v:null;
const num=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)&&v>0?v:null;
export async function GET(request:Request){
 let owner:string;try{owner=await actor()}catch{return json({error:'Abra o gestor em uma nova aba e entre na sua conta.'},403)}
 try{
  const id=new URL(request.url).searchParams.get('itemId')??'';
  if(!/^MLB\d+$/.test(id))throw new MlError('Informe um MLB válido.',400);
  const api=await mlSession(owner),item=await api.get<Record<string,unknown>>('/items/'+id+'?include_attributes=all');
  if(item.id!==id||String(item.seller_id)!==api.sellerId)throw new MlError('Anúncio não encontrado na conta conectada.',403);
  const currency=typeof item.currency_id==='string'?item.currency_id:'BRL';
  const [raw,overrides,settings]=await Promise.all([
   api.get<unknown>('/seller-promotions/items/'+id+'?app_version=v2'),
   loadCostOverrides(owner).catch(()=>null),
   loadRules(owner).catch(()=>null),
  ]);
  if(!Array.isArray(raw))throw new MlError('O Mercado Livre retornou um formato de ofertas não reconhecido.',502);
  const rules=settings?.rules??defaultRules,cost=listingCost(rowsFromItem(item as unknown as Item),overrides??{});
  const costValue=cost.state==='ok'?cost.cost:null;
  // Variações internas com preços diferentes: uma oferta tem preço único, então a margem seria ambígua.
  const variationPrices=listingPrices(item,null).variationPrices;
  const fees=new Map<number,Promise<SaleFee|null>>(),freights=new Map<number,Promise<number|null>>();
  const cached=<T,>(map:Map<number,Promise<T>>,price:number,load:()=>Promise<T>)=>{const k=Math.round(price*100);if(!map.has(k))map.set(k,load());return map.get(k)!};
  const offers=[];
  // Consultas em sequência: poucas ofertas por anúncio e menos risco de limite de requisições.
  for(const o of raw.map(record).filter(o=>statuses.has(String(o.status))).slice(0,20)){
   const info={id:text(o.id),refId:text(o.ref_id),type:text(o.type),name:text(o.name),status:String(o.status),start:text(o.start_date),finish:text(o.finish_date)??text(o.end_date),min:num(o.min_discounted_price),max:num(o.max_discounted_price),originalPrice:num(o.original_price)};
   const terms=offerTerms(o);
   if(!terms.ok){offers.push({...info,reason:terms.reason});continue}
   if(variationPrices){offers.push({...info,price:terms.price,reason:'Anúncio com variações de preços diferentes: a margem por variação ainda não é calculada.'});continue}
   const lowPrice=Math.round(terms.price*100)<Math.round(rules.lowPriceThreshold*100);
   const fee=await cached(fees,terms.price,()=>quoteSaleFee(api,item,terms.price,currency));
   const freight=lowPrice?null:await cached(freights,terms.price,()=>quoteFreight(api,item,terms.price,currency));
   const analysis:Analysis=analyzeOffer({price:terms.price,saleFee:fee?.amount??null,mlSubsidy:terms.mlSubsidy,feeDiscount:terms.feeDiscount,mlFreight:freight,cost:costValue,rules});
   offers.push({...info,priceSource:terms.priceSource,feePercentage:fee?.percentage??null,analysis});
  }
  offers.sort((a,b)=>{
   const ra='analysis' in a?order[a.analysis.status]:9,rb='analysis' in b?order[b.analysis.status]:9;
   return ra-rb||('analysis' in b&&'analysis' in a?(b.analysis.margin??-1)-(a.analysis.margin??-1):0);
  });
  return json({itemId:id,title:text(item.title)??id,currency,cost,rules,rulesEdited:settings?.edited??false,
   warnings:[...(overrides===null?['Custos editados indisponíveis: usando custos padrão.']:[]),...(settings===null?['Regras de margem indisponíveis: usando as regras padrão.']:[])],
   offers,readOnly:true,participationBlocked:true,queriedAt:new Date().toISOString()});
 }catch(e){
  if(e instanceof MlError&&/HTTP 404/.test(e.message))return json({error:'Anúncio não encontrado. Confira o MLB.'},404);
  return json({error:e instanceof MlError?e.message:'Não foi possível analisar as promoções deste anúncio.'},e instanceof MlError?e.status:503);
 }
}
