# Continuidade — Gestor de Promoções v32

Atualizado em 22/09/2026. Esta seção prevalece sobre o histórico v31 abaixo.

## Publicação atual
- Site: https://gestor-promocoes-dherik.dherikjcamargo.chatgpt.site
- Project ID: appgprj_6aac200bdf848191b756d03df83a8777
- Versão: 32, publicação concluída em 2026-09-22T19:30:37Z, público preservado.
- Commit: 7678cc95daf1b3b255ccb81de462d1dab2e92ad9
- Version ID: appgprj_6aac200bdf848191b756d03df83a8777~appgver_aa5e5df28c7c8191b11828dac270ee34
- Deployment ID: appgdep_6ab2d746dc1081918243f383078cc48e
- Checkout: /workspace/scratch/f7656e7385b9/gestor-promocoes
- Repositório: https://git.chatgpt-team.site/907c8c16-bcaf-4b89-baa1-abe5a79fda77/appgprj_6aac200bdf848191b756d03df83a8777.git

## Solicitação atual e mudança realizada
O usuário pediu simplificar o gestor por enquanto: somente nome e MLB do anúncio, preço normal e promocional, tipo (Clássico/Premium) e frete. Sem fotos, estoque, preços de atacado ou outras informações.

A página / agora contém busca por nome/MLB/SKU, atualizar anúncios, resultados compactos e configuração de conexão recolhida. Nenhum anúncio aparece antes de buscar. Os resultados são deduplicados por MLB, consultados sequencialmente em lotes de seis; Mostrar mais mantém acesso aos demais resultados. Busca por MLB completo ou número funciona mesmo sem importação; nome/SKU usa catálogo importado. Layout em quatro colunas no desktop e reflow em telas menores.

A página anterior foi preservada em /diagnostico (sem link na página principal para evitar poluição visual). Os componentes, importação, regras de custo e cálculos anteriores continuam no código. A tela principal não monta Promotions nem dispara consulta de campanhas/famílias.

## Arquivos alterados/adicionados
- app/page.tsx: página principal mínima.
- app/simple-catalog.tsx: busca/importação e apresentação compacta.
- app/diagnostico/page.tsx: cópia da página anterior, imports ajustados.
- app/api/mercado-livre/anuncios/resumo/route.ts: endpoint GET autenticado de resumo por MLB.
- lib/listing-summary.ts: validação e interpretação de preço/frete.
- app/globals.css: layout responsivo da tela simplificada.

## Origem dos valores e limites
1. /items/{MLB}?include_attributes=all valida identidade e seller_id contra conta conectada.
2. /items/{MLB}/sale_price?context=channel_marketplace fornece amount, regular_amount e currency_id. Não usa preço de proposta, min/max/suggested ou catálogo antigo como preço atual.
3. Quando regular_amount > amount (em centavos), exibe normal e promoção. Sem regular_amount maior, exibe amount como preço normal e Sem promoção informada. Não afirma inexistência universal de promoções.
4. Se sale_price falhar, valores ficam Não informado. Não transforma ausência em zero.
5. Para anúncio com variações internas de preços diferentes (ou incompletas), exibe Varia por opção e não atribui preço/frete único. Ainda NÃO há seletor para consultar individualmente essas variações internas; esta é uma limitação explícita. Novos anúncios de preço por variação representados por MLBs distintos são consultados separadamente.
6. Frete consulta /users/{sellerId}/shipping_options/free com item_id, item_price=currentPrice, free_shipping e verbose=true, somente para ME2 e preço confirmado. Extrai apenas coverage.all_country.list_cost na moeda correta. Não usa máximo recursivo nem regra fixa de R$9 nesta tela; não desconta duas vezes eventual desconto. Exibe Estimativa do ML, pois documentação descreve cotação aproximada, não custo final de um pedido. Falha/ausência = Não informado. Se shipping.free_shipping=true, indica Grátis para o comprador separadamente.
7. Nenhuma consulta autenticada real de preço/frete foi executada nesta sessão pelo assistente. O usuário precisa buscar no site conectado para validar contra a Central. Não prometer equivalência exata comprovada.
8. Documentação usada: https://developers.mercadolivre.com.br/pt_br/atributos/custos-de-envio (resposta indexada oficial, atualização 20/04/2026). coverage.all_country.list_cost já é custo oferecido ao vendedor; options.list_cost de shipping_options de comprador é outro campo, não usado.

