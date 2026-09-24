// Exportação integral da oferta ativa na conferência (diagnóstico).
// Executar com: pnpm test
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fullRecord} from '../lib/promotion-evidence.ts';

test('mantém campos desconhecidos, inclusive aninhados',()=>{
 const oferta={id:'P-1',meli_percentage:3.5,campo_novo:6.91,detalhe:{valor:1,lista:[{a:2}]},vazio:null};
 assert.deepEqual(fullRecord(oferta),oferta);
});

test('descarta chaves com aparência de credencial em qualquer nível',()=>{
 assert.deepEqual(fullRecord({id:'P-1',access_token:'x',meta:{Authorization:'Bearer y',refreshToken:'z',ok:true}}),{id:'P-1',meta:{ok:true}});
});

test('limita profundidade, tamanho de listas e valores não serializáveis',()=>{
 let fundo={v:1};for(let i=0;i<10;i++)fundo={f:fundo};
 assert.ok(!JSON.stringify(fullRecord(fundo)).includes('"v":1'));
 assert.equal(fullRecord(Array.from({length:80},(_,i)=>i)).length,50);
 assert.deepEqual(fullRecord({n:Number.NaN,u:undefined,fn:()=>1}),{n:null,u:null,fn:null});
});
