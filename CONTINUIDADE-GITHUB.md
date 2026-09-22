# Continuidade da colaboração no GitHub

Repositório: https://github.com/DherikCamargo/Gestor-Promocoes (privado).
Base: Site v32, commit de origem 7678cc95daf1b3b255ccb81de462d1dab2e92ad9.
Importação inicial do código rastreado, sem histórico Git, credenciais ou banco de produção. README e documentos de colaboração são complementos da exportação; código funcional é o mesmo da versão32.
Leia Continuidade-Gestor-Promocoes-v32.md para arquitetura, regras financeiras, incidentes e testes. Este arquivo atualiza a observação antiga de que o GitHub não estava configurado.

## Fluxo
Este GitHub passa a ser o local compartilhado para propor alterações. Atualizar main, criar branch por tarefa e abrir pull request para revisão de Dherik. O proprietário ainda precisa convidar seus amigos; nenhum convite foi enviado nesta importação. Proteções de branch e GitHub Actions não foram configurados. Em 22/09/2026 foi ativada a automação por evento de merge no ChatGPT, descrita em AUTOMACAO-PUBLICACAO.md.

O site publicado permanece no projeto Sites existente. Não há sincronização automática bidirecional. Antes de editar no ChatGPT ou Claude, verificar mudanças recentes no GitHub. A automação de merge fica responsável por trazer commits revisados para Sites, verificar o build e publicar no mesmo projeto. Não sobrescrever trabalho de outras pessoas. A sincronização automática é GitHub → Sites após merge; não existe sincronização automática Sites → GitHub. Não adicionar tokens ao repositório.

Adesões a promoções continuam bloqueadas. A nova tela principal permanece simples. Não prometer exatidão das propostas ainda não validada. O próximo teste funcional pendente é comparar o resumo real do MLB3575190873 com a conta conectada; não usar o print como valor fixo.

Após cada alteração, atualizar documentação de continuidade e registrar testes e limitações.
