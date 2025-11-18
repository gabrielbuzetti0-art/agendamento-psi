// backend/routes/agendamentoRoutes.js
const express = require('express');
const router = express.Router();
const agendamentoController = require('../controllers/agendamentoController');

// Criar agendamento (usado em alguns fluxos internos – com o novo fluxo a gente quase só usa Lead + webhook)
router.post('/', agendamentoController.criarAgendamento);

// Listar agendamentos com filtros (admin)
router.get('/', agendamentoController.listarAgendamentos);

// Disponibilidade resumida do calendário (cores dos dias)
router.get('/disponibilidade-calendario', agendamentoController.disponibilidadeCalendario);

// Horários disponíveis (considerando avulsa/pacotes)
router.get('/horarios-disponiveis', agendamentoController.buscarHorariosDisponiveisPacote);

// 📊 Estatísticas para o dashboard
router.get('/estatisticas/dashboard', agendamentoController.obterEstatisticasDashboard);

// Buscar agendamento por ID
router.get('/:id', agendamentoController.buscarAgendamentoPorId);

// Atualizar status (confirmado / cancelado / etc.)
router.patch('/:id/status', agendamentoController.atualizarStatusAgendamento);

// Cancelar agendamento
router.post('/:id/cancelar', agendamentoController.cancelarAgendamento);

module.exports = router;
