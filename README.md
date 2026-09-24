# Gestor de Promoções

Projeto existente de Dherik Camargo, integrado ao Mercado Livre.
Base de produção: versão 32, commit 7678cc95daf1b3b255ccb81de462d1dab2e92ad9.

A tela principal apresenta busca e resumo de anúncios: nome, MLB, preço normal/promocional, tipo e cotação de frete. Diagnósticos anteriores estão em /diagnostico.

## Comece aqui
Leia CLAUDE.md, CONTRIBUTING.md e Continuidade-Gestor-Promocoes-v32.md.

## Ambiente
- Node.js >=22.13.0.
- pnpm 11.25.0, conforme package.json.
- React, TypeScript, Vinext/Vite, Cloudflare Workers e D1.

```sh
pnpm install --frozen-lockfile
pnpm run dev
```

Para verificar a compilação:
```sh
pnpm run build
```

Preserve pnpm-lock.yaml. O perfil portable é selecionado em uma cópia limpa. Execução no Windows ainda não foi validada. Banco D1, autenticação e integração Mercado Livre exigem configuração de desenvolvimento separada; instalar dependências não conecta a conta de produção. .env.example é apenas um modelo.

## Estado do projeto
Adesões a promoções estão bloqueadas no servidor após divergências de preço. Não reabrir nem realizar testes de adesão na conta real sem autorização específica do proprietário e validação técnica. As pendências completas estão no documento de continuidade.

## GitHub e publicação
Repositório compartilhado: https://github.com/DherikCamargo/Gestor-Promocoes. Base importada: código da versão 32 publicada. Consulte CONTRIBUTING.md para trabalhar em branches e pull requests.
Publicação oficial desde 24/09/2026: https://gestor-promocoes.dherikjgk.workers.dev (Cloudflare do proprietário, login pelo Cloudflare Access). Cada merge de pull request na main roda testes, build, migrações do D1 e publicação pelo GitHub Actions (.github/workflows/publicar-cloudflare.yml); o resultado fica em GitHub → Actions. Falha em qualquer passo mantém a versão anterior. O site antigo (https://gestor-promocoes-dherik.dherikjcamargo.chatgpt.site) e a automação no ChatGPT não são mais usados. Guia em PUBLICACAO-CLOUDFLARE.md.
Não usar GitHub Pages para este aplicativo: ele requer backend, autenticação e banco.

O pacote contém o código rastreado da versão 32 e documentos de colaboração. Não contém histórico Git, dependências instaladas, tokens, banco de produção ou sessões de usuários.
