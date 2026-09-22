import {env} from "cloudflare:workers";
import {getChatGPTUser} from "@/app/chatgpt-auth";
export const ORIGIN="https://gestor-promocoes-dherik.dherikjcamargo.chatgpt.site";
export const REDIRECT=ORIGIN+"/integracoes/mercado-livre/retorno";
export const COOKIE="__Host-ml-oauth";
export function runtime(){const e=env as unknown as {DB:D1Database;ML_ENCRYPTION_KEY:string;ML_CLIENT_ID:string};if(!e.DB||!e.ML_ENCRYPTION_KEY||!e.ML_CLIENT_ID)throw Error("Configuration unavailable");return e}
export async function actor(request?:Request){const u=await getChatGPTUser();if(!u)throw Error("Unauthenticated");if(request&&request.headers.get("origin")!==ORIGIN)throw Error("Invalid origin");return u.userId}
export function json(data:unknown,status=200){return Response.json(data,{status,headers:{"Cache-Control":"no-store","Referrer-Policy":"no-referrer"}})}
export type Account={owner:string;secret:string;tokens:string|null;seller_id:string|null;nickname:string|null;expires_at:number|null;updated_at:number};
export async function account(owner:string){return runtime().DB.prepare("SELECT * FROM ml_accounts WHERE owner = ?").bind(owner).first<Account>()}
export function back(result:string){return new Response(null,{status:303,headers:{Location:ORIGIN+"/?conexao="+result,"Cache-Control":"no-store","Referrer-Policy":"no-referrer","Set-Cookie":COOKIE+"=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0"}})}
