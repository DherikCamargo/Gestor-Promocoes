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
 {status:'identified';name:string|null;type:string|null;feeDiscount:number;meliPercentage:number|null;mlSubsidy:number|null}|
 {status:'unconfirmed';reason:string};
// Liga o preço de venda à oferta pelo ref_id informado em sale_price.metadata.promotion_id.
// Desconto automático na tarifa em R$ é lido de discount_meli_boost_amount (documentação seller-promotions).
export function activeOffer(offers:unknown,promotionId:unknown,salePrice:number):ActiveOffer{
 if(typeof promotionId!=='string'||!promotionId)return {status:'unconfirmed',reason:'O Mercado Livre não informou qual oferta está ativa.'};
 if(!Array.isArray(offers))return {status:'unconfirmed',reason:'Formato de ofertas não reconhecido.'};
 const matches=offers.map(record).filter(o=>o.ref_id===promotionId&&o.status==='started');
 if(matches.length!==1)return {status:'unconfirmed',reason:matches.length?'Mais de uma oferta ativa com o mesmo identificador.':'Oferta ativa não encontrada nas promoções do anúncio.'};
 const o=matches[0],price=promotionPrice(o);
 if(price===null||cents(price)!==cents(salePrice))return {status:'unconfirmed',reason:'O preço da oferta não corresponde ao preço de venda.'};
 const b=offerBenefits(o);
 if(b.feeDiscount===null)return {status:'unconfirmed',reason:'Desconto na tarifa indicado, mas sem valor informado.'};
 return {status:'identified',name:typeof o.name==='string'?o.name:null,type:typeof o.type==='string'?o.type:null,
  feeDiscount:b.feeDiscount,meliPercentage:b.meliPercentage,mlSubsidy:b.mlSubsidy};
}

// Benefícios do Mercado Livre numa oferta (ativa ou candidata).
// Subsídio = meli_percentage × original_price (as porcentagens da API são sobre o preço bruto).
// Pedido de Dherik: sempre arredondado para baixo no centavo. A API arredonda a porcentagem,
// então pode diferir da Central (caso MLB3575190873: 3,5% × 199,90 = 6,9965 → R$ 6,99; Central "Reduzimos R$ 6,91").
// A margem de 1e-6 evita perder um centavo por erro de ponto flutuante quando o produto é exato.
// feeDiscount null = oferta boosted sem o valor do desconto (não presumir zero).
export function offerBenefits(o:Record<string,unknown>):{meliPercentage:number|null;mlSubsidy:number|null;feeDiscount:number|null}{
 const meli=amount(o.meli_percentage),original=amount(o.original_price);
 return {meliPercentage:meli||null,
  mlSubsidy:!meli?0:original===null?null:Math.floor(meli*original+1e-6)/100,
  feeDiscount:o.boosted_offer===true?amount(o.discount_meli_boost_amount):0};
}
