type SearchRow={itemId:string;title:string;sku:string;variation:string};
const normalize=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function listingSearch(query:string,rows:SearchRow[]){
 const term=query.trim();
 const explicit=term.toUpperCase().match(/^MLB-?(\d+)$/);
 if(explicit)return {entries:[{itemId:'MLB'+explicit[1],title:'MLB'+explicit[1]}],message:''};
 // Bare numbers may identify a family or SKU. Only use a catalog-confirmed item ID.
 const numeric=/^\d+$/.test(term);
 const found=rows.filter(r=>numeric?r.itemId==='MLB'+term||r.sku===term:normalize(r.title+' '+r.itemId+' '+r.sku+' '+r.variation).includes(normalize(term)));
 const entries=Array.from(new Map(found.map(r=>[r.itemId,{itemId:r.itemId,title:r.title}])).values());
 return {entries,message:numeric&&!entries.length?'Esse número não foi identificado como anúncio no catálogo. Pode ser um código de família. Busque pelo nome ou copie o MLB completo do anúncio individual.':''};
}
