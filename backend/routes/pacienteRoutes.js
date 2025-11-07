const express = require('express');
const router = express.Router();
const agendamentoController = require('../controllers/agendamentoController');

// IMPORTANTE: Rotas específicas ANTES das rotas com parâmetros dinâmicos

// Buscar horários disponíveis para a data (Etapa 2)
router.get('/horarios-disponiveis', agendamentoController.buscarHorariosDisponiveis);

// Listar agendamentos
router.get('/', agendamentoController.listarAgendamentos);

// Criar novo agendamento
router.post('/', agendamentoController.criarAgendamento);

// Buscar agendamento por ID
router.get('/:id', agendamentoController.buscarAgendamentoPorId);

// Atualizar status do agendamento
router.patch('/:id/status', agendamentoController.atualizarStatusAgendamento);

// Cancelar agendamento
router.patch('/:id/cancelar', agendamentoController.cancelarAgendamento);

module.exports = router;
