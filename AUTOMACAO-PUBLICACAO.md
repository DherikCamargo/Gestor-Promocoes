# Continuidade — publicação automática
Atualizado em 22/09/2026.

## Configuração confirmada
A tarefa **Publicar Gestor de Promoções** foi criada e retornou is_enabled=true. Gatilho: pull request incorporado no repositório DherikCamargo/Gestor-Promocoes; a execução deve verificar que a base é main antes de agir. Não possui agenda nem consulta periódica.

Fluxo: branch → pull request → revisão → merge na main → tarefa ChatGPT → consulta do código → verificações/build → publicação no Sites → relatório para Dherik.

## Limites
- Commits diretos na main não acionam a tarefa.
- Não é um workflow do GitHub Actions, nem integração nativa push-to-deploy do Sites.
- Depende das conexões autorizadas GitHub/Sites e das ferramentas disponíveis para a tarefa.
- Não há garantia de execução instantânea ou de sucesso de cada publicação.
- A configuração foi confirmada pela ferramenta de automações; ainda não foi observado um teste completo disparado por merge.
- Nenhum merge artificial foi criado para testar; a primeira execução deverá ser acompanhada.
- Proteção da main e exigência de aprovação continuam não configuradas. Revisão é o fluxo combinado, não uma regra imposta pelo repositório.

## Publicação e preservação
Projeto Sites appgprj_6aac200bdf848191b756d03df83a8777.
URL https://gestor-promocoes-dherik.dherikjcamargo.chatgpt.site .
Audiência pública preservada.
Base Sites v32: 7678cc95daf1b3b255ccb81de462d1dab2e92ad9.
Base GitHub equivalente: c961ccb16369a5a2e6ef298a6b2f507c5f7c11ed.
Os dois repositórios têm históricos diferentes. Preservar alterações concorrentes e parar em conflito que exigiria descartar trabalho.

A tarefa foi instruída a registrar .openai/github-sync.json no checkout Sites para rastrear o SHA GitHub publicado, evitar duplicatas, verificar avanço de main/deploys e confirmar status succeeded. Falhas devem manter a versão anterior e ser relatadas; não alterar o sistema para mascarar falhas.

Adesões continuam bloqueadas por PARTICIPATION_PAUSED. Automatizar deploy não autoriza operações na conta do Mercado Livre nem reabertura das adesões. Preservar autenticação, banco, segredos, URL e Site existente.

## Verificação e continuidade
Foram verificadas as conexões por consultas somente leitura no GitHub e Sites, consultado o schema oficial do gatilho e confirmada a criação da automação habilitada. Esta entrega altera configuração da tarefa e documentação; não modifica a lógica do aplicativo nem publica uma nova versão Sites.

Leia também CONTINUIDADE-GITHUB.md e Continuidade-Gestor-Promocoes-v32.md. Após a primeira execução, registrar PR, SHA GitHub, SHA Sites, versão, status e URL do deploy no documento de continuidade. Não criar commits de retorno automáticos que causem loops.
