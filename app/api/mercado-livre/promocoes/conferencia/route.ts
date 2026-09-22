import {actor,json} from '@/lib/mercado-livre';
import {mlSession,MlError} from '@/lib/ml-api';
import {itemEvidence,pick} from '@/lib/promotion-evidence';
import {promotionPriceIssues} from '@/lib/promotion-price';
import {familyKey} from '@/lib/ml-family';
import {lightningEvidence} from '@/lib/lightning-evidence';

// Whitelist only offer evidence: never export account credentials or API headers.
const fields=['id','type','name','status','offer_id','ref_id','price','original_price',
 'min_discounted_price','max_discounted_price','suggested_discounted_price',
 'boosted_offer','discount_meli_boosted_percentage','discount_meli_boost_amount',
 'total_price_for_boosted_offer','meli_percentage','seller_percentage','start_date','finish_date'];
export async function GET(request:Request){
 let owner:string;try{owner=await actor()}catch{return json({error:'Abra o gestor em uma nova aba e entre na sua conta.'},403)}
 try{
  const itemId=new URL(request.url).searchParams.get('itemId')??'';
  if(!/^MLB\d+$/.test(itemId))throw new MlError('Informe o código MLB do anúncio.',400);
  const api=await mlSession(owner);
  const item=await api.get<{id:string;seller_id:number;family_id?:string|number}>('/items/'+itemId+'?include_attributes=all');
  if(item.id!==itemId)throw new MlError('O anúncio retornado não corresponde ao solicitado.',502);
  if(String(item.seller_id)!==api.sellerId)throw new MlError('Este anúncio não pertence à conta conectada.',403);
  const expectedFamily=new URL(request.url).searchParams.get('familyId');
  if(expectedFamily&&(!familyKey(expectedFamily)||familyKey(item.family_id)!==expectedFamily))throw new MlError('O anúncio não pertence mais à família consultada. Atualize a conferência.',409);
  const [raw,saleResult]=await Promise.all([
   api.get<unknown>('/seller-promotions/items/'+itemId+'?app_version=v2'),
   api.get<unknown>('/items/'+itemId+'/sale_price?context=channel_marketplace').then(data=>({ok:true as const,data}),e=>({ok:false as const,status:e instanceof MlError?e.status:503})),
  ]);
  if(!Array.isArray(raw))throw new MlError('O Mercado Livre retornou um formato de ofertas não reconhecido.',502);
  const offers=raw.filter(v=>v&&typeof v==='object').map(v=>({...pick(v,fields),issues:promotionPriceIssues(v)}));
  const lightning=new URL(request.url).searchParams.get('details')==='lightning'?await lightningEvidence(api,itemId,raw):undefined;
  const salePrice=saleResult.ok?{ok:true,context:'channel_marketplace',...pick(saleResult.data,['price_id','amount','regular_amount','currency_id']),metadata:pick((saleResult.data as Record<string,unknown>)?.metadata,['promotion_id','promotion_type','variation_id'])}:{ok:false,status:saleResult.status,error:'Preço de venda não confirmado nesta consulta.'};
  return json({schemaVersion:2,itemId,queriedAt:new Date().toISOString(),source:'seller-promotions/items',sources:['items','items/sale_price?context=channel_marketplace','seller-promotions/items?app_version=v2'],readOnly:true,participationBlocked:true,item:itemEvidence(item),salePrice,offers,lightning});
 }catch(e){return json({error:e instanceof MlError?e.message:'Não foi possível consultar as ofertas. Tente novamente.'},e instanceof MlError?e.status:503)}
}
