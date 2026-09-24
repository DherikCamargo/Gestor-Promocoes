import {familyKey} from './ml-family';
import {identifyProduct,compositionCost,costTable} from './product-costs';
export type Attribute={id:string;value_name?:string|null};
export type Item={id:string;seller_id:number;title:string;status:string;price:number;currency_id:string;listing_type_id:string;family_id?:unknown;attributes?:Attribute[];seller_custom_field?:string|null;variations?:{id:number;price?:number;available_quantity?:number;attributes?:Attribute[];attribute_combinations?:Attribute[];seller_custom_field?:string|null}[];available_quantity?:number};
export type CatalogRow={key:string;itemId:string;variationId:string|null;title:string;sku:string;variation:string;price:number|null;currency:string;stock:number|null;listingType:string;familyId?:string|null;cost:number|null;costReason:string};
// Custo padrão (sem valores editados no banco); usado pelas telas antigas e pela importação.
export function identifyCost(sku:string,title:string,itemId?:string):{cost:number|null;costReason:string}{
 const c=identifyProduct(sku,title,itemId);
 return {cost:c.parts?compositionCost(c.parts,costTable({})):null,costReason:c.reason};
}
function skuOf(attrs:Attribute[]|undefined,custom:string|null|undefined){return attrs?.find(a=>a.id==='SELLER_SKU')?.value_name?.trim()||custom?.trim()||''}
export function rowsFromItem(item:Item):CatalogRow[]{
 const variants=item.variations?.length?item.variations:[null];
 return variants.map(v=>{const sku=v?skuOf(v.attributes,v.seller_custom_field):skuOf(item.attributes,item.seller_custom_field);const price=v?.price??item.price;
 return {key:item.id+':'+(v?.id??'item'),itemId:item.id,variationId:v?String(v.id):null,title:item.title,sku,variation:v?.attribute_combinations?.map(a=>a.value_name).filter(Boolean).join(' · ')||'',price:Number.isFinite(price)?price:null,currency:item.currency_id,stock:v?.available_quantity??item.available_quantity??null,listingType:item.listing_type_id,familyId:familyKey(item.family_id),...identifyCost(sku,item.title,item.id)};});
}
