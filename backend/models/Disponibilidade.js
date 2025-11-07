const mongoose = require('mongoose');

const disponibilidadeSchema = new mongoose.Schema({
  diaSemana: {
    type: Number,
    required: true,
    min: 0,
    max: 6
  },
  horarios: [{
    inicio: {
      type: String,
      required: true
    },
    fim: {
      type: String,
      required: true
    },
    ativo: {
      type: Boolean,
      default: true
    }
  }],
  ativo: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

disponibilidadeSchema.index({ diaSemana: 1 }, { unique: true });

module.exports = mongoose.model('Disponibilidade', disponibilidadeSchema);