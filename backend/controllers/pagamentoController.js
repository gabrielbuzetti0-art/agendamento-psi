// controllers/pagamentoController.js
const mercadopago = require('mercadopago');
const Lead = require('../models/Lead');
const Agendamento = require('../models/Agendamento');
const Paciente = require('../models/Paciente');
const { enviarEmailConfirmacao } = require('../utils/emailService');

// ================================
// Inicialização Mercado Pago (SDK v2)
// ================================
let mpClient = null;
let mpPreference = null;
let mpPayment = null;

(function initMercadoPago() {
  try {
    const { MercadoPagoConfig, Preference, Payment } = mercadopago;

    mpClient = new MercadoPagoConfig({
      accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN
    });

    mpPreference = new Preference(mpClient);
    mpPayment = new Payment(mpClient);

    console.log('✅ Mercado Pago inicializado com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao inicializar Mercado Pago:', error);
  }
})();

// Helper pra número
function toNumber(value, fallback = 0) {
  if (typeof value === 'number') return value;
  if (!value) return fallback;
  const n = Number(String(value).replace(',', '.'));
  return isNaN(n) ? fallback : n;
}

/**
 * POST /api/pagamentos/criar-preferencia
 *
 * MODO LEGADO (compat):
 *  body: { agendamentoId }
 *
 * MODO NOVO (recomendado):
 *  body:
 *  {
 *    nome, email, telefone, cpf, dataNascimento, endereco,
 *    tipoSessao,      // 'avulsa' | 'pacote_mensal' | 'pacote_anual'
 *    dataHoraISO,     // "2025-11-20T19:00:00.000Z"
 *    valor,
 *    parcelas,
 *    observacoes,
 *    pacienteId       // opcional (se já existir)
 *  }
 */
async function criarPreferenciaPagamento(req, res, next) {
  try {
    if (!mpPreference) {
      return res.status(500).json({
        success: false,
        message: 'Mercado Pago não configurado.'
      });
    }

    const { agendamentoId } = req.body || {};
    let lead = null;

    // ===================================
    // 1) MODO LEGADO: veio só agendamentoId
    // ===================================
    if (agendamentoId) {
      const ag = await Agendamento.findById(agendamentoId).populate('paciente');

      if (!ag) {
        return res.status(404).json({
          success: false,
          message: 'Agendamento não encontrado para criar preferência.'
        });
      }

      const paciente = ag.paciente;
      if (!paciente) {
        return res.status(400).json({
          success: false,
          message: 'Agendamento não possui paciente vinculado.'
        });
      }

      const valorNumber = toNumber(ag.valor, 0);
      if (valorNumber <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Valor inválido no agendamento.'
        });
      }

      // Lead a partir do Agendamento + Paciente
      lead = await Lead.create({
        paciente: paciente._id,
        nome: paciente.nome,
        email: paciente.email,
        telefone: paciente.telefone,
        cpf: paciente.cpf,
        dataNascimento: paciente.dataNascimento,
        endereco: paciente.endereco || {},
        tipoSessao:
          ag.tipo === 'pacote_mensal' || ag.tipo === 'pacote_anual'
            ? ag.tipo
            : 'avulsa',
        dataHora: ag.dataHora,
        observacoes: ag.observacoes,
        statusLead: 'aguardando_pagamento',
        valor: valorNumber,
        parcelamento: {
          parcelas: ag.parcelamento?.parcelas || 1,
          valorParcela: ag.parcelamento?.valorParcela || valorNumber
        },
        origem: 'site'
      });
    } else {
      // ===================================
      // 2) MODO NOVO: dados do formulário
      // ===================================
      const {
        nome,
        email,
        telefone,
        cpf,
        dataNascimento,
        endereco = {},
        tipoSessao,
        dataHoraISO,
        valor,
        parcelas = 1,
        observacoes,
        pacienteId
      } = req.body || {};

      if (!nome || !email || !telefone || !tipoSessao || !dataHoraISO || !valor) {
        return res.status(400).json({
          success: false,
          message: 'Dados obrigatórios ausentes para criar o pré-agendamento.'
        });
      }

      const dataHora = new Date(dataHoraISO);
      if (isNaN(dataHora.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Data/hora inválida.'
        });
      }

      const valorNumber = toNumber(valor, 0);
      if (valorNumber <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Valor inválido para o agendamento.'
        });
      }

      lead = await Lead.create({
        paciente: pacienteId || null,
        nome,
        email,
        telefone,
        cpf,
        dataNascimento: dataNascimento || null,
        endereco,
        tipoSessao,
        dataHora,
        observacoes,
        statusLead: 'aguardando_pagamento',
        valor: valorNumber,
        parcelamento: {
          parcelas,
          valorParcela: valorNumber / parcelas
        },
        origem: 'site'
      });
    }

    // ===================================
    // 3) Criar preference no Mercado Pago
    // ===================================
    let descricao = 'Sessão de Psicologia';
    if (lead.tipoSessao === 'pacote_mensal') {
      descricao = 'Pacote Mensal - 4 sessões de Psicologia';
    } else if (lead.tipoSessao === 'pacote_anual') {
      descricao = 'Pacote Anual - 48 sessões de Psicologia';
    }

    const baseUrl =
      process.env.FRONTEND_AGENDAMENTO_URL ||
      'https://psicarolmarques.com.br/agendamento';

    const body = {
      items: [
        {
          title: descricao,
          quantity: 1,
          unit_price: lead.valor,
          currency_id: 'BRL'
        }
      ],
      external_reference: String(lead._id),
      payer: {
        name: lead.nome,
        email: lead.email
      },
      back_urls: {
        success: `${baseUrl}/?status=approved&leadId=${lead._id}`,
        pending: `${baseUrl}/?status=pending&leadId=${lead._id}`,
        failure: `${baseUrl}/?status=failure&leadId=${lead._id}`
      },
      auto_return: 'approved',
      notification_url: process.env.MP_WEBHOOK_URL || undefined,
      metadata: {
        leadId: String(lead._id)
      }
    };

    const pref = await mpPreference.create({ body });
    const prefData = pref && pref.body ? pref.body : pref;

    lead.mpPreferenceId = prefData.id;
    lead.mpInitPoint = prefData.init_point;
    lead.mpSandboxInitPoint = prefData.sandbox_init_point;
    await lead.save();

    return res.status(201).json({
      success: true,
      message: 'Preferência de pagamento criada com sucesso.',
      data: {
        leadId: lead._id,
        preferenceId: prefData.id,
        init_point: prefData.init_point,
        sandbox_init_point: prefData.sandbox_init_point
      }
    });
  } catch (error) {
    console.error('Erro ao criar preferência de pagamento:', error);
    next(error);
  }
}

