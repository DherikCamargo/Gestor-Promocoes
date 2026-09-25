// Classificação de anúncios para o Painel de promoções.
// Executar com: pnpm test
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {classifyListing} from '../lib/promotion-board.ts';

const analysis=(margin,status='approved',price=100)=>({status,price,margin,profit:price*margin});
const offer=(o)=>({id:'P-MLB1',refId:'CANDIDATE-MLB1-1',type:'SMART',name:'Campanha',status:'candidate',blockReason:null,analysis:analysis(0.1),...o});

test('sem promoção e com ofertas aptas: disponível, maior margem primeiro',()=>{
 const r=classifyListing([offer({refId:'CANDIDATE-MLB1-1',name:'A',analysis:analysis(0.05)}),offer({refId:'CANDIDATE-MLB1-2',name:'B',analysis:analysis(0.2)})]);
 assert.equal(r.status,'available');
 assert.deepEqual(r.apt.map(a=>a.name),['B','A']);
 assert.equal(r.candidates,2);
});

test('já em promoção (ativa ou programada): fica fora da ativação em lote',()=>{
 const r=classifyListing([offer({status:'started',name:'Queima',analysis:analysis(0.09,'approved',109),blockReason:'Já participando.'}),offer({})]);
 assert.equal(r.status,'active');assert.equal(r.active.name,'Queima');assert.equal(r.active.price,109);
 assert.equal(classifyListing([offer({status:'pending',blockReason:'Adesão já programada.'})]).status,'active');
});

test('ofertas sem aptidão (margem, bloqueio ou falta de dados) não entram',()=>{
 const r=classifyListing([
  offer({analysis:analysis(0.01,'attention'),blockReason:'Margem abaixo do mínimo.'}),
  offer({type:'DEAL',blockReason:'ative pela Central'}),
  offer({analysis:{status:'missing',price:100,margin:null,profit:null},blockReason:'Faltam dados'}),
 ]);
 assert.equal(r.status,'none');assert.match(r.reason,/3 ofertas disponíveis, nenhuma apta/);
});

test('sem nenhuma oferta do Mercado Livre',()=>{
 const r=classifyListing([]);
 assert.equal(r.status,'none');assert.match(r.reason,/não ofereceu nenhuma promoção/);
 assert.equal(classifyListing([offer({blockReason:'x'})]).reason,'1 oferta disponível, nenhuma apta (margem, dados ou tipo não suportado).');
});
