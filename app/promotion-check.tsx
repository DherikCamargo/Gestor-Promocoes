'use client';
import {useRef,useState} from 'react';
import {Button} from '@/components/ui/button';
type Evidence=Record<string,unknown>;
const money=(n:unknown)=>typeof n==='number'&&Number.isFinite(n)?n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}):'Não informado';
function EvidenceSummary({report}:{report:Evidence}){
 const item=(report.item??{}) as Evidence,sale=(report.salePrice??{}) as Evidence;
 const variants=(item.variations??[]) as Evidence[],offers=(report.offers??[]) as Evidence[];
 return <section style={{overflowWrap:'anywhere'}}>
  <h4>{String(item.title??report.itemId)}</h4>
  <p>Anúncio: {String(item.id??report.itemId)} · SKU: {String(item.sku??'Não informado')}</p>
  <p>Produto do vendedor: {String(item.user_product_id??'Não informado')} · Família: {String(item.family_id??'Não informada')}</p>
  <p>Preço do anúncio: <strong>{money(item.price)}</strong> · Preço de venda consultado: <strong>{money(sale.amount)}</strong></p>
  <p>{sale.ok?'Preço de venda no contexto geral do marketplace; cupons e condições do comprador podem exigir outra conferência.':String(sale.error??'Preço de venda não confirmado.')}</p>
  <p>{String(item.scope??'')}</p>
  {variants.length>0?<><h4>Variações retornadas ({variants.length})</h4>{variants.map((v,i)=><article key={String(v.id??i)} style={{borderTop:'1px solid #d6e0f0',padding:'12px 0'}}>
   <strong>SKU: {String(v.sku??'Não informado')}</strong>
   <p>Variação: {String(v.id??'Não informada')} · Produto: {String(v.user_product_id??'Não informado')}</p>
   <p>{((v.attribute_combinations??[]) as Evidence[]).map(a=>a.value_name).filter(Boolean).join(' · ')}</p>
   <p>Preço próprio: {money(v.price)} · Custo sugerido: {money(v.cost)}</p>
  </article>)}</>:<p>Nenhuma variação interna retornada. Isso não confirma a ausência de outros anúncios na mesma família.</p>}
  <h4>Propostas e promoções retornadas</h4>
  {offers.map((o,i)=><article key={i} style={{borderTop:'1px solid #d6e0f0',padding:'12px 0'}}>
   <strong>{String(o.name||o.type)}</strong>
   <p>{String(o.id??'Sem código de campanha')} · {String(o.status??'Sem situação')} · {String(o.ref_id??o.offer_id??'Sem código de proposta')}</p>
   <p>Preço retornado: {money(o.price)} · Sugerido: {money(o.suggested_discounted_price)}</p>
   <p>Mínimo: {money(o.min_discounted_price)} · Máximo: {money(o.max_discounted_price)}</p>
   {(o.issues as string[]??[]).map(issue=><p key={issue} role="alert" style={{color:'#b42318'}}>Não confirmado: {issue}</p>)}
  </article>)}
 </section>;
}
type Member={itemId:string;status:'pending'|'ok'|'failed';report?:Evidence;error?:string};
type Family={familyId?:string;productIds?:string[];itemIds?:string[];complete?:boolean;warnings?:string[];source?:string;queriedAt?:string};
export default function PromotionCheck(){
 const [itemId,setItemId]=useState('MLB7000972334'),[busy,setBusy]=useState(false),[error,setError]=useState(''),[report,setReport]=useState<Evidence|null>(null);
 const [family,setFamily]=useState<Family|null>(null),[members,setMembers]=useState<Member[]>([]),[progress,setProgress]=useState(''),[filter,setFilter]=useState('');
 const controller=useRef<AbortController|null>(null);
 async function request(path:string,params:Record<string,string>,signal:AbortSignal){
  const r=await fetch('/api/mercado-livre/promocoes/'+path+'?'+new URLSearchParams(params),{cache:'no-store',signal});
  const d=await r.json();if(!r.ok)throw Error(d.error??'Falha na consulta.');return d;
 }
 async function consultLightning(){
  const ctrl=new AbortController();controller.current=ctrl;
  setBusy(true);setError('');setReport(null);setFamily(null);setMembers([]);setProgress('Comparando as fontes da proposta relâmpago…');
  try{
   const d=await request('conferencia',{itemId:itemId.trim().toUpperCase(),details:'lightning'},ctrl.signal);setReport(d);
   setProgress('Consulta das fontes encerrada. Nenhum preço ou promoção foi alterado.');
  }catch(e){setError(ctrl.signal.aborted?'Consulta interrompida.':e instanceof Error?e.message:'Falha na consulta.');setProgress('')}
  finally{setBusy(false);controller.current=null;}
 }
 async function consult(){
  const ctrl=new AbortController();controller.current=ctrl;
  setBusy(true);setError('');setReport(null);setFamily(null);setMembers([]);setFilter('');setProgress('Consultando o anúncio inicial…');
  try{
   const id=itemId.trim().toUpperCase();
   const seed=await request('conferencia',{itemId:id},ctrl.signal);setReport(seed);
   setProgress('Localizando os anúncios da mesma família…');
   const f:Family=await request('familia',{itemId:id},ctrl.signal);setFamily(f);
   if(!Array.isArray(f.itemIds)||!f.familyId||!Array.isArray(f.productIds))throw Error('A lista de anúncios da família não pôde ser confirmada.');
   const result:Member[]=f.itemIds.map(itemId=>({itemId,status:'pending'}));
   setMembers([...result]);
   for(let i=0;i<result.length;i++){
    if(ctrl.signal.aborted)throw new DOMException('Interrompido','AbortError');
    setProgress('Conferindo anúncio '+(i+1)+' de '+result.length+'…');
    const row=result[i];
    try{
     // Query even the seed again with the expected family to detect migration.
     const d=await request('conferencia',{itemId:row.itemId,familyId:f.familyId},ctrl.signal);
     const evidence=d.item as Evidence;
     if(String(evidence.family_id)!==f.familyId||!f.productIds.includes(String(evidence.user_product_id)))throw Error('Identidade do produto divergente: dados não associados à família.');
     result[i]={...row,status:'ok',report:d};
    }catch(e){
     if(ctrl.signal.aborted)throw e;
     result[i]={...row,status:'failed',error:e instanceof Error?e.message:'Falha na consulta.'};
    }
    setMembers([...result]);
   }
   setProgress('Conferência encerrada. '+result.filter(r=>r.status==='ok').length+' de '+result.length+' anúncios consultados.');
  }catch(e){
   setError(controller.current?.signal.aborted?'Consulta interrompida. Os resultados já obtidos estão disponíveis; a conferência está incompleta.':e instanceof Error?e.message:'Falha na consulta.');
   setProgress('');
  }finally{setBusy(false);controller.current=null;}
 }
 function download(){
  if(!report)return;
  const output={...report,schemaVersion:3,family:family??{complete:false,warnings:['Família não consultada.']},familyMembers:members,
   familyEvidenceComplete:family?.complete===true&&members.length>0&&members.every(m=>m.status==='ok'&&(m.report?.salePrice as Evidence)?.ok===true),
   exportStatus:busy?'in_progress':error?'partial':'finished',exportedAt:new Date().toISOString()};
  const url=URL.createObjectURL(new Blob([JSON.stringify(output,null,2)],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download=(report.lightning?'conferencia-relampago-':'conferencia-familia-')+report.itemId+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 const found=members.filter(m=>m.status==='ok');
 const shown=members.filter(m=>JSON.stringify(m.report?.item??{id:m.itemId}).toLocaleLowerCase('pt-BR').includes(filter.trim().toLocaleLowerCase('pt-BR')));
 return <div className="panel">
  <h3>Conferir anúncio, família e ofertas</h3>
  <p>Consulta cada anúncio da família separadamente, com seu SKU, preço e propostas. Nenhuma promoção será alterada.</p>
  <label htmlFor="check-item">Código do anúncio</label>
  <input id="check-item" value={itemId} onChange={e=>{setItemId(e.target.value);setReport(null);setFamily(null);setMembers([]);setError('');setProgress('')}} placeholder="MLB7000972334" disabled={busy}/>
  <Button variant="outline" onClick={consultLightning} disabled={busy}>Conferir proposta relâmpago</Button>\n  <Button onClick={consult} disabled={busy}>{busy?'Consultando…':'Conferir anúncio e família'}</Button>
  {busy&&<Button variant="outline" onClick={()=>controller.current?.abort()}>Interromper consulta</Button>}
  <p role="status" aria-live="polite">{progress}</p>
  {error&&<p role="alert">{error}</p>}
  {report&&<>
   {Boolean(report.lightning)&&<section style={{overflowWrap:'anywhere'}}>
    <h4>Comparação da proposta relâmpago</h4>
    <p>Valores consultados separadamente. Nenhum deles foi escolhido automaticamente para adesão.</p>
    {Boolean((report.lightning as Evidence).error)&&<p role="alert">{String((report.lightning as Evidence).error)}</p>}
    <p>Consulta geral do anúncio: <strong>{money(((report.lightning as Evidence).itemSource as Evidence)?.price)}</strong></p>
    {((((report.lightning as Evidence).campaignSource as Evidence)?.rows??[]) as Evidence[]).map((row,i)=><p key={i}>Consulta específica da campanha: <strong>{money(row.price)}</strong> · Sugestão: {money(row.suggested_discounted_price)}</p>)}
    <p>{((report.lightning as Evidence).candidateSource as Evidence)?.identityConfirmed?'Identidade do candidato confirmada.':'Identidade do candidato ainda não confirmada.'}</p>
    <p>{((report.lightning as Evidence).campaignSource as Evidence)?.unique?'Uma proposta encontrada na consulta específica.':'Não foi possível confirmar uma proposta única na consulta específica.'}</p>
    <details><summary>Ver evidências completas</summary><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{JSON.stringify(report.lightning,null,2)}</pre></details>
   </section>}
   <details><summary>Ver anúncio inicial: {String(report.itemId)}</summary><EvidenceSummary report={report}/></details>
   {family&&<>
    <h4>Família {family.familyId}</h4>
    <p>{found.length} de {members.length} anúncios consultados · {family.productIds?.length??0} produtos identificados</p>
    {family.warnings?.map(w=><p role="alert" key={w}>{w}</p>)}
    {(!family.complete||members.some(m=>m.status!=='ok'||(m.report?.salePrice as Evidence)?.ok!==true))&&<p>Conferência incompleta: há anúncios ou preços ainda não confirmados.</p>}
    <label htmlFor="family-filter">Buscar nesta família por SKU, cor, tamanho, MLB ou MLBU</label>
    <input id="family-filter" value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Ex.: CONJUNTO-PRETO-M ou MLBU2903570693"/>
    {shown.length===0&&<p>Nenhum resultado nesta consulta.</p>}
    {shown.map(m=>{
     const item=(m.report?.item??{}) as Evidence,sale=(m.report?.salePrice??{}) as Evidence,attrs=(item.attributes??[]) as Evidence[];
     const variant=attrs.filter(a=>['COLOR','SIZE'].includes(String(a.id))).map(a=>a.value_name).filter(Boolean).join(' · ');
     return <article key={m.itemId} style={{borderTop:'1px solid #d6e0f0',padding:'16px 0',overflowWrap:'anywhere'}}>
      <strong>{String(item.sku??m.itemId)}</strong><p>{variant}</p>
      <p>{m.itemId} · {String(item.user_product_id??'Produto não confirmado')} · {String(item.listing_type_id??'')}</p>
      {m.status==='ok'?<>
       <p>Preço de venda: <strong>{money(sale.amount)}</strong> · Preço do anúncio: {money(item.price)} · Custo sugerido: {money(item.cost)}</p>
       <details><summary>Ver propostas e dados deste anúncio</summary><EvidenceSummary report={m.report!}/></details>
      </>:<p>{m.status==='pending'?'Aguardando consulta.':m.error}</p>}
     </article>;
    })}
   </>}
   <Button onClick={download}>{report.lightning?'Baixar conferência da proposta':'Baixar conferência da família'}</Button>
  </>}
 </div>;
}
