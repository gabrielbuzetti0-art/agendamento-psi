// ==============================
// Estado da aplicação
// ==============================
let state = {
    currentStep: 1,
    selectedDate: null,
    selectedTime: null,
    pacienteData: {},
    agendamentoId: null,
    tipoSessao: 'avulsa',
    parcelas: 1
};

let calendarAvailability = {}; // { 'YYYY-MM-DD': { status: 'full'|'partial'|'none', ... } }

// ==============================
// Carregar disponibilidade do mês para o calendário
// ==============================
async function carregarDisponibilidadeMes(instance, ano, mes) {
    try {
        console.log('📅 Carregando disponibilidade do mês:', ano, mes);
        const response = await agendamentoAPI.disponibilidadeCalendario(ano, mes);

        if (!response || !response.data) {
            console.error('❌ Resposta inválida em disponibilidadeCalendario:', response);
            calendarAvailability = {};
            instance.redraw();
            return;
        }

        calendarAvailability = response.data;
        console.log('✅ Disponibilidade do calendário carregada:', calendarAvailability);

        // Redesenha os dias (chama onDayCreate de novo)
        instance.redraw();
    } catch (error) {
        console.error('❌ Erro ao carregar disponibilidade do mês:', error);
        calendarAvailability = {};
        instance.redraw();
    }
}

// ==============================
// Inicializar calendário (com cores e bloqueio de dias sem horário)
// ==============================
function initCalendar() {
    flatpickr("#datepicker", {
        locale: "pt",
        minDate: "today",
        dateFormat: "d/m/Y",
        disable: [
            function(date) {
                // Desabilita domingos e sábados
                return (date.getDay() === 0 || date.getDay() === 6);
            }
        ],
        onReady: function(selectedDates, dateStr, instance) {
            console.log('📅 Flatpickr pronto');
            const anoAtual = instance.currentYear;
            const mesAtual = instance.currentMonth + 1; // 0-based → 1-12
            carregarDisponibilidadeMes(instance, anoAtual, mesAtual);
        },
        onMonthChange: function(selectedDates, dateStr, instance) {
            const ano = instance.currentYear;
            const mes = instance.currentMonth + 1;
            console.log('📅 Mês alterado:', ano, mes);
            carregarDisponibilidadeMes(instance, ano, mes);
        },
        onYearChange: function(selectedDates, dateStr, instance) {
            const ano = instance.currentYear;
            const mes = instance.currentMonth + 1;
            console.log('📅 Ano alterado:', ano, mes);
            carregarDisponibilidadeMes(instance, ano, mes);
        },
        onDayCreate: function(dObj, dStr, instance, dayElem) {
            // ⚠️ Usar o dObj (Date) direto, é mais seguro que dayElem.dateObj
            const dateObj = dObj;
            const year = dateObj.getFullYear();
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const day = String(dateObj.getDate()).padStart(2, '0');
            const key = `${year}-${month}-${day}`;

            const info = calendarAvailability[key];
            if (!info) return;

            // Remove classes antigas
            dayElem.classList.remove('dia-full', 'dia-partial', 'dia-none');

            if (info.status === 'full') {
                dayElem.classList.add('dia-full');      // verde
            } else if (info.status === 'partial') {
                dayElem.classList.add('dia-partial');   // amarelo
            } else if (info.status === 'none') {
                dayElem.classList.add('dia-none');      // vermelho
            }
        },
        onChange: function(selectedDates, dateStr, instance) {
            if (selectedDates.length > 0) {
                const dataISO = utils.formatarDataISO(selectedDates[0]); // YYYY-MM-DD
                const info = calendarAvailability[dataISO];

                // Se dia estiver marcado como "none", não deixa avançar
                if (info && info.status === 'none') {
                    alert('Não há horários disponíveis para esta data. Por favor, escolha outro dia.');
                    state.selectedDate = null;
                    document.getElementById('btnNextStep1').disabled = true;
                    instance.clear();
                    return;
                }

                state.selectedDate = selectedDates[0];
                document.getElementById('btnNextStep1').disabled = false;
                console.log('✅ Data selecionada:', state.selectedDate, 'info:', info);
            }
        }
    });
}

// ==============================
// Inicialização geral
// ==============================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Sistema iniciado');
    initCalendar();
    initEventListeners();
    initMasks();
    initCEPSearch();
});

