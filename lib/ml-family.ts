type Data=Record<string,unknown>;
type Api={sellerId:string;get:<T>(path:string)=>Promise<T>};
const data=(v:unknown):Data=>v&&typeof v==='object'&&!Array.isArray(v)?v as Data:{};
export function familyKey(value:unknown):string|null{
 if(typeof value==='number')return Number.isSafeInteger(value)&&value>0?String(value):null;
 return typeof value==='string'&&/^\d+$/.test(value)?value:null;
}

// Discovery is read-only. Item ownership and current family are checked again
// by the evidence endpoint before looking up each item's prices and offers.
export async function discoverFamily(api:Api,seed:Data){
 const productId=typeof seed.user_product_id==='string'?seed.user_product_id:'';
 if(!/^MLBU\d+$/.test(productId))throw Error('O anúncio não retornou um produto do vendedor válido para localizar a família.');
 let familyId=familyKey(seed.family_id);
 if(!familyId){
  const up=data(await api.get('/user-products/'+productId));
  if(String(up.user_id)!==api.sellerId)throw Error('Não foi possível confirmar o proprietário do produto.');
  familyId=familyKey(up.family_id);
 }
 if(!familyId)throw Error('O Mercado Livre não informou uma família válida para este anúncio.');
 const source='/sites/MLB/user-products-families/'+familyId;
 const family=data(await api.get(source));
 if(familyKey(family.family_id)!==familyId||family.site_id!=='MLB'||String(family.user_id)!==api.sellerId)throw Error('A identidade da família não corresponde à conta e ao anúncio consultados.');
 if(!Array.isArray(family.user_products_ids)||!family.user_products_ids.every(id=>typeof id==='string'&&/^MLBU\d+$/.test(id)))throw Error('O Mercado Livre retornou uma lista de produtos da família não reconhecida.');
 const productIds=[...new Set(family.user_products_ids as string[])];
 if(!productIds.includes(productId))throw Error('O produto não aparece na família informada. Consulte novamente.');
 const warnings:string[]=[];
 const itemIds=new Set<string>();
 let complete=true,requests=0;
 if(productIds.length>200){complete=false;warnings.push('Família com mais de 200 produtos: descoberta parcial.');}
 const selected=productIds.slice(0,200);
 discovery:for(let start=0;start<selected.length;start+=20){
  const group=selected.slice(start,start+20);
  let offset=0;
  while(true){
   if(requests++>=30){complete=false;warnings.push('Limite de consultas desta conferência atingido: descoberta parcial.');break discovery;}
   const query=new URLSearchParams({user_product_id:group.join(','),limit:'50',offset:String(offset)});
   let page:Data;
   try{page=data(await api.get('/users/'+api.sellerId+'/items/search?'+query));}
   catch{complete=false;warnings.push('Não foi possível consultar todos os anúncios da família. Tente novamente.');break discovery;}
   const ids=page.results,paging=data(page.paging),total=paging.total;
   if(!Array.isArray(ids)||!ids.every(id=>typeof id==='string'&&/^MLB\d+$/.test(id))||typeof total!=='number'||!Number.isSafeInteger(total)||total<0){complete=false;warnings.push('Paginação não reconhecida: descoberta parcial.');break discovery;}
   const before=itemIds.size;for(const id of ids)itemIds.add(id);
   offset+=ids.length;
   if(offset>=total)break;
   if(ids.length===0||itemIds.size===before||offset>=1000){complete=false;warnings.push('A paginação não pôde ser concluída.');break discovery;}
  }
 }
 if(!itemIds.has(String(seed.id))){complete=false;warnings.push('O anúncio inicial não apareceu na busca da família; mantido para conferência.');itemIds.add(String(seed.id));}
 return {familyId,productIds,itemIds:[...itemIds],complete,warnings,source,queriedAt:new Date().toISOString()};
}
