// backend/routes/leadRoutes.js
const express = require('express');
const router = express.Router();
const leadController = require('../controllers/leadController');

// Lista de leads com filtros (statusLead, período, email)
router.get('/', leadController.listarLeads);

// Buscar lead específico
router.get('/:id', leadController.buscarLeadPorId);

// Atualizar status do lead (ex: aguardando_pagamento -> convertido / expirado)
router.patch('/:id/status', leadController.atualizarStatusLead);

// Remover lead (opcional, pra limpeza)
router.delete('/:id', leadController.removerLead);

module.exports = router;
