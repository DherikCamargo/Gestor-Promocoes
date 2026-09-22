# Continuidade — todos os anúncios na abertura
22/09/2026. Base GitHub: 8b1bb6d1e4efcdf46fd0a9c7d90164925c93c88a.

Pedido: mostrar todos os anúncios diretamente na tela, sem exigir busca por MLB. Esta instrução substitui a preferência anterior de ocultar catálogo até pesquisar.

Mudança em app/simple-catalog.tsx:
- Carrega o catálogo importado ao abrir e renderiza todos os anúncios, deduplicados por MLB, sem paginação ou botão Mostrar mais.
- Mantém busca opcional; limpar o campo ou Ver todos restaura a lista completa.
- Cada anúncio mostra imediatamente nome e MLB. Preço/frete são consultados quando o cartão entra ou se aproxima da área visível (IntersectionObserver, 240px). Não faz centenas de chamadas ao abrir.
- Consultas de detalhes usam fila sequencial e cache em memória por run/MLB. Desmontagem cancela aplicação de resultados; tarefas ainda não iniciadas de cartões desmontados são descartadas.
- Importação pausa novas consultas dos cartões; ao concluir, limpa cache e mostra todos os anúncios da nova importação.
- Estados explícitos para carregamento, erro, ausência de importação e importação parcial.
- Os dados apresentados continuam restritos a nome/MLB, preço normal/promocional, tipo e frete. Sem fotos, estoque ou custos adicionais.
- O resolvedor de busca que protege contra códigos de família continua utilizado.

Limites: todos os anúncios do catálogo importado aparecem, não uma garantia de que a importação esteja completa. Valores remotos carregam progressivamente ao rolar; ausências e estimativas mantêm os rótulos da versão anterior. Não foram alterados endpoints, valores, custos, autenticação ou bloqueio de adesões.

Validação: build Vinext concluído antes do merge. Sem teste visual autenticado na conta ML. Publicação deve ser confirmada pela automação após merge; este documento por si só não confirma deploy. Documento completo anterior: Continuidade-Gestor-Promocoes-v32.md; último deploy conhecido antes desta mudança: v33.
