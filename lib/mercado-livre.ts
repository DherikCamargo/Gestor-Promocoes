import {env} from "cloudflare:workers";
import {headers} from "next/headers";
import {getChatGPTUser} from "@/app/chatgpt-auth";
import {accessUser} from "./access-auth";
// Hospedagem: sem variáveis = ChatGPT Sites (login ChatGPT); AUTH_MODE=cloudflare-access = Cloudflare própria,
// onde só o JWT do Access é aceito (cabeçalhos oai-* seriam falsificáveis fora do Sites).
const hosting=env as unknown as {AUTH_MODE?:string;PUBLIC_ORIGIN?:string;CF_ACCESS_TEAM_DOMAIN?:string;CF_ACCESS_AUD?:string};
export const ACCESS_MODE=hosting.AUTH_MODE==="cloudflare-access";
export const ORIGIN=hosting.PUBLIC_ORIGIN||"https://gestor-promocoes-dherik.dherikjcamargo.chatgpt.site";
export const REDIRECT=ORIGIN+"/integracoes/mercado-livre/retorno";
export const COOKIE="__Host-ml-oauth";
export function runtime(){const e=env as unknown as {DB:D1Database;ML_ENCRYPTION_KEY:string;ML_CLIENT_ID:string};if(!e.DB||!e.ML_ENCRYPTION_KEY||!e.ML_CLIENT_ID)throw Error("Configuration unavailable");return e}
async function currentUser(){if(!ACCESS_MODE)return getChatGPTUser();return accessUser((await headers()).get("cf-access-jwt-assertion"),hosting.CF_ACCESS_TEAM_DOMAIN??"",hosting.CF_ACCESS_AUD??"")}
export async function actor(request?:Request){const u=await currentUser();if(!u)throw Error("Unauthenticated");if(request&&request.headers.get("origin")!==ORIGIN)throw Error("Invalid origin");return u.userId}
export function json(data:unknown,status=200){return Response.json(data,{status,headers:{"Cache-Control":"no-store","Referrer-Policy":"no-referrer"}})}
export type Account={owner:string;secret:string;tokens:string|null;seller_id:string|null;nickname:string|null;expires_at:number|null;updated_at:number};
export async function account(owner:string){return runtime().DB.prepare("SELECT * FROM ml_accounts WHERE owner = ?").bind(owner).first<Account>()}
export function back(result:string){return new Response(null,{status:303,headers:{Location:ORIGIN+"/?conexao="+result,"Cache-Control":"no-store","Referrer-Policy":"no-referrer","Set-Cookie":COOKIE+"=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0"}})}