// ==============================
// Inicializar event listeners
// ==============================
function initEventListeners() {
    document.getElementById('btnNextStep1').addEventListener('click', () => {
        console.log('▶️ Passo 1 → 2');
        console.log('Estado:', state);
        goToStep(2);
    });
    
    document.getElementById('btnBackStep2').addEventListener('click', () => goToStep(1));
    document.getElementById('btnNextStep2').addEventListener('click', () => goToStep(3));
    document.getElementById('btnBackStep3').addEventListener('click', () => goToStep(2));
    document.getElementById('btnNextStep3').addEventListener('click', handleStep3);
    document.getElementById('btnBackStep4').addEventListener('click', () => goToStep(3));
    document.getElementById('btnFinalizarAgendamento').addEventListener('click', finalizarAgendamento);

    // Listener para mudança de tipo de sessão
    document.querySelectorAll('input[name="tipoSessao"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            state.tipoSessao = e.target.value;
            console.log('✅ Tipo ALTERADO para:', state.tipoSessao);
            
            const alertaHorarioFixo = document.getElementById('alertaHorarioFixo');
            if (e.target.value === 'pacote_mensal' || e.target.value === 'pacote_anual') {
                alertaHorarioFixo.style.display = 'flex';
            } else {
                alertaHorarioFixo.style.display = 'none';
            }

            // Se já estiver no passo de horários, recarrega com a nova regra
            if (state.currentStep === 2 && state.selectedDate) {
                console.log('🔄 Tipo de sessão alterado no passo 2, recarregando horários...');
                loadHorarios();
            }
        });
    });

    const selectParcelas = document.getElementById('selectParcelas');
    if (selectParcelas) {
        selectParcelas.addEventListener('change', (e) => {
            state.parcelas = parseInt(e.target.value);
            atualizarDetalheParcelas();
        });
    }
}

// ==============================
// Máscaras de input
// ==============================
function initMasks() {
    const telefoneInput = document.getElementById('telefone');
    const cpfInput = document.getElementById('cpf');
    const cepInput = document.getElementById('cep');

    telefoneInput.addEventListener('input', (e) => {
        e.target.value = utils.mascaraTelefone(e.target.value);
    });

    cpfInput.addEventListener('input', (e) => {
        e.target.value = utils.mascaraCPF(e.target.value);
    });

    cepInput.addEventListener('input', (e) => {
        e.target.value = utils.mascaraCEP(e.target.value);
    });
}

// ==============================
// Busca de CEP
// ==============================
function initCEPSearch() {
    const cepInput = document.getElementById('cep');
    
    cepInput.addEventListener('blur', async () => {
        const cep = cepInput.value.replace(/\D/g, '');
        
        if (cep.length === 8) {
            const endereco = await utils.buscarCEP(cep);
            
            if (endereco) {
                document.getElementById('rua').value = endereco.rua || '';
                document.getElementById('bairro').value = endereco.bairro || '';
                document.getElementById('cidade').value = endereco.cidade || '';
                document.getElementById('estado').value = endereco.estado || '';
            } else {
                alert('CEP não encontrado!');
            }
        }
    });
}

