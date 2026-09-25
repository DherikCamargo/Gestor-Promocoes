'use client';
import {useCallback,useEffect,useMemo,useRef,useState,type ReactNode} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import type {CatalogRow} from '@/lib/ml-catalog';
import type {SaleFee,ActiveOffer} from '@/lib/listing-fees';
import {listingSearch} from '@/lib/listing-search';
import {listingCost,defaultProducts,type ListingCost} from '@/lib/product-costs';
import {OfferPanel,RulesPanel,FamilyActivation} from './offer-panel';
import {CampaignCards} from './campaign-cards';
type Snapshot={run:string;rows:CatalogRow[];done:boolean};
type Summary={itemId:string;title:string;listingType:string;familyId:string|null;currency:string;regularPrice:number|null;promotionPrice:number|null;currentPrice:number|null;variationPrices:boolean;freight:number|null;freeShipping:boolean|null;saleFee:SaleFee|null;promotion:ActiveOffer|null};
type Result={data?:Summary;error?:string};
type Listing={itemId:string;title:string;sku:string;variation:string;familyId:string|null;rows:CatalogRow[]};
type Group={key:string;familyId:string|null;title:string;items:Listing[]};
type SaleInfo={state:'promotion'|'regular';price:number;regularPrice:number}|{state:'unknown'};
type SaveCost=(key:string,cost:number|null)=>Promise<string|null>;
const money=(n:number,currency:string)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency}).format(n);
const shortList=(skus:string[])=>skus.length>3?skus.slice(0,2).join(', ')+' e mais '+(skus.length-2)+' SKUs':skus.join(', ');
const typeName=(t:string)=>t==='gold_special'?'Clássico':t==='gold_pro'?'Premium':t;
const Muted=({children}:{children:ReactNode})=><span className="gp-muted">{children}</span>;
const Note=({children}:{children:ReactNode})=><span className="gp-note">{children}</span>;
const Cell=({label,children}:{label:string;children:ReactNode})=><div className="gp-cell"><span className="gp-label">{label}</span>{children}</div>;

// Um grupo por família com mais de um MLB (preço por variação); demais anúncios ficam sozinhos.
function groupRows(rows:CatalogRow[]):Group[]{
 const byItem=new Map<string,CatalogRow[]>();
 for(const r of rows)byItem.set(r.itemId,[...(byItem.get(r.itemId)??[]),r]);
 const listings:Listing[]=[...byItem.values()].map(list=>({itemId:list[0].itemId,title:list[0].title,familyId:list[0].familyId??null,sku:shortList([...new Set(list.map(r=>r.sku).filter(Boolean))]),variation:list.length>1?list.length+' opções':list[0].variation,rows:list}));
 const families=new Map<string,Listing[]>();
 for(const l of listings)if(l.familyId)families.set(l.familyId,[...(families.get(l.familyId)??[]),l]);
 const seen=new Set<string>(),groups:Group[]=[];
 for(const l of listings){
  const family=l.familyId?families.get(l.familyId)??[]:[];
  if(family.length<2)groups.push({key:l.itemId,familyId:null,title:l.title,items:[l]});
  else if(!seen.has(l.familyId!)){seen.add(l.familyId!);groups.push({key:'f:'+l.familyId,familyId:l.familyId,title:l.title,items:family});}
 }
 return groups;
}

function Subsidy({offer:p,money:m}:{offer:ActiveOffer|null;money:(n:number)=>string}){
 if(!p)return <Muted>—</Muted>;
 if(p.status!=='identified')return <><Muted>Não confirmado</Muted><Note>{p.reason}</Note></>;
 const pct=p.meliPercentage!==null?p.meliPercentage.toLocaleString('pt-BR')+'% do preço normal':null;
 const boost=p.feeDiscount>0?m(p.feeDiscount)+' de desconto na tarifa':null;
 if(p.mlSubsidy)return <>{m(p.mlSubsidy)}<Note>{pct}{boost&&<><br/>+ {boost}</>}</Note></>;
 if(p.mlSubsidy===null)return <><Muted>{pct?'ML cobre '+pct:'Não informado'}</Muted><Note>Preço normal da oferta não informado</Note>{boost&&<Note>+ {boost}</Note>}</>;
 return boost?<>{m(p.feeDiscount)}<Note>desconto na tarifa</Note></>:<Muted>Sem subsídio</Muted>;
}

