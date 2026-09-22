import {actor,json} from '@/lib/mercado-livre';
import {mlSession,MlError} from '@/lib/ml-api';
import {discoverFamily} from '@/lib/ml-family';
export async function GET(request:Request){
 let owner:string;try{owner=await actor()}catch{return json({error:'Abra o gestor em uma nova aba e entre na sua conta.'},403)}
 try{
  const itemId=new URL(request.url).searchParams.get('itemId')??'';
  if(!/^MLB\d+$/.test(itemId))return json({error:'Informe o código MLB do anúncio.'},400);
  const api=await mlSession(owner);
  const seed=await api.get<Record<string,unknown>>('/items/'+itemId);
  if(seed.id!==itemId||String(seed.seller_id)!==api.sellerId)return json({error:'Este anúncio não pertence à conta conectada.'},403);
  const family=await discoverFamily(api,seed);
  return json({itemId,readOnly:true,participationBlocked:true,...family});
 }catch(e){return json({error:e instanceof Error?e.message:'Não foi possível localizar a família.'},e instanceof MlError?e.status:502)}
}
