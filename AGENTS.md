# AGENTS.md

## Visão geral do projeto

Sistema de agendamento online para psicoterapia da psicóloga Caroline Marques.

Fluxo principal desejado:
1. Usuário escolhe data e horário disponíveis.
2. Usuário seleciona o tipo de atendimento (sessão avulsa ou pacotes, MAS o pagamento em si é sempre via Mercado Pago).
3. Usuário preenche dados pessoais (nome, e-mail, etc.).
4. Usuário aceita os termos de LGPD (checkbox obrigatório).
5. Ao confirmar, o sistema:
   - Envia os dados necessários para o backend.
   - Backend cria uma preferência de pagamento no Mercado Pago.
   - Frontend redireciona o usuário para a tela de pagamento do Mercado Pago.
6. Após o pagamento:
   - Mercado Pago redireciona de volta para o site.
   - Em caso de sucesso, o usuário vê uma tela de CONFIRMAÇÃO do agendamento.

## Stack e tecnologias

- Backend:
  - Node.js
  - Express
  - Mongoose (MongoDB)
- Frontend:
  - HTML, CSS e JavaScript (sem framework pesado)
- Integração de pagamento:
  - Mercado Pago (Checkout Pro)

## Estrutura importante do código (padrão esperado)

- `/backend/controllers/pagamentoController.js`
  - Criar preferência de pagamento no Mercado Pago.
  - Definir `back_urls` para retorno (success, failure, pending).

- `/backend/controllers/agendamentoController.js`
  - Criar e salvar agendamentos no banco.

- `/public/` ou `/frontend/`
  - Página do formulário de agendamento (por exemplo `agendamento.html`).
  - Página de confirmação (por exemplo `confirmacao.html`).
  - Arquivo JS com a lógica do formulário (por exemplo `js/agendamento.js` ou `js/api.js`).

## Regras de código

- Nomes de variáveis e mensagens em português.
- Manter validações de campos obrigatórios.
- Não remover a validação de LGPD (ela deve ser obrigatória).
- Sempre explicar as mudanças e apontar quais arquivos foram alterados.

## Problemas atuais conhecidos

1. A **caixa de LGPD não aparece** ou não está funcionando corretamente no formulário.
2. Não queremos múltiplas opções de forma de pagamento no formulário; o pagamento deve ser **sempre via Mercado Pago**.
3. A etapa de "processando" leva muito tempo e não avança:
   - Comportamento desejado: criar a preferência de pagamento e redirecionar rapidamente para o Mercado Pago.
4. Após o pagamento no Mercado Pago, o usuário deve voltar para o site:
   - Em caso de sucesso, ver a página de confirmação do agendamento, com data, horário e nome.

## Como rodar o projeto

- Instalar dependências:

  ```bash
  npm install
