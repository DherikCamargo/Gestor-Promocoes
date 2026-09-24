import {runtime} from './mercado-livre';
import {validCostKey} from './product-costs';
import {defaultRules,parseRules,type MarginRules} from './offer-analysis';
// Configurações por conta guardadas no banco do site: custos editados e regras de margem.
export async function loadCostOverrides(owner:string):Promise<Record<string,number>>{
 const {results}=await runtime().DB.prepare('SELECT product,cost_cents FROM product_costs WHERE owner=?').bind(owner).all<{product:string;cost_cents:number}>();
 return Object.fromEntries(results.filter(r=>validCostKey(r.product)).map(r=>[r.product,r.cost_cents/100]));
}
// Regras salvas inválidas ou ausentes voltam aos padrões; edited diz qual caso ocorreu.
export async function loadRules(owner:string):Promise<{rules:MarginRules;edited:boolean}>{
 const row=await runtime().DB.prepare('SELECT rules FROM margin_rules WHERE owner=?').bind(owner).first<{rules:string}>();
 let parsed:MarginRules|null=null;
 try{parsed=row?parseRules(JSON.parse(row.rules)):null}catch{parsed=null}
 return parsed?{rules:parsed,edited:true}:{rules:defaultRules,edited:false};
}
