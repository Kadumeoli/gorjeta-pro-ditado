import React, { useState, useEffect } from 'react';
import { Search, Calendar, TrendingUp, TrendingDown, Package, DollarSign, Users } from 'lucide-react';
import { calcularMetricasCompras, buscarCompras, FiltrosCompras } from '../../services/comprasMetricas';
import { formatCurrency } from '../../utils/currency';

const ListaComprasMetricas: React.FC = () => {
  const [filtros, setFiltros] = useState<FiltrosCompras>({
    fornecedorNome: '',
    dataInicio: '',
    dataFim: '',
  });

  const [metricas, setMetricas] = useState<any>(null);
  const [compras, setCompras] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const carregarDados = async () => {
    setLoading(true);
    try {
      // Carregar métricas
      const metricasData = await calcularMetricasCompras(filtros);
      setMetricas(metricasData);

      // Carregar compras
      const resultado = await buscarCompras({ ...filtros, page, perPage: 20 });
      setCompras(resultado.compras);
      setTotal(resultado.total);
      setTotalPages(resultado.totalPages);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, [page]);

  const handleFiltrar = () => {
    setPage(1);
    carregarDados();
  };

  const handleLimparFiltros = () => {
    setFiltros({ fornecedorNome: '', dataInicio: '', dataFim: '' });
    setPage(1);
    setTimeout(carregarDados, 100);
  };

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-medium text-white mb-3">Filtros</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Fornecedor</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Nome do fornecedor"
                value={filtros.fornecedorNome || ''}
                onChange={(e) => setFiltros({ ...filtros, fornecedorNome: e.target.value })}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7D1F2C] focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Data Início</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={filtros.dataInicio || ''}
                onChange={(e) => setFiltros({ ...filtros, dataInicio: e.target.value })}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7D1F2C] focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Data Fim</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={filtros.dataFim || ''}
                onChange={(e) => setFiltros({ ...filtros, dataFim: e.target.value })}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7D1F2C] focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex items-end gap-2">
            <button
              onClick={handleFiltrar}
              className="flex-1 px-4 py-2 bg-[#7D1F2C] text-white text-sm rounded-lg hover:bg-[#6a1a25] transition-colors"
            >
              Filtrar
            </button>
            <button
              onClick={handleLimparFiltros}
              className="px-4 py-2 bg-gray-100 text-white/80 text-sm rounded-lg hover:bg-gray-200 transition-colors"
            >
              Limpar
            </button>
          </div>
        </div>
      </div>

      {/* Cards de Métricas */}
      {metricas && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-600">Ticket Médio</span>
              <DollarSign className="w-4 h-4 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-white">
              {formatCurrency(metricas.ticketMedio)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {metricas.totalCompras} compras
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-600">Top Fornecedor</span>
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-sm font-bold text-white truncate">
              {metricas.topFornecedor?.nome || 'N/A'}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {metricas.topFornecedor ? formatCurrency(metricas.topFornecedor.total) : '-'}
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-600">Variação Mensal</span>
              {metricas.variacaoMensal.percentual >= 0 ? (
                <TrendingUp className="w-4 h-4 text-green-600" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-600" />
              )}
            </div>
            <div className={`text-2xl font-bold ${
              metricas.variacaoMensal.percentual >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {metricas.variacaoMensal.percentual > 0 ? '+' : ''}
              {metricas.variacaoMensal.percentual.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500 mt-1">
              vs mês anterior
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-600">Total de Itens</span>
              <Package className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-2xl font-bold text-white">
              {metricas.totalItens}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              itens comprados
            </div>
          </div>
        </div>
      )}

      {/* Tabela de Compras */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Data</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Fornecedor</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Nº Documento</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-600">Valor Total</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                    Carregando...
                  </td>
                </tr>
              ) : compras.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                    Nenhuma compra encontrada
                  </td>
                </tr>
              ) : (
                compras.map((compra) => (
                  <tr key={compra.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-white">
                      {compra.data_compra
                        ? new Date(compra.data_compra).toLocaleDateString('pt-BR')
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-white">
                      {compra.fornecedores?.nome || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-white">
                      {compra.numero_documento || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-white text-right font-medium">
                      {formatCurrency(compra.valor_total)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        compra.status === 'recebido'
                          ? 'bg-green-100 text-green-800'
                          : compra.status === 'pendente'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-white/90'
                      }`}>
                        {compra.status === 'recebido' ? 'Recebido' : compra.status === 'pendente' ? 'Pendente' : 'Cancelado'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {total} compra{total !== 1 ? 's' : ''} encontrada{total !== 1 ? 's' : ''}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <span className="text-sm text-gray-600">
                Página {page} de {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ListaComprasMetricas;
