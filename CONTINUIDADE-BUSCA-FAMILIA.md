# Continuidade — correção da busca por código de família
22/09/2026. Base GitHub: 1ff0cfe87b88a539be64ad8e5837bac1324924e4.

Problema: a busca transformava qualquer número em MLB. O usuário digitou 3191828129450127, família conhecida dos conjuntos, e o gestor consultou MLB3191828129450127, recebendo 404. Não é falha de autorização.

Correção:
- lib/listing-search.ts centraliza resolução. MLB completo (incluindo mlb-...) consulta diretamente. Número sem prefixo só resolve para anúncio por itemId ou SKU exato já presente no catálogo. Número não identificado gera orientação; não faz chamada a /items para um MLB inventado.
- Nome, SKU textual e variação continuam pesquisáveis, deduplicados por MLB.
- app/simple-catalog.tsx utiliza o resolvedor e não mostra mensagem vazia adicional quando há orientação.
- /anuncios/resumo traduz erro HTTP404 da consulta do item em ITEM_NOT_FOUND com orientação para usar MLB individual. Permissões e demais erros seguem preservados.
- Não foi implementada busca automática de famílias; o número isolado é ambíguo. Sem catálogo importado, use MLB completo.
- Exemplo: MLB7000972334 é anúncio individual CONJUNTO-PRETO-M daquela família, conforme evidência anterior. Nenhum preço foi fixado.

Validação: oito assertions locais passaram (família não vira MLB, orientação, MLB com/sem hífen e caixa, número confirmado, SKU numérico, busca por nome, número sem catálogo). Build pnpm run build concluído.
Não houve chamada autenticada à conta ML nem teste visual de produção. Adesões continuam bloqueadas.

Entrega via pull request e merge deve acionar Publicar Gestor de Promoções. Este documento registra implementação e validação local; status de produção só pode ser afirmado após deployment succeeded. A automação deve emitir continuidade com os SHAs GitHub/Sites e versão publicada. Documentação original: Continuidade-Gestor-Promocoes-v32.md; publicação: AUTOMACAO-PUBLICACAO.md.

## Testes automatizados (23/09/2026)
As assertions acima passaram a existir no repositório em tests/listing-search.test.mjs (7 testes, node:test, sem dependências novas; pnpm-lock.yaml inalterado). Executar com `pnpm test` (Node >=22.13; usa --experimental-strip-types para importar lib/listing-search.ts).
Validação: 7/7 passaram no Node 24.19 (Windows). Reintroduzindo temporariamente o comportamento antigo (número sem prefixo virando MLB), 5 testes falharam, confirmando a cobertura da regressão. pnpm run build concluído.
Observação: na main, `tsc --noEmit` e `pnpm run lint` já falhavam antes desta mudança (erros de tipo em app/simple-catalog.tsx; erros de lint em app/connection.tsx e app/diagnostico/page.tsx); não foram tratados aqui. Nenhuma chamada à conta ML; adesões continuam bloqueadas.
