// Custos por produto. As regras de identificação (SKU/título) dizem qual produto é cada
// anúncio, ou de quais produtos um kit é composto; o custo vem do produto, então editar o
// custo de um produto vale para todos os anúncios e SKUs dele. Os valores abaixo são os
// padrões que estavam fixos no código; custos editados ficam no banco (product_costs).
export const defaultProducts:Record<string,{name:string;cost:number}>={
 CONJUNTO:{name:'Conjunto',cost:68},
 SUTIA_PLUS:{name:'Sutiã Plus Size',cost:33},
 SHORT_LINHO:{name:'Short de linho',cost:17},
 SHORT:{name:'Short (demais modelos)',cost:20},
 BLUSA_3ZIP:{name:'Blusa 3 zíper',cost:42},
 MOLETOM_GOLA:{name:'Moletom de gola',cost:50},
 VESTIDO:{name:'Vestido canelado',cost:20},
 COTURNO:{name:'Coturno Adventure',cost:150},
 // Kits cujas peças não têm custo próprio cadastrado continuam como produto único.
 KIT_BLUSA_2CALCAS:{name:'Kit 1 blusa e 2 calças',cost:94},
 KIT_MOLETOM_CAMISETA:{name:'Kit 1 moletom e 1 camiseta',cost:54},
};
export type Part={product:string;quantity:number};
export type Composition={parts:Part[]|null;reason:string};
const normalize=(s:string)=>s.normalize('NFD').replace(/[̀-ͯ]/g,'').toUpperCase().trim();
const one=(product:string,reason:string):Composition=>({parts:[{product,quantity:1}],reason});

export function identifyProduct(sku:string,title:string,itemId?:string):Composition{
 const s=normalize(sku),t=normalize(title);
 const words=(s+' '+t).replace(/[_/]+/g,'-');
 // Kits e conjuntos precisam ser identificados antes do modelo da peça.
 const kit=s.startsWith('KIT')||/\b(KIT|COMBO)\b/.test(t);
 if(kit){
  const twoShorts=/^KIT-?(?:0|O)?2(?:-|$)/.test(s)||/\bKIT\s*0?2\b/.test(t);
  if(twoShorts&&(/SHORT/.test(s)||/\b(SHORT|BERMUDA)\b/.test(t))&&/\bLINHO\b/.test(t))return {parts:[{product:'SHORT_LINHO',quantity:2}],reason:'Kit com 2 shorts de linho'};
  const match=s.match(/^KIT-?0?([234])(?:-|$)/),count=match?Number(match[1]):null;
  const threeZip=/(?:^|-)3\s*(?:ZIP|ZIPER)(?:-|$)/.test(s)||/3\s*(?:ZIP|ZIPER)/.test(t);
  if(count&&threeZip&&!/\b(CALCA|CAMISETA|GOLA|CONJUNTO)\b/.test(words))return {parts:[{product:'BLUSA_3ZIP',quantity:count}],reason:`Kit com ${count} blusas 3 zíper`};
  if(count===3&&!/\b(CALCA|CAMISETA|GOLA|CONJUNTO)\b/.test(words))return {parts:[{product:'BLUSA_3ZIP',quantity:3}],reason:'KIT03 confirmado: 3 blusas 3 zíper'};
  if(/(?:BLUSA|MOL).*(?:2|DUAS).*CALC|(?:2|DUAS).*CALC.*(?:BLUSA|MOL)/.test(words))return one('KIT_BLUSA_2CALCAS','Kit com 1 blusa e 2 calças');
  if(/(?:MOLETOM|MOL).*(?:CAMISETA|CAM)|(?:CAMISETA|CAM).*(?:MOLETOM|MOL)/.test(words))return one('KIT_MOLETOM_CAMISETA','Kit com 1 moletom e 1 camiseta');
  return {parts:null,reason:'Conferir composição e custo'};
 }
 if(/^CONJ(?:-|$)/.test(s)||/\bCONJUNTO\b/.test(t))return one('CONJUNTO','Conjunto identificado pelo SKU / anúncio');
 if(/^(?:SUT|SUTIA|SOUTIEN)-?PLUS(?:-|$)/.test(s)||(/^SUT(?:-|$)/.test(s)&&/PLUS\s*SIZE/.test(t))||(itemId==='MLB5662406564'&&/\b(SOUTIEN|SUTIA)\b/.test(t)&&/PLUS\s*SIZE/.test(t)))return one('SUTIA_PLUS','Sutiã Plus Size');
 if(/^SHORT-LINH?(?:-|$)/.test(s))return one('SHORT_LINHO','Short de linho');
 if(/^SHORT(?:-|$)/.test(s))return one('SHORT','Short (demais modelos)');
 if(/^(?:MOL-)?3ZIP(?:-|$)/.test(s))return one('BLUSA_3ZIP','Prefixo 3ZIP / MOL-3ZIP');
 if(/^(?:MOL-)?GOLA(?:-|$)/.test(s))return one('MOLETOM_GOLA','Moletom de gola');
 if(/^VEST(?:-|$)/.test(s))return one('VESTIDO','Vestido canelado');
 if(/^024(?:-|$)/.test(s)&&/\b(COTURNO|BOTA)\b/.test(t))return one('COTURNO','Coturno Adventure');
 return {parts:null,reason:sku?'SKU ainda sem regra de custo':'SKU não informado pelo Mercado Livre'};
}

