import {actor,json,runtime,PARTICIPATION_ENABLED} from '@/lib/mercado-livre';
import {mlSession,MlError} from '@/lib/ml-api';
import {loadCostOverrides,loadRules} from '@/lib/owner-settings';
import {participateOffer,type LogEntry} from '@/lib/participate';
// Adesão a uma oferta (um anúncio por pedido; a família é feita em sequência pela tela).
// Desligada por padrão: só funciona com PARTICIPATION_ENABLED=true na hospedagem própria.
// Revalida tudo no servidor (lib/participate.ts); a tela nunca define preço nem margem.
const paused=()=>json({ok:false,code:'PARTICIPATION_PAUSED',error:'Adesões desligadas. Nenhuma solicitação foi enviada ao Mercado Livre.'},503);
export async function POST(request:Request){
 if(!PARTICIPATION_ENABLED)return paused();
 let owner:string;try{owner=await actor(request)}catch{return json({error:'Sessão inválida. Abra o gestor em uma nova aba.'},403)}
 let body:{itemId?:unknown;refId?:unknown};try{body=await request.json()}catch{return json({error:'Pedido inválido.'},400)}
 const itemId=body.itemId,refId=body.refId;
 if(typeof itemId!=='string'||!/^MLB\d{1,20}$/.test(itemId)||typeof refId!=='string'||!/^[A-Za-z0-9_-]{1,80}$/.test(refId))return json({error:'Anúncio ou oferta inválidos.'},400);
 const db=runtime().DB;
 // Sem custos e regras do banco não há adesão: nunca aprovar com valores padrão sem aviso.
 const [overrides,settings]=await Promise.all([loadCostOverrides(owner).catch(()=>null),loadRules(owner).catch(()=>null)]);
 if(overrides===null||settings===null)return json({status:'refused',detail:'Custos ou regras de margem indisponíveis agora. Nenhuma solicitação foi enviada.'},503);
 const cents=(n:number|null)=>n===null?null:Math.round(n*100);
 const log=async(e:LogEntry)=>{await db.prepare('INSERT INTO participation_log (owner,item_id,promotion_id,promotion_type,ref_id,expected_price_cents,result_price_cents,status,detail,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)').bind(owner,e.itemId,e.promotionId,e.type,e.refId,cents(e.expectedPrice),cents(e.resultPrice),e.status,e.detail.slice(0,2000),Date.now()).run()};
 try{
  const api=await mlSession(owner);
  const result=await participateOffer({api,itemId,refId,overrides,rules:settings.rules,log});
  return json(result,result.status==='refused'?409:200);
 }catch(e){
  return json({status:'failed',detail:e instanceof MlError?e.message:'Não foi possível concluir a adesão. Confira na Central antes de tentar de novo.'},e instanceof MlError?e.status:503);
 }
}
