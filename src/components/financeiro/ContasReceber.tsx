import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Calendar, TrendingUp, DollarSign, Eye, CreditCard as Edit, Trash2, Download, CheckCircle, Clock, XCircle, AlertTriangle, Users, Receipt, CreditCard, Building, FileText, Banknote } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { ReportGenerator, exportToExcel } from '../../utils/reportGenerator';
import dayjs from 'dayjs';
import { SearchableSelect } from '../common/SearchableSelect';

interface ContaReceber {
  id: string;
  cliente_id: string;
  cliente_nome: string;
  cliente_documento?: string;
  cliente_telefone?: string;
  cliente_email?: string;
  descricao: string;
  categoria_id?: string;
  categoria_nome?: string;
  categoria_completa?: string;
  centro_custo_id?: string;
  centro_custo_nome?: string;
  forma_recebimento_id?: string;
  forma_recebimento_nome?: string;
  valor_total: number;
  valor_recebido: number;
  saldo_restante: number;
  data_emissao: string;
  data_vencimento: string;
  numero_documento?: string;
  status: 'em_aberto' | 'parcialmente_recebido' | 'recebido' | 'vencido' | 'cancelado';
  observacoes?: string;
  esta_vencida: boolean;
  dias_vencimento: number;
  criado_em: string;
}

interface Recebimento {
  id: string;
  conta_receber_id: string;
  valor_recebimento: number;
  data_recebimento: string;
  forma_pagamento_id?: string;
  forma_pagamento_nome?: string;
  conta_bancaria_id?: string;
  conta_bancaria_nome?: string;
  numero_comprovante?: string;
  observacoes?: string;
}

interface IndicadoresRecebimentos {
  total_contas_abertas: number;
  valor_contas_abertas: number;
  total_contas_vencidas: number;
  valor_contas_vencidas: number;
  previsto_mes_atual: number;
  recebido_mes_atual: number;
  valor_proximo_mes: number;
}

interface FormDataConta {
  cliente_id: string;
  descricao: string;
  categoria_id: string;
  centro_custo_id: string;
  forma_recebimento_id: string;
  valor_total: number;
  data_emissao: string;
  data_vencimento: string;
  numero_documento: string;
  observacoes: string;
}

interface FormDataRecebimento {
  valor_recebimento: number;
  data_recebimento: string;
  forma_pagamento_id: string;
  conta_bancaria_id: string;
  numero_comprovante: string;
  observacoes: string;
}

