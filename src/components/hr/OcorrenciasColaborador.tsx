import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Calendar, AlertTriangle, User, FileText, Clock, CheckCircle, XCircle, Download, CreditCard as Edit, Trash2, Eye, Activity, TrendingUp, Users, BarChart3, Receipt, Send, DollarSign } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import dayjs from 'dayjs';
import { exportToExcel } from '../../utils/reportGenerator';
import { imprimirReciboVale, type DadosReciboVale } from '../../utils/reciboVale';


interface OcorrenciaColaborador {
  id: string;
  colaborador_id: string;
  colaborador_nome: string;
  data_ocorrencia: string;
  tipo_ocorrencia: 'falta' | 'atestado' | 'vale' | 'advertencia' | 'atraso' | 'observacao';
  descricao: string;
  valor_vale: number;
  dias_afastamento: number;
  documento_anexo?: string;
  status: 'pendente' | 'aprovado' | 'rejeitado' | 'processado';
  aprovado_por?: string;
  data_aprovacao?: string;
  observacoes_aprovacao?: string;
  impacta_folha: boolean;
  criado_em: string;
  atualizado_em: string;
  criado_por?: string;
}

interface FormData {
  colaborador_id: string;
  data_ocorrencia: string;
  tipo_ocorrencia: 'falta' | 'atestado' | 'vale' | 'advertencia' | 'atraso' | 'observacao';
  descricao: string;
  valor_vale: number;
  dias_afastamento: number;
  documento_anexo: string;
  impacta_folha: boolean;
  observacoes_aprovacao: string;
}

interface IndicadoresOcorrencias {
  total_ocorrencias: number;
  ocorrencias_pendentes: number;
  ocorrencias_mes: number;
  colaboradores_com_ocorrencias: number;
}

