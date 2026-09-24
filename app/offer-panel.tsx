'use client';
import {useEffect,useState} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import type {Analysis,MarginRules} from '@/lib/offer-analysis';
type Offer={id:string|null;refId:string|null;type:string|null;name:string|null;status:string;start:string|null;finish:string|null;min:number|null;max:number|null;originalPrice:number|null;price?:number;priceSource?:'offer'|'suggested';feePercentage?:number|null;analysis?:Analysis;reason?:string};
type Report={title:string;currency:string;offers:Offer[];warnings:string[]};
const brl=(n:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n);
const pct=(n:number)=>(n*100).toLocaleString('pt-BR',{maximumFractionDigits:2})+'%';
const typeNames:Record<string,string>={SMART:'Co-participação',MARKETPLACE_CAMPAIGN:'Co-participação',PRICE_MATCHING:'Preços competitivos',DEAL:'Campanha tradicional',PRICE_DISCOUNT:'Desconto individual',LIGHTNING:'Oferta relâmpago',DOD:'Oferta do dia',PRE_NEGOTIATED:'Desconto pré-acordado',VOLUME:'Desconto por quantidade',SELLER_CAMPAIGN:'Campanha do vendedor',SELLER_COUPON_CAMPAIGN:'Cupom do vendedor'};
const statusNames:Record<string,string>={candidate:'Disponível',pending:'Programada',started:'Participando'};
const verdicts={approved:['Aprovada','gp-ok'],attention:['Atenção','gp-warn'],not_recommended:['Não recomendada','gp-bad'],missing:['Faltam dados','gp-neutral']} as const;
const date=(s:string|null)=>s?new Date(s).toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'}):null;

// Promoções de um anúncio com margem pelas regras e custos da conta. Somente leitura.
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
  <p className="gp-note">Somente análise: o gestor não faz adesões. {offers.length?`${approved} de ${offers.length} promoç${offers.length>1?'ões':'ão'} com margem aprovada.`:'Nenhuma promoção disponível, programada ou ativa para este anúncio.'}</p>
  {warnings.map(w=><p key={w} className="gp-note gp-danger">{w}</p>)}
  {offers.map((o,i)=><OfferRow key={(o.refId??o.id??'')+i} offer={o}/>)}
 </div>;
}

function OfferRow({offer:o}:{offer:Offer}){
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
