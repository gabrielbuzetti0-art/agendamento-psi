const Agendamento = require('../models/Agendamento');
const Paciente = require('../models/Paciente');
const { enviarEmailConfirmacao } = require('../utils/emailService');

// =========================
// Função auxiliar: criar sessões recorrentes de pacote
// =========================
async function criarSessoesRecorrentes(pacienteId, dataHoraPrimeiraSessao, tipo, valor, observacoes, parcelas) {
  const agendamentosCriados = [];

  const totalSessoes = tipo === 'pacote_mensal' ? 4 : 48;
  const tipoPacote = tipo === 'pacote_mensal' ? 'mensal' : 'anual';

  const primeiraSessao = new Date(dataHoraPrimeiraSessao);
  const diaSemanaFixo = primeiraSessao.getDay();
  const horarioFixo = `${primeiraSessao.getHours().toString().padStart(2, '0')}:${primeiraSessao
    .getMinutes()
    .toString()
    .padStart(2, '0')}`;

  const valorParcela = valor / parcelas;

  console.log(`📦 Criando pacote ${tipoPacote} com ${totalSessoes} sessões`);

  // ------------------------------------
  // 1) Montar TODAS as datas do pacote
  // ------------------------------------
  const datasSessoes = [];
  let cursor = new Date(primeiraSessao);

  for (let i = 0; i < totalSessoes; i++) {
    datasSessoes.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 7); // próximo mesmo dia da semana
  }

  // ------------------------------------
  // 2) Verificar CONFLITO em todas elas
  // ------------------------------------
  for (const dataSessao of datasSessoes) {
    const conflito = await Agendamento.findOne({
      dataHora: dataSessao,
      status: { $nin: ['cancelado'] }
    });

    if (conflito) {
      console.error('❌ Conflito encontrado em pacote:', dataSessao.toISOString());
      throw new Error(
        `Conflito de horário no pacote: já existe um agendamento em ${dataSessao.toLocaleString('pt-BR')}`
      );
    }
  }

  // ------------------------------------
  // 3) Criar a sessão principal
  // ------------------------------------
  const agendamentoPrincipal = await Agendamento.create({
    paciente: pacienteId,
    dataHora: datasSessoes[0],
    tipo,
    valor,
    observacoes,
    status: 'pendente',
    pacote: {
      ehPacote: true,
      tipoPacote,
      totalSessoes,
      sessaoAtual: 1,
      pacotePrincipalId: null,
      diaSemanaFixo,
      horarioFixo
    },
    parcelamento: {
      parcelas,
      valorParcela
    }
  });

  agendamentosCriados.push(agendamentoPrincipal);
  console.log(`✅ Sessão 1 criada: ${datasSessoes[0].toISOString()}`);

  // ------------------------------------
  // 4) Criar as demais sessões (recorrentes)
  // ------------------------------------
  for (let i = 1; i < totalSessoes; i++) {
    const dataSessao = datasSessoes[i];

    const agendamentoSeguinte = await Agendamento.create({
      paciente: pacienteId,
      dataHora: dataSessao,
      tipo,
      valor: 0,
      observacoes: `Sessão ${i + 1} de ${totalSessoes} - Pacote ${tipoPacote}`,
      status: 'confirmado',
      pacote: {
        ehPacote: true,
        tipoPacote,
        totalSessoes,
        sessaoAtual: i + 1,
        pacotePrincipalId: agendamentoPrincipal._id,
        diaSemanaFixo,
        horarioFixo
      },
      parcelamento: {
        parcelas: 0,
        valorParcela: 0
      }
    });

    agendamentosCriados.push(agendamentoSeguinte);
    console.log(`✅ Sessão ${i + 1} criada: ${dataSessao.toISOString()}`);
  }

  return agendamentosCriados;
}

