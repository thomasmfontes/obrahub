# Workflow de melhorias de usabilidade — ObraHub

Criado e encerrado em 30/09/2026.

**Status: concluído no escopo aprovado.** Foram implementadas 12 melhorias: UX-01 a UX-11 e UX-13. O UX-12 foi dispensado por decisão do usuário após a reversão de suas alterações. Não há tarefas pendentes neste workflow.

Este documento reúne o escopo das melhorias, as validações realizadas e as limitações registradas. As verificações no navegador utilizaram dados e serviços simulados; não equivalem a uma homologação em produção.

## Procedimento de implementação

1. Escolher a próxima tarefa, respeitando a ordem e as dependências abaixo.
2. Reproduzir o comportamento atual e registrar o resultado esperado.
3. Implementar a melhoria com escopo limitado à tarefa.
4. Validar o fluxo principal e os casos de erro pertinentes. Para alterações de código, executar `npm run build`.
5. Conferir no celular e no computador quando a tarefa afetar a interface; verificar teclado e foco quando afetar controles.
6. Marcar a tarefa como concluída apenas depois de cumprir seus critérios. Registrar arquivos alterados, validação e limitações na seção de acompanhamento.

Manter uma tarefa em andamento por vez. A conclusão do build não substitui a validação de usabilidade. Usar dados de teste; não enviar mensagens externas nem finalizar relatórios reais para validar o fluxo.

## Fase 1 — Confiança e recuperação

- [x] **UX-01 — Tornar o carregamento e suas falhas explícitos**
  - Distinguir carregamento, ausência de registros, falha de consulta e dados em cache.
  - Ajustar o retorno dos serviços para que erro não seja confundido com lista vazia.
  - Oferecer “Tentar novamente” e evitar apagar dados já exibidos durante uma atualização malsucedida.
  - Critério: uma falha de rede não apresenta “nenhum registro” como se a consulta tivesse funcionado; tentar novamente recupera a tela.
  - Referências: `src/services/neon.ts`, `src/App.tsx` e abas que carregam dados.

- [x] **UX-02 — Dar clareza ao salvamento e proteger a edição**
  - Mostrar “Salvando…”, “Alterações salvas” e “Não foi possível salvar” com ação para tentar novamente.
  - Diferenciar alterações pendentes de dados confirmados no servidor.
  - Impedir que uma falha de salvamento feche o formulário silenciosamente.
  - Verificar salvamento pendente ao voltar, avançar e trocar o dia; manter o conteúdo quando houver falha.
  - Critério: com falha de rede, a edição continua disponível, o erro fica visível e a nova tentativa salva os mesmos dados sem duplicação.
  - Dependência: UX-01.
  - Referências: `src/App.tsx`, `src/components/WizardHeader.tsx`.

- [x] **UX-03 — Corrigir a comunicação de envio por e-mail**
  - Separar “Relatório finalizado” de “Abrir e-mail para envio”.
  - Remover a afirmação de envio confirmado quando a ação apenas abre um `mailto:`.
  - Oferecer copiar o link e repetir a abertura do e-mail depois da finalização.
  - Revisar os rótulos “Automático” e “Manual” dos destinatários para refletir o comportamento disponível.
  - Critério: finalizar sem aplicativo de e-mail não informa que houve envio; o relatório concluído permite compartilhar depois.
  - Referências: `src/App.tsx`, `src/components/MembrosTab.tsx`, `src/components/NotificationCenterModal.tsx`, `src/components/ReportDetailModal.tsx`.

## Fase 2 — Preenchimento sem retrabalho

- [x] **UX-04 — Melhorar a validação dos dados da viagem**
  - Identificar os campos obrigatórios e opcionais.
  - Exibir erros próximos aos campos e focar o primeiro campo inválido.
  - Validar retorno igual ou posterior à saída; permitir viagem de um dia.
  - Permitir salvar rascunhos incompletos sem exigir os mesmos requisitos de avanço.
  - Critério: período inválido impede avanço com explicação; rascunho incompleto pode ser salvo e retomado sem transformar valores de exemplo em dados confirmados.
  - Dependência: UX-02.
  - Referências: `src/components/WizardStep1.tsx`, `src/App.tsx`.

- [x] **UX-05 — Criar relatório a partir dos dados da agenda**
  - Passar o evento selecionado à criação do relatório.
  - Preencher responsável, destino, período, participantes e observação aplicável.
  - Permitir conferir e ajustar os dados antes de avançar.
  - Critério: “Iniciar Relatório Desta Viagem” usa os dados daquele evento; dados ausentes ficam claramente disponíveis para preenchimento.
  - Dependência: UX-04.
  - Referências: `src/components/AgendaTab.tsx`, `src/App.tsx`.

