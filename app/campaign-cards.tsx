'use client';
import {useEffect,useMemo,useState} from 'react';
import {Button} from '@/components/ui/button';
import {activate,outcomeText,outcomeTone,brl,pct,typeNames,type Outcome} from './offer-panel';
type Campaign={id:string;type:string;status:string;name:string;start:string|null;finish:string|null;deadline:string|null};
type CampaignItem={itemId:string;status:string;price:number|null};
type Counts={items:CampaignItem[];complete:boolean}|{error:string};
type Analysis={status:'approved'|'attention'|'not_recommended'|'missing';price:number;margin:number|null;profit:number|null;missing:string[]};
type Row={itemId:string;label:string;refId:string|null;status:string;price:number|null;analysis?:Analysis;blockReason:string|null;error?:string};
// Tipos que o gestor ativa (preço definido pelo Mercado Livre); os demais ficam para a Central.
const activatable=new Set(['SMART','PRICE_MATCHING','MARKETPLACE_CAMPAIGN']);
const fmt=(s:string|null)=>s?new Date(s).toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo',day:'2-digit',month:'2-digit'}):null;
const verdict={approved:'Aprovada',attention:'Atenção',not_recommended:'Não recomendada',missing:'Faltam dados'} as const;

// Cards com todas as promoções para as quais o vendedor foi convidado.
export function CampaignCards({labels}:{labels:Record<string,string>}){
 const [state,setState]=useState<{campaigns?:Campaign[];enabled?:boolean;error?:string}|null>(null),[counts,setCounts]=useState<Record<string,Counts>>({});
 const [open,setOpen]=useState<string|null>(null),[attempt,setAttempt]=useState(0);
 useEffect(()=>{
  let active=true;
  (async()=>{
   try{
    const r=await fetch('/api/mercado-livre/promocoes/campanhas',{cache:'no-store'});const d=await r.json() as {campaigns?:Campaign[];participationEnabled?:boolean;error?:string};
    if(!r.ok||!d.campaigns){if(active)setState({error:d.error||'Promoções indisponíveis.'});return}
    if(!active)return;
    setState({campaigns:d.campaigns,enabled:!!d.participationEnabled});
    // Contagens de cada card, duas promoções por vez (limite de consultas por requisição).
    const queue=[...d.campaigns];
    const worker=async()=>{while(queue.length&&active){const c=queue.shift()!;let v:Counts;
     try{const x=await fetch('/api/mercado-livre/promocoes/campanhas/itens?'+new URLSearchParams({promotionId:c.id,type:c.type}),{cache:'no-store'});const j=await x.json() as {items?:CampaignItem[];complete?:boolean;error?:string};v=x.ok&&j.items?{items:j.items,complete:!!j.complete}:{error:j.error||'Indisponível.'}}
     catch{v={error:'Sem resposta.'}}
     if(active)setCounts(s=>({...s,[c.id]:v}))}};
    await Promise.all([worker(),worker()]);
   }catch{if(active)setState({error:'Promoções indisponíveis. Verifique a conexão.'})}
  })();
  return()=>{active=false};
 },[attempt]);
 if(!state)return <p className="gp-note" role="status">Carregando promoções do Mercado Livre…</p>;
 if(state.error)return <p className="gp-note gp-danger" role="alert">{state.error} <Button size="sm" variant="outline" onClick={()=>{setState(null);setCounts({});setAttempt(a=>a+1)}}>Tentar de novo</Button></p>;
 const campaigns=[...state.campaigns!].sort((a,b)=>{const n=(c:Campaign)=>{const v=counts[c.id];return v&&'items' in v?v.items.filter(i=>i.status==='candidate').length:-1};return n(b)-n(a)});
 const current=campaigns.find(c=>c.id===open);
 return <div className="gp-campaigns">
  {!campaigns.length?<p className="gp-note">Nenhuma promoção disponível no Mercado Livre agora.</p>
   :<div className="gp-campaign-grid">{campaigns.map(c=>{const v=counts[c.id],cand=v&&'items' in v?v.items.filter(i=>i.status==='candidate').length:null,part=v&&'items' in v?v.items.filter(i=>i.status!=='candidate').length:null;
    return <button key={c.id} type="button" className="gp-campaign-card" aria-pressed={open===c.id} onClick={()=>setOpen(o=>o===c.id?null:c.id)}>
     <strong>{c.name}</strong>
     <span className="gp-note">{typeNames[c.type]??c.type}{!activatable.has(c.type)?' · ativar pela Central':''}</span>
     <span className="gp-note">{[fmt(c.start)&&`${fmt(c.start)} a ${fmt(c.finish)??'?'}`,fmt(c.deadline)&&`aderir até ${fmt(c.deadline)}`].filter(Boolean).join(' · ')||'sem datas informadas'}</span>
     <span className="gp-campaign-counts">{v===undefined?'contando…':'error' in v?v.error:<><b>{cand}</b> disponíve{cand===1?'l':'is'} · <b>{part}</b> participando{v.complete?'':' (parcial)'}</>}</span>
    </button>})}</div>}
  {current&&<CampaignDetail key={current.id} campaign={current} counts={counts[current.id]} labels={labels} enabled={!!state.enabled} onClose={()=>setOpen(null)}/>}
 </div>;
}

