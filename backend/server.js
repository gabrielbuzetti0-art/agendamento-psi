// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// ============= MIDDLEWARE =============
app.use(cors({
  origin: [
    'https://psicarolmarques.com.br',
    'https://gabrielbuzetti0-art.github.io',  // ✅ ADICIONADO
    'http://localhost:5500',
    'http://localhost:3000'
  ],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true  // ✅ ADICIONADO
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============= ROTAS =============
const disponibilidadeRoutes = require('./routes/disponibilidadeRoutes');
const agendamentoRoutes = require('./routes/agendamentoRoutes');
const pacienteRoutes = require('./routes/pacienteRoutes');
const pagamentoRoutes = require('./routes/pagamentoRoutes');

app.use('/api/disponibilidade', disponibilidadeRoutes);
app.use('/api/agendamentos', agendamentoRoutes);
app.use('/api/pacientes', pacienteRoutes);
app.use('/api/pagamentos', pagamentoRoutes);

// Rota raiz
app.get('/', (req, res) => {
  res.json({ message: 'API de Agendamento funcionando!' });
});

// ✅ ROTA DE HEALTH CHECK (para manter servidor acordado)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Tratador de erros (para capturar next(err))
app.use((err, req, res, next) => {
  console.error('Erro:', err);
  res.status(500).json({ message: err?.message || 'Erro interno do servidor' });
});

// ============= CONEXÃO COM MONGODB =============
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ Conectado ao MongoDB');
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`🚀 Servidor rodando na porta ${PORT}`);  // ✅ CORRIGIDO (estava com template string errado)
    });
  })
  .catch((error) => {
    console.error('❌ Erro ao conectar ao MongoDB:', error);
  });