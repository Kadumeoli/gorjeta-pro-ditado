import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Filter,
  Download,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  ChevronDown
} from 'lucide-react';
import { Menu } from '@headlessui/react';
import { supabase } from '../../lib/supabase';
import dayjs from 'dayjs';
import { ReportGenerator, exportToExcel } from '../../utils/reportGenerator';

interface ExtratoDiario {
  data: string;
  saldo_anterior: number;
  total_entradas: number;
  total_saidas: number;
  saldo_final: number;
  quantidade_lancamentos: number;
  qtd_entradas: number;
  qtd_saidas: number;
  ano: number;
  mes: number;
  dia: number;
}

interface LancamentoDetalhado {
  id: string;
  data: string;
  tipo: 'entrada' | 'saida';
  descricao: string;
  valor: number;
  centro_custo: string;
  categoria_id: string;
  forma_pagamento_id: string;
}

const ExtratoDiario: React.FC = () => {
  const [extrato, setExtrato] = useState<ExtratoDiario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterType, setFilterType] = useState<'period' | 'month'>('month');
  const [startDate, setStartDate] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [selectedYear, setSelectedYear] = useState(dayjs().year());
  const [selectedMonth, setSelectedMonth] = useState<number | 'all'>(dayjs().month() + 1);

  const years = Array.from({ length: 5 }, (_, i) => dayjs().year() - i);
  const months = [
    { value: 'all', label: 'Todos os Meses' },
    ...Array.from({ length: 12 }, (_, i) => ({
      value: i + 1,
      label: dayjs().month(i).format('MMMM')
    }))
  ];

  useEffect(() => {
    fetchExtrato();
  }, [filterType, startDate, endDate, selectedYear, selectedMonth]);

  const fetchExtrato = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('vw_extrato_consolidado')
        .select('*');

      if (filterType === 'period') {
        query = query
          .gte('data', startDate)
          .lte('data', endDate);
      } else {
        query = query.eq('ano', selectedYear);
        if (selectedMonth !== 'all') {
          query = query.eq('mes', selectedMonth);
        }
      }

      const { data, error: err } = await query.order('data', { ascending: false });

      if (err) throw err;
      setExtrato(data || []);
    } catch (err: any) {
      console.error('Error fetching extrato:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchLancamentosDetalhados = async (data: string) => {
    try {
      const { data: lancamentos, error } = await supabase
        .from('fluxo_caixa')
        .select('*')
        .gte('data', `${data} 00:00:00`)
        .lte('data', `${data} 23:59:59`)
        .order('data', { ascending: true });

      if (error) throw error;
      return lancamentos || [];
    } catch (err) {
      console.error('Error fetching detailed transactions:', err);
      return [];
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const exportarExcel = () => {
    const headers = [
      'Data',
      'Saldo Anterior',
      'Entradas',
      'Saídas',
      'Saldo Final',
      'Qtd Lançamentos'
    ];

    const data = extrato.map(e => [
      dayjs(e.data).format('DD/MM/YYYY'),
      formatCurrency(e.saldo_anterior),
      formatCurrency(e.total_entradas),
      formatCurrency(e.total_saidas),
      formatCurrency(e.saldo_final),
      e.quantidade_lancamentos.toString()
    ]);

    const fileName = `extrato-${selectedYear}${selectedMonth !== 'all' ? `-${String(selectedMonth).padStart(2, '0')}` : ''}`;
    exportToExcel(data, headers, fileName);
  };

  const gerarExtratoSintetico = () => {
    if (extrato.length === 0) {
      alert('Não há dados para gerar relatório');
      return;
    }

    const reportGenerator = new ReportGenerator();

    let currentY = reportGenerator.addHeader(
      'EXTRATO SINTÉTICO - FLUXO DE CAIXA',
      `Ano: ${selectedYear}${selectedMonth !== 'all' ? ` - ${months.find(m => m.value === selectedMonth)?.label}` : ''}`
    );

    // Resumo do período
    const saldoInicial = extrato[extrato.length - 1]?.saldo_anterior || 0;
    const saldoFinal = extrato[0]?.saldo_final || 0;
    const totalEntradas = extrato.reduce((sum, e) => sum + e.total_entradas, 0);
    const totalSaidas = extrato.reduce((sum, e) => sum + e.total_saidas, 0);

    const resumo = [
      ['Saldo Inicial', formatCurrency(saldoInicial)],
      ['Total de Entradas', formatCurrency(totalEntradas)],
      ['Total de Saídas', formatCurrency(totalSaidas)],
      ['Saldo Final', formatCurrency(saldoFinal)],
      ['Variação', formatCurrency(saldoFinal - saldoInicial)]
    ];

    currentY = reportGenerator.addSection('Resumo do Período', [], currentY);
    currentY = reportGenerator.addTable(['Indicador', 'Valor'], resumo, currentY);

    // Extrato diário
    const headers = ['Data', 'Saldo Anterior', 'Entradas', 'Saídas', 'Saldo Final'];
    const data = extrato.map(e => [
      dayjs(e.data).format('DD/MM/YYYY'),
      formatCurrency(e.saldo_anterior),
      formatCurrency(e.total_entradas),
      formatCurrency(e.total_saidas),
      formatCurrency(e.saldo_final)
    ]);

    currentY = reportGenerator.addSection('Movimentação Diária', [], currentY + 10);
    reportGenerator.addTable(headers, data, currentY);

    reportGenerator.save(`extrato-sintetico-${selectedYear}${selectedMonth !== 'all' ? `-${String(selectedMonth).padStart(2, '0')}` : ''}.pdf`);
  };

  const gerarExtratoDetalhado = async () => {
    if (extrato.length === 0) {
      alert('Não há dados para gerar relatório');
      return;
    }

    const reportGenerator = new ReportGenerator();

    let currentY = reportGenerator.addHeader(
      'EXTRATO DETALHADO - FLUXO DE CAIXA',
      `Ano: ${selectedYear}${selectedMonth !== 'all' ? ` - ${months.find(m => m.value === selectedMonth)?.label}` : ''}`
    );

    // Resumo do período
    const saldoInicial = extrato[extrato.length - 1]?.saldo_anterior || 0;
    const saldoFinal = extrato[0]?.saldo_final || 0;
    const totalEntradas = extrato.reduce((sum, e) => sum + e.total_entradas, 0);
    const totalSaidas = extrato.reduce((sum, e) => sum + e.total_saidas, 0);

    const resumo = [
      ['Saldo Inicial', formatCurrency(saldoInicial)],
      ['Total de Entradas', formatCurrency(totalEntradas)],
      ['Total de Saídas', formatCurrency(totalSaidas)],
      ['Saldo Final', formatCurrency(saldoFinal)]
    ];

    currentY = reportGenerator.addSection('Resumo do Período', [], currentY);
    currentY = reportGenerator.addTable(['Indicador', 'Valor'], resumo, currentY);

    // Para cada dia, buscar lançamentos detalhados
    for (const dia of extrato) {
      reportGenerator.pdf.addPage();
      currentY = 20;

      // Cabeçalho do dia
      currentY = reportGenerator.addSection(
        `${dayjs(dia.data).format('DD/MM/YYYY')} - ${dayjs(dia.data).format('dddd')}`,
        [
          `Saldo Anterior: ${formatCurrency(dia.saldo_anterior)}`,
          `Saldo Final: ${formatCurrency(dia.saldo_final)}`
        ],
        currentY
      );

      // Buscar lançamentos do dia
      const lancamentos = await fetchLancamentosDetalhados(dia.data);

      if (lancamentos.length > 0) {
        const lancamentosData = lancamentos.map(l => [
          l.tipo === 'entrada' ? 'ENTRADA' : 'SAÍDA',
          (l.descricao || '').substring(0, 40),
          l.centro_custo || '-',
          formatCurrency(Math.abs(l.valor))
        ]);

        currentY = reportGenerator.addTable(
          ['Tipo', 'Descrição', 'Centro Custo', 'Valor'],
          lancamentosData,
          currentY
        );
      } else {
        reportGenerator.pdf.setFontSize(10);
        reportGenerator.pdf.text('Nenhum lançamento neste dia', 20, currentY);
      }

      // Totais do dia
      const totaisDia = [
        ['Total Entradas', formatCurrency(dia.total_entradas)],
        ['Total Saídas', formatCurrency(dia.total_saidas)],
        ['Saldo do Dia', formatCurrency(dia.saldo_final)]
      ];

      currentY += 10;
      reportGenerator.addTable(['', 'Valor'], totaisDia, currentY);
    }

    // Adicionar rodapés
    const totalPages = reportGenerator.pdf.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      reportGenerator.pdf.setPage(i);
      reportGenerator.addFooter();
    }

    reportGenerator.save(`extrato-detalhado-${selectedYear}${selectedMonth !== 'all' ? `-${String(selectedMonth).padStart(2, '0')}` : ''}.pdf`);
  };

  const getSaldoClass = (valor: number) => {
    if (valor > 0) return 'text-green-600';
    if (valor < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Extrato Diário</h2>
        <div className="flex space-x-2">
          <button
            onClick={exportarExcel}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            Excel
          </button>

          <Menu as="div" className="relative inline-block text-left">
            <Menu.Button className="px-4 py-2 bg-[#7D1F2C] text-white rounded-lg hover:bg-[#6a1a25] flex items-center transition-all hover:shadow-md">
              <FileText className="w-4 h-4 mr-2" />
              Gerar PDF
              <ChevronDown className="w-4 h-4 ml-2" />
            </Menu.Button>

            <Menu.Items className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-50 divide-y divide-gray-100 overflow-hidden">
              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={gerarExtratoSintetico}
                    className={`w-full text-left px-4 py-3 flex items-start transition-colors ${
                      active ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex-shrink-0 mr-3 mt-0.5">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <FileText className="w-4 h-4 text-blue-600" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">Extrato Sintético</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        Resumo diário com saldos
                      </div>
                    </div>
                  </button>
                )}
              </Menu.Item>

              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={gerarExtratoDetalhado}
                    className={`w-full text-left px-4 py-3 flex items-start transition-colors ${
                      active ? 'bg-green-50' : ''
                    }`}
                  >
                    <div className="flex-shrink-0 mr-3 mt-0.5">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <FileText className="w-4 h-4 text-green-600" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">Extrato Detalhado</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        Com todos os lançamentos por dia
                      </div>
                    </div>
                  </button>
                )}
              </Menu.Item>
            </Menu.Items>
          </Menu>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="space-y-4">
          {/* Tipo de Filtro */}
          <div className="flex space-x-4">
            <button
              onClick={() => setFilterType('month')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filterType === 'month'
                  ? 'bg-[#7D1F2C] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Por Mês
            </button>
            <button
              onClick={() => setFilterType('period')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filterType === 'period'
                  ? 'bg-[#7D1F2C] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Por Período
            </button>
          </div>

          {/* Filtros por Mês */}
          {filterType === 'month' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ano
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7D1F2C] focus:border-transparent"
                >
                  {years.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mês
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7D1F2C] focus:border-transparent"
                >
                  {months.map((month) => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Filtros por Período */}
          {filterType === 'period' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data Inicial
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7D1F2C] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data Final
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7D1F2C] focus:border-transparent"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Resumo */}
      {!loading && extrato.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Saldo Inicial</p>
                <p className={`text-2xl font-bold ${getSaldoClass(extrato[extrato.length - 1]?.saldo_anterior || 0)}`}>
                  {formatCurrency(extrato[extrato.length - 1]?.saldo_anterior || 0)}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Entradas</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(extrato.reduce((sum, e) => sum + e.total_entradas, 0))}
                </p>
              </div>
              <ArrowUpRight className="w-8 h-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Saídas</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(extrato.reduce((sum, e) => sum + e.total_saidas, 0))}
                </p>
              </div>
              <ArrowDownRight className="w-8 h-8 text-red-600" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Saldo Final</p>
                <p className={`text-2xl font-bold ${getSaldoClass(extrato[0]?.saldo_final || 0)}`}>
                  {formatCurrency(extrato[0]?.saldo_final || 0)}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-[#7D1F2C]" />
            </div>
          </div>
        </div>
      )}

      {/* Tabela de Extrato */}
      {error && (
        <div className="p-4 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#7D1F2C]"></div>
        </div>
      )}

      {!loading && !error && extrato.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-500">Nenhuma movimentação encontrada no período selecionado</p>
        </div>
      )}

      {!loading && !error && extrato.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider bg-blue-50">
                    Saldo Anterior
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider bg-green-50">
                    Entradas
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider bg-red-50">
                    Saídas
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider bg-yellow-50">
                    Saldo
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Qtd
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {extrato.map((dia, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {dayjs(dia.data).format('DD/MM/YYYY')}
                      </div>
                      <div className="text-xs text-gray-500">
                        {dayjs(dia.data).format('dddd')}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right bg-blue-50">
                      <div className={`text-sm font-medium ${getSaldoClass(dia.saldo_anterior)}`}>
                        {formatCurrency(dia.saldo_anterior)}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right bg-green-50">
                      {dia.qtd_entradas > 0 ? (
                        <>
                          <div className="text-sm font-bold text-green-700">
                            {formatCurrency(dia.total_entradas)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {dia.qtd_entradas} lanç.
                          </div>
                        </>
                      ) : (
                        <div className="text-sm text-gray-400">-</div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right bg-red-50">
                      {dia.qtd_saidas > 0 ? (
                        <>
                          <div className="text-sm font-bold text-red-700">
                            {formatCurrency(dia.total_saidas)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {dia.qtd_saidas} lanç.
                          </div>
                        </>
                      ) : (
                        <div className="text-sm text-gray-400">-</div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right bg-yellow-50">
                      <div className={`text-sm font-bold ${getSaldoClass(dia.saldo_final)}`}>
                        {formatCurrency(dia.saldo_final)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {dia.saldo_final >= dia.saldo_anterior ? '↑' : '↓'}
                        {formatCurrency(Math.abs(dia.saldo_final - dia.saldo_anterior))}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <div className="text-sm font-medium text-gray-900">
                        {dia.quantidade_lancamentos}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExtratoDiario;
