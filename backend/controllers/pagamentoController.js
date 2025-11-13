// controllers/pagamentoController.js
const Agendamento = require('../models/Agendamento');
const { enviarEmailConfirmacao } = require('../utils/emailService');
const mercadopago = require('mercadopago');

// ====== Config Mercado Pago (SDK v2) ======
let mpPreference = null;
(function initMP() {
  try {
    const { MercadoPagoConfig, Preference } = mercadopago;
    const client = new MercadoPagoConfig({
      accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN, // ✅ CORRIGIDO
    });
    mpPreference = new Preference(client);
    console.log('✅ Mercado Pago inicializado com sucesso!');
  } catch (e) {
    console.warn('⚠️ Mercado Pago SDK não inicializado. Verifique dependência/ENV.', e?.message);
  }
})();

// Helper seguro para pegar campos numéricos
function toNumber(n, fallback = 0) {
  const v = Number(n);
  return Number.isFinite(v) ? v : fallback;
}

/**
 * POST /api/pagamentos/criar-preferencia
 * body: { agendamentoId }
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
    if (!agendamentoId) {
      return res.status(400).json({ 
        success: false,
        message: 'agendamentoId é obrigatório.' 
      });
    }

    // Buscar o agendamento
    const ag = await Agendamento.findById(agendamentoId).populate('paciente');
    if (!ag) {
      return res.status(404).json({ 
        success: false,
        message: 'Agendamento não encontrado.' 
      });
    }

    // Montar descrição e valor
    let descricao = 'Sessão de Psicologia';
    let valor = ag.valor;

    if (ag.tipo === 'pacote_mensal') {
      descricao = 'Pacote Mensal - 4 sessões de Psicologia';
    } else if (ag.tipo === 'pacote_anual') {
      descricao = 'Pacote Anual - 48 sessões de Psicologia';
    }

    const body = {
      items: [
        {
          title: descricao,
          quantity: 1,
          unit_price: toNumber(valor, 0),
          currency_id: 'BRL',
        },
      ],
      external_reference: String(agendamentoId),
      payer: {
        name: ag.paciente?.nome || 'Paciente',
        email: ag.paciente?.email || 'email@exemplo.com',
      },
      back_urls: {
        success: `https://psicarolmarques.com.br/agendamento/sucesso?id=${agendamentoId}`,
        pending: `https://psicarolmarques.com.br/agendamento/pendente?id=${agendamentoId}`,
        failure: `https://psicarolmarques.com.br/agendamento/erro?id=${agendamentoId}`,
      },
      auto_return: 'approved',
      notification_url: process.env.MP_WEBHOOK_URL || undefined,
    };

    const pref = await mpPreference.create({ body });

    // Salva referência no agendamento
    ag.statusPagamento = 'pendente';
    ag.metodoPagamento = 'mercadopago';
    ag.preferenciaId = pref?.id || null;
    await ag.save();

    console.log('✅ Preferência criada:', pref?.id);

    return res.status(201).json({
      success: true,
      preferenceId: pref?.id,
      init_point: pref?.init_point, // Link para produção
      sandbox_init_point: pref?.sandbox_init_point, // Link para teste
    });
  } catch (err) {
    console.error('❌ Erro ao criar preferência:', err);
    next(err);
  }
}

/**
 * POST /api/pagamentos/webhook
 * Mercado Pago envia eventos aqui
 */
async function webhookMercadoPago(req, res, next) {
  try {
    const payload = req.body || {};
    console.log('📥 WEBHOOK MP recebido:', JSON.stringify(payload));

    // Responder imediatamente
    res.status(200).json({ received: true });

    // Processar o webhook
    if (payload.type === 'payment' && payload.data?.id) {
      // Em produção, você consultaria a API do MP para pegar detalhes do pagamento
      // Por enquanto, vamos marcar como pago quando vier approved
      console.log('💳 Pagamento recebido, ID:', payload.data.id);
    }

  } catch (err) {
    console.error('❌ Erro no webhook:', err);
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

    ag.statusPagamento = 'pago';
    ag.metodoPagamento = metodo;
    ag.dataPagamento = new Date();
    ag.observacaoPagamento = comprovante || '';

    await ag.save();

    console.log('✅ Pagamento confirmado manualmente:', agendamentoId);

    try {
      await enviarEmailConfirmacao(ag);
    } catch (e) {
      console.warn('⚠️ Falha ao enviar e-mail de confirmação:', e?.message);
    }

    return res.json({ 
      success: true,
      message: 'Pagamento confirmado com sucesso!',
      data: {
        agendamentoId: ag._id,
        statusPagamento: ag.statusPagamento
      }
    });
  } catch (err) {
    console.error('❌ Erro ao confirmar pagamento:', err);
    next(err);
  }
}

/**
 * GET /api/pagamentos/:agendamentoId
 */
async function buscarStatusPagamento(req, res, next) {
  try {
    const { agendamentoId } = req.params;
    const ag = await Agendamento.findById(agendamentoId).lean();
    
    if (!ag) {
      return res.status(404).json({ 
        success: false,
        message: 'Agendamento não encontrado.' 
      });
    }

    return res.json({
      success: true,
      data: {
        agendamentoId: ag._id,
        statusPagamento: ag.statusPagamento || 'pendente',
        metodoPagamento: ag.metodoPagamento || null,
        preferenciaId: ag.preferenciaId || null,
        dataPagamento: ag.dataPagamento || null,
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
  buscarStatusPagamento,
};