// Verificação do formato da chave de criptografia usada no workflow (valores gerados no teste).
// Executar com: pnpm test
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {encryptionKeyProblems} from '../scripts/check-encryption-key.mjs';

const key=randomBytes(32).toString('base64url');

test('chave gerada pelo comando do guia é válida',()=>{
 assert.deepEqual(encryptionKeyProblems(key),[]);
});

test('erros comuns ao colar a chave são apontados sem mostrar o valor',()=>{
 assert.deepEqual(encryptionKeyProblems(''),['segredo vazio ou não configurado']);
 assert.deepEqual(encryptionKeyProblems(key+'\n'),['contém espaço ou quebra de linha']);
 assert.deepEqual(encryptionKeyProblems('"'+key+'"'),['contém aspas']);
 assert.ok(encryptionKeyProblems(key.slice(0,20)).some(p=>p.startsWith('decodifica para 15 bytes')));
 assert.ok(encryptionKeyProblems('node -e "console.log(...)"').includes('contém caracteres fora de base64url'));
 for(const p of encryptionKeyProblems(key.slice(0,20)))assert.ok(!p.includes(key.slice(0,20)));
});
