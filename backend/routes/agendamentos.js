const express = require('express');
const router = express.Router();
const Agendamento = require('../models/Agendamento');
const Paciente = require('../models/Paciente');

// Buscar horários disponíveis para uma data específica
router.get('/horarios-disponiveis', async (req, res) => {
    try {
        const { data, tipo } = req.query;
        
        if (!data) {
            return res.status(400).json({ 
                success: false, 
                message: 'Data é obrigatória' 
            });
        }

        // Horários fixos disponíveis
        const horariosFixos = ['18:00', '19:00', '20:30'];
        
        // Converter data para início e fim do dia
        const dataInicio = new Date(data);
        dataInicio.setHours(0, 0, 0, 0);
        
        const dataFim = new Date(data);
        dataFim.setHours(23, 59, 59, 999);

        // Buscar todos os agendamentos do dia (não cancelados)
        const agendamentosExistentes = await Agendamento.find({
            dataHora: {
                $gte: dataInicio,
                $lte: dataFim
            },
            status: { $ne: 'cancelado' }
        });

        // Função para verificar se um horário está ocupado
        const horarioOcupado = (horario) => {
            return agendamentosExistentes.some(ag => {
                const horaAgendamento = new Date(ag.dataHora).toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit'
                });
                return horaAgendamento === horario;
            });
        };

        // Função para verificar conflitos com pacotes
        const verificarConflitosPacote = async (horario, dataConsulta) => {
            const diaSemana = new Date(dataConsulta).getDay(); // 0=domingo, 1=segunda, etc.
            
            // Buscar agendamentos de pacotes no mesmo horário e dia da semana
            const agendamentosPacote = await Agendamento.find({
                tipo: { $in: ['pacote_mensal', 'pacote_anual'] },
                status: { $ne: 'cancelado' }
            });

            for (const ag of agendamentosPacote) {
                const diaAgendamento = new Date(ag.dataHora).getDay();
                const horaAgendamento = new Date(ag.dataHora).toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit'
                });

                // Se for mesmo dia da semana e mesmo horário
                if (diaAgendamento === diaSemana && horaAgendamento === horario) {
                    // Verificar se a data da consulta está dentro do período do pacote
                    const dataConsultaTimestamp = new Date(dataConsulta).getTime();
                    const dataAgendamentoTimestamp = new Date(ag.dataHora).getTime();
                    
                    if (ag.tipo === 'pacote_mensal') {
                        // Pacote mensal: 4 semanas
                        const umMes = 4 * 7 * 24 * 60 * 60 * 1000; // 4 semanas em ms
                        if (dataConsultaTimestamp >= dataAgendamentoTimestamp && 
                            dataConsultaTimestamp < dataAgendamentoTimestamp + umMes) {
                            return true; // Horário ocupado pelo pacote
                        }
                    } else if (ag.tipo === 'pacote_anual') {
                        // Pacote anual: 1 ano
                        const umAno = 365 * 24 * 60 * 60 * 1000;
                        if (dataConsultaTimestamp >= dataAgendamentoTimestamp && 
                            dataConsultaTimestamp < dataAgendamentoTimestamp + umAno) {
                            return true; // Horário ocupado pelo pacote
                        }
                    }
                }
            }
            
            return false;
        };

        // Filtrar horários disponíveis
        const horariosDisponiveis = [];
        
        for (const horario of horariosFixos) {
            // Verificar se horário está ocupado neste dia específico
            const ocupadoHoje = horarioOcupado(horario);
            
            // Verificar se horário está em conflito com algum pacote
            const conflitoPacote = await verificarConflitosPacote(horario, data);
            
            if (!ocupadoHoje && !conflitoPacote) {
                horariosDisponiveis.push(horario);
            }
        }

        res.json({
            success: true,
            data: horariosDisponiveis
        });

    } catch (error) {
        console.error('Erro ao buscar horários disponíveis:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erro ao buscar horários disponíveis',
            error: error.message 
        });
    }
});

