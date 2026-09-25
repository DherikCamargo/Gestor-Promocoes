# Continuidade — fase 2, etapa B: adesão a promoções
24/09/2026. Base: main após PR #13 (publicação própria na Cloudflare).

Pedido de Dherik: ativar promoções dentro do gestor; diferencial: em anúncios com preço por variação, ativar todas as variações aptas com um clique.

## O que foi feito
- **Tipos suportados nesta versão** (preço definido pelo Mercado Livre, adesão reversível), conforme a documentação seller-promotions (09/06/2026):
  - SMART e PRICE_MATCHING: `POST /seller-promotions/items/{MLB}?app_version=v2` com `{promotion_id, promotion_type, offer_id = ref_id CANDIDATE-…}`.
  - MARKETPLACE_CAMPAIGN: mesmo endpoint com `{promotion_id, promotion_type}`.
  - Fora desta versão: DEAL e PRICE_DISCOUNT (o vendedor escolhe `deal_price`), LIGHTNING e DOD (com estoque e **irreversíveis**: "uma vez ativadas, não podem ser removidas"), PRE_NEGOTIATED (identificador da oferta a confirmar). A tela mostra "ative pela Central por enquanto".
- **lib/offer-report.ts**: a análise saiu da rota e virou função comum, usada igualmente pela tela e pela adesão.
- **lib/participation.ts**: `activationBlock` (candidata, tipo suportado, ids válidos, margem aprovada), `participationPayload` por tipo, `verifyParticipation` (mesma campanha, tipo e oferta; ativa ou programada; preço igual ao analisado, em centavos).
- **lib/participate.ts**: relê anúncio e ofertas, refaz a análise com custos e regras do banco, recusa sem enviar se algo mudou, registra "requested", envia, confere até 3 leituras (2 s entre elas) e registra o resultado: `confirmed`, `divergent` (preço aplicado diferente; também se a resposta do POST trouxer outro preço), `unverified` (aceito, mas não apareceu), `failed` (ML recusou) ou `refused` (não enviado).
- **/api/mercado-livre/promocoes/participar**: POST `{itemId, refId}`, um anúncio por pedido. Desligada se `PARTICIPATION_ENABLED` não for "true" ou fora da hospedagem própria (responde PARTICIPATION_PAUSED sem chamar o ML). Sem custos/regras do banco, recusa.
- **participation_log** (migração 0004): owner, item, campanha, tipo, ref_id, preço esperado e resultante (centavos), status, detalhe, data.
- **Tela**: botão Ativar nas ofertas aptas, com confirmação mostrando preço e margem; resultado fica visível (Ativada / Atenção: preço aplicado… / motivo). Em famílias com preço por variação, "Promoções da família" analisa as variações em sequência, agrupa por campanha e oferece "Ativar nas N variações aptas" com uma confirmação; cada variação é revalidada no servidor e recebe seu resultado.
- Anúncios com variações internas de **mesmo** preço (ex.: MLB3575190873, 27 SKUs) são um único MLB: o Ativar do anúncio cobre todas. Variações internas com preços **diferentes** continuam sem análise nem adesão.

## Validação
pnpm test 71/71 (9 novos em tests/participation.test.mjs com ML simulado: adesão confirmada com payload SMART; margem reprovada e tipo DEAL recusados sem envio; recusa do ML; preço divergente na conferência e na resposta; oferta que não aparece; outra conta e oferta sumida; regras por tipo; conferência por campanha/tipo/oferta). ESLint/tsc sem erros novos; build concluído. **Nenhuma adesão real foi feita nesta sessão.**

## Primeiro uso (autorizado pelo proprietário)
1. Merge do PR (publica com adesões desligadas).
2. GitHub → Settings → Variables → `PARTICIPATION_ENABLED=true` e rodar o workflow.
3. Primeiro teste em **um** anúncio/variação, conferindo o resultado com a Central (preço, status, subsídio). Só depois usar a ativação da família.
4. Se aparecer "Atenção: preço aplicado…" ou "unverified": conferir na Central; para desligar tudo, `PARTICIPATION_ENABLED=false` e rodar o workflow.

