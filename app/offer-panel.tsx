'use client';
import {useEffect,useState} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import type {Analysis,MarginRules} from '@/lib/offer-analysis';
type Offer={id:string|null;refId:string|null;type:string|null;name:string|null;status:string;start:string|null;finish:string|null;min:number|null;max:number|null;originalPrice:number|null;price?:number;priceSource?:'offer'|'suggested';feePercentage?:number|null;analysis?:Analysis;reason?:string;blockReason:string|null};
type Report={title:string;currency:string;offers:Offer[];warnings:string[];participationEnabled:boolean};
export type Outcome={status:'confirmed'|'divergent'|'unverified'|'refused'|'failed';price?:number|null;expected?:number;state?:string;detail?:string;error?:string};
// Uma adesão por pedido; o servidor revalida margem, tipo e preço antes de enviar.
export async function activate(itemId:string,refId:string):Promise<Outcome>{
 try{const r=await fetch('/api/mercado-livre/promocoes/participar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({itemId,refId})});const d=await r.json() as Outcome;return d.status?d:{status:'failed',detail:d.error||'Adesão indisponível.'}}
 catch{return {status:'failed',detail:'Sem resposta do servidor. Confira na Central antes de tentar de novo.'}}
}
export const outcomeText=(o:Outcome)=>o.status==='confirmed'?`Ativada: ${o.state==='pending'?'programada':'participando'} por ${brl(o.price!)}.`:o.status==='divergent'?`Atenção: preço aplicado ${o.price!=null?brl(o.price):'desconhecido'} (esperado ${brl(o.expected!)}). Confira na Central.`:o.detail||o.error||'Não concluída.';
export const outcomeTone=(o:Outcome)=>o.status==='confirmed'?'gp-ok':o.status==='divergent'||o.status==='failed'?'gp-bad':'gp-warn';
export const brl=(n:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n);
export const pct=(n:number)=>(n*100).toLocaleString('pt-BR',{maximumFractionDigits:2})+'%';
export const typeNames:Record<string,string>={SMART:'Co-participação',MARKETPLACE_CAMPAIGN:'Co-participação',PRICE_MATCHING:'Preços competitivos',DEAL:'Campanha tradicional',PRICE_DISCOUNT:'Desconto individual',LIGHTNING:'Oferta relâmpago',DOD:'Oferta do dia',PRE_NEGOTIATED:'Desconto pré-acordado',VOLUME:'Desconto por quantidade',SELLER_CAMPAIGN:'Campanha do vendedor',SELLER_COUPON_CAMPAIGN:'Cupom do vendedor',UNHEALTHY_STOCK:'Liquidação de estoque Full',BANK:'Desconto no Pix'};
const statusNames:Record<string,string>={candidate:'Disponível',pending:'Programada',started:'Participando'};
const verdicts={approved:['Aprovada','gp-ok'],attention:['Atenção','gp-warn'],not_recommended:['Não recomendada','gp-bad'],missing:['Faltam dados','gp-neutral']} as const;
const date=(s:string|null)=>s?new Date(s).toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'}):null;

// Promoções de um anúncio com margem pelas regras e custos da conta; ativa as aprovadas quando a adesão está ligada.
export function OfferPanel({itemId,version}:{itemId:string;version:number}){
 const [state,setState]=useState<{report?:Report;error?:string}|null>(null),[attempt,setAttempt]=useState(0);
 useEffect(()=>{
  let active=true;
  fetch('/api/mercado-livre/promocoes/analise?itemId='+itemId,{cache:'no-store'}).then(async r=>{const d=await r.json() as Report&{error?:string};if(active)setState(r.ok?{report:d}:{error:d.error||'Análise indisponível.'})}).catch(()=>{if(active)setState({error:'Análise indisponível. Verifique a conexão.'})});
  return()=>{active=false};
 },[itemId,version,attempt]);
 if(!state)return <div className="gp-panel" role="status">Analisando promoções, tarifas e fretes…</div>;
 if(state.error)return <div className="gp-panel gp-danger" role="alert">{state.error} <Button size="sm" variant="outline" onClick={()=>{setState(null);setAttempt(a=>a+1)}}>Tentar de novo</Button></div>;
 const {offers,warnings}=state.report!;
 const approved=offers.filter(o=>o.analysis?.status==='approved').length;
 return <div className="gp-panel">
  <p className="gp-note">{state.report!.participationEnabled?'':'Adesões desligadas: somente análise. '}{offers.length?`${approved} de ${offers.length} promoç${offers.length>1?'ões':'ão'} com margem aprovada.`:'Nenhuma promoção disponível, programada ou ativa para este anúncio.'}</p>
  {warnings.map(w=><p key={w} className="gp-note gp-danger">{w}</p>)}
  {offers.map((o,i)=><OfferRow key={(o.refId??o.id??'')+i} offer={o} itemId={itemId} enabled={state.report!.participationEnabled} onRecheck={()=>{setState(null);setAttempt(a=>a+1)}}/>)}
 </div>;
}

function OfferRow({offer:o,itemId,enabled,onRecheck}:{offer:Offer;itemId:string;enabled:boolean;onRecheck:()=>void}){
 const [step,setStep]=useState<'idle'|'confirm'|'sending'>('idle'),[outcome,setOutcome]=useState<Outcome|null>(null);
 const a=o.analysis,[label,tone]=a?verdicts[a.status]:['Não analisada','gp-neutral'];
 const period=[date(o.start),date(o.finish)].filter(Boolean).join(' a ');
 return <div className="gp-offer">
  <div className="gp-offer-head">
   <span className={'gp-verdict '+tone}>{label}</span>
   <strong>{o.name||typeNames[o.type??'']||o.type||'Promoção'}</strong>
   <span className="gp-note">{[typeNames[o.type??'']??o.type,statusNames[o.status]??o.status,period].filter(Boolean).join(' · ')}</span>
  </div>
  {!a?<p className="gp-note">{o.reason}</p>:<>
   <div className="gp-offer-grid">
    <div><span className="gp-label-inline">Preço</span>{brl(a.price)}{o.priceSource==='suggested'&&<span className="gp-note">sugerido{o.min&&o.max?` · aceita de ${brl(o.min)} a ${brl(o.max)}`:''}</span>}</div>
    <div><span className="gp-label-inline">Subsídio ML</span>{a.mlSubsidy===null?'—':brl(a.mlSubsidy)}{a.feeDiscount?<span className="gp-note">+ {brl(a.feeDiscount)} na tarifa</span>:null}</div>
    <div><span className="gp-label-inline">Tarifa líquida</span>{a.commission===null?'—':brl(a.commission)}{a.saleFee!==null&&<span className="gp-note">tarifa {brl(a.saleFee)}{o.feePercentage!=null?` (${o.feePercentage.toLocaleString('pt-BR')}%)`:''}</span>}</div>
    <div><span className="gp-label-inline">Frete</span>{a.freight===null?'—':brl(a.freight)}{a.freightSource&&<span className="gp-note">{a.freightSource==='rule'?'regra abaixo do limite':'estimativa ML'}</span>}</div>
    <div><span className="gp-label-inline">Custo</span>{a.cost===null?'—':brl(a.cost)}</div>
    <div><span className="gp-label-inline">Lucro</span><strong className={a.profit!==null&&a.profit<0?'gp-danger':''}>{a.profit===null?'—':brl(a.profit)}</strong></div>
    <div><span className="gp-label-inline">Margem</span><strong>{a.margin===null?'—':pct(a.margin)}</strong></div>
   </div>
   {a.status==='missing'?<p className="gp-note">Falta: {a.missing.join(', ')}.</p>:<details className="gp-calc"><summary>Ver cálculo</summary><ul>
    <li>Preço {brl(a.price)}</li>
    <li>− Custo {brl(a.cost!)}</li>
    <li>− Imposto {brl(a.tax)}</li>
    <li>− Publicidade {brl(a.advertising)}</li>
    <li>− Comissão interna {brl(a.internalCommission!)}</li>
    <li>− Despesa fixa {brl(a.fixedExpense)}</li>
    <li>− Tarifa líquida {brl(a.commission!)} (tarifa {brl(a.saleFee!)} − subsídio {brl(a.mlSubsidy!)}{a.feeDiscount?` − desconto ${brl(a.feeDiscount)}`:''})</li>
    <li>− Frete {brl(a.freight!)}</li>
    <li><strong>= Lucro {brl(a.profit!)} · margem {pct(a.margin!)}</strong></li>
   </ul></details>}
  </>}
  {o.status==='candidate'&&enabled&&(o.blockReason?<p className="gp-note">Ativação: {o.blockReason}</p>
   :outcome?<div className="gp-cost-actions"><p className={'gp-verdict '+outcomeTone(outcome)} role="status">{outcomeText(outcome)}</p>{outcome.status==='unverified'&&<Button size="sm" variant="outline" type="button" onClick={onRecheck}>Conferir de novo</Button>}</div>
   :step==='idle'?<Button size="sm" type="button" className="gp-activate" onClick={()=>setStep('confirm')}>Ativar</Button>
   :<div className="gp-confirm" role="alertdialog" aria-label="Confirmar adesão"><p>Ativar <strong>{o.name||typeNames[o.type??'']}</strong> neste anúncio por <strong>{brl(a!.price)}</strong> (margem {pct(a!.margin!)})? O preço do anúncio no Mercado Livre muda.</p><span className="gp-cost-actions"><Button size="sm" type="button" disabled={step==='sending'} onClick={async()=>{setStep('sending');const r=await activate(itemId,o.refId??o.id!);setOutcome(r);setStep('idle')}}>{step==='sending'?'Ativando…':'Confirmar'}</Button><Button size="sm" variant="ghost" type="button" disabled={step==='sending'} onClick={()=>setStep('idle')}>Cancelar</Button></span></div>)}
 </div>;
}

type Field={key:keyof MarginRules;label:string;kind:'pct'|'brl'};
const fields:Field[]=[
 {key:'taxRate',label:'Imposto',kind:'pct'},{key:'advertisingRate',label:'Publicidade',kind:'pct'},
 {key:'internalCommissionRate',label:'Comissão interna',kind:'pct'},{key:'fixedExpense',label:'Despesa fixa por venda',kind:'brl'},
 {key:'lowPriceThreshold',label:'Preço-limite do frete fixo',kind:'brl'},{key:'lowPriceFreight',label:'Frete abaixo do limite',kind:'brl'},
 {key:'minimumMarginRate',label:'Margem mínima para aprovar',kind:'pct'},
];
const show=(f:Field,r:MarginRules)=>(f.kind==='pct'?Math.round(r[f.key]*10000)/100:r[f.key]).toLocaleString('pt-BR',{maximumFractionDigits:2,useGrouping:false});

// Regras de margem editáveis; ao salvar, as análises abertas são refeitas.
export function RulesPanel({onSaved}:{onSaved:()=>void}){
 const [data,setData]=useState<{rules:MarginRules;defaults:MarginRules;edited:boolean}|null>(null);
 const [values,setValues]=useState<Record<string,string>>({}),[message,setMessage]=useState(''),[saving,setSaving]=useState(false);
 const load=(d:{rules:MarginRules;defaults:MarginRules;edited:boolean})=>{setData(d);setValues(Object.fromEntries(fields.map(f=>[f.key,show(f,d.rules)])))};
 useEffect(()=>{fetch('/api/mercado-livre/regras',{cache:'no-store'}).then(async r=>{const d=await r.json() as {rules:MarginRules;defaults:MarginRules;edited:boolean;error?:string};if(d.rules)load(d);if(!r.ok)setMessage(d.error||'Regras indisponíveis.')}).catch(()=>setMessage('Regras indisponíveis. Verifique a conexão.'))},[]);
 async function send(rules:MarginRules|null){
  setSaving(true);setMessage('');
  try{const r=await fetch('/api/mercado-livre/regras',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({rules})});const d=await r.json() as {rules:MarginRules;defaults:MarginRules;edited:boolean;error?:string};
   if(!r.ok)setMessage(d.error||'Não foi possível salvar.');else{load(d);setMessage('Regras salvas. As análises abertas foram atualizadas.');onSaved()}}
  catch{setMessage('Não foi possível salvar. Verifique a conexão.')}
  finally{setSaving(false)}
 }
 function submit(e:React.FormEvent){
  e.preventDefault();const rules={} as MarginRules;
  for(const f of fields){const n=Number((values[f.key]??'').trim().replace(',','.'));if(!values[f.key]?.trim()||!Number.isFinite(n)||n<0||(f.kind==='pct'&&n>100)){setMessage(`Confira "${f.label}".`);return}rules[f.key]=f.kind==='pct'?Math.round(n*100)/10000:n}
  void send(rules);
 }
 return <details className="gp-rules"><summary>Regras de margem{data?.edited?' · editadas':''}</summary>
  {!data?<p className="gp-note">{message||'Carregando regras…'}</p>:<form onSubmit={submit}>
   <div className="gp-rules-grid">{fields.map(f=><label key={f.key}>{f.label} ({f.kind==='pct'?'%':'R$'})<Input inputMode="decimal" value={values[f.key]??''} onChange={e=>{setValues(v=>({...v,[f.key]:e.target.value}));setMessage('')}}/><span className="gp-note">Padrão: {show(f,data.defaults)}{f.kind==='pct'?'%':''}</span></label>)}</div>
   <p className="gp-note">Lucro = preço − custo − imposto − publicidade − comissão interna − despesa fixa − tarifa líquida do ML − frete. Comissão interna incide sobre (preço − tarifa líquida − frete). Abaixo do preço-limite, o frete é o valor fixo acima; a partir dele, a estimativa do ML.</p>
   <div className="gp-cost-actions"><Button type="submit" disabled={saving}>{saving?'Salvando…':'Salvar regras'}</Button>{data.edited&&<Button type="button" variant="ghost" disabled={saving} onClick={()=>void send(null)}>Voltar ao padrão</Button>}</div>
   {message&&<p role="status" className="gp-note">{message}</p>}
  </form>}
 </details>;
}

type FamilyItem={itemId:string;label:string};
type CampaignRow={itemId:string;label:string;refId:string;status:string;price:number|null;margin:number|null;blockReason:string|null};
type Campaign={key:string;name:string;type:string|null;rows:CampaignRow[]};
// Família com preço por variação: analisa todas as variações e agrupa as ofertas por campanha.
// Um clique ativa a campanha em todas as variações aprovadas, uma por vez, com confirmação.
export function FamilyActivation({items,version}:{items:FamilyItem[];version:number}){
 const [data,setData]=useState<{campaigns:Campaign[];enabled:boolean;failed:string[];done:number}|null>(null);
 const [confirming,setConfirming]=useState<string|null>(null),[running,setRunning]=useState<string|null>(null),[outcomes,setOutcomes]=useState<Record<string,Outcome>>({}),[recheck,setRecheck]=useState(0);
 useEffect(()=>{
  let active=true;
  (async()=>{
   const campaigns=new Map<string,Campaign>(),failed:string[]=[];let enabled=true,done=0;
   // Em sequência, para não disparar muitas consultas ao Mercado Livre ao mesmo tempo.
   for(const it of items){
    if(!active)return;
    try{
     const r=await fetch('/api/mercado-livre/promocoes/analise?itemId='+it.itemId,{cache:'no-store'});const d=await r.json() as Report&{error?:string};
     if(!r.ok){failed.push(it.label);continue}
     enabled&&=d.participationEnabled;
     for(const o of d.offers){
      if(!o.id||(o.status!=='candidate'&&o.status!=='pending'&&o.status!=='started'))continue;
      const c=campaigns.get(o.id)??{key:o.id,name:o.name||typeNames[o.type??'']||o.type||'Promoção',type:o.type,rows:[]};
      c.rows.push({itemId:it.itemId,label:it.label,refId:o.refId??o.id,status:o.status,price:o.analysis?.price??o.price??null,margin:o.analysis?.margin??null,blockReason:o.blockReason});
      campaigns.set(o.id,c);
     }
    }catch{failed.push(it.label)}
    done++;
    if(active)setData({campaigns:[...campaigns.values()],enabled,failed:[...failed],done});
   }
   if(active)setData({campaigns:[...campaigns.values()].sort((a,b)=>b.rows.filter(r=>!r.blockReason).length-a.rows.filter(r=>!r.blockReason).length),enabled,failed,done});
  })();
  return()=>{active=false};
 },[items,version,recheck]);
 async function run(c:Campaign){
  setConfirming(null);setRunning(c.key);
  for(const r of c.rows.filter(r=>!r.blockReason)){
   const o=await activate(r.itemId,r.refId);
   setOutcomes(s=>({...s,[c.key+':'+r.itemId]:o}));
  }
  setRunning(null);
 }
 if(!data)return <div className="gp-panel" role="status">Analisando as promoções de {items.length} variações…</div>;
 const loading=data.done<items.length;
 return <div className="gp-panel">
  <p className="gp-note">{loading?`Analisando… ${data.done} de ${items.length} variações.`:`${items.length} variações analisadas.`}{data.enabled?'':' Adesões desligadas: somente análise.'}</p>
  {data.failed.length>0&&<p className="gp-note gp-danger">Sem análise: {data.failed.join(', ')}.</p>}
  {running===null&&Object.values(outcomes).some(o=>o.status==='unverified')&&<Button size="sm" variant="outline" type="button" className="gp-activate" onClick={()=>{setOutcomes({});setData(null);setRecheck(n=>n+1)}}>Conferir de novo as variações não confirmadas</Button>}
  {!loading&&!data.campaigns.length&&<p className="gp-note">Nenhuma promoção disponível para as variações desta família.</p>}
  {data.campaigns.map(c=>{
   const apt=c.rows.filter(r=>!r.blockReason);
   return <div key={c.key} className="gp-offer">
    <div className="gp-offer-head"><strong>{c.name}</strong><span className="gp-note">{typeNames[c.type??'']??c.type} · {apt.length} de {c.rows.length} variações aptas</span></div>
    <ul className="gp-family-rows">{c.rows.map(r=>{const o=outcomes[c.key+':'+r.itemId];return <li key={r.itemId}>
     <span>{r.label}</span><span>{r.price!==null?brl(r.price):'—'}</span><span>{r.margin!==null?pct(r.margin):'—'}</span>
     <span className={o?'gp-verdict '+outcomeTone(o):r.blockReason?'gp-note':'gp-verdict gp-ok'}>{o?outcomeText(o):r.blockReason??'Apta'}</span>
    </li>})}</ul>
    {data.enabled&&!loading&&apt.length>0&&(confirming===c.key
     ?<div className="gp-confirm" role="alertdialog" aria-label="Confirmar adesão da família"><p>Ativar <strong>{c.name}</strong> em <strong>{apt.length} variaç{apt.length>1?'ões':'ão'}</strong>? O preço de cada anúncio no Mercado Livre muda para o valor da lista acima. Cada variação é conferida de novo antes do envio.</p><span className="gp-cost-actions"><Button size="sm" type="button" onClick={()=>void run(c)}>Confirmar</Button><Button size="sm" variant="ghost" type="button" onClick={()=>setConfirming(null)}>Cancelar</Button></span></div>
     :<Button size="sm" type="button" className="gp-activate" disabled={running!==null} onClick={()=>setConfirming(c.key)}>{running===c.key?'Ativando…':`Ativar nas ${apt.length} variações aptas`}</Button>)}
   </div>;
  })}
 </div>;
}
