import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Calendar, ArrowUpRight, ArrowDownRight, Download, FileText, DollarSign, TrendingUp, TrendingDown, Activity, CreditCard, Building2, Eye, CreditCard as Edit, Trash2, Upload, Calculator, ArrowUpDown } from 'lucide-react';
import { supabase, testConnection } from '../../lib/supabase';
import { ReportGenerator, exportToExcel } from '../../utils/reportGenerator';
import dayjs from 'dayjs';
import { SearchableSelect } from '../common/SearchableSelect';

interface Transaction {
  id: string;
  tipo: 'entrada' | 'saida';
  valor: number;
  data: string;
  descricao: string;
  centro_custo?: string;
  categoria_id?: string;
  conta_bancaria_id?: string;
  forma_pagamento_id?: string;
  comprovante?: string;
  observacoes?: string;
  origem?: string;
  criado_por?: string;
  criado_em: string;
  valor_entrada?: number;
  valor_saida?: number;
  saldo_acumulado?: number;
  saldo_anterior?: number;
}

interface FormData {
  tipo: 'entrada' | 'saida' | 'transferencia';
  valor: number;
  data: string;
  descricao: string;
  centro_custo: string;
  observacoes: string;
  comprovante?: string;
  conta_bancaria_id?: string;
  conta_destino_id?: string;
}

interface IndicadoresFluxo {
  saldo_anterior: number;
  saldo_total: number;
  entradas_mes: number;
  saidas_mes: number;
  saldo_mes: number;
  total_transacoes: number;
}

interface ContaBancaria {
  id: string;
  banco: string;
  tipo_conta: string;
  numero_conta?: string;
  saldo_atual: number;
}