/**
 * POST /api/pagamentos/webhook
 * Endpoint chamado pelo Mercado Pago
 */
async function webhookMercadoPago(req, res, next) {
  try {
    const payload = req.body || {};
    console.log('📥 WEBHOOK MP recebido:', JSON.stringify(payload));

    // responde 200 cedo pro MP não dar timeout
    res.status(200).json({ received: true });

    if (payload.type !== 'payment' || !payload.data?.id) {
      return;
    }

    const paymentId = payload.data.id;
    console.log('💳 Processando pagamento, ID:', paymentId);

    if (!mpPayment) {
      console.error('❌ mpPayment não configurado.');
      return;
    }

    try {
      const paymentResp = await mpPayment.get({ id: paymentId });
      const payment = paymentResp && paymentResp.body ? paymentResp.body : paymentResp;

      console.log('💳 Detalhes do pagamento:', JSON.stringify(payment));

      const status = payment.status;
      const metadata = payment.metadata || {};
      const leadId = metadata.leadId || payment.external_reference;

      if (!leadId) {
        console.warn('⚠️ Pagamento sem leadId na metadata/external_reference, ignorando.');
        return;
      }

      const lead = await Lead.findById(leadId);
      if (!lead) {
        console.warn('⚠️ Lead não encontrado para leadId:', leadId);
        return;
      }

      lead.mpLastPaymentId = String(paymentId);
      await lead.save();

      if (status === 'approved') {
        console.log('✅ Pagamento aprovado para lead:', leadId);

        // já foi convertido? evita duplicar
        if (lead.statusLead === 'convertido' && lead.agendamento) {
          console.log('ℹ️ Lead já convertido anteriormente. Nada a fazer.');
          return;
        }

        // garante paciente
        let paciente = null;
        if (lead.paciente) {
          paciente = await Paciente.findById(lead.paciente);
        }

        if (!paciente) {
          paciente = await Paciente.create({
            nome: lead.nome,
            email: lead.email,
            telefone: lead.telefone,
            cpf: lead.cpf,
            dataNascimento: lead.dataNascimento,
            endereco: lead.endereco
          });
        }

        const ehPacote = lead.tipoSessao !== 'avulsa';
        const tipoPacote =
          lead.tipoSessao === 'pacote_mensal'
            ? 'mensal'
            : lead.tipoSessao === 'pacote_anual'
            ? 'anual'
            : null;
        const totalSessoes =
          lead.tipoSessao === 'pacote_mensal'
            ? 4
            : lead.tipoSessao === 'pacote_anual'
            ? 48
            : 1;

        const agendamento = await Agendamento.create({
          paciente: paciente._id,
          leadOrigem: lead._id,
          dataHora: lead.dataHora,
          duracao: 60,
          tipo:
            lead.tipoSessao === 'pacote_mensal' || lead.tipoSessao === 'pacote_anual'
              ? lead.tipoSessao
              : 'avulsa',
          status: 'confirmado',
          statusLeitura: 'novo',
          valor: lead.valor,
          pacote: {
            ehPacote,
            tipoPacote,
            totalSessoes,
            sessaoAtual: 1
          },
          parcelamento: {
            parcelas: lead.parcelamento?.parcelas || 1,
            valorParcela: lead.parcelamento?.valorParcela || lead.valor
          },
          pagamento: {
            status: 'aprovado',
            metodo: 'mercadopago',
            transacaoId: String(paymentId),
            preferenceId: lead.mpPreferenceId || null,
            dataPagamento: new Date(payment.date_approved || Date.now())
          },
          observacoes: lead.observacoes
        });

        lead.statusLead = 'convertido';
        lead.agendamento = agendamento._id;
        await lead.save();

        // TODO: atualizar disponibilidade de horários
        // TODO: criar evento no Google Calendar

        try {
          await enviarEmailConfirmacao(agendamento);
        } catch (e) {
          console.error('⚠️ Erro ao enviar e-mail de confirmação:', e);
        }
      } else if (status === 'rejected' || status === 'cancelled') {
        console.log('❌ Pagamento não aprovado para lead:', leadId, 'status:', status);
        lead.statusLead = 'cancelado';
        await lead.save();
      } else {
        console.log('ℹ️ Pagamento em status intermediário:', status);
      }
    } catch (error) {
      console.error('❌ Erro ao processar pagamento no webhook:', error);
    }
  } catch (err) {
    console.error('Erro no webhookMercadoPago:', err);
    next(err);
  }
}

