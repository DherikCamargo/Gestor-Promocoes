const directKeys=new Set([
 'fee_reduction','fee_reduction_amount','fee_discount','fee_discount_amount',
 'sale_fee_discount','sale_fee_discount_amount','selling_fee_discount','selling_fee_discount_amount',
 'commission_discount','commission_discount_amount','commission_reduction','commission_reduction_amount',
 'rebate','rebate_amount','fee_saving','fee_savings','fee_savings_amount',
]);

const labelPattern=/(tarifa|comiss|fee|commission)/i;
const benefitPattern=/(redu|descont|econom|saving|discount|rebate)/i;

export function promotionFeeReduction(value:unknown):number{
 let best=0;
 const visit=(entry:unknown,parentLabel='')=>{
  if(Array.isArray(entry)){for(const child of entry)visit(child,parentLabel);return}
  if(!entry||typeof entry!=='object')return;
  const record=entry as Record<string,unknown>;
  const label=[parentLabel,record.type,record.name,record.label,record.description,record.title].filter(v=>typeof v==='string').join(' ');
  for(const [rawKey,child] of Object.entries(record)){
   const key=rawKey.toLowerCase();
   if(typeof child==='number'&&Number.isFinite(child)&&child>0){
    const explicitlyAmount=directKeys.has(key);
    const labeledAmount=(key==='amount'||key==='value')&&labelPattern.test(label)&&benefitPattern.test(label);
    if(explicitlyAmount||labeledAmount)best=Math.max(best,child);
   }else visit(child,label+' '+rawKey);
  }
 };
 visit(value);
 return best;
}