// Custo do produto, editável na própria linha; o valor salvo vale para todos os anúncios do produto.
function CostCell({cost,save}:{cost?:ListingCost;save:SaveCost}){
 const [editing,setEditing]=useState(false),[value,setValue]=useState(''),[error,setError]=useState(''),[saving,setSaving]=useState(false);
 const brl=(n:number)=>money(n,'BRL');
 if(!cost)return <Cell label="Custo"><Muted>—</Muted></Cell>;
 if(cost.state==='mixed')return <Cell label="Custo"><Muted>Varia por opção</Muted></Cell>;
 const key=cost.editKey,product=key?defaultProducts[key]:undefined;
 async function submit(next:number|null){
  setSaving(true);const failure=await save(key!,next);setSaving(false);
  if(failure)setError(failure);else{setEditing(false);setError('')}
 }
 if(editing&&key)return <Cell label="Custo"><form className="gp-cost-form" onSubmit={e=>{e.preventDefault();const n=Number(value.trim().replace(',','.'));if(!value.trim()||!Number.isFinite(n)||n<0||Math.abs(n*100-Math.round(n*100))>1e-6){setError('Informe um valor como 42 ou 42,50.');return}void submit(n)}}>
  <Input aria-label="Novo custo em reais" inputMode="decimal" value={value} autoFocus onChange={e=>{setValue(e.target.value);setError('')}}/>
  <span className="gp-cost-actions"><Button size="sm" type="submit" disabled={saving}>{saving?'Salvando…':'Salvar'}</Button><Button size="sm" variant="ghost" type="button" onClick={()=>{setEditing(false);setError('')}}>Cancelar</Button></span>
  {error&&<span className="gp-note gp-danger" role="alert">{error}</span>}
  <Note>{product?'Vale para todos os anúncios de '+product.name+'.':'Vale para todos os anúncios com este SKU.'}</Note>
  {cost.state==='ok'&&cost.edited&&product&&<Button size="sm" variant="ghost" type="button" disabled={saving} onClick={()=>void submit(null)}>Voltar ao padrão ({brl(product.cost)})</Button>}
 </form></Cell>;
 const edit=key&&<Button size="sm" variant="ghost" type="button" className="gp-cost-edit" onClick={()=>{setValue(cost.state==='ok'?String(cost.cost).replace('.',','):'');setEditing(true)}}>{cost.state==='ok'?'Editar':'Informar custo'}</Button>;
 if(cost.state==='missing')return <Cell label="Custo"><span className="gp-danger">Sem custo</span><Note>{cost.reason}</Note>{edit}</Cell>;
 return <Cell label="Custo">{brl(cost.cost)}<Note>{cost.label}{cost.edited?' · editado':''}</Note>{edit||<Note>Edite o custo da peça para alterar o kit.</Note>}</Cell>;
}

function Values({result,retry}:{result?:Result;retry:()=>void}){
 if(result?.error)return <div className="gp-error" role="alert"><span>{result.error}</span><Button variant="outline" size="sm" onClick={retry}>Tentar de novo</Button></div>;
 const d=result?.data;
 if(!d)return <div className="gp-error gp-muted" role="status">Consultando preços, tarifa e frete…</div>;
 const m=(n:number)=>money(n,d.currency),p=d.promotion;
 return <>
  <Cell label="Preço normal">{d.regularPrice!==null?m(d.regularPrice):<Muted>{d.variationPrices?'Varia por opção':'Não informado'}</Muted>}</Cell>
  <Cell label="Na promoção">{d.promotionPrice!==null?<>{m(d.promotionPrice)}{p?.status==='identified'&&p.name&&<Note>{p.name}</Note>}</>:<Muted>{d.currentPrice!==null?'Sem promoção':'Não informado'}</Muted>}</Cell>
  <Cell label="Tarifa ML">{d.saleFee?<>{m(d.saleFee.amount)}{d.saleFee.percentage!==null&&<Note>{d.saleFee.percentage.toLocaleString('pt-BR')}%{d.saleFee.fixed?' + '+m(d.saleFee.fixed)+' fixo':''}</Note>}</>:<Muted>Não informado</Muted>}</Cell>
  <Cell label="Subsídio por conta do Mercado Livre"><Subsidy offer={p} money={m}/></Cell>
  <Cell label="Frete">{d.freight!==null?<>{m(d.freight)}<Note>{d.freeShipping?'Grátis ao comprador · estimativa ML':'Estimativa do ML'}</Note></>:<Muted>Não informado</Muted>}</Cell>
 </>;
}

