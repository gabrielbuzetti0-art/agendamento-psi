const express = require('express');
const router = express.Router();
const pacienteController = require('../controllers/pacienteController');

// Buscar paciente por email (deve vir ANTES de /:id)
router.get('/email/:email', pacienteController.buscarPacientePorEmail);

// Listar todos os pacientes
router.get('/', pacienteController.listarPacientes);

// Criar novo paciente
router.post('/', pacienteController.criarPaciente);

// Buscar paciente por ID
router.get('/:id', pacienteController.buscarPacientePorId);

// Atualizar paciente
router.put('/:id', pacienteController.atualizarPaciente);

// Desativar paciente
router.delete('/:id', pacienteController.desativarPaciente);

module.exports = router;