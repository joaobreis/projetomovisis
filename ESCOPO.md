# Dashboards e relatórios da concessionária — Escopo Técnico Funcional

| Campo | Valor |
|---|---|
| Projeto | Dashboards e relatórios da concessionária |
| Versão | 2.1 |
| Data | 12/11/2026 |
| Elaborado por | Agent (Governador), em entrevista com autopremiet1069p01@imersao.mitralab.io |
| Status | Em elaboração |

## 2. Objetivo

A concessionária Auto Premier usa o ERP **Linx DMS Apollo**. Hoje as informações do ERP são acompanhadas pelo site **Movisis** (app.movisis.com.br), que é conectado ao ERP e apresenta os dados de forma mais clara. O Movisis tem vários menus que geram listas, por exemplo entregas por vendedor, agendamentos do dia e leads de clientes. Cada lista tem um menu de exportação para JSON. O acompanhamento é feito olhando o site, lista a lista, sem uma visão consolidada da loja.

O objetivo deste sistema é **trazer os dados dessas listas do Movisis** e transformá-los em **dashboards e relatórios por área da loja**: venda de veículos novos, venda de seminovos, oficina, peças e financeiro (só cashback e Pix dos clientes). A área de F&I fica fora deste escopo.

O diretor e os gerentes consultam os relatórios **diariamente**, com filtros de data e período. Os dados devem ser atualizados **várias vezes ao dia**. Cada gerente vê só a sua área, o diretor vê todas, e um menu de permissões define o que cada usuário alcança.

## 3. Atores e personas

| Persona | Responsabilidade | Interação com o sistema |
|---|---|---|
| Diretor (dono) | Visão geral do negócio e decisões estratégicas | Vê os dashboards e relatórios de todas as áreas, diariamente, com filtros de data e período |
| Gerente de vendas de novos | Gestão da venda de veículos novos | Vê só os dashboards e relatórios de novos |
| Gerente de seminovos | Gestão da venda de seminovos | Vê só os dashboards e relatórios de seminovos |
| Gerente de oficina | Gestão da oficina e do pós-venda | Vê só os dashboards e relatórios da oficina |
| Gerente de peças | Gestão da venda de peças | Vê só os dashboards e relatórios de peças |
| Gerente financeiro | Acompanhamento de cashback e Pix dos clientes | Vê só os dashboards e relatórios do financeiro |
| Administrador de acessos | Controle de quem vê o quê | Define, no menu de permissões, quais áreas cada usuário alcança (quem ocupa esse papel está em aberto: PA-03) |

## 4. Pré-condições

| ID | Descrição | Tipo |
|---|---|---|
| PC-01 | Usuário dedicado à integração criado no Linx DMS Apollo, ativo (não precisa de permissões no DMS) | Obrigatória |
| PC-02 | Esse usuário importado no Movisis, com Tipo de Acesso "Webservice" marcado | Obrigatória |
| PC-03 | O usuário Webservice tem, no Movisis, as permissões de leitura de cada dado usado nos relatórios (vendas, OS, agendamentos, clientes, peças, cashback, Pix) | Obrigatória |
| PC-04 | Acesso à API do Movisis (REST, JSON, autenticação HTTP Basic com login e senha do usuário Webservice) | Obrigatória |
| PC-05 | Documentação das integrações da API que trazem os dados de cada área | Obrigatória |
| PC-06 | Diretor e gerentes têm acesso ao Mitra para consultar os relatórios | Obrigatória |
| PC-07 | Exportação JSON das listas do Movisis, como alternativa se algum dado não estiver na API | Desejável |

## 5. Glossário

