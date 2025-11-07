// routes/pagamentoRoutes.js
const express = require('express');
const router = express.Router();
const pagamentoController = require('../controllers/pagamentoController');

// Dica de segurança contra import errado
['criarPreferenciaPagamento', 'webhookMercadoPago', 'confirmarPagamentoManual', 'buscarStatusPagamento'].forEach(fn => {
  if (typeof pagamentoController[fn] !== 'function') {
    throw new Error(`pagamentoController.${fn} não é função. Verifique exports.`);
  }
});

// Criar preferência de pagamento (Mercado Pago)
router.post('/criar-preferencia', pagamentoController.criarPreferenciaPagamento);

// Webhook do Mercado Pago
router.post('/webhook', pagamentoController.webhookMercadoPago);

// Confirmar pagamento manual (PIX/Dinheiro/Transferência)
router.post('/confirmar-manual', pagamentoController.confirmarPagamentoManual);

// Buscar status do pagamento
router.get('/:agendamentoId', pagamentoController.buscarStatusPagamento);

module.exports = router;