## Segurança e verificações
- POST /promocoes/participar segue retornando PARTICIPATION_PAUSED/503 e não chama ML. Não reabrir sem autorização específica e validação das divergências.
- Esta alteração não inscreveu nem removeu anúncios de campanhas.
- git diff --check passou; build Vinext/Workers passou; arquivo de deploy validado com gzip -t; deploy succeeded.
- Oito verificações locais passaram: promoção normal/ativa, ausência de sale_price, ausência de promoção, variações com preços diferentes, moeda diferente, campo exato de frete, exclusão de campos de comprador e frete zero válido.
- Não houve QA visual em navegador nem validação autenticada contra conta real.

## Pendências para próxima IA
- Prioridade atual é a tela simplificada. Não recolocar painéis sem pedido do usuário.
- Validar MLB3575190873 na nova busca. Screenshot fornecido pelo usuário mostrava normal R$199,90, promoção R$109 e frete R$21,75; são evidência visual histórica, NÃO valores a fixar no código.
- Divergências de propostas anteriores continuam NÃO resolvidas; histórico abaixo. Diagnóstico v31 permanece disponível em /diagnostico.
- Implementação anterior ainda tem limite12 campanhas/50 itens e outras limitações documentadas. A simplificação não corrigiu cobertura de campanhas.
- Sessão ML ainda pode sofrer corridas de refresh entre abas. Novo componente faz consultas sequenciais, mas não altera mecanismo global.
- Atualização 24/09/2026: o GitHub compartilhado está configurado (https://github.com/DherikCamargo/Gestor-Promocoes; ver CONTINUIDADE-GITHUB.md). O ZIP Gestor-Promocoes-v31-Claude.zip está obsoleto; trabalhar a partir de um clone da main. Testes automatizados em tests/ (`pnpm test`): busca por família, promotionPrice/promotionPriceIssues e listingPrices/listingFreight. As verificações locais descritas nas linhas 44, 97 e 201 foram parcialmente convertidas em testes com dados simulados; não substituem validação autenticada.
- Sempre gerar documento de continuidade ao concluir alteração, conforme pedido do usuário.

---
## Histórico completo anterior (v31 e anteriores)

# Continuidade — Gestor de Promoções — v31

Esta seção prevalece sobre o histórico v30/v29 abaixo. Publicado em22/09/2026.

## Estado atual
- Site: https://gestor-promocoes-dherik.dherikjcamargo.chatgpt.site
- Projeto: appgprj_6aac200bdf848191b756d03df83a8777
- Commit: 72d629be834b9a45e3a284b75a9951a666af829d
- Versão: appgprj_6aac200bdf848191b756d03df83a8777~appgver_fc7dea11f180819180367ac8f4cf9c0e
- Deploy: appgdep_6ab2c81efa00819193b95b12a2b933f2, succeeded em2026-09-22T18:25:58.098025Z.
- Adesões continuam bloqueadas no servidor. Nenhuma alteração de promoção no ML foi feita.

## Evidências novas reais
JSON conferencia-familia-MLB7000972334 (1).json, Library libfile_5f1eb7c98cec8191abc5ed7a9dc77d8a:
- Família3191828129450127:40 UPs,41 itens descobertos;40 consultados com sucesso.
- MLB4586365904 falhou no guard de família; não presumir que houve migração, porque ausência de family_id também dispara esse guard.
- MLBU2903570693 corresponde a MLB7000216550, SKU CONJU-3ZIP-CIZ-PRT-G; sale_price169.90, regular_amount180.
- MLBU607969551 corresponde a MLB7000216538, SKU CONJ-MOL3ZIP-BEG-PRT-G; sale_price169.90, regular_amount180.
- MLB7000972334, CONJUNTO-PRETO-M, MLBU4136828430:189.98.
- MLB4797014485 tem sale_price148.35 e metadata.promotion_id OFFER-MLB4797014485-13855095592, que corresponde ao ref_id da SMART started P-MLB18023020. Essa oferta ativa está coerente entre as duas consultas.
- Há17 ofertas com issues de limite; arquivo familyEvidenceComplete=false pela falha de1 item.
- Print da família (5d68e3db-9023-48b2-8fe3-a35d6f719631.png) mostrou faixa relâmpago146.86–172.75.
- Print individual 68dbec42-67e3-421f-9082-db41222465db.png, Library libfile_aa4c792c8d0c8191900e86a6c6a1cf8b, identifica explicitamente MLB7000972334/CONJUNTO-PRETO-M: preço atual189.98, relâmpago164.12, desconto25.86; SMART174.50 com redução0.55; duas DEAL174.50.
- Isso confirma divergência para o MESMO item: endpoint seller-promotions/items retornava LIGHTNING180.48 (max170.99, suggested161.48), Central164.12. Não é explicada apenas por variação. Não substituir por164.12 fixo nem por mínimo/máximo/sugestão.

## Mudanças v31
- lib/lightning-evidence.ts: diagnóstico somente leitura para uma única LIGHTNING candidate. Valida ref_id com item correto e campanha. Consulta em paralelo:
  1. /seller-promotions/candidates/{ref_id}?app_version=v2
  2. /seller-promotions/promotions/{campaignId}/items?promotion_type=LIGHTNING&item_id={itemId}&status=candidate&app_version=v2&limit=50
- Valida identidade do candidato (id,item_id,promotion_id,type,status). Filtra resposta da campanha pelo mesmo item/status. Não considera única/completa se houver cursor, total maior, itens inesperados ou múltiplos resultados.
- Exporta itemSource,candidateSource,campaignSource separados, com fontes e timestamp; lista permitida de campos, sem tokens. Falhas parciais preservadas. automaticPriceSelection=false SEMPRE.
- ok nesse objeto só significa identidade confirmada e resultado único na campanha, NÃO equivalência financeira nem preço aprovado.
- Rota conferencia aceita details=lightning, depois de validar sessão/proprietário do item. Não aumenta consultas de toda família automaticamente.
- UI adiciona botão Conferir proposta relâmpago para o MLB digitado. Mostra preço da consulta geral e da consulta específica, status da identidade e detalhes completos recolhidos. Download conferencia-relampago-{MLB}.json pelo botão Baixar conferência da proposta.
- Não alterou regras financeiras, listagem principal, cálculo ou bloqueio de participação.
- O JSON de download conserva schemaVersion3 e campos de família, que ficam incompletos/vazios no modo relâmpago; examinar report.lightning, não familyEvidenceComplete, para esse diagnóstico.

## Testes e publicação
Fixture local com180.48 no retorno geral e164.12 no retorno específico confirmou separação, filtro item_id, validação da identidade, rejeição de candidatos duplicados, erro parcial e exclusão de token do export. Esses valores no teste são SIMULADOS com base nas evidências, não consulta real da nova rota. git diff --check, build Vinext e gzip passaram; save/deploy succeeded. Sem QA de navegador, sem consulta autenticada real da nova funcionalidade, sem POST financeiro.

## Próximo passo que exige dado da conta
Usuário atualizar gestor, informar MLB7000972334, clicar Conferir proposta relâmpago e Baixar conferência da proposta; enviar JSON. Não precisa repetir família40 itens.
Comparar candidateSource/campaignSource/itemSource com print164.12. Se consulta específica corresponder, investigar por que endpoint geral diverge e definir fonte e guard apropriados antes de mudar lógica. Se não corresponder, não inventar preço: preservar evidências para suporte ML/contrato de API. Não declarar bug resolvido só porque nova conferência foi publicada.
As limitações da listagem geral (12 campanhas/50 itens, primeiro custo de variação em caminhos antigos, heurística de redução) continuam; nunca liberar adesões sem corrigir esses caminhos pertinentes e verificar oferta exata antes e depois da adesão.

Referência oficial consultada via busca:
https://developers.mercadolivre.com.br/pt_br/gerenciar-ofertas
A documentação descreve candidates como consulta de identidade e campanha/items com filtro item_id. Não garante que candidates contenha preço. Não confundir esse endpoint com fonte confirmada do preço da Central.

---

## Histórico v30 e v29
# Continuidade — Gestor de Promoções — versão 30

Atualizado em 22/09/2026. Esta seção é o estado atual e prevalece sobre o histórico v29 abaixo.

## Publicação atual
- Site: https://gestor-promocoes-dherik.dherikjcamargo.chatgpt.site
- Projeto: appgprj_6aac200bdf848191b756d03df83a8777
- Commit main: 7c3972f3a1477848cf26ea9a149bbfade216503b
- Versão: appgprj_6aac200bdf848191b756d03df83a8777~appgver_008abd190e3081918943cebea9a25cdb
- Deploy: appgdep_6ab2765d829881918220b869886033e2 — succeeded em 2026-09-22T12:37:05.740047Z.
- Adesões bloqueadas; audiência pública preservada. Nenhuma promoção real alterada.
- Usuário autorizou continuar os processos necessários sem novas confirmações; parar quando precisar de informações reais indisponíveis. Não reabrir adesões nem fazer teste financeiro real por essa autorização genérica.

## Evidência real após v29
Arquivo conferencia-MLB7000972334 (1).json, Library libfile_44dd508a5d288191b019c11f54950f2c. Consulta em 2026-09-22T12:29:12.331Z confirmou:
- MLB7000972334 = CONJUNTO-PRETO-M, tamanho M, D-Preto.
- user_product_id MLBU4136828430; family_id 3191828129450127.
- item.price, base_price e salePrice.amount =189.98; custo68.
- variations=[]: não há variações internas retornadas. Família pode conter outros MLBs.
- Página do print180 tinha MLBU2903570693. Link anterior tinha MLBU607969551. NÃO presumir que esses UPs sejam o produto selecionado nem que pertençam à família antes de consultar.
- LIGHTNING180.48 com max170.99 continua contraditória; issues sinalizou corretamente.
- sale_price está funcionando em produção para esse anúncio/contexto.

## Implementação v30
1. lib/ml-family.ts exporta discoverFamily e familyKey. Valida identificadores inteiros seguros, consulta família de seed.family_id ou, se ausente, /user-products/{id}; verifica proprietário. Usa GET /sites/MLB/user-products-families/{familyId} e valida family_id, site_id, user_id e inclusão do produto inicial.
2. Busca todos os MLBs encontrados com /users/{sellerId}/items/search?user_product_id={grupo}&limit=50&offset={offset}, em grupos de até20 UPs, paginação e deduplicação. Não presume relação1:1. Detecta paginação repetida/vazia/inválida, falhas e seed ausente. Limites explícitos200 produtos,30 requisições de busca e offset1000 por grupo: se atingidos, complete=false com aviso. Sem corte silencioso.
3. Nova rota app/api/mercado-livre/promocoes/familia/route.ts: autenticação actor/mlSession, verifica propriedade do seed antes da descoberta. Só leitura, sem operação promocional de escrita.
4. conferencia/route.ts valida item.id e aceita familyId esperado. Rejeita mudança de família antes das consultas de preço e ofertas. Continua validando seller_id.
5. app/promotion-check.tsx: botão Conferir anúncio e família inicia consulta inicial, descoberta e consultas sequenciais de cada MLB. Usa familyId esperado e confere user_product_id na lista retornada. Cada item preserva seu preço/SKU/custo e suas próprias propostas/ref_id. Busca por SKU/cor/tamanho/MLB/MLBU; detalhes recolhidos por anúncio. Progresso, cancelamento com AbortController e erros parciais explícitos. Nenhuma comparação baseada só no título.
6. Download conferencia-familia-{MLB}.json schemaVersion3 contém dados seed, family, familyMembers (status pending/ok/failed e relatórios individuais), familyEvidenceComplete e exportStatus. Relatório pode ser baixado durante consulta, sinalizando in_progress. familyEvidenceComplete se refere à completude das leituras, NÃO aprovação de preço nem elegibilidade.
7. Cálculos/listagem principal de promoções não foram reestruturados nesta versão; suporte à família está na conferência. Todas limitações financeiras/paginação da listagem/heurística de redução de tarifas da v29 continuam válidas.

## Testes e limites
Testes locais com API simulada: paginação em duas páginas e deduplicação; família de outro usuário rejeitada; produto ausente rejeitado; paginação repetida e falha de busca retornam parcial; número acima de MAX_SAFE_INTEGER rejeitado. Build e diff-check passaram; arquivo gzip validado; publicação succeeded. Não houve consulta autenticada real da família nem QA de navegador nesta etapa. Consultas sequenciais evitam disparo de várias renovações de token no novo fluxo, mas não corrigem concorrência de sessões de outras abas/rotas.
Não usar erros ou falta de acesso para presumir preços. Consulta da família não é snapshot atômico. Documentação oficial da busca secundária confirmou endpoints:
https://developers.mercadolivre.com.br/pt_br/user-products
https://developers.mercadolivre.com.br/pt_br/preco-variacao
Busca primária não trouxe fonte oficial útil; não foi usada para definir contratos.

## Próximo passo — depende de dados da conta
Usuário deve atualizar gestor, consultar MLB7000972334 no botão Conferir anúncio e família, aguardar fim e enviar Baixar conferência da família. Isso executa leituras autenticadas na conta que não estão disponíveis diretamente nesta conversa. Se falhar, o próprio resultado parcial/erro informa etapa.
Analisar se MLBU2903570693 e MLBU607969551 aparecem; identificar respectivos MLBs e preços; comparar mesmo produto/condição com Central. Se não aparecerem não alegar inexistência na conta ou equivalência.
Em seguida resolver identidade exata da proposta (ref_id candidato/oferta, campanha e item) e preço contraditório da LIGHTNING, além dos benefícios de tarifas. Não desbloquear POST sem validar payload por tipo, margem e confirmação pós-escrita. Criar novo documento após cada alteração.

---

## Histórico preservado (v29)
# Continuidade — Gestor de Promoções — versão 29

Atualizado em 22/09/2026. Documento para outra IA continuar o projeto. Esta versão amplia o diagnóstico; NÃO resolve ainda a equivalência completa com a Central do Mercado Livre.

## Estado publicado

- Site: https://gestor-promocoes-dherik.dherikjcamargo.chatgpt.site
- Projeto: appgprj_6aac200bdf848191b756d03df83a8777
- Diretório: /workspace/scratch/f7656e7385b9/gestor-promocoes
- Git: https://git.chatgpt-team.site/907c8c16-bcaf-4b89-baa1-abe5a79fda77/appgprj_6aac200bdf848191b756d03df83a8777.git
- Branch main; commit: 9b364f06ca955549f799bb0a188a6edb24bec308
- Versão: appgprj_6aac200bdf848191b756d03df83a8777~appgver_7053d3f0ae548191848f5820a8263147
- Publicação: appgdep_6ab273e080988191803d25e2218bd189, succeeded em 2026-09-22T12:26:28.711237Z.
- Audiência pública preservada. Vinext/React/TypeScript, Workers e D1.
- Adesões permanecem BLOQUEADAS no servidor. Nenhuma promoção real foi modificada nesta tarefa.

## Exigências do usuário

Mostrar campanhas e preços correspondentes à Central de Promoções, distinguindo cada proposta e cada anúncio/variação. Não aplicar preço ou custo da primeira variação às demais. Frete, comissão ML e redução de tarifas separados. Catálogo só aparece após busca; resultados de promoções permanecem visíveis, sem rolagem horizontal. Após toda alteração, gerar documento de continuidade. Não liberar participações sem validar os valores; testes reais de adesão exigem autorização específica.

## Evidências recebidas

MLB7000972334, SKU CONJUNTO-PRETO-M: gestor mostrava 189,98, custo 68. Print de página pública mostrava 180, mas não identificava a opção selecionada; URL no print terminava MLBU2903570693. Link anterior enviado: https://www.mercadolivre.com.br/conjunto-blusa-de-frio-com-capuz-e-calca-de-moletom/up/MLBU607969551 . Não presumir equivalência entre esses produtos e MLB.

Arquivo conferencia-MLB7000972334.json, Library libfile_353cf1d601b881919a140a7a9ceb75f4, consulta 2026-09-22T12:15:47.378Z:

- Set26 Top Sellers SMART P-MLB18023020: candidate, price174.50, original189.98, ref_id CANDIDATE-MLB7000972334-77183297570.
- LIGHTNING LGH-MLB1000: candidate, price180.48, min38, max170.99, suggested161.48, ref_id CANDIDATE-MLB7000972334-77292428954. Contradição entre preço e máximo.
- PRICE_DISCOUNT e DEAL Vem fazer Compritta/10.10: price0, suggested174.50; cupons OFF50 e carrinhos também retornados.
- Todas sete propostas candidate; não havia started nessa resposta. Ela não contém dados de variações nem explica os180 do print.

Incidente anterior MLB4797014485 CONJUNTO-CHUMBO-GG: gestor dizia PARTICIPANDO159.90, ML mostrava SMART ativa148.35. JSON posterior confirmou159.90 como candidato de outra SMART; ativa148.35 tinha outro ID. LIGHTNING também contraditória:162.45 acima de max162, suggested153. Não há evidência histórica suficiente para afirmar que o POST causou148.35. Código antigo ignorava resposta POST e declarava sucesso sem reconfirmação. Versão27 bloqueou todas adesões; versão28 adicionou diagnóstico e removeu uso incorreto do mínimo como sugestão.

## Alterações da v29

1. lib/promotion-evidence.ts: exportação por lista permitida de campos de identidade, atributos, SKU, preço e custos sugeridos de cada variação. Não exporta tokens/headers. Preço ausente de variação permanece ausente; não herda preço do anúncio. Identifica user_product_id/family_id quando retornados. Usa identifyCost já existente por SKU/título.
2. app/api/mercado-livre/promocoes/conferencia/route.ts: valida sessão e propriedade do anúncio antes das consultas. GET /items/{id}?include_attributes=all, GET /items/{id}/sale_price?context=channel_marketplace e GET /seller-promotions/items/{id}?app_version=v2. Exporta schemaVersion2, item, salePrice, offers e fontes. Falha no sale_price vira resultado parcial explícito; não substitui pelo preço da promoção. Mantém campos brutos de ofertas e acrescenta issues.
3. app/promotion-check.tsx: exibe identidade, preço do anúncio e preço de venda consultado separadamente; cartões para variações internas e ofertas, IDs, situação, preço retornado/sugerido/limites e alertas. Download JSON mantido. Texto explicita o escopo de apenas um anúncio.
4. lib/promotion-price.ts: função promotionPriceIssues verifica mínimo maior que máximo e preço/sugestão fora dos limites usando centavos. promotionPrice retorna null ao encontrar contradição. Não substitui preço inválido pelo mínimo, máximo ou outra sugestão. A regra afeta também listagem/cálculo que já usam esse helper.
5. participar/route.ts permanece inalterado: POST sempre503 PARTICIPATION_PAUSED, sem cliente ML e sem operação externa.

## Verificação realizada

Regressões locais com JSON do usuário confirmaram bloqueio da LIGHTNING180.48/max170.99; preço coerente continua disponível; sugestão só usada quando price não é positivo; limites sozinhos não viram sugestão. Fixtures confirmaram preços de variações100/120 separados e terceiro preço ausente, SKU ausente sem herança, custo de vestido20 e descarte de campo token. POST de participação testado com fetch proibido:503. Build Vinext e git diff --check passaram. Não foi feita consulta autenticada real dos novos campos nem teste visual de navegador.

Primeira tentativa de salvar pacote falhou como inválido; pacote foi refeito e gzip validado. Segundo salvamento e publicação concluíram com sucesso. Arquivo utilizado: /workspace/scratch/f7656e7385b9/gestor-promocoes-v29-repacked.tar.gz.

## Regras financeiras preservadas

P=preço promocional; C=custo. Comissão ML padrão14%P, redução R somente quando confirmada, efetiva=max(0,14%P-R). Imposto9%P, publicidade5%P, despesa fixa14. Comissão interna3% de max(0,P-comissão efetiva-frete). Lucro=P-C-frete-comissão efetiva-imposto-publicidade-14-comissão interna. Margem=lucro/P. Mínimo4%. Usuário determinou frete9 para P<78,90, acima consulta ML; isso não foi verificado como política universal da plataforma. Custos principais: vestido20, coturno150, conjunto68, sutiã33. Demais em lib/ml-catalog.ts. Exemplo da planilha: P145,54 C68 frete25,55 resulta aproximadamente-5,75.

## Limitações e próximo passo exato

- Pedir ao usuário atualizar o gestor e baixar NOVA conferência de MLB7000972334; se possível também MLB4797014485. JSON antigo schema1 não possui dados acrescentados.
- O diagnóstico retorna variações internas e identificadores do anúncio selecionado. NÃO enumera outros anúncios de uma família/User Product. No modelo de preço por variação, opções podem estar em MLBs diferentes; implementar descoberta documentada e validar propriedade de cada anúncio antes de ampliar.
- sale_price consulta contexto geral channel_marketplace e escopo do item. Não é preço promocional por variação, não comprova equivalência com a página para todo comprador e não deve ser aplicado a todas variações.
- Diagnóstico é leitura de fontes em chamadas distintas, não snapshot atômico. Registrar divergências e consultar novamente antes de futura adesão.
- Listagem principal ainda consulta até12 campanhas e50 itens por campanha, sem paginação. Catálogo/cálculo principal ainda seleciona primeira linha por item em alguns caminhos; NÃO anunciar suporte completo a preço/custo por variação nesta versão.
- Offer identity usa offer_id em caminhos antigos, mas arquivos reais apresentam ref_id. Corrigir associação exata item/campanha/tipo/ref_id/oferta; não misturar campanhas ou candidatos com ofertas ativas.
- lib/promotion-fees.ts ainda usa heurística de campos de redução e não está validada. Não presumir benefício ML por diferença de preços nem somar reduções duas vezes. Fluxo boosted continua bloqueado no cálculo.
- Validar contrato de adesão por tipo, pré-consulta de proposta, preço/margem exibidos, payload específico e leitura após resposta antes de reabrir adesões. Não usar endpoint genérico para todo tipo e não declarar participação só porque POST respondeu.

## Referências técnicas consultadas

Documentação oficial localizada via busca: https://developers.mercadolivre.com.br/pt_br/preco-variacao (condições/preços por item), https://developers.mercadolivre.com.br/pt_br/user-products (família/produto), https://developers.mercadolivre.com.br/pt_br/api-de-precos (sale_price/context), https://developers.mercadolivre.com.br/pt_br/ofertas-relampago e https://developers.mercadolivre.com.br/pt_br/gerenciar-ofertas . Abertura direta de algumas páginas deu403; busca secundária trouxe documentação e busca primária não trouxe verificação útil. Validar contratos ao expandir integração.

Continuar com skills Sites building/hosting e Library nas versões disponíveis. Usar get_site e workflow de abertura antes de editar; preservar audiência. Fonte está em Git, não duplicar repositório na Library. Não imprimir credenciais. Após próxima publicação atualizar este histórico em novo documento de continuidade.
