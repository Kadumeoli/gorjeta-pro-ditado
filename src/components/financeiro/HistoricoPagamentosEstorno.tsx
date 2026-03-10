import React, { useState, useEffect } from 'react';
import { RotateCcw, AlertTriangle, DollarSign, Calendar, FileText, Trash2, Eye, Search, Filter, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import dayjs from 'dayjs';

interface PagamentoRealizado {
  id: string;
  valor: number;
  data: string;
  descricao: string;
  conta_pagar_id: string;
  conta_pagar_descricao?: string;
  fornecedor_nome?: string;
  forma_pagamento_nome?: string;
  conta_bancaria?: string;
  observacoes?: string;
  criado_em: string;
}

interface EstornoHistorico {
  id: string;
  fluxo_caixa_id: string;
  valor_estornado: number;
  motivo?: string;
  data_estorno: string;
  estornado_por_nome?: string;
}

const HistoricoPagamentosEstorno: React.FC = () => {
  const [pagamentos, setPagamentos] = useState<PagamentoRealizado[]>([]);
  const [estornos, setEstornos] = useState<EstornoHistorico[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEstornoModal, setShowEstornoModal] = useState(false);
  const [selectedPagamento, setSelectedPagamento] = useState<PagamentoRealizado | null>(null);
  const [motivo, setMotivo] = useState('');
  const [observacoes, setObservacoes] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [dataInicio, setDataInicio] = useState(dayjs().subtract(30, 'days').format('YYYY-MM-DD'));
  const [dataFim, setDataFim] = useState(dayjs().format('YYYY-MM-DD'));
  const [statusFiltro, setStatusFiltro] = useState<'todos' | 'ativos' | 'estornados'>('todos');
  const [valorMin, setValorMin] = useState('');
  const [valorMax, setValorMax] = useState('');
  const [formaPagamentoFiltro, setFormaPagamentoFiltro] = useState('');
  const [showFiltros, setShowFiltros] = useState(false);
  const [searchEstornos, setSearchEstornos] = useState('');

  useEffect(() => {
    fetchData();
  }, [dataInicio, dataFim]);

  const verificarJaEstornado = (fluxoId: string) => {
    return estornos.some(e => e.fluxo_caixa_id === fluxoId);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: pagamentosData, error: pagamentosError } = await supabase
        .from('fluxo_caixa')
        .select(`
          id,
          valor,
          data,
          descricao,
          conta_pagar_id,
          observacoes,
          criado_em,
          conta_bancaria_id,
          contas_pagar:conta_pagar_id (
            id,
            descricao,
            forma_pagamento_id,
            fornecedores:fornecedor_id (
              nome
            ),
            formas_pagamento:forma_pagamento_id (
              nome
            )
          ),
          bancos_contas:conta_bancaria_id (
            banco,
            tipo_conta
          )
        `)
        .eq('tipo', 'saida')
        .not('conta_pagar_id', 'is', null)
        .gte('data', dataInicio)
        .lte('data', dataFim)
        .order('data', { ascending: false });

      if (pagamentosError) throw pagamentosError;

      const formattedPagamentos = (pagamentosData || []).map((p: any) => ({
        id: p.id,
        valor: p.valor,
        data: p.data,
        descricao: p.descricao,
        conta_pagar_id: p.conta_pagar_id,
        conta_pagar_descricao: p.contas_pagar?.descricao,
        fornecedor_nome: p.contas_pagar?.fornecedores?.nome,
        forma_pagamento_nome: p.contas_pagar?.formas_pagamento?.nome,
        conta_bancaria: p.bancos_contas ? `${p.bancos_contas.banco} - ${p.bancos_contas.tipo_conta}` : null,
        observacoes: p.observacoes,
        criado_em: p.criado_em
      }));

      setPagamentos(formattedPagamentos);

      const { data: estornosData, error: estornosError } = await supabase
        .from('historico_estornos_pagamento')
        .select('*')
        .gte('data_estorno', dataInicio)
        .lte('data_estorno', dataFim)
        .order('data_estorno', { ascending: false });

      if (estornosError) throw estornosError;
      setEstornos(estornosData || []);

    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const pagamentosFiltrados = pagamentos.filter((p) => {
    const jaEstornado = verificarJaEstornado(p.id);

    if (statusFiltro === 'ativos' && jaEstornado) return false;
    if (statusFiltro === 'estornados' && !jaEstornado) return false;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchFornecedor = p.fornecedor_nome?.toLowerCase().includes(term);
      const matchDescricao = p.descricao?.toLowerCase().includes(term) ||
                           p.conta_pagar_descricao?.toLowerCase().includes(term);
      const matchObservacoes = p.observacoes?.toLowerCase().includes(term);

      if (!matchFornecedor && !matchDescricao && !matchObservacoes) return false;
    }

    if (valorMin && p.valor < parseFloat(valorMin)) return false;
    if (valorMax && p.valor > parseFloat(valorMax)) return false;

    if (formaPagamentoFiltro && p.forma_pagamento_nome !== formaPagamentoFiltro) return false;

    return true;
  });

  const formasPagamento = Array.from(new Set(pagamentos.map(p => p.forma_pagamento_nome).filter(Boolean)));

  const estornosFiltrados = estornos.filter((e) => {
    if (searchEstornos) {
      const term = searchEstornos.toLowerCase();
      const matchMotivo = e.motivo?.toLowerCase().includes(term);
      const matchUsuario = e.estornado_por_nome?.toLowerCase().includes(term);

      if (!matchMotivo && !matchUsuario) return false;
    }

    return true;
  });

  const limparFiltros = () => {
    setSearchTerm('');
    setDataInicio(dayjs().subtract(30, 'days').format('YYYY-MM-DD'));
    setDataFim(dayjs().format('YYYY-MM-DD'));
    setStatusFiltro('todos');
    setValorMin('');
    setValorMax('');
    setFormaPagamentoFiltro('');
    setSearchEstornos('');
  };

  const abrirModalEstorno = (pagamento: PagamentoRealizado) => {
    setSelectedPagamento(pagamento);
    setMotivo('');
    setObservacoes('');
    setShowEstornoModal(true);
  };

  const fecharModal = () => {
    setShowEstornoModal(false);
    setSelectedPagamento(null);
    setMotivo('');
    setObservacoes('');
  };

  const handleEstornar = async () => {
    if (!selectedPagamento) return;

    if (!motivo.trim()) {
      alert('Por favor, informe o motivo do estorno');
      return;
    }

    if (!confirm(`Confirma o estorno do pagamento de ${formatCurrency(selectedPagamento.valor)}?\n\nEsta ação não pode ser desfeita e irá:\n- Excluir o lançamento do fluxo de caixa\n- Ajustar o saldo da conta a pagar\n- Registrar o estorno no histórico`)) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('estornar_pagamento_parcial', {
        p_fluxo_caixa_id: selectedPagamento.id,
        p_motivo: motivo,
        p_observacoes: observacoes || null
      });

      if (rpcError) throw rpcError;

      const result = data as { success: boolean; error?: string; message?: string };

      if (!result.success) {
        throw new Error(result.error || 'Erro ao processar estorno');
      }

      alert(result.message || 'Estorno realizado com sucesso!');
      fecharModal();
      fetchData();
    } catch (err) {
      console.error('Error processing reversal:', err);
      setError(err instanceof Error ? err.message : 'Erro ao processar estorno');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Histórico de Pagamentos e Estornos</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFiltros(!showFiltros)}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filtros
          </button>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Atualizar
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-100 text-red-700 rounded-lg flex items-center">
          <AlertTriangle className="w-5 h-5 mr-2" />
          {error}
        </div>
      )}

      {showFiltros && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-base font-medium text-gray-900 flex items-center">
              <Filter className="w-5 h-5 mr-2" />
              Filtros de Pesquisa
            </h4>
            <button
              onClick={limparFiltros}
              className="text-sm text-gray-600 hover:text-gray-800 flex items-center"
            >
              <X className="w-4 h-4 mr-1" />
              Limpar Filtros
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Buscar
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Fornecedor, descrição..."
                  className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Início
              </label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Fim
              </label>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={statusFiltro}
                onChange={(e) => setStatusFiltro(e.target.value as any)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
              >
                <option value="todos">Todos</option>
                <option value="ativos">Apenas Ativos</option>
                <option value="estornados">Apenas Estornados</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Forma de Pagamento
              </label>
              <select
                value={formaPagamentoFiltro}
                onChange={(e) => setFormaPagamentoFiltro(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
              >
                <option value="">Todas</option>
                {formasPagamento.map((forma) => (
                  <option key={forma} value={forma}>{forma}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Valor Mínimo
              </label>
              <input
                type="number"
                step="0.01"
                value={valorMin}
                onChange={(e) => setValorMin(e.target.value)}
                placeholder="0,00"
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Valor Máximo
              </label>
              <input
                type="number"
                step="0.01"
                value={valorMax}
                onChange={(e) => setValorMax(e.target.value)}
                placeholder="0,00"
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
              />
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              {pagamentosFiltrados.length} pagamento(s) encontrado(s)
            </p>
            <button
              onClick={() => setShowFiltros(false)}
              className="text-sm text-[#7D1F2C] hover:text-[#5D1520] font-medium"
            >
              Ocultar Filtros
            </button>
          </div>
        </div>
      )}

      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
        <div className="flex items-start">
          <AlertTriangle className="h-5 w-5 text-yellow-400 mt-0.5 mr-3" />
          <div>
            <p className="text-sm font-medium text-yellow-800">
              Atenção ao estornar pagamentos
            </p>
            <p className="text-sm text-yellow-700 mt-1">
              O estorno irá excluir o lançamento do fluxo de caixa e ajustar automaticamente o saldo da conta a pagar.
              Esta ação é irreversível e deve ser usada apenas para corrigir erros.
            </p>
          </div>
        </div>
      </div>

      {/* Pagamentos Recentes */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h4 className="text-base font-medium text-gray-900">Pagamentos Realizados</h4>
            <span className="text-sm text-gray-600">
              {pagamentosFiltrados.length} de {pagamentos.length} pagamento(s)
            </span>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#7D1F2C]"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left bg-gray-50 border-b">
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fornecedor
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Descrição
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor Pago
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Forma Pagamento
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
                {pagamentosFiltrados.map((pagamento) => {
                  const jaEstornado = verificarJaEstornado(pagamento.id);

                  return (
                    <tr key={pagamento.id} className={jaEstornado ? 'bg-red-50' : 'hover:bg-gray-50'}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                          {dayjs(pagamento.data).format('DD/MM/YYYY')}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {pagamento.fornecedor_nome || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{pagamento.conta_pagar_descricao || pagamento.descricao}</div>
                        {pagamento.observacoes && (
                          <div className="text-xs text-gray-500 mt-1">{pagamento.observacoes}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm font-medium text-red-600">
                          <DollarSign className="w-4 h-4 mr-1" />
                          {formatCurrency(pagamento.valor)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {pagamento.forma_pagamento_nome || '-'}
                        </div>
                        {pagamento.conta_bancaria && (
                          <div className="text-xs text-gray-500">{pagamento.conta_bancaria}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {jaEstornado ? (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">
                            ESTORNADO
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                            Ativo
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {!jaEstornado && (
                          <button
                            onClick={() => abrirModalEstorno(pagamento)}
                            className="px-3 py-1 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 flex items-center"
                          >
                            <RotateCcw className="w-4 h-4 mr-1" />
                            Estornar
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {pagamentosFiltrados.length === 0 && (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum pagamento encontrado</h3>
                <p className="text-gray-500">
                  {pagamentos.length === 0
                    ? 'Não há pagamentos realizados no período selecionado.'
                    : 'Nenhum pagamento corresponde aos filtros aplicados.'}
                </p>
                {pagamentos.length > 0 && (
                  <button
                    onClick={limparFiltros}
                    className="mt-4 text-[#7D1F2C] hover:text-[#5D1520] text-sm font-medium"
                  >
                    Limpar filtros
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Histórico de Estornos */}
      {estornos.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-base font-medium text-gray-900">Histórico de Estornos</h4>
              <span className="text-sm text-gray-600">
                {estornosFiltrados.length} de {estornos.length} estorno(s)
              </span>
            </div>
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={searchEstornos}
                onChange={(e) => setSearchEstornos(e.target.value)}
                placeholder="Buscar por motivo ou usuário..."
                className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left bg-gray-50 border-b">
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data Estorno
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor Estornado
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Motivo
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estornado Por
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {estornosFiltrados.map((estorno) => (
                  <tr key={estorno.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {dayjs(estorno.data_estorno).format('DD/MM/YYYY HH:mm')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-medium text-red-600">
                        {formatCurrency(estorno.valor_estornado)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{estorno.motivo || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {estorno.estornado_por_nome || 'Sistema'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {estornosFiltrados.length === 0 && estornos.length > 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">Nenhum estorno corresponde à busca realizada.</p>
                <button
                  onClick={() => setSearchEstornos('')}
                  className="mt-2 text-[#7D1F2C] hover:text-[#5D1520] text-sm font-medium"
                >
                  Limpar busca
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Estorno */}
      {showEstornoModal && selectedPagamento && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <RotateCcw className="w-5 h-5 mr-2 text-orange-600" />
              Estornar Pagamento
            </h3>

            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start">
                <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5 mr-3" />
                <div className="text-sm">
                  <p className="font-medium text-red-800">Atenção: Esta ação é irreversível!</p>
                  <p className="text-red-700 mt-1">
                    O pagamento será estornado e o saldo da conta a pagar será ajustado automaticamente.
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-sm space-y-2">
                <div>
                  <span className="font-medium text-gray-700">Fornecedor:</span>{' '}
                  <span className="text-gray-900">{selectedPagamento.fornecedor_nome}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Descrição:</span>{' '}
                  <span className="text-gray-900">{selectedPagamento.conta_pagar_descricao || selectedPagamento.descricao}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Data Pagamento:</span>{' '}
                  <span className="text-gray-900">{dayjs(selectedPagamento.data).format('DD/MM/YYYY')}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Valor Pago:</span>{' '}
                  <span className="text-red-600 font-medium">{formatCurrency(selectedPagamento.valor)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Motivo do Estorno *
                </label>
                <select
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  required
                >
                  <option value="">Selecione o motivo...</option>
                  <option value="Pagamento duplicado">Pagamento duplicado</option>
                  <option value="Valor incorreto">Valor incorreto</option>
                  <option value="Conta errada">Conta errada</option>
                  <option value="Fornecedor errado">Fornecedor errado</option>
                  <option value="Solicitação do fornecedor">Solicitação do fornecedor</option>
                  <option value="Outro erro operacional">Outro erro operacional</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observações Adicionais
                </label>
                <textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  rows={3}
                  placeholder="Descreva detalhes do motivo do estorno..."
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={fecharModal}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                onClick={handleEstornar}
                disabled={loading || !motivo}
                className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 flex items-center"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                {loading ? 'Processando...' : 'Confirmar Estorno'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoricoPagamentosEstorno;