// Listar agendamentos
router.get('/', async (req, res) => {
    try {
        const { dataInicio, dataFim, status } = req.query;
        
        let filtro = {};
        
        if (dataInicio && dataFim) {
            filtro.dataHora = {
                $gte: new Date(dataInicio),
                $lte: new Date(dataFim)
            };
        }
        
        if (status) {
            filtro.status = status;
        }
        
        const agendamentos = await Agendamento.find(filtro)
            .populate('paciente')
            .sort({ dataHora: 1 });
        
        res.json({
            success: true,
            data: agendamentos
        });
    } catch (error) {
        console.error('Erro ao listar agendamentos:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erro ao listar agendamentos',
            error: error.message 
        });
    }
});

// Criar agendamento
router.post('/', async (req, res) => {
    try {
        const { pacienteId, dataHora, tipo, observacoes, parcelas } = req.body;

        // Validar paciente
        const paciente = await Paciente.findById(pacienteId);
        if (!paciente) {
            return res.status(404).json({ 
                success: false, 
                message: 'Paciente não encontrado' 
            });
        }

        // Verificar conflito de horário
        const dataAgendamento = new Date(dataHora);
        const inicioJanela = new Date(dataAgendamento);
        inicioJanela.setMinutes(inicioJanela.getMinutes() - 30);
        const fimJanela = new Date(dataAgendamento);
        fimJanela.setMinutes(fimJanela.getMinutes() + 30);

        const conflito = await Agendamento.findOne({
            dataHora: {
                $gte: inicioJanela,
                $lte: fimJanela
            },
            status: { $ne: 'cancelado' }
        });

        if (conflito) {
            return res.status(400).json({ 
                success: false, 
                message: 'Já existe um agendamento neste dia e horário' 
            });
        }

        // Calcular valor
        let valor = 150; // Sessão avulsa padrão
        if (tipo === 'pacote_mensal') {
            valor = 480;
        } else if (tipo === 'pacote_anual') {
            valor = 5760;
        }

        // Criar agendamento
        const agendamento = new Agendamento({
            paciente: pacienteId,
            dataHora,
            tipo,
            valor,
            observacoes,
            parcelas: parcelas || 1,
            status: 'pendente'
        });

        await agendamento.save();

        res.status(201).json({
            success: true,
            message: 'Agendamento criado com sucesso!',
            data: agendamento
        });

    } catch (error) {
        console.error('Erro ao criar agendamento:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erro ao criar agendamento',
            error: error.message 
        });
    }
});

// Atualizar status do agendamento
router.patch('/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const agendamento = await Agendamento.findByIdAndUpdate(
            id,
            { status },
            { new: true }
        ).populate('paciente');

        if (!agendamento) {
            return res.status(404).json({ 
                success: false, 
                message: 'Agendamento não encontrado' 
            });
        }

        res.json({
            success: true,
            data: agendamento
        });
    } catch (error) {
        console.error('Erro ao atualizar status:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erro ao atualizar status',
            error: error.message 
        });
    }
});

// Cancelar agendamento
router.post('/:id/cancelar', async (req, res) => {
    try {
        const { id } = req.params;
        const { motivo, canceladoPor } = req.body;

        const agendamento = await Agendamento.findByIdAndUpdate(
            id,
            { 
                status: 'cancelado',
                motivoCancelamento: motivo,
                canceladoPor,
                dataCancelamento: new Date()
            },
            { new: true }
        ).populate('paciente');

        if (!agendamento) {
            return res.status(404).json({ 
                success: false, 
                message: 'Agendamento não encontrado' 
            });
        }

        res.json({
            success: true,
            message: 'Agendamento cancelado com sucesso',
            data: agendamento
        });
    } catch (error) {
        console.error('Erro ao cancelar agendamento:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erro ao cancelar agendamento',
            error: error.message 
        });
    }
});

module.exports = router;