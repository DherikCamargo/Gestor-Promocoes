'use client';
import {useRef,useState} from 'react';
import {Button} from '@/components/ui/button';
import {classifyListing,type ListingClass} from '@/lib/promotion-board';
import {activate,outcomeText,outcomeTone,brl,pct,typeNames,type Outcome} from './offer-panel';
type BoardItem={itemId:string;label:string};
const fmt=(t:number|null)=>t===null?null:new Date(t).toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo',day:'2-digit',month:'2-digit'});
const period=(p:{start:number|null;finish:number|null})=>p.start===null&&p.finish===null?'sem datas informadas':`${fmt(p.start)??'?'} a ${fmt(p.finish)??'sem fim informado'}`;
const inDays=(d:number)=>d===0?'hoje':d===1?'amanhã':`em ${d} dias`;
type Entry={item:BoardItem;cls?:ListingClass;error?:string};
type Report={offers:Parameters<typeof classifyListing>[0];participationEnabled:boolean;error?:string};

// Painel de promoções: analisa todos os anúncios (duas consultas por vez), lista as promoções aptas
// dos anúncios sem promoção para ativação em lote e mostra os anúncios sem promoção com o motivo.
// Anúncios já em promoção ficam fora do lote para não trocar a promoção atual.
export function PromotionsBoard({items}:{items:BoardItem[]}){
 const [entries,setEntries]=useState<Record<string,Entry>>({}),[scan,setScan]=useState<{running:boolean;done:number;total:number}|null>(null);
 const [enabled,setEnabled]=useState(false),[selected,setSelected]=useState<Record<string,string>>({}),[outcomes,setOutcomes]=useState<Record<string,Outcome>>({});
 const [confirming,setConfirming]=useState(false),[running,setRunning]=useState(false),[progress,setProgress]=useState(0);
 const stop=useRef(false);
 async function analyze(){
  stop.current=false;setEntries({});setSelected({});setOutcomes({});setConfirming(false);
  const queue=[...items],total=items.length;let done=0,allEnabled=true;
  setScan({running:true,done,total});
  const worker=async()=>{
   while(queue.length&&!stop.current){
    const it=queue.shift()!;let entry:Entry;
    try{
     const r=await fetch('/api/mercado-livre/promocoes/analise?itemId='+it.itemId,{cache:'no-store'});const d=await r.json() as Report;
     if(!r.ok)entry={item:it,error:d.error||'Análise indisponível.'};
     else{allEnabled&&=d.participationEnabled;entry={item:it,cls:classifyListing(d.offers)}}
    }catch{entry={item:it,error:'Sem resposta do servidor.'}}
    done++;
    setEntries(s=>({...s,[it.itemId]:entry}));
    const cls=entry.cls;
    // Pré-seleciona a oferta de maior margem de cada anúncio sem promoção.
    if(cls?.status==='available')setSelected(s=>({...s,[it.itemId]:cls.apt[0].refId}));
    setScan({running:true,done,total});
   }
  };
  await Promise.all([worker(),worker()]);
  setEnabled(allEnabled);setScan({running:false,done,total});
 }
 async function run(){
  setConfirming(false);setRunning(true);setProgress(0);
  const list=Object.entries(selected);
  for(const [i,[itemId,refId]] of list.entries()){
   const o=await activate(itemId,refId);
   setOutcomes(s=>({...s,[itemId]:o}));setProgress(i+1);
  }
  setRunning(false);
 }
 const all=Object.values(entries),available=all.filter(e=>e.cls?.status==='available'),none=all.filter(e=>e.cls?.status==='none');
 const active=all.filter(e=>e.cls?.status==='active'),failed=all.filter(e=>e.error);
 // Em promoção, mas prestes a ficar sem: termina em até 3 dias sem continuação, ou só começa no futuro.
 const atRisk=active.filter(e=>(e.cls as Extract<ListingClass,{status:'active'}>).active.coverage.state!=='ok')
  .sort((a,b)=>{const u=(e:Entry)=>{const c=(e.cls as Extract<ListingClass,{status:'active'}>).active.coverage;return c.state==='ok'?Infinity:c.until??Infinity};return u(a)-u(b)});
 const pending=Object.keys(selected).filter(id=>!outcomes[id]);
 const toggle=(itemId:string,refId:string)=>setSelected(s=>{const n={...s};if(n[itemId]===refId)delete n[itemId];else n[itemId]=refId;return n});
 return <div className="gp-board">
  <p className="gp-note">Analisa as promoções de todos os {items.length} anúncios importados, duas consultas por vez. Pode levar alguns minutos; você pode parar a qualquer momento.</p>
  <div className="gp-cost-actions">
   {scan?.running?<Button type="button" variant="outline" onClick={()=>{stop.current=true}}>Parar ({scan.done} de {scan.total})</Button>
    :<Button type="button" disabled={running||!items.length} onClick={()=>void analyze()}>{scan?'Analisar de novo':'Analisar todos os anúncios'}</Button>}
  </div>
  {scan&&<>
   {scan.running&&<progress className="gp-progress" max={scan.total} value={scan.done} aria-label="Progresso da análise"/>}
   <div className="gp-metrics">
    <div className="gp-metric"><span>Analisados</span><strong>{scan.done} de {scan.total}</strong></div>
    <div className="gp-metric"><span>Sem promoção, com oferta apta</span><strong>{available.length}</strong></div>
    <div className="gp-metric"><span>Sem promoção, sem oferta apta</span><strong>{none.length}</strong></div>
    <div className="gp-metric"><span>Já em promoção</span><strong>{active.length}</strong></div>
    <div className="gp-metric"><span>Podem ficar sem promoção</span><strong className={atRisk.length?'gp-danger':''}>{atRisk.length}</strong></div>
   </div>

   {atRisk.length>0&&<>
    <h2 className="gp-board-title">Atenção: podem ficar sem promoção ({atRisk.length})</h2>
    <p className="gp-note">Promoção atual termina em até 3 dias sem outra programada logo depois, ou a única promoção só começa no futuro. As próximas opções são ofertas aptas que continuam depois do fim da atual.</p>
    <div className="gp-board-table">{atRisk.map(e=>{const a=(e.cls as Extract<ListingClass,{status:'active'}>).active,c=a.coverage;return <div key={e.item.itemId} className="gp-board-listing">
     <strong>{e.item.label}</strong>
     <p className="gp-verdict gp-warn">{c.state==='gap'?`${a.name} está programada e só começa ${fmt(c.until)} (${inDays(c.days)}): sem promoção até lá.`:c.state==='ending'?`${a.name} termina ${fmt(c.until)} (${inDays(c.days)}) e não há outra programada depois.`:''}</p>
     {a.next.length?<ul className="gp-family-rows">{a.next.map(n=><li key={n.refId}><span>Próxima opção: {n.name}</span><span>{period(n)}</span><span>{brl(n.price)} · margem {pct(n.margin)}</span></li>)}</ul>
      :<p className="gp-note">Nenhuma oferta apta que continue depois do fim da atual. Confira as ofertas na Central.</p>}
    </div>})}</div>
   </>}
   {failed.length>0&&<p className="gp-note gp-danger">Sem análise ({failed.length}): {failed.map(e=>e.item.label).join('; ')}.</p>}

   <h2 className="gp-board-title">Aptas para ativar ({available.length} anúncios)</h2>
   {!available.length?<p className="gp-note">{scan.running?'Procurando…':'Nenhum anúncio sem promoção tem oferta apta agora.'}</p>:<>
    <p className="gp-note">Uma promoção por anúncio; a de maior margem vem marcada. Só entram anúncios sem promoção ativa ou programada.</p>
    <div className="gp-cost-actions">
     <Button size="sm" variant="ghost" type="button" disabled={running} onClick={()=>setSelected(Object.fromEntries(available.filter(e=>!outcomes[e.item.itemId]).map(e=>[e.item.itemId,(e.cls as {apt:{refId:string}[]}).apt[0].refId])))}>Marcar todos</Button>
     <Button size="sm" variant="ghost" type="button" disabled={running} onClick={()=>setSelected({})}>Desmarcar todos</Button>
    </div>
    <div className="gp-board-table">
     {available.map(e=>{const cls=e.cls as Extract<ListingClass,{status:'available'}>,o=outcomes[e.item.itemId];return <div key={e.item.itemId} className="gp-board-listing">
      <strong>{e.item.label}</strong>
      {cls.apt.map(a=><label key={a.refId} className="gp-board-offer">
       <input type="checkbox" checked={selected[e.item.itemId]===a.refId} disabled={running||!!o} onChange={()=>toggle(e.item.itemId,a.refId)}/>
       <span>{a.name}<span className="gp-note">{typeNames[a.type??'']??a.type}</span></span>
       <span>{brl(a.price)}<span className="gp-note">{period(a)}</span></span><span>margem {pct(a.margin)}</span><span>lucro {brl(a.profit)}</span>
      </label>)}
      {o&&<p className={'gp-verdict '+outcomeTone(o)} role="status">{outcomeText(o)}</p>}
     </div>})}
    </div>
    {!enabled?<p className="gp-note">Adesões desligadas: somente análise.</p>
     :scan.running?<p className="gp-note">Aguarde a análise terminar para ativar.</p>
     :running?<p role="status">Ativando… {progress} de {Object.keys(selected).length}</p>
     :confirming?<div className="gp-confirm" role="alertdialog" aria-label="Confirmar ativação em lote"><p>Ativar <strong>{pending.length} promoç{pending.length>1?'ões':'ão'}</strong>, uma por anúncio? O preço de cada anúncio no Mercado Livre muda para o valor marcado. Cada uma é conferida de novo antes do envio.</p><span className="gp-cost-actions"><Button size="sm" type="button" onClick={()=>void run()}>Confirmar</Button><Button size="sm" variant="ghost" type="button" onClick={()=>setConfirming(false)}>Cancelar</Button></span></div>
     :<Button type="button" className="gp-activate" disabled={!pending.length} onClick={()=>setConfirming(true)}>Ativar selecionadas ({pending.length})</Button>}
   </>}

   {/* Os anúncios sem promoção com oferta apta já estão em "Aptas para ativar"; aqui só os que não têm nenhuma. */}
   <h2 className="gp-board-title">Sem promoção e sem oferta apta ({none.length})</h2>
   {!none.length?<p className="gp-note">{scan.running?'Procurando…':'Todo anúncio sem promoção tem pelo menos uma oferta apta (acima).'}</p>
    :<ul className="gp-family-rows">{none.map(e=><li key={e.item.itemId}><span>{e.item.label}</span><span className="gp-note">{(e.cls as Extract<ListingClass,{status:'none'}>).reason}</span></li>)}</ul>}

   {active.length>0&&<details className="gp-calc"><summary>Já em promoção ({active.length})</summary><ul className="gp-family-rows">{active.map(e=>{const a=(e.cls as Extract<ListingClass,{status:'active'}>).active;return <li key={e.item.itemId}><span>{e.item.label}</span><span>{a.name}<span className="gp-note">{period(a)}</span></span><span>{a.price!==null?brl(a.price):'—'}</span><span className="gp-note">{a.status==='pending'?'programada':'ativa'}{a.coverage.state==='ok'&&a.coverage.until!==null?` · coberto até ${fmt(a.coverage.until)}`:a.coverage.state==='ok'?' · sem fim informado':''}</span></li>})}</ul></details>}
  </>}
 </div>;
}
