import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { FileText, Download, Calendar, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import * as XLSX from 'xlsx';

interface DREData {
  categoria_raiz_id: string;
  categoria_raiz_nome: string;
  categoria_id: string;
  categoria_nome: string;
  tipo: 'receita' | 'despesa';
  nivel: number;
  ano: number;
  mes: number;
  valor_total: number;
  quantidade_lancamentos: number;
}

interface Lancamento {
  id: string;
  data: string;
  descricao: string;
  valor: number;
  tipo: string;
  categoria_id: string | null;
  centro_custo_id: string | null;
  origem: string;
}

export default function DRESimplificado() {
  const [ano, setAno] = useState(2026);
  const [mes, setMes] = useState<number | 'all'>('all');
  const [dreData, setDreData] = useState<DREData[]>([]);
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  const anos = [2024, 2025, 2026, 2027];
  const meses = [
    { value: 'all', label: 'Ano Todo' },
    { value: 1, label: 'Janeiro' },
    { value: 2, label: 'Fevereiro' },
    { value: 3, label: 'Março' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Maio' },
    { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Setembro' },
    { value: 10, label: 'Outubro' },
    { value: 11, label: 'Novembro' },
    { value: 12, label: 'Dezembro' },
  ];

  useEffect(() => {
    buscarDados();
  }, [ano, mes]);

  const buscarDados = async () => {
    setLoading(true);
    try {
      // 1. Buscar DRE consolidado da view
      let queryDRE = supabase
        .from('vw_dre_consolidado')
        .select('*')
        .eq('ano', ano);

      if (mes !== 'all') {
        queryDRE = queryDRE.eq('mes', mes);
      }

      const { data: dreResult, error: dreError } = await queryDRE;

      if (dreError) throw dreError;

      console.log('📊 DRE Data:', dreResult?.length, 'registros');
      setDreData(dreResult || []);

      // 2. Buscar lançamentos do fluxo de caixa (mesma fonte da view)
      const startDate = `${ano}-01-01`;
      const endDate = `${ano}-12-31`;

      let queryFluxo = supabase
        .from('fluxo_caixa')
        .select('*')
        .neq('origem', 'transferencia')
        .gte('data', startDate)
        .lte('data', endDate);

      if (mes !== 'all') {
        const monthStr = String(mes).padStart(2, '0');
        const monthStart = `${ano}-${monthStr}-01`;
        const lastDay = new Date(Number(ano), Number(mes), 0).getDate();
        const monthEnd = `${ano}-${monthStr}-${String(lastDay).padStart(2, '0')}`;

        queryFluxo = queryFluxo
          .gte('data', monthStart)
          .lte('data', monthEnd);
      }

      const { data: fluxoResult, error: fluxoError } = await queryFluxo.order('data');

      if (fluxoError) throw fluxoError;

      console.log('💰 Fluxo Caixa:', fluxoResult?.length, 'lançamentos');
      setLancamentos(fluxoResult || []);

    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      alert('Erro ao buscar dados: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const calcularTotais = () => {
    const receitas = dreData
      .filter(d => d.tipo === 'receita')
      .reduce((sum, d) => sum + Math.abs(d.valor_total), 0);

    const despesas = dreData
      .filter(d => d.tipo === 'despesa')
      .reduce((sum, d) => sum + Math.abs(d.valor_total), 0);

    const resultado = receitas - despesas;

    return { receitas, despesas, resultado };
  };

  const agruparPorCategoria = () => {
    const grupos: { [key: string]: DREData[] } = {};

    dreData.forEach(item => {
      const key = `${item.tipo}_${item.categoria_raiz_nome}`;
      if (!grupos[key]) {
        grupos[key] = [];
      }
      grupos[key].push(item);
    });

    return grupos;
  };

  const exportarExcel = () => {
    const totais = calcularTotais();
    const mesNome = mes === 'all' ? 'Ano_Completo' : meses.find(m => m.value === mes)?.label;

    // Sheet 1: DRE Consolidado
    const sheetDRE = dreData.map(d => ({
      'Tipo': d.tipo,
      'Categoria Raiz': d.categoria_raiz_nome,
      'Categoria': d.categoria_nome,
      'Nível': d.nivel,
      'Valor': Math.abs(d.valor_total),
      'Qtd Lançamentos': d.quantidade_lancamentos,
      'Ano': d.ano,
      'Mês': d.mes
    }));

    // Sheet 2: Lançamentos Detalhados
    const sheetLancamentos = lancamentos.map(l => ({
      'Data': l.data,
      'Descrição': l.descricao,
      'Valor': l.valor,
      'Tipo': l.tipo,
      'Origem': l.origem,
      'Categoria ID': l.categoria_id || 'SEM CATEGORIA',
      'Centro Custo ID': l.centro_custo_id || '-'
    }));

    // Sheet 3: Resumo
    const sheetResumo = [
      { 'Item': 'Receitas', 'Valor': totais.receitas },
      { 'Item': 'Despesas', 'Valor': totais.despesas },
      { 'Item': 'Resultado', 'Valor': totais.resultado }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheetDRE), 'DRE_Consolidado');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheetLancamentos), 'Lancamentos');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheetResumo), 'Resumo');

    XLSX.writeFile(wb, `DRE_${ano}_${mesNome}.xlsx`);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const totais = calcularTotais();
  const grupos = agruparPorCategoria();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">DRE - Demonstrativo de Resultado</h1>
              <p className="text-sm text-slate-600">Relatório gerencial completo e simplificado</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowDebug(!showDebug)}
              className="px-4 py-2 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
            >
              {showDebug ? 'Ocultar' : 'Mostrar'} Debug
            </button>
            <button
              onClick={exportarExcel}
              disabled={dreData.length === 0}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              <span>Exportar Excel</span>
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex items-center space-x-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Ano</label>
            <select
              value={ano}
              onChange={(e) => setAno(Number(e.target.value))}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {anos.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Mês</label>
            <select
              value={mes}
              onChange={(e) => setMes(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {meses.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          <button
            onClick={buscarDados}
            disabled={loading}
            className="mt-7 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Carregando...' : 'Atualizar'}
          </button>
        </div>
      </div>

      {/* Debug Info */}
      {showDebug && (
        <div className="bg-slate-900 text-slate-100 rounded-lg p-6 font-mono text-sm space-y-3">
          <div className="text-yellow-400 font-bold">DEBUG - Dados Brutos</div>
          <div>Registros DRE: {dreData.length}</div>
          <div>Lançamentos Fluxo: {lancamentos.length}</div>
          <div>Lançamentos SEM categoria: {lancamentos.filter(l => !l.categoria_id).length}</div>
          <div>Lançamentos COM categoria: {lancamentos.filter(l => l.categoria_id).length}</div>

          <div className="mt-4 text-yellow-400">Lançamentos por Data (Março/2026):</div>
          {Object.entries(
            lancamentos
              .filter(l => l.data.startsWith('2026-03'))
              .reduce((acc: { [key: string]: number }, l) => {
                acc[l.data] = (acc[l.data] || 0) + 1;
                return acc;
              }, {})
          ).map(([data, qtd]) => (
            <div key={data}>{data}: {qtd} lançamentos</div>
          ))}
        </div>
      )}

      {/* Cards de Totais */}
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-600">Receitas</span>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(totais.receitas)}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-600">Despesas</span>
            <TrendingDown className="w-5 h-5 text-red-600" />
          </div>
          <div className="text-2xl font-bold text-red-600">
            {formatCurrency(totais.despesas)}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-600">Resultado</span>
            <DollarSign className="w-5 h-5 text-blue-600" />
          </div>
          <div className={`text-2xl font-bold ${totais.resultado >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(totais.resultado)}
          </div>
        </div>
      </div>

      {/* Tabela DRE */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                  Categoria
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-slate-700 uppercase tracking-wider">
                  Nível
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-700 uppercase tracking-wider">
                  Valor
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-slate-700 uppercase tracking-wider">
                  Qtd
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {Object.entries(grupos).map(([key, items]) => {
                const tipo = items[0].tipo;
                const categoriaRaiz = items[0].categoria_raiz_nome;
                const totalGrupo = items.reduce((sum, item) => sum + Math.abs(item.valor_total), 0);

                return (
                  <tbody key={key}>
                    {/* Linha de Categoria Raiz */}
                    <tr className={tipo === 'receita' ? 'bg-green-50' : 'bg-red-50'}>
                      <td className="px-6 py-4 font-bold text-slate-900">
                        {categoriaRaiz}
                      </td>
                      <td className="px-6 py-4 text-center text-slate-600">
                        0
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-slate-900">
                        {formatCurrency(totalGrupo)}
                      </td>
                      <td className="px-6 py-4 text-center text-slate-600">
                        {items.reduce((sum, item) => sum + item.quantidade_lancamentos, 0)}
                      </td>
                    </tr>

                    {/* Linhas de Subcategorias */}
                    {items
                      .filter(item => item.nivel > 0)
                      .sort((a, b) => a.categoria_nome.localeCompare(b.categoria_nome))
                      .map((item, idx) => (
                        <tr key={`${key}-${idx}`} className="hover:bg-slate-50">
                          <td className="px-6 py-3 text-slate-700" style={{ paddingLeft: `${24 + (item.nivel * 20)}px` }}>
                            <span className="text-slate-400 mr-2">└</span>
                            {item.categoria_nome}
                          </td>
                          <td className="px-6 py-3 text-center text-slate-600 text-sm">
                            {item.nivel}
                          </td>
                          <td className="px-6 py-3 text-right text-slate-900">
                            {formatCurrency(Math.abs(item.valor_total))}
                          </td>
                          <td className="px-6 py-3 text-center text-slate-600 text-sm">
                            {item.quantidade_lancamentos}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tabela de Lançamentos (quando debug ativo) */}
      {showDebug && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
            <h3 className="text-lg font-semibold text-slate-900">
              Lançamentos Detalhados ({lancamentos.length})
            </h3>
          </div>
          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-700">Data</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-700">Descrição</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-slate-700">Valor</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-slate-700">Tipo</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-slate-700">Origem</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-slate-700">Categoria</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {lancamentos.map(l => (
                  <tr key={l.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 text-slate-900">{l.data}</td>
                    <td className="px-4 py-2 text-slate-700">{l.descricao}</td>
                    <td className="px-4 py-2 text-right text-slate-900">{formatCurrency(l.valor)}</td>
                    <td className="px-4 py-2 text-center">
                      <span className={`px-2 py-1 rounded text-xs ${
                        l.tipo === 'entrada' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {l.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-center text-slate-600 text-xs">{l.origem}</td>
                    <td className="px-4 py-2 text-center">
                      {l.categoria_id ? (
                        <span className="text-green-600 text-xs">SIM</span>
                      ) : (
                        <span className="text-red-600 text-xs font-bold">NÃO</span>
                      )}
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
}
