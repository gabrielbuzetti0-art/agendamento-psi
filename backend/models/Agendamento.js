const mongoose = require('mongoose');

const agendamentoSchema = new mongoose.Schema({
  paciente: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Paciente',
    required: true
  },
  dataHora: {
    type: Date,
    required: [true, 'Data e hora são obrigatórias']
  },
  duracao: {
    type: Number,
    default: 60,
    required: true
  },
  tipo: {
  type: String,
  enum: ['individual', 'avulsa', 'casal', 'avaliacao', 'pacote_mensal', 'pacote_anual'],
  default: 'avulsa'
},
  status: {
    type: String,
    enum: ['pendente', 'confirmado', 'pago', 'realizado', 'cancelado', 'faltou'],
    default: 'pendente'
  },
  valor: {
  type: Number,
  required: true
},
// ADICIONAR AQUI:
pacote: {
  ehPacote: {
    type: Boolean,
    default: false
  },
  tipoPacote: {
    type: String,
    enum: ['mensal', 'anual', null],
    default: null
  },
  totalSessoes: {
    type: Number,
    default: 1
  },
  sessaoAtual: {
    type: Number,
    default: 1
  },
  pacotePrincipalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agendamento',
    default: null
  },
  diaSemanaFixo: {
    type: Number, // 0=Domingo, 1=Segunda, ..., 6=Sábado
    default: null
  },
  horarioFixo: {
    type: String, // Formato: "HH:MM"
    default: null
  }
},
parcelamento: {
  parcelas: {
    type: Number,
    default: 1
  },
  valorParcela: {
    type: Number,
    default: 0
  }
},
  pagamento: {
    status: {
      type: String,
      enum: ['pendente', 'aprovado', 'recusado', 'estornado'],
      default: 'pendente'
    },
    metodo: {
      type: String,
      enum: ['pix', 'cartao_credito', 'cartao_debito', 'dinheiro'],
      default: 'pix'
    },
    transacaoId: String,
    dataPagamento: Date,
    comprovante: String
  },
  observacoes: {
    type: String,
    trim: true
  },
  lembretesEnviados: {
    confirmacao: { type: Boolean, default: false },
    dia24h: { type: Boolean, default: false },
    hora2h: { type: Boolean, default: false }
  },
  cancelamento: {
    cancelado: { type: Boolean, default: false },
    dataCancelamento: Date,
    motivo: String,
    canceladoPor: String
  }
}, {
  timestamps: true
});

agendamentoSchema.index({ dataHora: 1 });
agendamentoSchema.index({ paciente: 1, dataHora: 1 });

module.exports = mongoose.model('Agendamento', agendamentoSchema);