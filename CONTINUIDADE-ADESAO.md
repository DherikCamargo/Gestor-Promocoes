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