| Termo | Definição |
|---|---|
| Movisis | Site (app.movisis.com.br) conectado ao ERP que mostra os dados da loja em listas |
| Linx DMS Apollo | ERP da concessionária, origem dos dados exibidos no Movisis |
| Lista | Relatório tabular de um menu do Movisis (ex.: entregas por vendedor, agendamentos do dia, leads de clientes) |
| Exportação JSON | Arquivo gerado pelo menu de exportação de uma lista do Movisis |
| Área | Setor da loja com dashboard próprio: Novos, Seminovos, Oficina, Peças ou Financeiro |
| OS (ordem de serviço) | Registro de um serviço da oficina, da abertura ao fechamento |
| OS aberta há mais de 30 dias | OS ainda não fechada cuja abertura foi há mais de 30 dias da data de consulta |
| Agendamento | Horário marcado por um cliente na oficina |
| App do cliente | Aplicativo da concessionária; o cliente é classificado como com ou sem app baixado |
| Cashback | Valor devolvido ao cliente como benefício, acompanhado no Financeiro |
| Pix | Pagamentos de clientes feitos por Pix, acompanhados no Financeiro |
| Ranking de vendedores | Ordenação dos vendedores de uma área pelo resultado de vendas |
| Menu de permissões | Tela em que se define quais áreas cada usuário vê |

## 6. Regras de negócio

**RN-01 — Origem dos dados.** Os dados vêm da API do Movisis (REST, JSON, autenticação HTTP Basic com o usuário Webservice). Toda chamada informa o domínio da loja (a parte depois do @ no login) e os IDs das lojas pesquisadas (FILTRO_LOJAS, do Cadastro de Lojas do Movisis). Integrações usadas:
- **API 5 — Lista ordens de serviço:** loja, número da OS, cliente, situação, data de abertura, data de encerramento, consultor, categoria, total de peças, total de serviços e total da OS. Filtra o período por andamento (0), data de abertura (1) ou data de encerramento (2).
- **API 8 — Buscar Lista Agenda de Entrega:** loja, proposta, cliente, vendedor, tipo de venda, marca, modelo, data da nota fiscal, situação da entrega e se o cliente tem cadastro no app. Filtra o período por faturamento, data agendada, data de entrega ou pendentes.
- **API 6 — Buscar Movimentações de Entrega:** movimentações de um dia, com a indicação de veículo novo ou usado (NovoUsado), cruzada com a API 8 pelo chassi ou pela proposta quando for preciso separar Novos de Seminovos (PA-11).
O que a API não traz vem da exportação JSON das listas do Movisis ou fica fora até haver fonte (PA-02).

**RN-02 — Frequência de atualização.** Os dados são atualizados automaticamente pela API várias vezes ao dia (intervalo em PA-09). Cada relatório mostra a data e a hora da última atualização. Se uma atualização falhar, os relatórios continuam com os dados da última atualização bem-sucedida.

**RN-03 — Áreas do sistema.** Cinco áreas: Novos, Seminovos, Oficina, Peças e Financeiro. F&I fica fora deste escopo. O sistema só lê dados do Movisis: as integrações que gravam (1, 3 e 9) ficam fora.

**RN-04 — Vendas de Novos e Seminovos.** Fonte: API 8 com o período por Faturamento (data da nota fiscal). Uma venda é uma proposta com nota fiscal no período; propostas com situação Cancelada ou Devolvido não contam (PA-12). Indicadores: quantidade de vendas da área, quantidade por vendedor (campo Nome Vendedor) e ranking de vendedores pela quantidade. Exemplo: de 01/11 a 10/11, a vendedora A teve 12 notas e o vendedor B teve 9, então A fica em 1º e B em 2º, e a área soma 21 vendas. O faturamento do setor depende de uma fonte com o valor da venda, que a API 8 não traz (PA-02).

**RN-05 — Oficina: OS abertas há mais de 30 dias.** Fonte: API 5 com TIPO_DATA = 0 (andamento). Entra a OS ainda não encerrada cuja data de abertura está a mais de 30 dias da data da consulta. Exemplo: OS aberta em 01/10 e ainda aberta em 05/11 tem 35 dias e entra. OS aberta em 20/10 e consultada em 05/11 tem 16 dias e não entra. A lista mostra número da OS, cliente, consultor, data de abertura, dias em aberto e total da OS.