function Row({listing,result,request,retry,paused,child,costs,save,version}:{listing:Listing;result?:Result;request:(id:string)=>void;retry:(id:string)=>void;paused:boolean;child?:boolean;costs:Record<string,ListingCost>;save:SaveCost;version:number}){
 const element=useRef<HTMLDivElement|null>(null),[offersOpen,setOffersOpen]=useState(false);
 // Consulta só quando a linha se aproxima da área visível; nada é carregado em massa ao abrir.
 useEffect(()=>{
  if(result||paused||!element.current)return;
  if(!('IntersectionObserver' in window)){request(listing.itemId);return}
  const observer=new IntersectionObserver(records=>{if(records.some(r=>r.isIntersecting)){observer.disconnect();request(listing.itemId)}},{rootMargin:'240px'});
  observer.observe(element.current);
  return()=>observer.disconnect();
 },[listing.itemId,result,request,paused]);
 const d=result?.data;
 return <div className={'gp-row'+(child?' gp-child':'')} ref={element}>
  <div className="gp-title"><strong>{child?listing.variation||listing.title:d?.title??listing.title}</strong><span className="gp-note">{[listing.itemId,d&&typeName(d.listingType),listing.sku].filter(Boolean).join(' · ')}</span><Button size="sm" variant="outline" type="button" className="gp-offers-toggle" aria-expanded={offersOpen} onClick={()=>setOffersOpen(o=>!o)}>{offersOpen?'Ocultar promoções':'Promoções'}</Button></div>
  <Values result={result} retry={()=>retry(listing.itemId)}/>
  <CostCell cost={costs[listing.itemId]} save={save}/>
  {offersOpen&&<div className="gp-panel-wrap"><OfferPanel itemId={listing.itemId} version={version}/></div>}
 </div>;
}

function FamilyGroup({group,results,open,toggle,familyCost,...rowProps}:{group:Group;results:Record<string,Result>;open:boolean;toggle:()=>void;familyCost:ListingCost;request:(id:string)=>void;retry:(id:string)=>void;paused:boolean;costs:Record<string,ListingCost>;save:SaveCost;version:number}){
 const loaded=group.items.map(i=>results[i.itemId]?.data).filter((d):d is Summary=>!!d);
 const [activationOpen,setActivationOpen]=useState(false);
 const familyItems=useMemo(()=>group.items.map(l=>({itemId:l.itemId,label:(l.variation||l.title)+' · '+l.itemId})),[group.items]);
 const range=(values:(number|null)[])=>{const v=values.filter((n):n is number=>n!==null);if(!v.length||!loaded.length)return <Muted>Por opção</Muted>;const lo=Math.min(...v),hi=Math.max(...v),c=loaded[0].currency;return lo===hi?money(lo,c):money(lo,c)+' – '+money(hi,c)};
 return <>
  <div className="gp-row gp-family">
   <div className="gp-title"><button type="button" className="gp-toggle" aria-expanded={open} onClick={toggle}><span aria-hidden="true">{open?'▾':'▸'}</span> <strong>{group.title}</strong></button><span><span className="gp-badge">Preço por variação</span> <span className="gp-note">Família {group.familyId} · {group.items.length} anúncios</span></span><Button size="sm" variant="outline" type="button" className="gp-family-toggle" aria-expanded={activationOpen} onClick={()=>setActivationOpen(o=>!o)}>{activationOpen?'Ocultar promoções da família':'Promoções da família'}</Button></div>
   {loaded.length?<><Cell label="Preço normal">{range(loaded.map(d=>d.regularPrice))}</Cell><Cell label="Na promoção">{range(loaded.map(d=>d.promotionPrice))}</Cell><Cell label="Tarifa ML"><Muted>Por opção</Muted></Cell><Cell label="Subsídio por conta do Mercado Livre"><Muted>Por opção</Muted></Cell><Cell label="Frete"><Muted>Por opção</Muted></Cell></>
    :<div className="gp-error gp-muted">Abra para consultar cada opção.</div>}
   <CostCell cost={familyCost} save={rowProps.save}/>
   {activationOpen&&<div className="gp-panel-wrap"><FamilyActivation items={familyItems} version={rowProps.version}/></div>}
  </div>
  {open&&group.items.map(l=><Row key={l.itemId} listing={l} result={results[l.itemId]} child {...rowProps}/>)}
 </>;
}

