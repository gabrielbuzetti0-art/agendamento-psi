// controllers/pagamentoController.js
const Agendamento = require('../models/Agendamento');
const { enviarEmailConfirmacao } = require('../utils/emailService');
const mercadopago = require('mercadopago');

// ====== Config Mercado Pago (SDK v2) ======
// OBS: exige process.env.MP_ACCESS_TOKEN
let mpPreference = null;
(function initMP() {
  try {
    const { MercadoPagoConfig, Preference } = mercadopago;
    const client = new MercadoPagoConfig({
      accessToken: process.env.MP_ACCESS_TOKEN,
    });
    mpPreference = new Preference(client);
  } catch (e) {
    console.warn('Mercado Pago SDK não inicializado. Verifique dependência/ENV.', e?.message);
  }
})();

// Helper seguro para pegar campos numéricos
function toNumber(n, fallback = 0) {
  const v = Number(n);
  return Number.isFinite(v) ? v : fallback;
}

/**
 * POST /api/pagamentos/criar-preferencia
 * body: { agendamentoId, descricao, valor, successUrl?, pendingUrl?, failureUrl? }
 */
async function criarPreferenciaPagamento(req, res, next) {
  try {
    if (!mpPreference) {
      return res.status(500).json({ message: 'Mercado Pago não configurado.' });
    }

    const { agendamentoId, descricao, valor, successUrl, pendingUrl, failureUrl } = req.body || {};
    if (!agendamentoId || !descricao || !valor) {
      return res.status(400).json({ message: 'agendamentoId, descricao e valor são obrigatórios.' });
    }

    // (Opcional) garantir que o agendamento existe
    const ag = await Agendamento.findById(agendamentoId);
    if (!ag) {
      return res.status(404).json({ message: 'Agendamento não encontrado.' });
    }

    const body = {
      items: [
        {
          title: String(descricao),
          quantity: 1,
          unit_price: toNumber(valor, 0),
          currency_id: 'BRL',
        },
      ],
      external_reference: String(agendamentoId),
      notification_url: process.env.MP_WEBHOOK_URL, // precisa ser pública
      back_urls: {
        success: successUrl || 'https://seu-site.com/pagamento/sucesso',
        pending: pendingUrl || 'https://seu-site.com/pagamento/pendente',
        failure: failureUrl || 'https://seu-site.com/pagamento/erro',
      },
      auto_return: 'approved',
    };

    const pref = await mpPreference.create({ body });

    // Salva referência no agendamento (opcional)
    ag.statusPagamento = ag.statusPagamento || 'pendente';
    ag.metodoPagamento = 'mercadopago';
    ag.preferenciaId = pref?.id || pref?.body?.id || null;
    await ag.save();

    return res.status(201).json({
      ok: true,
      preferenceId: pref?.id || pref?.body?.id,
      init_point: pref?.init_point || pref?.body?.init_point,
      sandbox_init_point: pref?.sandbox_init_point || pref?.body?.sandbox_init_point,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/pagamentos/webhook
 * Mercado Pago envia eventos aqui. Por simplicidade, apenas registra e marca "pago" quando vier aprovado.
 * Em produção, o correto é consultar a API do MP pelo paymentId recebido.
 */
async function webhookMercadoPago(req, res, next) {
  try {
    // O payload pode variar conforme o tipo (payment, merchant_order, etc.)
    const payload = req.body || {};
    console.log('WEBHOOK MP:', JSON.stringify(payload));

    // Se vier external_reference, tentamos atualizar o agendamento
    const externalRef =
      payload?.data?.id && payload?.type === 'payment'
        ? null // no fluxo real, consultar payment -> obter external_reference
        : payload?.external_reference || payload?.merchant_order_id || payload?.data?.external_reference;

    // Estratégia simplificada:
    // - Se payload tiver status "approved" e external_reference, marcamos como pago
    const status =
      payload?.status ||
      payload?.data?.status ||
      payload?.action ||
      payload?.type;

    if (externalRef) {
      const ag = await Agendamento.findById(externalRef);
      if (ag) {
        if (String(status).toLowerCase().includes('approved') || String(status).toLowerCase().includes('payment.created')) {
          ag.statusPagamento = 'pago';
          ag.dataPagamento = new Date();
          await ag.save();

          try {
            await enviarEmailConfirmacao(ag);
          } catch (e) {
            console.warn('Falha ao enviar e-mail de confirmação:', e?.message);
          }
        } else if (String(status).toLowerCase().includes('rejected')) {
          ag.statusPagamento = 'rejeitado';
          await ag.save();
        } else {
          // Outros estados: pendente, in_process, etc.
          ag.statusPagamento = ag.statusPagamento || 'pendente';
          await ag.save();
        }
      }
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/pagamentos/confirmar-manual
 * body: { agendamentoId, metodo? (pix|dinheiro|transferencia), observacao? }
 */
async function confirmarPagamentoManual(req, res, next) {
  try {
    const { agendamentoId, metodo = 'manual', observacao } = req.body || {};
    if (!agendamentoId) {
      return res.status(400).json({ message: 'agendamentoId é obrigatório.' });
    }

    const ag = await Agendamento.findById(agendamentoId);
    if (!ag) {
      return res.status(404).json({ message: 'Agendamento não encontrado.' });
    }

    ag.statusPagamento = 'pago';
    ag.metodoPagamento = metodo;
    ag.observacaoPagamento = observacao || '';
    ag.dataPagamento = new Date();

    await ag.save();

    try {
      await enviarEmailConfirmacao(ag);
    } catch (e) {
      console.warn('Falha ao enviar e-mail de confirmação:', e?.message);
    }

    return res.json({ ok: true, message: 'Pagamento confirmado manualmente.', agendamentoId: ag._id });
  } catch (err) {
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
      return res.status(404).json({ message: 'Agendamento não encontrado.' });
    }

    return res.json({
      agendamentoId: ag._id,
      statusPagamento: ag.statusPagamento || 'indefinido',
      metodoPagamento: ag.metodoPagamento || null,
      preferenciaId: ag.preferenciaId || null,
      dataPagamento: ag.dataPagamento || null,
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
