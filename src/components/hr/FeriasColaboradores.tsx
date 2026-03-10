import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Calendar, Clock, User, CheckCircle, XCircle, AlertTriangle, Eye, CreditCard as Edit, Trash2, Download, FileText, CalendarDays, CalendarCheck, CalendarX, Timer, Award, Target, Activity, TrendingUp, Users, Briefcase, Brain, Sparkles } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import MonitoramentoFeriasIA from './MonitoramentoFeriasIA';
import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isBetween from 'dayjs/plugin/isBetween';
import { exportToExcel } from '../../utils/reportGenerator';

dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);
dayjs.extend(isBetween);

interface Ferias {
  id: string;
  colaborador_id: string;
  periodo_aquisitivo_id?: string;
  data_inicio: string;
  data_fim: string;
  dias_corridos: number;
  dias_uteis: number;
  data_prevista_retorno?: string;
  status: 'previsto' | 'solicitado' | 'aprovado' | 'gozado' | 'cancelado';
  data_solicitacao?: string;
  data_aprovacao?: string;
  aprovado_por?: string;
  observacoes?: string;
  criado_em: string;
  atualizado_em: string;
  criado_por?: string;
  // Dados do colaborador
  colaborador_nome: string;
  data_admissao: string;
  funcao_nome?: string;
  status_atual: string;
  dias_vencimento: number;
}

interface FormDataFerias {
  colaborador_id: string;
  periodo_aquisitivo_id: string;
  data_inicio: string;
  data_fim: string;
  observacoes: string;
}

interface IndicadoresFerias {
  total_colaboradores: number;
  ferias_previstas: number;
  ferias_solicitadas: number;
  ferias_aprovadas: number;
  ferias_vencidas: number;
  colaboradores_sem_ferias: number;
}

