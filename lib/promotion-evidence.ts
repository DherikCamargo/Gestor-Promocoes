import {identifyCost} from './ml-catalog';

type Data=Record<string,unknown>;
export const record=(v:unknown):Data=>v&&typeof v==='object'&&!Array.isArray(v)?v as Data:{};
export function pick(v:unknown,fields:string[]):Data{
 const data=record(v);
 return Object.fromEntries(fields.filter(k=>Object.hasOwn(data,k)&&(['string','boolean'].includes(typeof data[k])||(typeof data[k]==='number'&&Number.isFinite(data[k]))||data[k]===null)).map(k=>[k,data[k]]));
}
function attributes(v:unknown){return Array.isArray(v)?v.map(a=>pick(a,['id','name','value_id','value_name'])):[]}
function sku(data:Data){return attributes(data.attributes).find(a=>a.id==='SELLER_SKU')?.value_name??(typeof data.seller_custom_field==='string'?data.seller_custom_field:null)}
export function itemEvidence(raw:unknown){
 const item=record(raw);
 const variations=Array.isArray(item.variations)?item.variations.map(record).map(v=>({
  ...pick(v,['id','user_product_id','price','available_quantity']),
  sku:sku(v),attributes:attributes(v.attributes),attribute_combinations:attributes(v.attribute_combinations),
  ...identifyCost(String(sku(v)??''),String(item.title??''),String(item.id??'')),
  priceSource:typeof v.price==='number'?'variation.price':'not_returned',
 })):[];
 return {...pick(item,['id','title','status','price','original_price','base_price','currency_id','listing_type_id','user_product_id','family_id','family_name','catalog_product_id','permalink','last_updated']),
  sku:sku(item),attributes:attributes(item.attributes),variations,
  ...identifyCost(String(sku(item)??''),String(item.title??''),String(item.id??'')),
  scope:'Somente o anúncio consultado e as variações retornadas nele. Outros anúncios da família não foram consultados.',
 };
}