// Chave usada para guardar o custo de um anúncio que nenhuma regra reconhece:
// o SKU quando o anúncio tem um único SKU (vale para outros anúncios com o mesmo SKU), senão o MLB.
export function customKey(skus:string[],itemId:string):string{
 const distinct=[...new Set(skus.map(normalize).filter(Boolean))];
 return distinct.length===1?'SKU:'+distinct[0]:'MLB:'+itemId;
}
export function validCostKey(key:unknown):key is string{
 return typeof key==='string'&&(Object.hasOwn(defaultProducts,key)||/^SKU:[A-Z0-9._-]{1,80}$/.test(key)||/^MLB:MLB\d{1,20}$/.test(key));
}
export function costTable(overrides:Record<string,number>):Record<string,number>{
 return {...Object.fromEntries(Object.entries(defaultProducts).map(([k,v])=>[k,v.cost])),...overrides};
}
// Soma em centavos; qualquer peça sem custo deixa o total ausente, nunca zero.
export function compositionCost(parts:Part[],costs:Record<string,number>):number|null{
 let cents=0;
 for(const p of parts){const c=costs[p.product];if(typeof c!=='number'||!Number.isFinite(c))return null;cents+=Math.round(c*100)*p.quantity}
 return cents/100;
}
export function compositionLabel(parts:Part[]):string{
 return parts.map(p=>(p.quantity>1?p.quantity+' × ':'')+(defaultProducts[p.product]?.name??p.product)).join(' + ');
}

export type ListingCost=
 {state:'ok';cost:number;label:string;editKey:string|null;edited:boolean}|
 {state:'mixed'}|
 {state:'missing';editKey:string;reason:string};
// Custo de um anúncio a partir das suas linhas (uma por variação).
export function listingCost(rows:{sku:string;title:string;itemId:string}[],overrides:Record<string,number>):ListingCost{
 if(!rows.length)return {state:'mixed'};
 const costs=costTable(overrides),comps=rows.map(r=>identifyProduct(r.sku,r.title,r.itemId));
 if(comps.every(c=>c.parts===null)){
  const key=customKey(rows.map(r=>r.sku),rows[0].itemId);
  return typeof overrides[key]==='number'?{state:'ok',cost:overrides[key],label:'Custo informado para '+(key.startsWith('SKU:')?'o SKU '+key.slice(4):'este anúncio'),editKey:key,edited:true}:{state:'missing',editKey:key,reason:comps[0].reason};
 }
 const distinct=new Set(comps.map(c=>JSON.stringify(c.parts)));
 if(distinct.size!==1)return {state:'mixed'};
 const parts=comps[0].parts!,cost=compositionCost(parts,costs);
 if(cost===null)return {state:'mixed'};
 const single=parts.length===1&&parts[0].quantity===1;
 return {state:'ok',cost,label:compositionLabel(parts),editKey:single?parts[0].product:null,edited:parts.some(p=>Object.hasOwn(overrides,p.product))};
}
