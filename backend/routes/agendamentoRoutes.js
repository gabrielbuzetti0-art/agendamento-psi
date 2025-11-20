// backend/routes/agendamentoRoutes.js
const express = require('express');
const router = express.Router();
const agendamentoController = require('../controllers/agendamentoController');

// Helper pra garantir que SEMPRE vamos passar uma função pro Express
function safe(handlerName) {
  const fn = agendamentoController[handlerName];

  if (typeof fn === 'function') {
    return fn;
  }

  // Se não tiver implementado, não derruba o servidor, só responde 500
  console.warn(`⚠️ Handler agendamentoController.${handlerName} não encontrado.`);

  return (req, res) => {
    res.status(500).json({
      success: false,
      message: `Handler agendamentoController.${handlerName} não implementado no backend.`
    });
  };
}

// =====================
// ROTAS DE AGENDAMENTO
// =====================

// Lista agendamentos (com filtros opcionais)
// usado pelo painel admin (aba "Agendamentos") e pelas estatísticas
router.get('/', safe('listarAgendamentos'));

// Calendário de disponibilidade
// usado pelo formulário de agendamento (agendamento.js)
router.get('/disponibilidade-calendario', safe('listarDisponibilidadeCalendario'));

// Horários disponíveis para uma data específica
router.get('/horarios-disponiveis', safe('listarHorariosDisponiveis'));

// Criar agendamento (modo antigo/manual – mantido por compatibilidade)
router.post('/', safe('criarAgendamento'));

// Atualizar status do agendamento (confirmar, etc.)
router.patch('/:id/status', safe('atualizarStatusAgendamento'));

// Cancelar agendamento
router.patch('/:id/cancelar', safe('cancelarAgendamento'));

module.exports = router;
