// ==============================
// Configuração base da API
// ==============================
// Detectar ambiente automaticamente
const API_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:5000/api'
  : 'https://psicarolmarques.com.br/api';

// ==============================
// Função auxiliar para requisições
// ==============================
async function fetchAPI(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });

        let data = {};
        try {
            data = await response.json();
        } catch (e) {
            console.error('Erro ao fazer parse do JSON da resposta:', e);
        }

        if (!response.ok) {
            const msg = data.message || data.error || 'Erro na requisição';
            throw new Error(msg);
        }

        return data;
    } catch (error) {
        console.error('Erro na API:', error);
        throw error;
    }
}

// ==============================
// API de Disponibilidade
// ==============================
const disponibilidadeAPI = {
    // Listar todas as disponibilidades
    listar: () => fetchAPI('/disponibilidade'),

    // Buscar disponibilidade de um dia específico
    buscarPorDia: (diaSemana) => fetchAPI(`/disponibilidade/${encodeURIComponent(diaSemana)}`),

    // Inicializar disponibilidade padrão
    inicializar: () => fetchAPI('/disponibilidade/inicializar', {
        method: 'POST'
    })
};

// ==============================
// API de Agendamentos
// ==============================
const agendamentoAPI = {
    // Criar novo agendamento
    criar: (dados) => fetchAPI('/agendamentos', {
        method: 'POST',
        body: JSON.stringify(dados)
    }),

    // Listar agendamentos com filtros opcionais
    listar: (filtros = {}) => {
        const params = new URLSearchParams(filtros);
        const query = params.toString();
        const sufixo = query ? `?${query}` : '';
        return fetchAPI(`/agendamentos${sufixo}`);
    },

    // Buscar horários disponíveis para uma data (usado na Etapa 2)
    buscarHorariosDisponiveis: (dataISO) => {
        console.log('🔗 API: Buscando horários disponíveis para data:', dataISO);
        return fetchAPI(`/agendamentos/horarios-disponiveis?data=${encodeURIComponent(dataISO)}`);
    },

    // Buscar agendamento por ID
    buscarPorId: (id) => fetchAPI(`/agendamentos/${id}`),

    // Atualizar status do agendamento
    atualizarStatus: (id, status) => fetchAPI(`/agendamentos/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
    }),

    // Cancelar agendamento
    cancelar: (id, dados) => fetchAPI(`/agendamentos/${id}/cancelar`, {
        method: 'PATCH',
        body: JSON.stringify(dados)
    })
};

// ==============================
// API de Pacientes
// ==============================
const pacienteAPI = {
    // Criar novo paciente
    criar: (dados) => fetchAPI('/pacientes', {
        method: 'POST',
        body: JSON.stringify(dados)
    }),

    // Buscar paciente por email
    buscarPorEmail: (email) => fetchAPI(`/pacientes/email/${encodeURIComponent(email)}`),

    // Buscar paciente por ID
    buscarPorId: (id) => fetchAPI(`/pacientes/${id}`),

    // Listar todos os pacientes
    listar: () => fetchAPI('/pacientes'),

    // Atualizar paciente
    atualizar: (id, dados) => fetchAPI(`/pacientes/${id}`, {
        method: 'PUT',
        body: JSON.stringify(dados)
    })
};

// ==============================
// API de Pagamentos
// ==============================
const pagamentoAPI = {
    // Criar preferência de pagamento no Mercado Pago
    criarPreferencia: (agendamentoId, extras = {}) => fetchAPI('/pagamentos/criar-preferencia', {
        method: 'POST',
        body: JSON.stringify({
            agendamentoId,
            ...extras // caso queira mandar descricao, urls, etc.
        })
    }),

    // Confirmar pagamento manual (PIX, dinheiro, transferência)
    confirmarManual: (dados) => fetchAPI('/pagamentos/confirmar-manual', {
        method: 'POST',
        body: JSON.stringify(dados)
    }),

    // Buscar status do pagamento de um agendamento
    buscarStatus: (agendamentoId) => fetchAPI(`/pagamentos/${agendamentoId}`)
};

// ==============================
// Funções auxiliares (Utils)
// ==============================
const utils = {
    // Formatar data para exibição longa (ex: segunda-feira, 10 de março de 2025)
    formatarData: (data) => {
        const d = new Date(data);
        if (isNaN(d.getTime())) return '';
        const options = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        };
        return d.toLocaleDateString('pt-BR', options);
    },

    // Formatar para ISO (YYYY-MM-DD) a partir de Date ou string
    formatarDataISO: (data) => {
        const d = new Date(data);
        if (isNaN(d.getTime())) return '';
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    // Validar CPF
    validarCPF: (cpf) => {
        cpf = cpf.replace(/[^\d]/g, '');

        if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
            return false;
        }

        let soma = 0;
        let resto;

        for (let i = 1; i <= 9; i++) {
            soma += parseInt(cpf.substring(i - 1, i)) * (11 - i);
        }

        resto = (soma * 10) % 11;
        if (resto === 10 || resto === 11) resto = 0;
        if (resto !== parseInt(cpf.substring(9, 10))) return false;

        soma = 0;
        for (let i = 1; i <= 10; i++) {
            soma += parseInt(cpf.substring(i - 1, i)) * (12 - i);
        }

        resto = (soma * 10) % 11;
        if (resto === 10 || resto === 11) resto = 0;
        if (resto !== parseInt(cpf.substring(10, 11))) return false;

        return true;
    },

    // Validar email
    validarEmail: (email) => {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    },

    // Máscara telefone
    mascaraTelefone: (valor) => {
        valor = valor.replace(/\D/g, '');
        valor = valor.replace(/^(\d{2})(\d)/g, '($1) $2');
        valor = valor.replace(/(\d)(\d{4})$/, '$1-$2');
        return valor;
    },

    // Máscara CPF
    mascaraCPF: (valor) => {
        valor = valor.replace(/\D/g, '');
        valor = valor.replace(/(\d{3})(\d)/, '$1.$2');
        valor = valor.replace(/(\d{3})(\d)/, '$1.$2');
        valor = valor.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
        return valor;
    },

    // Máscara CEP
    mascaraCEP: (valor) => {
        valor = valor.replace(/\D/g, '');
        valor = valor.replace(/(\d{5})(\d)/, '$1-$2');
        return valor;
    },

    // Buscar endereço pelo CEP (ViaCEP)
    buscarCEP: async (cep) => {
        try {
            cep = cep.replace(/\D/g, '');
            if (cep.length !== 8) return null;

            const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            const data = await response.json();

            if (data.erro) return null;

            return {
                rua: data.logradouro,
                bairro: data.bairro,
                cidade: data.localidade,
                estado: data.uf
            };
        } catch (error) {
            console.error('Erro ao buscar CEP:', error);
            return null;
        }
    }
};