**RN-06 — Oficina: clientes com e sem app e agendamentos pelo app.** Decidido em 12/11: clientes com e sem app = clientes distintos que compraram veículo no período e nas lojas do filtro, pelo campo Cadastro App da API 8 (a base são os compradores). O campo ViaApp da OS (API 5) indica se o agendamento foi feito pelo app e alimenta o indicador "% de agendamentos feitos pelo app" = OS com ViaApp ÷ OS abertas no período. Clientes da oficina sem compra de veículo não têm fonte na API: fase 2.

**RN-07 — Oficina: agendamentos por período.** Quantidade de agendamentos da oficina no período do filtro. A API atual não traz a agenda da oficina (a API 8 é a agenda de entrega de veículos): fonte em PA-02.

**RN-08 — Peças.** Faturamento do setor e por vendedor. A API 5 traz apenas o total de peças aplicadas em cada OS (TotalPecas), sem vendedor e sem a venda de balcão: fonte completa em PA-02.

**RN-09 — Financeiro.** Somente cashback e Pix dos clientes. A API atual não traz esses dados: fonte em PA-02 e números em PA-05.

**RN-10 — Filtros.** Todos os relatórios têm filtro de data e de período (data inicial e final) e filtro de loja, já que a API trabalha por loja. Demais filtros em PA-06.

**RN-11 — Permissão por área.** Cada usuário só vê as áreas liberadas para ele. O diretor vê as cinco áreas. Cada gerente vê apenas a própria. Exemplo: o gerente de peças abre o sistema e vê só Peças.

**RN-12 — Menu de permissões.** Um menu em que o administrador escolhe, para cada usuário, quais áreas ele alcança. A mudança vale a partir do próximo acesso do usuário.

## 7. Fluxo principal (caminho feliz)

| Passo | Descrição |
|---|---|
| 1 | Em horários programados ao longo do dia, o sistema chama a API do Movisis com o usuário de integração, para todas as lojas da Auto Premier |
| 2 | O sistema busca a Agenda de Entrega (API 8, período por Faturamento) e as Movimentações de Entrega do dia (API 6) |
| 3 | O sistema busca as ordens de serviço (API 5): em andamento, abertas e encerradas no período |
| 4 | O sistema guarda os dados recebidos e registra a data e a hora da atualização |
| 5 | O usuário entra no sistema pelo Mitra |
| 6 | O sistema identifica o usuário e mostra só as áreas liberadas para ele no menu de permissões |
| 7 | O usuário abre uma área (ex.: Novos) e vê os indicadores do mês corrente |
| 8 | O usuário muda o período, a loja ou o vendedor no filtro, e os indicadores e listas se recalculam |
| 9 | O usuário clica num vendedor do ranking e o restante da tela passa a mostrar só aquele vendedor |
| 10 | Na Oficina, o usuário abre a lista de OS abertas há mais de 30 dias e vê cada OS com cliente, consultor e dias em aberto |
| 11 | O diretor abre o menu de permissões, escolhe um usuário, marca as áreas dele e salva |

## 8. Fluxos alternativos e exceções

| ID | Cenário | Comportamento esperado |
|---|---|---|
| FA-01 | A API do Movisis não responde ou devolve erro | Os relatórios continuam com os dados da última atualização bem-sucedida e mostram a data e hora dela; a falha fica registrada |
| FA-02 | Login ou senha do usuário de integração recusados | A atualização para e o diretor vê um aviso de que a integração precisa de nova credencial |
| FA-03 | A API recusa uma loja ("loja sem permissão") | As outras lojas são atualizadas normalmente; a loja recusada aparece como sem dados atualizados |
| FA-04 | Período do filtro sem dados | A tela mostra os indicadores zerados e a mensagem "Sem dados no período" |
| FA-05 | Usuário sem nenhuma área liberada | Ao entrar, vê a mensagem de que ainda não tem acesso e que deve pedir ao diretor |
| FA-06 | Usuário tenta abrir uma área que não é dele (por endereço direto) | O sistema bloqueia e não mostra nenhum dado daquela área |
| FA-07 | Proposta Cancelada ou Devolvida | Não conta como venda |
| FA-08 | Indicador sem fonte na API (faturamento, peças, financeiro, agenda da oficina) | A área mostra o indicador como "em breve" ou não o mostra, sem número inventado |

