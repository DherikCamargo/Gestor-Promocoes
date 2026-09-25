import {record} from './listing-summary';
// Situação de preço de um anúncio pelo sale_price (context=channel_marketplace):
// "promotion" quando regular_amount > amount (há desconto ativo); "regular" quando vende no preço
// normal; "unknown" quando o preço não foi informado (nunca presumir que está sem promoção).
export type SaleState={state:'promotion'|'regular';price:number;regularPrice:number}|{state:'unknown'};
const positive=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)&&v>0?v:null;
export function saleState(sale:unknown):SaleState{
 const s=record(sale),amount=positive(s.amount),regular=positive(s.regular_amount);
 if(amount===null)return {state:'unknown'};
 if(regular!==null&&Math.round(regular*100)>Math.round(amount*100))return {state:'promotion',price:amount,regularPrice:regular};
 return {state:'regular',price:amount,regularPrice:regular??amount};
}
