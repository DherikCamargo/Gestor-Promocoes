// Campanhas do vendedor e anúncios por campanha, com Mercado Livre simulado.
// Executar com: pnpm test
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {listCampaigns,campaignItems,validCampaign} from '../lib/campaigns.ts';

const api=(pages)=>{const calls=[];return {calls,sellerId:'9',async get(path){calls.push(path);const r=pages.shift();if(r instanceof Error)throw r;return r??{results:[]}}}};

test('lista campanhas com paginação e descarta registros inválidos',async()=>{
 const a=api([
  {results:[{id:'P-MLB1806015',type:'MARKETPLACE_CAMPAIGN',status:'started',name:'Campanha v2',start_date:'2026-09-01T00:00:00Z',finish_date:'2026-10-01T00:00:00Z',deadline_date:'2026-09-30T00:00:00Z'},{id:'x',type:'SMART'}],paging:{offset:0,limit:50,total:3}},
  {results:[{id:'LGH-MLB1000',type:'LIGHTNING',status:'started'}],paging:{offset:2,limit:50,total:3}},
 ]);
 const c=await listCampaigns(a);
 assert.deepEqual(c.map(x=>x.id),['P-MLB1806015','LGH-MLB1000']);
 assert.equal(c[0].deadline,'2026-09-30T00:00:00Z');assert.equal(c[1].name,'LIGHTNING');
 assert.match(a.calls[0],/^\/seller-promotions\/users\/9\?app_version=v2&limit=50&offset=0$/);
 assert.equal(a.calls.length,2);
});

test('anúncios da campanha: segue search_after até acabar',async()=>{
 const a=api([
  {results:[{id:'MLB1',status:'candidate',price:100},{id:'MLB2',status:'started',price:90}],paging:{searchAfter:'abc'}},
  {results:[{id:'MLB3',status:'pending',price:80}],paging:{searchAfter:'def'}},
  {results:[],paging:{}},
 ]);
 const r=await campaignItems(a,'P-MLB18023020','SMART');
 assert.equal(r.complete,true);
 assert.deepEqual(r.items.map(i=>i.itemId+':'+i.status),['MLB1:candidate','MLB2:started','MLB3:pending']);
 assert.match(a.calls[1],/search_after=abc/);
});

test('paginação que não avança ou limite de páginas: incompleto',async()=>{
 const repete=api([{results:[{id:'MLB1',status:'candidate'}],paging:{searchAfter:'x'}},{results:[{id:'MLB2',status:'candidate'}],paging:{searchAfter:'x'}}]);
 assert.equal((await campaignItems(repete,'P-MLB1','SMART')).complete,false);
 const muitas=api(Array.from({length:5},(_,i)=>({results:[{id:'MLB'+i,status:'candidate'}],paging:{searchAfter:'c'+i}})));
 const r=await campaignItems(muitas,'P-MLB1','SMART',3);
 assert.equal(r.complete,false);assert.equal(r.items.length,3);
});

test('valida identificador e tipo da campanha',async()=>{
 for(const [id,t] of [['P-MLB1','SMART'],['LGH-MLB1000','LIGHTNING'],['C-MLB5281340','SELLER_COUPON_CAMPAIGN']])assert.ok(validCampaign(id,t),id);
 for(const [id,t] of [['P-MLB1','smart'],['../x','SMART'],['P-MLB1',''],[1,'SMART']])assert.ok(!validCampaign(id,t),String(id));
 await assert.rejects(campaignItems(api([]),'../x','SMART'));
});
