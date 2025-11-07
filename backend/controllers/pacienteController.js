const Paciente = require('../models/Paciente');

// Criar novo paciente
exports.criarPaciente = async (req, res) => {
  try {
    const { nome, email, telefone, cpf, dataNascimento, endereco, observacoes, primeiraConsulta } = req.body;

    // Verificar se já existe paciente com esse email OU CPF
    const pacienteExistente = await Paciente.findOne({
      $or: [
        { email: email },
        { cpf: cpf }
      ]
    });

    if (pacienteExistente) {
      // Paciente já existe - retornar os dados dele
      console.log('Paciente já cadastrado, reutilizando:', pacienteExistente.email);
      return res.status(200).json({
        success: true,
        message: 'Paciente já cadastrado',
        data: pacienteExistente
      });
    }

    // Criar novo paciente
    const paciente = await Paciente.create({
      nome,
      email,
      telefone,
      cpf,
      dataNascimento,
      endereco,
      observacoes,
      primeiraConsulta
    });

    console.log('Novo paciente criado:', paciente.email);

    res.status(201).json({
      success: true,
      message: 'Paciente cadastrado com sucesso!',
      data: paciente
    });

  } catch (error) {
    console.error('Erro ao criar paciente:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao cadastrar paciente',
      error: error.message
    });
  }
};

// Buscar paciente por email
exports.buscarPacientePorEmail = async (req, res) => {
  try {
    const { email } = req.params;

    const paciente = await Paciente.findOne({ email, ativo: true });

    if (!paciente) {
      return res.status(404).json({
        success: false,
        message: 'Paciente não encontrado'
      });
    }

    res.status(200).json({
      success: true,
      data: paciente
    });

  } catch (error) {
    console.error('Erro ao buscar paciente:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar paciente',
      error: error.message
    });
  }
};

// Buscar paciente por ID
exports.buscarPacientePorId = async (req, res) => {
  try {
    const { id } = req.params;

    const paciente = await Paciente.findById(id);

    if (!paciente) {
      return res.status(404).json({
        success: false,
        message: 'Paciente não encontrado'
      });
    }

    res.status(200).json({
      success: true,
      data: paciente
    });

  } catch (error) {
    console.error('Erro ao buscar paciente:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar paciente',
      error: error.message
    });
  }
};

// Listar todos os pacientes
exports.listarPacientes = async (req, res) => {
  try {
    const pacientes = await Paciente.find({ ativo: true })
      .sort({ nome: 1 });

    res.status(200).json({
      success: true,
      total: pacientes.length,
      data: pacientes
    });

  } catch (error) {
    console.error('Erro ao listar pacientes:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao listar pacientes',
      error: error.message
    });
  }
};

// Atualizar paciente
exports.atualizarPaciente = async (req, res) => {
  try {
    const { id } = req.params;
    const dadosAtualizacao = req.body;

    const paciente = await Paciente.findByIdAndUpdate(
      id,
      dadosAtualizacao,
      { new: true, runValidators: true }
    );

    if (!paciente) {
      return res.status(404).json({
        success: false,
        message: 'Paciente não encontrado'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Paciente atualizado com sucesso!',
      data: paciente
    });

  } catch (error) {
    console.error('Erro ao atualizar paciente:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar paciente',
      error: error.message
    });
  }
};

// Desativar paciente (soft delete)
exports.desativarPaciente = async (req, res) => {
  try {
    const { id } = req.params;

    const paciente = await Paciente.findByIdAndUpdate(
      id,
      { ativo: false },
      { new: true }
    );

    if (!paciente) {
      return res.status(404).json({
        success: false,
        message: 'Paciente não encontrado'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Paciente desativado com sucesso!',
      data: paciente
    });

  } catch (error) {
    console.error('Erro ao desativar paciente:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao desativar paciente',
      error: error.message
    });
  }
};