import React, { useState, useEffect } from 'react';
import { Tab } from '@headlessui/react';
import { Plus, Search, Filter, Calendar, Clock, User, Settings, CheckCircle, XCircle, AlertTriangle, MessageSquare, CreditCard as Edit, Trash2, Download, FileText, Package, Wrench, ShoppingCart, Building, Zap, Target, Activity, TrendingUp, Users, DollarSign, Eye, Upload, Star, BarChart3, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { testConnection } from '../lib/supabase';
import dayjs from 'dayjs';
import { ReportGenerator } from '../utils/reportGenerator';
import SolicitacaoForm from '../components/solicitacoes/SolicitacaoForm';
import SolicitacaoDetalhes from '../components/solicitacoes/SolicitacaoDetalhes';
import AprovacoesSolicitacoes from '../components/solicitacoes/AprovacoesSolicitacoes';
import RelatoriosSolicitacoes from '../components/solicitacoes/RelatoriosSolicitacoes';
import SolicitacoesPublicas from '../components/solicitacoes/SolicitacoesPublicas';
import { ChatSolicitacaoIA } from '../components/solicitacoes/ChatSolicitacaoIA';

interface Solicitacao {
  id: string;
  numero_solicitacao: string;
  tipo_solicitacao_id: string;
  tipo_nome: string;
  tipo_categoria: string;
  titulo: string;
  descricao: string;
  prioridade: 'baixa' | 'normal' | 'alta' | 'urgente' | 'critica';
  status: 'rascunho' | 'enviado' | 'em_analise' | 'aprovado' | 'em_execucao' | 'aguardando_orcamento' | 'orcamento_aprovado' | 'concluido' | 'rejeitado' | 'cancelado';
  solicitante_nome: string;
  solicitante_email?: string;
  setor_solicitante: string;
  local_servico?: string;
  equipamento_afetado?: string;
  data_solicitacao: string;
  data_limite?: string;
  valor_estimado: number;
  valor_aprovado: number;
  valor_total_orcado: number;
  fornecedor_responsavel?: string;
  responsavel_execucao?: string;
  total_anexos: number;
  total_comentarios: number;
  criado_em: string;
}

interface IndicadoresSolicitacoes {
  total_solicitacoes: number;
  solicitacoes_enviadas: number;
  solicitacoes_em_analise: number;
  solicitacoes_aprovadas: number;
  solicitacoes_em_execucao: number;
  solicitacoes_concluidas: number;
  solicitacoes_urgentes: number;
  solicitacoes_atrasadas: number;
  valor_total_orcado: number;
  valor_total_gasto: number;
  setores_ativos: number;
  tempo_medio_execucao: number;
}

const Solicitacoes: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const [indicadores, setIndicadores] = useState<IndicadoresSolicitacoes | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showDetalhes, setShowDetalhes] = useState(false);
  const [showChatIA, setShowChatIA] = useState(false);
  const [editingSolicitacao, setEditingSolicitacao] = useState<Solicitacao | null>(null);
  const [solicitacaoSelecionada, setSolicitacaoSelecionada] = useState<Solicitacao | null>(null);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [prioridadeFilter, setPrioridadeFilter] = useState('all');
  const [tipoFilter, setTipoFilter] = useState('all');
  const [setorFilter, setSetorFilter] = useState('all');
  const [dataInicial, setDataInicial] = useState('');
  const [dataFinal, setDataFinal] = useState('');

  const tabTitles = [
    'Em Aberto',
    'Em Andamento',
    'Resolvidas',
    'Solicitações Públicas',
    'Aguardando Aprovação',
    'Relatórios'
  ];

  const tabIcons = [
    AlertTriangle,
    Activity,
    CheckCircle,
    Package,
    Clock,
    BarChart3
  ];

  useEffect(() => {
    fetchData();
    fetchIndicadores();
  }, [selectedTab]);

  useEffect(() => {
    fetchData();
  }, [statusFilter, prioridadeFilter, tipoFilter, setorFilter, dataInicial, dataFinal]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const connectionOk = await testConnection();
      if (!connectionOk) {
        console.warn('Supabase connection failed, using empty data');
        setSolicitacoes([]);
        setLoading(false);
        return;
      }

      // First, fetch tipos_solicitacao for reference
      const { data: tiposData, error: tiposError } = await supabase
        .from('tipos_solicitacao')
        .select('id, nome, tipo_categoria');

      if (tiposError) throw tiposError;

      // Create a map for quick lookup
      const tiposMap = new Map(tiposData?.map(tipo => [tipo.id, tipo]) || []);

      // Now fetch solicitacoes
      let query = supabase
        .from('solicitacoes')
        .select('*');

      // Aplicar filtros
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (prioridadeFilter !== 'all') {
        query = query.eq('prioridade', prioridadeFilter);
      }

      if (tipoFilter !== 'all') {
        // Filter by tipo_solicitacao_id based on tipo_categoria
        const tipoIds = tiposData?.filter(tipo => tipo.tipo_categoria === tipoFilter).map(tipo => tipo.id) || [];
        if (tipoIds.length > 0) {
          query = query.in('tipo_solicitacao_id', tipoIds);
        }
      }

      if (setorFilter !== 'all') {
        query = query.eq('setor_solicitante', setorFilter);
      }

      if (dataInicial) {
        query = query.gte('data_solicitacao', dataInicial);
      }

      if (dataFinal) {
        query = query.lte('data_solicitacao', dataFinal);
      }

      // Filtros específicos por aba
      if (selectedTab === 0) {
        // Em Aberto - solicitações enviadas, em análise ou rejeitadas
        query = query.in('status', ['rascunho', 'enviado', 'em_analise', 'rejeitado']);
      } else if (selectedTab === 1) {
        // Em Andamento - aprovadas, em execução ou aguardando orçamento
        query = query.in('status', ['aprovado', 'em_execucao', 'aguardando_orcamento', 'orcamento_aprovado']);
      } else if (selectedTab === 2) {
        // Resolvidas - concluídas ou canceladas
        query = query.in('status', ['concluido', 'cancelado']);
      } else if (selectedTab === 4) {
        // Aguardando aprovação
        query = query.in('status', ['enviado', 'em_analise']);
      }

      const { data, error } = await query.order('data_solicitacao', { ascending: false });

      if (error) throw error;
      
      // Transform data to match expected interface
      const transformedData = (data || []).map((item: any) => ({
        ...item,
        tipo_nome: tiposMap.get(item.tipo_solicitacao_id)?.nome || '',
        tipo_categoria: tiposMap.get(item.tipo_solicitacao_id)?.tipo_categoria || '',
        total_anexos: 0, // Will be calculated separately when needed
        total_comentarios: 0 // Will be calculated separately when needed
      }));
      
      setSolicitacoes(transformedData);
    } catch (err) {
      console.error('Error fetching requests:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar solicitações');
    } finally {
      setLoading(false);
    }
  };

  const fetchIndicadores = async () => {
    try {
      const connectionOk = await testConnection();
      if (!connectionOk) {
        setIndicadores(null);
        return;
      }

      // Calculate indicators directly from solicitacoes table since view doesn't exist
      const { data: solicitacoesData, error } = await supabase
        .from('solicitacoes')
        .select('*');

      if (error) throw error;
      
      // Calculate basic indicators
      const total = solicitacoesData?.length || 0;
      const enviadas = solicitacoesData?.filter(s => s.status === 'enviado').length || 0;
      const emAnalise = solicitacoesData?.filter(s => s.status === 'em_analise').length || 0;
      const aprovadas = solicitacoesData?.filter(s => s.status === 'aprovado').length || 0;
      const emExecucao = solicitacoesData?.filter(s => s.status === 'em_execucao').length || 0;
      const concluidas = solicitacoesData?.filter(s => s.status === 'concluido').length || 0;
      const urgentes = solicitacoesData?.filter(s => s.prioridade === 'urgente' || s.prioridade === 'critica').length || 0;
      const valorTotal = solicitacoesData?.reduce((sum, s) => sum + (s.valor_estimado || 0), 0) || 0;
      
      setIndicadores({
        total_solicitacoes: total,
        solicitacoes_enviadas: enviadas,
        solicitacoes_em_analise: emAnalise,
        solicitacoes_aprovadas: aprovadas,
        solicitacoes_em_execucao: emExecucao,
        solicitacoes_concluidas: concluidas,
        solicitacoes_urgentes: urgentes,
        solicitacoes_atrasadas: 0, // Would need date calculation
        valor_total_orcado: valorTotal,
        valor_total_gasto: 0, // Would need calculation
        setores_ativos: 0, // Would need calculation
        tempo_medio_execucao: 0 // Would need calculation
      });
    } catch (err) {
      console.error('Error fetching indicators:', err);
      setIndicadores(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta solicitação?')) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('solicitacoes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchData();
      fetchIndicadores();
    } catch (err) {
      console.error('Error deleting request:', err);
      setError(err instanceof Error ? err.message : 'Erro ao excluir solicitação');
    } finally {
      setLoading(false);
    }
  };

  const handleMarcarComoResolvida = async (id: string) => {
    if (!confirm('Marcar esta solicitação como resolvida?')) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('solicitacoes')
        .update({ status: 'concluido' })
        .eq('id', id);

      if (error) throw error;
      fetchData();
      fetchIndicadores();
      alert('Solicitação marcada como resolvida com sucesso!');
    } catch (err) {
      console.error('Error updating request status:', err);
      setError(err instanceof Error ? err.message : 'Erro ao atualizar status da solicitação');
    } finally {
      setLoading(false);
    }
  };

  const openForm = (solicitacao?: Solicitacao) => {
    if (solicitacao) {
      setEditingSolicitacao(solicitacao);
    } else {
      setEditingSolicitacao(null);
    }
    setShowForm(true);
  };

  const openDetalhes = (solicitacao: Solicitacao) => {
    setSolicitacaoSelecionada(solicitacao);
    setShowDetalhes(true);
  };

  const imprimirSolicitacao = (solicitacao: Solicitacao) => {
    try {
      const reportGenerator = new ReportGenerator({
        title: 'Solicitação de Serviço/Material',
        subtitle: `${solicitacao.numero_solicitacao} - ${solicitacao.titulo}`,
        filename: `${solicitacao.numero_solicitacao.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`,
        orientation: 'portrait'
      });

      let currentY = reportGenerator.addHeader(
        'SOLICITAÇÃO DE SERVIÇO/MATERIAL',
        `${solicitacao.numero_solicitacao} - ${solicitacao.titulo}`
      );

      // Informações básicas da solicitação
      const informacoesBasicas = [
        ['Número da Solicitação', solicitacao.numero_solicitacao],
        ['Título', solicitacao.titulo],
        ['Tipo', solicitacao.tipo_nome || 'Não definido'],
        ['Categoria', solicitacao.tipo_categoria || 'Não definido'],
        ['Prioridade', getPrioridadeText(solicitacao.prioridade).toUpperCase()],
        ['Status', getStatusText(solicitacao.status)],
        ['Data da Solicitação', dayjs(solicitacao.data_solicitacao).format('DD/MM/YYYY HH:mm')],
        ['Data Limite', solicitacao.data_limite ? dayjs(solicitacao.data_limite).format('DD/MM/YYYY') : 'Não definida']
      ];

      currentY = reportGenerator.addSection('INFORMAÇÕES DA SOLICITAÇÃO', [], currentY);
      currentY = reportGenerator.addTable(['Campo', 'Valor'], informacoesBasicas, currentY);

      // Dados do solicitante
      const dadosSolicitante = [
        ['Nome', solicitacao.solicitante_nome],
        ['Setor', solicitacao.setor_solicitante],
        ['Email', solicitacao.solicitante_email || 'Não informado'],
        ['Local do Serviço', solicitacao.local_servico || 'Não informado'],
        ['Equipamento Afetado', solicitacao.equipamento_afetado || 'Não informado']
      ];

      currentY = reportGenerator.addSection('DADOS DO SOLICITANTE', [], currentY + 10);
      currentY = reportGenerator.addTable(['Campo', 'Valor'], dadosSolicitante, currentY);

      // Descrição detalhada
      currentY = reportGenerator.addSection('DESCRIÇÃO DETALHADA', [], currentY + 10);
      reportGenerator.addText(solicitacao.descricao, 25, currentY);
      currentY += 20;

      // Detalhes técnicos (se houver)
      if (solicitacao.detalhes_tecnicos) {
        currentY = reportGenerator.addSection('DETALHES TÉCNICOS', [], currentY + 5);
        reportGenerator.addText(solicitacao.detalhes_tecnicos, 25, currentY);
        currentY += 20;
      }

      // Informações financeiras
      if (solicitacao.valor_estimado > 0 || solicitacao.valor_total_orcado > 0 || solicitacao.valor_aprovado > 0) {
        const informacoesFinanceiras = [];
        
        if (solicitacao.valor_estimado > 0) {
          informacoesFinanceiras.push(['Valor Estimado', formatCurrency(solicitacao.valor_estimado)]);
        }
        if (solicitacao.valor_total_orcado > 0) {
          informacoesFinanceiras.push(['Valor Orçado', formatCurrency(solicitacao.valor_total_orcado)]);
        }
        if (solicitacao.valor_aprovado > 0) {
          informacoesFinanceiras.push(['Valor Aprovado', formatCurrency(solicitacao.valor_aprovado)]);
        }

        currentY = reportGenerator.addSection('INFORMAÇÕES FINANCEIRAS', [], currentY + 5);
        currentY = reportGenerator.addTable(['Descrição', 'Valor'], informacoesFinanceiras, currentY);
      }

      // Informações do fornecedor (se houver)
      if (solicitacao.fornecedor_responsavel) {
        const informacoesFornecedor = [
          ['Fornecedor Responsável', solicitacao.fornecedor_responsavel],
          ['Contato do Fornecedor', solicitacao.contato_fornecedor || 'Não informado'],
          ['Responsável pela Execução', solicitacao.responsavel_execucao || 'Não definido']
        ];

        currentY = reportGenerator.addSection('INFORMAÇÕES DO FORNECEDOR', [], currentY + 10);
        currentY = reportGenerator.addTable(['Campo', 'Valor'], informacoesFornecedor, currentY);
      }

      // Orientações para execução
      const orientacoes = [
        '• Esta solicitação deve ser executada conforme especificações técnicas descritas',
        '• Qualquer dúvida deve ser esclarecida com o solicitante antes da execução',
        '• Manter comprovantes e notas fiscais para prestação de contas',
        '• Comunicar imediatamente qualquer problema ou impedimento',
        '• Após conclusão, informar o status no sistema para atualização'
      ];

      currentY = reportGenerator.addSection('ORIENTAÇÕES PARA EXECUÇÃO', orientacoes, currentY + 10);

      // Área para assinatura
      reportGenerator.addText('___________________________________________', 25, currentY + 30);
      reportGenerator.addText('Assinatura do Responsável pela Execução', 25, currentY + 35);
      reportGenerator.addText(`Data: ___/___/______     Hora: ___:___`, 25, currentY + 45);

      reportGenerator.save(`${solicitacao.numero_solicitacao.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF da solicitação. Tente novamente.');
    }
  };
  const filteredSolicitacoes = solicitacoes.filter(solicitacao => {
    const matchesSearch = solicitacao.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         solicitacao.numero_solicitacao.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         solicitacao.solicitante_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         solicitacao.descricao.toLowerCase().includes(searchTerm.toLowerCase());
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
      case 'rascunho':
        return 'text-gray-700 bg-gray-100';
      case 'enviado':
        return 'text-blue-700 bg-blue-100';
      case 'em_analise':
        return 'text-yellow-700 bg-yellow-100';
      case 'aprovado':
        return 'text-green-700 bg-green-100';
      case 'em_execucao':
        return 'text-purple-700 bg-purple-100';
      case 'aguardando_orcamento':
        return 'text-orange-700 bg-orange-100';
      case 'orcamento_aprovado':
        return 'text-indigo-700 bg-indigo-100';
      case 'concluido':
        return 'text-green-700 bg-green-100';
      case 'rejeitado':
        return 'text-red-700 bg-red-100';
      case 'cancelado':
        return 'text-gray-700 bg-gray-100';
      default:
        return 'text-gray-700 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'rascunho':
        return <FileText className="w-4 h-4" />;
      case 'enviado':
        return <Upload className="w-4 h-4" />;
      case 'em_analise':
        return <Search className="w-4 h-4" />;
      case 'aprovado':
        return <CheckCircle className="w-4 h-4" />;
      case 'em_execucao':
        return <Settings className="w-4 h-4" />;
      case 'aguardando_orcamento':
        return <DollarSign className="w-4 h-4" />;
      case 'orcamento_aprovado':
        return <Star className="w-4 h-4" />;
      case 'concluido':
        return <CheckCircle className="w-4 h-4" />;
      case 'rejeitado':
        return <XCircle className="w-4 h-4" />;
      case 'cancelado':
        return <XCircle className="w-4 h-4" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'rascunho':
        return 'Rascunho';
      case 'enviado':
        return 'Enviado';
      case 'em_analise':
        return 'Em Análise';
      case 'aprovado':
        return 'Aprovado';
      case 'em_execucao':
        return 'Em Execução';
      case 'aguardando_orcamento':
        return 'Aguardando Orçamento';
      case 'orcamento_aprovado':
        return 'Orçamento Aprovado';
      case 'concluido':
        return 'Concluído';
      case 'rejeitado':
        return 'Rejeitado';
      case 'cancelado':
        return 'Cancelado';
      default:
        return status;
    }
  };

  const getPrioridadeColor = (prioridade: string) => {
    switch (prioridade) {
      case 'baixa':
        return 'text-green-700 bg-green-100';
      case 'normal':
        return 'text-blue-700 bg-blue-100';
      case 'alta':
        return 'text-orange-700 bg-orange-100';
      case 'urgente':
        return 'text-red-700 bg-red-100';
      case 'critica':
        return 'text-red-900 bg-red-200 border border-red-300';
      default:
        return 'text-gray-700 bg-gray-100';
    }
  };

  const getPrioridadeText = (prioridade: string) => {
    switch (prioridade) {
      case 'baixa':
        return 'Baixa';
      case 'normal':
        return 'Normal';
      case 'alta':
        return 'Alta';
      case 'urgente':
        return 'Urgente';
      case 'critica':
        return 'Crítica';
      default:
        return prioridade;
    }
  };

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'manutencao_preventiva':
      case 'manutencao_corretiva':
        return <Wrench className="w-5 h-5" />;
      case 'aquisicao_equipamento':
      case 'aquisicao_material':
        return <ShoppingCart className="w-5 h-5" />;
      case 'aquisicao_servico':
        return <Users className="w-5 h-5" />;
      case 'reforma':
      case 'instalacao':
        return <Building className="w-5 h-5" />;
      default:
        return <Settings className="w-5 h-5" />;
    }
  };

  const renderTabContent = () => {
    if (selectedTab === 5) {
      return <RelatoriosSolicitacoes />;
    }

    return (
      <div className="space-y-6">
        {/* Filtros */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Buscar solicitações..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7D1F2C] focus:border-[#7D1F2C]"
                />
              </div>
            </div>

            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#7D1F2C] focus:border-[#7D1F2C]"
              >
                <option value="all">Todos os Status</option>
                <option value="rascunho">Rascunho</option>
                <option value="enviado">Enviado</option>
                <option value="em_analise">Em Análise</option>
                <option value="aprovado">Aprovado</option>
                <option value="em_execucao">Em Execução</option>
                <option value="concluido">Concluído</option>
                <option value="rejeitado">Rejeitado</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>

            <div>
              <select
                value={prioridadeFilter}
                onChange={(e) => setPrioridadeFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#7D1F2C] focus:border-[#7D1F2C]"
              >
                <option value="all">Todas as Prioridades</option>
                <option value="baixa">Baixa</option>
                <option value="normal">Normal</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
                <option value="critica">Crítica</option>
              </select>
            </div>

            <div>
              <select
                value={tipoFilter}
                onChange={(e) => setTipoFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#7D1F2C] focus:border-[#7D1F2C]"
              >
                <option value="all">Todos os Tipos</option>
                <option value="manutencao_preventiva">Manutenção Preventiva</option>
                <option value="manutencao_corretiva">Manutenção Corretiva</option>
                <option value="aquisicao_equipamento">Aquisição Equipamento</option>
                <option value="aquisicao_material">Aquisição Material</option>
                <option value="aquisicao_servico">Contratação Serviço</option>
                <option value="reforma">Reforma</option>
                <option value="instalacao">Instalação</option>
                <option value="outros">Outros</option>
              </select>
            </div>

            <div>
              <input
                type="date"
                value={dataInicial}
                onChange={(e) => setDataInicial(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#7D1F2C] focus:border-[#7D1F2C]"
                placeholder="Data inicial"
              />
            </div>

            <div>
              <input
                type="date"
                value={dataFinal}
                onChange={(e) => setDataFinal(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#7D1F2C] focus:border-[#7D1F2C]"
                placeholder="Data final"
              />
            </div>
          </div>
        </div>

        {/* Lista de Solicitações */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#7D1F2C]"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredSolicitacoes.map((solicitacao) => (
              <div key={solicitacao.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center space-x-4">
                    <div className={`p-3 rounded-lg ${getStatusColor(solicitacao.status).replace('text-', 'text-').replace('bg-', 'bg-')}`}>
                      {getTipoIcon(solicitacao.tipo_categoria)}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-bold text-lg text-gray-900">
                          {solicitacao.numero_solicitacao}
                        </span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(solicitacao.status)}`}>
                          {getStatusIcon(solicitacao.status)}
                          <span className="ml-1">{getStatusText(solicitacao.status)}</span>
                        </span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPrioridadeColor(solicitacao.prioridade)}`}>
                          {getPrioridadeText(solicitacao.prioridade)}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">{solicitacao.titulo}</h3>
                      <div className="flex items-center text-sm text-gray-600 space-x-4 mt-1">
                        <div className="flex items-center">
                          <User className="w-4 h-4 mr-1" />
                          {solicitacao.solicitante_nome}
                        </div>
                        <div className="flex items-center">
                          <Building className="w-4 h-4 mr-1" />
                          {solicitacao.setor_solicitante}
                        </div>
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          {dayjs(solicitacao.data_solicitacao).format('DD/MM/YYYY')}
                        </div>
                        {solicitacao.data_limite && (
                          <div className={`flex items-center ${
                            dayjs(solicitacao.data_limite).isBefore(dayjs()) ? 'text-red-600' : ''
                          }`}>
                            <Clock className="w-4 h-4 mr-1" />
                            Prazo: {dayjs(solicitacao.data_limite).format('DD/MM/YYYY')}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => openDetalhes(solicitacao)}
                      className="text-blue-600 hover:text-blue-800"
                      title="Ver Detalhes"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => imprimirSolicitacao(solicitacao)}
                      className="text-green-600 hover:text-green-800"
                      title="Imprimir/PDF"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openForm(solicitacao)}
                      className="text-orange-600 hover:text-orange-800"
                      title="Editar"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    {solicitacao.status !== 'concluido' && solicitacao.status !== 'cancelado' && (
                      <button
                        onClick={() => handleMarcarComoResolvida(solicitacao.id)}
                        className="text-green-600 hover:text-green-800"
                        title="Marcar como Resolvida"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(solicitacao.id)}
                      className="text-red-600 hover:text-red-800"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-gray-700">{solicitacao.descricao}</p>
                  </div>

                  {solicitacao.equipamento_afetado && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Package className="w-4 h-4 mr-2" />
                      <span className="font-medium">Equipamento:</span>
                      <span className="ml-1">{solicitacao.equipamento_afetado}</span>
                    </div>
                  )}

                  {solicitacao.local_servico && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Building className="w-4 h-4 mr-2" />
                      <span className="font-medium">Local:</span>
                      <span className="ml-1">{solicitacao.local_servico}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Tipo:</span> {solicitacao.tipo_nome}
                      </div>
                      {solicitacao.valor_estimado > 0 && (
                        <div>
                          <span className="font-medium">Valor Estimado:</span> {formatCurrency(solicitacao.valor_estimado)}
                        </div>
                      )}
                      {solicitacao.valor_total_orcado > 0 && (
                        <div>
                          <span className="font-medium">Valor Orçado:</span> {formatCurrency(solicitacao.valor_total_orcado)}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      {solicitacao.total_anexos > 0 && (
                        <div className="flex items-center">
                          <FileText className="w-4 h-4 mr-1" />
                          {solicitacao.total_anexos} anexo(s)
                        </div>
                      )}
                      {solicitacao.total_comentarios > 0 && (
                        <div className="flex items-center">
                          <MessageSquare className="w-4 h-4 mr-1" />
                          {solicitacao.total_comentarios} comentário(s)
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {filteredSolicitacoes.length === 0 && (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma solicitação encontrada</h3>
                <p className="text-gray-500">
                  {searchTerm || statusFilter !== 'all' || prioridadeFilter !== 'all' 
                    ? 'Nenhuma solicitação corresponde aos filtros aplicados.' 
                    : 'Nenhuma solicitação cadastrada.'}
                </p>
                <button
                  onClick={() => openForm()}
                  className="mt-4 px-4 py-2 bg-[#7D1F2C] text-white rounded-lg hover:bg-[#6a1a25]"
                >
                  Criar Primeira Solicitação
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-800">Sistema de Solicitações</h2>
          <div className="flex gap-3">
            <button
              onClick={() => setShowChatIA(true)}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Criar com IA
            </button>
            <button
              onClick={() => openForm()}
              className="px-4 py-2 bg-[#7D1F2C] text-white rounded-lg hover:bg-[#6a1a25] flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Nova Solicitação
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* Indicadores */}
        {indicadores && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center">
                <FileText className="w-8 h-8 text-blue-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Total de Solicitações</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {indicadores.total_solicitacoes}
                  </p>
                  <p className="text-sm text-gray-600">Este ano</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center">
                <Clock className="w-8 h-8 text-orange-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Em Andamento</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {indicadores.solicitacoes_em_analise + indicadores.solicitacoes_em_execucao}
                  </p>
                  <p className="text-sm text-gray-600">
                    {indicadores.solicitacoes_urgentes} urgentes
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center">
                <CheckCircle className="w-8 h-8 text-green-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Concluídas</p>
                  <p className="text-2xl font-bold text-green-600">
                    {indicadores.solicitacoes_concluidas}
                  </p>
                  <p className="text-sm text-gray-600">
                    Média: {indicadores.tempo_medio_execucao?.toFixed(0) || 0} dias
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center">
                <DollarSign className="w-8 h-8 text-purple-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Valor Orçado</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {formatCurrency(indicadores.valor_total_orcado || 0)}
                  </p>
                  <p className="text-sm text-gray-600">
                    Gasto: {formatCurrency(indicadores.valor_total_gasto || 0)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="bg-white rounded-xl shadow">
          <Tab.Group selectedIndex={selectedTab} onChange={(index) => setSelectedTab(index)}>
            <Tab.List className="flex space-x-1 rounded-xl bg-gray-100 p-1 mb-6 overflow-x-auto">
              {tabTitles.map((title, index) => {
                const Icon = tabIcons[index];
                return (
                  <Tab
                    key={title}
                    className={({ selected }) =>
                      `flex items-center whitespace-nowrap rounded-lg py-2.5 px-4 text-sm font-medium leading-5 transition-all
                      ${selected
                        ? 'bg-[#7D1F2C] text-white shadow'
                        : 'text-gray-700 hover:bg-white hover:text-gray-900'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {title}
                  </Tab>
                );
              })}
            </Tab.List>

            <Tab.Panels>
              {tabTitles.map((title, index) => (
                <Tab.Panel key={title} className="rounded-xl p-6">
                  {index === 3 ? (
                    <SolicitacoesPublicas />
                  ) : index === 4 ? (
                    <AprovacoesSolicitacoes />
                  ) : index === 5 ? (
                    <RelatoriosSolicitacoes />
                  ) : (
                    renderTabContent()
                  )}
                </Tab.Panel>
              ))}
            </Tab.Panels>
          </Tab.Group>
        </div>

        {/* Chat IA para Solicitações */}
        {showChatIA && (
          <ChatSolicitacaoIA
            onSolicitacaoPreenchida={(dados) => {
              setShowChatIA(false);
              setEditingSolicitacao(dados);
              setShowForm(true);
            }}
            onClose={() => setShowChatIA(false)}
          />
        )}

        {/* Modal do Formulário */}
        {showForm && (
          <SolicitacaoForm
            isOpen={showForm}
            onClose={() => {
              setShowForm(false);
              setEditingSolicitacao(null);
            }}
            solicitacao={editingSolicitacao}
            onSave={() => {
              setShowForm(false);
              setEditingSolicitacao(null);
              fetchData();
              fetchIndicadores();
            }}
          />
        )}

        {/* Modal de Detalhes */}
        {showDetalhes && solicitacaoSelecionada && (
          <SolicitacaoDetalhes
            isOpen={showDetalhes}
            onClose={() => {
              setShowDetalhes(false);
              setSolicitacaoSelecionada(null);
            }}
            solicitacao={solicitacaoSelecionada}
            onUpdate={() => {
              fetchData();
              fetchIndicadores();
            }}
          />
        )}
      </div>
    </div>
  );
};

export default Solicitacoes;