// Anúncios e variações de uma promoção: analisa só esta promoção em cada candidato e permite
// ativar todas as aptas ou só as selecionadas (mesma adesão revalidada no servidor).
function CampaignDetail({campaign:c,counts,labels,enabled,onClose}:{campaign:Campaign;counts?:Counts;labels:Record<string,string>;enabled:boolean;onClose:()=>void}){
 const [rows,setRows]=useState<Record<string,Row>>({}),[done,setDone]=useState(0);
 const [selected,setSelected]=useState<Set<string>>(new Set()),[outcomes,setOutcomes]=useState<Record<string,Outcome>>({});
 const [confirming,setConfirming]=useState<'all'|'selected'|null>(null),[running,setRunning]=useState(false);
 const items=useMemo(()=>counts&&'items' in counts?counts.items:[],[counts]);
 const candidates=useMemo(()=>items.filter(i=>i.status==='candidate'),[items]);
 const label=(id:string)=>labels[id]??id;
 useEffect(()=>{
  let active=true;const queue=[...candidates];let n=0;
  const worker=async()=>{while(queue.length&&active){const it=queue.shift()!;let row:Row;
   try{const r=await fetch('/api/mercado-livre/promocoes/analise?'+new URLSearchParams({itemId:it.itemId,promotionId:c.id}),{cache:'no-store'});const d=await r.json() as {offers?:{id:string|null;refId:string|null;status:string;price?:number;analysis?:Analysis;blockReason:string|null;reason?:string}[];error?:string};
    const o=d.offers?.find(x=>x.id===c.id&&x.status==='candidate');
    row=!r.ok?{itemId:it.itemId,label:labels[it.itemId]??it.itemId,refId:null,status:'candidate',price:it.price,blockReason:null,error:d.error||'Análise indisponível.'}
     :!o?{itemId:it.itemId,label:labels[it.itemId]??it.itemId,refId:null,status:'candidate',price:it.price,blockReason:'A oferta não aparece mais para este anúncio.'}
     :{itemId:it.itemId,label:labels[it.itemId]??it.itemId,refId:o.refId??o.id,status:o.status,price:o.analysis?.price??o.price??it.price,analysis:o.analysis,blockReason:o.blockReason??(o.analysis?null:o.reason??'Sem análise.')};
   }catch{row={itemId:it.itemId,label:labels[it.itemId]??it.itemId,refId:null,status:'candidate',price:it.price,blockReason:null,error:'Sem resposta.'}}
   if(!active)return;
   n++;setRows(s=>({...s,[it.itemId]:row}));setDone(n);
   // Aptas já entram marcadas.
   if(!row.error&&!row.blockReason&&row.refId)setSelected(s=>new Set(s).add(it.itemId));
  }};
  void Promise.all([worker(),worker()]);
  return()=>{active=false};
 },[c.id,candidates,labels]);
 const analyzing=done<candidates.length;
 const list=candidates.map(i=>rows[i.itemId]).filter((r):r is Row=>!!r).sort((a,b)=>Number(!!a.blockReason||!!a.error)-Number(!!b.blockReason||!!b.error)||(b.analysis?.margin??-1)-(a.analysis?.margin??-1));
 const apt=list.filter(r=>!r.blockReason&&!r.error&&r.refId&&!outcomes[r.itemId]);
 const chosen=apt.filter(r=>selected.has(r.itemId));
 const participating=items.filter(i=>i.status!=='candidate');
 async function run(target:Row[]){
  setConfirming(null);setRunning(true);
  for(const r of target){const o=await activate(r.itemId,r.refId!);setOutcomes(s=>({...s,[r.itemId]:o}))}
  setRunning(false);
 }
 const target=confirming==='all'?apt:chosen;
 return <div className="gp-panel gp-campaign-detail">
  <div className="gp-offer-head"><strong>{c.name}</strong><span className="gp-note">{typeNames[c.type]??c.type}</span><Button size="sm" variant="ghost" type="button" onClick={onClose}>Fechar</Button></div>
  {!counts?<p className="gp-note" role="status">Carregando os anúncios desta promoção…</p>
   :'error' in counts?<p className="gp-note gp-danger">{counts.error}</p>:<>
   <p className="gp-note">{candidates.length} anúncio{candidates.length===1?'':'s'} disponíve{candidates.length===1?'l':'is'}{analyzing?` · analisando ${done} de ${candidates.length}…`:` · ${apt.length} apto${apt.length===1?'':'s'}`}{counts.complete?'':' · lista parcial (muitos anúncios)'}</p>
   {!activatable.has(c.type)&&<p className="gp-note">Neste tipo você escolhe o preço ou a adesão é irreversível: a análise aparece, mas a ativação é pela Central por enquanto.</p>}
   {list.length>0&&<ul className="gp-campaign-rows">{list.map(r=>{const o=outcomes[r.itemId],ok=!r.blockReason&&!r.error&&!!r.refId;return <li key={r.itemId}>
    <input type="checkbox" aria-label={'Selecionar '+r.label} checked={selected.has(r.itemId)&&!o} disabled={!ok||!!o||running||!enabled||!activatable.has(c.type)} onChange={()=>setSelected(s=>{const n=new Set(s);if(!n.delete(r.itemId))n.add(r.itemId);return n})}/>
    <span>{r.label}</span>
    <span>{r.price!==null?brl(r.price):'—'}</span>
    <span>{r.analysis?.margin!=null?`margem ${pct(r.analysis.margin)}`:r.analysis?verdict[r.analysis.status]:'—'}</span>
    <span className={o?'gp-verdict '+outcomeTone(o):ok?'gp-verdict gp-ok':'gp-note'}>{o?outcomeText(o):r.error??r.blockReason??'Apta'}</span>
   </li>})}</ul>}
   {enabled&&activatable.has(c.type)&&!analyzing&&(apt.length===0?<p className="gp-note">Nenhum anúncio apto para ativar nesta promoção.</p>
    :running?<p role="status">Ativando…</p>
    :confirming?<div className="gp-confirm" role="alertdialog" aria-label="Confirmar ativação"><p>Ativar <strong>{c.name}</strong> em <strong>{target.length} anúncio{target.length===1?'':'s'}</strong>? O preço de cada um no Mercado Livre muda para o valor da lista. Cada anúncio é conferido de novo antes do envio.</p><span className="gp-cost-actions"><Button size="sm" type="button" disabled={!target.length} onClick={()=>void run(target)}>Confirmar</Button><Button size="sm" variant="ghost" type="button" onClick={()=>setConfirming(null)}>Cancelar</Button></span></div>
    :<span className="gp-cost-actions"><Button type="button" onClick={()=>setConfirming('all')}>Ativar todas as aptas ({apt.length})</Button><Button type="button" variant="outline" disabled={!chosen.length} onClick={()=>setConfirming('selected')}>Ativar selecionadas ({chosen.length})</Button></span>)}
   {!enabled&&<p className="gp-note">Adesões desligadas: somente análise.</p>}
   {participating.length>0&&<details className="gp-calc"><summary>Já participando ou programados ({participating.length})</summary><ul className="gp-family-rows">{participating.map(i=><li key={i.itemId}><span>{label(i.itemId)}</span><span>{i.price!==null?brl(i.price):'—'}</span><span className="gp-note">{i.status==='pending'?'programada':'participando'}</span></li>)}</ul></details>}
  </>}
 </div>;
}