- [x] **UX-06 — Disponibilizar todo o período no diário**
  - Remover o limite silencioso de 15 dias.
  - Adotar navegação por semanas ou calendário para períodos longos.
  - Indicar dias com registros, dia selecionado e dias sem registros.
  - Mostrar carregamento durante a troca de dia e evitar exibir conteúdo do dia anterior como se fosse do novo.
  - Critério: em uma viagem de 30 dias, todos os dias são acessíveis; a troca preserva o conteúdo e sua associação à data correta.
  - Dependência: UX-02 e UX-04.
  - Referências: `src/App.tsx`, `src/components/WizardStep2.tsx`.

- [x] **UX-07 — Retomar a última posição de preenchimento**
  - Persistir a última etapa e o último dia editado por relatório.
  - Retomar essa posição com os dados carregados.
  - Ajustar a ação de retomada para indicar etapa ou dia quando disponível.
  - Critério: sair no diário e reabrir o rascunho retorna ao mesmo dia; mudanças no período tratam uma data anteriormente selecionada que ficou fora da viagem.
  - Dependência: UX-02 e UX-06.
  - Referências: `src/App.tsx`, `src/components/DashboardTab.tsx`, `src/components/RelatoriosTab.tsx`, persistência do relatório.

## Fase 3 — Correção e revisão

- [x] **UX-08 — Permitir editar despesas e comprovantes**
  - Permitir corrigir descrição, categoria e valor de uma despesa existente.
  - Permitir trocar ou remover comprovante e visualizar o anexo.
  - Apresentar valores extraídos pela leitura automática como sugestões para conferência.
  - Critério: corrigir uma despesa atualiza o total sem criar outro item; falha ao salvar mantém a edição disponível.
  - Dependência: UX-02.
  - Referências: `src/App.tsx`, `src/components/WizardStep3.tsx`, `src/services/neon.ts`.

- [x] **UX-09 — Proteger exclusões de fotos e despesas**
  - Exibir confirmação com identificação do item antes de remover, ou implementar desfazer com recuperação real.
  - Mostrar progresso e falha da exclusão.
  - Critério: um toque acidental não causa perda imediata; cancelar preserva o item e o total; falha não remove o item da tela como se tivesse funcionado.
  - Referências: `src/App.tsx`, `src/components/WizardStep2.tsx`, `src/components/WizardStep3.tsx`.

- [x] **UX-10 — Criar revisão antes da finalização**
  - Mostrar dados da viagem, período, total de despesas e destinatários selecionados.
  - Sinalizar dias sem atividades e despesas sem comprovante com links para correção.
  - Explicar por que a finalização está indisponível quando faltar a declaração.
  - Tratar ausência de atividades ou comprovantes como avisos até que as regras do ministério definam se são obrigatórios.
  - Critério: o usuário consegue localizar e corrigir uma pendência antes de concluir; a revisão distingue avisos de impedimentos.
  - Dependência: UX-03, UX-04, UX-06 e UX-08.
  - Referências: `src/components/WizardStep3.tsx`, `src/App.tsx`.

## Fase 4 — Acessibilidade e conforto

- [x] **UX-11 — Melhorar teclado, foco e semântica dos controles**
  - Associar rótulos aos campos e usar checkbox real na declaração.
  - Completar navegação por teclado dos seletores, incluindo setas, Enter e Escape.
  - Nos modais, mover e conter o foco, permitir fechamento por Escape quando aplicável e devolver foco ao acionador.
  - Dar nomes acessíveis aos botões de ícone e anunciar estados relevantes de salvamento.
  - Critério: criar e revisar um relatório é possível usando teclado; o foco permanece visível e não navega pelo fundo de um modal aberto.
  - Aplicar estes cuidados também nas tarefas anteriores, sem esperar esta fase.
  - Referências: `src/components/CustomSelect.tsx`, `src/components/BottomSheet.tsx` e formulários.

- **UX-12 — Aumentar legibilidade e áreas de toque — Dispensada**
  - Decisão em 30/09/2026: não implementar esta tarefa. As alterações iniciadas foram desfeitas a pedido do usuário; o escopo abaixo fica registrado apenas como histórico.
  - Revisar textos pequenos, contraste, truncamentos e botões de ação.
  - Buscar áreas de toque de pelo menos 44 × 44 px nos controles principais.
  - Conferir formulários com teclado virtual e ampliação de texto.
  - Respeitar preferência por movimento reduzido nas animações.
  - Critério: em tela estreita e com texto ampliado, informações e ações essenciais continuam acessíveis sem sobreposição.
  - Referências: componentes de interface e `src/index.css`.

