// Cobre a correção da busca por código de família (CONTINUIDADE-BUSCA-FAMILIA.md).
// Executar com: pnpm test
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {listingSearch} from '../lib/listing-search.ts';

const familia='3191828129450127';
const catalogo=[
 {itemId:'MLB7000972334',title:'Conjunto Preto',sku:'CONJUNTO-PRETO-M',variation:'M'},
 {itemId:'MLB7000972334',title:'Conjunto Preto',sku:'CONJUNTO-PRETO-G',variation:'G'},
 {itemId:'MLB1234567890',title:'Camiseta Básica',sku:'445566',variation:'Única'},
];

test('código de família não vira MLB',()=>{
 const r=listingSearch(familia,catalogo);
 assert.deepEqual(r.entries,[]);
 assert.ok(!r.entries.some(e=>e.itemId==='MLB'+familia));
});

test('número não identificado gera orientação',()=>{
 assert.match(listingSearch(familia,catalogo).message,/código de família/);
});

test('MLB completo consulta diretamente, com ou sem hífen e em qualquer caixa',()=>{
 for(const q of ['MLB7000972334','mlb-7000972334',' Mlb7000972334 '])
  assert.deepEqual(listingSearch(q,[]),{entries:[{itemId:'MLB7000972334',title:'MLB7000972334'}],message:''});
});

test('número confirmado no catálogo resolve para o anúncio',()=>{
 assert.deepEqual(listingSearch('7000972334',catalogo).entries,[{itemId:'MLB7000972334',title:'Conjunto Preto'}]);
});

test('SKU numérico exato resolve para o anúncio',()=>{
 const r=listingSearch('445566',catalogo);
 assert.deepEqual(r.entries,[{itemId:'MLB1234567890',title:'Camiseta Básica'}]);
 assert.equal(r.message,'');
});

test('busca por nome ignora acentos e deduplica variações por MLB',()=>{
 assert.deepEqual(listingSearch('conjunto',catalogo).entries,[{itemId:'MLB7000972334',title:'Conjunto Preto'}]);
 assert.deepEqual(listingSearch('basica',catalogo).entries,[{itemId:'MLB1234567890',title:'Camiseta Básica'}]);
});

test('número sem catálogo importado não inventa MLB',()=>{
 const r=listingSearch('7000972334',[]);
 assert.deepEqual(r.entries,[]);
 assert.notEqual(r.message,'');
});
