import {actor,account,json,runtime} from '@/lib/mercado-livre';
import {mlSession,MlError} from '@/lib/ml-api';
import {identifyCost,type CatalogRow} from '@/lib/ml-catalog';
import {ownExpenses} from '@/lib/pricing';
import {promotionFeeReduction} from '@/lib/promotion-fees';
import {promotionPrice} from '@/lib/promotion-price';

type Promotion={id?:string;type?:string;status?:string;name?:string;start_date?:string;finish_date?:string};
type PromotionItem={id?:string;status?:string;price?:number;original_price?:number;min_discounted_price?:number;max_discounted_price?:number;offer_id?:string;[key:string]:unknown};
type PromotionItemsResponse=PromotionItem[]|{results?:PromotionItem[];items?:PromotionItem[]};
type ImportRow={payload:string;seller_id:string};
const allowedType=(v:string)=>/^[A-Z][A-Z0-9_]{0,49}$/.test(v);
const allowedId=(v:string)=>/^[A-Za-z0-9_-]{1,100}$/.test(v);

export async function GET(request:Request){
 let owner:string;try{owner=await actor()}catch{return json({error:'Sessão inválida. Abra o painel em uma nova aba.'},403)}
 try{
  const a=await account(owner);if(!a?.seller_id||!a.tokens)throw new MlError('Autorize sua conta antes de consultar promoções.',409);
  const stored=await runtime().DB.prepare('SELECT payload,seller_id FROM ml_imports WHERE owner=?').bind(owner).first<ImportRow>();
  if(!stored||stored.seller_id!==a.seller_id)throw new MlError('Importe os anúncios ativos antes de consultar promoções.',409);
  const rows=(JSON.parse(stored.payload) as {rows?:CatalogRow[]}).rows??[];
  const byItem=new Map<string,CatalogRow>();for(const row of rows)if(!byItem.has(row.itemId))byItem.set(row.itemId,row);
  const api=await mlSession(owner);
  const raw=await api.get<Promotion[]|{results?:Promotion[]}>(`/seller-promotions/users/${encodeURIComponent(api.sellerId)}?app_version=v2`);
  const campaigns=(Array.isArray(raw)?raw:raw.results??[]).filter(p=>p.id&&p.type&&allowedId(p.id)&&allowedType(p.type)).slice(0,12);
  const output=[] as {id:string;type:string;status:string;name:string;startDate:string|null;finishDate:string|null;items:unknown[];error?:string;note?:string}[];
  for(const p of campaigns){
   const base={id:p.id!,type:p.type!,status:p.status??'unknown',name:p.name??p.type!,startDate:p.start_date??null,finishDate:p.finish_date??null};
   if(p.type==='SELLER_COUPON_CAMPAIGN'){
    output.push({...base,items:[],note:'Campanha de cupom: o desconto é aplicado no carrinho e não possui preço promocional por anúncio nesta consulta.'});
    continue;
   }
   try{
    const query=new URLSearchParams({promotion_type:p.type!,app_version:'v2',limit:'50'});
    let detail:PromotionItemsResponse;
    try{
     detail=await api.get<PromotionItemsResponse>(`/seller-promotions/promotions/${encodeURIComponent(p.id!)}/items?${query}`);
    }catch{
     const fallback=new URLSearchParams({promotion_type:p.type!,app_version:'v2'});
     detail=await api.get<PromotionItemsResponse>(`/seller-promotions/promotions/${encodeURIComponent(p.id!)}?${fallback}`);
    }
    const list=Array.isArray(detail)?detail:detail.results??detail.items??[];
    const items=list.map(item=>{
     const imported=item.id?byItem.get(item.id):undefined;
     const cost=imported?identifyCost(imported.sku,imported.title,imported.itemId).cost:null;
     const promo=promotionPrice(item);
     const feeReduction=promotionFeeReduction(item);
     const expenses=promo!==null?ownExpenses(promo):null;
     const tax=expenses?.tax??null;
     const advertising=expenses?.advertising??null;
     const internalCommission=expenses?.internalCommission??null;
     const fixedExpense=expenses?.fixedExpense??null;
     const minimumProfit=expenses?.minimumProfit??null;
     const feeShippingLimit=promo!==null&&cost!==null?promo-cost-(tax??0)-(advertising??0)-(internalCommission??0)-(fixedExpense??0)-(minimumProfit??0):null;
     const analysis=promo===null||cost===null?'missing':feeShippingLimit<0?'not_recommended':'pending_ml_costs';
     return {itemId:item.id??'',promotionId:p.id!,promotionType:p.type!,offerId:item.offer_id??null,sku:imported?.sku??'',title:imported?.title??'Anúncio não encontrado na última importação',status:item.status??'',currentPrice:imported?.price??item.original_price??null,originalPrice:item.original_price??null,promotionPrice:promo,feeReduction,cost,tax,advertising,internalCommission,fixedExpense,minimumProfit,feeShippingLimit,analysis};
    });
    output.push({...base,items});
   }catch(e){output.push({...base,items:[],error:e instanceof Error?e.message:'Não foi possível consultar os itens.'})}
  }
  return json({campaigns:output,readOnly:true,updatedAt:Date.now()});
 }catch(e){return json({error:e instanceof MlError?e.message:'Não foi possível consultar as promoções agora.'},e instanceof MlError?e.status:503)}
}