## 9. Critérios de aceite

| ID | Critério |
|---|---|
| CA-01 | O sistema autentica na API do Movisis com o usuário de integração e recebe Sucesso = true |
| CA-02 | Os dados são atualizados automaticamente pelo menos 4 vezes ao dia, sem ação manual |
| CA-03 | Toda tela mostra a data e a hora da última atualização |
| CA-04 | Novos e Seminovos mostram a quantidade de vendas no período, igual à contagem da Agenda de Entrega do Movisis com o mesmo filtro |
| CA-05 | O ranking de vendedores ordena pela quantidade de vendas, do maior para o menor |
| CA-06 | A quantidade por vendedor soma exatamente o total da área |
| CA-07 | Propostas Canceladas e Devolvidas não entram na contagem |
| CA-08 | A Oficina lista apenas OS não encerradas com mais de 30 dias desde a abertura (OS de 35 dias entra; de 16 dias não) |
| CA-09 | A Oficina mostra a quantidade de clientes com e sem app no período |
| CA-10 | Todos os relatórios têm filtro de período (data inicial e final) e de loja, e os números mudam ao trocar o filtro |
| CA-11 | O diretor vê as cinco áreas; um gerente vê só a sua |
| CA-12 | No menu de permissões, o diretor libera ou tira uma área de um usuário e a mudança vale no próximo acesso |
| CA-13 | Um usuário não consegue ver dado de área não liberada nem por endereço direto |
| CA-14 | Se a API falhar, os relatórios continuam com os últimos dados e a falha fica registrada |
| CA-15 | Nenhum número sem fonte é exibido (faturamento, peças, cashback, Pix ficam para a fase 2) |

## 10. Pontos em aberto

| ID | Ponto | Questão |
|---|---|---|
| PA-01 | Fase 2 | Faturamento de Novos e Seminovos, Peças, cashback, Pix e agenda da oficina ficam para uma fase 2, quando houver fonte (decisão da loja em 12/11) |
| PA-02 | IDs das lojas na API | **Resolvido em 12/11.** ID (FILTRO_LOJAS) · loja · CNPJ: 1 = 2.1 Auto Premier (Jeep/RAM, Joinville) · 16.099.559/0001-50; 2 = 3.1 Premier Seminovos (Joinville) · 48.434.539/0001-85; 3 = 4.1 KIA Blumenau · 00.208.817/0001-50; 4 = 4.2 KIA Florianópolis · 00.208.817/0004-00; 5 = 4.3 KIA Balneário Camboriú · 00.208.817/0003-11; 6 = 4.4 KIA Joinville · 00.208.817/0002-30; 7 = 4.5 KIA Jaraguá do Sul · 00.208.817/0009-07. Grupos: Auto Premier Jeep (1, 2) e Auto Premier Kia (3 a 7). Oficina mecânica em todas, menos a 3.1 Premier Seminovos. Todas as lojas: FILTRO_LOJAS = "1,2,3,4,5,6,7" |
| PA-03 | Usuário Webservice | O usuário de integração (mitra@autopremier) está com Tipo de Acesso Webservice marcado no Movisis? |
| PA-04 | Novos × Seminovos | Seminovos = vendas da loja 3.1 Premier Seminovos (ID 2) e/ou veículos marcados como usados (NovoUsado = U na API 6)? |
| PA-05 | Vendas diretas e frotista | Venda Direta e Frotista contam junto com a Venda Normal? |
| PA-06 | Clientes com app | **Resolvido em 12/11.** Com/sem app = Cadastro App da API 8 (compradores, clientes distintos). ViaApp da OS = % de agendamentos feitos pelo app. Clientes da oficina sem compra: fase 2 |
| PA-07 | Administrador de acessos | Só o diretor mexe no menu de permissões? |
| PA-08 | Intervalo de atualização | Proposta: a cada 2 horas, das 7h às 21h. Confirmar e conferir se a API tem limite de chamadas |