const ContasReceber: React.FC = () => {
  const [contas, setContas] = useState<ContaReceber[]>([]);
  const [indicadores, setIndicadores] = useState<IndicadoresRecebimentos | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFormConta, setShowFormConta] = useState(false);
  const [showFormRecebimento, setShowFormRecebimento] = useState(false);
  const [editingConta, setEditingConta] = useState<ContaReceber | null>(null);
  const [contaSelecionada, setContaSelecionada] = useState<ContaReceber | null>(null);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'em_aberto' | 'parcialmente_recebido' | 'recebido' | 'vencido' | 'cancelado'>('all');
  const [clienteFilter, setClienteFilter] = useState('all');
  const [dataInicial, setDataInicial] = useState('');
  const [dataFinal, setDataFinal] = useState('');
  
  // Dados para formulários
  const [clientes, setClientes] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [centrosCusto, setCentrosCusto] = useState<any[]>([]);
  const [formasPagamento, setFormasPagamento] = useState<any[]>([]);
  const [contasBancarias, setContasBancarias] = useState<any[]>([]);
  
  const [formDataConta, setFormDataConta] = useState<FormDataConta>({
    cliente_id: '',
    descricao: '',
    categoria_id: '',
    centro_custo_id: '',
    forma_recebimento_id: '',
    valor_total: 0,
    data_emissao: dayjs().format('YYYY-MM-DD'),
    data_vencimento: dayjs().add(30, 'days').format('YYYY-MM-DD'),
    numero_documento: '',
    observacoes: ''
  });

  const [formDataRecebimento, setFormDataRecebimento] = useState<FormDataRecebimento>({
    valor_recebimento: 0,
    data_recebimento: dayjs().format('YYYY-MM-DD'),
    forma_pagamento_id: '',
    conta_bancaria_id: '',
    numero_comprovante: '',
    observacoes: ''
  });

  useEffect(() => {
    fetchData();
    fetchIndicadores();
    fetchFormData();
  }, []);

  useEffect(() => {
    fetchData();
    fetchIndicadores();
  }, [statusFilter, clienteFilter, dataInicial, dataFinal]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase.from('vw_contas_receber').select('*');

      // Aplicar filtros
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (clienteFilter !== 'all') {
        query = query.eq('cliente_id', clienteFilter);
      }

      if (dataInicial) {
        query = query.gte('data_vencimento', dataInicial);
      }

      if (dataFinal) {
        query = query.lte('data_vencimento', dataFinal);
      }

      const { data, error } = await query.order('data_vencimento', { ascending: false });

      if (error) throw error;
      setContas(data || []);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const fetchIndicadores = async () => {
    try {
      // Aplicar os mesmos filtros que são usados no fetchData
      let query = supabase
        .from('contas_receber')
        .select('valor_total, valor_recebido, saldo_restante, status, data_vencimento, cliente_id');

      // Aplicar filtro de status
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      // Aplicar filtro de cliente
      if (clienteFilter !== 'all') {
        query = query.eq('cliente_id', clienteFilter);
      }

      // Aplicar filtro de data
      if (dataInicial) {
        query = query.gte('data_vencimento', dataInicial);
      }

      if (dataFinal) {
        query = query.lte('data_vencimento', dataFinal);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Calcular indicadores manualmente
      const totalContas = (data || []).length;
      const valorTotal = (data || []).reduce((sum, conta) => sum + (conta.valor_total || 0), 0);
      const valorRecebido = (data || []).reduce((sum, conta) => sum + (conta.valor_recebido || 0), 0);
      const saldoPendente = (data || []).reduce((sum, conta) => sum + (conta.saldo_restante || 0), 0);

      // Calcular contas vencidas
      const hoje = new Date().toISOString().split('T')[0];
      const contasVencidas = (data || []).filter(conta =>
        conta.data_vencimento < hoje && conta.saldo_restante > 0
      ).length;

      const valorVencido = (data || []).filter(conta =>
        conta.data_vencimento < hoje && conta.saldo_restante > 0
      ).reduce((sum, conta) => sum + (conta.saldo_restante || 0), 0);

      const ticketMedio = totalContas > 0 ? valorTotal / totalContas : 0;

      setIndicadores({
        total_contas: totalContas,
        valor_total: valorTotal,
        valor_recebido: valorRecebido,
        saldo_pendente: saldoPendente,
        contas_vencidas: contasVencidas,
        valor_vencido: valorVencido,
        ticket_medio: ticketMedio
      });
    } catch (err) {
      console.error('Error fetching indicators:', err);
    }
  };

  const fetchFormData = async () => {
    try {
      const [clientesRes, categoriasRes, centrosRes, formasRes, contasRes] = await Promise.all([
        supabase.from('clientes').select('*').eq('status', 'ativo'),
        supabase.from('vw_categoria_tree').select('*').eq('tipo', 'receita').eq('status', 'ativo'),
        supabase.from('centros_custo').select('*').eq('status', 'ativo'),
        supabase.from('formas_pagamento').select('*').eq('status', 'ativo'),
        supabase.from('vw_bancos_contas_saldo').select('*').eq('status', 'ativo')
      ]);

      setClientes(clientesRes.data || []);
      setCategorias(categoriasRes.data || []);
      setCentrosCusto(centrosRes.data || []);
      setFormasPagamento(formasRes.data || []);
      setContasBancarias(contasRes.data || []);
    } catch (err) {
      console.error('Error fetching form data:', err);
    }
  };

  const handleSaveConta = async () => {
    try {
      setLoading(true);
      setError(null);

      const dataToSave = {
        ...formDataConta,
        valor_total: parseFloat(formDataConta.valor_total.toString())
      };

      if (editingConta) {
        const { error } = await supabase
          .from('contas_receber')
          .update(dataToSave)
          .eq('id', editingConta.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('contas_receber')
          .insert([dataToSave]);

        if (error) throw error;
      }

      setShowFormConta(false);
      setEditingConta(null);
      resetFormConta();
      fetchData();
      fetchIndicadores();
    } catch (err) {
      console.error('Error saving account:', err);
      setError(err instanceof Error ? err.message : 'Erro ao salvar conta');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRecebimento = async () => {
    if (!contaSelecionada) return;

    try {
      setLoading(true);
      setError(null);

      const dataToSave = {
        conta_receber_id: contaSelecionada.id,
        ...formDataRecebimento,
        valor_recebimento: parseFloat(formDataRecebimento.valor_recebimento.toString())
      };

      const { error } = await supabase
        .from('recebimentos_contas')
        .insert([dataToSave]);

      if (error) throw error;

      setShowFormRecebimento(false);
      setContaSelecionada(null);
      resetFormRecebimento();
      fetchData();
      fetchIndicadores();
    } catch (err) {
      console.error('Error saving receipt:', err);
      setError(err instanceof Error ? err.message : 'Erro ao salvar recebimento');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta conta?')) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('contas_receber')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchData();
      fetchIndicadores();
    } catch (err) {
      console.error('Error deleting account:', err);
      setError(err instanceof Error ? err.message : 'Erro ao excluir conta');
    } finally {
      setLoading(false);
    }
  };

  const exportData = () => {
    if (filteredContas.length === 0) {
      alert('Não há dados para exportar');
      return;
    }

    const headers = [
      'Cliente',
      'Descrição',
      'Categoria',
      'Centro de Custo',
      'Data Emissão',
      'Data Vencimento',
      'Valor Total',
      'Valor Recebido',
      'Saldo Restante',
      'Status',
      'Observações'
    ];

    const data = filteredContas.map(conta => [
      conta.cliente_nome,
      conta.descricao,
      conta.categoria_nome || '',
      conta.centro_custo_nome || '',
      dayjs(conta.data_emissao).format('DD/MM/YYYY'),
      dayjs(conta.data_vencimento).format('DD/MM/YYYY'),
      conta.valor_total,
      conta.valor_recebido,
      conta.saldo_restante,
      getStatusText(conta.status),
      conta.observacoes || ''
    ]);

    const fileName = `contas-receber-${dayjs().format('YYYY-MM-DD')}`;
    exportToExcel(data, headers, fileName);
  };

  const generatePDFReport = () => {
    if (filteredContas.length === 0) {
      alert('Não há dados para gerar relatório');
      return;
    }

    const reportGenerator = new ReportGenerator({
      title: 'Relatório de Contas a Receber',
      subtitle: `Período: ${dayjs().format('DD/MM/YYYY')}`,
      filename: `contas-receber-${dayjs().format('YYYY-MM-DD')}.pdf`
    });
    
    let currentY = reportGenerator.addHeader('Relatório de Contas a Receber', `Gerado em ${dayjs().format('DD/MM/YYYY')}`);

    // Resumo executivo
    if (indicadores) {
      const resumo = [
        ['Contas em Aberto', indicadores.total_contas_abertas.toString()],
        ['Valor em Aberto', formatCurrency(indicadores.valor_contas_abertas)],
        ['Contas Vencidas', indicadores.total_contas_vencidas.toString()],
        ['Valor Vencido', formatCurrency(indicadores.valor_contas_vencidas)],
        ['Previsto Este Mês', formatCurrency(indicadores.previsto_mes_atual)],
        ['Recebido Este Mês', formatCurrency(indicadores.recebido_mes_atual)]
      ];

      currentY = reportGenerator.addSection('Resumo Executivo', [], currentY);
      currentY = reportGenerator.addTable(['Indicador', 'Valor'], resumo, currentY);
    }

    // Dados detalhados
    const headers = ['Cliente', 'Descrição', 'Vencimento', 'Valor Total', 'Status'];
    const data = filteredContas.slice(0, 50).map(conta => [
      conta.cliente_nome,
      conta.descricao.length > 30 ? conta.descricao.substring(0, 30) + '...' : conta.descricao,
      dayjs(conta.data_vencimento).format('DD/MM/YYYY'),
      formatCurrency(conta.valor_total),
      getStatusText(conta.status)
    ]);

    currentY = reportGenerator.addSection('Contas a Receber', [], currentY + 10);
    reportGenerator.addTable(headers, data, currentY);

    reportGenerator.save(`contas-receber-${dayjs().format('YYYY-MM-DD')}.pdf`);
  };

  const openFormConta = (conta?: ContaReceber) => {
    if (conta) {
      setEditingConta(conta);
      setFormDataConta({
        cliente_id: conta.cliente_id,
        descricao: conta.descricao,
        categoria_id: conta.categoria_id || '',
        centro_custo_id: conta.centro_custo_id || '',
        forma_recebimento_id: conta.forma_recebimento_id || '',
        valor_total: conta.valor_total,
        data_emissao: conta.data_emissao,
        data_vencimento: conta.data_vencimento,
        numero_documento: conta.numero_documento || '',
        observacoes: conta.observacoes || ''
      });
    } else {
      setEditingConta(null);
      resetFormConta();
    }
    setShowFormConta(true);
  };

  const openFormRecebimento = (conta: ContaReceber) => {
    setContaSelecionada(conta);
    setFormDataRecebimento({
      ...formDataRecebimento,
      valor_recebimento: conta.saldo_restante
    });
    setShowFormRecebimento(true);
  };

  const resetFormConta = () => {
    setFormDataConta({
      cliente_id: '',
      descricao: '',
      categoria_id: '',
      centro_custo_id: '',
      forma_recebimento_id: '',
      valor_total: 0,
      data_emissao: dayjs().format('YYYY-MM-DD'),
      data_vencimento: dayjs().add(30, 'days').format('YYYY-MM-DD'),
      numero_documento: '',
      observacoes: ''
    });
  };

  const resetFormRecebimento = () => {
    setFormDataRecebimento({
      valor_recebimento: 0,
      data_recebimento: dayjs().format('YYYY-MM-DD'),
      forma_pagamento_id: '',
      conta_bancaria_id: '',
      numero_comprovante: '',
      observacoes: ''
    });
  };

  const filteredContas = contas.filter(conta => {
    const matchesSearch = conta.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         conta.cliente_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         conta.numero_documento?.toLowerCase().includes(searchTerm.toLowerCase());
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
      case 'recebido':
        return 'text-green-700 bg-green-100';
      case 'em_aberto':
        return 'text-blue-700 bg-blue-100';
      case 'parcialmente_recebido':
        return 'text-yellow-700 bg-yellow-100';
      case 'vencido':
        return 'text-red-700 bg-red-100';
      case 'cancelado':
        return 'text-gray-700 bg-gray-100';
      default:
        return 'text-gray-700 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'recebido':
        return <CheckCircle className="w-4 h-4" />;
      case 'em_aberto':
        return <Clock className="w-4 h-4" />;
      case 'parcialmente_recebido':
        return <AlertTriangle className="w-4 h-4" />;
      case 'vencido':
        return <XCircle className="w-4 h-4" />;
      case 'cancelado':
        return <FileText className="w-4 h-4" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'recebido':
        return 'Recebido';
      case 'em_aberto':
        return 'Em Aberto';
      case 'parcialmente_recebido':
        return 'Parcialmente Recebido';
      case 'vencido':
        return 'Vencido';
      case 'cancelado':
        return 'Cancelado';
      default:
        return 'Desconhecido';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Contas a Receber</h3>
        <div className="flex gap-2">
          <button
            onClick={exportData}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            <Download className="w-4 h-4 inline mr-2" />
            Exportar Excel
          </button>
          <button
            onClick={generatePDFReport}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            <FileText className="w-4 h-4 inline mr-2" />
            Gerar PDF
          </button>
          <button
            onClick={() => openFormConta()}
            className="px-4 py-2 bg-[#7D1F2C] text-white rounded-lg hover:bg-[#6a1a25]"
          >
            <Plus className="w-4 h-4 inline mr-2" />
            Nova Conta a Receber
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <TrendingUp className="w-8 h-8 text-green-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-500">Previsto Este Mês</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(indicadores.previsto_mes_atual)}
                </p>
                <p className="text-sm text-gray-600">
                  Recebido: {formatCurrency(indicadores.recebido_mes_atual)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <Clock className="w-8 h-8 text-orange-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-500">Contas em Aberto</p>
                <p className="text-2xl font-bold text-orange-600">
                  {indicadores.total_contas_abertas}
                </p>
                <p className="text-sm text-gray-600">
                  {formatCurrency(indicadores.valor_contas_abertas)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <XCircle className="w-8 h-8 text-red-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-500">Contas Vencidas</p>
                <p className="text-2xl font-bold text-red-600">
                  {indicadores.total_contas_vencidas}
                </p>
                <p className="text-sm text-gray-600">
                  {formatCurrency(indicadores.valor_contas_vencidas)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <Calendar className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-500">Próximos 30 Dias</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(indicadores.valor_proximo_mes)}
                </p>
                <p className="text-sm text-gray-600">A receber</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar contas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7D1F2C] focus:border-[#7D1F2C]"
              />
            </div>
          </div>

          <div>
            <SearchableSelect
              options={[
                { value: 'all', label: 'Todos os Status' },
                { value: 'em_aberto', label: 'Em Aberto' },
                { value: 'parcialmente_recebido', label: 'Parcialmente Recebido' },
                { value: 'recebido', label: 'Recebido' },
                { value: 'vencido', label: 'Vencido' },
                { value: 'cancelado', label: 'Cancelado' }
              ]}
              value={statusFilter}
              onChange={(value) => setStatusFilter(value as any)}
              placeholder="Status"
              theme="light"
            />
          </div>

          <div>
            <SearchableSelect
              options={[
                { value: 'all', label: 'Todos os Clientes' },
                ...clientes.map((c) => ({
                  value: c.id,
                  label: c.nome
                }))
              ]}
              value={clienteFilter}
              onChange={(value) => setClienteFilter(value)}
              placeholder="Cliente"
              theme="light"
            />
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

      {/* Tabela */}
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
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Descrição
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vencimento
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor Total
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor Recebido
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Saldo Restante
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredContas.map((conta) => (
                  <tr key={conta.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{conta.cliente_nome}</div>
                        {conta.cliente_documento && (
                          <div className="text-sm text-gray-500">{conta.cliente_documento}</div>
                        )}
                        {conta.cliente_telefone && (
                          <div className="text-sm text-gray-500">{conta.cliente_telefone}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{conta.descricao}</div>
                        {conta.numero_documento && (
                          <div className="text-sm text-gray-500">Doc: {conta.numero_documento}</div>
                        )}
                        {conta.categoria_nome && (
                          <div className="text-sm text-gray-500">{conta.categoria_nome}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={conta.esta_vencida ? 'text-red-600' : ''}>
                        {dayjs(conta.data_vencimento).format('DD/MM/YYYY')}
                        {conta.esta_vencida && (
                          <div className="text-xs text-red-600">
                            Vencida há {conta.dias_vencimento} dias
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-medium text-gray-900">
                        {formatCurrency(conta.valor_total)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-medium text-green-600">
                        {formatCurrency(conta.valor_recebido)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`font-medium ${
                        conta.saldo_restante > 0 ? 'text-orange-600' : 'text-green-600'
                      }`}>
                        {formatCurrency(conta.saldo_restante)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(conta.status)}`}>
                        {getStatusIcon(conta.status)}
                        <span className="ml-1">{getStatusText(conta.status)}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-2">
                        {conta.status !== 'recebido' && conta.status !== 'cancelado' && (
                          <button
                            onClick={() => openFormRecebimento(conta)}
                            className="text-green-600 hover:text-green-800"
                            title="Registrar Recebimento"
                          >
                            <Receipt className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => openFormConta(conta)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(conta.id)}
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

          {filteredContas.length === 0 && (
            <div className="text-center py-12">
              <Receipt className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma conta encontrada</h3>
              <p className="text-gray-500">
                {searchTerm || statusFilter !== 'all' || clienteFilter !== 'all' 
                  ? 'Nenhuma conta corresponde aos filtros aplicados.' 
                  : 'Nenhuma conta a receber cadastrada.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Modal do Formulário de Conta */}
      {showFormConta && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {editingConta ? 'Editar Conta a Receber' : 'Nova Conta a Receber'}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cliente *
                </label>
                <SearchableSelect
                  options={clientes.map((c: any) => ({
                    value: c.id,
                    label: c.nome
                  }))}
                  value={formDataConta.cliente_id}
                  onChange={(value) => setFormDataConta({ ...formDataConta, cliente_id: value })}
                  placeholder="Buscar cliente..."
                  theme="light"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valor Total *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">R$</span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    value={formDataConta.valor_total}
                    onChange={(e) => setFormDataConta({ ...formDataConta, valor_total: parseFloat(e.target.value) || 0 })}
                    className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data de Emissão *
                </label>
                <input
                  type="date"
                  value={formDataConta.data_emissao}
                  onChange={(e) => setFormDataConta({ ...formDataConta, data_emissao: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data de Vencimento *
                </label>
                <input
                  type="date"
                  value={formDataConta.data_vencimento}
                  onChange={(e) => setFormDataConta({ ...formDataConta, data_vencimento: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoria *
                </label>
                <SearchableSelect
                  options={categorias.map((cat: any) => ({
                    value: cat.id,
                    label: cat.caminho_completo || cat.nome
                  }))}
                  value={formDataConta.categoria_id}
                  onChange={(value) => setFormDataConta({ ...formDataConta, categoria_id: value })}
                  placeholder="Buscar categoria..."
                  theme="light"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Centro de Custo
                </label>
                <SearchableSelect
                  options={centrosCusto.map((cc: any) => ({
                    value: cc.id,
                    label: cc.nome
                  }))}
                  value={formDataConta.centro_custo_id}
                  onChange={(value) => setFormDataConta({ ...formDataConta, centro_custo_id: value })}
                  placeholder="Buscar centro de custo..."
                  theme="light"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Forma de Recebimento Prevista
                </label>
                <SearchableSelect
                  options={formasPagamento.map((fp: any) => ({
                    value: fp.id,
                    label: fp.nome
                  }))}
                  value={formDataConta.forma_recebimento_id}
                  onChange={(value) => setFormDataConta({ ...formDataConta, forma_recebimento_id: value })}
                  placeholder="Buscar forma de recebimento..."
                  theme="light"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Número do Documento
                </label>
                <input
                  type="text"
                  value={formDataConta.numero_documento}
                  onChange={(e) => setFormDataConta({ ...formDataConta, numero_documento: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  placeholder="Ex: PROP-2025-001"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição *
                </label>
                <input
                  type="text"
                  value={formDataConta.descricao}
                  onChange={(e) => setFormDataConta({ ...formDataConta, descricao: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observações
                </label>
                <textarea
                  value={formDataConta.observacoes}
                  onChange={(e) => setFormDataConta({ ...formDataConta, observacoes: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  rows={3}
                />
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowFormConta(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveConta}
                disabled={loading || !formDataConta.cliente_id || !formDataConta.descricao || !formDataConta.valor_total}
                className="px-4 py-2 bg-[#7D1F2C] text-white rounded-md hover:bg-[#6a1a25] disabled:opacity-50"
              >
                {loading ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal do Formulário de Recebimento */}
      {showFormRecebimento && contaSelecionada && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Registrar Recebimento
            </h3>
            
            {/* Informações da Conta */}
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <h4 className="font-medium text-gray-900 mb-2">Conta a Receber</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Cliente:</span>
                  <span className="ml-2 font-medium">{contaSelecionada.cliente_nome}</span>
                </div>
                <div>
                  <span className="text-gray-600">Valor Total:</span>
                  <span className="ml-2 font-medium">{formatCurrency(contaSelecionada.valor_total)}</span>
                </div>
                <div>
                  <span className="text-gray-600">Já Recebido:</span>
                  <span className="ml-2 font-medium text-green-600">{formatCurrency(contaSelecionada.valor_recebido)}</span>
                </div>
                <div>
                  <span className="text-gray-600">Saldo Restante:</span>
                  <span className="ml-2 font-medium text-orange-600">{formatCurrency(contaSelecionada.saldo_restante)}</span>
                </div>
              </div>
              <div className="mt-2">
                <span className="text-gray-600">Descrição:</span>
                <span className="ml-2">{contaSelecionada.descricao}</span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valor do Recebimento *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">R$</span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    max={contaSelecionada.saldo_restante}
                    value={formDataRecebimento.valor_recebimento}
                    onChange={(e) => setFormDataRecebimento({ ...formDataRecebimento, valor_recebimento: parseFloat(e.target.value) || 0 })}
                    className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                    required
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Máximo: {formatCurrency(contaSelecionada.saldo_restante)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data do Recebimento *
                </label>
                <input
                  type="date"
                  value={formDataRecebimento.data_recebimento}
                  onChange={(e) => setFormDataRecebimento({ ...formDataRecebimento, data_recebimento: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Forma de Pagamento
                </label>
                <SearchableSelect
                  options={formasPagamento.map((fp) => ({
                    value: fp.id,
                    label: fp.nome
                  }))}
                  value={formDataRecebimento.forma_pagamento_id}
                  onChange={(value) => setFormDataRecebimento({ ...formDataRecebimento, forma_pagamento_id: value })}
                  placeholder="Buscar forma de pagamento..."
                  theme="light"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Conta/Banco
                </label>
                <SearchableSelect
                  options={contasBancarias.map((cb: any) => ({
                    value: cb.id,
                    label: `${cb.banco} - ${cb.tipo_conta}${cb.numero_conta ? ` (${cb.numero_conta})` : ''}`
                  }))}
                  value={formDataRecebimento.conta_bancaria_id}
                  onChange={(value) => setFormDataRecebimento({ ...formDataRecebimento, conta_bancaria_id: value })}
                  placeholder="Buscar conta bancária..."
                  theme="light"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Número do Comprovante
                </label>
                <input
                  type="text"
                  value={formDataRecebimento.numero_comprovante}
                  onChange={(e) => setFormDataRecebimento({ ...formDataRecebimento, numero_comprovante: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observações
                </label>
                <textarea
                  value={formDataRecebimento.observacoes}
                  onChange={(e) => setFormDataRecebimento({ ...formDataRecebimento, observacoes: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  rows={3}
                />
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowFormRecebimento(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveRecebimento}
                disabled={loading || !formDataRecebimento.valor_recebimento || formDataRecebimento.valor_recebimento > contaSelecionada.saldo_restante}
                className="px-4 py-2 bg-[#7D1F2C] text-white rounded-md hover:bg-[#6a1a25] disabled:opacity-50"
              >
                {loading ? 'Salvando...' : 'Registrar Recebimento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContasReceber;