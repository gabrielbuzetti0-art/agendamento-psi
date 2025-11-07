const express = require('express');
const router = express.Router();
const disponibilidadeController = require('../controllers/disponibilidadeController');

// Configurar disponibilidade para um dia
router.post('/', disponibilidadeController.configurarDisponibilidade);

// Inicializar disponibilidade padrão (Segunda a Sexta)
router.post('/inicializar', disponibilidadeController.inicializarDisponibilidadePadrao);

// Listar todas as disponibilidades
router.get('/', disponibilidadeController.listarDisponibilidade);

// Buscar disponibilidade de um dia específico
router.get('/:diaSemana', disponibilidadeController.buscarDisponibilidadePorDia);

// Desativar disponibilidade de um dia
router.delete('/:diaSemana', disponibilidadeController.desativarDisponibilidade);

module.exports = router;