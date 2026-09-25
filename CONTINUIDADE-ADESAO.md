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
