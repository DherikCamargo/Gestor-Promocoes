// Seções dos cards de promoções.
// Executar com: pnpm test
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {groupCampaigns,groupOf} from '../lib/campaign-groups.ts';

// Tipos vistos na conta em 25/09/2026.
const conta=[
 {id:'C-1',type:'SELLER_COUPON_CAMPAIGN',name:'Cupom para carrinhos abandonados'},
 {id:'P-1',type:'DEAL',name:'10.10'},
 {id:'P-2',type:'SMART',name:'Set26 | Top Sellers'},
 {id:'LGH-1',type:'LIGHTNING',name:'LIGHTNING'},
 {id:'P-3',type:'PRICE_MATCHING',name:'Saia na frente da concorrência'},
 {id:'P-4',type:'UNHEALTHY_STOCK',name:'Acelere suas vendas do Full'},
 {id:'P-5',type:'BANK',name:'Desconto no Pix'},
 {id:'P-6',type:'SMART',name:'Queima de inverno Full'},
 {id:'P-7',type:'NOVO_TIPO',name:'Algo novo'},
];

test('seções na ordem da Central, com o que o gestor ativa primeiro',()=>{
 const g=groupCampaigns(conta);
 assert.deepEqual(g.map(x=>x.title),['Impulsione seus descontos','Aumente sua competitividade','Impulsione suas vendas do Full','Participe das campanhas','Participe da oferta relâmpago','Cupons e Pix','Outras promoções']);
 assert.deepEqual(g[0].items.map(c=>c.name),['Set26 | Top Sellers','Queima de inverno Full']);
 assert.deepEqual(g[5].items.map(c=>c.id),['C-1','P-5']);
});

test('seções vazias não aparecem; tipo desconhecido vai para Outras',()=>{
 assert.deepEqual(groupCampaigns([{type:'SMART'}]).map(x=>x.key),['descontos']);
 assert.equal(groupOf('NOVO_TIPO').key,'outros');
 assert.equal(groupOf('DOD').key,'relampago');
});
