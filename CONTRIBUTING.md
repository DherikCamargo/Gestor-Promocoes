# Colaboração

## Fluxo combinado
1. Clone o repositório que Dherik informar.
2. Atualize main antes de começar e crie uma branch por tarefa: git switch -c feat/nome-da-tarefa.
3. Faça alterações pequenas e descreva o problema resolvido.
4. Execute as verificações relevantes e pnpm run build. Registre o que não foi testado.
5. Envie sua branch e abra um pull request. Dherik revisa antes de incorporar em main.
6. Atualize o documento de continuidade após cada alteração, com arquivos, regras afetadas, evidências, testes e pendências.

Esse é um fluxo recomendado de trabalho; proteção de branch e revisão obrigatória ainda não foram configuradas no GitHub.

## Cuidados do projeto
Não inserir tokens, chaves secretas, arquivos de ambiente real, banco de produção ou exports de contas no Git. Não desabilitar autenticação para facilitar testes. Use dados fictícios para desenvolvimento.
Não sobrescrever mudanças de outros colaboradores, recriar o sistema ou trocar o framework sem combinar.
Preço atual, oferta candidata e promoção ativa são dados distintos. Preserve a identidade MLB/variação/campanha/ref_id e trate dados ausentes como ausentes.
Adesão continua bloqueada. Alterar código e publicar o site são etapas diferentes; combinar a publicação com Dherik.

## Convites
Depois de criar o repositório privado, o proprietário pode abrir Settings > Collaborators > Add people e convidar os nomes de usuário desejados. Acesso passa a valer depois da aceitação. Não são necessários compartilhamento de senha ou tokens pessoais.
Fonte: https://docs.github.com/pt/repositories/managing-your-repositorys-settings-and-features/repository-access-and-collaboration/inviting-collaborators-to-a-personal-repository
