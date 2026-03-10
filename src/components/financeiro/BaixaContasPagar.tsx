import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, DollarSign, Calendar, CreditCard, Building2, FileText, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import dayjs from 'dayjs';

interface ContaAutorizada {
  id: string;
  fornecedor_id: string;
  fornecedor_nome: string;
  descricao: string;
  categoria_nome?: string;
  valor_total: number;
  valor_pago: number;
  saldo_restante: number;
  data_vencimento: string;
  numero_documento?: string;
  observacoes?: string;
}

interface FormaPagamento {
  id: string;
  nome: string;
}

interface ContaBancaria {
  id: string;
  banco: string;
  tipo_conta: string;
  numero_conta?: string;
  saldo_atual: number;
}

interface BaixaModal {
  isOpen: boolean;
  conta: ContaAutorizada | null;
  valorPagamento: number;
  dataPagamento: string;
  formaPagamentoId: string;
  contaBancariaId: string;
  numeroComprovante: string;
  observacoes: string;
}

const BaixaContasPagar: React.FC = () => {
  const [contas, setContas] = useState<ContaAutorizada[]>([]);
  const [formasPagamento, setFormasPagamento] = useState<FormaPagamento[]>([]);
  const [contasBancarias, setContasBancarias] = useState<ContaBancaria[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [baixaModal, setBaixaModal] = useState<BaixaModal>({
    isOpen: false,
    conta: null,
    valorPagamento: 0,
    dataPagamento: dayjs().format('YYYY-MM-DD'),
    formaPagamentoId: '',
    contaBancariaId: '',
    numeroComprovante: '',
    observacoes: ''
  });

  const calcularJuros = () => {
    if (!baixaModal.conta) return 0;
    const diferenca = baixaModal.valorPagamento - baixaModal.conta.saldo_restante;
    return diferenca > 0 ? diferenca : 0;
  };

  useEffect(() => {
    fetchData();
    fetchFormData();
  }, []);

  const fetchFormData = async () => {
    try {
      const [formasRes, contasRes] = await Promise.all([
        supabase.from('formas_pagamento').select('*').eq('status', 'ativo'),
        supabase.from('vw_bancos_contas_saldo').select('*').eq('status', 'ativo')
      ]);

      setFormasPagamento(formasRes.data || []);
      setContasBancarias(contasRes.data || []);
    } catch (err) {
      console.error('Error fetching form data:', err);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('vw_contas_pagar')
        .select('*')
        .eq('status', 'autorizado_pagamento')
        .order('data_vencimento', { ascending: true });

      if (error) throw error;
      setContas(data || []);
    } catch (err) {
      console.error('Error fetching authorized accounts:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar contas autorizadas');
    } finally {
      setLoading(false);
    }
  };

  const abrirModalBaixa = (conta: ContaAutorizada) => {
    setBaixaModal({
      isOpen: true,
      conta,
      valorPagamento: conta.saldo_restante,
      dataPagamento: dayjs().format('YYYY-MM-DD'),
      formaPagamentoId: '',
      contaBancariaId: '',
      numeroComprovante: '',
      observacoes: ''
    });
  };

  const fecharModal = () => {
    setBaixaModal({
      isOpen: false,
      conta: null,
      valorPagamento: 0,
      dataPagamento: dayjs().format('YYYY-MM-DD'),
      formaPagamentoId: '',
      contaBancariaId: '',
      numeroComprovante: '',
      observacoes: ''
    });
  };

  const handleDarBaixa = async () => {
    if (!baixaModal.conta) return;

    try {
      setLoading(true);
      setError(null);

      if (!baixaModal.formaPagamentoId || !baixaModal.contaBancariaId) {
        throw new Error('Selecione a forma de pagamento e a conta bancária');
      }

      if (baixaModal.valorPagamento <= 0) {
        throw new Error('Valor de pagamento deve ser maior que zero');
      }

      const jurosCalculados = calcularJuros();
      console.log('💰 Dando baixa na conta:', {
        saldo_restante: baixaModal.conta.saldo_restante,
        valor_pagamento: baixaModal.valorPagamento,
        juros_calculados: jurosCalculados
      });

      const { data: userData } = await supabase.auth.getUser();

      const { error: rpcError } = await supabase.rpc('api_fin_dar_baixa_conta', {
        p_conta_pagar_id: baixaModal.conta.id,
        p_valor_pagamento: baixaModal.valorPagamento,
        p_data_pagamento: baixaModal.dataPagamento,
        p_forma_pagamento_id: baixaModal.formaPagamentoId,
        p_conta_bancaria_id: baixaModal.contaBancariaId,
        p_numero_comprovante: baixaModal.numeroComprovante || null,
        p_observacoes: baixaModal.observacoes || null,
        p_usuario: userData?.user?.id || null
      });

      if (rpcError) {
        console.error('❌ Erro da função RPC:', rpcError);
        throw rpcError;
      }

      console.log('✅ Baixa registrada com sucesso!');

      fecharModal();
      fetchData();
    } catch (err) {
      console.error('Error recording payment:', err);
      setError(err instanceof Error ? err.message : 'Erro ao dar baixa');
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

  const filteredContas = contas.filter(conta => {
    const matchesSearch = conta.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         conta.fornecedor_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         conta.numero_documento?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Baixa de Contas Autorizadas</h3>
        <div className="text-sm text-gray-600">
          {contas.length} conta(s) autorizada(s) | Total: {formatCurrency(contas.reduce((sum, c) => sum + c.saldo_restante, 0))}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
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
                    Fornecedor
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
                    Saldo Restante
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
                        <div className="font-medium text-gray-900">{conta.fornecedor_nome}</div>
                        {conta.numero_documento && (
                          <div className="text-sm text-gray-500">Doc: {conta.numero_documento}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{conta.descricao}</div>
                        {conta.categoria_nome && (
                          <div className="text-sm text-gray-500">{conta.categoria_nome}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {dayjs(conta.data_vencimento).format('DD/MM/YYYY')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-medium text-gray-900">
                        {formatCurrency(conta.valor_total)}
                      </span>
                      {conta.valor_pago > 0 && (
                        <div className="text-sm text-green-600">
                          Pago: {formatCurrency(conta.valor_pago)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-medium text-orange-600">
                        {formatCurrency(conta.saldo_restante)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => abrirModalBaixa(conta)}
                        className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                      >
                        <DollarSign className="w-4 h-4 inline mr-1" />
                        Dar Baixa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredContas.length === 0 && (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma conta autorizada para pagamento</h3>
              <p className="text-gray-500">
                {searchTerm
                  ? 'Nenhuma conta corresponde aos filtros aplicados.'
                  : 'Todas as contas autorizadas foram pagas ou ainda não foram aprovadas.'}
              </p>
            </div>
          )}
        </div>
      )}

      {baixaModal.isOpen && baixaModal.conta && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Dar Baixa em Conta a Pagar
            </h3>

            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-sm">
                <div className="font-medium text-gray-900 mb-1">{baixaModal.conta.fornecedor_nome}</div>
                <div className="text-gray-700 mb-1">{baixaModal.conta.descricao}</div>
                <div className="text-gray-600">
                  <span className="font-medium">Valor Total:</span> {formatCurrency(baixaModal.conta.valor_total)}
                </div>
                <div className="text-gray-600">
                  <span className="font-medium">Valor Pago:</span> {formatCurrency(baixaModal.conta.valor_pago)}
                </div>
                <div className="text-orange-600 font-medium">
                  <span className="font-medium">Saldo Restante:</span> {formatCurrency(baixaModal.conta.saldo_restante)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valor do Pagamento *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">R$</span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={baixaModal.valorPagamento}
                    onChange={(e) => setBaixaModal({
                      ...baixaModal,
                      valorPagamento: parseFloat(e.target.value) || 0
                    })}
                    className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                    required
                  />
                </div>
                {calcularJuros() > 0 ? (
                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-xs text-yellow-800">
                      <strong>⚠️ Juros por Atraso:</strong> {formatCurrency(calcularJuros())}
                    </p>
                    <p className="text-xs text-yellow-700 mt-1">
                      O valor excede o saldo restante. A diferença será registrada como juros por atraso.
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 mt-1">
                    Saldo restante: {formatCurrency(baixaModal.conta.saldo_restante)}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data do Pagamento *
                </label>
                <input
                  type="date"
                  value={baixaModal.dataPagamento}
                  onChange={(e) => setBaixaModal({ ...baixaModal, dataPagamento: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Forma de Pagamento *
                </label>
                <select
                  value={baixaModal.formaPagamentoId}
                  onChange={(e) => setBaixaModal({ ...baixaModal, formaPagamentoId: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  required
                >
                  <option value="">Selecione...</option>
                  {formasPagamento.map((fp) => (
                    <option key={fp.id} value={fp.id}>
                      {fp.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Conta Bancária *
                </label>
                <select
                  value={baixaModal.contaBancariaId}
                  onChange={(e) => setBaixaModal({ ...baixaModal, contaBancariaId: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  required
                >
                  <option value="">Selecione...</option>
                  {contasBancarias.map((cb) => (
                    <option key={cb.id} value={cb.id}>
                      {cb.banco} - {cb.tipo_conta} {cb.numero_conta ? `(${cb.numero_conta})` : ''} - Saldo: {formatCurrency(cb.saldo_atual)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Número do Comprovante
                </label>
                <input
                  type="text"
                  value={baixaModal.numeroComprovante}
                  onChange={(e) => setBaixaModal({ ...baixaModal, numeroComprovante: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  placeholder="Ex: 123456"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observações
                </label>
                <textarea
                  value={baixaModal.observacoes}
                  onChange={(e) => setBaixaModal({ ...baixaModal, observacoes: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  rows={3}
                  placeholder="Observações sobre o pagamento"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={fecharModal}
                disabled={loading}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDarBaixa}
                disabled={
                  loading ||
                  !baixaModal.formaPagamentoId ||
                  !baixaModal.contaBancariaId ||
                  baixaModal.valorPagamento <= 0 ||
                  baixaModal.valorPagamento > baixaModal.conta.saldo_restante
                }
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Processando...' : 'Confirmar Baixa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BaixaContasPagar;
