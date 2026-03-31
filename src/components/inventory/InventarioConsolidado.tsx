import React, { useState, useEffect } from 'react';
import {
  Search, Filter, X, Package, AlertTriangle, Download, Eye, ChevronDown, ChevronUp
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { exportToExcel } from '../../utils/reportGenerator';

interface ItemSaldo {
  item_id: string;
  item_nome: string;
  item_codigo: string | null;
  item_categoria: string | null;
  item_tipo: string | null;
  item_unidade_medida: string;
  item_custo_medio: number;
  item_estoque_minimo: number;
  estoques: {
    [estoque_id: string]: {
      estoque_nome: string;
      quantidade: number;
      valor_total: number;
    };
  };
  quantidade_total: number;
  valor_total: number;
  abaixo_minimo: boolean;
}

interface Estoque {
  id: string;
  nome: string;
}

const InventarioConsolidado: React.FC = () => {
  const [itens, setItens] = useState<ItemSaldo[]>([]);
  const [estoques, setEstoques] = useState<Estoque[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [estoqueFilter, setEstoqueFilter] = useState<string>('all');
  const [categoriaFilter, setCategoriaFilter] = useState<string>('all');
  const [tipoFilter, setTipoFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  const [categorias, setCategorias] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'nome' | 'quantidade' | 'valor'>('nome');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: estoquesData, error: estoquesError } = await supabase
        .from('estoques')
        .select('id, nome')
        .eq('status', true)
        .order('nome');

      if (estoquesError) throw estoquesError;
      setEstoques(estoquesData || []);

      const { data: itensData, error: itensError } = await supabase
        .from('itens_estoque')
        .select('id, nome, codigo, categoria, tipo_item, unidade_medida, custo_medio, estoque_minimo, status')
        .eq('status', 'ativo')
        .order('nome');

      if (itensError) throw itensError;

      const categoriasUnicas = Array.from(
        new Set((itensData || []).map(i => i.categoria).filter(Boolean))
      ).sort() as string[];
      setCategorias(categoriasUnicas);

      const { data: saldosData, error: saldosError } = await supabase
        .from('saldos_estoque')
        .select(`
          item_id,
          estoque_id,
          quantidade_atual,
          valor_total,
          estoques (nome)
        `);

      if (saldosError) throw saldosError;

      const itensMap = new Map<string, ItemSaldo>();

      (itensData || []).forEach(item => {
        itensMap.set(item.id, {
          item_id: item.id,
          item_nome: item.nome,
          item_codigo: item.codigo,
          item_categoria: item.categoria,
          item_tipo: item.tipo_item,
          item_unidade_medida: item.unidade_medida,
          item_custo_medio: parseFloat(item.custo_medio || 0),
          item_estoque_minimo: parseFloat(item.estoque_minimo || 0),
          estoques: {},
          quantidade_total: 0,
          valor_total: 0,
          abaixo_minimo: false
        });
      });

      (saldosData || []).forEach((saldo: any) => {
        const item = itensMap.get(saldo.item_id);
        if (item) {
          const quantidade = parseFloat(saldo.quantidade_atual || 0);
          const valor = parseFloat(saldo.valor_total || 0);

          item.estoques[saldo.estoque_id] = {
            estoque_nome: saldo.estoques?.nome || 'Desconhecido',
            quantidade,
            valor_total: valor
          };

          item.quantidade_total += quantidade;
          item.valor_total += valor;
        }
      });

      itensMap.forEach(item => {
        item.abaixo_minimo = item.quantidade_total < item.item_estoque_minimo;
      });

      setItens(Array.from(itensMap.values()));
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: 'nome' | 'quantidade' | 'valor') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const itensFiltrados = itens
    .filter(item => {
      if (searchTerm) {
        const termo = searchTerm.toLowerCase();
        const matchNome = item.item_nome.toLowerCase().includes(termo);
        const matchCodigo = item.item_codigo?.toLowerCase().includes(termo);
        if (!matchNome && !matchCodigo) return false;
      }

      if (categoriaFilter !== 'all' && item.item_categoria !== categoriaFilter) return false;
      if (tipoFilter !== 'all' && item.item_tipo !== tipoFilter) return false;

      if (statusFilter === 'abaixo_minimo' && !item.abaixo_minimo) return false;
      if (statusFilter === 'zerado' && item.quantidade_total > 0) return false;

      if (estoqueFilter !== 'all') {
        const temNoEstoque = item.estoques[estoqueFilter]?.quantidade > 0;
        if (!temNoEstoque) return false;
      }

      return true;
    })
    .sort((a, b) => {
      let comparison = 0;

      if (sortBy === 'nome') {
        comparison = a.item_nome.localeCompare(b.item_nome);
      } else if (sortBy === 'quantidade') {
        comparison = a.quantidade_total - b.quantidade_total;
      } else if (sortBy === 'valor') {
        comparison = a.valor_total - b.valor_total;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const handleExport = () => {
    const dadosExport = itensFiltrados.map(item => {
      const row: any = {
        'Código': item.item_codigo || '-',
        'Nome': item.item_nome,
        'Categoria': item.item_categoria || '-',
        'Tipo': item.item_tipo || '-',
        'Unidade': item.item_unidade_medida,
        'Custo Médio': item.item_custo_medio,
        'Estoque Mínimo': item.item_estoque_minimo,
        'Quantidade Total': item.quantidade_total,
        'Valor Total': item.valor_total,
      };

      estoques.forEach(estoque => {
        const saldo = item.estoques[estoque.id];
        row[`${estoque.nome} (Qtd)`] = saldo?.quantidade || 0;
      });

      return row;
    });

    exportToExcel(dadosExport, `inventario-consolidado-${new Date().toISOString().split('T')[0]}`);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setEstoqueFilter('all');
    setCategoriaFilter('all');
    setTipoFilter('all');
    setStatusFilter('all');
  };

  const hasActiveFilters = searchTerm !== '' || estoqueFilter !== 'all' ||
    categoriaFilter !== 'all' || tipoFilter !== 'all' || statusFilter !== 'all';

  const totalQuantidade = itensFiltrados.reduce((sum, item) => sum + item.quantidade_total, 0);
  const totalValor = itensFiltrados.reduce((sum, item) => sum + item.valor_total, 0);
  const itensAbaixoMinimo = itensFiltrados.filter(item => item.abaixo_minimo).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando inventário...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Inventário Consolidado</h2>
            <p className="text-sm text-gray-500">Visualização completa de todos os itens e estoques</p>
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Download className="w-4 h-4" />
            Exportar Excel
          </button>
        </div>

        {/* Busca e Filtros */}
        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar por nome ou código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 border rounded-lg ${
                hasActiveFilters ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-gray-300 text-gray-700'
              } hover:bg-gray-50`}
            >
              <Filter className="w-4 h-4" />
              Filtros
              {hasActiveFilters && <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">!</span>}
            </button>
          </div>

          {showFilters && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estoque</label>
                  <select
                    value={estoqueFilter}
                    onChange={(e) => setEstoqueFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Todos os Estoques</option>
                    {estoques.map(e => (
                      <option key={e.id} value={e.id}>{e.nome}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                  <select
                    value={categoriaFilter}
                    onChange={(e) => setCategoriaFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Todas as Categorias</option>
                    {categorias.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                  <select
                    value={tipoFilter}
                    onChange={(e) => setTipoFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Todos os Tipos</option>
                    <option value="insumo">Insumo</option>
                    <option value="produto_final">Produto Final</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Todos</option>
                    <option value="abaixo_minimo">Abaixo do Mínimo</option>
                    <option value="zerado">Zerados</option>
                  </select>
                </div>
              </div>

              {hasActiveFilters && (
                <div className="flex justify-end">
                  <button
                    onClick={clearFilters}
                    className="flex items-center gap-2 px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                  >
                    <X className="w-4 h-4" />
                    Limpar Filtros
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Indicadores */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-sm text-blue-600 font-medium">Total de Itens</p>
            <p className="text-2xl font-bold text-blue-900">{itensFiltrados.length}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-3">
            <p className="text-sm text-green-600 font-medium">Quantidade Total</p>
            <p className="text-2xl font-bold text-green-900">{totalQuantidade.toFixed(2)}</p>
          </div>
          <div className="bg-yellow-50 rounded-lg p-3">
            <p className="text-sm text-yellow-600 font-medium">Valor Total</p>
            <p className="text-2xl font-bold text-yellow-900">
              R$ {totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-red-50 rounded-lg p-3">
            <p className="text-sm text-red-600 font-medium">Abaixo do Mínimo</p>
            <p className="text-2xl font-bold text-red-900">{itensAbaixoMinimo}</p>
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('nome')}
                >
                  <div className="flex items-center gap-1">
                    Item
                    {sortBy === 'nome' && (
                      sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Categoria
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Unidade
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Mínimo
                </th>
                {estoques.map(estoque => (
                  <th
                    key={estoque.id}
                    className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider bg-blue-50"
                  >
                    {estoque.nome}
                  </th>
                ))}
                <th
                  className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 bg-green-50"
                  onClick={() => handleSort('quantidade')}
                >
                  <div className="flex items-center justify-center gap-1">
                    Total
                    {sortBy === 'quantidade' && (
                      sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 bg-yellow-50"
                  onClick={() => handleSort('valor')}
                >
                  <div className="flex items-center justify-center gap-1">
                    Valor Total
                    {sortBy === 'valor' && (
                      sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {itensFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6 + estoques.length} className="px-4 py-8 text-center text-gray-500">
                    <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    {searchTerm || hasActiveFilters
                      ? 'Nenhum item encontrado com os filtros aplicados'
                      : 'Nenhum item cadastrado'}
                  </td>
                </tr>
              ) : (
                itensFiltrados.map(item => (
                  <tr
                    key={item.item_id}
                    className={`hover:bg-gray-50 ${item.abaixo_minimo ? 'bg-red-50' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {item.abaixo_minimo && (
                          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                        )}
                        <div>
                          <p className="font-medium text-gray-900">{item.item_nome}</p>
                          {item.item_codigo && (
                            <p className="text-xs text-gray-500">{item.item_codigo}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {item.item_categoria || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {item.item_unidade_medida}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-700">
                      {item.item_estoque_minimo}
                    </td>
                    {estoques.map(estoque => {
                      const saldo = item.estoques[estoque.id];
                      const quantidade = saldo?.quantidade || 0;
                      return (
                        <td
                          key={estoque.id}
                          className={`px-4 py-3 text-center text-sm font-medium ${
                            quantidade === 0 ? 'text-gray-400' : 'text-gray-900'
                          }`}
                        >
                          {quantidade > 0 ? quantidade.toFixed(2) : '-'}
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 text-center text-sm font-bold text-gray-900 bg-green-50">
                      {item.quantidade_total.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-medium text-gray-900 bg-yellow-50">
                      R$ {item.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default InventarioConsolidado;
