import {record} from './listing-summary';
import {promotionPrice} from './promotion-price';
const amount=(v:unknown):number|null=>typeof v==='number'&&Number.isFinite(v)&&v>=0?v:null;
const cents=(n:number)=>Math.round(n*100);

export type SaleFee={amount:number;percentage:number|null;fixed:number|null};
// GET /sites/MLB/listing_prices: custo por vender do tipo de anúncio, sem descontos de promoção.
export function listingSaleFee(raw:unknown,listingType:string,currency:string):SaleFee|null{
 const entries=(Array.isArray(raw)?raw:[raw]).map(record).filter(e=>e.listing_type_id===listingType);
 if(entries.length!==1||entries[0].currency_id!==currency)return null;
 const fee=amount(entries[0].sale_fee_amount),details=record(entries[0].sale_fee_details);
 return fee===null?null:{amount:fee,percentage:amount(details.percentage_fee),fixed:amount(details.fixed_fee)};
}

export type ActiveOffer=
 {status:'identified';name:string|null;type:string|null;feeDiscount:number}|
 {status:'unconfirmed';reason:string};
// Liga o preço de venda à oferta pelo ref_id informado em sale_price.metadata.promotion_id.
// O desconto na tarifa só é lido de discount_meli_boost_amount (documentação seller-promotions);
// sem boosted_offer, o Mercado Livre não informou desconto para esta oferta.
export function activeOffer(offers:unknown,promotionId:unknown,salePrice:number):ActiveOffer{
 if(typeof promotionId!=='string'||!promotionId)return {status:'unconfirmed',reason:'O Mercado Livre não informou qual oferta está ativa.'};
 if(!Array.isArray(offers))return {status:'unconfirmed',reason:'Formato de ofertas não reconhecido.'};
 const matches=offers.map(record).filter(o=>o.ref_id===promotionId&&o.status==='started');
 if(matches.length!==1)return {status:'unconfirmed',reason:matches.length?'Mais de uma oferta ativa com o mesmo identificador.':'Oferta ativa não encontrada nas promoções do anúncio.'};
 const o=matches[0],price=promotionPrice(o);
 if(price===null||cents(price)!==cents(salePrice))return {status:'unconfirmed',reason:'O preço da oferta não corresponde ao preço de venda.'};
 const discount=o.boosted_offer===true?amount(o.discount_meli_boost_amount):0;
 if(discount===null)return {status:'unconfirmed',reason:'Desconto na tarifa indicado, mas sem valor informado.'};
 return {status:'identified',name:typeof o.name==='string'?o.name:null,type:typeof o.type==='string'?o.type:null,feeDiscount:discount};
}
