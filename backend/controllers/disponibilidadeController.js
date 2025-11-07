const Disponibilidade = require('../models/Disponibilidade');

// Criar/Configurar disponibilidade para um dia da semana
exports.configurarDisponibilidade = async (req, res) => {
  try {
    const { diaSemana, horarios } = req.body;

    // Verificar se já existe configuração para esse dia
    let disponibilidade = await Disponibilidade.findOne({ diaSemana });

    if (disponibilidade) {
      // Atualizar
      disponibilidade.horarios = horarios;
      disponibilidade.ativo = true;
      await disponibilidade.save();
    } else {
      // Criar novo
      disponibilidade = await Disponibilidade.create({
        diaSemana,
        horarios,
        ativo: true
      });
    }

    res.status(200).json({
      success: true,
      message: 'Disponibilidade configurada com sucesso!',
      data: disponibilidade
    });

  } catch (error) {
    console.error('Erro ao configurar disponibilidade:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao configurar disponibilidade',
      error: error.message
    });
  }
};

// Listar disponibilidade de todos os dias
exports.listarDisponibilidade = async (req, res) => {
  try {
    const disponibilidades = await Disponibilidade.find({ ativo: true })
      .sort({ diaSemana: 1 });

    res.status(200).json({
      success: true,
      data: disponibilidades
    });

  } catch (error) {
    console.error('Erro ao listar disponibilidade:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao listar disponibilidade',
      error: error.message
    });
  }
};

// Buscar disponibilidade de um dia específico
exports.buscarDisponibilidadePorDia = async (req, res) => {
  try {
    const { diaSemana } = req.params;

    const disponibilidade = await Disponibilidade.findOne({ 
      diaSemana: parseInt(diaSemana),
      ativo: true 
    });

    if (!disponibilidade) {
      return res.status(404).json({
        success: false,
        message: 'Disponibilidade não encontrada para este dia'
      });
    }

    res.status(200).json({
      success: true,
      data: disponibilidade
    });

  } catch (error) {
    console.error('Erro ao buscar disponibilidade:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar disponibilidade',
      error: error.message
    });
  }
};

// Desativar disponibilidade de um dia
exports.desativarDisponibilidade = async (req, res) => {
  try {
    const { diaSemana } = req.params;

    const disponibilidade = await Disponibilidade.findOneAndUpdate(
      { diaSemana: parseInt(diaSemana) },
      { ativo: false },
      { new: true }
    );

    if (!disponibilidade) {
      return res.status(404).json({
        success: false,
        message: 'Disponibilidade não encontrada'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Disponibilidade desativada com sucesso!',
      data: disponibilidade
    });

  } catch (error) {
    console.error('Erro ao desativar disponibilidade:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao desativar disponibilidade',
      error: error.message
    });
  }
};

// Inicializar disponibilidade padrão (Segunda a Sexta: 18h às 21:30)
exports.inicializarDisponibilidadePadrao = async (req, res) => {
  try {
    const horariosTrabalho = [
      { inicio: '18:00', fim: '18:50', ativo: true },
      { inicio: '18:50', fim: '19:40', ativo: true },
      { inicio: '19:40', fim: '20:30', ativo: true },
      // Intervalo de 20:00 às 20:30
      { inicio: '20:30', fim: '21:20', ativo: true }
    ];

    // Segunda a Sexta (1 a 5)
    for (let dia = 1; dia <= 5; dia++) {
      const existe = await Disponibilidade.findOne({ diaSemana: dia });
      
      if (!existe) {
        await Disponibilidade.create({
          diaSemana: dia,
          horarios: horariosTrabalho,
          ativo: true
        });
      }
    }

    const disponibilidades = await Disponibilidade.find().sort({ diaSemana: 1 });

    res.status(200).json({
      success: true,
      message: 'Disponibilidade padrão inicializada com sucesso!',
      data: disponibilidades
    });

  } catch (error) {
    console.error('Erro ao inicializar disponibilidade:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao inicializar disponibilidade',
      error: error.message
    });
  }
};