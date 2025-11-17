const mongoose = require('mongoose');

const agendamentoSchema = new mongoose.Schema(
  {
    // Paciente vinculado (modelo já existente no seu projeto)
    paciente: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Paciente',
      required: true
    },

    // 👇 Lead de origem (pré-agendamento / formulário)
    leadOrigem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      default: null
    },

    // Data e hora da sessão
    dataHora: {
      type: Date,
      required: [true, 'Data e hora são obrigatórias']
    },

    duracao: {
      type: Number,
      default: 60,
      required: true
    },

    // Tipo de sessão (vamos reaproveitar isso como "tipoSessao")
    tipo: {
      type: String,
      enum: [
        'individual',
        'avulsa',
        'casal',
        'avaliacao',
        'pacote_mensal',
        'pacote_anual'
      ],
      default: 'avulsa'
    },

    /**
     * STATUS DO AGENDAMENTO
     * - pendente   → criado mas ainda aguardando confirmação/pagamento (se você quiser usar assim)
     * - confirmado → compromisso válido na agenda (pagamento ok ou confirmado manualmente)
     * - pago       → (opcional, pode ser substituído pelo pagamento.status = 'aprovado')
     * - realizado  → sessão concluída
     * - cancelado  → cancelado pelo painel / paciente / sistema
     * - faltou     → no-show
     *
     * Na lógica nova:
     * - Quando o webhook do Mercado Pago aprovar o pagamento:
     *   -> status = 'confirmado'
     *   -> pagamento.status = 'aprovado'
     */
    status: {
      type: String,
      enum: ['pendente', 'confirmado', 'pago', 'realizado', 'cancelado', 'faltou'],
      default: 'pendente'
    },

    /**
     * STATUS DE LEITURA
     * - novo        → sua esposa ainda não viu no painel
     * - visualizado → ela já abriu/olhou
     */
    statusLeitura: {
      type: String,
      enum: ['novo', 'visualizado'],
      default: 'novo'
    },

    // Valor total da(s) sessão(ões)
    valor: {
      type: Number,
      required: true
    },

    // 🔹 Informações de PACOTE (já existiam, só mantidas e levemente comentadas)
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
      // 0=Domingo, 1=Segunda, ..., 6=Sábado
      diaSemanaFixo: {
        type: Number,
        default: null
      },
      // "HH:MM"
      horarioFixo: {
        type: String,
        default: null
      }
    },

    // 🔹 Parcelamento (valor exibido/armazenado, não é controle de cobrança)
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

    /**
     * BLOCO DE PAGAMENTO
     * - Aqui vamos mapear o que você chamou de "statusPagamento"
     *   e também os dados do Mercado Pago.
     */
    pagamento: {
      // Status de pagamento no sistema
      // Na lógica nova:
      // - 'pendente'  → aguardando pagamento
      // - 'aprovado'  → pago
      // - 'recusado'  → falhou / cartão recusado
      // - 'estornado' → reembolsado
      status: {
        type: String,
        enum: ['pendente', 'aprovado', 'recusado', 'estornado'],
        default: 'pendente'
      },

      // Método utilizado (é mais "visual", já que Mercado Pago gerencia isso)
      metodo: {
        type: String,
        enum: ['pix', 'cartao_credito', 'cartao_debito', 'dinheiro', 'mercadopago'],
        default: 'mercadopago'
      },

      // 👇 ID do pagamento no provedor (paymentId do Mercado Pago)
      transacaoId: String,

      // 👇 ID da preference do Mercado Pago (pra rastrear)
      preferenceId: String,

      dataPagamento: Date,
      comprovante: String
    },

    observacoes: {
      type: String,
      trim: true
    },

    // Controle de lembretes automáticos (se quiser usar depois)
    lembretesEnviados: {
      confirmacao: { type: Boolean, default: false },
      dia24h: { type: Boolean, default: false },
      hora2h: { type: Boolean, default: false }
    },

    // Informação de cancelamento
    cancelamento: {
      cancelado: { type: Boolean, default: false },
      dataCancelamento: Date,
      motivo: String,
      canceladoPor: String // 'admin', 'paciente', 'sistema'
    },

    /**
     * Integração com Google Calendar (futuro)
     * - Quando o pagamento for aprovado e o agendamento criado,
     *   podemos criar um evento no Google Agenda e guardar o eventId aqui.
     */
    googleCalendarEventId: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Índices pra facilitar consultas de agenda / paciente
agendamentoSchema.index({ dataHora: 1 });
agendamentoSchema.index({ paciente: 1, dataHora: 1 });
agendamentoSchema.index({ status: 1, 'pagamento.status': 1 });

module.exports = mongoose.model('Agendamento', agendamentoSchema);
