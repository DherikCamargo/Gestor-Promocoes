# Continuidade — custos por produto
24/09/2026. Base GitHub: 7c02fd9 (main após PR #7).

Pedido de Dherik: editar o custo na própria lista de anúncios (sem tela separada de produtos), valendo para todos os anúncios e SKUs do produto; guardar no banco; kits pela composição; lista "Sem custo".

## Mudanças
- lib/product-costs.ts (novo): identifyProduct reproduz exatamente as regras de identifyCost, mas devolve a composição (produto × quantidade). defaultProducts guarda os custos que estavam no código (Conjunto 68, Sutiã Plus 33, Short de linho 17, Short 20, Blusa 3 zíper 42, Moletom de gola 50, Vestido 20, Coturno 150, Kit 1 blusa e 2 calças 94, Kit 1 moletom e 1 camiseta 54).
  - Kits por composição: "Kit N blusas 3 zíper" = N × Blusa 3 zíper; KIT03 = 3 × Blusa 3 zíper; "Kit 2 shorts de linho" = 2 × Short de linho. Os kits "1 blusa e 2 calças" e "1 moletom e 1 camiseta" continuam como produto único, porque calça e camiseta não têm custo próprio cadastrado (não inventar divisão).
  - Anúncio sem regra: custo guardado por SKU (quando o anúncio tem um único SKU; vale para outros anúncios com o mesmo SKU) ou por MLB.
  - Variações de produtos diferentes no mesmo anúncio: "Varia por opção", sem custo único.
  - Soma em centavos; peça sem custo deixa o total ausente, nunca zero.
- lib/ml-catalog.ts: identifyCost agora usa identifyProduct com custos padrão. Resultado idêntico ao anterior (tests/identify-cost.test.mjs fixa todas as regras). Telas antigas (/diagnostico, cálculo de promoções) continuam usando o custo padrão, não o editado.
- db/schema.ts + drizzle/0002_nifty_professor_monster.sql: tabela product_costs (owner, product, cost_cents, updated_at; PK owner+product). Sem linha = custo padrão.
- /api/mercado-livre/custos: GET devolve os custos editados do dono; POST {key, cost} grava (0 a 100.000, até 2 casas) ou, com cost null, volta ao padrão. Chaves aceitas: produtos conhecidos, SKU:… e MLB:MLB…. POST exige a mesma origem do site. Nenhuma chamada ao Mercado Livre.
- Lista (app/simple-catalog.tsx): coluna Custo em cada linha e no cabeçalho de família. Editar/Informar custo na própria linha; "Voltar ao padrão" quando editado. Kits mostram a composição e são alterados pelo custo da peça. Filtro "Sem custo" com contagem. Se a tabela não estiver disponível, a lista mostra os custos padrão e avisa.

## Achado a confirmar
A regra de short de linho só reconhece SKU "SHORT-LINH-…" ou "SHORT-LIN-…". Um SKU "SHORT-LINHO-…" cai em "Short (demais modelos)" (R$ 20 em vez de R$ 17). Comportamento mantido e registrado no teste; confirmar com Dherik qual é o formato real dos SKUs.

## Validação
pnpm test 48/48 (10 novos: regras antigas preservadas, edição por produto, kits acompanhando a peça, sem custo, custo por SKU, variações mistas, chaves válidas, soma em centavos). ESLint e tsc sem erros nos arquivos alterados; pnpm run build concluído. Migração gerada com drizzle-kit generate. Sem teste visual (servidores locais não sobem no Windows) e sem teste da rota contra D1 real.

## Depois do deploy
Confirmar que a migração 0002 foi aplicada (a lista não deve mostrar "Custos editados indisponíveis"). Editar o custo de um produto e verificar que todos os anúncios dele mudam; recarregar a página e confirmar que o valor permaneceu.
