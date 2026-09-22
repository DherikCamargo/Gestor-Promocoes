'use client';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import type {CatalogRow} from '@/lib/ml-catalog';
import {listingSearch} from '@/lib/listing-search';
type Snapshot={run:string;rows:CatalogRow[];done:boolean};
type Summary={itemId:string;title:string;listingType:string;currency:string;regularPrice:number|null;promotionPrice:number|null;currentPrice:number|null;variationPrices:boolean;freight:number|null;freeShipping:boolean|null};
type Entry={itemId:string;title:string;data?:Summary;error?:string};
type Loader=(id:string,active:()=>boolean)=>Promise<Summary|null>;
const money=(n:number,currency:string)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency}).format(n);
function Listing({item,load,paused}:{item:Entry;load:Loader;paused:boolean}){
 const [entry,setEntry]=useState<Entry>(item);
 const element=useRef<HTMLElement|null>(null);
 useEffect(()=>{
  if(paused)return;
  let active=true,requested=false;
  const request=()=>{if(requested)return;requested=true;void load(item.itemId,()=>active).then(data=>{if(active&&data)setEntry({...item,title:data.title,data})}).catch(e=>{if(active)setEntry({...item,error:e instanceof Error?e.message:'Consulta indisponível.'})})};
  if(!('IntersectionObserver' in window)){request();return()=>{active=false}}
  const observer=new IntersectionObserver(records=>{if(records.some(r=>r.isIntersecting)){observer.disconnect();request()}},{rootMargin:'240px'});
  if(element.current)observer.observe(element.current);
  return()=>{active=false;observer.disconnect()};
 },[item,load,paused]);
 return <article className="simple-listing" ref={element}><div><h2>{entry.title}</h2><p className="small">{entry.itemId}</p></div>
 {entry.data?<><div><span className="simple-label">Preço normal</span><strong>{entry.data.regularPrice===null?entry.data.variationPrices?'Varia por opção':'Não informado':money(entry.data.regularPrice,entry.data.currency)}</strong><span className="simple-label">Em promoção</span><strong className="sale-value">{entry.data.promotionPrice!==null?money(entry.data.promotionPrice,entry.data.currency):entry.data.currentPrice!==null?'Sem promoção informada':'Não informado'}</strong></div>
 <div><span className="simple-label">Tipo do anúncio</span><strong>{entry.data.listingType==='gold_special'?'Clássico':entry.data.listingType==='gold_pro'?'Premium':entry.data.listingType||'Não informado'}</strong></div>
 <div><span className="simple-label">Frete por sua conta</span><strong>{entry.data.freight===null?'Não informado':money(entry.data.freight,entry.data.currency)}</strong>{entry.data.freight!==null&&<p className="small">Estimativa do ML</p>}{entry.data.freeShipping===true&&<p className="small">Grátis para o comprador</p>}</div></>:<p className={entry.error?"simple-error":"small"} role={entry.error?"alert":"status"}>{entry.error||"Consultando preços e frete…"}</p>}</article>;
}
export default function SimpleCatalog(){
 const [snapshot,setSnapshot]=useState<Snapshot|null>(null),[query,setQuery]=useState(''),[filter,setFilter]=useState('');
 const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[message,setMessage]=useState('');
 const alive=useRef(true),lock=useRef(false),queue=useRef<Promise<unknown>>(Promise.resolve()),cache=useRef(new Map<string,Summary>());
 useEffect(()=>{alive.current=true;fetch('/api/mercado-livre/anuncios',{cache:'no-store'}).then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error||'Não foi possível carregar os anúncios.');if(alive.current)setSnapshot(d)}).catch(e=>{if(alive.current)setMessage(e.message)}).finally(()=>{if(alive.current)setLoading(false)});return()=>{alive.current=false}},[]);
 const load=useCallback<Loader>((id,active)=>{
  const key=(snapshot?.run??'direct')+':'+id;
  const task=queue.current.then(async()=>{
   if(!active())return null;
   const saved=cache.current.get(key);if(saved)return saved;
   const r=await fetch('/api/mercado-livre/anuncios/resumo?itemId='+id,{cache:'no-store'});
   const data=await r.json();if(!r.ok)throw Error(data.error||'Consulta indisponível.');
   cache.current.set(key,data);return data as Summary;
  });
  queue.current=task.catch(()=>{});return task;
 },[snapshot?.run]);
 const result=useMemo(()=>filter.trim()?listingSearch(filter,snapshot?.rows??[]):{entries:Array.from(new Map((snapshot?.rows??[]).map(r=>[r.itemId,{itemId:r.itemId,title:r.title}])).values()),message:''},[filter,snapshot]);
 async function sync(){
  if(lock.current)return;lock.current=true;setBusy(true);setMessage('Atualizando anúncios…');let current=snapshot;
  try{let action='start';do{const r=await fetch('/api/mercado-livre/anuncios',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,run:current?.run})});const d=await r.json();if(!r.ok)throw Error(d.error||'Não foi possível atualizar.');current=d;action='next';if(alive.current)setSnapshot(d);}while(current&&!current.done&&alive.current);
   if(alive.current){cache.current.clear();setMessage('Anúncios atualizados.');setFilter('');setQuery('');}
  }catch(e){if(alive.current)setMessage(e instanceof Error?e.message:'Não foi possível atualizar.')}
  finally{if(alive.current)setBusy(false);lock.current=false;}
 }
 return <section className="panel simple-catalog"><div className="catalog-heading"><h1>Anúncios</h1><Button variant="outline" disabled={busy||loading} onClick={sync}>{busy?'Atualizando…':'Atualizar anúncios'}</Button></div>
 <form className="simple-search" onSubmit={e=>{e.preventDefault();setFilter(query.trim());setMessage('')}}><label htmlFor="listing-search">Filtrar por anúncio, MLB ou SKU<Input id="listing-search" placeholder="Todos os anúncios · digite para filtrar" value={query} onChange={e=>{setQuery(e.target.value);if(!e.target.value.trim()){setFilter('');setMessage('')}}}/></label><Button type="submit">Buscar</Button>{filter&&<Button variant="outline" onClick={()=>{setQuery('');setFilter('');setMessage('')}} type="button">Ver todos</Button>}</form>
 {message&&<p role="status">{message}</p>}
 {result.message&&<p role="status">{result.message}</p>}
 {loading&&<p role="status">Carregando anúncios…</p>}
 {!loading&&!snapshot?.done&&snapshot&&<p className="small">Importação parcial. Atualize os anúncios para completar a lista.</p>}
 <div>{result.entries.map(item=><Listing key={(snapshot?.run??'direct')+':'+item.itemId} item={item} load={load} paused={busy}/>)}</div>
 {!loading&&!busy&&!result.message&&!result.entries.length&&<p>{filter?'Nenhum anúncio encontrado.':'Nenhum anúncio importado. Clique em Atualizar anúncios para carregar sua lista.'}</p>}
 </section>;
}
