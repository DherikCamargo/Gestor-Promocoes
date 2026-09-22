import {actor,account,json,runtime} from '@/lib/mercado-livre';
import {random} from '@/lib/ml-crypto';
import {mlSession,MlError} from '@/lib/ml-api';
import {identifyCost,rowsFromItem,type Item,type CatalogRow} from '@/lib/ml-catalog';
type Payload={rows:CatalogRow[];failed:string[];pending?:string[]};
type Snapshot={owner:string;seller_id:string;run:string;payload:string;cursor:string|null;processed:number;total:number;done:number;lease:string|null;locked_until:number;updated_at:number};
const read=(owner:string)=>runtime().DB.prepare('SELECT * FROM ml_imports WHERE owner=?').bind(owner).first<Snapshot>();
function view(s:Snapshot){const p=JSON.parse(s.payload) as Payload;return {run:s.run,rows:p.rows.map(r=>({...r,...identifyCost(r.sku,r.title,r.itemId)})),failed:p.failed,processed:s.processed,total:s.total,done:!!s.done,updatedAt:s.updated_at};}
export async function GET(){try{const owner=await actor(),a=await account(owner),s=await read(owner);return json(s&&s.seller_id===a?.seller_id?view(s):null)}catch{return json({error:'Não foi possível carregar a importação. Recarregue o painel.'},503)}}
export async function POST(request:Request){
 let owner:string;try{owner=await actor(request)}catch{return json({error:'Sessão inválida. Abra o painel em uma nova aba.'},403)}
 const db=runtime().DB;let lease:string|undefined;
 try{
  const body=await request.json() as {action?:string;run?:string};if(!['start','next'].includes(body.action??''))return json({error:'Ação inválida.'},400);
  const a=await account(owner);if(!a?.tokens||!a.seller_id)throw new MlError('Autorize sua conta antes de importar.',409);
  lease=random();const now=Date.now();
  if(body.action==='start'){
   const started=await db.prepare('INSERT INTO ml_imports (owner,seller_id,run,payload,cursor,processed,total,done,lease,locked_until,updated_at) VALUES (?,?,?,?,NULL,0,0,0,?,?,?) ON CONFLICT(owner) DO UPDATE SET seller_id=excluded.seller_id,run=excluded.run,payload=excluded.payload,cursor=NULL,processed=0,total=0,done=0,lease=excluded.lease,locked_until=excluded.locked_until,updated_at=excluded.updated_at WHERE ml_imports.locked_until<?').bind(owner,a.seller_id,random(),JSON.stringify({rows:[],failed:[]}),lease,now+90000,now,now).run();
   if(!started.meta.changes)throw new MlError('Já existe um lote em andamento. Aguarde e continue.',409);
  }else{
   if(typeof body.run!=='string'||body.run.length>100)throw new MlError('Importação inválida.',400);
   const locked=await db.prepare('UPDATE ml_imports SET lease=?,locked_until=? WHERE owner=? AND seller_id=? AND run=? AND locked_until<?').bind(lease,now+90000,owner,a.seller_id,body.run,now).run();
   if(!locked.meta.changes)throw new MlError('Importação ocupada ou alterada. Recarregue o painel e continue.',409);
  }
  const s=await read(owner);if(!s||s.lease!==lease)throw new MlError('Não foi possível iniciar o lote.',409);
  if(s.done)return json(view(s));
  const api=await mlSession(owner);if(api.sellerId!==s.seller_id)throw new MlError('A conta conectada mudou. Reinicie a importação.',409);
  const p=JSON.parse(s.payload) as Payload;
  if(!p.pending?.length){
   if(s.processed>=10000)throw new MlError('Limite de 10 mil anúncios nesta importação. Solicite ampliação para esta conta.',409);
   const query=new URLSearchParams({search_type:'scan',status:'active',limit:'20'});if(s.cursor)query.set('scroll_id',s.cursor);
   const search=await api.get<{results:string[];scroll_id?:string;paging?:{total:number}}>('/users/'+encodeURIComponent(s.seller_id)+'/items/search?'+query);
   if(!Array.isArray(search.results)||search.results.length>20||search.results.some(id=>!/^MLB\d+$/.test(id)))throw new MlError('Lista de anúncios inesperada. Reinicie a importação.');
   p.pending=search.results;s.total=search.paging?.total??s.total;
   if(search.results.length&&!search.scroll_id)throw new MlError('O Mercado Livre não retornou a continuação da busca.');
   s.cursor=search.scroll_id??null;s.done=search.results.length===0?1:0;
   // Persist the exact pending IDs before detail requests, so retries cannot skip a batch.
   await db.prepare('UPDATE ml_imports SET payload=?,cursor=?,total=?,done=?,updated_at=? WHERE owner=? AND lease=?').bind(JSON.stringify(p),s.cursor,s.total,s.done,Date.now(),owner,lease).run();
  }
  if(p.pending?.length){
   const ids=p.pending;
   const details=await api.get<{code:number;body:Item}[]>('/items?ids='+ids.join(',')+'&include_attributes=all');
   if(!Array.isArray(details))throw new MlError('Resposta de anúncios inesperada. Tente continuar.');
   const rows=new Map(p.rows.map(r=>[r.key,r]));
   for(const id of ids){const entry=details.find(d=>d.body?.id===id);if(!entry||entry.code!==200||String(entry.body.seller_id)!==s.seller_id){p.failed.push(id);continue}if(entry.body.status!=='active')continue;for(const row of rowsFromItem(entry.body))rows.set(row.key,row);}
   p.rows=[...rows.values()];s.processed+=ids.length;delete p.pending;
  }
  const current=await account(owner);if(current?.seller_id!==s.seller_id)throw new MlError('Conta alterada durante a importação. Reinicie.',409);
  s.payload=JSON.stringify(p);s.updated_at=Date.now();
  const saved=await db.prepare('UPDATE ml_imports SET payload=?,processed=?,updated_at=? WHERE owner=? AND lease=?').bind(s.payload,s.processed,s.updated_at,owner,lease).run();if(!saved.meta.changes)throw new MlError('O lote perdeu a sessão de importação. Recarregue o painel.',409);
  return json(view(s));
 }catch(error){return json({error:error instanceof MlError?error.message:'Consulta interrompida. Seu progresso foi salvo; tente continuar.'},error instanceof MlError?error.status:503)}finally{if(lease)await db.prepare('UPDATE ml_imports SET lease=NULL,locked_until=0 WHERE owner=? AND lease=?').bind(owner,lease).run();}
}
