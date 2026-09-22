// Incident containment: intentionally no ML client import or outbound operation.
// Restore participation only after exact offer and resulting price are verified.
export async function POST(){
 return Response.json({
  ok:false,
  code:'PARTICIPATION_PAUSED',
  error:'Adesões temporariamente bloqueadas enquanto conferimos os preços das ofertas. Nenhuma solicitação foi enviada ao Mercado Livre.',
 },{status:503,headers:{'Cache-Control':'no-store'}});
}
