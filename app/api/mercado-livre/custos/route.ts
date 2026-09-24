import {actor,json,runtime} from '@/lib/mercado-livre';
import {validCostKey} from '@/lib/product-costs';
// Custos editados por produto (ou por SKU/MLB sem regra). Só leitura e escrita no banco do site;
// nenhuma chamada ao Mercado Livre.
type Row={product:string;cost_cents:number};
async function overrides(owner:string){
 const {results}=await runtime().DB.prepare('SELECT product,cost_cents FROM product_costs WHERE owner=?').bind(owner).all<Row>();
 return Object.fromEntries(results.filter(r=>validCostKey(r.product)).map(r=>[r.product,r.cost_cents/100]));
}
export async function GET(){
 let owner:string;try{owner=await actor()}catch{return json({error:'Abra o gestor em uma nova aba e entre na sua conta.'},403)}
 try{return json({overrides:await overrides(owner)})}
 catch{return json({error:'Custos editados indisponíveis no momento. Mostrando custos padrão.'},503)}
}
export async function POST(request:Request){
 let owner:string;try{owner=await actor(request)}catch{return json({error:'Sessão inválida. Abra o gestor em uma nova aba.'},403)}
 let body:{key?:unknown;cost?:unknown};try{body=await request.json()}catch{return json({error:'Pedido inválido.'},400)}
 if(!validCostKey(body.key))return json({error:'Produto não reconhecido.'},400);
 const db=runtime().DB;
 try{
  // cost null = voltar ao custo padrão do produto.
  if(body.cost===null)await db.prepare('DELETE FROM product_costs WHERE owner=? AND product=?').bind(owner,body.key).run();
  else{
   const cost=body.cost,cents=typeof cost==='number'?Math.round(cost*100):NaN;
   if(typeof cost!=='number'||!Number.isFinite(cost)||cost<0||cost>100000||Math.abs(cost*100-cents)>1e-6)return json({error:'Informe um custo entre R$ 0,00 e R$ 100.000,00, com até 2 casas decimais.'},400);
   await db.prepare('INSERT INTO product_costs (owner,product,cost_cents,updated_at) VALUES (?,?,?,?) ON CONFLICT(owner,product) DO UPDATE SET cost_cents=excluded.cost_cents,updated_at=excluded.updated_at').bind(owner,body.key,cents,Date.now()).run();
  }
  return json({overrides:await overrides(owner)});
 }catch{return json({error:'Não foi possível salvar o custo. Tente novamente.'},503)}
}
