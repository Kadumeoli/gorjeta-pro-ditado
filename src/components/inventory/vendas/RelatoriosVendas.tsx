import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Calendar,
  Package,
  Target,
  AlertCircle,
  CheckCircle,
  ArrowLeft,
  Download,
  RefreshCw,
  Filter
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import dayjs from '../../../lib/dayjs';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface RelatoriosVendasProps {
  onClose: () => void;
}

interface EstatisticasGerais {
  total_importacoes: number;
  total_itens_importados: number;
  taxa_sucesso_media: number;
  total_mapeamentos: number;
  mapeamentos_automaticos: number;
  mapeamentos_manuais: number;
}

const RelatoriosVendas: React.FC<RelatoriosVendasProps> = ({ onClose }) => {
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const [estatisticas, setEstatisticas] = useState<EstatisticasGerais | null>(null);
  const [dadosImportacoesPorDia, setDadosImportacoesPorDia] = useState<any[]>([]);
  const [dadosMapeamentosPorOrigem, setDadosMapeamentosPorOrigem] = useState<any[]>([]);
  const [dadosTaxaSucesso, setDadosTaxaSucesso] = useState<any[]>([]);
  const [topProdutosMaisImportados, setTopProdutosMaisImportados] = useState<any[]>([]);

  useEffect(() => {
    fetchRelatorios();
  }, [periodo]);

  const fetchRelatorios = async () => {
    try {
      setLoading(true);

      // Calcular datas
      let dataInicio = '';
      const dataFim = dayjs().format('YYYY-MM-DD');

      switch (periodo) {
        case 'week':
          dataInicio = dayjs().subtract(7, 'days').format('YYYY-MM-DD');
          break;
        case 'month':
          dataInicio = dayjs().subtract(30, 'days').format('YYYY-MM-DD');
          break;
        case 'quarter':
          dataInicio = dayjs().subtract(90, 'days').format('YYYY-MM-DD');
          break;
        case 'year':
          dataInicio = dayjs().subtract(365, 'days').format('YYYY-MM-DD');
          break;
      }

      // Buscar importações do período
      const { data: importacoes, error: errorImportacoes } = await supabase
        .from('importacoes_vendas')
        .select('*')
        .gte('criado_em', dataInicio)
        .lte('criado_em', dataFim);

      if (errorImportacoes) throw errorImportacoes;

      // Buscar mapeamentos
      const { data: mapeamentos, error: errorMapeamentos } = await supabase
        .from('mapeamento_itens_vendas')
        .select('*');

      if (errorMapeamentos) throw errorMapeamentos;

      // Calcular estatísticas gerais
      const totalImportacoes = importacoes?.length || 0;
      const totalItensImportados = importacoes?.reduce((acc, imp) => acc + (imp.total_linhas || 0), 0) || 0;
      const totalSucesso = importacoes?.reduce((acc, imp) => acc + (imp.total_sucesso || 0), 0) || 0;
      const taxaSucessoMedia = totalItensImportados > 0 ? (totalSucesso / totalItensImportados) * 100 : 0;

      setEstatisticas({
        total_importacoes: totalImportacoes,
        total_itens_importados: totalItensImportados,
        taxa_sucesso_media: taxaSucessoMedia,
        total_mapeamentos: mapeamentos?.length || 0,
        mapeamentos_automaticos: mapeamentos?.filter(m => m.tipo_mapeamento === 'automatico').length || 0,
        mapeamentos_manuais: mapeamentos?.filter(m => m.tipo_mapeamento === 'manual').length || 0
      });

      // Agrupar importações por dia
      const importacoesPorDia: Record<string, any> = {};
      importacoes?.forEach(imp => {
        const dia = dayjs(imp.criado_em).format('DD/MM');
        if (!importacoesPorDia[dia]) {
          importacoesPorDia[dia] = {
            dia,
            total: 0,
            sucesso: 0,
            erro: 0
          };
        }
        importacoesPorDia[dia].total += imp.total_linhas || 0;
        importacoesPorDia[dia].sucesso += imp.total_sucesso || 0;
        importacoesPorDia[dia].erro += imp.total_erro || 0;
      });

      setDadosImportacoesPorDia(Object.values(importacoesPorDia).slice(-14));

      // Agrupar mapeamentos por origem
      const mapeamentosPorOrigem: Record<string, number> = {};
      mapeamentos?.forEach(map => {
        const origem = map.origem || 'Sem origem';
        mapeamentosPorOrigem[origem] = (mapeamentosPorOrigem[origem] || 0) + 1;
      });

      setDadosMapeamentosPorOrigem(
        Object.entries(mapeamentosPorOrigem).map(([origem, total]) => ({
          origem,
          total
        }))
      );

      // Taxa de sucesso por importação
      const taxasPorImportacao = importacoes?.map(imp => ({
        arquivo: imp.arquivo_nome.substring(0, 20) + '...',
        taxa: imp.total_linhas > 0 ? (imp.total_sucesso / imp.total_linhas) * 100 : 0,
        data: dayjs(imp.criado_em).format('DD/MM')
      })).slice(-10);

      setDadosTaxaSucesso(taxasPorImportacao || []);

      // Top produtos mais importados (usando itens de importação)
      const { data: itensImportacao } = await supabase
        .from('itens_importacao_vendas')
        .select('nome_produto_externo, item_estoque_id')
        .eq('status', 'processado')
        .gte('criado_em', dataInicio);

      const contagemProdutos: Record<string, number> = {};
      itensImportacao?.forEach(item => {
        const nome = item.nome_produto_externo;
        contagemProdutos[nome] = (contagemProdutos[nome] || 0) + 1;
      });

      const topProdutos = Object.entries(contagemProdutos)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([nome, total]) => ({ nome, total }));

      setTopProdutosMaisImportados(topProdutos);

    } catch (error) {
      console.error('Erro ao buscar relatórios:', error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <BarChart3 className="w-7 h-7" />
                  Relatórios e Análises
                </h2>
                <p className="text-purple-100 text-sm mt-1">
                  Insights sobre suas importações e mapeamentos
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={periodo}
                onChange={(e) => setPeriodo(e.target.value as any)}
                className="px-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/50"
              >
                <option value="week" className="text-gray-900">Última semana</option>
                <option value="month" className="text-gray-900">Último mês</option>
                <option value="quarter" className="text-gray-900">Último trimestre</option>
                <option value="year" className="text-gray-900">Último ano</option>
              </select>
              <button
                onClick={fetchRelatorios}
                className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                title="Atualizar"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                <p className="text-gray-500 mt-4">Gerando relatórios...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Cards de Estatísticas */}
              {estatisticas && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-blue-900 mb-1">Importações</p>
                        <p className="text-3xl font-bold text-blue-600">{estatisticas.total_importacoes}</p>
                        <p className="text-xs text-blue-700 mt-1">No período</p>
                      </div>
                      <div className="bg-blue-200 p-3 rounded-lg">
                        <Package className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border border-green-200">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-900 mb-1">Taxa de Sucesso</p>
                        <p className="text-3xl font-bold text-green-600">{estatisticas.taxa_sucesso_media.toFixed(1)}%</p>
                        <p className="text-xs text-green-700 mt-1">Média geral</p>
                      </div>
                      <div className="bg-green-200 p-3 rounded-lg">
                        <TrendingUp className="w-6 h-6 text-green-600" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl border border-purple-200">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-purple-900 mb-1">Mapeamentos</p>
                        <p className="text-3xl font-bold text-purple-600">{estatisticas.total_mapeamentos}</p>
                        <p className="text-xs text-purple-700 mt-1">Cadastrados</p>
                      </div>
                      <div className="bg-purple-200 p-3 rounded-lg">
                        <Target className="w-6 h-6 text-purple-600" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-xl border border-orange-200">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-orange-900 mb-1">Itens Processados</p>
                        <p className="text-3xl font-bold text-orange-600">{estatisticas.total_itens_importados}</p>
                        <p className="text-xs text-orange-700 mt-1">Total importado</p>
                      </div>
                      <div className="bg-orange-200 p-3 rounded-lg">
                        <CheckCircle className="w-6 h-6 text-orange-600" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Gráficos */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Importações por dia */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Calendar className="w-5 h-5 mr-2 text-blue-600" />
                    Importações por Dia
                  </h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={dadosImportacoesPorDia}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="dia" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="sucesso" fill="#10B981" name="Sucesso" />
                      <Bar dataKey="erro" fill="#EF4444" name="Erro" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Taxa de sucesso */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
                    Taxa de Sucesso por Importação
                  </h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={dadosTaxaSucesso}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="data" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="taxa" stroke="#10B981" strokeWidth={2} name="Taxa (%)" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Mapeamentos por origem */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Target className="w-5 h-5 mr-2 text-purple-600" />
                    Mapeamentos por Origem
                  </h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={dadosMapeamentosPorOrigem}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ origem, percent }) => `${origem}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="total"
                      >
                        {dadosMapeamentosPorOrigem.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Top produtos mais importados */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Package className="w-5 h-5 mr-2 text-orange-600" />
                    Top 10 Produtos Mais Importados
                  </h3>
                  <div className="space-y-3 max-h-[250px] overflow-y-auto">
                    {topProdutosMaisImportados.map((produto, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">{produto.nome}</p>
                          <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                            <div
                              className="bg-gradient-to-r from-orange-500 to-orange-600 h-2 rounded-full"
                              style={{
                                width: `${(produto.total / topProdutosMaisImportados[0]?.total) * 100}%`
                              }}
                            />
                          </div>
                        </div>
                        <span className="ml-4 text-sm font-bold text-gray-900">{produto.total}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Distribuição de Mapeamentos */}
              {estatisticas && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribuição de Mapeamentos</h3>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">Mapeamentos Manuais</span>
                        <span className="text-lg font-bold text-blue-600">{estatisticas.mapeamentos_manuais}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full"
                          style={{
                            width: `${(estatisticas.mapeamentos_manuais / estatisticas.total_mapeamentos) * 100}%`
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">Mapeamentos Automáticos (IA)</span>
                        <span className="text-lg font-bold text-purple-600">{estatisticas.mapeamentos_automaticos}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-gradient-to-r from-purple-500 to-purple-600 h-3 rounded-full"
                          style={{
                            width: `${(estatisticas.mapeamentos_automaticos / estatisticas.total_mapeamentos) * 100}%`
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-white border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default RelatoriosVendas;
