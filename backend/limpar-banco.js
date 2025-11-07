const mongoose = require('mongoose');
require('dotenv').config();

async function limparBanco() {
  try {
    // Conectar ao MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado ao MongoDB');

    // Limpar TODOS os agendamentos
    const resultAgendamentos = await mongoose.connection.collection('agendamentos').deleteMany({});
    console.log(`✅ ${resultAgendamentos.deletedCount} agendamentos apagados!`);

    // Limpar TODOS os pacientes
    const resultPacientes = await mongoose.connection.collection('pacientes').deleteMany({});
    console.log(`✅ ${resultPacientes.deletedCount} pacientes apagados!`);

    console.log('\n🎉 Banco de dados limpo com sucesso!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao limpar banco:', error);
    process.exit(1);
  }
}

limparBanco();