## Primeiro teste real — 25/09/2026
Autorizado por Dherik ("autorizo ligar as adesões"); PARTICIPATION_ENABLED=true publicado.
- Oferta SMART "Set26 | Top Sellers" (Co-participação), analisada pelo gestor: preço R$ 172,71, subsídio R$ 6,71, tarifa R$ 24,18 (14%) → líquida R$ 17,47, frete R$ 21,75, custo R$ 50, lucro R$ 41,31 (23,92%), Aprovada.
- Central após a adesão: "Com redução de tarifas", 11 a 30/set, **ATIVA**, R$ 172,71, "Reduzimos R$ 6,71", recebe R$ 133,49 = 172,71 − 17,47 − 21,75. Preço, subsídio e valor recebido **idênticos** ao analisado.
- Gestor mostrou "unverified" (aceito, mas não apareceu ativo): a conferência exigia ref_id igual ao offer_id devolvido pelo POST e fazia 3 leituras em ~4 s.

Correção: verifyParticipation aceita a oferta da mesma campanha e tipo, ativa/programada, com o preço esperado; o offer_id só desempata quando há mais de uma. 5 leituras (~10 s). participation_log guarda offer_id e preço da resposta e o resumo da campanha na última leitura. Botão "Conferir de novo" para resultados não confirmados (anúncio e família). Testes 72/72 (caso real incluído).

## Ativação por família validada — 25/09/2026
Após o PR #15, Dherik ativou uma família pelo "Ativar nas N variações aptas" e confirmou: "ativação por família está validada".

## Painel de promoções — 25/09/2026
Pedido: lista única do que ativar (opção B) e mostrar anúncios sem promoção.
- lib/promotion-board.ts: `classifyListing` por anúncio a partir da análise (mesmo `buildOfferReport` da tela e da adesão): `active` (oferta started/pending — fora do lote, para não trocar a promoção atual), `available` (sem promoção e com oferta candidata apta, maior margem primeiro) ou `none` (sem promoção; motivo: N ofertas sem aptidão ou nenhuma oferta do ML).
- app/promotions-board.tsx: seção recolhível "Painel de promoções" na página principal. "Analisar todos os anúncios" consulta /promocoes/analise de todos os MLBs importados, duas por vez, com progresso e botão Parar. Mostra: contagens; "Aptas para ativar" (uma promoção por anúncio, a de maior margem pré-marcada, marcar/desmarcar todos, "Ativar selecionadas (N)" com confirmação, uma adesão por vez pela mesma rota revalidada, resultado por anúncio); "Sem promoção" (com oferta apta ou o motivo); "Já em promoção" recolhido.
- Nada muda no servidor: a ativação em lote usa /promocoes/participar, que revalida cada anúncio.
- Testes: 76/76 (4 novos em tests/promotion-board.test.mjs). Sem teste visual (Windows). Nenhuma adesão real nesta etapa de desenvolvimento.
- Limite: com muitos anúncios a análise completa leva minutos (≈ 2 consultas simultâneas; cada uma faz várias chamadas ao ML).

## Datas das promoções no painel — 25/09/2026
Pedido de Dherik: ver as datas das promoções para que o anúncio não fique nenhum período sem promoção.
- lib/promotion-dates.ts: `parseMlDate` trata os três formatos vistos na API (com fuso, UTC "Z" e sem fuso = Brasília -03:00); `coverage` classifica a promoção atual: `ending` (termina em até 3 dias sem outra programada que comece até 1 dia depois do fim e vá além dele), `gap` (a única promoção é programada e começa no futuro) ou `ok` (com "coberto até"); `continuesAfter` para sugerir a próxima oferta.
- lib/promotion-board.ts: datas (ms) nas ofertas aptas e na promoção atual; `active.coverage` e `active.next` (aptas que continuam depois do fim da atual, maior margem primeiro).
- Painel: métrica "Podem ficar sem promoção"; seção de alerta com a data de término/início e as próximas opções (período, preço, margem); período em cada oferta apta; "Já em promoção" com período e "coberto até".
- Os anúncios em promoção continuam fora da ativação em lote: não está confirmado se aderir a outra campanha com uma ativa programa a nova para depois ou troca a atual. Próximo passo sugerido: testar com um único anúncio que esteja no alerta.
- Testes: 82/82 (6 novos em tests/promotion-dates.test.mjs).

## Ajuste — 25/09/2026
A pedido de Dherik, a seção "Sem promoção" deixou de repetir os anúncios que já aparecem em "Aptas para ativar": agora é "Sem promoção e sem oferta apta", só com os que não têm nenhuma oferta apta e o motivo.

