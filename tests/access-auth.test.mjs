// Verificação do JWT do Cloudflare Access (login na hospedagem própria). Chaves geradas no teste.
// Executar com: pnpm test
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {verifyAccessJwt} from '../lib/access-auth.ts';

const team='gestor.cloudflareaccess.com',aud='aud-tag-123',now=1790000000000;
const {publicKey,privateKey}=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
const jwk={...await crypto.subtle.exportKey('jwk',publicKey),kid:'k1'};
const enc=o=>Buffer.from(JSON.stringify(o)).toString('base64url');
async function token(payload,header={alg:'RS256',kid:'k1'},key=privateKey){
 const body=enc(header)+'.'+enc(payload);
 const sig=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',key,new TextEncoder().encode(body));
 return body+'.'+Buffer.from(sig).toString('base64url');
}
const good={iss:'https://'+team,aud:[aud],sub:'user-1',email:'dono@example.com',exp:now/1000+600,iat:now/1000-10};
const check=t=>verifyAccessJwt(t,{teamDomain:team,aud,keys:[jwk],now});

test('token válido identifica o usuário com prefixo próprio',async()=>{
 assert.deepEqual(await check(await token(good)),{userId:'cfa:user-1',email:'dono@example.com'});
 assert.deepEqual(await check(await token({...good,aud})),{userId:'cfa:user-1',email:'dono@example.com'});
});

test('audiência, emissor ou validade errados são recusados',async()=>{
 assert.equal(await check(await token({...good,aud:['outra-app']})),null);
 assert.equal(await check(await token({...good,iss:'https://outra.cloudflareaccess.com'})),null);
 assert.equal(await check(await token({...good,exp:now/1000-1})),null);
 assert.equal(await check(await token({...good,exp:undefined})),null);
 assert.equal(await check(await token({...good,nbf:now/1000+3600})),null);
});

test('assinatura de outra chave, alteração do conteúdo ou algoritmo diferente são recusados',async()=>{
 const other=(await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign'])).privateKey;
 assert.equal(await check(await token(good,undefined,other)),null);
 const [h,,s]=(await token(good)).split('.');
 assert.equal(await check(h+'.'+enc({...good,sub:'invasor'})+'.'+s),null);
 assert.equal(await check(enc({alg:'none',kid:'k1'})+'.'+enc(good)+'.'),null);
 assert.equal(await check(await token(good,{alg:'RS256',kid:'desconhecida'})),null);
});

test('sem sub ou e-mail, ou token malformado, é recusado',async()=>{
 assert.equal(await check(await token({...good,sub:''})),null);
 assert.equal(await check(await token({...good,email:undefined})),null);
 for(const t of ['','a.b','a.b.c.d','!!.??.**'])assert.equal(await check(t),null);
});
