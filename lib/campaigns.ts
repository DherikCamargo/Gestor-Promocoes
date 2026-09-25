import {record} from './listing-summary';
// Campanhas do vendedor e anúncios de cada campanha (documentação seller-promotions):
//  GET /seller-promotions/users/{seller}?app_version=v2 — convites, com paginação offset/limit;
//  GET /seller-promotions/promotions/{id}/items?promotion_type=…&app_version=v2&limit=50[&search_after]
//  — itens da campanha (candidate, pending, started), paginados por search_after.
// Limite de páginas para caber no limite de subrequisições do Worker.
type Api={sellerId:string;get:<T>(path:string)=>Promise<T>};
export type Campaign={id:string;type:string;status:string;name:string;start:string|null;finish:string|null;deadline:string|null};
export type CampaignItem={itemId:string;status:string;price:number|null};
const campaignId=/^[A-Z]{1,5}-MLB\d{1,20}$/,campaignType=/^[A-Z_]{2,40}$/;
const text=(v:unknown)=>typeof v==='string'&&v?v:null;
const num=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)?v:null;
export const validCampaign=(id:unknown,type:unknown):boolean=>typeof id==='string'&&campaignId.test(id)&&typeof type==='string'&&campaignType.test(type);

export async function listCampaigns(api:Api,maxPages=4):Promise<Campaign[]>{
 const out=new Map<string,Campaign>();let offset=0;
 for(let page=0;page<maxPages;page++){
  const r=record(await api.get<unknown>('/seller-promotions/users/'+encodeURIComponent(api.sellerId)+'?'+new URLSearchParams({app_version:'v2',limit:'50',offset:String(offset)})));
  const results=Array.isArray(r.results)?r.results.map(record):[];
  for(const c of results)if(validCampaign(c.id,c.type))out.set(c.id as string,{id:c.id as string,type:c.type as string,status:String(c.status??''),name:text(c.name)??(c.type as string),start:text(c.start_date),finish:text(c.finish_date),deadline:text(c.deadline_date)});
  const total=num(record(r.paging).total);offset+=results.length;
  if(!results.length||total===null||offset>=total)break;
 }
 return [...out.values()];
}

export async function campaignItems(api:Api,id:string,type:string,maxPages=20):Promise<{items:CampaignItem[];complete:boolean}>{
 if(!validCampaign(id,type))throw Error('Campanha inválida.');
 const items=new Map<string,CampaignItem>();let cursor:string|null=null;
 for(let page=0;page<maxPages;page++){
  const q=new URLSearchParams({promotion_type:type,app_version:'v2',limit:'50',...(cursor?{search_after:cursor}:{})});
  const r=record(await api.get<unknown>('/seller-promotions/promotions/'+encodeURIComponent(id)+'/items?'+q));
  const results=Array.isArray(r.results)?r.results.map(record):[];
  for(const it of results)if(typeof it.id==='string'&&/^MLB\d{1,20}$/.test(it.id))items.set(it.id,{itemId:it.id,status:String(it.status??''),price:num(it.price)});
  const paging=record(r.paging);
  const next=[paging.searchAfter,paging.search_after,r.searchAfter,r.search_after].find((v):v is string=>typeof v==='string'&&v.length>0)??null;
  if(!results.length||!next)return {items:[...items.values()],complete:true};
  // Cursor repetido: a paginação não avança; devolve o que tem, marcado como incompleto.
  if(next===cursor)return {items:[...items.values()],complete:false};
  cursor=next;
 }
 return {items:[...items.values()],complete:false};
}
