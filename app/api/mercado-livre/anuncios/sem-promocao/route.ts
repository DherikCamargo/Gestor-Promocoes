import {actor,json} from '@/lib/mercado-livre';
import {mlSession,MlError} from '@/lib/ml-api';
import {saleState,type SaleState} from '@/lib/sale-state';
// Situação de preço de até 20 anúncios por pedido (limite de subrequisições do Worker), só leitura.
// A aba "Sem promoção" chama em lotes e mostra os que vendem no preço normal.
export async function GET(request:Request){
 let owner:string;try{owner=await actor()}catch{return json({error:'Abra o gestor em uma nova aba e entre na sua conta.'},403)}
 const ids=(new URL(request.url).searchParams.get('ids')??'').split(',').filter(Boolean);
 if(!ids.length||ids.length>20||ids.some(id=>!/^MLB\d{1,20}$/.test(id)))return json({error:'Informe de 1 a 20 MLBs.'},400);
 try{
  const api=await mlSession(owner),results:Record<string,SaleState>={};
  // Cinco por vez para não pressionar a API.
  for(let i=0;i<ids.length;i+=5){
   const batch=ids.slice(i,i+5);
   const sales=await Promise.all(batch.map(id=>api.get<unknown>('/items/'+id+'/sale_price?context=channel_marketplace').catch(()=>null)));
   batch.forEach((id,k)=>{results[id]=saleState(sales[k])});
  }
  return json({results,queriedAt:new Date().toISOString()});
 }catch(e){return json({error:e instanceof MlError?e.message:'Não foi possível consultar os preços.'},e instanceof MlError?e.status:503)}
}
