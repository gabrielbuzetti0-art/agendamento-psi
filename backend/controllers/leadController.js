// backend/controllers/leadController.js
const Lead = require('../models/Lead');

/**
 * GET /api/leads
 * Filtros opcionais:
 *  - statusLead: 'aguardando_pagamento' | 'convertido' | 'expirado'
 *  - dataInicio, dataFim (YYYY-MM-DD) -> filtra por createdAt
 *  - email (parte do email)
 */
exports.listarLeads = async (req, res) => {
  try {
    const { statusLead, dataInicio, dataFim, email } = req.query;

    const filtro = {};

    if (statusLead) {
      filtro.statusLead = statusLead;
    }

    // Filtro por data de criação (createdAt) – últimos leads por período
    if (dataInicio || dataFim) {
      filtro.createdAt = {};
      if (dataInicio) {
        const inicio = new Date(`${dataInicio}T00:00:00-03:00`);
        filtro.createdAt.$gte = inicio;
      }
      if (dataFim) {
        const fim = new Date(`${dataFim}T23:59:59-03:00`);
        filtro.createdAt.$lte = fim;
      }
    }

    if (email) {
      filtro.email = new RegExp(email, 'i'); // case-insensitive
    }

    const leads = await Lead.find(filtro)
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      data: leads
    });
  } catch (error) {
    console.error('❌ Erro ao listar leads:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao listar leads',
      error: error.message
    });
  }
};

/**
 * GET /api/leads/:id
 */
exports.buscarLeadPorId = async (req, res) => {
  try {
    const { id } = req.params;

    const lead = await Lead.findById(id);
    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead não encontrado'
      });
    }

    return res.json({
      success: true,
      data: lead
    });
  } catch (error) {
    console.error('❌ Erro ao buscar lead por ID:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao buscar lead',
      error: error.message
    });
  }
};

/**
 * PATCH /api/leads/:id/status
 * body: { statusLead: 'aguardando_pagamento' | 'convertido' | 'expirado' }
 */
exports.atualizarStatusLead = async (req, res) => {
  try {
    const { id } = req.params;
    const { statusLead } = req.body;

    if (!statusLead) {
      return res.status(400).json({
        success: false,
        message: 'statusLead é obrigatório'
      });
    }

    const lead = await Lead.findByIdAndUpdate(
      id,
      { statusLead },
      { new: true }
    );

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead não encontrado'
      });
    }

    return res.json({
      success: true,
      message: 'Status do lead atualizado com sucesso',
      data: lead
    });
  } catch (error) {
    console.error('❌ Erro ao atualizar status do lead:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao atualizar status do lead',
      error: error.message
    });
  }
};

/**
 * DELETE /api/leads/:id
 * (opcional – para limpar leads antigos)
 */
exports.removerLead = async (req, res) => {
  try {
    const { id } = req.params;

    const lead = await Lead.findByIdAndDelete(id);
    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead não encontrado'
      });
    }

    return res.json({
      success: true,
      message: 'Lead removido com sucesso'
    });
  } catch (error) {
    console.error('❌ Erro ao remover lead:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao remover lead',
      error: error.message
    });
  }
};
