// Login pelo Cloudflare Access (hospedagem própria). O Access autentica antes da requisição
// chegar ao Worker e envia um JWT assinado em Cf-Access-Jwt-Assertion; aqui a assinatura, o
// emissor, a audiência e a validade são verificados. Nunca confiar só no cabeçalho de e-mail,
// que qualquer cliente poderia enviar.
export type AccessUser={userId:string;email:string};
type Jwk=JsonWebKey&{kid?:string};
const decoder=new TextDecoder();
function b64url(s:string):Uint8Array<ArrayBuffer>{
 const pad=s.replace(/-/g,'+').replace(/_/g,'/')+'==='.slice((s.length+3)%4);
 return Uint8Array.from(atob(pad),c=>c.charCodeAt(0));
}
function json(part:string):Record<string,unknown>|null{
 try{const v=JSON.parse(decoder.decode(b64url(part)));return v&&typeof v==='object'&&!Array.isArray(v)?v:null}catch{return null}
}
// Valida um JWT RS256 do Access contra as chaves públicas da equipe. Qualquer falha = null.
export async function verifyAccessJwt(token:string,o:{teamDomain:string;aud:string;keys:Jwk[];now?:number}):Promise<AccessUser|null>{
 const parts=token.split('.');
 if(parts.length!==3)return null;
 const header=json(parts[0]),payload=json(parts[1]);
 if(!header||!payload||header.alg!=='RS256'||typeof header.kid!=='string')return null;
 const jwk=o.keys.find(k=>k.kid===header.kid&&k.kty==='RSA');
 if(!jwk)return null;
 let valid=false;
 try{
  const key=await crypto.subtle.importKey('jwk',{kty:jwk.kty,n:jwk.n,e:jwk.e},{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
  valid=await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,b64url(parts[2]),new TextEncoder().encode(parts[0]+'.'+parts[1]));
 }catch{valid=false}
 if(!valid)return null;
 const now=Math.floor((o.now??Date.now())/1000),aud=Array.isArray(payload.aud)?payload.aud:[payload.aud];
 if(payload.iss!=='https://'+o.teamDomain||!aud.includes(o.aud))return null;
 if(typeof payload.exp!=='number'||payload.exp<=now)return null;
 if(typeof payload.nbf==='number'&&payload.nbf>now+60)return null;
 if(typeof payload.sub!=='string'||!payload.sub||typeof payload.email!=='string'||!payload.email)return null;
 // Prefixo separa donos do Access dos antigos donos do ChatGPT no mesmo formato de banco.
 return {userId:'cfa:'+payload.sub,email:payload.email};
}

let certs:{keys:Jwk[];until:number}|null=null;
async function teamKeys(teamDomain:string):Promise<Jwk[]>{
 if(certs&&certs.until>Date.now())return certs.keys;
 const res=await fetch('https://'+teamDomain+'/cdn-cgi/access/certs',{signal:AbortSignal.timeout(10000)});
 if(!res.ok)throw Error('Access certs unavailable');
 const body=await res.json() as {keys?:Jwk[]};
 if(!Array.isArray(body.keys)||!body.keys.length)throw Error('Access certs unavailable');
 certs={keys:body.keys,until:Date.now()+3600000};
 return certs.keys;
}
export async function accessUser(token:string|null,teamDomain:string,aud:string):Promise<AccessUser|null>{
 if(!token||!/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(teamDomain)||!aud)return null;
 const user=await verifyAccessJwt(token,{teamDomain,aud,keys:await teamKeys(teamDomain)});
 // Chave nova (rotação do Access): recarrega as chaves uma vez antes de recusar.
 if(!user&&certs){certs=null;return verifyAccessJwt(token,{teamDomain,aud,keys:await teamKeys(teamDomain)})}
 return user;
}
