# Instruções do projeto

Leia README.md e Continuidade-Gestor-Promocoes-v32.md antes de trabalhar. Este é um sistema existente em produção, não um projeto novo.

- Base exportada: versão 32, commit 7678cc95daf1b3b255ccb81de462d1dab2e92ad9.
- Preserve arquitetura Vinext/React/TypeScript/Cloudflare Workers/D1 e pnpm-lock.yaml.
- Não recrie o aplicativo ou migre o framework para facilitar uma edição pontual.
- Adesões (app/api/mercado-livre/promocoes/participar/route.ts): reabertas em 24/09/2026 a pedido do proprietário, atrás da chave PARTICIPATION_ENABLED (variável do GitHub; desligada por padrão e sempre desligada no ChatGPT Sites). Só SMART, PRICE_MATCHING e MARKETPLACE_CAMPAIGN (preço definido pelo ML). O servidor revalida oferta, tipo e margem aprovada com custos/regras do banco antes do envio e confere depois que a oferta aparece ativa/programada com o preço esperado (lib/participate.ts); cada tentativa vai para participation_log. Não ampliar tipos (DEAL, PRICE_DISCOUNT, LIGHTNING, DOD, PRE_NEGOTIATED) sem validar o contrato de cada um e sem autorização do proprietário. Ver CONTINUIDADE-ADESAO.md.
- Associe preço e custo ao item/SKU/variação exatos. Diferencie campanha, candidato, oferta ativa e preço de venda. Não use preço da primeira variação para toda família.
- Não invente preço, frete, redução de comissão ou respostas da API. Erros e dados ausentes devem permanecer explícitos.
- Regras financeiras e limitações constam no documento de continuidade; não presumir que toda a lógica atual esteja correta.
- Trabalhe em branch separada quando o Git compartilhado estiver configurado; preserve alterações de outras pessoas/IAs.
- Não publique nem modifique a conta do Mercado Livre apenas por concluir uma edição local. Publicação oficial desde 24/09/2026: Cloudflare do proprietário, https://gestor-promocoes.dherikjgk.workers.dev, pelo GitHub Actions a cada merge na main (ver PUBLICACAO-CLOUDFLARE.md). Login só pelo Cloudflare Access (JWT verificado). O site do ChatGPT Sites não é mais atualizado. Nunca enviar direto à main: só merges de PR publicam.
- Após cada alteração, entregue resumo do que mudou, testes executados, limitações e documento de continuidade atualizado.
- Informe claramente a diferença entre testes simulados e consultas reais. Não declarar compatibilidade total com a Central antes da validação.

- Pedido mais recente: manter a página principal simplificada. Não restaurar os painéis antigos sem pedido do usuário.