export default function SimpleCatalog(){
 const [snapshot,setSnapshot]=useState<Snapshot|null>(null),[query,setQuery]=useState(''),[filter,setFilter]=useState('');
 const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[message,setMessage]=useState('');
 const [results,setResults]=useState<Record<string,Result>>({}),[opened,setOpened]=useState<Set<string>>(new Set());
 const [tab,setTab]=useState<'all'|'regular'>('all'),[sales,setSales]=useState<Record<string,SaleInfo>>({}),[saleScan,setSaleScan]=useState<{done:number;total:number;error?:string}|null>(null);
 const [overrides,setOverrides]=useState<Record<string,number>>({}),[costNotice,setCostNotice]=useState(''),[version,setVersion]=useState(0);
 const alive=useRef(true),lock=useRef(false),queue=useRef<Promise<unknown>>(Promise.resolve()),requested=useRef(new Set<string>()),generation=useRef(0);
 useEffect(()=>{alive.current=true;fetch('/api/mercado-livre/anuncios',{cache:'no-store'}).then(async r=>{const d=await r.json() as Snapshot&{error?:string}|null;if(!r.ok)throw Error(d?.error||'Não foi possível carregar os anúncios.');if(alive.current)setSnapshot(d)}).catch(e=>{if(alive.current)setMessage(e instanceof Error?e.message:'Não foi possível carregar os anúncios.')}).finally(()=>{if(alive.current)setLoading(false)});return()=>{alive.current=false}},[]);
 useEffect(()=>{fetch('/api/mercado-livre/custos',{cache:'no-store'}).then(async r=>{const d=await r.json() as {overrides?:Record<string,number>;error?:string};if(!r.ok)throw Error(d.error||'Custos editados indisponíveis. Mostrando custos padrão.');if(alive.current)setOverrides(d.overrides??{})}).catch(e=>{if(alive.current)setCostNotice(e instanceof Error?e.message:'Custos editados indisponíveis. Mostrando custos padrão.')})},[]);
 const save=useCallback<SaveCost>(async(key,cost)=>{
  try{const r=await fetch('/api/mercado-livre/custos',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key,cost})});const d=await r.json() as {overrides?:Record<string,number>;error?:string};if(!r.ok||!d.overrides)return d.error||'Não foi possível salvar o custo.';if(alive.current){setOverrides(d.overrides);setCostNotice('');setVersion(v=>v+1)}return null}
  catch{return 'Não foi possível salvar o custo. Verifique a conexão.'}
 },[]);
 // Fila sequencial: uma consulta por vez evita renovações de token concorrentes.
 const request=useCallback((id:string)=>{
  if(busy||requested.current.has(id))return;
  requested.current.add(id);const gen=generation.current;
  queue.current=queue.current.then(async()=>{
   if(!alive.current||gen!==generation.current||!requested.current.has(id))return;
   let result:Result;
   try{const r=await fetch('/api/mercado-livre/anuncios/resumo?itemId='+id,{cache:'no-store'});const d=await r.json() as Summary&{error?:string};result=r.ok?{data:d}:{error:d.error||'Consulta indisponível.'}}
   catch{result={error:'Consulta indisponível. Verifique a conexão e tente de novo.'}}
   if(alive.current&&gen===generation.current&&requested.current.has(id))setResults(s=>({...s,[id]:result}));
  });
 },[busy]);
 const retry=useCallback((id:string)=>{requested.current.delete(id);setResults(s=>{const next={...s};delete next[id];return next})},[]);
 const groups=useMemo(()=>groupRows(snapshot?.rows??[]),[snapshot]);
 const costs=useMemo(()=>Object.fromEntries(groups.flatMap(g=>g.items).map(i=>[i.itemId,listingCost(i.rows,overrides)])),[groups,overrides]);
 // Todos os anúncios importados, um por MLB (variações de família com o nome da opção).
 const boardItems=useMemo(()=>groups.flatMap(g=>g.items.map(l=>({itemId:l.itemId,label:(g.familyId&&l.variation?l.title+' — '+l.variation:l.title)+' · '+l.itemId}))),[groups]);
 const labels=useMemo(()=>Object.fromEntries(boardItems.map(b=>[b.itemId,b.label])),[boardItems]);
 const familyCosts=useMemo(()=>Object.fromEntries(groups.filter(g=>g.familyId).map(g=>[g.key,listingCost(g.items.flatMap(i=>i.rows),overrides)])),[groups,overrides]);
 const search=useMemo(()=>filter.trim()?listingSearch(filter,snapshot?.rows??[]):null,[filter,snapshot]);
 const visible=useMemo(()=>{
  const ids=search?new Set(search.entries.map(e=>e.itemId)):null,known=new Set(groups.flatMap(g=>g.items.map(i=>i.itemId)));
  // MLB completo fora do catálogo importado continua consultável diretamente.
  const direct:Group[]=(search?.entries??[]).filter(e=>!known.has(e.itemId)).map(e=>({key:e.itemId,familyId:null,title:e.title,items:[{itemId:e.itemId,title:e.title,sku:'',variation:'',familyId:null,rows:[]}]}));
  const list=[...direct,...groups.filter(g=>!ids||g.items.some(i=>ids.has(i.itemId)))];
  if(tab==='all')return list;
  // Aba "Sem promoção": só anúncios no preço normal; cada variação de família em linha própria.
  return list.flatMap(g=>g.items.filter(i=>sales[i.itemId]?.state==='regular').map(i=>({key:i.itemId,familyId:null,title:i.title,items:[{...i,familyId:null}]})));
 },[groups,search,tab,sales]);
 // Consulta o preço de venda de todos os anúncios, 20 por pedido, para montar a aba "Sem promoção".
 async function scanSales(){
  const ids=groups.flatMap(g=>g.items.map(i=>i.itemId));
  setSales({});setSaleScan({done:0,total:ids.length});
  for(let i=0;i<ids.length;i+=20){
   const batch=ids.slice(i,i+20);
   try{const r=await fetch('/api/mercado-livre/anuncios/sem-promocao?ids='+batch.join(','),{cache:'no-store'});const d=await r.json() as {results?:Record<string,SaleInfo>;error?:string};
    if(!r.ok||!d.results){if(alive.current)setSaleScan({done:i,total:ids.length,error:d.error||'Consulta de preços indisponível.'});return}
    if(!alive.current)return;
    setSales(s=>({...s,...d.results}));setSaleScan({done:Math.min(i+20,ids.length),total:ids.length});
   }catch{if(alive.current)setSaleScan({done:i,total:ids.length,error:'Sem resposta do servidor.'});return}
  }
 }
 const openTab=(t:'all'|'regular')=>{setTab(t);if(t==='regular'&&!saleScan)void scanSales()};
 const regularCount=Object.values(sales).filter(x=>x.state==='regular').length;
 async function sync(){
  if(lock.current)return;lock.current=true;setBusy(true);setMessage('Atualizando anúncios…');let current=snapshot;
  try{let action='start';do{const r=await fetch('/api/mercado-livre/anuncios',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,run:current?.run})});const d=await r.json() as Snapshot&{error?:string};if(!r.ok)throw Error(d.error||'Não foi possível atualizar.');current=d;action='next';if(alive.current)setSnapshot(d);}while(current&&!current.done&&alive.current);
   if(alive.current){generation.current++;requested.current.clear();setResults({});setMessage('Anúncios atualizados.');setFilter('');setQuery('');}
  }catch(e){if(alive.current)setMessage(e instanceof Error?e.message:'Não foi possível atualizar.')}
  finally{if(alive.current)setBusy(false);lock.current=false;}
 }
 const toggle=(key:string)=>setOpened(s=>{const next=new Set(s);if(!next.delete(key))next.add(key);return next});
 const rowProps={request,retry,paused:busy,costs,save,version};
 return <section className="panel simple-catalog"><div className="catalog-heading"><h1>Anúncios</h1><Button variant="outline" disabled={busy||loading} onClick={sync}>{busy?'Atualizando…':'Atualizar anúncios'}</Button></div>
 <h2 className="gp-board-title">Promoções do Mercado Livre</h2>
 {boardItems.length>0&&<CampaignCards labels={labels}/>}
 <div className="gp-tabs" role="tablist">
  <button type="button" role="tab" aria-selected={tab==='all'} className="gp-tab" onClick={()=>openTab('all')}>Todos os anúncios</button>
  <button type="button" role="tab" aria-selected={tab==='regular'} className="gp-tab" onClick={()=>openTab('regular')}>Sem promoção{saleScan?` (${regularCount})`:''}</button>
 </div>
 {tab==='regular'&&saleScan&&<p className="gp-note" role="status">{saleScan.error?<span className="gp-danger">{saleScan.error} </span>:null}{saleScan.done<saleScan.total&&!saleScan.error?`Consultando preços… ${saleScan.done} de ${saleScan.total}. `:''}Anúncios vendendo no preço normal, sem promoção ativa.{Object.values(sales).some(x=>x.state==='unknown')?` ${Object.values(sales).filter(x=>x.state==='unknown').length} sem preço informado ficaram de fora.`:''} <Button size="sm" variant="ghost" type="button" disabled={!!saleScan&&saleScan.done<saleScan.total&&!saleScan.error} onClick={()=>void scanSales()}>Consultar de novo</Button></p>}
 <form className="simple-search" onSubmit={e=>{e.preventDefault();setFilter(query.trim());setMessage('')}}><label htmlFor="listing-search">Filtrar por anúncio, MLB ou SKU<Input id="listing-search" placeholder="Todos os anúncios · digite para filtrar" value={query} onChange={e=>{setQuery(e.target.value);if(!e.target.value.trim()){setFilter('');setMessage('')}}}/></label><Button type="submit">Buscar</Button>{filter&&<Button variant="outline" onClick={()=>{setQuery('');setFilter('');setMessage('')}} type="button">Ver todos</Button>}</form>
 {message&&<p role="status">{message}</p>}
 {costNotice&&<p role="status" className="gp-danger">{costNotice}</p>}
 <RulesPanel onSaved={()=>setVersion(v=>v+1)}/>
 {search?.message&&<p role="status">{search.message}</p>}
 {loading&&<p role="status">Carregando anúncios…</p>}
 {!loading&&!snapshot?.done&&snapshot&&<p className="small">Importação parcial. Atualize os anúncios para completar a lista.</p>}
 {!loading&&!busy&&snapshot&&snapshot.rows.length>0&&!snapshot.rows.some(r=>'familyId' in r)&&<p className="gp-note">Para agrupar anúncios com preço por variação, clique em Atualizar anúncios uma vez: importações anteriores não guardaram a família.</p>}
 {visible.length>0&&<div className="gp-table">
  <div className="gp-row gp-head" aria-hidden="true"><span>Anúncio</span><span>Preço normal</span><span>Na promoção</span><span>Tarifa ML</span><span>Subsídio do Mercado Livre</span><span>Frete</span><span>Custo</span></div>
  {visible.map(g=>g.familyId?<FamilyGroup key={g.key} group={g} results={results} open={opened.has(g.key)||!!search} toggle={()=>toggle(g.key)} familyCost={familyCosts[g.key]} {...rowProps}/>:<Row key={g.key} listing={g.items[0]} result={results[g.items[0].itemId]} {...rowProps}/>)}
 </div>}
 {!loading&&!busy&&!search?.message&&!visible.length&&<p>{tab==='regular'?(saleScan&&saleScan.done<saleScan.total&&!saleScan.error?'Consultando…':'Nenhum anúncio sem promoção encontrado.'):filter?'Nenhum anúncio encontrado.':'Nenhum anúncio importado. Clique em Atualizar anúncios para carregar sua lista.'}</p>}
 </section>;
}