- [x] **UX-13 — Adaptar o layout para computador**
  - Ampliar a área útil em telas grandes, com navegação e listas adequadas ao espaço disponível.
  - Aproveitar colunas para revisão e detalhes quando ajudar a leitura.
  - Preservar o fluxo móvel e a acessibilidade das ações fixas.
  - Critério: listas e relatórios aproveitam a largura no computador; no celular, a navegação e os formulários continuam utilizáveis.
  - Dependência: conclusão dos fluxos das fases 1 a 3.
  - Referências: `src/App.tsx`, abas e `src/index.css`.

## Registro de conclusão

**Encerramento:** 30/09/2026. Todas as tarefas do escopo aprovado foram concluídas; UX-12 dispensada por decisão do usuário.

| Tarefa | Situação final |
| --- | --- |
| UX-01 | Concluída |
| UX-02 | Concluída |
| UX-03 | Concluída |
| UX-04 | Concluída |
| UX-05 | Concluída |
| UX-06 | Concluída |
| UX-07 | Concluída |
| UX-08 | Concluída |
| UX-09 | Concluída |
| UX-10 | Concluída |
| UX-11 | Concluída |
| UX-12 | Dispensada |
| UX-13 | Concluída |

## Histórico de implementação

### UX-01 — Concluída em 30/09/2026

**Arquivos e escopo:** Serviços Neon, carregamento no App, Agenda, Relatórios, Membros, destinatários no detalhe, LoadFeedback, loadResource e teste dedicado

**Validação e resultado:** TypeScript e build aprovados; testes de falha inicial, consulta vazia, cache, preservação dos dados, recuperação, armazenamento indisponível/corrompido e sete consultas sem cliente. Navegador: erro e nova tentativa em Relatórios; erro em Agenda, Membros e E-mails, sem falso estado vazio. Layout conferido em largura padrão e 375 px.

**Limitações:** Validação isolada sem acesso ao banco real. Cache usado apenas para resultados confirmados das consultas; não é uma fila de sincronização de edições. O npm do ambiente está quebrado: validação executada diretamente com Node e ferramentas locais.

### UX-02 — Concluída em 30/09/2026

**Arquivos e escopo:** App, WizardHeader, WizardStep2, serviços Neon, SaveQueue e teste dedicado

**Validação e resultado:** Estados pendente, salvando, salvo e erro com nova tentativa; gravações em sequência com conteúdo atualizado; navegação aguarda confirmação. Testes cobrem alterações durante gravação, falhas por recurso, recuperação, duplicação, limpeza de timers e confirmação do servidor. Navegador com transporte simulado: falhas bloqueiam voltar, avançar e trocar dia sem perder conteúdo; recuperação salva o mesmo texto e declaração; leitura malsucedida preserva o dia atual. Layout conferido em 375 px. TypeScript, build e regressão UX-01 aprovados.

**Limitações:** Validação sem banco real e sem envio externo. Alterações pendentes permanecem na sessão aberta; aviso ao fechar/recarregar com alterações não confirmadas. Não implementa sincronização offline após fechar o aplicativo.

### UX-03 — Concluída em 30/09/2026

**Arquivos e escopo:** App, serviços Neon, ReportDetailModal, MembrosTab, NotificationCenterModal, reportSharing e testes

**Validação e resultado:** Finalização confirmada pelo servidor abre os detalhes sem abrir e-mail; preparação separada com destinatários, copiar link, nova tentativa e aviso explícito de envio pelo usuário. Rótulos de seleção padrão corrigidos. TypeScript, build, testes UX-03 e regressões UX-01/02 aprovados. Navegador com dados simulados: conclusão, destinatário manual desmarcado, cópia bem-sucedida, abertura interceptada sem aplicativo e falha de cópia com alternativa manual. Layout conferido em 375 px.

**Limitações:** Sem acesso ao banco real e sem envio externo. O mailto solicita abertura do aplicativo; não confirma entrega ou envio.

### UX-04 — Concluída em 30/09/2026

**Arquivos e escopo:** App, WizardStep1, CustomSelect, serviços Neon, tripValidation e teste dedicado

**Validação e resultado:** Campos obrigatórios identificados, objetivo opcional, erros próximos aos campos com foco no primeiro inválido; validação de datas reais e retorno igual ou posterior à saída. Ação Salvar rascunho permite dados incompletos; nomes, datas e objetivo vazios não recebem valores de exemplo. Navegador isolado: bloqueio com quatro campos vazios, foco, salvamento e retomada sem preenchimento inventado, período invertido, correção e avanço para diário de um dia. Layout conferido em 375 px. TypeScript, build e testes UX-01 a UX-04 aprovados.