## Cards de promoções — 25/09/2026
Pedido de Dherik: tirar os cards de filtro da lista (Todos, Em promoção, Preço por variação, Com falha, Sem custo) e mostrar um card por promoção disponível no Mercado Livre; ao clicar, os anúncios e variações aptos, com "ativar todas" ou "só as selecionadas".
- lib/campaigns.ts: `listCampaigns` (GET /seller-promotions/users/{seller}?app_version=v2, paginação offset, até 4 páginas) e `campaignItems` (GET /seller-promotions/promotions/{id}/items?promotion_type=…&app_version=v2&limit=50, paginação search_after — lida em paging.searchAfter/search_after ou no topo —, até 20 páginas; cursor repetido ou limite = lista parcial). Ids e tipos validados.
- Rotas: /api/mercado-livre/promocoes/campanhas e /campanhas/itens?promotionId&type (somente leitura). /promocoes/analise aceita `promotionId` para analisar só aquela promoção (menos consultas).
- app/campaign-cards.tsx: cards com nome da API, tipo, período, prazo para aderir ("aderir até"), disponíveis e participando (contagens carregadas duas por vez, por causa do limite de subrequisições do Worker). Ao clicar: analisa só a promoção em cada candidato (duas por vez), aptas pré-marcadas, "Ativar todas as aptas (N)" e "Ativar selecionadas (N)" com confirmação, resultado por anúncio; lista recolhida dos já participantes. Tipos fora de SMART/PRICE_MATCHING/MARKETPLACE_CAMPAIGN mostram análise, sem ativação.
- A lista de anúncios perdeu os cards de filtro; a busca continua. O Painel de promoções (datas e alertas) continua.
- Nomes dos cards são os da API (ex.: "Set26 | Top Sellers", "10.10"); textos como "Aumente sua competitividade" podem ser rótulos da Central, não o nome da campanha — confirmar após publicar.
- Testes: 86/86 (4 novos em tests/campaigns.test.mjs). Sem teste visual; sem consulta real nesta etapa.

## Cards agrupados como na Central — 25/09/2026
Comparação de Dherik com "Tarefas e recomendações" da Central. Cards agora em seções (lib/campaign-groups.ts, grupo deduzido pelo tipo, pois a API não informa o card da Central): Impulsione seus descontos (SMART, MARKETPLACE_CAMPAIGN) · Aumente sua competitividade (PRICE_MATCHING) · Impulsione suas vendas do Full (UNHEALTHY_STOCK) · Participe das campanhas (DEAL, PRICE_DISCOUNT, PRE_NEGOTIATED, VOLUME, SELLER_CAMPAIGN) · Participe da oferta relâmpago (LIGHTNING, DOD) · Cupons e Pix (SELLER_COUPON_CAMPAIGN, BANK) · Outras. Dentro da seção, mais disponíveis primeiro. Cabeçalho com total de promoções e de anúncios disponíveis; o painel da promoção abre dentro da seção. Tipos traduzidos: UNHEALTHY_STOCK, BANK; campanha sem nome (relâmpago) mostra o tipo traduzido.
Observação: as contagens da Central ("34 eleg." em Aumente sua competitividade) não batem com as da API (14 em preços competitivos); a Central pode juntar tipos, contar variações ou anúncios pausados, e a API lista só anúncios ativos. Testes 88/88.

## Motivo quando não há margem — 25/09/2026
Dherik viu "—" na margem em vários anúncios (relâmpago e outros tipos). Causa: o gestor não calcula a margem quando a oferta tem preço contraditório (fora do mínimo/máximo do próprio ML — ex.: MLB7000985086 a R$ 180,48, o mesmo padrão do incidente), não tem preço nem sugestão, ou o anúncio tem variações internas com preços diferentes. Nos cards, o aviso "ative pela Central" escondia esse motivo. Agora a coluna mostra "Sem margem: <motivo>" (ou "Faltam dados: …"), e a mensagem de preço contraditório ficou explícita. Testes 89/89.

## Oferta relâmpago sem margem e promoção atual nos cards — 25/09/2026
Comparação de Dherik no MLB3801049271: oferta relâmpago no gestor R$ 172,07 (margem 19,96%) × Central R$ 168,74 (R$ 239,90 − R$ 71,16), recebe R$ 123,37. Segundo caso em que o preço LIGHTNING da API (/seller-promotions/items) não confere com a Central (o primeiro foi o incidente: 180,48 × 164,12). offerTerms passa a recusar LIGHTNING com o motivo "o preço da oferta relâmpago informado pela API não confere com a Central"; a margem não é calculada. Ativação de LIGHTNING já era pela Central.
/promocoes/analise devolve currentPromotion (oferta started/pending de outra campanha); nos cards cada anúncio mostra "Em promoção: <nome> até DD/MM". No mesmo print, a Central oferecia a continuação "Com redução de tarifas 25/set a 25/out" (R$ 172,71, reduz R$ 1,34).
Pendente para ofertas relâmpago: verificar se /seller-promotions/candidates/{ref_id} (conferência relâmpago em /diagnostico) traz o preço da Central. Testes 90/90.