// =========================
// Criar novo agendamento
// =========================
exports.criarAgendamento = async (req, res) => {
  try {
    const { pacienteId, dataHora, tipo, observacoes, parcelas } = req.body;

    if (!pacienteId || !dataHora || !tipo) {
      return res.status(400).json({
        success: false,
        message: 'Paciente, dataHora e tipo são obrigatórios.'
      });
    }

    const paciente = await Paciente.findById(pacienteId);
    if (!paciente) {
      return res.status(404).json({
        success: false,
        message: 'Paciente não encontrado'
      });
    }

    // Verificar conflito de horário exato
    const dataHoraObj = new Date(dataHora);
    const agendamentoExistente = await Agendamento.findOne({
      dataHora: dataHoraObj,
      status: { $nin: ['cancelado'] }
    });

    if (agendamentoExistente) {
      return res.status(400).json({
        success: false,
        message: 'Já existe um agendamento neste dia e horário'
      });
    }

    // Definir valor conforme tipo
    let valor;
    if (tipo === 'pacote_mensal') {
      valor = parseFloat(process.env.VALOR_SESSAO_PACOTE_MENSAL);
    } else if (tipo === 'pacote_anual') {
      valor = parseFloat(process.env.VALOR_SESSAO_PACOTE_ANUAL);
    } else {
      valor = parseFloat(process.env.VALOR_SESSAO);
    }

    if (isNaN(valor)) {
      return res.status(500).json({
        success: false,
        message: 'Valor da sessão/pacote não configurado nas variáveis de ambiente.'
      });
    }

    // Pacotes (cria recorrência)
    if (tipo === 'pacote_mensal' || tipo === 'pacote_anual') {
      const parcelasConfig = parcelas || 1;

      const agendamentos = await criarSessoesRecorrentes(
        pacienteId,
        dataHora,
        tipo,
        valor,
        observacoes,
        parcelasConfig
      );

      await agendamentos[0].populate('paciente');

      // Email de confirmação será enviado após confirmação de pagamento

      return res.status(201).json({
        success: true,
        message: `Pacote criado com sucesso! ${agendamentos.length} sessões agendadas.`,
        data: agendamentos[0],
        totalSessoes: agendamentos.length
      });
    }

    // Sessão avulsa
    const agendamento = await Agendamento.create({
      paciente: pacienteId,
      dataHora: dataHoraObj,
      tipo,
      valor,
      observacoes,
      status: 'pendente',
      pacote: {
        ehPacote: false
      },
      parcelamento: {
        parcelas: 1,
        valorParcela: valor
      }
    });

    await agendamento.populate('paciente');

    // Email após pagamento → mantido para etapa do pagamento

    return res.status(201).json({
      success: true,
      message: 'Agendamento criado com sucesso!',
      data: agendamento
    });
  } catch (error) {
    console.error('Erro ao criar agendamento:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao criar agendamento',
      error: error.message
    });
  }
};

// =========================
// Listar agendamentos
// =========================
exports.listarAgendamentos = async (req, res) => {
  try {
    const { dataInicio, dataFim, status } = req.query;
    const filtro = {};

    if (dataInicio && dataFim) {
      filtro.dataHora = {
        $gte: new Date(dataInicio),
        $lte: new Date(dataFim)
      };
    }

    if (status) {
      filtro.status = status;
    }

    const agendamentos = await Agendamento.find(filtro)
      .populate('paciente')
      .sort({ dataHora: 1 });

    res.status(200).json({
      success: true,
      total: agendamentos.length,
      data: agendamentos
    });
  } catch (error) {
    console.error('Erro ao listar agendamentos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao listar agendamentos',
      error: error.message
    });
  }
};

// =========================
// Buscar agendamento por ID
// =========================
exports.buscarAgendamentoPorId = async (req, res) => {
  try {
    const { id } = req.params;

    const agendamento = await Agendamento.findById(id).populate('paciente');

    if (!agendamento) {
      return res.status(404).json({
        success: false,
        message: 'Agendamento não encontrado'
      });
    }

    res.status(200).json({
      success: true,
      data: agendamento
    });
  } catch (error) {
    console.error('Erro ao buscar agendamento:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar agendamento',
      error: error.message
    });
  }
};

