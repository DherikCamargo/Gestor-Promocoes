import {actor,json} from '@/lib/mercado-livre';
import {mlSession,MlError} from '@/lib/ml-api';
import {listingPrices,listingFreight,record} from '@/lib/listing-summary';
export async function GET(request:Request){
 let owner:string;try{owner=await actor()}catch{return json({error:'Abra o gestor em uma nova aba e entre na sua conta.'},403)}
 try{
  const id=new URL(request.url).searchParams.get('itemId')??'';
  if(!/^MLB\d+$/.test(id))throw new MlError('Informe um MLB válido.',400);
  const api=await mlSession(owner),item=await api.get<Record<string,unknown>>('/items/'+id+'?include_attributes=all');
  if(item.id!==id||String(item.seller_id)!==api.sellerId)throw new MlError('Anúncio não encontrado na conta conectada.',403);
  const sale=await api.get<unknown>('/items/'+id+'/sale_price?context=channel_marketplace').catch(()=>null);
  const prices=listingPrices(item,sale),shipping=record(item.shipping);
  let freight:number|null=null;
  if(prices.currentPrice!==null&&shipping.mode==='me2'&&typeof shipping.free_shipping==='boolean'){
   const query=new URLSearchParams({item_id:id,item_price:String(prices.currentPrice),free_shipping:String(shipping.free_shipping),verbose:'true'});
   const raw=await api.get<unknown>('/users/'+api.sellerId+'/shipping_options/free?'+query).catch(()=>null);
   freight=listingFreight(raw,prices.currency);
  }
  return json({itemId:id,title:typeof item.title==='string'?item.title:id,listingType:item.listing_type_id,...prices,freight,freeShipping:typeof shipping.free_shipping==='boolean'?shipping.free_shipping:null,queriedAt:new Date().toISOString()});
 }catch(e){return json({error:e instanceof MlError?e.message:'Não foi possível consultar este anúncio.'},e instanceof MlError?e.status:503)}
}
