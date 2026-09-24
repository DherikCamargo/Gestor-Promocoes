# Continuidade — todos os anúncios na abertura
22/09/2026. Base GitHub: 8b1bb6d1e4efcdf46fd0a9c7d90164925c93c88a.

Pedido: mostrar todos os anúncios diretamente na tela, sem exigir busca por MLB. Esta instrução substitui a preferência anterior de ocultar catálogo até pesquisar.

Mudança em app/simple-catalog.tsx:
- Carrega o catálogo importado ao abrir e renderiza todos os anúncios, deduplicados por MLB, sem paginação ou botão Mostrar mais.
- Mantém busca opcional; limpar o campo ou Ver todos restaura a lista completa.
- Cada anúncio mostra imediatamente nome e MLB. Preço/frete são consultados quando o cartão entra ou se aproxima da área visível (IntersectionObserver, 240px). Não faz centenas de chamadas ao abrir.
- Consultas de detalhes usam fila sequencial e cache em memória por run/MLB. Desmontagem cancela aplicação de resultados; tarefas ainda não iniciadas de cartões desmontados são descartadas.
- Importação pausa novas consultas dos cartões; ao concluir, limpa cache e mostra todos os anúncios da nova importação.
- Estados explícitos para carregamento, erro, ausência de importação e importação parcial.
- Os dados apresentados continuam restritos a nome/MLB, preço normal/promocional, tipo e frete. Sem fotos, estoque ou custos adicionais.
- O resolvedor de busca que protege contra códigos de família continua utilizado.

Limites: todos os anúncios do catálogo importado aparecem, não uma garantia de que a importação esteja completa. Valores remotos carregam progressivamente ao rolar; ausências e estimativas mantêm os rótulos da versão anterior. Não foram alterados endpoints, valores, custos, autenticação ou bloqueio de adesões.

Validação: build Vinext concluído antes do merge. Sem teste visual autenticado na conta ML. Publicação deve ser confirmada pela automação após merge; este documento por si só não confirma deploy. Documento completo anterior: Continuidade-Gestor-Promocoes-v32.md; último deploy conhecido antes desta mudança: v33.

## Atualização 24/09/2026 — lista em linhas, tarifa e desconto na tarifa
Pedido de Dherik: ver, logo ao abrir, preço normal, preço na promoção, se a promoção tem desconto na tarifa e o frete; agrupar anúncios com preço por variação.

Mudanças:
- app/simple-catalog.tsx: lista em linhas (Anúncio · Preço normal · Na promoção · Tarifa ML · Desconto na tarifa · Frete), com cabeçalho no desktop e rótulos por campo no celular. Filtros com contagem: Todos, Em promoção, Preço por variação, Com falha (promoção/falha contam só anúncios já consultados). Botão Tentar de novo em cada falha. Consultas continuam sob demanda (IntersectionObserver) e em fila sequencial; resultados ficam no estado do componente, com contador de geração para descartar respostas de uma importação anterior. Erros de tipo antigos deste arquivo corrigidos.
- Agrupamento: família (family_id) com mais de um MLB vira um grupo "Preço por variação"; ao abrir, cada MLB aparece com opção, SKU e seus próprios valores. Cabeçalho mostra faixa de preços apenas dos já consultados. Importações anteriores não têm family_id: a tela pede uma nova importação para agrupar.
- lib/ml-catalog.ts: CatalogRow.familyId (familyKey(item.family_id)) gravado na importação.
- lib/listing-fees.ts (novo):
  - listingSaleFee: tarifa de GET /sites/MLB/listing_prices para o tipo de anúncio exato e mesma moeda; ausente/ambígua = null.
  - activeOffer: liga o preço de venda à oferta pelo ref_id em sale_price.metadata.promotion_id, exige status started, oferta única e preço (promotionPrice) igual ao de venda em centavos. Desconto na tarifa = discount_meli_boost_amount quando boosted_offer=true; sem boosted_offer = 0; qualquer divergência = "Não confirmado" com motivo.
- /api/mercado-livre/anuncios/resumo: consulta listing_prices (price=preço atual, category_id, listing_type_id, currency_id, logistic_type e shipping_mode do anúncio) e /seller-promotions/items/{id}?app_version=v2 somente quando há promoção; frete, tarifa e oferta em paralelo, falha de uma não esconde as outras. Resposta ganha familyId, saleFee e promotion.

Fontes: https://developers.mercadolivre.com.br/pt_br/comissao-por-vender (listing_prices, atualização 03/09/2026) e https://developers.mercadolivre.com.br/pt_br/gerenciar-ofertas (boosted_offer, discount_meli_boost_amount, atualização 09/06/2026).

Achado: lib/promotion-fees.ts (heurística usada em /promocoes e /promocoes/calculo) retorna 0 para o exemplo oficial com discount_meli_boost_amount=555, pois não reconhece o campo. Não alterado aqui; a margem da tela antiga (/diagnostico) subestima benefícios. lib/pricing.ts ainda usa comissão fixa de 14%; listing_prices mostra que a porcentagem varia por categoria/tipo. Ambos devem ser revistos antes da fase 2.

Não resolvido/limites:
- meli_percentage/seller_percentage (co-participação) não entram no desconto exibido; a documentação não deixa claro se a parte do ML é compensada na tarifa. Validar com anúncio real.
- Tarifa exibida é bruta do tipo de anúncio no preço atual; não é tarifa líquida (tarifa − desconto), que não é calculada nesta tela.
- Parâmetro shipping_mode usado conforme lista de parâmetros da documentação (o exemplo da página escreve shipping_modes). Conferir se o fixed_fee retornado corresponde à Central.
- Variações internas de um mesmo MLB com preços diferentes continuam como "Varia por opção" (sem seletor).