**Limitações:** Sem gravações no banco real. Datas vazias são enviadas como NULL, conforme a flexibilização prevista em scripts/adjust_schema.js; a migração existente não foi executada nesta tarefa.

### UX-05 — Concluída em 30/09/2026

**Arquivos e escopo:** AgendaTab, App, WizardStep1, agendaReport e teste dedicado

**Validação e resultado:** A ação recebe o evento selecionado e preenche responsável, destino, datas, comitiva e observações no passo 1. Aviso identifica a viagem, orienta revisão e explica a comitiva inicial quando ausente. Dados ausentes ficam vazios; observações longas são preservadas. Navegador isolado: duas viagens distintas, preenchimento completo, ajustes de objetivo e participantes, salvamento e retomada; agenda preservada; viagem incompleta bloqueia avanço com campos faltantes e mantém o destino e a data corretos. Layout conferido em 375 px. TypeScript, build e testes UX-01 a UX-05 aprovados.

**Limitações:** Sem banco real ou envio externo. Os dados são copiados na criação: alterações posteriores da agenda não sincronizam automaticamente com o relatório.

### UX-06 — Concluída em 30/09/2026

**Arquivos e escopo:** App, WizardStep2, serviços Neon, tripDays e teste dedicado

**Validação e resultado:** Removido limite de 15 dias; navegação por semanas e seletor de data dentro da viagem. Dia selecionado e data em edição explícitos, indicação de diário salvo/sem diário salvo e consulta indisponível com nova tentativa. Carregamento da troca anunciado fora da região bloqueada; data e conteúdo substituídos apenas após leitura completa. Navegador isolado: acesso ao dia 30 pela quinta semana, carregamento, falha ao abrir dia 29 preservando dia 30, nova tentativa, gravação exclusiva do dia 29 e retomada com indicação atualizada. Layout conferido em 375 px. TypeScript, build e testes UX-01 a UX-06 aprovados.

**Limitações:** Sem banco real, envio externo ou teste de microfone. A indicação representa existência de um diário salvo, não valida completude do relato ou das evidências.

### UX-07 — Concluída em 30/09/2026

**Arquivos e escopo:** App, WizardHeader, DashboardTab, RelatoriosTab, reportPosition e teste dedicado

**Validação e resultado:** Posição armazenada por protocolo; retomada carrega despesas, diário e fotos antes de abrir a etapa lembrada. Botão e lista indicam diário/data ou financeiro. Salvar e sair aguarda confirmação e mantém a posição. Dia fora do período retorna à nova saída; dados básicos incompletos retornam ao passo 1. Posição removida após conclusão. Testes cobrem relatórios independentes, nova sessão, etapas, período alterado, armazenamento corrompido/indisponível e limpeza. Navegador isolado: recarregar no dia 29 retorna ao mesmo dia e relato; etapa financeira retomada; período reduzido retorna a 02/09; salvar e sair e retomada direta. Layout conferido em 375 px. TypeScript, build e testes UX-01 a UX-07 aprovados.

**Limitações:** Posição guardada neste navegador, sem sincronização entre dispositivos. Armazenamento indisponível mantém a posição apenas na sessão. Validação sem banco real ou envio externo.

### UX-08 — Concluída em 30/09/2026

**Arquivos e escopo:** App, WizardStep3, serviços Neon e teste dedicado

**Validação e resultado:** Edição de descrição, categoria, valor e comprovantes atualiza o mesmo registro com escopo do relatório. Total recalculado e enfileirado para confirmação. Links de visualização, troca e remoção de anexos ao salvar. Leitura automática oferece sugestões aplicadas apenas por ação explícita; resultados antigos são descartados. Upload confirmado reutilizado em nova tentativa de gravação. Navegador com serviços simulados: falha mantém edição, nova tentativa atualiza 1 item e total de R$ 100 para R$ 125; remoção preservada; anexo de imagem de teste, sugestão de R$ 250 sem sobrescrever edição, aplicação voluntária, salvamento e reabertura com anexo. Layout conferido em 375 px. TypeScript, build e testes UX-01 a UX-08 aprovados.

**Limitações:** Sem banco real, upload externo ou OCR real nesta validação. Trocar substitui o conjunto de comprovantes da despesa; remover retira referências do relatório, preservando arquivos já armazenados.

### UX-09 — Concluída em 30/09/2026

**Arquivos e escopo:** App, BottomSheet, serviços Neon e teste dedicado

