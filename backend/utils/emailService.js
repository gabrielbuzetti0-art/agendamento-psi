// backend/services/emailService.js (ou caminho equivalente)
const nodemailer = require('nodemailer');

// ==============================
// CONFIGURAÇÃO DO TRANSPORTER
// ==============================
const emailHost = process.env.EMAIL_HOST || 'smtp.gmail.com';
const emailPort = Number(process.env.EMAIL_PORT || 587); // 587 = STARTTLS (padrão Gmail)
const emailSecure = emailPort === 465; // 465 = SSL direto

const transporter = nodemailer.createTransport({
  host: emailHost,
  port: emailPort,
  secure: emailSecure,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  // Mantém compatibilidade com alguns provedores
  tls: {
    rejectUnauthorized: false
  },
  // Evita ficar pendurado muito tempo tentando conectar
  connectionTimeout: 10000, // 10s
  greetingTimeout: 10000,   // 10s
  socketTimeout: 20000      // 20s
});

// ==============================
// VERIFICAÇÃO (NÃO DERRUBA O APP)
// ==============================
transporter
  .verify()
  .then(() => {
    console.log('✅ Servidor de email pronto para enviar mensagens');
  })
  .catch((err) => {
    console.warn(
      '⚠️ Não foi possível verificar o servidor de email agora (mas o sistema continua rodando). Detalhe:',
      err.message
    );
  });

module.exports = transporter;


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

    // Determinar tipo de sessão
    let tipoTexto = 'Sessão Avulsa';
    if (agendamento.tipo === 'pacote_mensal') {
      tipoTexto = 'Pacote Mensal (4 sessões)';
    } else if (agendamento.tipo === 'pacote_anual') {
      tipoTexto = 'Pacote Anual (48 sessões)';
    }

    // Status do pagamento
    const statusPagamento = agendamento.statusPagamento === 'pago' ? 'Pago' : 'Aguardando Pagamento';

    const mailOptions = {
      from: `"${process.env.PSICOLOGA_NOME}" <${process.env.EMAIL_USER}>`,
      to: paciente.email,
      cc: process.env.PSICOLOGA_EMAIL,
      subject: '✅ Agendamento Confirmado - Caroline Marques Brito',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #333;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f9f9f9;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px;
              text-align: center;
              border-radius: 10px 10px 0 0;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
            }
            .content {
              background-color: white;
              padding: 30px;
              border-radius: 0 0 10px 10px;
            }
            .info-box {
              background-color: #f0f8ff;
              border-left: 4px solid #667eea;
              padding: 20px;
              margin: 20px 0;
              border-radius: 5px;
            }
            .info-box h3 {
              margin-top: 0;
              color: #667eea;
            }
            .info-box ul {
              list-style: none;
              padding: 0;
              margin: 0;
            }
            .info-box ul li {
              padding: 8px 0;
              border-bottom: 1px solid #e0e0e0;
            }
            .info-box ul li:last-child {
              border-bottom: none;
            }
            .alert {
              background-color: #fff3cd;
              border-left: 4px solid #ffc107;
              padding: 15px;
              margin: 20px 0;
              border-radius: 5px;
            }
            .alert strong {
              color: #856404;
            }
            .orientacoes {
              background-color: #f0f8ff;
              padding: 20px;
              margin: 20px 0;
              border-radius: 5px;
              border-left: 4px solid #667eea;
            }
            .orientacoes h3 {
              color: #667eea;
              margin-top: 0;
            }
            .orientacoes ul {
              padding-left: 20px;
            }
            .orientacoes ul li {
              margin: 10px 0;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e0e0e0;
              font-size: 14px;
              color: #666;
            }
            .footer p {
              margin: 5px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Agendamento Confirmado!</h1>
            </div>
            
            <div class="content">
              <p><strong>Olá, ${paciente.nome}!</strong></p>
              <p>Seu agendamento foi realizado com sucesso.</p>
              
              <div class="info-box">
                <h3>📅 Detalhes da Sessão:</h3>
                <ul>
                  <li><strong>📆 Data e horário:</strong> ${dataHoraFormatada}</li>
                  <li><strong>⏱️ Duração:</strong> 50 minutos</li>
                  <li><strong>📋 Tipo:</strong> ${tipoTexto}</li>
                  <li><strong>💰 Valor:</strong> R$ ${agendamento.valor.toFixed(2)}</li>
                  <li><strong>💳 Status do pagamento:</strong> ${statusPagamento}</li>
                </ul>
              </div>
              
              ${agendamento.statusPagamento !== 'pago' ? `
              <div class="alert">
                <strong>⚠️ Importante:</strong> Seu horário será efetivamente garantido após a confirmação do pagamento.
              </div>
              ` : ''}
              
              <div class="orientacoes">
                <h3>📝 Orientações para a Sessão:</h3>
                <ul>
                  <li>Escolha um <strong>ambiente tranquilo, seguro e silencioso</strong> para a realização da consulta.</li>
                  <li>Se necessário, utilize <strong>fones de ouvido</strong> para garantir sua privacidade.</li>
                  <li>Certifique-se de que possui <strong>boa conexão com a internet</strong> e acesso aos equipamentos necessários.</li>
                  <li>Mantenha <strong>câmera e microfone ligados</strong> para que a sessão ocorra de forma adequada.</li>
                  <li>Chegue com <strong>5 minutos de antecedência</strong>.</li>
                  <li>Caso precise desmarcar, avise com pelo menos <strong>24h de antecedência</strong>.</li>
                </ul>
              </div>
              
              <p><strong>Para dúvidas ou suporte, entre em contato:</strong></p>
              <p>
                📧 <strong>Email:</strong> ${process.env.PSICOLOGA_EMAIL}<br>
                📱 <strong>WhatsApp:</strong> (17) 99625-8369
              </p>
              
              <div class="footer">
                <p><strong>Atenciosamente,</strong></p>
                <p><strong>${process.env.PSICOLOGA_NOME}</strong><br>
                Psicóloga Clínica - CRP 14/09165-4</p>
                <p><a href="https://psicarolmarques.com.br" style="color: #667eea; text-decoration: none;">psicarolmarques.com.br</a></p>
              </div>
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
                ${agendamento.cancelamento?.motivo ? `<p><strong>Motivo:</strong> ${agendamento.cancelamento.motivo}</p>` : ''}
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

    // Determinar tipo
    let tipoTexto = 'Sessão Avulsa';
    if (agendamento.tipo === 'pacote_mensal') {
      tipoTexto = 'Pacote Mensal (4 sessões)';
    } else if (agendamento.tipo === 'pacote_anual') {
      tipoTexto = 'Pacote Anual (48 sessões)';
    }

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
                <p><strong>Tipo:</strong> ${tipoTexto}</p>
                <p><strong>Valor:</strong> R$ ${agendamento.valor.toFixed(2)}</p>
                <p><strong>Status do Pagamento:</strong> ${agendamento.statusPagamento}</p>
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