Validação: pnpm test 32/32 (8 novos em tests/listing-fees.test.mjs, dados simulados baseados na documentação). tests/support/ adiciona resolução de imports sem extensão só para os testes. ESLint sem problemas nos arquivos alterados; tsc sem erros em simple-catalog.tsx (erros antigos em promotion-check.tsx e rotas de promoções continuam). pnpm run build concluído. NÃO houve teste visual: no Windows, `pnpm dev` e `pnpm start` falham com "write EOF" do esbuild/wrangler antes de servir a página. Nenhuma consulta autenticada à conta ML. Adesões continuam bloqueadas.

Conferência pedida após o deploy: abrir o gestor, clicar Atualizar anúncios (grava family_id) e comparar 2–3 anúncios com a Central de Vendas (um com promoção ativa, um sem, um de família com preço por variação): preço normal, promoção, tarifa, desconto na tarifa e frete.

## Validação real e correção — 24/09/2026 (tarde)
Conferência de Dherik, MLB3575190873 (versão publicada com a lista em linhas):
- Gestor: normal R$ 199,90 · promoção R$ 109,00 "Queima de inverno Full" · tarifa R$ 15,26 (14%) · desconto "Sem desconto" · frete R$ 17,15.
- Central: oferta ATIVA "Com redução de tarifas", R$ 109, recebe R$ 83,50, "Reduzimos R$ 6,91 das suas tarifas por cada venda".
- Preço, promoção, tarifa e frete conferem: 109 − (15,26 − 6,91) − 17,15 = 83,50. Só a redução de R$ 6,91 faltava.

Conferência baixada (conferencia-familia-MLB3575190873.json): sale_price.metadata.promotion_id = OFFER-MLB3575190873-13720667431 (promotion_type marketplace_campaign), que corresponde à oferta SMART P-MLB18027014 started, price 109, original_price 199,9, meli_percentage 3,5, seller_percentage 42, sem boosted_offer. Nenhum campo exportado traz R$ 6,91. Conversões testadas não reproduzem a Central: 3,5% × 199,90 = 7,00; 3,5/45,5 × 90,90 = 6,99. Dherik pediu explicitamente: exibir como o Mercado Livre exibe, sem cálculo próprio.

Mudanças:
- lib/listing-fees.ts: ActiveOffer identificado passa a ter feeDiscount:number|null e meliPercentage. Co-participação sem boosted_offer → feeDiscount null (não é mais "Sem desconto"). Tela mostra "ML cobre 3,5% · do desconto · valor em R$ na Central". Sem conversão para R$.
- /promocoes/conferencia: novo activeOffer com a oferta ativa integral (itemSource), a linha do item em /seller-promotions/promotions/{id}/items?promotion_type={type}&item_id={MLB} (campaignSource) e o sale_price integral, via fullRecord (lib/promotion-evidence.ts: mantém todos os campos, descarta chaves token/secret/authorization/password/cookie, profundidade ≤ 6, listas ≤ 50). Objetivo: descobrir se a API envia a redução em R$ em algum campo fora da lista fixa.
- Lista: SKUs longos resumidos ("A, B e mais N SKUs").
- Testes: caso real acima, fullRecord (campos desconhecidos, credenciais, limites). pnpm test 36/36; build ok.

Próximo passo (depende de dado real): após o deploy, baixar nova conferência de MLB3575190873 em /diagnostico e procurar em activeOffer o valor 6,91. Se existir campo com o valor em R$, exibir esse campo diretamente. Se não existir, manter a porcentagem e registrar que a API não fornece o valor da Central.

## Subsídio do Mercado Livre — 24/09/2026 (decisão de Dherik)
Nova conferência com activeOffer integral (MLB3575190873, 14:09Z): oferta ativa (seller-promotions/items), linha do item na campanha P-MLB18027014 (promotion_type=SMART) e sale_price completos. Nenhum campo traz valor em R$ do subsídio/redução de tarifa; só meli_percentage 3,5 e seller_percentage 42 (sale_price.metadata acrescenta campaign_id). Conclusão: a API de promoções não fornece o "Reduzimos R$ 6,91" da Central.
Porcentagens são sobre o preço bruto (original_price): 3,5 + 42 = 45,5% ≈ desconto real 90,90/199,90 = 45,47% (arredondadas pela API; o mesmo vale para o exemplo oficial 8 + 16 + 11,1 = 35,1% de 5000).

Decisão de Dherik: exibir "Subsídio por conta do Mercado Livre" = meli_percentage × original_price, sempre arredondado para baixo no centavo.
- lib/listing-fees.ts: ActiveOffer identificado ganha mlSubsidy (Math.floor(meli × original + 1e-6)/100; 0 sem co-participação; null se faltar original_price). feeDiscount volta a ser número (discount_meli_boost_amount das ofertas boosted, 0 caso contrário) e aparece separado.
- Tela: coluna "Subsídio do Mercado Livre"; valor + nota "3,5% do preço normal" (+ desconto automático na tarifa quando houver). Sem original_price: "ML cobre X% do preço normal".
- Caso real: R$ 6,99 no gestor × R$ 6,91 na Central (diferença pelo arredondamento da porcentagem na API). Documentado; não corrigir com fórmula inventada.
- Testes: 38/38 (caso real 6,99; arredondamento para baixo 7,91; proteção de ponto flutuante 0,57% × 100 = 0,57; sem original_price = null).
