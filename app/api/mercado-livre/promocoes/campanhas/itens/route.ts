import {actor,json} from '@/lib/mercado-livre';
import {mlSession,MlError} from '@/lib/ml-api';
import {campaignItems,validCampaign} from '@/lib/campaigns';
// Anúncios de uma promoção (candidatos, programados e participando). Somente leitura.
export async function GET(request:Request){
 let owner:string;try{owner=await actor()}catch{return json({error:'Abra o gestor em uma nova aba e entre na sua conta.'},403)}
 const q=new URL(request.url).searchParams,id=q.get('promotionId'),type=q.get('type');
 if(!validCampaign(id,type))return json({error:'Promoção inválida.'},400);
 try{
  const api=await mlSession(owner);
  return json({...await campaignItems(api,id!,type!),queriedAt:new Date().toISOString()});
 }catch(e){return json({error:e instanceof MlError?e.message:'Não foi possível carregar os anúncios desta promoção.'},e instanceof MlError?e.status:503)}
}
