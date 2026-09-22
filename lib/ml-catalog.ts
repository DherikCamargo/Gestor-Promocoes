export type Attribute={id:string;value_name?:string|null};
export type Item={id:string;seller_id:number;title:string;status:string;price:number;currency_id:string;listing_type_id:string;attributes?:Attribute[];seller_custom_field?:string|null;variations?:{id:number;price?:number;available_quantity?:number;attributes?:Attribute[];attribute_combinations?:Attribute[];seller_custom_field?:string|null}[];available_quantity?:number};
export type CatalogRow={key:string;itemId:string;variationId:string|null;title:string;sku:string;variation:string;price:number|null;currency:string;stock:number|null;listingType:string;cost:number|null;costReason:string};
const normalize=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().trim();
export function identifyCost(sku:string,title:string,itemId?:string):{cost:number|null;costReason:string}{
 const s=normalize(sku),t=normalize(title);
 const pending={cost:null,costReason:'Conferir composição e custo'};
 const words=(s+' '+t).replace(/[_/]+/g,'-');
 // Kits e conjuntos precisam ser identificados antes do modelo da peça.
 const kit=s.startsWith('KIT')||/\b(KIT|COMBO)\b/.test(t);
 if(kit){
  const twoShorts=/^KIT-?(?:0|O)?2(?:-|$)/.test(s)||/\bKIT\s*0?2\b/.test(t);
  if(twoShorts&&(/SHORT/.test(s)||/\b(SHORT|BERMUDA)\b/.test(t))&&/\bLINHO\b/.test(t))return {cost:34,costReason:'Kit com 2 shorts de linho'};
  const match=s.match(/^KIT-?0?([234])(?:-|$)/),count=match?Number(match[1]):null;
  const threeZip=/(?:^|-)3\s*(?:ZIP|ZIPER)(?:-|$)/.test(s)||/3\s*(?:ZIP|ZIPER)/.test(t);
  if(count&&threeZip&&!/\b(CALCA|CAMISETA|GOLA|CONJUNTO)\b/.test(words))return {cost:count*42,costReason:`Kit com ${count} blusas 3 zíper`};
  if(count===3&&!/\b(CALCA|CAMISETA|GOLA|CONJUNTO)\b/.test(words))return {cost:126,costReason:'KIT03 confirmado: 3 blusas 3 zíper'};
  if(/(?:BLUSA|MOL).*(?:2|DUAS).*CALC|(?:2|DUAS).*CALC.*(?:BLUSA|MOL)/.test(words))return {cost:94,costReason:'Kit com 1 blusa e 2 calças'};
  if(/(?:MOLETOM|MOL).*(?:CAMISETA|CAM)|(?:CAMISETA|CAM).*(?:MOLETOM|MOL)/.test(words))return {cost:54,costReason:'Kit com 1 moletom e 1 camiseta'};
  return pending;
 }
 if(/^CONJ(?:-|$)/.test(s)||/\bCONJUNTO\b/.test(t))return {cost:68,costReason:'Conjunto identificado pelo SKU / anúncio'};
 if(/^(?:SUT|SUTIA|SOUTIEN)-?PLUS(?:-|$)/.test(s)||(/^SUT(?:-|$)/.test(s)&&/PLUS\s*SIZE/.test(t))||(itemId==='MLB5662406564'&&/\b(SOUTIEN|SUTIA)\b/.test(t)&&/PLUS\s*SIZE/.test(t)))return {cost:33,costReason:'Sutiã Plus Size'};
 if(/^SHORT-LINH?(?:-|$)/.test(s))return {cost:17,costReason:'Short de linho'};
 if(/^SHORT(?:-|$)/.test(s))return {cost:20,costReason:'Short (demais modelos)'};
 if(/^(?:MOL-)?3ZIP(?:-|$)/.test(s))return {cost:42,costReason:'Prefixo 3ZIP / MOL-3ZIP'};
 if(/^(?:MOL-)?GOLA(?:-|$)/.test(s))return {cost:50,costReason:'Moletom de gola'};
 if(/^VEST(?:-|$)/.test(s))return {cost:20,costReason:'Vestido canelado'};
 if(/^024(?:-|$)/.test(s)&&/\b(COTURNO|BOTA)\b/.test(t))return {cost:150,costReason:'Coturno Adventure'};
 return {cost:null,costReason:sku?'SKU ainda sem regra de custo':'SKU não informado pelo Mercado Livre'};
}
function skuOf(attrs:Attribute[]|undefined,custom:string|null|undefined){return attrs?.find(a=>a.id==='SELLER_SKU')?.value_name?.trim()||custom?.trim()||''}
export function rowsFromItem(item:Item):CatalogRow[]{
 const variants=item.variations?.length?item.variations:[null];
 return variants.map(v=>{const sku=v?skuOf(v.attributes,v.seller_custom_field):skuOf(item.attributes,item.seller_custom_field);const price=v?.price??item.price;
 return {key:item.id+':'+(v?.id??'item'),itemId:item.id,variationId:v?String(v.id):null,title:item.title,sku,variation:v?.attribute_combinations?.map(a=>a.value_name).filter(Boolean).join(' · ')||'',price:Number.isFinite(price)?price:null,currency:item.currency_id,stock:v?.available_quantity??item.available_quantity??null,listingType:item.listing_type_id,...identifyCost(sku,item.title,item.id)};});
}
