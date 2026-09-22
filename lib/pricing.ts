export const pricingRules={
 taxRate:.09,
 advertisingRate:.05,
 internalCommissionRate:.03,
 marketplaceCommissionRate:.14,
 lowPriceThreshold:78.90,
 lowPriceFreight:9,
 fixedExpense:14,
 minimumMarginRate:.04,
} as const;

export function ownExpenses(price:number,commission=0,freight=0){
 const tax=price*pricingRules.taxRate;
 const advertising=price*pricingRules.advertisingRate;
 const internalCommission=Math.max(0,price-commission-freight)*pricingRules.internalCommissionRate;
 const fixedExpense=pricingRules.fixedExpense;
 const minimumProfit=price*pricingRules.minimumMarginRate;
 return {tax,advertising,internalCommission,fixedExpense,minimumProfit};
}

export function promotionResult(input:{price:number;cost:number;commission:number;freight:number}){
 const expenses=ownExpenses(input.price,input.commission,input.freight);
 const profit=input.price-input.cost-expenses.tax-expenses.advertising-expenses.internalCommission-expenses.fixedExpense-input.commission-input.freight;
 const margin=profit/input.price*100;
 const analysis=margin>=pricingRules.minimumMarginRate*100?'approved':profit>=0?'attention':'not_recommended';
 return {...expenses,profit,margin,analysis};
}
