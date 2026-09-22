import {actor,account,json,runtime} from '@/lib/mercado-livre';
import {mlSession,MlError} from '@/lib/ml-api';
import {identifyCost,type CatalogRow} from '@/lib/ml-catalog';
import {pricingRules,promotionResult} from '@/lib/pricing';
import {promotionFeeReduction} from '@/lib/promotion-fees';
import {promotionPrice} from '@/lib/promotion-price';

type ImportRow={payload:string;seller_id:string};
type ItemDetail={id:string;seller_id:number};
type PromotionItem={id?:string;[key:string]:unknown};
type PromotionItemsResponse=PromotionItem[]|{results?:PromotionItem[];items?:PromotionItem[]};
const itemPattern=/^MLB\d+$/;
const idPattern=/^[A-Za-z0-9_-]{1,100}$/;
const typePattern=/^[A-Z][A-Z0-9_]{0,49}$/;
const numbersFor=(value:unknown,key:string,found:number[]=[]):number[]=>{
 if(Array.isArray(value)){for(const entry of value)numbersFor(entry,key,found);return found}
 if(value&&typeof value==='object')for(const [name,entry] of Object.entries(value)){if(name===key&&typeof entry==='number'&&Number.isFinite(entry))found.push(entry);else numbersFor(entry,key,found)}
 return found;
};

export async function GET(request:Request){
 let owner:string;try{owner=await actor()}catch{return json({error:'Sessão inválida. Recarregue o painel e tente novamente.'},403)}
 try{
  const url=new URL(request.url),itemId=url.searchParams.get('itemId')??'',promotionId=url.searchParams.get('promotionId')??'',promotionType=url.searchParams.get('promotionType')??'',price=Number(url.searchParams.get('price'));
  if(!itemPattern.test(itemId)||!idPattern.test(promotionId)||!typePattern.test(promotionType)||!Number.isFinite(price)||price<=0)throw new MlError('Anúncio, promoção ou preço inválido.',400);
  const a=await account(owner);if(!a?.seller_id||!a.tokens)throw new MlError('Autorize sua conta antes de calcular.',409);
  const stored=await runtime().DB.prepare('SELECT payload,seller_id FROM ml_imports WHERE owner=?').bind(owner).first<ImportRow>();
  if(!stored||stored.seller_id!==a.seller_id)throw new MlError('Atualize a importação de anúncios antes de calcular.',409);
  const rows=(JSON.parse(stored.payload) as {rows?:CatalogRow[]}).rows??[],row=rows.find(r=>r.itemId===itemId);
  if(!row)throw new MlError('Este anúncio não pertence à importação atual.',404);
  const api=await mlSession(owner),detail=await api.get<ItemDetail>('/items/'+encodeURIComponent(itemId));
  if(String(detail.seller_id)!==api.sellerId)throw new MlError('Anúncio não pertence à conta autorizada.',403);
  const standardCommission=price*pricingRules.marketplaceCommissionRate;
  const promotionQuery=new URLSearchParams({promotion_type:promotionType,app_version:'v2',limit:'50'});
  let promotionDetail:PromotionItemsResponse;
  try{promotionDetail=await api.get<PromotionItemsResponse>(`/seller-promotions/promotions/${encodeURIComponent(promotionId)}/items?${promotionQuery}`)}catch{promotionDetail=await api.get<PromotionItemsResponse>(`/seller-promotions/promotions/${encodeURIComponent(promotionId)}?promotion_type=${encodeURIComponent(promotionType)}&app_version=v2`)}
  const promotionItems=Array.isArray(promotionDetail)?promotionDetail:promotionDetail.results??promotionDetail.items??[];
  const offerId=url.searchParams.get('offerId')??'';
  const matches=promotionItems.filter(entry=>entry.id===itemId&&(!offerId||entry.offer_id===offerId));
  if(matches.length!==1)throw new MlError('Proposta ausente ou ambígua. Use a conferência do anúncio.',409);
  const promotionItem=matches[0];
  const livePrice=promotionPrice(promotionItem);
  if(livePrice===null||Math.round(livePrice*100)!==Math.round(price*100))throw new MlError('Preço não confirmado para esta proposta. Atualize as ofertas e confira o anúncio.',409);
  if(promotionItem.boosted_offer===true)throw new MlError('Oferta com desconto adicional do ML. O cálculo aguarda validação do benefício; baixe a conferência.',409);
  const feeReduction=promotionItem?promotionFeeReduction(promotionItem):0;
  const commission=Math.max(0,standardCommission-feeReduction);
  let freight:number|null=null;
  try{
   const shipping=await api.get<unknown>('/users/'+encodeURIComponent(api.sellerId)+'/shipping_options/free?item_id='+encodeURIComponent(itemId));
   const costs=numbersFor(shipping,'list_cost').filter(n=>n>=0);freight=costs.length?Math.max(...costs):null;
  }catch{
   try{const shipping=await api.get<unknown>('/items/'+encodeURIComponent(itemId)+'/shipping_options/free');const costs=numbersFor(shipping,'list_cost').filter(n=>n>=0);freight=costs.length?Math.max(...costs):null}catch{}
  }
  if(price<pricingRules.lowPriceThreshold)freight=pricingRules.lowPriceFreight;
  const cost=identifyCost(row.sku,row.title,row.itemId).cost;
  if(cost===null)throw new MlError('O custo deste SKU não foi identificado.',422);
  if(freight===null)throw new MlError('O Mercado Livre não informou o frete deste anúncio. A promoção não pode ser aprovada sem esse valor.',422);
  const result=promotionResult({price,cost,commission,freight});
  return json({commission,standardCommission,feeReduction,freight,freightConfirmed:true,...result,readOnly:true});
 }catch(e){return json({error:e instanceof MlError?e.message:'Não foi possível calcular as taxas agora.'},e instanceof MlError?e.status:503)}
}
