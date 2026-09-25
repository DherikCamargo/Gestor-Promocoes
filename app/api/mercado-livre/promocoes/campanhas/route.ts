import {actor,json,PARTICIPATION_ENABLED} from '@/lib/mercado-livre';
import {mlSession,MlError} from '@/lib/ml-api';
import {listCampaigns} from '@/lib/campaigns';
// Promoções para as quais o vendedor foi convidado (somente leitura).
export async function GET(){
 let owner:string;try{owner=await actor()}catch{return json({error:'Abra o gestor em uma nova aba e entre na sua conta.'},403)}
 try{
  const api=await mlSession(owner);
  return json({campaigns:await listCampaigns(api),participationEnabled:PARTICIPATION_ENABLED,queriedAt:new Date().toISOString()});
 }catch(e){return json({error:e instanceof MlError?e.message:'Não foi possível carregar as promoções.'},e instanceof MlError?e.status:503)}
}