**Validação e resultado:** Exclusão requer confirmação com legenda da foto ou descrição e valor da despesa. Progresso explícito, confirmação/cancelamento/fechamento bloqueados durante a operação e proteção contra chamadas duplicadas. Remoção da tela apenas após RETURNING confirmar o identificador; erro preserva item e oferece nova tentativa. Exclusão de despesa recalcula e enfileira o total. Navegador isolado: cancelamento, falha, progresso e recuperação para foto e despesa; despesa e total de R$ 100 preservados na falha, total R$ 0 após sucesso. Layout conferido em 375 px. TypeScript, build e testes UX-01 a UX-09 aprovados.

**Limitações:** Validação sem banco real ou exclusão de arquivos externos. Remoção do registro no relatório preserva os arquivos existentes no armazenamento.

### UX-10 — Concluída em 30/09/2026

**Arquivos e escopo:** App, WizardStep3, ReportReview, ReportDetailModal, serviços Neon, reportReview e teste dedicado

**Validação e resultado:** Revisar relatório abre resumo de protocolo, responsável, destino, período, comitiva, objetivo, total e destinatários. Consultas estritas conferem relatos e comprovantes; falha bloqueia confirmação e permite nova tentativa. Dias sem relato e despesas sem comprovante disponível são avisos com ações para o diário ou editor corretos. Declaração obrigatória com explicação explícita e checkbox nativo na revisão. Confirmação aguarda salvamento; erros mantêm a revisão. Seleção de e-mails preservada para preparação após concluir. Navegador isolado: erro e recuperação da revisão, correção do dia 02/09 removendo seu aviso, acesso ao editor da despesa, bloqueio sem declaração e conclusão com avisos presentes, sem envio de e-mail. Layout conferido em 375 px. TypeScript, build e testes UX-01 a UX-10 aprovados.

**Limitações:** Sem banco real, finalização real ou envio externo. Ausência de relato/comprovante é aviso; revisão não valida o conteúdo fiscal dos arquivos.

### UX-11 — Concluída em 30/09/2026

**Arquivos e escopo:** CustomSelect, BottomSheet, WizardStep2, WizardStep3, App e index.css

**Validação e resultado:** Seletores com setas, Enter, Escape, foco devolvido ao gatilho, opção ativa e relações ARIA; limpar seleção usa botão independente. Modais identificados, foco inicial, contenção por Tab/Shift+Tab, Escape e retorno ao acionador, inclusive sobrepostos; fechamento bloqueado durante operações. Declaração nativa, switch com estado, campos do diário e anexos acessíveis pelo teclado; foco visível global. Navegador com componentes isolados: seleção de Bruno por setas/Enter, Escape fecha apenas seletor, Tab do último controle retorna ao primeiro, modal sobreposto devolve foco ao acionador e Escape respeita bloqueio de fechamento. TypeScript, build e testes UX-01 a UX-10 aprovados.

**Limitações:** Validação isolada sem banco ou envio externo. Não foi feita avaliação com leitor de tela real nem repetição integral do fluxo com dados de produção.

### UX-12 — Dispensada em 30/09/2026

**Arquivos e escopo:** Nenhuma alteração mantida.

**Validação e resultado:** A implementação iniciada foi revertida a pedido do usuário. Em seguida, o usuário decidiu não realizar a tarefa.

**Limitações:** O escopo de legibilidade, áreas de toque, texto ampliado e movimento reduzido não foi implementado por esta tarefa.

### UX-13 — Concluída em 30/09/2026

**Arquivos e escopo:** App, DashboardTab, AgendaTab, RelatoriosTab, MembrosTab, WizardStep1/2/3, BottomSheet, ReportReview, ReportDetailModal e index.css

**Validação e resultado:** A partir de 1024 px, área de até 1200 px, navegação superior com todas as abas visíveis e indicação da aba atual; listas em duas colunas; formulários de até 1000 px e ações de até 640 px; modais centralizados, revisão e detalhes amplos com colunas. Navegador com serviços simulados: dashboard, seis relatórios, quatro eventos e quatro membros em 1440 px; avanço por teclado até revisão; detalhes de relatório concluído; fechamento por Escape. Em 1024 px, modal dentro da tela; em 375 px, revisão em coluna, lista em coluna e navegação inferior fixa, sem rolagem horizontal. TypeScript, build e regressões UX-01 a UX-10 aprovados.

**Limitações:** Sem banco real, envio externo ou finalização real. UX-12 foi desfeito e posteriormente dispensado por decisão do usuário; ajustes de UX-13 são restritos ao layout desktop.
