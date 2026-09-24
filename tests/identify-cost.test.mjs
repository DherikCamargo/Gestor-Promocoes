// Fixa o resultado de cada regra de custo existente (lib/ml-catalog.ts) para que a
// reorganização em produtos e composições não altere nenhum custo.
// Executar com: pnpm test
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {identifyCost} from '../lib/ml-catalog.ts';

const cases=[
 ['KIT-2-SHORT-LINHO','Kit 2 Shorts Linho Feminino',{cost:34,costReason:'Kit com 2 shorts de linho'}],
 ['KIT-2-3ZIP-PRT','Kit 2 Blusas 3 Zíper',{cost:84,costReason:'Kit com 2 blusas 3 zíper'}],
 ['KIT04-3ZIP','Kit 4 Blusas',{cost:168,costReason:'Kit com 4 blusas 3 zíper'}],
 ['KIT03-SORTIDO','Kit 3 Moletons',{cost:126,costReason:'KIT03 confirmado: 3 blusas 3 zíper'}],
 ['KIT-BLUSA-2-CALCAS','Kit Moletom Blusa 2 Calças',{cost:94,costReason:'Kit com 1 blusa e 2 calças'}],
 ['KIT-MOL-CAM','Kit Moletom e Camiseta',{cost:54,costReason:'Kit com 1 moletom e 1 camiseta'}],
 ['KIT-XYZ','Kit Diverso',{cost:null,costReason:'Conferir composição e custo'}],
 ['CONJ-PRT-M','Conjunto Moletom',{cost:68,costReason:'Conjunto identificado pelo SKU / anúncio'}],
 ['XPTO','Conjunto Blusa e Calça',{cost:68,costReason:'Conjunto identificado pelo SKU / anúncio'}],
 ['SUT-PLUS-G','Sutiã',{cost:33,costReason:'Sutiã Plus Size'}],
 ['SUT-44','Sutiã Plus Size Renda',{cost:33,costReason:'Sutiã Plus Size'}],
 ['SHORT-LINH-M','Short Linho',{cost:17,costReason:'Short de linho'}],
 // Comportamento atual (a confirmar com Dherik): 'SHORT-LINHO-...' não casa com /^SHORT-LINH?(-|$)/.
 ['SHORT-LINHO-M','Short Linho',{cost:20,costReason:'Short (demais modelos)'}],
 ['SHORT-JEANS','Short Jeans',{cost:20,costReason:'Short (demais modelos)'}],
 ['MOL-3ZIP-PRT-G','Blusa de Frio',{cost:42,costReason:'Prefixo 3ZIP / MOL-3ZIP'}],
 ['3ZIP-BEG-M','Blusa',{cost:42,costReason:'Prefixo 3ZIP / MOL-3ZIP'}],
 ['MOL-GOLA-P','Moletom Gola',{cost:50,costReason:'Moletom de gola'}],
 ['VEST-MIDI-P','Vestido Canelado',{cost:20,costReason:'Vestido canelado'}],
 ['024-PRETO-38','Coturno Adventure',{cost:150,costReason:'Coturno Adventure'}],
 ['024-PRETO-38','Sandália',{cost:null,costReason:'SKU ainda sem regra de custo'}],
 ['ABC-123','Produto novo',{cost:null,costReason:'SKU ainda sem regra de custo'}],
 ['','Produto sem SKU',{cost:null,costReason:'SKU não informado pelo Mercado Livre'}],
];

test('cada regra de custo existente mantém custo e motivo',()=>{
 for(const [sku,title,expected] of cases)assert.deepEqual(identifyCost(sku,title),expected,sku+' / '+title);
});

test('sutiã plus size identificado pelo MLB específico',()=>{
 assert.deepEqual(identifyCost('','Soutien Plus Size Renda','MLB5662406564'),{cost:33,costReason:'Sutiã Plus Size'});
 assert.deepEqual(identifyCost('','Soutien Plus Size Renda','MLB1'),{cost:null,costReason:'SKU não informado pelo Mercado Livre'});
});
