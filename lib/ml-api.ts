import {account,runtime} from './mercado-livre';
import {seal,unseal} from './ml-crypto';
export class MlError extends Error {constructor(message:string,public status=502){super(message)}}
// Called only while the per-owner import lease is held.
export async function mlSession(owner:string){
 const a=await account(owner),e=runtime();if(!a?.tokens||!a.seller_id)throw new MlError('Autorize sua conta no painel antes de importar.',409);
 let t=JSON.parse(await unseal(a.tokens,e.ML_ENCRYPTION_KEY,owner+':tokens')) as {access_token:string;refresh_token:string};
 if(!a.expires_at||a.expires_at<Date.now()+60000){
  const secret=await unseal(a.secret,e.ML_ENCRYPTION_KEY,owner+':secret');
  const res=await fetch('https://api.mercadolibre.com/oauth/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'refresh_token',client_id:e.ML_CLIENT_ID,client_secret:secret,refresh_token:t.refresh_token}),signal:AbortSignal.timeout(15000)});
  if(!res.ok)throw new MlError('Não foi possível renovar a conexão. Clique em Autorizar novamente.',409);
  const next=await res.json() as typeof t & {user_id:number;expires_in:number};
  if(!next.access_token||!next.refresh_token||String(next.user_id)!==a.seller_id||!Number.isFinite(next.expires_in)||next.expires_in<=0)throw new MlError('Resposta de autorização inválida. Autorize novamente.',409);
  const encrypted=await seal(JSON.stringify({access_token:next.access_token,refresh_token:next.refresh_token}),e.ML_ENCRYPTION_KEY,owner+':tokens');
  const update=await e.DB.prepare('UPDATE ml_accounts SET tokens=?,expires_at=?,updated_at=? WHERE owner=? AND tokens=? AND secret=?').bind(encrypted,Date.now()+next.expires_in*1000,Date.now(),owner,a.tokens,a.secret).run();
  if(!update.meta.changes)throw new MlError('A conexão foi alterada. Reinicie a importação.',409);t=next;
 }
 const call=async<T>(path:string,init?:RequestInit):Promise<T>=>{
  const res=await fetch('https://api.mercadolibre.com'+path,{...init,headers:{Authorization:'Bearer '+t.access_token,Accept:'application/json',...(init?.body?{'Content-Type':'application/json'}:{})},signal:AbortSignal.timeout(20000)});
  if(!res.ok){let detail='';try{const body=await res.json() as {message?:string;error?:string};detail=body.message||body.error||''}catch{}const base=res.status===401?'Conexão recusada. Autorize novamente.':res.status===403?'O Mercado Livre recusou a operação. Confira a permissão de Publicação e sincronização.':res.status===429?'Limite de consultas atingido. Aguarde um minuto e continue.':'O Mercado Livre recusou a operação (HTTP '+res.status+').';throw new MlError(detail?base+' '+detail:base,res.status===429?429:res.status>=400&&res.status<500?422:502)}
  return res.status===204?({} as T):res.json() as Promise<T>;
 };
 return {sellerId:a.seller_id,get:<T>(path:string)=>call<T>(path),post:<T>(path:string,body:unknown)=>call<T>(path,{method:'POST',body:JSON.stringify(body)})};
}
