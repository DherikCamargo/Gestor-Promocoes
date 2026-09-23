# Instruções do projeto

Leia README.md e Continuidade-Gestor-Promocoes-v32.md antes de trabalhar. Este é um sistema existente em produção, não um projeto novo.

- Base exportada: versão 32, commit 7678cc95daf1b3b255ccb81de462d1dab2e92ad9.
- Preserve arquitetura Vinext/React/TypeScript/Cloudflare Workers/D1 e pnpm-lock.yaml.
- Não recrie o aplicativo ou migre o framework para facilitar uma edição pontual.
- A rota app/api/mercado-livre/promocoes/participar/route.ts está intencionalmente bloqueada por incidente financeiro. Não reabra sem validação de proposta/preço, regras por campanha e confirmação pós-escrita. Nenhum teste real de adesão autorizado por este pacote.
- Associe preço e custo ao item/SKU/variação exatos. Diferencie campanha, candidato, oferta ativa e preço de venda. Não use preço da primeira variação para toda família.
- Não invente preço, frete, redução de comissão ou respostas da API. Erros e dados ausentes devem permanecer explícitos.
- Regras financeiras e limitações constam no documento de continuidade; não presumir que toda a lógica atual esteja correta.
- Trabalhe em branch separada quando o Git compartilhado estiver configurado; preserve alterações de outras pessoas/IAs.
- Não publique nem modifique a conta do Mercado Livre apenas por concluir uma edição local. O site existente continua no fluxo de publicação Sites.
- Após cada alteração, entregue resumo do que mudou, testes executados, limitações e documento de continuidade atualizado.
- Informe claramente a diferença entre testes simulados e consultas reais. Não declarar compatibilidade total com a Central antes da validação.

- Pedido mais recente: manter a página principal simplificada. Não restaurar os painéis antigos sem pedido do usuário.
