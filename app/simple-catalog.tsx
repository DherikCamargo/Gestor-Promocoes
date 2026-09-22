'use client';
import {useEffect,useRef,useState} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import type {CatalogRow} from '@/lib/ml-catalog';
type Snapshot={run:string;rows:CatalogRow[];done:boolean};
type Summary={itemId:string;title:string;listingType:string;currency:string;regularPrice:number|null;promotionPrice:number|null;currentPrice:number|null;variationPrices:boolean;freight:number|null;freeShipping:boolean|null};
type Entry={itemId:string;title:string;data?:Summary;error?:string};
const normalize=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const money=(n:number,currency:string)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency}).format(n);
const batchSize=6;
export default function SimpleCatalog(){
 const [snapshot,setSnapshot]=useState<Snapshot|null>(null),[query,setQuery]=useState(''),[entries,setEntries]=useState<Entry[]>([]),[matches,setMatches]=useState<Entry[]>([]);
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[searched,setSearched]=useState(false);
 const alive=useRef(true),lock=useRef(false);
 useEffect(()=>{alive.current=true;fetch('/api/mercado-livre/anuncios',{cache:'no-store'}).then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error||'Não foi possível carregar os anúncios.');if(alive.current)setSnapshot(d)}).catch(e=>{if(alive.current)setMessage(e.message)});return()=>{alive.current=false}},[]);
 async function load(batch:Entry[],previous:Entry[]){
  let result=[...previous];
  for(const entry of batch){
   if(!alive.current)break;
   try{const r=await fetch('/api/mercado-livre/anuncios/resumo?itemId='+entry.itemId,{cache:'no-store'});const data=await r.json();if(!r.ok)throw Error(data.error||'Consulta indisponível.');result=[...result,{...entry,title:data.title,data}];}
   catch(e){result=[...result,{...entry,error:e instanceof Error?e.message:'Consulta indisponível.'}];}
   if(alive.current)setEntries(result);
  }
 }
 async function search(e:React.FormEvent){
  e.preventDefault();if(lock.current||query.trim().length<2)return;lock.current=true;setBusy(true);setMessage('');setSearched(true);setEntries([]);
  const term=query.trim(),id=term.toUpperCase().replace(/^MLB-?/,'');
  const found=/^\d+$/.test(id)?[{itemId:'MLB'+id,title:'MLB'+id}]:Array.from(new Map((snapshot?.rows??[]).filter(r=>normalize(r.title+' '+r.itemId+' '+r.sku+' '+r.variation).includes(normalize(term))).map(r=>[r.itemId,{itemId:r.itemId,title:r.title}])).values());
  setMatches(found);
  try{await load(found.slice(0,batchSize),[]);}finally{if(alive.current)setBusy(false);lock.current=false;}
 }
 async function more(){if(lock.current)return;lock.current=true;setBusy(true);try{await load(matches.slice(entries.length,entries.length+batchSize),entries)}finally{if(alive.current)setBusy(false);lock.current=false}}
 async function sync(){
  if(lock.current)return;lock.current=true;setBusy(true);setMessage('Atualizando anúncios…');let current=snapshot;
  try{let action='start';do{const r=await fetch('/api/mercado-livre/anuncios',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,run:current?.run})});const d=await r.json();if(!r.ok)throw Error(d.error||'Não foi possível atualizar.');current=d;action='next';if(alive.current)setSnapshot(d);}while(current&&!current.done&&alive.current);
   if(alive.current){setMessage('Anúncios atualizados. Faça uma busca para consultar os preços.');setEntries([]);setMatches([]);setSearched(false);}
  }catch(e){if(alive.current)setMessage(e instanceof Error?e.message:'Não foi possível atualizar.')}
  finally{if(alive.current)setBusy(false);lock.current=false;}
 }
 return <section className="panel simple-catalog"><div className="catalog-heading"><h1>Anúncios</h1><Button variant="outline" disabled={busy} onClick={sync}>Atualizar anúncios</Button></div>
 <form className="simple-search" onSubmit={search}><label htmlFor="listing-search">Buscar anúncio, MLB ou SKU<Input id="listing-search" placeholder="Digite o nome ou MLB do anúncio" value={query} disabled={busy} onChange={e=>{setQuery(e.target.value);setEntries([]);setMatches([]);setSearched(false)}}/></label><Button type="submit" disabled={busy||query.trim().length<2}>{busy?'Consultando…':'Buscar'}</Button></form>
 {message&&<p role="status">{message}</p>}
 {!searched&&!message&&<p className="small">Busque um anúncio para consultar seus preços.</p>}
 <div aria-live="polite" aria-busy={busy}>{entries.map(entry=><article className="simple-listing" key={entry.itemId}><div><h2>{entry.title}</h2><p className="small">{entry.itemId}</p></div>
 {entry.data?<><div><span className="simple-label">Preço normal</span><strong>{entry.data.regularPrice===null?entry.data.variationPrices?'Varia por opção':'Não informado':money(entry.data.regularPrice,entry.data.currency)}</strong><span className="simple-label">Em promoção</span><strong className="sale-value">{entry.data.promotionPrice!==null?money(entry.data.promotionPrice,entry.data.currency):entry.data.currentPrice!==null?'Sem promoção informada':'Não informado'}</strong></div>
 <div><span className="simple-label">Tipo do anúncio</span><strong>{entry.data.listingType==='gold_special'?'Clássico':entry.data.listingType==='gold_pro'?'Premium':entry.data.listingType||'Não informado'}</strong></div>
 <div><span className="simple-label">Frete por sua conta</span><strong>{entry.data.freight===null?'Não informado':money(entry.data.freight,entry.data.currency)}</strong>{entry.data.freight!==null&&<p className="small">Estimativa do ML</p>}{entry.data.freeShipping===true&&<p className="small">Grátis para o comprador</p>}</div></>:<p className="simple-error" role="alert">{entry.error}</p>}</article>)}</div>
 {searched&&!busy&&matches.length===0&&<p>Nenhum anúncio encontrado. Tente o MLB completo ou atualize os anúncios.</p>}
 {matches.length>entries.length&&!busy&&<Button variant="outline" onClick={more}>Mostrar mais anúncios</Button>}
 </section>;
}
