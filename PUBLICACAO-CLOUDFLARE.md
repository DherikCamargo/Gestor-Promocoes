# Publicação própria na Cloudflare

Decisão de Dherik (24/09/2026): deixar de depender do ChatGPT Sites para publicar, porque o limite de uso do ChatGPT interrompe a automação. O gestor passa a rodar num Worker da conta Cloudflare do proprietário, com login pelo Cloudflare Access, e cada merge na `main` publica pelo GitHub Actions (`.github/workflows/publicar-cloudflare.yml`).

## Como o código decide a hospedagem
- **Sem variáveis** (ChatGPT Sites): tudo como antes — login ChatGPT, endereço `…chatgpt.site`, banco do Sites.
- **Com `AUTH_MODE=cloudflare-access`** (definido no build quando `CF_D1_DATABASE_ID` existe): só o JWT do Cloudflare Access é aceito, com assinatura verificada (`lib/access-auth.ts`); os cabeçalhos `oai-*` do ChatGPT são ignorados, pois fora do Sites qualquer cliente poderia enviá-los. O endereço vem de `PUBLIC_ORIGIN`.

## Configuração (uma vez)
Contas, senhas, tokens e a chave de criptografia são criados e colados pelo proprietário; ninguém mais deve vê-los.

1. **Conta Cloudflare** gratuita em https://dash.cloudflare.com/sign-up.
2. **Banco D1**: *Storage & Databases → D1 SQL Database → Create* com o nome `gestor-promocoes`. Anotar o **Database ID**.
3. **Subdomínio workers.dev**: *Workers & Pages* mostra o subdomínio da conta (ex.: `seunome.workers.dev`). O endereço do gestor será `https://gestor-promocoes.<subdomínio>.workers.dev`.
4. **Token de API**: *My Profile → API Tokens → Create Token → Edit Cloudflare Workers* e adicionar a permissão *Account · D1 · Edit*. Copiar o token (aparece uma vez). Anotar também o **Account ID** (página inicial da conta).
5. **Chave de criptografia** (protege os tokens do Mercado Livre no banco): gerar no seu terminal
   `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`
   e guardar só no GitHub (passo 6). Se for perdida, será preciso reconectar a conta do Mercado Livre.
6. **GitHub → Settings → Secrets and variables → Actions**:
   - *Secrets*: `CLOUDFLARE_API_TOKEN` (passo 4), `ML_ENCRYPTION_KEY` (passo 5).
   - *Variables*: `CLOUDFLARE_ACCOUNT_ID`, `CF_WORKER_NAME=gestor-promocoes`, `CF_D1_DATABASE_NAME=gestor-promocoes`, `CF_D1_DATABASE_ID`, `PUBLIC_ORIGIN=https://gestor-promocoes.<subdomínio>.workers.dev`, `ML_CLIENT_ID=5716651302555823`, `CF_ACCESS_TEAM_DOMAIN` e `CF_ACCESS_AUD` (passo 8; pode deixar para depois — sem elas o build falha de propósito e nada é publicado).
7. **Primeira publicação**: *Actions → Publicar na Cloudflare → Run workflow*. Cria as tabelas no D1 e o Worker.
8. **Login (Cloudflare Access)**: no Worker, *Settings → Domains & Routes → workers.dev*, ativar o Cloudflare Access (os nomes no painel podem variar). Caminho alternativo: *Zero Trust → Access → Applications → Add an application → Self-hosted*, domínio `gestor-promocoes.<subdomínio>.workers.dev`, política *Allow* só para o seu e-mail, login por *One-time PIN*. Anotar o **Application Audience (AUD) Tag** (na aplicação) e o **team domain** (`<equipe>.cloudflareaccess.com`, em *Zero Trust → Settings*). Preencher `CF_ACCESS_TEAM_DOMAIN` e `CF_ACCESS_AUD` no GitHub e rodar o workflow de novo. Sem o Access ligado, o gestor recusa todas as requisições (não há login alternativo).
9. **Mercado Livre**: em https://developers.mercadolivre.com.br/devcenter, no app 5716651302555823, trocar a *URI de redirect* para `https://gestor-promocoes.<subdomínio>.workers.dev/integracoes/mercado-livre/retorno`.
10. **No gestor novo**: *Conexão com o Mercado Livre → chave secreta do app → Autorizar*; depois *Atualizar anúncios*. Custos e regras editados no site antigo precisam ser informados de novo.

## Depois de configurado
Cada merge na `main` roda testes, build, migrações do D1, publicação e a conferência final (a rota nova precisa existir). Falha em qualquer passo interrompe a publicação e mantém a versão anterior no ar. O resultado aparece em *GitHub → Actions*.

## Limites e riscos
- **Plano gratuito de Workers**: limite de 10 ms de CPU por requisição. Se aparecerem erros 1102 / "exceeded CPU", o plano Workers Paid (US$ 5/mês) resolve.
- O site antigo no ChatGPT deixa de ser atualizado; a automação "Publicar Gestor de Promoções" pode ser desativada no ChatGPT depois da migração.
- Dados do banco antigo (contas, importações, custos, regras) não são copiados; a conta do ML é reconectada no gestor novo.

## Validação desta preparação (24/09/2026)
- pnpm test 60/60 (4 novos em tests/access-auth.test.mjs: token válido; audiência, emissor e validade; assinatura de outra chave, conteúdo alterado, alg none, kid desconhecido; sub/e-mail ausentes e token malformado).
- Build sem variáveis: wrangler.json idêntico ao do Sites. Build com variáveis de teste: nome, D1 e vars corretos; faltando variável, o build para com a lista do que falta.
- `wrangler deploy --dry-run` com a configuração própria: 857 KiB (limite do plano gratuito: 3 MiB), bindings DB e vars corretos.
- Não validado localmente (Windows, "write EOF" do workerd): aplicação das migrações `drizzle/` pelo `wrangler d1 migrations apply`. A primeira execução do workflow confirma; se falhar, o passo para antes de publicar.
- ESLint/tsc sem erros novos (o erro set-state-in-effect em app/connection.tsx já existia).
