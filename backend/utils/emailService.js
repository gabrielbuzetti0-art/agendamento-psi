const nodemailer = require('nodemailer');

// Configurar transporter do nodemailer
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false, // true para 465, false para outras portas
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Verificar conexão (opcional - para debug)
transporter.verify(function (error, success) {
  if (error) {
    console.log('❌ Erro na configuração do email:', error);
  } else {
    console.log('✅ Servidor de email pronto para enviar mensagens');
  }
});

// Formatar data e hora para exibição
const formatarDataHora = (dataHora) => {
  const data = new Date(dataHora);
  const opcoes = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo'
  };
  return data.toLocaleDateString('pt-BR', opcoes);
};

// Enviar email de confirmação de agendamento
exports.enviarEmailConfirmacao = async (agendamento) => {
  try {
    const paciente = agendamento.paciente;
    const dataHoraFormatada = formatarDataHora(agendamento.dataHora);

    const mailOptions = {
      from: `"${process.env.PSICOLOGA_NOME}" <${process.env.EMAIL_USER}>`,
      to: paciente.email,
      cc: process.env.PSICOLOGA_EMAIL, // Cópia para a psicóloga
      subject: 'Confirmação de Agendamento - Psicoterapia',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f9f9f9;
            }
            .header {
              background-color: #4a90e2;
              color: white;
              padding: 20px;
              text-align: center;
              border-radius: 5px 5px 0 0;
            }
            .content {
              background-color: white;
              padding: 30px;
              border-radius: 0 0 5px 5px;
            }
            .info-box {
              background-color: #f0f7ff;
              border-left: 4px solid #4a90e2;
              padding: 15px;
              margin: 20px 0;
            }
            .info-box h3 {
              margin-top: 0;
              color: #4a90e2;
            }
            .footer {
              text-align: center;
              margin-top: 20px;
              font-size: 12px;
              color: #666;
            }
            .button {
              display: inline-block;
              padding: 12px 30px;
              background-color: #4a90e2;
              color: white;
              text-decoration: none;
              border-radius: 5px;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Agendamento Confirmado! ✅</h1>
            </div>
            <div class="content">
              <p>Olá, <strong>${paciente.nome}</strong>!</p>
              
              <p>Seu agendamento foi realizado com sucesso!</p>
              
              <div class="info-box">
                <h3>Detalhes do Agendamento:</h3>
                <p><strong>Data e Hora:</strong> ${dataHoraFormatada}</p>
                <p><strong>Tipo:</strong> ${agendamento.tipo === 'individual' ? 'Sessão Individual' : agendamento.tipo === 'casal' ? 'Terapia de Casal' : 'Avaliação'}</p>
                <p><strong>Valor:</strong> R$ ${agendamento.valor.toFixed(2)}</p>
                <p><strong>Status do Pagamento:</strong> ${agendamento.pagamento.status === 'pendente' ? 'Aguardando Pagamento' : 'Pago'}</p>
              </div>
              
              <p><strong>Profissional:</strong> ${process.env.PSICOLOGA_NOME}<br>
              CRP: XXXXX/XX</p>
              
              ${agendamento.pagamento.status === 'pendente' ? `
                <p style="color: #e74c3c;">⚠️ <strong>Atenção:</strong> Seu agendamento será confirmado após o pagamento.</p>
              ` : ''}
              
              <h3>Informações Importantes:</h3>
              <ul>
                <li>Chegue com 5 minutos de antecedência</li>
                <li>Em caso de impossibilidade de comparecer, avise com pelo menos 24h de antecedência</li>
                <li>Traga documento de identificação</li>
              </ul>
              
              <p>Em caso de dúvidas, entre em contato através do email: ${process.env.PSICOLOGA_EMAIL}</p>
              
              <p>Atenciosamente,<br>
              <strong>${process.env.PSICOLOGA_NOME}</strong><br>
              Psicóloga Clínica</p>
            </div>
            <div class="footer">
              <p>Este é um email automático, por favor não responda.</p>
              <p>&copy; 2025 ${process.env.PSICOLOGA_NOME} - Todos os direitos reservados</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email enviado:', info.messageId);
    return info;

  } catch (error) {
    console.error('❌ Erro ao enviar email:', error);
    throw error;
  }
};

// Enviar email de lembrete (24h antes)
exports.enviarEmailLembrete = async (agendamento) => {
  try {
    const paciente = agendamento.paciente;
    const dataHoraFormatada = formatarDataHora(agendamento.dataHora);

    const mailOptions = {
      from: `"${process.env.PSICOLOGA_NOME}" <${process.env.EMAIL_USER}>`,
      to: paciente.email,
      subject: 'Lembrete: Sessão Agendada para Amanhã',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f9f9f9;
            }
            .header {
              background-color: #f39c12;
              color: white;
              padding: 20px;
              text-align: center;
              border-radius: 5px 5px 0 0;
            }
            .content {
              background-color: white;
              padding: 30px;
              border-radius: 0 0 5px 5px;
            }
            .info-box {
              background-color: #fff9e6;
              border-left: 4px solid #f39c12;
              padding: 15px;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔔 Lembrete de Sessão</h1>
            </div>
            <div class="content">
              <p>Olá, <strong>${paciente.nome}</strong>!</p>
              
              <p>Este é um lembrete de que você tem uma sessão agendada para <strong>amanhã</strong>.</p>
              
              <div class="info-box">
                <h3>Detalhes da Sessão:</h3>
                <p><strong>Data e Hora:</strong> ${dataHoraFormatada}</p>
                <p><strong>Profissional:</strong> ${process.env.PSICOLOGA_NOME}</p>
              </div>
              
              <p>Nos vemos em breve!</p>
              
              <p>Atenciosamente,<br>
              <strong>${process.env.PSICOLOGA_NOME}</strong></p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email de lembrete enviado:', info.messageId);
    return info;

  } catch (error) {
    console.error('❌ Erro ao enviar email de lembrete:', error);
    throw error;
  }
};

// Enviar email de cancelamento
exports.enviarEmailCancelamento = async (agendamento) => {
  try {
    const paciente = agendamento.paciente;
    const dataHoraFormatada = formatarDataHora(agendamento.dataHora);

    const mailOptions = {
      from: `"${process.env.PSICOLOGA_NOME}" <${process.env.EMAIL_USER}>`,
      to: paciente.email,
      cc: process.env.PSICOLOGA_EMAIL,
      subject: 'Cancelamento de Agendamento',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f9f9f9;
            }
            .header {
              background-color: #e74c3c;
              color: white;
              padding: 20px;
              text-align: center;
              border-radius: 5px 5px 0 0;
            }
            .content {
              background-color: white;
              padding: 30px;
              border-radius: 0 0 5px 5px;
            }
            .info-box {
              background-color: #ffe6e6;
              border-left: 4px solid #e74c3c;
              padding: 15px;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>❌ Agendamento Cancelado</h1>
            </div>
            <div class="content">
              <p>Olá, <strong>${paciente.nome}</strong>!</p>
              
              <p>Informamos que seu agendamento foi cancelado.</p>
              
              <div class="info-box">
                <h3>Detalhes do Agendamento Cancelado:</h3>
                <p><strong>Data e Hora:</strong> ${dataHoraFormatada}</p>
                ${agendamento.cancelamento.motivo ? `<p><strong>Motivo:</strong> ${agendamento.cancelamento.motivo}</p>` : ''}
              </div>
              
              <p>Para reagendar, entre em contato através do email: ${process.env.PSICOLOGA_EMAIL}</p>
              
              <p>Atenciosamente,<br>
              <strong>${process.env.PSICOLOGA_NOME}</strong></p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email de cancelamento enviado:', info.messageId);
    return info;

  } catch (error) {
    console.error('❌ Erro ao enviar email de cancelamento:', error);
    throw error;
  }
};

// Enviar email para a psicóloga sobre novo agendamento
exports.notificarPsicologaNovoAgendamento = async (agendamento) => {
  try {
    const paciente = agendamento.paciente;
    const dataHoraFormatada = formatarDataHora(agendamento.dataHora);

    const mailOptions = {
      from: `"Sistema de Agendamento" <${process.env.EMAIL_USER}>`,
      to: process.env.PSICOLOGA_EMAIL,
      subject: '🆕 Novo Agendamento Realizado',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f9f9f9;
            }
            .header {
              background-color: #27ae60;
              color: white;
              padding: 20px;
              text-align: center;
              border-radius: 5px 5px 0 0;
            }
            .content {
              background-color: white;
              padding: 30px;
              border-radius: 0 0 5px 5px;
            }
            .info-box {
              background-color: #e8f8f5;
              border-left: 4px solid #27ae60;
              padding: 15px;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🆕 Novo Agendamento!</h1>
            </div>
            <div class="content">
              <p>Olá, <strong>${process.env.PSICOLOGA_NOME}</strong>!</p>
              
              <p>Você tem um novo agendamento no sistema.</p>
              
              <div class="info-box">
                <h3>Informações do Paciente:</h3>
                <p><strong>Nome:</strong> ${paciente.nome}</p>
                <p><strong>Email:</strong> ${paciente.email}</p>
                <p><strong>Telefone:</strong> ${paciente.telefone}</p>
                <p><strong>Data de Nascimento:</strong> ${new Date(paciente.dataNascimento).toLocaleDateString('pt-BR')}</p>
                <p><strong>Primeira Consulta:</strong> ${paciente.primeiraConsulta ? 'Sim' : 'Não'}</p>
              </div>
              
              <div class="info-box">
                <h3>Detalhes do Agendamento:</h3>
                <p><strong>Data e Hora:</strong> ${dataHoraFormatada}</p>
                <p><strong>Tipo:</strong> ${agendamento.tipo === 'individual' ? 'Sessão Individual' : agendamento.tipo === 'casal' ? 'Terapia de Casal' : 'Avaliação'}</p>
                <p><strong>Valor:</strong> R$ ${agendamento.valor.toFixed(2)}</p>
                <p><strong>Status do Pagamento:</strong> ${agendamento.pagamento.status}</p>
                ${agendamento.observacoes ? `<p><strong>Observações:</strong> ${agendamento.observacoes}</p>` : ''}
              </div>
              
              <p>Este email foi gerado automaticamente pelo sistema de agendamento.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email de notificação enviado para psicóloga:', info.messageId);
    return info;

  } catch (error) {
    console.error('❌ Erro ao enviar notificação para psicóloga:', error);
    throw error;
  }
};