// =========================
// Atualizar status
// =========================
exports.atualizarStatusAgendamento = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const agendamento = await Agendamento.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    ).populate('paciente');

    if (!agendamento) {
      return res.status(404).json({
        success: false,
        message: 'Agendamento não encontrado'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Status atualizado com sucesso!',
      data: agendamento
    });
  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar status',
      error: error.message
    });
  }
};

// =========================
// Cancelar agendamento
// =========================
exports.cancelarAgendamento = async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo, canceladoPor } = req.body;

    const agendamento = await Agendamento.findByIdAndUpdate(
      id,
      {
        status: 'cancelado',
        'cancelamento.cancelado': true,
        'cancelamento.dataCancelamento': new Date(),
        'cancelamento.motivo': motivo,
        'cancelamento.canceladoPor': canceladoPor
      },
      { new: true }
    ).populate('paciente');

    if (!agendamento) {
      return res.status(404).json({
        success: false,
        message: 'Agendamento não encontrado'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Agendamento cancelado com sucesso!',
      data: agendamento
    });
  } catch (error) {
    console.error('Erro ao cancelar agendamento:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao cancelar agendamento',
      error: error.message
    });
  }
};

// =========================
// Buscar horários disponíveis (Etapa 2)
// =========================
exports.buscarHorariosDisponiveis = async (req, res) => {
  try {
    const { data, tipo } = req.query;

    if (!data) {
      return res.status(400).json({
        success: false,
        message: 'Data é obrigatória (formato YYYY-MM-DD)'
      });
    }

    // Tipo de sessão: avulsa, pacote_mensal, pacote_anual
    const tipoSessao = tipo || 'avulsa';

    // Quantidade de sessões a considerar
    const totalSessoes =
      tipoSessao === 'pacote_mensal'
        ? 4
        : tipoSessao === 'pacote_anual'
        ? 48
        : 1;

    // Horários base de atendimento
    const horariosBase = ['18:00', '19:00', '20:30'];

    // Vamos trabalhar sempre considerando horário de São Paulo (-03:00)
    // Construímos um intervalo bem amplo que cobre TODAS as datas possíveis desse pacote
    // Ex.: do primeiro dia às 18:00 até a última sessão às 20:30
    const primeiraDataMin = new Date(`${data}T18:00:00-03:00`);
    const ultimaDataMax = new Date(`${data}T20:30:00-03:00`);
    ultimaDataMax.setDate(ultimaDataMax.getDate() + 7 * (totalSessoes - 1));

    // Buscar todos os agendamentos desse intervalo
    const agendamentosPeriodo = await Agendamento.find({
      dataHora: { $gte: primeiraDataMin, $lte: ultimaDataMax },
      status: { $nin: ['cancelado'] }
    });

    // Colocamos todos os horários ocupados em um Set, usando timestamp (getTime)
    const ocupados = new Set(
      agendamentosPeriodo.map((ag) => new Date(ag.dataHora).getTime())
    );

    const conflitosPorHorario = {};
    const horariosDisponiveis = [];

    // Para cada horário base (18:00, 19:00, 20:30)
    for (const horaAlvo of horariosBase) {
      // Monta a data/hora da PRIMEIRA sessão desse horário, em -03:00
      // Ex.: "2025-11-13T18:00:00-03:00"
      let atual = new Date(`${data}T${horaAlvo}:00-03:00`);
      let conflito = false;

      // Verifica todas as sessões necessárias (1, 4 ou 48 semanas)
      for (let i = 0; i < totalSessoes; i++) {
        const timestamp = atual.getTime();

        if (ocupados.has(timestamp)) {
          conflito = true;
          break;
        }

        // Próxima semana
        atual = new Date(atual);
        atual.setDate(atual.getDate() + 7);
      }

      conflitosPorHorario[horaAlvo] = conflito;

      if (!conflito) {
        horariosDisponiveis.push(horaAlvo);
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        data,
        tipo: tipoSessao,
        horariosDisponiveis,
        totalSessoes,
        conflitosPorHorario
      }
    });
  } catch (error) {
    console.error('❌ Erro ao buscar horários disponíveis:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar horários disponíveis',
      error: error.message
    });
  }
};
