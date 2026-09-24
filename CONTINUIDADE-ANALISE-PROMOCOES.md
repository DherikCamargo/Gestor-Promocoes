# Continuidade — fase 2, etapa A: análise de promoções (somente leitura)
24/09/2026. Base GitHub: f4b2d0b (main após PR #8).

Pedido de Dherik: o gestor deve mostrar as promoções disponíveis de cada anúncio (inclusive anúncios com preço por variação) e aprovar as que atingem a margem mínima, com base nos custos informados. Decidido fazer em duas etapas: A = análise somente leitura (este documento); B = adesão com confirmação do usuário e checagem após a adesão, só depois de conferir os números da etapa A com a Central.

## Regras de margem (confirmadas por Dherik em 24/09/2026)
Imposto 9% · Publicidade 5% · Comissão interna 3% de (preço − tarifa líquida − frete) · Despesa fixa R$ 14 · Frete R$ 9 abaixo de R$ 78,90 (a partir dele, estimativa ML) · Margem mínima **3%** (antes 4%; Dherik pediu "margem igual ou acima de 3%"). Imposto e comissão interna podem mudar, por isso as regras ficam editáveis na tela (Regras de margem), gravadas por conta na tabela margin_rules. lib/pricing.ts (telas antigas) não foi alterado e continua com 4% e comissão fixa de 14%.

## Cálculo (lib/offer-analysis.ts)
Lucro = preço − custo − imposto − publicidade − comissão interna − despesa fixa − tarifa líquida − frete.
Tarifa líquida = tarifa do listing_prices no preço da oferta − subsídio do ML (meli_percentage × original_price, para baixo) − desconto automático na tarifa (discount_meli_boost_amount). Reproduz a Central no caso real MLB3575190873: 109 − (15,26 − 6,91) − 17,15 = 83,50 recebidos; pelas regras, lucro R$ 9,73 (8,93%) com custo R$ 42.
Situação: margem ≥ mínima (comparada em pontos-base) = Aprovada; lucro ≥ 0 = Atenção; lucro < 0 = Não recomendada; qualquer dado ausente (custo, tarifa, subsídio, desconto, frete) = Faltam dados, com a lista. Nada ausente vira zero.
Preço da oferta: promotionPrice (preço da oferta; para candidatos sem preço, a sugestão). Ofertas contraditórias (fora de min/max) não são analisadas. Cupons do vendedor não têm preço e aparecem como não analisados. Preço sugerido é rotulado, com o intervalo aceito.

## Arquivos
- lib/offer-analysis.ts: MarginRules, defaultRules, parseRules (conjunto completo e dentro dos limites), offerTerms, analyzeOffer.
- lib/listing-fees.ts: offerBenefits (subsídio e desconto automático) extraído de activeOffer, sem mudar resultados.
- lib/ml-quotes.ts: quoteSaleFee/quoteFreight compartilhados pela lista (resumo) e pela análise.
- lib/owner-settings.ts: loadCostOverrides/loadRules.
- db/schema.ts + drizzle/0003_clumsy_mastermind.sql: tabela margin_rules (owner PK, rules JSON, updated_at).
- /api/mercado-livre/regras: GET/POST (rules null = padrão). Só banco do site.
- /api/mercado-livre/promocoes/analise?itemId=: valida dono do anúncio, lê /seller-promotions/items, filtra candidate/pending/started (até 20), cota tarifa e frete por preço (cache por preço, consultas em sequência) e devolve a análise ordenada (aprovadas primeiro, por margem). readOnly e participationBlocked. Variações internas com preços diferentes não são analisadas (margem ambígua).
- app/offer-panel.tsx: OfferPanel (por anúncio, com "Ver cálculo") e RulesPanel.
- app/simple-catalog.tsx: botão Promoções em cada anúncio (inclusive opções de uma família), painel de regras acima da lista; salvar regra ou custo refaz as análises abertas.

## Validação
pnpm test 56/56 (8 novos em tests/offer-analysis.test.mjs: caso real, limites de margem, frete da regra, dados ausentes, tarifa líquida, regras editadas, termos das ofertas, validação das regras). ESLint e tsc sem erros nos arquivos alterados; build concluído. Migração gerada com drizzle-kit. Sem teste visual (servidores locais não sobem no Windows); nenhuma chamada autenticada nesta sessão.

## Limites e próximos passos
- A adesão continua bloqueada (PARTICIPATION_PAUSED). Etapa B só após Dherik conferir 2–3 análises com a Central.
- Frete e tarifa são cotações no preço da oferta; podem mudar até a venda.
- Subsídio calculado pode diferir da Central em centavos (porcentagem arredondada pela API).
- Kits "1 blusa e 2 calças" e "1 moletom e 1 camiseta" seguem como produto único; regra SHORT-LINHO a confirmar (ver CONTINUIDADE-CUSTOS.md).
