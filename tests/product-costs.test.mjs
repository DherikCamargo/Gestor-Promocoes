// Custos por produto, kits por composição e anúncios sem custo.
// Executar com: pnpm test
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {listingCost,customKey,validCostKey,compositionCost} from '../lib/product-costs.ts';

const row=(sku,title='Blusa',itemId='MLB1')=>({sku,title,itemId});

test('custo editado do produto vale para todos os anúncios e SKUs dele',()=>{
 const edits={BLUSA_3ZIP:45};
 for(const rows of [[row('MOL-3ZIP-PRT-G'),row('MOL-3ZIP-BEG-M')],[row('3ZIP-VERD-P','Blusa','MLB2')]])
  assert.deepEqual(listingCost(rows,edits),{state:'ok',cost:45,label:'Blusa 3 zíper',editKey:'BLUSA_3ZIP',edited:true});
 assert.deepEqual(listingCost([row('MOL-3ZIP-PRT-G')],{}),{state:'ok',cost:42,label:'Blusa 3 zíper',editKey:'BLUSA_3ZIP',edited:false});
});

test('kit é composto pelos produtos e acompanha o custo editado da peça',()=>{
 assert.deepEqual(listingCost([row('KIT-3-3ZIP','Kit 3 Blusas 3 Zíper')],{}),{state:'ok',cost:126,label:'3 × Blusa 3 zíper',editKey:null,edited:false});
 assert.deepEqual(listingCost([row('KIT-3-3ZIP','Kit 3 Blusas 3 Zíper')],{BLUSA_3ZIP:45}),{state:'ok',cost:135,label:'3 × Blusa 3 zíper',editKey:null,edited:true});
 assert.equal(listingCost([row('KIT-2-SHORT','Kit 2 Shorts Linho')],{SHORT_LINHO:18.5}).cost,37);
});

test('anúncio que nenhuma regra reconhece fica sem custo, com chave para editar',()=>{
 assert.deepEqual(listingCost([row('ABC-1','Produto novo','MLB9')],{}),{state:'missing',editKey:'SKU:ABC-1',reason:'SKU ainda sem regra de custo'});
 assert.deepEqual(listingCost([row('','Sem SKU','MLB9')],{}),{state:'missing',editKey:'MLB:MLB9',reason:'SKU não informado pelo Mercado Livre'});
 assert.deepEqual(listingCost([row('KIT-XYZ','Kit Diverso','MLB9')],{}).state,'missing');
});

test('custo informado para anúncio sem regra passa a valer',()=>{
 assert.deepEqual(listingCost([row('ABC-1','Produto novo','MLB9')],{'SKU:ABC-1':12.9}),{state:'ok',cost:12.9,label:'Custo informado para o SKU ABC-1',editKey:'SKU:ABC-1',edited:true});
 assert.equal(listingCost([row('abc-1','Outro anúncio','MLB10')],{'SKU:ABC-1':12.9}).cost,12.9);
});

test('variações de produtos diferentes no mesmo anúncio não recebem custo único',()=>{
 assert.deepEqual(listingCost([row('MOL-3ZIP-PRT-G'),row('MOL-GOLA-P')],{}),{state:'mixed'});
 assert.deepEqual(listingCost([row('MOL-3ZIP-PRT-G'),row('ABC-1')],{}),{state:'mixed'});
});

test('chave de custo personalizada: SKU único ou MLB',()=>{
 assert.equal(customKey(['abc-1','ABC-1'],'MLB1'),'SKU:ABC-1');
 assert.equal(customKey(['A','B'],'MLB1'),'MLB:MLB1');
 assert.equal(customKey([''],'MLB1'),'MLB:MLB1');
});

test('só aceita chaves de produto conhecidas, SKU ou MLB',()=>{
 for(const k of ['BLUSA_3ZIP','SKU:ABC-1','MLB:MLB123'])assert.ok(validCostKey(k),k);
 for(const k of ['PRODUTO_X','SKU:','SKU:a b','MLB:123','__proto__','constructor',42,null])assert.ok(!validCostKey(k),String(k));
});

test('soma em centavos e peça sem custo deixa total ausente',()=>{
 assert.equal(compositionCost([{product:'A',quantity:3}],{A:0.1}),0.3);
 assert.equal(compositionCost([{product:'A',quantity:1},{product:'B',quantity:1}],{A:1}),null);
});