const FeriasColaboradores: React.FC = () => {
  const [ferias, setFerias] = useState<Ferias[]>([]);
  const [colaboradores, setColaboradores] = useState<any[]>([]);
  const [indicadores, setIndicadores] = useState<IndicadoresFerias | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingFerias, setEditingFerias] = useState<Ferias | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [feriasParaAprovar, setFeriasParaAprovar] = useState<Ferias | null>(null);
  const [observacaoAprovacao, setObservacaoAprovacao] = useState('');
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'previsto' | 'solicitado' | 'aprovado' | 'gozado' | 'cancelado'>('all');
  const [colaboradorFilter, setColaboradorFilter] = useState('all');
  const [anoFilter, setAnoFilter] = useState(new Date().getFullYear());
  const [vencimentoFilter, setVencimentoFilter] = useState<'all' | 'vencidas' | 'vencendo'>('all');
  
  const [formData, setFormData] = useState<FormDataFerias>({
    colaborador_id: '',
    periodo_aquisitivo_id: '',
    data_inicio: '',
    data_fim: '',
    observacoes: ''
  });

  const [periodosAquisitivos, setPeriodosAquisitivos] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'ferias' | 'monitoramento'>('ferias');

  useEffect(() => {
    fetchData();
    fetchColaboradores();
    fetchIndicadores();
  }, []);

  useEffect(() => {
    fetchData();
  }, [statusFilter, colaboradorFilter, anoFilter, vencimentoFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase.from('vw_ferias_detalhadas').select('*');

      // Aplicar filtros
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (colaboradorFilter !== 'all') {
        query = query.eq('colaborador_id', colaboradorFilter);
      }

      // Filtro por ano
      query = query.gte('data_inicio', `${anoFilter}-01-01`)
               .lte('data_inicio', `${anoFilter}-12-31`);

      // Filtro por vencimento
      if (vencimentoFilter === 'vencidas') {
        query = query.lt('dias_vencimento', 0);
      } else if (vencimentoFilter === 'vencendo') {
        query = query.gte('dias_vencimento', 0).lte('dias_vencimento', 30);
      }

      const { data, error } = await query.order('data_inicio', { ascending: false });

      if (error) throw error;
      setFerias(data || []);
    } catch (err) {
      console.error('Error fetching vacations:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar férias');
    } finally {
      setLoading(false);
    }
  };

  const fetchColaboradores = async () => {
    try {
      const { data, error } = await supabase
        .from('vw_colaboradores_completo')
        .select('id, nome_completo, data_admissao, funcao_nome, status')
        .eq('status', 'ativo')
        .order('nome_completo');

      if (error) throw error;
      setColaboradores(data || []);
    } catch (err) {
      console.error('Error fetching employees:', err);
    }
  };

  const fetchPeriodosAquisitivos = async (colaboradorId: string) => {
    try {
      const { data, error } = await supabase
        .from('periodos_aquisitivos_ferias')
        .select('*')
        .eq('colaborador_id', colaboradorId)
        .in('status', ['pendente', 'parcial'])
        .order('periodo_aquisitivo_inicio', { ascending: false });

      if (error) throw error;
      setPeriodosAquisitivos(data || []);
    } catch (err) {
      console.error('Error fetching acquisition periods:', err);
      setPeriodosAquisitivos([]);
    }
  };

  const fetchIndicadores = async () => {
    try {
      const { data, error } = await supabase
        .from('vw_indicadores_rh')
        .select('*')
        .single();

      if (error) throw error;

      // Buscar dados específicos de férias
      const { data: feriasData, error: feriasError } = await supabase
        .from('ferias_colaboradores')
        .select('status, colaborador_id')
        .gte('data_inicio', `${new Date().getFullYear()}-01-01`)
        .lte('data_inicio', `${new Date().getFullYear()}-12-31`);

      if (feriasError) throw feriasError;

      const feriasStats = (feriasData || []).reduce((acc, f) => {
        acc[f.status] = (acc[f.status] || 0) + 1;
        return acc;
      }, {} as any);

      // Buscar colaboradores que precisam de férias (mais de 12 meses sem férias)
      const { data: colaboradoresSemFerias, error: semFeriasError } = await supabase
        .from('vw_alertas_rh')
        .select('*')
        .eq('tipo_alerta', 'ferias_vencidas');

      if (semFeriasError) throw semFeriasError;

      setIndicadores({
        total_colaboradores: data?.colaboradores_ativos || 0,
        ferias_previstas: feriasStats.previsto || 0,
        ferias_solicitadas: feriasStats.solicitado || 0,
        ferias_aprovadas: feriasStats.aprovado || 0,
        ferias_vencidas: (colaboradoresSemFerias || []).length,
        colaboradores_sem_ferias: (colaboradoresSemFerias || []).length
      });
    } catch (err) {
      console.error('Error fetching indicators:', err);
    }
  };

  const calcularDiasUteis = (dataInicio: string, dataFim: string) => {
    const inicio = dayjs(dataInicio);
    const fim = dayjs(dataFim);
    let diasUteis = 0;
    let current = inicio;

    while (current.isSameOrBefore(fim)) {
      // 1 = Segunda, 6 = Sábado, 0 = Domingo
      const diaSemana = current.day();
      if (diaSemana !== 0 && diaSemana !== 6) {
        diasUteis++;
      }
      current = current.add(1, 'day');
    }

    return diasUteis;
  };

  const calcularDataRetorno = (dataFim: string) => {
    let dataRetorno = dayjs(dataFim).add(1, 'day');
    
    // Se cair no fim de semana, mover para segunda-feira
    while (dataRetorno.day() === 0 || dataRetorno.day() === 6) {
      dataRetorno = dataRetorno.add(1, 'day');
    }
    
    return dataRetorno.format('YYYY-MM-DD');
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);

      // Validações
      if (!formData.colaborador_id || !formData.data_inicio || !formData.data_fim) {
        throw new Error('Preencha todos os campos obrigatórios');
      }

      const dataInicio = dayjs(formData.data_inicio);
      const dataFim = dayjs(formData.data_fim);

      if (dataFim.isSameOrBefore(dataInicio)) {
        throw new Error('Data de fim deve ser posterior à data de início');
      }

      const diasCorridos = dataFim.diff(dataInicio, 'days') + 1;
      const diasUteis = calcularDiasUteis(formData.data_inicio, formData.data_fim);
      const dataPrevistaRetorno = calcularDataRetorno(formData.data_fim);

      // Verificar se já existe férias para o colaborador no período
      const { data: feriasExistentes, error: checkError } = await supabase
        .from('ferias_colaboradores')
        .select('*')
        .eq('colaborador_id', formData.colaborador_id)
        .or(`data_inicio.lte.${formData.data_fim},data_fim.gte.${formData.data_inicio}`)
        .neq('status', 'cancelado');

      if (checkError) throw checkError;

      if (editingFerias) {
        // Excluir a própria férias da verificação
        const conflitos = (feriasExistentes || []).filter(f => f.id !== editingFerias.id);
        if (conflitos.length > 0) {
          throw new Error('Já existem férias cadastradas para este colaborador no período selecionado');
        }
      } else {
        if ((feriasExistentes || []).length > 0) {
          throw new Error('Já existem férias cadastradas para este colaborador no período selecionado');
        }
      }

      const dataToSave = {
        colaborador_id: formData.colaborador_id,
        periodo_aquisitivo_id: formData.periodo_aquisitivo_id || null,
        data_inicio: formData.data_inicio,
        data_fim: formData.data_fim,
        observacoes: formData.observacoes,
        dias_corridos: diasCorridos,
        dias_uteis: diasUteis,
        data_prevista_retorno: dataPrevistaRetorno,
        status: editingFerias?.status || 'previsto'
      };

      if (editingFerias) {
        const { error } = await supabase
          .from('ferias_colaboradores')
          .update(dataToSave)
          .eq('id', editingFerias.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('ferias_colaboradores')
          .insert([dataToSave]);

        if (error) throw error;
      }

      setShowForm(false);
      setEditingFerias(null);
      resetForm();
      fetchData();
      fetchIndicadores();
    } catch (err) {
      console.error('Error saving vacation:', err);
      setError(err instanceof Error ? err.message : 'Erro ao salvar férias');
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (feriasId: string, aprovado: boolean, observacao?: string) => {
    try {
      setLoading(true);
      setError(null);

      const updateData = {
        status: aprovado ? 'aprovado' : 'cancelado',
        data_aprovacao: aprovado ? new Date().toISOString() : null,
        observacoes: observacao || null
      };

      const { error } = await supabase
        .from('ferias_colaboradores')
        .update(updateData)
        .eq('id', feriasId);

      if (error) throw error;

      setShowApprovalModal(false);
      setFeriasParaAprovar(null);
      setObservacaoAprovacao('');
      fetchData();
      fetchIndicadores();
    } catch (err) {
      console.error('Error updating approval:', err);
      setError(err instanceof Error ? err.message : 'Erro ao atualizar aprovação');
    } finally {
      setLoading(false);
    }
  };

  const handleSolicitar = async (feriasId: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('ferias_colaboradores')
        .update({ 
          status: 'solicitado',
          data_solicitacao: new Date().toISOString()
        })
        .eq('id', feriasId);

      if (error) throw error;
      fetchData();
      fetchIndicadores();
    } catch (err) {
      console.error('Error requesting vacation:', err);
      setError(err instanceof Error ? err.message : 'Erro ao solicitar férias');
    } finally {
      setLoading(false);
    }
  };

  const handleIniciarFerias = async (feriasId: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('ferias_colaboradores')
        .update({ status: 'gozado' })
        .eq('id', feriasId);

      if (error) throw error;
      fetchData();
      fetchIndicadores();
    } catch (err) {
      console.error('Error starting vacation:', err);
      setError(err instanceof Error ? err.message : 'Erro ao iniciar férias');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este período de férias?')) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('ferias_colaboradores')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchData();
      fetchIndicadores();
    } catch (err) {
      console.error('Error deleting vacation:', err);
      setError(err instanceof Error ? err.message : 'Erro ao excluir férias');
    } finally {
      setLoading(false);
    }
  };

  const openForm = (feriaItem?: Ferias) => {
    if (feriaItem) {
      setEditingFerias(feriaItem);
      setFormData({
        colaborador_id: feriaItem.colaborador_id,
        periodo_aquisitivo_id: feriaItem.periodo_aquisitivo_id || '',
        data_inicio: feriaItem.data_inicio,
        data_fim: feriaItem.data_fim,
        observacoes: feriaItem.observacoes || ''
      });
      if (feriaItem.colaborador_id) {
        fetchPeriodosAquisitivos(feriaItem.colaborador_id);
      }
    } else {
      setEditingFerias(null);
      resetForm();
    }
    setShowForm(true);
  };

  const openApprovalModal = (feriaItem: Ferias) => {
    setFeriasParaAprovar(feriaItem);
    setShowApprovalModal(true);
  };

  const resetForm = () => {
    setFormData({
      colaborador_id: '',
      periodo_aquisitivo_id: '',
      data_inicio: '',
      data_fim: '',
      observacoes: ''
    });
  };

  const calcularFeriasAutomaticas = async () => {
    if (!confirm('Deseja calcular automaticamente as férias previstas para todos os colaboradores ativos? Isso criará registros de férias baseados na data de admissão.')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      for (const colaborador of colaboradores) {
        const dataAdmissao = dayjs(colaborador.data_admissao);
        const hoje = dayjs();
        
        // Calcular quantos períodos aquisitivos já passaram
        const anosCompletos = hoje.diff(dataAdmissao, 'years');
        
        if (anosCompletos >= 1) {
          // Verificar se já tem férias cadastradas para este ano
          const { data: feriasExistentes, error: checkError } = await supabase
            .from('ferias_colaboradores')
            .select('*')
            .eq('colaborador_id', colaborador.id)
            .gte('data_inicio', `${new Date().getFullYear()}-01-01`)
            .lte('data_inicio', `${new Date().getFullYear()}-12-31`);

          if (checkError) throw checkError;

          if ((feriasExistentes || []).length === 0) {
            // Calcular data prevista de férias (12 meses após admissão)
            const dataPrevistaInicio = dataAdmissao.add(12, 'months');
            const dataPrevistaFim = dataPrevistaInicio.add(29, 'days'); // 30 dias corridos
            const diasUteis = calcularDiasUteis(dataPrevistaInicio.format('YYYY-MM-DD'), dataPrevistaFim.format('YYYY-MM-DD'));
            const dataRetorno = calcularDataRetorno(dataPrevistaFim.format('YYYY-MM-DD'));

            const { error: insertError } = await supabase
              .from('ferias_colaboradores')
              .insert([{
                colaborador_id: colaborador.id,
                data_inicio: dataPrevistaInicio.format('YYYY-MM-DD'),
                data_fim: dataPrevistaFim.format('YYYY-MM-DD'),
                dias_corridos: 30,
                dias_uteis: diasUteis,
                data_prevista_retorno: dataRetorno,
                status: 'previsto',
                observacoes: 'Férias calculadas automaticamente baseadas na data de admissão'
              }]);

            if (insertError) throw insertError;
          }
        }
      }

      fetchData();
      fetchIndicadores();
      alert('Férias automáticas calculadas com sucesso!');
    } catch (err) {
      console.error('Error calculating automatic vacations:', err);
      setError(err instanceof Error ? err.message : 'Erro ao calcular férias automáticas');
    } finally {
      setLoading(false);
    }
  };

  const filteredFerias = ferias.filter(feria => {
    const matchesSearch = feria.colaborador_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         feria.observacoes?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'previsto':
        return 'text-blue-700 bg-blue-100 border-blue-200';
      case 'solicitado':
        return 'text-yellow-700 bg-yellow-100 border-yellow-200';
      case 'aprovado':
        return 'text-green-700 bg-green-100 border-green-200';
      case 'gozado':
        return 'text-purple-700 bg-purple-100 border-purple-200';
      case 'cancelado':
        return 'text-red-700 bg-red-100 border-red-200';
      default:
        return 'text-gray-700 bg-gray-100 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'previsto':
        return <Calendar className="w-4 h-4" />;
      case 'solicitado':
        return <Clock className="w-4 h-4" />;
      case 'aprovado':
        return <CheckCircle className="w-4 h-4" />;
      case 'gozado':
        return <Award className="w-4 h-4" />;
      case 'cancelado':
        return <XCircle className="w-4 h-4" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'previsto':
        return 'Previsto';
      case 'solicitado':
        return 'Solicitado';
      case 'aprovado':
        return 'Aprovado';
      case 'gozado':
        return 'Gozado';
      case 'cancelado':
        return 'Cancelado';
      default:
        return 'Desconhecido';
    }
  };

  const exportData = () => {
    if (filteredFerias.length === 0) {
      alert('Não há dados para exportar');
      return;
    }

    const headers = [
      'Colaborador',
      'Função',
      'Data Início',
      'Data Fim',
      'Dias Corridos',
      'Dias Úteis',
      'Data Retorno',
      'Status',
      'Data Solicitação',
      'Data Aprovação',
      'Observações'
    ];

    const data = filteredFerias.map(feria => [
      feria.colaborador_nome,
      feria.funcao_nome || '',
      dayjs(feria.data_inicio).format('DD/MM/YYYY'),
      dayjs(feria.data_fim).format('DD/MM/YYYY'),
      feria.dias_corridos,
      feria.dias_uteis,
      feria.data_prevista_retorno ? dayjs(feria.data_prevista_retorno).format('DD/MM/YYYY') : '',
      getStatusText(feria.status),
      feria.data_solicitacao ? dayjs(feria.data_solicitacao).format('DD/MM/YYYY') : '',
      feria.data_aprovacao ? dayjs(feria.data_aprovacao).format('DD/MM/YYYY') : '',
      feria.observacoes || ''
    ]);

    const fileName = `ferias-colaboradores-${dayjs().format('YYYY-MM-DD')}`;
    exportToExcel(data, fileName, headers);
  };

  return (
    <div className="space-y-6">
      {/* Botões de Alternância */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setViewMode('ferias')}
            className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
              viewMode === 'ferias'
                ? 'bg-[#7D1F2C] text-white shadow'
                : 'text-gray-700 hover:bg-white'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Controle de Férias
          </button>
          <button
            onClick={() => setViewMode('monitoramento')}
            className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
              viewMode === 'monitoramento'
                ? 'bg-[#7D1F2C] text-white shadow'
                : 'text-gray-700 hover:bg-white'
            }`}
          >
            <Brain className="w-4 h-4" />
            Monitoramento IA
          </button>
        </div>
      </div>

      {viewMode === 'monitoramento' ? (
        <MonitoramentoFeriasIA />
      ) : (
        <>
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Gestão de Férias</h3>
            <div className="flex gap-2">
              <button
                onClick={calcularFeriasAutomaticas}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Target className="w-4 h-4 inline mr-2" />
                Calcular Automático
              </button>
              <button
                onClick={exportData}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                <Download className="w-4 h-4 inline mr-2" />
                Exportar Excel
              </button>
              <button
                onClick={() => openForm()}
                className="px-4 py-2 bg-[#7D1F2C] text-white rounded-lg hover:bg-[#6a1a25]"
              >
                <Plus className="w-4 h-4 inline mr-2" />
                Cadastrar Férias
              </button>
            </div>
          </div>

      {error && (
        <div className="p-4 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* Indicadores */}
      {indicadores && (
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-500">Colaboradores</p>
                <p className="text-2xl font-bold text-blue-600">
                  {indicadores.total_colaboradores}
                </p>
                <p className="text-sm text-gray-600">Ativos</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <Calendar className="w-8 h-8 text-purple-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-500">Previstas</p>
                <p className="text-2xl font-bold text-purple-600">
                  {indicadores.ferias_previstas}
                </p>
                <p className="text-sm text-gray-600">Este ano</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <Clock className="w-8 h-8 text-yellow-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-500">Solicitadas</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {indicadores.ferias_solicitadas}
                </p>
                <p className="text-sm text-gray-600">Aguardando</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <CheckCircle className="w-8 h-8 text-green-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-500">Aprovadas</p>
                <p className="text-2xl font-bold text-green-600">
                  {indicadores.ferias_aprovadas}
                </p>
                <p className="text-sm text-gray-600">Liberadas</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <Award className="w-8 h-8 text-indigo-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-500">Em Gozo</p>
                <p className="text-2xl font-bold text-indigo-600">
                  {ferias.filter(f => f.status === 'gozado' && dayjs().isBetween(dayjs(f.data_inicio), dayjs(f.data_fim), 'day', '[]')).length}
                </p>
                <p className="text-sm text-gray-600">Atualmente</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <AlertTriangle className="w-8 h-8 text-red-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-500">Vencidas</p>
                <p className="text-2xl font-bold text-red-600">
                  {indicadores.ferias_vencidas}
                </p>
                <p className="text-sm text-gray-600">Precisam tirar</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar colaborador..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7D1F2C] focus:border-[#7D1F2C]"
              />
            </div>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#7D1F2C] focus:border-[#7D1F2C]"
            >
              <option value="all">Todos os Status</option>
              <option value="previsto">Previsto</option>
              <option value="solicitado">Solicitado</option>
              <option value="aprovado">Aprovado</option>
              <option value="gozado">Gozado</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>

          <div>
            <select
              value={colaboradorFilter}
              onChange={(e) => setColaboradorFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#7D1F2C] focus:border-[#7D1F2C]"
            >
              <option value="all">Todos os Colaboradores</option>
              {colaboradores.map((colaborador) => (
                <option key={colaborador.id} value={colaborador.id}>
                  {colaborador.nome_completo}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={anoFilter}
              onChange={(e) => setAnoFilter(parseInt(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#7D1F2C] focus:border-[#7D1F2C]"
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={vencimentoFilter}
              onChange={(e) => setVencimentoFilter(e.target.value as any)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#7D1F2C] focus:border-[#7D1F2C]"
            >
              <option value="all">Todos os Vencimentos</option>
              <option value="vencidas">Vencidas</option>
              <option value="vencendo">Vencendo (30 dias)</option>
            </select>
          </div>

          <div>
            <button
              onClick={fetchData}
              className="w-full px-4 py-2 bg-[#7D1F2C] text-white rounded-md hover:bg-[#6a1a25]"
            >
              <Filter className="w-4 h-4 inline mr-2" />
              Filtrar
            </button>
          </div>
        </div>
      </div>

      {/* Lista de Férias */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#7D1F2C]"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left bg-gray-50 border-b">
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Colaborador
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Período
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duração
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data Retorno
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Datas Importantes
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredFerias.map((feria) => (
                  <tr key={feria.id} className={`hover:bg-gray-50 ${
                    feria.dias_vencimento < 0 ? 'bg-red-50 border-l-4 border-red-500' : 
                    feria.dias_vencimento <= 30 ? 'bg-yellow-50 border-l-4 border-yellow-500' : ''
                  }`}>
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{feria.colaborador_nome}</div>
                        <div className="text-sm text-gray-500">{feria.funcao_nome}</div>
                        <div className="text-sm text-gray-500">
                          Admissão: {dayjs(feria.data_admissao).format('DD/MM/YYYY')}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {dayjs(feria.data_inicio).format('DD/MM/YYYY')}
                        </div>
                        <div className="text-sm text-gray-500">até</div>
                        <div className="text-sm font-medium text-gray-900">
                          {dayjs(feria.data_fim).format('DD/MM/YYYY')}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {feria.dias_corridos} dias corridos
                        </div>
                        <div className="text-sm text-gray-500">
                          {feria.dias_uteis} dias úteis
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {feria.data_prevista_retorno ? dayjs(feria.data_prevista_retorno).format('DD/MM/YYYY') : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(feria.status)}`}>
                        {getStatusIcon(feria.status)}
                        <span className="ml-1">{getStatusText(feria.status)}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        {feria.data_solicitacao && (
                          <div className="text-gray-600">
                            <Clock className="w-3 h-3 inline mr-1" />
                            Solicitado: {dayjs(feria.data_solicitacao).format('DD/MM/YYYY')}
                          </div>
                        )}
                        {feria.data_aprovacao && (
                          <div className="text-green-600">
                            <CheckCircle className="w-3 h-3 inline mr-1" />
                            Aprovado: {dayjs(feria.data_aprovacao).format('DD/MM/YYYY')}
                          </div>
                        )}
                        {feria.dias_vencimento < 0 && (
                          <div className="text-red-600">
                            <AlertTriangle className="w-3 h-3 inline mr-1" />
                            Vencida há {Math.abs(feria.dias_vencimento)} dias
                          </div>
                        )}
                        {feria.dias_vencimento >= 0 && feria.dias_vencimento <= 30 && (
                          <div className="text-yellow-600">
                            <Timer className="w-3 h-3 inline mr-1" />
                            Vence em {feria.dias_vencimento} dias
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-2">
                        {feria.status === 'previsto' && (
                          <button
                            onClick={() => handleSolicitar(feria.id)}
                            className="text-blue-600 hover:text-blue-800"
                            title="Solicitar"
                          >
                            <CalendarCheck className="w-4 h-4" />
                          </button>
                        )}
                        {feria.status === 'solicitado' && (
                          <button
                            onClick={() => openApprovalModal(feria)}
                            className="text-green-600 hover:text-green-800"
                            title="Aprovar/Rejeitar"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        {feria.status === 'aprovado' && dayjs().isSameOrAfter(dayjs(feria.data_inicio)) && (
                          <button
                            onClick={() => handleIniciarFerias(feria.id)}
                            className="text-purple-600 hover:text-purple-800"
                            title="Iniciar Férias"
                          >
                            <Award className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => openForm(feria)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(feria.id)}
                          className="text-red-600 hover:text-red-800"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredFerias.length === 0 && (
            <div className="text-center py-12">
              <CalendarDays className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma férias encontrada</h3>
              <p className="text-gray-500">
                {searchTerm || statusFilter !== 'all' || colaboradorFilter !== 'all'
                  ? 'Nenhuma férias corresponde aos filtros aplicados.'
                  : 'Nenhuma férias cadastrada para este ano.'}
              </p>
              <button
                onClick={calcularFeriasAutomaticas}
                className="mt-4 px-4 py-2 bg-[#7D1F2C] text-white rounded-lg hover:bg-[#6a1a25]"
              >
                Calcular Férias Automáticas
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal do Formulário */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {editingFerias ? 'Editar Férias' : 'Cadastrar Férias'}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Colaborador *
                </label>
                <select
                  value={formData.colaborador_id}
                  onChange={(e) => {
                    const newColaboradorId = e.target.value;
                    setFormData({ ...formData, colaborador_id: newColaboradorId, periodo_aquisitivo_id: '' });
                    if (newColaboradorId) {
                      fetchPeriodosAquisitivos(newColaboradorId);
                    } else {
                      setPeriodosAquisitivos([]);
                    }
                  }}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  required
                >
                  <option value="">Selecione um colaborador...</option>
                  {colaboradores.map((colaborador) => (
                    <option key={colaborador.id} value={colaborador.id}>
                      {colaborador.nome_completo} - {colaborador.funcao_nome}
                    </option>
                  ))}
                </select>
              </div>

              {formData.colaborador_id && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Período Aquisitivo *
                  </label>
                  <select
                    value={formData.periodo_aquisitivo_id}
                    onChange={(e) => setFormData({ ...formData, periodo_aquisitivo_id: e.target.value })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                    required
                  >
                    <option value="">Selecione o período aquisitivo...</option>
                    {periodosAquisitivos.map((periodo) => (
                      <option key={periodo.id} value={periodo.id}>
                        {dayjs(periodo.periodo_aquisitivo_inicio).format('DD/MM/YYYY')} até {dayjs(periodo.periodo_aquisitivo_fim).format('DD/MM/YYYY')}
                        ({periodo.dias_restantes} dias restantes)
                        {periodo.status === 'vencido' && ' - VENCIDO'}
                      </option>
                    ))}
                  </select>
                  {periodosAquisitivos.length === 0 && (
                    <p className="mt-2 text-sm text-amber-600">
                      Nenhum período aquisitivo disponível para este colaborador.
                      Aguarde o cálculo automático ou entre em contato com RH.
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data de Início *
                </label>
                <input
                  type="date"
                  value={formData.data_inicio}
                  onChange={(e) => setFormData({ ...formData, data_inicio: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data de Fim *
                </label>
                <input
                  type="date"
                  value={formData.data_fim}
                  onChange={(e) => setFormData({ ...formData, data_fim: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  required
                />
              </div>

              {/* Cálculo automático de dias */}
              {formData.data_inicio && formData.data_fim && (
                <div className="md:col-span-2 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-900 mb-2">Cálculo Automático</h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-blue-700 font-medium">Dias Corridos:</span>
                      <div className="text-lg font-bold text-blue-900">
                        {dayjs(formData.data_fim).diff(dayjs(formData.data_inicio), 'days') + 1}
                      </div>
                    </div>
                    <div>
                      <span className="text-blue-700 font-medium">Dias Úteis:</span>
                      <div className="text-lg font-bold text-blue-900">
                        {calcularDiasUteis(formData.data_inicio, formData.data_fim)}
                      </div>
                    </div>
                    <div>
                      <span className="text-blue-700 font-medium">Data Retorno:</span>
                      <div className="text-lg font-bold text-blue-900">
                        {dayjs(calcularDataRetorno(formData.data_fim)).format('DD/MM/YYYY')}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observações
                </label>
                <textarea
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  rows={3}
                  placeholder="Observações sobre as férias..."
                />
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={loading || !formData.colaborador_id || !formData.data_inicio || !formData.data_fim}
                className="px-4 py-2 bg-[#7D1F2C] text-white rounded-md hover:bg-[#6a1a25] disabled:opacity-50"
              >
                {loading ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Aprovação */}
      {showApprovalModal && feriasParaAprovar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Aprovar/Rejeitar Férias
            </h3>
            
            <div className="mb-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900">{feriasParaAprovar.colaborador_nome}</h4>
                <p className="text-sm text-gray-600">{feriasParaAprovar.funcao_nome}</p>
                <div className="mt-2 text-sm">
                  <div><strong>Período:</strong> {dayjs(feriasParaAprovar.data_inicio).format('DD/MM/YYYY')} a {dayjs(feriasParaAprovar.data_fim).format('DD/MM/YYYY')}</div>
                  <div><strong>Duração:</strong> {feriasParaAprovar.dias_corridos} dias corridos ({feriasParaAprovar.dias_uteis} úteis)</div>
                  <div><strong>Retorno:</strong> {feriasParaAprovar.data_prevista_retorno ? dayjs(feriasParaAprovar.data_prevista_retorno).format('DD/MM/YYYY') : '-'}</div>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observações da Aprovação/Rejeição
              </label>
              <textarea
                value={observacaoAprovacao}
                onChange={(e) => setObservacaoAprovacao(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                rows={3}
                placeholder="Digite observações sobre a decisão..."
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowApprovalModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleApproval(feriasParaAprovar.id, false, observacaoAprovacao)}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? 'Processando...' : 'Rejeitar'}
              </button>
              <button
                onClick={() => handleApproval(feriasParaAprovar.id, true, observacaoAprovacao)}
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Processando...' : 'Aprovar'}
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
};

export default FeriasColaboradores;