const FluxoCaixa: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [indicadores, setIndicadores] = useState<IndicadoresFluxo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [contasBancarias, setContasBancarias] = useState<ContaBancaria[]>([]);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFilter, setTipoFilter] = useState<'all' | 'entrada' | 'saida'>('all');
  const [dataInicial, setDataInicial] = useState(dayjs().subtract(30, 'days').format('YYYY-MM-DD'));
  const [dataFinal, setDataFinal] = useState(dayjs().format('YYYY-MM-DD'));
  const [contaBancariaFilter, setContaBancariaFilter] = useState('all');
  const [ordemVisualizacao, setOrdemVisualizacao] = useState<'asc' | 'desc'>('desc');

  const [formData, setFormData] = useState<FormData>({
    tipo: 'entrada',
    valor: 0,
    data: dayjs().format('YYYY-MM-DD'),
    descricao: '',
    centro_custo: 'Ditado Popular',
    observacoes: '',
    comprovante: '',
    conta_bancaria_id: '',
    conta_destino_id: ''
  });

  useEffect(() => {
    fetchContasBancarias();
    fetchTransactions();
    fetchIndicadores();
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      await fetchTransactions();
      if (isMounted) {
        await fetchIndicadores();
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [tipoFilter, dataInicial, dataFinal, contaBancariaFilter, ordemVisualizacao]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError(null);

      const connectionOk = await testConnection();

      if (!connectionOk) {
        console.warn('Supabase connection failed, using empty data');
        setTransactions([]);
        setLoading(false);
        return;
      }

      let query = supabase
        .from('view_extrato_fluxo_caixa')
        .select('id, data, tipo, descricao, valor, categoria_id, conta_bancaria_id, centro_custo_id, forma_pagamento_id, origem, conta_pagar_id, conta_receber_id, observacoes, criado_por, criado_em, valor_entrada, valor_saida, saldo_acumulado, saldo_anterior');

      if (tipoFilter !== 'all') {
        query = query.eq('tipo', tipoFilter);
      }

      if (dataInicial) {
        query = query.gte('data', dataInicial);
      }

      if (dataFinal) {
        query = query.lte('data', dataFinal);
      }

      if (contaBancariaFilter !== 'all') {
        query = query.eq('conta_bancaria_id', contaBancariaFilter);
      }

      // Ordem de visualização (não afeta cálculo do saldo que é feito na view)
      const isAsc = ordemVisualizacao === 'asc';
      const { data, error } = await query.order('data', { ascending: isAsc }).order('id', { ascending: isAsc });

      if (error) throw error;
      setTransactions(data || []);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      console.warn('Using empty data due to connection issues');
      setTransactions([]);
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

      const { data, error } = await supabase.rpc('calcular_indicadores_fluxo_caixa', {
        p_data_inicial: dataInicial,
        p_data_final: dataFinal,
        p_conta_bancaria_id: contaBancariaFilter !== 'all' ? contaBancariaFilter : null,
        p_tipo: tipoFilter !== 'all' ? tipoFilter : null
      });

      if (error) throw error;

      if (data && data.length > 0) {
        const resultado = data[0];
        setIndicadores({
          saldo_anterior: Number(resultado.saldo_anterior),
          saldo_total: Number(resultado.saldo_final),
          entradas_mes: Number(resultado.entradas_periodo),
          saidas_mes: Number(resultado.saidas_periodo),
          saldo_mes: Number(resultado.saldo_periodo),
          total_transacoes: Number(resultado.total_transacoes)
        });
      } else {
        setIndicadores({
          saldo_anterior: 0,
          saldo_total: 0,
          entradas_mes: 0,
          saidas_mes: 0,
          saldo_mes: 0,
          total_transacoes: 0
        });
      }
    } catch (err) {
      console.error('Error fetching indicators:', err);
      setIndicadores(null);
    }
  };

  const fetchContasBancarias = async () => {
    try {
      const { data, error } = await supabase
        .from('vw_bancos_contas_saldo')
        .select('*')
        .eq('status', 'ativo')
        .order('banco', { ascending: true });

      if (error) throw error;
      setContasBancarias(data || []);
    } catch (err) {
      console.error('Error fetching bank accounts:', err);
      setContasBancarias([]);
    }
  };

  const gerarRelatorioPDF = async () => {
    try {
      const filteredData = filteredTransactions;

      if (filteredData.length === 0) {
        alert('Nenhuma transação para gerar relatório');
        return;
      }

      const generator = new ReportGenerator({
        title: 'Relatório de Fluxo de Caixa',
        filename: 'fluxo-caixa.pdf',
        orientation: 'landscape'
      });

      // Informações de filtros para o cabeçalho
      let filtrosAplicados: string[] = [];
      filtrosAplicados.push(`Período: ${dayjs(dataInicial).format('DD/MM/YYYY')} a ${dayjs(dataFinal).format('DD/MM/YYYY')}`);

      if (tipoFilter !== 'all') {
        filtrosAplicados.push(`Filtro: ${tipoFilter === 'entrada' ? 'Apenas Entradas' : 'Apenas Saídas'}`);
      }

      if (contaBancariaFilter !== 'all') {
        const conta = contasBancarias.find(c => c.id === contaBancariaFilter);
        if (conta) {
          filtrosAplicados.push(`Conta: ${conta.banco} - ${conta.tipo_conta}`);
        }
      }

      filtrosAplicados.push(`Gerado em: ${dayjs().format('DD/MM/YYYY [às] HH:mm')}`);

      // Cabeçalho
      let currentY = generator.addHeader('RELATÓRIO DE FLUXO DE CAIXA', filtrosAplicados);

      // KPIs para o relatório
      const kpisData = [
        ['Saldo Anterior ao Período', formatCurrency(indicadores?.saldo_anterior || 0)],
        ['Total de Entradas no Período', formatCurrency(indicadores?.entradas_mes || 0)],
        ['Total de Saídas no Período', formatCurrency(indicadores?.saidas_mes || 0)],
        ['Resultado do Período (Entradas - Saídas)', formatCurrency(indicadores?.saldo_mes || 0)],
        ['Saldo Final Acumulado', formatCurrency(indicadores?.saldo_total || 0)],
        ['Quantidade de Transações', (indicadores?.total_transacoes || 0).toString()]
      ];

      // Dados da tabela de transações
      const tableHeaders = ['Data', 'Tipo', 'Descrição', 'Entrada', 'Saída', 'Saldo Acumulado'];
      const tableData = filteredData.map(t => [
        dayjs(t.data).format('DD/MM/YYYY'),
        t.tipo === 'entrada' ? 'Entrada' : 'Saída',
        t.descricao || '',
        t.tipo === 'entrada' ? formatCurrency(t.valor) : '-',
        t.tipo === 'saida' ? formatCurrency(t.valor) : '-',
        formatCurrency(t.saldo_acumulado || 0)
      ]);

      // Usar o método especializado para fluxo de caixa
      generator.addFluxoCaixaTable(tableHeaders, tableData, currentY, kpisData);

      const filename = `fluxo-caixa-${dayjs().format('YYYY-MM-DD-HHmm')}.pdf`;
      generator.save(filename);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Erro ao gerar relatório PDF');
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);

      // Validar campos obrigatórios
      if (formData.tipo === 'transferencia') {
        if (!formData.conta_bancaria_id || !formData.conta_destino_id) {
          alert('Para transferência, selecione conta de origem e destino');
          setLoading(false);
          return;
        }
        if (formData.conta_bancaria_id === formData.conta_destino_id) {
          alert('Conta de origem e destino devem ser diferentes');
          setLoading(false);
          return;
        }
      } else if ((formData.tipo === 'entrada' || formData.tipo === 'saida') && !formData.conta_bancaria_id) {
        alert('Selecione uma conta bancária');
        setLoading(false);
        return;
      }

      if (formData.tipo === 'transferencia') {
        // Criar duas transações para transferência
        const valor = parseFloat(formData.valor.toString());

        // Saída da conta origem
        const { error: errorSaida } = await supabase
          .from('fluxo_caixa')
          .insert([{
            tipo: 'saida',
            valor: valor,
            data: formData.data,
            descricao: `Transferência para ${contasBancarias.find(c => c.id === formData.conta_destino_id)?.banco} - ${formData.descricao}`,
            centro_custo: formData.centro_custo,
            conta_bancaria_id: formData.conta_bancaria_id,
            observacoes: formData.observacoes,
            origem: 'transferencia'
          }]);

        if (errorSaida) throw errorSaida;

        // Entrada na conta destino
        const { error: errorEntrada } = await supabase
          .from('fluxo_caixa')
          .insert([{
            tipo: 'entrada',
            valor: valor,
            data: formData.data,
            descricao: `Transferência de ${contasBancarias.find(c => c.id === formData.conta_bancaria_id)?.banco} - ${formData.descricao}`,
            centro_custo: formData.centro_custo,
            conta_bancaria_id: formData.conta_destino_id,
            observacoes: formData.observacoes,
            origem: 'transferencia'
          }]);

        if (errorEntrada) throw errorEntrada;
      } else {
        const dataToSave = {
          tipo: formData.tipo,
          valor: parseFloat(formData.valor.toString()),
          data: formData.data,
          descricao: formData.descricao,
          centro_custo: formData.centro_custo,
          conta_bancaria_id: formData.conta_bancaria_id,
          observacoes: formData.observacoes,
          comprovante: formData.comprovante,
          origem: 'manual'
        };

        if (editingTransaction) {
          const { error } = await supabase
            .from('fluxo_caixa')
            .update(dataToSave)
            .eq('id', editingTransaction.id);

          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('fluxo_caixa')
            .insert([dataToSave]);

          if (error) throw error;
        }
      }

      setShowForm(false);
      setEditingTransaction(null);
      resetForm();
      fetchTransactions();
      fetchIndicadores();
      fetchContasBancarias();
    } catch (err) {
      console.error('Error saving transaction:', err);
      setError(err instanceof Error ? err.message : 'Erro ao salvar transação');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta transação?')) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('fluxo_caixa')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchTransactions();
      fetchIndicadores();
    } catch (err) {
      console.error('Error deleting transaction:', err);
      setError(err instanceof Error ? err.message : 'Erro ao excluir transação');
    } finally {
      setLoading(false);
    }
  };

  const openForm = (transaction?: Transaction) => {
    if (transaction) {
      setEditingTransaction(transaction);
      setFormData({
        tipo: transaction.tipo,
        valor: transaction.valor,
        data: transaction.data,
        descricao: transaction.descricao,
        centro_custo: transaction.centro_custo,
        observacoes: transaction.observacoes || '',
        comprovante: transaction.comprovante || '',
        conta_bancaria_id: transaction.conta_bancaria_id || '',
        conta_destino_id: ''
      });
    } else {
      setEditingTransaction(null);
      resetForm();
    }
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      tipo: 'entrada',
      valor: 0,
      data: dayjs().format('YYYY-MM-DD'),
      descricao: '',
      centro_custo: 'Ditado Popular',
      observacoes: '',
      comprovante: '',
      conta_bancaria_id: '',
      conta_destino_id: ''
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('comprovantes')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('comprovantes')
        .getPublicUrl(filePath);

      setFormData({ ...formData, comprovante: publicUrl });
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  };

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = (transaction.descricao || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (transaction.centro_custo || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const exportData = () => {
    if (filteredTransactions.length === 0) {
      alert('Não há dados para exportar');
      return;
    }

    const headers = [
      'Data',
      'Descrição',
      'Entrada',
      'Saída',
      'Saldo Acumulado',
      'Observações'
    ];

    const data = filteredTransactions.map(transaction => [
      dayjs(transaction.data).format('DD/MM/YYYY'),
      transaction.descricao,
      transaction.tipo === 'entrada' ? transaction.valor : '',
      transaction.tipo === 'saida' ? transaction.valor : '',
      transaction.saldo_acumulado || 0,
      transaction.observacoes || ''
    ]);

    const fileName = `fluxo-caixa-${dayjs().format('YYYY-MM-DD')}`;
    exportToExcel(data, fileName, headers);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Fluxo de Caixa</h3>
        <div className="flex gap-2">
          <button
            onClick={gerarRelatorioPDF}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            <FileText className="w-4 h-4 inline mr-2" />
            Relatório PDF
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
            Novo Lançamento
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* Aviso Informativo */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <Activity className="h-5 w-5 text-blue-600 mt-0.5" />
          </div>
          <div className="ml-3 flex-1">
            <p className="text-sm font-medium text-blue-900">
              Resumo do Período Filtrado
            </p>
            <p className="mt-1 text-xs text-blue-700">
              Os valores exibidos abaixo representam o TOTAL do período selecionado ({dayjs(dataInicial).format('DD/MM')} a {dayjs(dataFinal).format('DD/MM/YYYY')}).
              Para ver movimentações dia por dia, acesse <span className="font-semibold">Extrato Diário</span> no menu Financeiro.
            </p>
          </div>
        </div>
      </div>

      {/* Indicadores */}
      {indicadores && (
        <>
          {/* Card de Saldo Anterior */}
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-lg shadow-md border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700 mb-1">Saldo Anterior ao Período</p>
                <p className={`text-3xl font-bold ${indicadores.saldo_anterior >= 0 ? 'text-blue-900' : 'text-red-700'}`}>
                  {formatCurrency(indicadores.saldo_anterior)}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Acumulado até {dayjs(dataInicial).subtract(1, 'day').format('DD/MM/YYYY')}
                </p>
              </div>
              <div className="w-14 h-14 bg-blue-200 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-7 h-7 text-blue-700" />
              </div>
            </div>
          </div>

          {/* Cards de Movimentação do Período */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Entradas no Período</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(indicadores.entradas_mes)}
                  </p>
                  <p className="text-[11px] text-gray-500 mt-1 font-medium">
                    TOTAL de {dayjs(dataInicial).format('DD/MM')} a {dayjs(dataFinal).format('DD/MM/YYYY')}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <ArrowUpRight className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Saídas no Período</p>
                  <p className="text-2xl font-bold text-red-600">
                    {formatCurrency(indicadores.saidas_mes)}
                  </p>
                  <p className="text-[11px] text-gray-500 mt-1 font-medium">
                    TOTAL de {dayjs(dataInicial).format('DD/MM')} a {dayjs(dataFinal).format('DD/MM/YYYY')}
                  </p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <ArrowDownRight className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </div>

            <div className={`p-6 rounded-lg shadow-sm border-2 ${
              indicadores.saldo_mes >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-semibold mb-1 ${indicadores.saldo_mes >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                    Resultado do Período
                  </p>
                  <p className={`text-2xl font-bold ${indicadores.saldo_mes >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {indicadores.saldo_mes >= 0 ? '+' : ''}{formatCurrency(indicadores.saldo_mes)}
                  </p>
                  <p className={`text-[11px] font-medium mt-1 ${indicadores.saldo_mes >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    Apenas {dayjs(dataInicial).format('DD/MM')} a {dayjs(dataFinal).format('DD/MM')}
                  </p>
                </div>
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  indicadores.saldo_mes >= 0 ? 'bg-green-200' : 'bg-red-200'
                }`}>
                  <Activity className={`w-6 h-6 ${indicadores.saldo_mes >= 0 ? 'text-green-700' : 'text-red-700'}`} />
                </div>
              </div>
            </div>
          </div>

          {/* Card de Saldo Final */}
          <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 p-6 rounded-lg shadow-md border-2 border-yellow-300">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-semibold text-yellow-800 mb-1 flex items-center gap-2">
                  Saldo Acumulado
                  <span className="text-[10px] bg-yellow-200 px-2 py-0.5 rounded-full font-medium">TOTAL GERAL</span>
                </p>
                <p className={`text-3xl font-bold ${indicadores.saldo_total >= 0 ? 'text-yellow-900' : 'text-red-700'}`}>
                  {formatCurrency(indicadores.saldo_total)}
                </p>
                <p className="text-xs text-yellow-700 mt-1 font-medium">
                  Posição em {dayjs(dataFinal).format('DD/MM/YYYY')} (inclui todo histórico)
                </p>
              </div>
              <div className="w-14 h-14 bg-yellow-200 rounded-lg flex items-center justify-center">
                <DollarSign className="w-7 h-7 text-yellow-700" />
              </div>
            </div>
          </div>

          {/* Explicação da Conta */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-5 rounded-lg border-2 border-gray-300 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Calculator className="w-4 h-4" />
              Demonstrativo do Cálculo
            </h3>
            <div className="space-y-2 text-sm text-gray-700">
              <div className="flex justify-between items-center bg-blue-50 px-3 py-2 rounded border border-blue-200">
                <span className="font-medium text-blue-900">Saldo Anterior (até {dayjs(dataInicial).subtract(1, 'day').format('DD/MM')}):</span>
                <span className="font-mono font-bold text-blue-900">{formatCurrency(indicadores.saldo_anterior)}</span>
              </div>
              <div className="flex justify-between items-center bg-green-50 px-3 py-2 rounded border border-green-200">
                <span className="font-medium text-green-900">+ Entradas ({dayjs(dataInicial).format('DD/MM')} a {dayjs(dataFinal).format('DD/MM')}):</span>
                <span className="font-mono font-bold text-green-700">+ {formatCurrency(indicadores.entradas_mes)}</span>
              </div>
              <div className="flex justify-between items-center bg-red-50 px-3 py-2 rounded border border-red-200">
                <span className="font-medium text-red-900">- Saídas ({dayjs(dataInicial).format('DD/MM')} a {dayjs(dataFinal).format('DD/MM')}):</span>
                <span className="font-mono font-bold text-red-700">- {formatCurrency(indicadores.saidas_mes)}</span>
              </div>
              <div className="border-t-2 border-gray-400 pt-3 mt-2 flex justify-between items-center bg-yellow-50 px-3 py-3 rounded border-2 border-yellow-300">
                <span className="font-bold text-gray-900">= Saldo Acumulado Final:</span>
                <span className={`font-mono font-bold text-lg ${indicadores.saldo_total >= 0 ? 'text-yellow-900' : 'text-red-700'}`}>
                  {formatCurrency(indicadores.saldo_total)}
                </span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar transações..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7D1F2C] focus:border-[#7D1F2C]"
              />
            </div>
          </div>

          <div>
            <SearchableSelect
              options={[
                { value: 'all', label: 'Todos os Tipos' },
                { value: 'entrada', label: 'Entradas' },
                { value: 'saida', label: 'Saídas' }
              ]}
              value={tipoFilter}
              onChange={(value) => setTipoFilter(value as any)}
              placeholder="Tipo"
              theme="light"
            />
          </div>

          <div>
            <SearchableSelect
              options={[
                { value: 'all', label: 'Todas as Contas' },
                ...contasBancarias.map((c) => ({
                  value: c.id,
                  label: `${c.banco} - ${c.tipo_conta}`
                }))
              ]}
              value={contaBancariaFilter}
              onChange={(value) => setContaBancariaFilter(value)}
              placeholder="Conta Bancária"
              theme="light"
            />
          </div>

          <div>
            <input
              type="date"
              value={dataInicial}
              onChange={(e) => setDataInicial(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#7D1F2C] focus:border-[#7D1F2C]"
            />
          </div>

          <div>
            <input
              type="date"
              value={dataFinal}
              onChange={(e) => setDataFinal(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#7D1F2C] focus:border-[#7D1F2C]"
            />
          </div>
        </div>
      </div>

      {/* Extrato Bancário */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#7D1F2C]"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-[#7D1F2C] to-[#5a1520] px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Extrato Bancário - Movimentações Linha a Linha
                </h3>
                <p className="text-sm text-gray-200 mt-1">
                  Ordenação cronológica com saldo acumulado progressivo
                </p>
              </div>
              <button
                onClick={() => setOrdemVisualizacao(ordemVisualizacao === 'asc' ? 'desc' : 'asc')}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors"
                title={ordemVisualizacao === 'asc' ? 'Mais antigas primeiro' : 'Mais recentes primeiro'}
              >
                <ArrowUpDown className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {ordemVisualizacao === 'asc' ? 'Mais antigas primeiro' : 'Mais recentes primeiro'}
                </span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left bg-gray-50 border-b-2 border-gray-300">
                  <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Descrição
                  </th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase tracking-wider text-right">
                    Entrada (+)
                  </th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase tracking-wider text-right">
                    Saída (-)
                  </th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase tracking-wider text-right bg-yellow-50">
                    Saldo
                  </th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase tracking-wider text-center">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTransactions.map((transaction, index) => (
                  <tr key={transaction.id} className={`hover:bg-blue-50 transition-colors ${
                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                  }`}>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {dayjs(transaction.data).format('DD/MM/YYYY')}
                      </div>
                      <div className="text-xs text-gray-500">
                        {dayjs(transaction.data).format('ddd')}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-2">
                        {transaction.tipo === 'entrada' ? (
                          <ArrowUpRight className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                        ) : (
                          <ArrowDownRight className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 text-sm truncate">
                            {transaction.descricao}
                          </div>
                          {transaction.observacoes && (
                            <div className="text-xs text-gray-500 truncate mt-0.5">
                              {transaction.observacoes}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      {transaction.tipo === 'entrada' ? (
                        <span className="font-semibold text-green-700 text-sm">
                          {formatCurrency(transaction.valor)}
                        </span>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      {transaction.tipo === 'saida' ? (
                        <span className="font-semibold text-red-700 text-sm">
                          {formatCurrency(transaction.valor)}
                        </span>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right bg-yellow-50">
                      <span className={`font-bold text-sm ${
                        (transaction.saldo_acumulado || 0) >= 0 ? 'text-blue-900' : 'text-red-700'
                      }`}>
                        {formatCurrency(transaction.saldo_acumulado || 0)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex justify-center space-x-2">
                        <button
                          onClick={() => openForm(transaction)}
                          className="text-blue-600 hover:text-blue-800 hover:bg-blue-100 p-1.5 rounded transition-colors"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(transaction.id)}
                          className="text-red-600 hover:text-red-800 hover:bg-red-100 p-1.5 rounded transition-colors"
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

          {filteredTransactions.length === 0 && (
            <div className="text-center py-12">
              <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma transação encontrada</h3>
              <p className="text-gray-500">
                {searchTerm || tipoFilter !== 'all' || contaBancariaFilter !== 'all'
                  ? 'Nenhuma transação corresponde aos filtros aplicados.'
                  : 'Nenhuma transação registrada no período.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Modal do Formulário */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {editingTransaction ? 'Editar Lançamento' : 'Novo Lançamento'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo *
                </label>
                <select
                  value={formData.tipo}
                  onChange={(e) => setFormData({ ...formData, tipo: e.target.value as 'entrada' | 'saida' | 'transferencia' })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  required
                  disabled={!!editingTransaction}
                >
                  <option value="entrada">Entrada</option>
                  <option value="saida">Saída</option>
                  <option value="transferencia">Transferência entre Contas</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valor *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">R$</span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formData.valor}
                    onChange={(e) => setFormData({ ...formData, valor: parseFloat(e.target.value) || 0 })}
                    className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data *
                </label>
                <input
                  type="date"
                  value={formData.data}
                  onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição *
                </label>
                <input
                  type="text"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  required
                  placeholder="Ex: Venda do dia, Pagamento fornecedor"
                />
              </div>

              {formData.tipo !== 'transferencia' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Conta Bancária *
                  </label>
                  <SearchableSelect
                    options={contasBancarias.map((conta: any) => ({
                      value: conta.id,
                      label: `${conta.banco} - ${conta.tipo_conta}`,
                      sublabel: `${conta.numero_conta ? `Conta: ${conta.numero_conta} | ` : ''}Saldo: R$ ${conta.saldo_atual.toFixed(2)}`
                    }))}
                    value={formData.conta_bancaria_id || ''}
                    onChange={(value) => setFormData({ ...formData, conta_bancaria_id: value })}
                    placeholder="Buscar conta bancária..."
                    theme="light"
                    required
                  />
                </div>
              )}

              {formData.tipo === 'transferencia' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Conta de Origem *
                    </label>
                    <SearchableSelect
                      options={contasBancarias.map((conta: any) => ({
                        value: conta.id,
                        label: `${conta.banco} - ${conta.tipo_conta}`,
                        sublabel: `${conta.numero_conta ? `Conta: ${conta.numero_conta} | ` : ''}Saldo: R$ ${conta.saldo_atual.toFixed(2)}`
                      }))}
                      value={formData.conta_bancaria_id || ''}
                      onChange={(value) => setFormData({ ...formData, conta_bancaria_id: value })}
                      placeholder="Buscar conta de origem..."
                      theme="light"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Conta de Destino *
                    </label>
                    <SearchableSelect
                      options={contasBancarias.filter(c => c.id !== formData.conta_bancaria_id).map((conta: any) => ({
                        value: conta.id,
                        label: `${conta.banco} - ${conta.tipo_conta}`,
                        sublabel: `${conta.numero_conta ? `Conta: ${conta.numero_conta} | ` : ''}Saldo: R$ ${conta.saldo_atual.toFixed(2)}`
                      }))}
                      value={formData.conta_destino_id || ''}
                      onChange={(value) => setFormData({ ...formData, conta_destino_id: value })}
                      placeholder="Buscar conta de destino..."
                      theme="light"
                      required
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observações
                </label>
                <textarea
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  rows={2}
                  placeholder="Observações adicionais..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Comprovante
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                  <div className="space-y-1 text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600">
                      <label className="relative cursor-pointer bg-white rounded-md font-medium text-[#7D1F2C] hover:text-[#6a1a25]">
                        <span>Upload de arquivo</span>
                        <input
                          type="file"
                          className="sr-only"
                          onChange={handleFileUpload}
                          accept=".pdf,.jpg,.jpeg,.png"
                        />
                      </label>
                      <p className="pl-1">ou arraste e solte</p>
                    </div>
                    <p className="text-xs text-gray-500">
                      PDF ou imagem até 10MB
                    </p>
                  </div>
                </div>
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
                disabled={loading || !formData.descricao || !formData.valor || formData.valor <= 0}
                className="px-4 py-2 bg-[#7D1F2C] text-white rounded-md hover:bg-[#6a1a25] disabled:opacity-50"
              >
                {loading ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FluxoCaixa;