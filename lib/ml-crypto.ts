export function b64(bytes:Uint8Array):string{return btoa(String.fromCharCode(...bytes)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"")}
export function unb64(s:string):Uint8Array<ArrayBuffer>{return Uint8Array.from(atob(s.replace(/-/g,"+").replace(/_/g,"/")),c=>c.charCodeAt(0))}
export const random=()=>b64(crypto.getRandomValues(new Uint8Array(32)));
export const hash=async(s:string)=>b64(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s))));
async function key(value:string){const bytes=unb64(value);if(bytes.length!==32)throw Error("Encryption unavailable");return crypto.subtle.importKey("raw",bytes,"AES-GCM",false,["encrypt","decrypt"])}
export async function seal(value:string,secret:string,context:string){const iv=crypto.getRandomValues(new Uint8Array(12));const cipher=await crypto.subtle.encrypt({name:"AES-GCM",iv,additionalData:new TextEncoder().encode(context)},await key(secret),new TextEncoder().encode(value));return b64(iv)+"."+b64(new Uint8Array(cipher))}
export async function unseal(value:string,secret:string,context:string){const [iv,cipher]=value.split(".");return new TextDecoder().decode(await crypto.subtle.decrypt({name:"AES-GCM",iv:unb64(iv),additionalData:new TextEncoder().encode(context)},await key(secret),unb64(cipher)))}
