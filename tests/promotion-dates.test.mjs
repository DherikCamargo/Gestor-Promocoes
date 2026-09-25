// Datas das promoções: formatos da API, cobertura e alertas de período sem promoção.
// Executar com: pnpm test
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseMlDate,daysUntil,coverage} from '../lib/promotion-dates.ts';
import {classifyListing} from '../lib/promotion-board.ts';

const day=86400000,now=Date.parse('2026-09-25T12:00:00-03:00');

test('formatos de data da API: com fuso, UTC e sem fuso (Brasília)',()=>{
 assert.equal(parseMlDate('2026-09-11T02:00:00-03:00'),Date.parse('2026-09-11T05:00:00Z'));
 assert.equal(parseMlDate('2026-09-01T03:00:00Z'),Date.parse('2026-09-01T03:00:00Z'));
 assert.equal(parseMlDate('2026-08-28T00:00:00'),Date.parse('2026-08-28T03:00:00Z'));
 for(const s of [null,undefined,'','30/09/2026','2026-09-30'])assert.equal(parseMlDate(s),null);
});

test('dias até o fim',()=>{
 assert.equal(daysUntil(now+2.5*day,now),3);assert.equal(daysUntil(now+1,now),1);assert.equal(daysUntil(now-5,now),0);
});

test('termina em até 3 dias sem continuação: alerta',()=>{
 const c=coverage({status:'started',start:now-10*day,finish:now+2*day},[],now);
 assert.deepEqual(c,{state:'ending',until:now+2*day,days:2});
 assert.equal(coverage({status:'started',start:null,finish:now+10*day},[],now).state,'ok');
});

test('programada logo depois cobre o período: sem alerta',()=>{
 const c=coverage({status:'started',start:null,finish:now+day},[{start:now+day,finish:now+20*day}],now);
 assert.deepEqual(c,{state:'ok',until:now+20*day});
 // Programada que começa só 5 dias depois não cobre: continua o alerta.
 assert.equal(coverage({status:'started',start:null,finish:now+day},[{start:now+6*day,finish:now+20*day}],now).state,'ending');
});

test('só promoção programada para o futuro: sem promoção até ela começar',()=>{
 assert.deepEqual(coverage({status:'pending',start:now+4*day,finish:now+30*day},[],now),{state:'gap',from:now,until:now+4*day,days:4});
});

test('painel: datas nas ofertas, cobertura e próximas opções',()=>{
 const approved=(m)=>({status:'approved',price:100,margin:m,profit:100*m});
 const offers=[
  {id:'P-1',refId:'OFFER-1',type:'SMART',name:'Queima',status:'started',blockReason:'Já participando.',analysis:approved(0.09),start:'2026-09-11T02:00:00-03:00',finish:'2026-09-27T23:59:59-03:00'},
  {id:'P-2',refId:'CANDIDATE-MLB1-2',type:'SMART',name:'Outubro',status:'candidate',blockReason:null,analysis:approved(0.2),start:'2026-09-28T00:00:00-03:00',finish:'2026-10-31T23:59:59-03:00'},
  {id:'P-3',refId:'CANDIDATE-MLB1-3',type:'SMART',name:'Curta',status:'candidate',blockReason:null,analysis:approved(0.3),start:'2026-09-20T00:00:00-03:00',finish:'2026-09-26T23:59:59-03:00'},
 ];
 const r=classifyListing(offers,now);
 assert.equal(r.status,'active');
 assert.equal(r.active.coverage.state,'ending');assert.equal(r.active.coverage.days,3);
 assert.deepEqual(r.active.next.map(n=>n.name),['Outubro']);
 assert.equal(r.apt[0].start,Date.parse('2026-09-20T03:00:00Z'));
});