## Cards compactos — 25/09/2026
A pedido de Dherik (cards ocupando muito espaço): todos os cards numa grade única e compacta (mín. 170 px), na ordem das seções; a seção virou etiqueta no card (azul = o gestor ativa, cinza = pela Central); cada card mostra nome (até 2 linhas), "N disp. · M part." e datas; tipo e aviso completos no título ao passar o mouse. O painel da promoção abre abaixo da grade.

## Painel de promoções removido — 25/09/2026
A pedido de Dherik, com os cards de promoções o "Painel de promoções" deixou de ser necessário: removidos app/promotions-board.tsx, lib/promotion-board.ts, lib/promotion-dates.ts e seus testes. Com ele saiu o alerta "Podem ficar sem promoção" (término em até 3 dias sem continuação); o código fica no histórico do Git (PRs #16 e #17) se for preciso levá-lo para os cards. Testes 80/80.

## Escolher o preço: campanha tradicional e desconto individual — 25/09/2026
Pedido de Dherik: onde aparecia "Neste tipo você escolhe o preço… ative pela Central", poder digitar/escolher o preço. Decisão: primeiro DEAL e PRICE_DISCOUNT (reversíveis); LIGHTNING e DOD (irreversíveis, relâmpago com estoque e preço da API divergente da Central) num segundo passo.
Contratos (documentação 09/06/2026): DEAL `{promotion_id, promotion_type:'DEAL', deal_price}` dentro de min/max da campanha; PRICE_DISCOUNT `{deal_price, start_date, finish_date, promotion_type}` (datas sem fuso, Brasília; até 14 dias; desconto de 5% a < 80%; página real /pt_br/desconto-individua). A oferta PRICE_DISCOUNT vem sem id nem ref_id: chave "PRICE_DISCOUNT" (`offerKey`).
- lib/participation.ts: `structuralBlock` (status, tipo, ids; LIGHTNING/DOD bloqueados), `activationBlock` (+ margem), `priceChoiceProblem`, `discountDates`, `participationPayload(o, choice)`, `verifyParticipation` aceita promotionId nulo (confere pelo tipo).
- lib/offer-report.ts: `key` e `priceChoice` (min, max, preço original, sugerido) nas ofertas de preço escolhido; `priceFor` analisa a oferta no preço digitado (limites conferidos antes).
- lib/participate.ts: `choice {price, days}`; bloqueio estrutural antes das regras de preço; exige preço nos tipos de preço escolhido e recusa preço nos de preço do ML; refaz a análise no preço escolhido, exige Aprovada, envia o payload do tipo e confere o preço aplicado.
- Rotas: /promocoes/analise aceita `price` (com promotionId = id, ref_id ou PRICE_DISCOUNT) para a prévia; /promocoes/participar aceita `price` e `days` (1–14).
- Tela: `PriceChooser` (campo de preço com o sugerido, faixa aceita, desconto e duração no individual, prévia da margem no servidor a cada alteração com espera de 0,6 s, "Ativar por R$ X" só com margem aprovada, confirmação). No painel Promoções do anúncio e nos cards (botão "Escolher preço" por anúncio; sem ativação em lote nesses tipos). Etiqueta azul também para esses tipos.
- Testes 86/86 (8 novos). Sem teste visual; nenhuma adesão real com preço escolhido ainda — primeiro uso em um anúncio, conferindo na Central.

## Aba "Sem promoção" — 25/09/2026
Pedido de Dherik: aba com anúncios sem promoção, só no preço bruto.
- lib/sale-state.ts: `saleState(sale_price)` = promotion (regular_amount > amount), regular (preço normal) ou unknown (sem preço: nunca contado como sem promoção).
- /api/mercado-livre/anuncios/sem-promocao?ids= (até 20 MLBs, cinco consultas por vez, só leitura).
- Lista com abas "Todos os anúncios" e "Sem promoção (N)": ao abrir a aba, consulta o sale_price de todos os anúncios em lotes de 20 e mostra os que vendem no preço normal (variações de família em linhas próprias), com a mesma linha da lista (preço, tarifa, frete, custo e botão Promoções). "Consultar de novo" refaz; anúncios sem preço informado são contados à parte.
- Testes 83/83 (3 novos).
