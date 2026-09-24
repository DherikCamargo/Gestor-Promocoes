import {record} from './listing-summary';
import {promotionPrice,promotionPriceIssues} from './promotion-price';
import {offerBenefits} from './listing-fees';

// Regras de margem editáveis na lista (tabela margin_rules). Taxas em fração (0,09 = 9%).
export type MarginRules={taxRate:number;advertisingRate:number;internalCommissionRate:number;fixedExpense:number;lowPriceThreshold:number;lowPriceFreight:number;minimumMarginRate:number};
// Padrões confirmados por Dherik em 24/09/2026; margem mínima 3% (antes 4%).
export const defaultRules:MarginRules={taxRate:.09,advertisingRate:.05,internalCommissionRate:.03,fixedExpense:14,lowPriceThreshold:78.90,lowPriceFreight:9,minimumMarginRate:.03};
const limits:Record<keyof MarginRules,number>={taxRate:1,advertisingRate:1,internalCommissionRate:1,fixedExpense:1000,lowPriceThreshold:10000,lowPriceFreight:1000,minimumMarginRate:1};
// Aceita só regras completas e dentro dos limites; qualquer campo inválido invalida o conjunto.
export function parseRules(v:unknown):MarginRules|null{
 const r=record(v),out={} as MarginRules;
 for(const k of Object.keys(limits) as (keyof MarginRules)[]){const n=r[k];if(typeof n!=='number'||!Number.isFinite(n)||n<0||n>limits[k])return null;out[k]=n}
 return out;
}

export type OfferTerms={ok:true;price:number;priceSource:'offer'|'suggested';mlSubsidy:number|null;feeDiscount:number|null}|{ok:false;reason:string};
// Preço e benefícios de uma oferta, sem presumir valores ausentes.
export function offerTerms(o:Record<string,unknown>):OfferTerms{
 if(o.type==='SELLER_COUPON_CAMPAIGN')return {ok:false,reason:'Cupom do vendedor: o desconto depende do cupom, não há preço para analisar.'};
 const issues=promotionPriceIssues(o);
 if(issues.length)return {ok:false,reason:issues.join(' ')};
 const price=promotionPrice(o);
 if(price===null)return {ok:false,reason:'O Mercado Livre não informou preço nem sugestão para esta oferta.'};
 const b=offerBenefits(o);
 return {ok:true,price,priceSource:typeof o.price==='number'&&o.price>0?'offer':'suggested',mlSubsidy:b.mlSubsidy,feeDiscount:b.feeDiscount};
}

export type Analysis={
 status:'approved'|'attention'|'not_recommended'|'missing';missing:string[];
 price:number;saleFee:number|null;mlSubsidy:number|null;feeDiscount:number|null;commission:number|null;
 freight:number|null;freightSource:'rule'|'ml'|null;cost:number|null;
 tax:number;advertising:number;internalCommission:number|null;fixedExpense:number;profit:number|null;margin:number|null;
};
const r2=(n:number)=>Math.round(n*100)/100;
// Lucro = preço − custo − imposto − publicidade − comissão interna − despesa fixa − tarifa líquida − frete.
// Tarifa líquida = tarifa do listing_prices − subsídio do ML − desconto automático na tarifa, como na Central
// (MLB3575190873: 109 − (15,26 − 6,91) − 17,15 = 83,50 recebidos).
export function analyzeOffer(i:{price:number;saleFee:number|null;mlSubsidy:number|null;feeDiscount:number|null;mlFreight:number|null;cost:number|null;rules:MarginRules}):Analysis{
 const {price:p,rules}=i,missing:string[]=[];
 const lowPrice=Math.round(p*100)<Math.round(rules.lowPriceThreshold*100);
 const freight=lowPrice?rules.lowPriceFreight:i.mlFreight;
 if(i.cost===null)missing.push('custo do produto');
 if(i.saleFee===null)missing.push('tarifa do Mercado Livre');
 if(i.mlSubsidy===null)missing.push('subsídio do Mercado Livre');
 if(i.feeDiscount===null)missing.push('desconto na tarifa');
 if(freight===null)missing.push('frete');
 const tax=r2(p*rules.taxRate),advertising=r2(p*rules.advertisingRate),fixedExpense=rules.fixedExpense;
 const commission=i.saleFee===null||i.mlSubsidy===null||i.feeDiscount===null?null:r2(Math.max(0,i.saleFee-i.mlSubsidy-i.feeDiscount));
 const internalCommission=commission===null||freight===null?null:r2(Math.max(0,p-commission-freight)*rules.internalCommissionRate);
 const base={price:p,saleFee:i.saleFee,mlSubsidy:i.mlSubsidy,feeDiscount:i.feeDiscount,commission,freight,freightSource:freight===null?null:lowPrice?'rule' as const:'ml' as const,cost:i.cost,tax,advertising,internalCommission,fixedExpense};
 if(missing.length)return {...base,status:'missing',missing,profit:null,margin:null};
 const profit=r2(p-i.cost!-tax-advertising-internalCommission!-fixedExpense-commission!-freight!);
 const margin=profit/p;
 // Comparação em pontos-base evita que 2,9999% por arredondamento reprove uma margem de 3%.
 const status=Math.round(margin*10000)>=Math.round(rules.minimumMarginRate*10000)?'approved':profit>=0?'attention':'not_recommended';
 return {...base,status,missing,profit,margin};
}
