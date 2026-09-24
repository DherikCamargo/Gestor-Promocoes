import {listingFreight,record} from './listing-summary';
import {listingSaleFee,type SaleFee} from './listing-fees';
type Api={sellerId:string;get:<T>(path:string)=>Promise<T>};
type Item=Record<string,unknown>;
// Cotações somente leitura para um preço: tarifa (listing_prices) e frete pago pelo vendedor
// (shipping_options/free). Falha ou dado ausente = null; nunca zero.
export async function quoteSaleFee(api:Api,item:Item,price:number,currency:string):Promise<SaleFee|null>{
 const listingType=typeof item.listing_type_id==='string'?item.listing_type_id:'',shipping=record(item.shipping);
 if(!listingType||typeof item.category_id!=='string')return null;
 const query=new URLSearchParams({price:String(price),currency_id:currency,category_id:item.category_id,listing_type_id:listingType,...(typeof shipping.logistic_type==='string'?{logistic_type:shipping.logistic_type}:{}),...(typeof shipping.mode==='string'?{shipping_mode:shipping.mode}:{})});
 return api.get<unknown>('/sites/MLB/listing_prices?'+query).then(raw=>listingSaleFee(raw,listingType,currency),()=>null);
}
export async function quoteFreight(api:Api,item:Item,price:number,currency:string):Promise<number|null>{
 const shipping=record(item.shipping);
 if(shipping.mode!=='me2'||typeof shipping.free_shipping!=='boolean'||typeof item.id!=='string')return null;
 const query=new URLSearchParams({item_id:item.id,item_price:String(price),free_shipping:String(shipping.free_shipping),verbose:'true'});
 return api.get<unknown>('/users/'+api.sellerId+'/shipping_options/free?'+query).then(raw=>listingFreight(raw,currency),()=>null);
}
