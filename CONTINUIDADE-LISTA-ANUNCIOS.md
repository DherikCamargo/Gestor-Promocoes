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
