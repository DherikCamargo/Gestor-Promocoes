type RecordValue=Record<string,unknown>;
export const record=(v:unknown):RecordValue=>v&&typeof v==='object'&&!Array.isArray(v)?v as RecordValue:{};
const positive=(v:unknown):number|null=>typeof v==='number'&&Number.isFinite(v)&&v>0?v:null;
// Proposals never supply a selling price.
export function listingPrices(item:RecordValue,sale:unknown){
 const data=record(sale),currency=typeof item.currency_id==='string'?item.currency_id:'BRL';
 const variants=Array.isArray(item.variations)?item.variations.map(record):[];
 const prices=variants.map(v=>positive(v.price));
 const variationPrices=variants.length>1&&(prices.some(p=>p===null)||new Set(prices).size>1);
 const amount=!variationPrices&&data.currency_id===currency?positive(data.amount):null;
 const regular=positive(data.regular_amount);
 const discounted=amount!==null&&regular!==null&&Math.round(regular*100)>Math.round(amount*100);
 return {currency,variationPrices,regularPrice:amount===null?null:discounted?regular:amount,promotionPrice:discounted?amount:null,currentPrice:amount};
}
export function listingFreight(raw:unknown,currency:string){
 const value=record(record(record(raw).coverage).all_country);
 return value.currency_id===currency&&typeof value.list_cost==='number'&&Number.isFinite(value.list_cost)&&value.list_cost>=0?value.list_cost:null;
}