/**
 * POST /api/pagamentos/confirmar-manual
 * body: { agendamentoId, metodo, comprovante }
 */
async function confirmarPagamentoManual(req, res, next) {
  try {
    const { agendamentoId, metodo = 'pix', comprovante } = req.body || {};

    if (!agendamentoId) {
      return res.status(400).json({
        success: false,
        message: 'agendamentoId é obrigatório.'
      });
    }

    const ag = await Agendamento.findById(agendamentoId).populate('paciente');
    if (!ag) {
      return res.status(404).json({
        success: false,
        message: 'Agendamento não encontrado.'
      });
    }

    ag.status = 'confirmado';
    ag.pagamento.status = 'aprovado';
    ag.pagamento.metodo = metodo;
    ag.pagamento.dataPagamento = new Date();
    if (comprovante) {
      ag.pagamento.comprovante = comprovante;
    }

    await ag.save();

    try {
      await enviarEmailConfirmacao(ag);
    } catch (e) {
      console.error('⚠️ Erro ao enviar e-mail de confirmação (manual):', e);
    }

    return res.json({
      success: true,
      message: 'Pagamento confirmado manualmente.',
      data: ag
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/pagamentos/:agendamentoId
 * Retorna status de pagamento de um agendamento
 */
async function buscarStatusPagamento(req, res, next) {
  try {
    const { agendamentoId } = req.params;
    const ag = await Agendamento.findById(agendamentoId);

    if (!ag) {
      return res.status(404).json({
        success: false,
        message: 'Agendamento não encontrado.'
      });
    }

    return res.json({
      success: true,
      data: {
        status: ag.pagamento.status,
        metodo: ag.pagamento.metodo,
        dataPagamento: ag.pagamento.dataPagamento || null
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  criarPreferenciaPagamento,
  webhookMercadoPago,
  confirmarPagamentoManual,
  buscarStatusPagamento
};
