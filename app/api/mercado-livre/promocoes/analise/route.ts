import {actor,json,PARTICIPATION_ENABLED} from '@/lib/mercado-livre';
import {mlSession,MlError} from '@/lib/ml-api';
import {defaultRules} from '@/lib/offer-analysis';
import {buildOfferReport} from '@/lib/offer-report';
import {loadCostOverrides,loadRules} from '@/lib/owner-settings';
// Análise das promoções de um anúncio (somente leitura). A adesão fica em /promocoes/participar.
const text=(v:unknown)=>typeof v==='string'&&v?v:null;
export async function GET(request:Request){
 let owner:string;try{owner=await actor()}catch{return json({error:'Abra o gestor em uma nova aba e entre na sua conta.'},403)}
 try{
  const params=new URL(request.url).searchParams,id=params.get('itemId')??'';
  // Opcional: analisar só uma promoção (cards de promoção), com menos consultas ao Mercado Livre.
  const only=params.get('promotionId');
  if(!/^MLB\d+$/.test(id))throw new MlError('Informe um MLB válido.',400);
  const api=await mlSession(owner),item=await api.get<Record<string,unknown>>('/items/'+id+'?include_attributes=all');
  if(item.id!==id||String(item.seller_id)!==api.sellerId)throw new MlError('Anúncio não encontrado na conta conectada.',403);
  const currency=typeof item.currency_id==='string'?item.currency_id:'BRL';
  const [raw,overrides,settings]=await Promise.all([
   api.get<unknown>('/seller-promotions/items/'+id+'?app_version=v2'),
   loadCostOverrides(owner).catch(()=>null),
   loadRules(owner).catch(()=>null),
  ]);
  if(!Array.isArray(raw))throw new MlError('O Mercado Livre retornou um formato de ofertas não reconhecido.',502);
  const rules=settings?.rules??defaultRules;
  const selected=only?raw.filter(o=>o&&typeof o==='object'&&(o as {id?:unknown}).id===only):raw;
  const {cost,offers}=await buildOfferReport(api,item,selected,overrides??{},rules);
  return json({itemId:id,title:text(item.title)??id,currency,cost,rules,rulesEdited:settings?.edited??false,
   warnings:[...(overrides===null?['Custos editados indisponíveis: usando custos padrão.']:[]),...(settings===null?['Regras de margem indisponíveis: usando as regras padrão.']:[])],
   offers,participationEnabled:PARTICIPATION_ENABLED&&overrides!==null&&settings!==null,queriedAt:new Date().toISOString()});
 }catch(e){
  if(e instanceof MlError&&/HTTP 404/.test(e.message))return json({error:'Anúncio não encontrado. Confira o MLB.'},404);
  return json({error:e instanceof MlError?e.message:'Não foi possível analisar as promoções deste anúncio.'},e instanceof MlError?e.status:503);
 }
}
