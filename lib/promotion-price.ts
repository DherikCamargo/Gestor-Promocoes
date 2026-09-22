export type PromotionPriceFields={
 status?:string;
 price?:number;
 min_discounted_price?:number;
 max_discounted_price?:number;
 suggested_discounted_price?:number;
 boosted_offer?:boolean;
 total_price_for_boosted_offer?:number;
};

const valid=(value:unknown):value is number=>typeof value==='number'&&Number.isFinite(value)&&value>0;

// Bounds are never suggestions. ML documents price as suggested for LIGHTNING
// candidates; suggested_discounted_price is used when no positive price exists.
export function promotionPrice(item:PromotionPriceFields):number|null{
 if(promotionPriceIssues(item).length)return null;
 if(item.boosted_offer===true)return valid(item.total_price_for_boosted_offer)?item.total_price_for_boosted_offer:null;
 const ordered=item.status==='candidate'
  ? [item.price,item.suggested_discounted_price]
  : [item.price];
 return ordered.find(valid)??null;
}

export function promotionPriceIssues(item:PromotionPriceFields):string[]{
 const issues:string[]=[];
 const min=item.min_discounted_price,max=item.max_discounted_price;
 const cents=(n:number)=>Math.round(n*100);
 if(valid(min)&&valid(max)&&cents(min)>cents(max))issues.push('Limite mínimo maior que o máximo.');
 for(const [label,p] of [['Preço da oferta',item.price],['Preço sugerido',item.suggested_discounted_price]] as const){
  if(!valid(p))continue;
  if(valid(min)&&cents(p)<cents(min))issues.push(label+' abaixo do mínimo informado.');
  if(valid(max)&&cents(p)>cents(max))issues.push(label+' acima do máximo informado.');
 }
 return issues;
}
