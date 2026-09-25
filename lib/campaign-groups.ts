// Seções dos cards de promoções, com os títulos da Central (Tarefas e recomendações).
// A API não diz a qual card da Central cada campanha pertence: o grupo é deduzido pelo tipo.
// Ordem: primeiro o que o gestor ativa (co-participação e preços competitivos), cupons e Pix no fim.
export type CampaignGroup={key:string;title:string;subtitle:string;types:string[]};
export const campaignGroups:CampaignGroup[]=[
 {key:'descontos',title:'Impulsione seus descontos',subtitle:'Aproveite a redução de suas tarifas para melhorar seu preço.',types:['SMART','MARKETPLACE_CAMPAIGN']},
 {key:'competitividade',title:'Aumente sua competitividade',subtitle:'Ofereça um desconto melhor para que o preço seja mais atrativo.',types:['PRICE_MATCHING']},
 {key:'full',title:'Impulsione suas vendas do Full',subtitle:'Ofereça descontos para melhorar as vendas do seu estoque.',types:['UNHEALTHY_STOCK']},
 {key:'campanhas',title:'Participe das campanhas',subtitle:'Campanhas tradicionais (como o 10.10), descontos individuais, pré-acordados, por quantidade e do vendedor.',types:['DEAL','PRICE_DISCOUNT','PRE_NEGOTIATED','VOLUME','SELLER_CAMPAIGN']},
 {key:'relampago',title:'Participe da oferta relâmpago',subtitle:'Ofertas relâmpago e do dia: com estoque reservado e sem como desfazer depois de ativadas.',types:['LIGHTNING','DOD']},
 {key:'cupons',title:'Cupons e Pix',subtitle:'Cupons do vendedor e descontos por meio de pagamento.',types:['SELLER_COUPON_CAMPAIGN','BANK']},
];
const other:CampaignGroup={key:'outros',title:'Outras promoções',subtitle:'Tipos ainda não classificados pelo gestor.',types:[]};

export function groupOf(type:string):CampaignGroup{return campaignGroups.find(g=>g.types.includes(type))??other}

// Agrupa na ordem fixa das seções, omitindo seções vazias; dentro de cada uma mantém a ordem recebida.
export function groupCampaigns<T extends {type:string}>(list:T[]):(CampaignGroup&{items:T[]})[]{
 return [...campaignGroups,other].map(g=>({...g,items:list.filter(c=>groupOf(c.type)===g)})).filter(g=>g.items.length>0);
}
