'use client';
import {useEffect,useRef,useState} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Table,TableHeader,TableBody,TableRow,TableHead,TableCell} from '@/components/ui/table';
import type {CatalogRow} from '@/lib/ml-catalog';
type Snapshot={run:string;rows:CatalogRow[];failed:string[];processed:number;total:number;done:boolean;updatedAt:number};
const money=(n:number)=>n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
export default function Catalog(){
 const [data,setData]=useState<Snapshot|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[query,setQuery]=useState('');
 const stop=useRef(false),running=useRef(false);
 useEffect(()=>{let mounted=true;fetch('/api/mercado-livre/anuncios').then(async r=>{const d=await r.json() as Snapshot & {error?:string};if(!r.ok)throw Error(d?.error||'Falha ao carregar.');if(mounted)setData(d)}).catch(e=>{if(mounted)setMessage(e.message)});return()=>{mounted=false;stop.current=true}},[]);
 async function importItems(restart:boolean){if(running.current)return;running.current=true;stop.current=false;setBusy(true);setMessage('Consultando anúncios ativos…');let current=data;
 try{let action=restart?'start':'next';do{const res=await fetch('/api/mercado-livre/anuncios',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,run:current?.run})});const value=await res.json() as Snapshot & {error?:string};if(!res.ok)throw Error(value.error||'Falha ao importar.');current=value as Snapshot;setData(current);action='next';setMessage(current.done?'Consulta concluída. Confira os custos pendentes.':`${current.processed} anúncios consultados. Importando próximo lote…`);}while(current&&!current.done&&!stop.current);if(stop.current)setMessage('Importação pausada. Você pode continuar do último lote salvo.');}
 catch(e){setMessage(e instanceof Error?e.message:'Consulta interrompida. Tente continuar.');const res=await fetch('/api/mercado-livre/anuncios').catch(()=>null);if(res?.ok)setData(await res.json());}
 finally{running.current=false;setBusy(false)}
 }
 const rows=data?.rows??[],pending=rows.filter(r=>r.cost===null).length;
 const search=query.trim().toLowerCase();
 const shown=search.length>=2?rows.filter(r=>`${r.sku} ${r.title} ${r.itemId} ${r.variation}`.toLowerCase().includes(search)):[];
 return <section className="panel catalog"><div className="catalog-heading"><div><h2>Anúncios e SKUs</h2><p>Importe os anúncios ativos e confira os custos identificados. Promoções ainda não analisadas.</p></div><div className="catalog-actions"><Button disabled={busy} onClick={()=>importItems(true)}>{data?'Atualizar importação':'Importar anúncios ativos'}</Button>{data&&!data.done&&<Button variant="outline" disabled={busy} onClick={()=>importItems(false)}>Continuar importação</Button>}{busy&&<Button variant="outline" onClick={()=>{stop.current=true;setMessage('Pausando após salvar o lote atual…')}}>Pausar</Button>}</div></div>
 <p role="status" aria-live="polite">{message}</p>{data&&<><p><b>{rows.length}</b> variações / anúncios importados · <b>{pending}</b> custos pendentes · {data.processed} anúncios consultados{data.total?` de aproximadamente ${data.total}`:''}</p><p className="small">{data.done?'Consulta concluída':'Importação parcial'} · Atualizado em {new Date(data.updatedAt).toLocaleString('pt-BR')}. Custos por regra de SKU são sugestões para conferência.</p>{data.failed.length>0&&<div className="note"><b>{data.failed.length} anúncios não puderam ser lidos.</b><p>A importação está incompleta para esses anúncios. Atualize a importação para tentar novamente.</p><details><summary>Ver IDs com falha</summary><p>{data.failed.join(', ')}</p></details></div>}
 <div className="catalog-filters catalog-search-only"><label>Buscar SKU, anúncio ou produto<Input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Ex.: MOL-3ZIP-PRT-GG"/></label></div>
 {search.length<2?<p className="search-hint">Digite pelo menos 2 caracteres para exibir os anúncios.</p>:<><Table><TableHeader><TableRow><TableHead>Produto / anúncio</TableHead><TableHead>SKU / variação</TableHead><TableHead>Preço atual</TableHead><TableHead>Custo sugerido</TableHead><TableHead>Conferência</TableHead></TableRow></TableHeader><TableBody>{shown.map(r=><TableRow key={r.key}><TableCell><b>{r.title}</b><div className="small">{r.itemId} · {r.listingType==='gold_pro'?'Premium':r.listingType==='gold_special'?'Clássico':r.listingType}</div></TableCell><TableCell>{r.sku||'Sem SKU'}<div className="small">{r.variation}</div></TableCell><TableCell>{r.price===null?'Indisponível':r.currency==='BRL'?money(r.price):`${r.price} ${r.currency}`}</TableCell><TableCell>{r.cost===null?'Pendente':money(r.cost)}</TableCell><TableCell>{r.costReason}</TableCell></TableRow>)}</TableBody></Table>{shown.length===0&&<p>Nenhum anúncio encontrado para esta busca.</p>}</>}</>}
 </section>;
}
