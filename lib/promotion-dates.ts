// Datas das promoções. A API mistura formatos: "2026-09-11T02:00:00-03:00", "2026-09-01T03:00:00Z"
// e "2026-08-28T00:00:00" (sem fuso); sem fuso é tratado como horário de Brasília (-03:00).
export function parseMlDate(s:string|null|undefined):number|null{
 if(!s||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/.test(s))return null;
 const t=Date.parse(/(Z|[+-]\d{2}:?\d{2})$/.test(s)?s:s+'-03:00');
 return Number.isFinite(t)?t:null;
}
const DAY=86400000;
// Dias inteiros até a data (0 = termina hoje ou já passou do momento, mas no mesmo dia).
export const daysUntil=(t:number,now:number)=>Math.max(0,Math.ceil((t-now)/DAY));

export type Period={start:number|null;finish:number|null};
export type Coverage=
 {state:'ok';until:number|null}|
 {state:'ending';until:number;days:number}|
 {state:'gap';from:number;until:number|null;days:number};
// Cobertura de um anúncio que já tem promoção ativa ou programada.
// ending: a atual termina em até `soonDays` dias sem outra programada logo depois;
// gap: a única promoção é programada e começa no futuro (sem promoção até lá).
export function coverage(current:Period&{status:string},pending:Period[],now:number,soonDays=3):Coverage{
 if(current.status==='pending'&&current.start!==null&&current.start>now)return {state:'gap',from:now,until:current.start,days:daysUntil(current.start,now)};
 const end=current.finish;
 if(end===null)return {state:'ok',until:null};
 // Continuação: outra programada que começa até 1 dia depois do fim da atual e vai além dela.
 const follow=pending.filter(p=>p.start!==null&&p.start<=end+DAY&&(p.finish===null||p.finish>end));
 if(follow.length){const last=Math.max(...follow.map(p=>p.finish??Infinity));return {state:'ok',until:Number.isFinite(last)?last:null}}
 const days=daysUntil(end,now);
 return days<=soonDays?{state:'ending',until:end,days}:{state:'ok',until:end};
}
// Oferta que cobre o período logo depois do fim da atual (para sugerir a próxima).
export const continuesAfter=(p:Period,end:number)=>(p.finish===null||p.finish>end)&&(p.start===null||p.start<=end+DAY);
