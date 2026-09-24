import {actor,json,runtime} from '@/lib/mercado-livre';
import {defaultRules,parseRules} from '@/lib/offer-analysis';
import {loadRules} from '@/lib/owner-settings';
// Regras de margem da conta (imposto, publicidade, comissão interna, despesa fixa, frete abaixo do
// limite e margem mínima). Só banco do site; nenhuma chamada ao Mercado Livre.
export async function GET(){
 let owner:string;try{owner=await actor()}catch{return json({error:'Abra o gestor em uma nova aba e entre na sua conta.'},403)}
 try{return json({...await loadRules(owner),defaults:defaultRules})}
 catch{return json({error:'Regras de margem indisponíveis no momento. Usando as regras padrão.',rules:defaultRules,edited:false,defaults:defaultRules},503)}
}
export async function POST(request:Request){
 let owner:string;try{owner=await actor(request)}catch{return json({error:'Sessão inválida. Abra o gestor em uma nova aba.'},403)}
 let body:{rules?:unknown};try{body=await request.json()}catch{return json({error:'Pedido inválido.'},400)}
 const db=runtime().DB;
 try{
  // rules null = voltar às regras padrão.
  if(body.rules===null)await db.prepare('DELETE FROM margin_rules WHERE owner=?').bind(owner).run();
  else{
   const rules=parseRules(body.rules);
   if(!rules)return json({error:'Confira os valores: porcentagens entre 0% e 100% e valores em reais não negativos.'},400);
   await db.prepare('INSERT INTO margin_rules (owner,rules,updated_at) VALUES (?,?,?) ON CONFLICT(owner) DO UPDATE SET rules=excluded.rules,updated_at=excluded.updated_at').bind(owner,JSON.stringify(rules),Date.now()).run();
  }
  return json({...await loadRules(owner),defaults:defaultRules});
 }catch{return json({error:'Não foi possível salvar as regras. Tente novamente.'},503)}
}