// ==============================
// Navegar entre passos
// ==============================
function goToStep(stepNumber) {
    console.log('===================================');
    console.log('📍 NAVEGANDO PARA PASSO:', stepNumber);
    console.log('📊 ESTADO COMPLETO:', JSON.parse(JSON.stringify(state)));
    console.log('===================================');
    
    state.currentStep = stepNumber;

    document.querySelectorAll('.step').forEach(step => {
        const stepNum = parseInt(step.dataset.step);
        step.classList.remove('active', 'completed');
        
        if (stepNum === stepNumber) {
            step.classList.add('active');
        } else if (stepNum < stepNumber) {
            step.classList.add('completed');
        }
    });

    document.querySelectorAll('.step-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`step${stepNumber}`).classList.add('active');

    if (stepNumber === 2) {
        console.log('🔄 PASSO 2 - Vai carregar horários');
        loadHorarios();
    } else if (stepNumber === 4) {
        console.log('📋 PASSO 4 - Vai mostrar resumo');
        mostrarResumo();
        configurarParcelamento();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ==============================
// Carregar horários disponíveis (Passo 2)
// ==============================
async function loadHorarios() {
    console.log('🔍 ========== LOAD HORÁRIOS INICIADO ==========');
    console.log('Data no state:', state.selectedDate);
    console.log('Tipo no state:', state.tipoSessao);
    
    if (!state.selectedDate) {
        console.error('❌ ERRO: Data não definida!');
        alert('Erro: Selecione uma data primeiro.');
        goToStep(1);
        return;
    }
    
    const horariosGrid = document.getElementById('horariosGrid');
    const loadingHorarios = document.getElementById('loadingHorarios');
    const selectedDateElement = document.getElementById('selectedDate');

    selectedDateElement.textContent = utils.formatarData(state.selectedDate);

    loadingHorarios.style.display = 'block';
    horariosGrid.innerHTML = '';

    try {
        const dataISO = utils.formatarDataISO(state.selectedDate);
        console.log('📤 Fazendo requisição para:', dataISO, 'tipo:', state.tipoSessao);
        
        const response = await agendamentoAPI.buscarHorariosDisponiveis(dataISO, state.tipoSessao);
        
        console.log('📥 Resposta recebida:', response);

        loadingHorarios.style.display = 'none';

        // VERIFICAÇÃO CRÍTICA
        if (!response || !response.data || !response.data.horariosDisponiveis) {
            console.error('❌ Resposta inválida:', response);
            horariosGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #dc3545;">Erro: Resposta inválida da API.</p>';
            return;
        }

        const horariosDisponiveis = response.data.horariosDisponiveis;
        
        console.log('✅ Horários disponíveis recebidos:', horariosDisponiveis);
        console.log('✅ Tipo:', typeof horariosDisponiveis);
        console.log('✅ É array?', Array.isArray(horariosDisponiveis));
        console.log('✅ Length:', horariosDisponiveis.length);

        if (!Array.isArray(horariosDisponiveis) || horariosDisponiveis.length === 0) {
            horariosGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #999;">Não há horários disponíveis para esta data.</p>';
            return;
        }

        // LIMPAR O GRID ANTES DE ADICIONAR
        horariosGrid.innerHTML = '';
        
        console.log('🔨 Criando elementos de horário...');

        horariosDisponiveis.forEach((horario, index) => {
            console.log(`  Criando horário ${index + 1}:`, horario);
            
            const horarioElement = document.createElement('div');
            horarioElement.className = 'horario-item';
            horarioElement.textContent = horario;
            horarioElement.dataset.horario = horario;

            horarioElement.addEventListener('click', () => {
                document.querySelectorAll('.horario-item').forEach(item => {
                    item.classList.remove('selected');
                });

                horarioElement.classList.add('selected');
                state.selectedTime = horario;
                console.log('✅ Horário selecionado:', state.selectedTime);
                document.getElementById('btnNextStep2').disabled = false;
            });

            horariosGrid.appendChild(horarioElement);
            console.log('  ✓ Horário adicionado ao DOM');
        });
        
        console.log('✅ Total de horários renderizados:', horariosGrid.children.length);

    } catch (error) {
        console.error('❌ ERRO NO CATCH:', error);
        console.error('Stack:', error.stack);
        loadingHorarios.style.display = 'none';
        horariosGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #dc3545;">Erro ao carregar horários. Detalhes: ' + error.message + '</p>';
    }
    
    console.log('🔍 ========== LOAD HORÁRIOS FINALIZADO ==========');
}

// ==============================
// Validar e processar passo 3
// ==============================
function handleStep3() {
    const form = document.getElementById('formDadosPaciente');
    
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const formData = new FormData(form);
    const dados = {};
    
    formData.forEach((value, key) => {
        if (key === 'primeiraConsulta') {
            dados[key] = document.getElementById('primeiraConsulta').checked;
        } else {
            dados[key] = typeof value === 'string' ? value.trim() : value;
        }
    });

    if (!utils.validarCPF(dados.cpf)) {
        alert('CPF inválido!');
        document.getElementById('cpf').focus();
        return;
    }

    const emailLimpo = dados.email.trim();
    if (!utils.validarEmail(emailLimpo)) {
        alert('E-mail inválido!');
        document.getElementById('email').focus();
        return;
    }
    dados.email = emailLimpo;

    state.pacienteData = dados;
    console.log('✅ Dados do paciente salvos:', state.pacienteData);

    goToStep(4);
}

// ==============================
// Configurar opções de parcelamento
// ==============================
function configurarParcelamento() {
    console.log('⚙️ Configurando parcelamento para tipo:', state.tipoSessao);
    
    const tipoSessao = state.tipoSessao;
    const parcelamentoContainer = document.getElementById('parcelamentoContainer');
    const selectParcelas = document.getElementById('selectParcelas');
    
    if (tipoSessao === 'pacote_mensal' || tipoSessao === 'pacote_anual') {
        parcelamentoContainer.style.display = 'block';
        
        selectParcelas.innerHTML = '';
        
        if (tipoSessao === 'pacote_mensal') {
            for (let i = 1; i <= 4; i++) {
                const option = document.createElement('option');
                option.value = i;
                const valorParcela = (480 / i).toFixed(2);
                option.textContent = `${i}x de R$ ${valorParcela}${i === 1 ? ' (à vista)' : ''}`;
                selectParcelas.appendChild(option);
            }
        } else {
            for (let i = 1; i <= 12; i++) {
                const option = document.createElement('option');
                option.value = i;
                const valorParcela = (5760 / i).toFixed(2);
                option.textContent = `${i}x de R$ ${valorParcela}${i === 1 ? ' (à vista)' : ''}`;
                selectParcelas.appendChild(option);
            }
        }
        
        state.parcelas = 1;
        
        if (state.selectedDate && state.selectedTime) {
            atualizarDetalheParcelas();
        }
        
    } else {
        parcelamentoContainer.style.display = 'none';
        state.parcelas = 1;
    }
}

// ==============================
// Atualizar detalhes do parcelamento
// ==============================
function atualizarDetalheParcelas() {
    const tipoSessao = state.tipoSessao;
    const parcelas = state.parcelas;
    const detalheElement = document.getElementById('parcelamentoDetalhe');
    
    const diaSemana = state.selectedDate ? obterDiaSemana(state.selectedDate) : '[dia da semana]';
    const horario = state.selectedTime || '[horário]';
    
    if (tipoSessao === 'pacote_mensal') {
        const totalSessoes = 4;
        const valorTotal = 480;
        const valorParcela = (valorTotal / parcelas).toFixed(2);
        
        detalheElement.innerHTML = `
            <strong>📋 Resumo do Pacote Mensal:</strong><br>
            • ${totalSessoes} sessões semanais<br>
            • Toda ${diaSemana} às ${horario}<br>
            • Valor total: R$ ${valorTotal.toFixed(2)}<br>
            • Parcelamento: ${parcelas}x de R$ ${valorParcela}
        `;
    } else if (tipoSessao === 'pacote_anual') {
        const totalSessoes = 48;
        const valorTotal = 5760;
        const valorParcela = (valorTotal / parcelas).toFixed(2);
        const economia = (totalSessoes * 150) - valorTotal;
        
        detalheElement.innerHTML = `
            <strong>📋 Resumo do Pacote Anual:</strong><br>
            • ${totalSessoes} sessões semanais (1 ano)<br>
            • Toda ${diaSemana} às ${horario}<br>
            • Valor total: R$ ${valorTotal.toFixed(2)}<br>
            • Economia de R$ ${economia.toFixed(2)}!<br>
            • Parcelamento: ${parcelas}x de R$ ${valorParcela}
        `;
    }
}

// ==============================
// Obter dia da semana por extenso
// ==============================
function obterDiaSemana(data) {
    if (!data) return 'dia da semana';
    
    const dias = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
    return dias[data.getDay()];
}

// ==============================
// Mostrar resumo do agendamento
// ==============================
function mostrarResumo() {
    console.log('📋 ========== MOSTRANDO RESUMO ==========');
    console.log('Estado completo:', JSON.parse(JSON.stringify(state)));
    
    const tipoSessao = state.tipoSessao;
    
    let valorSessao, tipoTexto;
    
    if (tipoSessao === 'pacote_mensal') {
        valorSessao = 'R$ 480,00';
        tipoTexto = 'Pacote Mensal (4 sessões)';
    } else if (tipoSessao === 'pacote_anual') {
        valorSessao = 'R$ 5.760,00';
        tipoTexto = 'Pacote Anual (48 sessões)';
    } else {
        valorSessao = 'R$ 150,00';
        tipoTexto = 'Sessão Avulsa';
    }

    const dataFormatada = state.selectedDate ? utils.formatarData(state.selectedDate) : 'Data não selecionada';
    
    console.log('Resumo gerado:', { dataFormatada, horario: state.selectedTime, tipo: tipoTexto, valor: valorSessao });
    
    document.getElementById('resumoData').textContent = dataFormatada;
    document.getElementById('resumoHorario').textContent = state.selectedTime || 'Horário não selecionado';
    document.getElementById('resumoNome').textContent = state.pacienteData.nome;
    document.getElementById('resumoEmail').textContent = state.pacienteData.email;
    document.getElementById('resumoTipo').textContent = tipoTexto;
    document.getElementById('resumoValor').textContent = valorSessao;
}

// ==============================
// Finalizar agendamento (criação + pagamento)
// ==============================
async function finalizarAgendamento() {
    const btnFinalizar = document.getElementById('btnFinalizarAgendamento');
    btnFinalizar.disabled = true;
    btnFinalizar.textContent = 'Processando...';

    console.log('🚀 ========== FINALIZANDO AGENDAMENTO ==========');
    console.log('Estado completo:', JSON.parse(JSON.stringify(state)));

    if (!state.selectedDate || !state.selectedTime) {
        alert('Erro: Data ou horário não selecionados.');
        btnFinalizar.disabled = false;
        btnFinalizar.textContent = '✓ Confirmar e Pagar';
        return;
    }

    try {
        // 1. CRIAR/BUSCAR PACIENTE PRIMEIRO
        let pacienteId;
        
        try {
            const pacienteExistente = await pacienteAPI.buscarPorEmail(state.pacienteData.email);
            pacienteId = pacienteExistente.data._id;
            console.log('✅ Paciente existente encontrado:', pacienteId);
        } catch (error) {
            console.log('📝 Criando novo paciente...');
            const novoPaciente = await pacienteAPI.criar({
                nome: state.pacienteData.nome,
                email: state.pacienteData.email,
                telefone: state.pacienteData.telefone,
                cpf: state.pacienteData.cpf.replace(/\D/g, ''),
                dataNascimento: state.pacienteData.dataNascimento,
                endereco: {
                    rua: state.pacienteData.rua || '',
                    numero: state.pacienteData.numero || '',
                    bairro: state.pacienteData.bairro || '',
                    cidade: state.pacienteData.cidade || '',
                    estado: state.pacienteData.estado || '',
                    cep: state.pacienteData.cep?.replace(/\D/g, '') || ''
                },
                primeiraConsulta: state.pacienteData.primeiraConsulta || false,
                observacoes: state.pacienteData.observacoes || ''
            });
            
            pacienteId = novoPaciente.data._id;
            console.log('✅ Novo paciente criado:', pacienteId);
        }

        // 2. PREPARAR DATA E HORA
        const [hora, minuto] = state.selectedTime.split(':');
        const dataHora = new Date(state.selectedDate);
        dataHora.setHours(parseInt(hora), parseInt(minuto), 0, 0);

        console.log('📤 Criando agendamento:', {
            pacienteId,
            dataHora: dataHora.toISOString(),
            tipo: state.tipoSessao
        });

        // 3. CRIAR AGENDAMENTO COM TODOS OS DADOS OBRIGATÓRIOS
        const dadosAgendamento = {
            pacienteId: pacienteId,
            dataHora: dataHora.toISOString(),
            tipo: state.tipoSessao,
            observacoes: state.pacienteData.observacoes || ''
        };

        // Adicionar parcelas apenas se for pacote
        if (state.tipoSessao === 'pacote_mensal' || state.tipoSessao === 'pacote_anual') {
            dadosAgendamento.parcelas = state.parcelas;
        }

        const agendamento = await agendamentoAPI.criar(dadosAgendamento);

        console.log('✅ Agendamento criado:', agendamento);

        state.agendamentoId = agendamento.data._id;

        // 4. PROCESSAR PAGAMENTO
        const metodoPagamento = document.querySelector('input[name="metodoPagamento"]:checked').value;

        if (metodoPagamento === 'pix') {
            console.log('💳 Processando pagamento PIX...');
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            await pagamentoAPI.confirmarManual({
                agendamentoId: state.agendamentoId,
                metodo: 'pix',
                comprovante: 'aguardando_confirmacao'
            });
        }

        // 5. MOSTRAR SUCESSO
        document.querySelectorAll('.step-content').forEach(content => {
            content.style.display = 'none';
        });
        document.getElementById('stepSucesso').style.display = 'block';

        console.log('🎉 AGENDAMENTO FINALIZADO COM SUCESSO!');

    } catch (error) {
        console.error('❌ Erro completo:', error);
        console.error('Stack:', error.stack);
        alert('Erro ao finalizar agendamento: ' + error.message);
        btnFinalizar.disabled = false;
        btnFinalizar.textContent = '✓ Confirmar e Pagar';
    }
}