const OcorrenciasColaborador: React.FC = () => {
  const [ocorrencias, setOcorrencias] = useState<OcorrenciaColaborador[]>([]);
  const [colaboradores, setColaboradores] = useState<any[]>([]);
  const [indicadores, setIndicadores] = useState<IndicadoresOcorrencias | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingOcorrencia, setEditingOcorrencia] = useState<OcorrenciaColaborador | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [colaboradorFilter, setColaboradorFilter] = useState('all');
  const [tipoFilter, setTipoFilter] = useState<'all' | 'falta' | 'atestado' | 'vale' | 'advertencia' | 'atraso' | 'observacao'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pendente' | 'aprovado' | 'rejeitado' | 'processado'>('all');
  const [mesFilter, setMesFilter] = useState(dayjs().month() + 1);
  const [anoFilter, setAnoFilter] = useState(dayjs().year());

  const [formData, setFormData] = useState<FormData>({
    colaborador_id: '',
    data_ocorrencia: dayjs().format('YYYY-MM-DD'),
    tipo_ocorrencia: 'observacao',
    descricao: '',
    valor_vale: 0,
    dias_afastamento: 0,
    documento_anexo: '',
    impacta_folha: false,
    observacoes_aprovacao: ''
  });

  useEffect(() => {
    fetchColaboradores();
    fetchIndicadores();
  }, []);

  useEffect(() => {
    fetchOcorrencias();
  }, [colaboradorFilter, tipoFilter, statusFilter, mesFilter, anoFilter]);

  const fetchColaboradores = async () => {
    try {
      const { data, error } = await supabase
        .from('vw_colaboradores_completo')
        .select('id, nome_completo, funcao_nome, status')
        .eq('status', 'ativo')
        .order('nome_completo');

      if (error) throw error;
      setColaboradores(data || []);
    } catch (err) {
      console.error('Error fetching employees:', err);
    }
  };

  const fetchOcorrencias = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('vw_ocorrencias_detalhadas')
        .select('*');

      // Aplicar filtros
      if (colaboradorFilter !== 'all') {
        query = query.eq('colaborador_id', colaboradorFilter);
      }

      if (tipoFilter !== 'all') {
        query = query.eq('tipo_ocorrencia', tipoFilter);
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      // Filtro por mês/ano
      query = query.eq('mes_ocorrencia', mesFilter)
                   .eq('ano_ocorrencia', anoFilter);

      const { data, error } = await query.order('data_ocorrencia', { ascending: false });

      if (error) throw error;
      setOcorrencias(data || []);
    } catch (err) {
      console.error('Error fetching occurrences:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar ocorrências');
    } finally {
      setLoading(false);
    }
  };

  const fetchIndicadores = async () => {
    try {
      // Buscar indicadores básicos
      const { data: totalData, error: totalError } = await supabase
        .from('ocorrencias_colaborador')
        .select('id, status, data_ocorrencia, colaborador_id');

      if (totalError) throw totalError;

      const total = totalData?.length || 0;
      const pendentes = totalData?.filter(o => o.status === 'pendente').length || 0;
      
      const mesAtual = dayjs().format('YYYY-MM');
      const ocorrenciasMes = totalData?.filter(o => 
        dayjs(o.data_ocorrencia).format('YYYY-MM') === mesAtual
      ).length || 0;

      const colaboradoresUnicos = new Set(totalData?.map(o => o.colaborador_id)).size;

      setIndicadores({
        total_ocorrencias: total,
        ocorrencias_pendentes: pendentes,
        ocorrencias_mes: ocorrenciasMes,
        colaboradores_com_ocorrencias: colaboradoresUnicos
      });

    } catch (err) {
      console.error('Error fetching indicators:', err);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);

      // Validações
      if (!formData.colaborador_id || !formData.data_ocorrencia || !formData.descricao) {
        throw new Error('Preencha todos os campos obrigatórios');
      }

      const dataToSave = {
        ...formData,
        valor_vale: parseFloat(formData.valor_vale.toString()) || 0,
        dias_afastamento: parseInt(formData.dias_afastamento.toString()) || 0
      };

      if (editingOcorrencia) {
        const { error } = await supabase
          .from('ocorrencias_colaborador')
          .update(dataToSave)
          .eq('id', editingOcorrencia.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('ocorrencias_colaborador')
          .insert([dataToSave]);

        if (error) throw error;
      }

      setShowForm(false);
      setEditingOcorrencia(null);
      resetForm();
      fetchOcorrencias();
      fetchIndicadores();
    } catch (err) {
      console.error('Error saving occurrence:', err);
      setError(err instanceof Error ? err.message : 'Erro ao salvar ocorrência');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from('ocorrencias_colaborador')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setShowDeleteConfirm(false);
      setItemToDelete(null);
      fetchOcorrencias();
      fetchIndicadores();
    } catch (err) {
      console.error('Error deleting occurrence:', err);
      setError(err instanceof Error ? err.message : 'Erro ao excluir ocorrência');
    } finally {
      setLoading(false);
    }
  };

  const aprovarOcorrencia = async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from('ocorrencias_colaborador')
        .update({
          status: 'aprovado',
          data_aprovacao: new Date().toISOString(),
          // aprovado_por: user?.id // TODO: Add user context
        })
        .eq('id', id);

      if (error) throw error;

      fetchOcorrencias();
      fetchIndicadores();
    } catch (err) {
      console.error('Error approving occurrence:', err);
      setError(err instanceof Error ? err.message : 'Erro ao aprovar ocorrência');
    } finally {
      setLoading(false);
    }
  };

  const rejeitarOcorrencia = async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from('ocorrencias_colaborador')
        .update({
          status: 'rejeitado',
          data_aprovacao: new Date().toISOString(),
          // aprovado_por: user?.id // TODO: Add user context
        })
        .eq('id', id);

      if (error) throw error;

      fetchOcorrencias();
      fetchIndicadores();
    } catch (err) {
      console.error('Error rejecting occurrence:', err);
      setError(err instanceof Error ? err.message : 'Erro ao rejeitar ocorrência');
    } finally {
      setLoading(false);
    }
  };

  const encaminharParaContasPagar = async (ocorrencia: OcorrenciaColaborador) => {
    try {
      setLoading(true);
      setError(null);

      // Buscar colaborador para obter dados completos
      const { data: colaboradorData, error: colaboradorError } = await supabase
        .from('colaboradores')
        .select('nome_completo, cpf')
        .eq('id', ocorrencia.colaborador_id)
        .single();

      if (colaboradorError) throw colaboradorError;

      const nomeColaborador = colaboradorData.nome_completo;
      const cpfColaborador = colaboradorData.cpf || '';

      // Verificar se já existe fornecedor para este colaborador
      let fornecedorId = null;
      const { data: fornecedorExistente, error: fornecedorError } = await supabase
        .from('fornecedores')
        .select('id')
        .eq('nome', nomeColaborador)
        .maybeSingle();

      if (fornecedorError) throw fornecedorError;

      if (fornecedorExistente) {
        fornecedorId = fornecedorExistente.id;
      } else {
        // Criar novo fornecedor
        const { data: novoFornecedor, error: criarFornecedorError } = await supabase
          .from('fornecedores')
          .insert([{
            nome: nomeColaborador,
            cnpj: cpfColaborador,
            observacoes: `Fornecedor criado automaticamente para vale do colaborador ${nomeColaborador}`,
            status: 'ativo'
          }])
          .select()
          .single();

        if (criarFornecedorError) throw criarFornecedorError;
        fornecedorId = novoFornecedor.id;
      }

      // Criar conta a pagar
      const dataVencimento = new Date();
      dataVencimento.setDate(dataVencimento.getDate() + 5); // Vencimento em 5 dias

      const { error: contaError } = await supabase
        .from('contas_pagar')
        .insert([{
          fornecedor_id: fornecedorId,
          descricao: `Vale - ${ocorrencia.descricao}`,
          valor_total: ocorrencia.valor_vale,
          data_vencimento: dataVencimento.toISOString().split('T')[0],
          data_emissao: new Date().toISOString().split('T')[0],
          status: 'em_aberto',
          aprovado_para_pagamento: false,
          observacoes: `Vale gerado pela ocorrência RH. Colaborador: ${nomeColaborador}. Data da ocorrência: ${dayjs(ocorrencia.data_ocorrencia).format('DD/MM/YYYY')}`
        }]);

      if (contaError) throw contaError;

      // Atualizar status da ocorrência para processado
      const { error: updateError } = await supabase
        .from('ocorrencias_colaborador')
        .update({
          status: 'processado',
          observacoes_aprovacao: (ocorrencia.observacoes_aprovacao || '') + '\n\nEncaminhado para Contas a Pagar em ' + dayjs().format('DD/MM/YYYY HH:mm')
        })
        .eq('id', ocorrencia.id);

      if (updateError) throw updateError;

      alert('Vale encaminhado com sucesso para o Contas a Pagar!');
      fetchOcorrencias();
      fetchIndicadores();
    } catch (err) {
      console.error('Error forwarding to accounts payable:', err);
      setError(err instanceof Error ? err.message : 'Erro ao encaminhar para contas a pagar');
    } finally {
      setLoading(false);
    }
  };

  const gerarReciboVale = (ocorrencia: OcorrenciaColaborador) => {
    const colaborador = colaboradores.find(c => c.id === ocorrencia.colaborador_id);
    if (!colaborador) {
      alert('Dados do colaborador não encontrados');
      return;
    }

    const dadosRecibo: DadosReciboVale = {
      colaborador: {
        nome_completo: ocorrencia.colaborador_nome,
        cpf: colaborador.cpf || 'Não informado',
        funcao_nome: colaborador.funcao_nome || 'Não informado'
      },
      vale: {
        numero_recibo: `VALE-${dayjs(ocorrencia.data_ocorrencia).format('YYYYMMDD')}-${ocorrencia.id.substring(0, 8)}`,
        valor_vale: ocorrencia.valor_vale,
        data_ocorrencia: ocorrencia.data_ocorrencia,
        descricao: ocorrencia.descricao
      },
      empresa: {
        nome: 'EMPRESA LTDA',
        endereco: 'Endereço da Empresa'
      }
    };

    imprimirReciboVale(dadosRecibo);
  };

  const openForm = (ocorrencia?: OcorrenciaColaborador) => {
    if (ocorrencia) {
      setEditingOcorrencia(ocorrencia);
      setFormData({
        colaborador_id: ocorrencia.colaborador_id,
        data_ocorrencia: ocorrencia.data_ocorrencia,
        tipo_ocorrencia: ocorrencia.tipo_ocorrencia,
        descricao: ocorrencia.descricao,
        valor_vale: ocorrencia.valor_vale,
        dias_afastamento: ocorrencia.dias_afastamento,
        documento_anexo: ocorrencia.documento_anexo || '',
        impacta_folha: ocorrencia.impacta_folha,
        observacoes_aprovacao: ocorrencia.observacoes_aprovacao || ''
      });
    } else {
      setEditingOcorrencia(null);
      resetForm();
    }
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      colaborador_id: '',
      data_ocorrencia: dayjs().format('YYYY-MM-DD'),
      tipo_ocorrencia: 'observacao',
      descricao: '',
      valor_vale: 0,
      dias_afastamento: 0,
      documento_anexo: '',
      impacta_folha: false,
      observacoes_aprovacao: ''
    });
  };

  const confirmDelete = (id: string) => {
    setItemToDelete(id);
    setShowDeleteConfirm(true);
  };

  const exportarOcorrencias = () => {
    if (ocorrencias.length === 0) {
      alert('Não há dados para exportar');
      return;
    }

    const headers = [
      'Colaborador',
      'Data',
      'Tipo',
      'Descrição',
      'Valor Vale',
      'Dias Afastamento',
      'Status',
      'Impacta Folha',
      'Data Aprovação',
      'Observações'
    ];

    const data = ocorrencias.map(ocorrencia => [
      ocorrencia.colaborador_nome,
      dayjs(ocorrencia.data_ocorrencia).format('DD/MM/YYYY'),
      ocorrencia.tipo_ocorrencia,
      ocorrencia.descricao,
      ocorrencia.valor_vale,
      ocorrencia.dias_afastamento,
      ocorrencia.status,
      ocorrencia.impacta_folha ? 'Sim' : 'Não',
      ocorrencia.data_aprovacao ? dayjs(ocorrencia.data_aprovacao).format('DD/MM/YYYY') : '',
      ocorrencia.observacoes_aprovacao || ''
    ]);

    const fileName = `ocorrencias-colaboradores-${mesFilter}-${anoFilter}`;
    exportToExcel(data, fileName, headers);
  };

  const getTipoColor = (tipo: string) => {
    const colors = {
      falta: 'bg-red-100 text-red-800',
      atestado: 'bg-blue-100 text-blue-800',
      vale: 'bg-green-100 text-green-800',
      advertencia: 'bg-orange-100 text-orange-800',
      atraso: 'bg-yellow-100 text-yellow-800',
      observacao: 'bg-gray-100 text-white/90'
    };
    return colors[tipo as keyof typeof colors] || 'bg-gray-100 text-white/90';
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pendente: 'bg-yellow-100 text-yellow-800',
      aprovado: 'bg-green-100 text-green-800',
      rejeitado: 'bg-red-100 text-red-800',
      processado: 'bg-blue-100 text-blue-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-white/90';
  };

  const filteredOcorrencias = ocorrencias.filter(ocorrencia => {
    const matchesSearch = ocorrencia.colaborador_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ocorrencia.descricao.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-white">Ocorrências dos Colaboradores</h3>
        <div className="flex gap-2">
          <button
            onClick={exportarOcorrencias}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-white/80 hover:bg-gray-50"
          >
            <Download className="w-4 h-4 inline mr-2" />
            Exportar Excel
          </button>
          <button
            onClick={() => openForm()}
            className="px-4 py-2 bg-[#7D1F2C] text-white rounded-lg hover:bg-[#6a1a25]"
          >
            <Plus className="w-4 h-4 inline mr-2" />
            Nova Ocorrência
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
              <Activity className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-500">Total de Ocorrências</p>
                <p className="text-2xl font-bold text-blue-600">
                  {indicadores.total_ocorrencias}
                </p>
                <p className="text-sm text-gray-600">Registradas</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <Clock className="w-8 h-8 text-orange-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-500">Pendentes</p>
                <p className="text-2xl font-bold text-orange-600">
                  {indicadores.ocorrencias_pendentes}
                </p>
                <p className="text-sm text-gray-600">Aguardando aprovação</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <TrendingUp className="w-8 h-8 text-green-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-500">Este Mês</p>
                <p className="text-2xl font-bold text-green-600">
                  {indicadores.ocorrencias_mes}
                </p>
                <p className="text-sm text-gray-600">Ocorrências</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-purple-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-500">Colaboradores</p>
                <p className="text-2xl font-bold text-purple-600">
                  {indicadores.colaboradores_com_ocorrencias}
                </p>
                <p className="text-sm text-gray-600">Com ocorrências</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7D1F2C] focus:border-[#7D1F2C]"
              />
            </div>
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
              value={tipoFilter}
              onChange={(e) => setTipoFilter(e.target.value as any)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#7D1F2C] focus:border-[#7D1F2C]"
            >
              <option value="all">Todos os Tipos</option>
              <option value="falta">Falta</option>
              <option value="atestado">Atestado</option>
              <option value="vale">Vale</option>
              <option value="advertencia">Advertência</option>
              <option value="atraso">Atraso</option>
              <option value="observacao">Observação</option>
            </select>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#7D1F2C] focus:border-[#7D1F2C]"
            >
              <option value="all">Todos os Status</option>
              <option value="pendente">Pendente</option>
              <option value="aprovado">Aprovado</option>
              <option value="rejeitado">Rejeitado</option>
              <option value="processado">Processado</option>
            </select>
          </div>

          <div>
            <select
              value={mesFilter}
              onChange={(e) => setMesFilter(parseInt(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#7D1F2C] focus:border-[#7D1F2C]"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {dayjs().month(i).format('MMMM')}
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
              {Array.from({ length: 3 }, (_, i) => dayjs().year() - 1 + i).map(ano => (
                <option key={ano} value={ano}>
                  {ano}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Lista de Ocorrências */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#7D1F2C]"></div>
          </div>
        ) : filteredOcorrencias.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left bg-gray-50 border-b">
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Colaborador
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Descrição
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor/Dias
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
                {filteredOcorrencias.map((ocorrencia) => (
                  <tr key={ocorrencia.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <User className="w-5 h-5 text-gray-400 mr-2" />
                        <div className="font-medium text-white">
                          {ocorrencia.colaborador_nome}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {dayjs(ocorrencia.data_ocorrencia).format('DD/MM/YYYY')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTipoColor(ocorrencia.tipo_ocorrencia)}`}>
                        {ocorrencia.tipo_ocorrencia}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-white max-w-xs truncate">
                        {ocorrencia.descricao}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-white">
                        {ocorrencia.valor_vale > 0 && (
                          <div>{formatCurrency(ocorrencia.valor_vale)}</div>
                        )}
                        {ocorrencia.dias_afastamento > 0 && (
                          <div>{ocorrencia.dias_afastamento} dias</div>
                        )}
                        {ocorrencia.valor_vale === 0 && ocorrencia.dias_afastamento === 0 && '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(ocorrencia.status)}`}>
                        {ocorrencia.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-2">
                        {ocorrencia.status === 'pendente' && (
                          <>
                            <button
                              onClick={() => aprovarOcorrencia(ocorrencia.id)}
                              className="text-green-600 hover:text-green-800"
                              title="Aprovar"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => rejeitarOcorrencia(ocorrencia.id)}
                              className="text-red-600 hover:text-red-800"
                              title="Rejeitar"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {ocorrencia.tipo_ocorrencia === 'vale' && ocorrencia.valor_vale > 0 && (
                          <>
                            <button
                              onClick={() => gerarReciboVale(ocorrencia)}
                              className="text-blue-600 hover:text-blue-800"
                              title="Gerar Recibo do Vale"
                            >
                              <Receipt className="w-4 h-4" />
                            </button>
                            {ocorrencia.status !== 'processado' && (
                              <button
                                onClick={() => encaminharParaContasPagar(ocorrencia)}
                                className="text-purple-600 hover:text-purple-800"
                                title="Encaminhar para Contas a Pagar"
                              >
                                <Send className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        )}
                        <button
                          onClick={() => openForm(ocorrencia)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => confirmDelete(ocorrencia.id)}
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
        ) : (
          <div className="text-center py-12">
            <AlertTriangle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">Nenhuma ocorrência encontrada</h3>
            <p className="text-gray-500">
              Não há ocorrências registradas para os filtros selecionados.
            </p>
          </div>
        )}
      </div>

      {/* Modal do Formulário */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-white mb-4">
              {editingOcorrencia ? 'Editar Ocorrência' : 'Nova Ocorrência'}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-white/80 mb-1">
                  Colaborador *
                </label>
                <select
                  value={formData.colaborador_id}
                  onChange={(e) => setFormData({ ...formData, colaborador_id: e.target.value })}
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

              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">
                  Data da Ocorrência *
                </label>
                <input
                  type="date"
                  value={formData.data_ocorrencia}
                  onChange={(e) => setFormData({ ...formData, data_ocorrencia: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">
                  Tipo de Ocorrência *
                </label>
                <select
                  value={formData.tipo_ocorrencia}
                  onChange={(e) => setFormData({ ...formData, tipo_ocorrencia: e.target.value as any })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  required
                >
                  <option value="observacao">Observação</option>
                  <option value="falta">Falta</option>
                  <option value="atestado">Atestado</option>
                  <option value="vale">Vale</option>
                  <option value="advertencia">Advertência</option>
                  <option value="atraso">Atraso</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-white/80 mb-1">
                  Descrição *
                </label>
                <textarea
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  rows={3}
                  placeholder="Descreva a ocorrência..."
                  required
                />
              </div>

              {formData.tipo_ocorrencia === 'vale' && (
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">
                    Valor do Vale
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">R$</span>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.valor_vale}
                      onChange={(e) => setFormData({ ...formData, valor_vale: parseFloat(e.target.value) || 0 })}
                      className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                    />
                  </div>
                </div>
              )}

              {(formData.tipo_ocorrencia === 'falta' || formData.tipo_ocorrencia === 'atestado') && (
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">
                    Dias de Afastamento
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.dias_afastamento}
                    onChange={(e) => setFormData({ ...formData, dias_afastamento: parseInt(e.target.value) || 0 })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  />
                </div>
              )}

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-white/80 mb-1">
                  Documento Anexo (URL)
                </label>
                <input
                  type="url"
                  value={formData.documento_anexo}
                  onChange={(e) => setFormData({ ...formData, documento_anexo: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  placeholder="https://..."
                />
              </div>

              <div className="md:col-span-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.impacta_folha}
                    onChange={(e) => setFormData({ ...formData, impacta_folha: e.target.checked })}
                    className="rounded border-gray-300 text-[#7D1F2C] focus:ring-[#7D1F2C]"
                  />
                  <span className="ml-2 text-sm text-white/80">
                    Esta ocorrência impacta a folha de pagamento
                  </span>
                </label>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingOcorrencia(null);
                  resetForm();
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-white/80 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={loading || !formData.colaborador_id || !formData.descricao}
                className="px-4 py-2 bg-[#7D1F2C] text-white rounded-md hover:bg-[#6a1a25] disabled:opacity-50"
              >
                {loading ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {showDeleteConfirm && itemToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-white mb-4">
              Confirmar Exclusão
            </h3>
            
            <p className="text-gray-600 mb-6">
              Tem certeza que deseja excluir esta ocorrência? Esta ação não pode ser desfeita.
            </p>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setItemToDelete(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-white/80 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(itemToDelete)}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OcorrenciasColaborador;