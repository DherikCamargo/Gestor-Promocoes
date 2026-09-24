// Confere o formato de ML_ENCRYPTION_KEY sem nunca exibir o valor: lib/ml-crypto.ts exige
// 32 bytes em base64url. Usado pelo workflow de publicação antes do build.
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
export function encryptionKeyProblems(key){
 const problems=[];
 if(!key)return ['segredo vazio ou não configurado'];
 if(/\s/.test(key))problems.push('contém espaço ou quebra de linha');
 if(/["']/.test(key))problems.push('contém aspas');
 const core=key.trim().replace(/["']/g,'');
 if(/[^A-Za-z0-9_-]/.test(core))problems.push('contém caracteres fora de base64url');
 const bytes=Buffer.from(core,'base64url').length;
 if(bytes!==32)problems.push('decodifica para '+bytes+' bytes (esperado 32)');
 return problems;
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===resolve(process.argv[1])){
 const problems=encryptionKeyProblems(process.env.ML_ENCRYPTION_KEY??'');
 if(problems.length){
  console.log('ML_ENCRYPTION_KEY inválida: '+problems.join('; ')+'. Gere de novo (PUBLICACAO-CLOUDFLARE.md, passo 5) e substitua o segredo no GitHub.');
  process.exit(1);
 }
 console.log('ML_ENCRYPTION_KEY válida (32 bytes).');
}
