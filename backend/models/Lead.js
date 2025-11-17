// models/Lead.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const LeadSchema = new Schema(
  {
    // 👉 Se você já tiver criado o Paciente antes de gerar o lead,
    // podemos guardar essa referência aqui:
    paciente: {
      type: Schema.Types.ObjectId,
      ref: 'Paciente',
      default: null
    },

    // Dados básicos do paciente na hora do formulário (snapshot)
    nome: { type: String, required: true },
    email: { type: String, required: true },
    telefone: { type: String, required: true },
    cpf: { type: String },
    dataNascimento: { type: Date },

    endereco: {
      rua: String,
      numero: String,
      bairro: String,
      cidade: String,
      estado: String,
      cep: String
    },

    // Sessão escolhida
    tipoSessao: {
      type: String,
      enum: ['avulsa', 'pacote_mensal', 'pacote_anual'],
      required: true
    },

    // Data/hora escolhidas no formulário (primeira sessão)
    dataHora: {
      type: Date,
      required: true
    },

    observacoes: { type: String },

    // Status do LEAD
    statusLead: {
      type: String,
      enum: ['aguardando_pagamento', 'convertido', 'expirado', 'cancelado'],
      default: 'aguardando_pagamento'
    },

    // Referência ao agendamento definitivo (quando converter)
    agendamento: {
      type: Schema.Types.ObjectId,
      ref: 'Agendamento',
      default: null
    },

    // Valor e parcelamento na “intenção” de compra
    valor: { type: Number, required: true },

    parcelamento: {
      parcelas: { type: Number, default: 1 },
      valorParcela: { type: Number, default: 0 }
    },

    // Dados do Mercado Pago
    mpPreferenceId: { type: String },
    mpInitPoint: { type: String },
    mpSandboxInitPoint: { type: String },

    // Último paymentId processado (pelo webhook)
    mpLastPaymentId: { type: String },

    origem: {
      type: String,
      default: 'site'
    }
  },
  {
    timestamps: true
  }
);

LeadSchema.index({ email: 1, createdAt: -1 });
LeadSchema.index({ statusLead: 1, createdAt: -1 });
LeadSchema.index({ dataHora: 1 });

module.exports = mongoose.model('Lead', LeadSchema);
