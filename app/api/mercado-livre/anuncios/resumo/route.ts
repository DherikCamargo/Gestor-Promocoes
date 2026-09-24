import {actor,json} from '@/lib/mercado-livre';
import {mlSession,MlError} from '@/lib/ml-api';
import {listingPrices,listingFreight,record} from '@/lib/listing-summary';
import {listingSaleFee,activeOffer,type ActiveOffer} from '@/lib/listing-fees';
import {familyKey} from '@/lib/ml-family';
export async function GET(request:Request){
 let owner:string;try{owner=await actor()}catch{return json({error:'Abra o gestor em uma nova aba e entre na sua conta.'},403)}
 try{
  const id=new URL(request.url).searchParams.get('itemId')??'';
  if(!/^MLB\d+$/.test(id))throw new MlError('Informe um MLB válido.',400);
  const api=await mlSession(owner),item=await api.get<Record<string,unknown>>('/items/'+id+'?include_attributes=all');
  if(item.id!==id||String(item.seller_id)!==api.sellerId)throw new MlError('Anúncio não encontrado na conta conectada.',403);
  const sale=await api.get<unknown>('/items/'+id+'/sale_price?context=channel_marketplace').catch(()=>null);
  const prices=listingPrices(item,sale),shipping=record(item.shipping),current=prices.currentPrice;
  const listingType=typeof item.listing_type_id==='string'?item.listing_type_id:'';
  // Leituras independentes; falha em uma não esconde as demais, e nenhuma vira zero.
  const [freight,saleFee,promotion]=await Promise.all([
   current!==null&&shipping.mode==='me2'&&typeof shipping.free_shipping==='boolean'
    ?api.get<unknown>('/users/'+api.sellerId+'/shipping_options/free?'+new URLSearchParams({item_id:id,item_price:String(current),free_shipping:String(shipping.free_shipping),verbose:'true'})).then(raw=>listingFreight(raw,prices.currency),()=>null)
    :null,
   current!==null&&listingType&&typeof item.category_id==='string'
    ?api.get<unknown>('/sites/MLB/listing_prices?'+new URLSearchParams({price:String(current),currency_id:prices.currency,category_id:item.category_id,listing_type_id:listingType,...(typeof shipping.logistic_type==='string'?{logistic_type:shipping.logistic_type}:{}),...(typeof shipping.mode==='string'?{shipping_mode:shipping.mode}:{})})).then(raw=>listingSaleFee(raw,listingType,prices.currency),()=>null)
    :null,
   prices.promotionPrice!==null
    ?api.get<unknown>('/seller-promotions/items/'+id+'?app_version=v2').then(raw=>activeOffer(raw,record(record(sale).metadata).promotion_id,prices.promotionPrice!),():ActiveOffer=>({status:'unconfirmed',reason:'Não foi possível consultar as promoções do anúncio.'}))
    :null,
  ]);
  return json({itemId:id,title:typeof item.title==='string'?item.title:id,listingType,familyId:familyKey(item.family_id),...prices,freight,freeShipping:typeof shipping.free_shipping==='boolean'?shipping.free_shipping:null,saleFee,promotion,queriedAt:new Date().toISOString()});
 }catch(e){
  if(e instanceof MlError&&/HTTP 404/.test(e.message))return json({error:'Código não encontrado como anúncio. Confira o MLB individual: o código de uma família de produtos não é um MLB.',code:'ITEM_NOT_FOUND'},404);
  return json({error:e instanceof MlError?e.message:'Não foi possível consultar este anúncio.'},e instanceof MlError?e.status:503);
 }
}
