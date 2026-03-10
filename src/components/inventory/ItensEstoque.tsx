import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Package,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Download,
  FileText,
  BarChart3,
  TrendingUp,
  Activity,
  Target,
  Zap,
  X
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { exportToExcel } from '../../utils/reportGenerator';
import dayjs from 'dayjs';

interface ItemEstoque {
  id: string;
  nome: string;
  unidade_medida: string;
  custo_medio: number;
  status: string;
  estoque_minimo: number;
  criado_em: string;
  atualizado_em: string;
  quantidade_total?: number;
  valor_total_estoque?: number;
}

interface FormData {
  nome: string;
  codigo: string;
  descricao: string;
  tipo_item: 'insumo' | 'produto_final';
  categoria: string;
  unidade_medida: string;
  custo_medio: number;
  tem_validade: boolean;
  observacoes: string;
  status: 'ativo' | 'inativo';
  estoque_minimo: number;
  estoque_nativo_id: string;
  tipo_compra: 'fornecedor' | 'rua' | 'ambos';
  fornecedor_padrao_id: string;
}

interface IndicadoresItens {
  total_itens: number;
  itens_ativos: number;
  itens_inativos: number;
  valor_medio_item: number;
  itens_sem_custo: number;
  unidades_medida_unicas: number;
}

const ItensEstoque: React.FC = () => {
  const [itens, setItens] = useState<ItemEstoque[]>([]);
  const [estoques, setEstoques] = useState<any[]>([]);
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [indicadores, setIndicadores] = useState<IndicadoresItens | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemEstoque | null>(null);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ativo' | 'inativo'>('all');
  const [unidadeFilter, setUnidadeFilter] = useState('all');
  const [custoFilter, setCustoFilter] = useState<'all' | 'sem_custo' | 'com_custo'>('all');
  const [estoqueFilter, setEstoqueFilter] = useState('all');

  // Verificar se há filtros ativos
  const hasActiveFilters = statusFilter !== 'all' || unidadeFilter !== 'all' || custoFilter !== 'all' || searchTerm !== '' || estoqueFilter !== 'all';

  // Função para limpar todos os filtros
  const clearAllFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setUnidadeFilter('all');
    setCustoFilter('all');
    setEstoqueFilter('all');
    // Limpar filtros salvos
    localStorage.removeItem('itensEstoque_filters');
    // Recarregar dados
    fetchData();
  };
  
  const [formData, setFormData] = useState<FormData>({
    nome: '',
    codigo: '',
    descricao: '',
    tipo_item: 'insumo',
    categoria: 'Geral',
    unidade_medida: 'unidade',
    custo_medio: 0,
    tem_validade: false,
    observacoes: '',
    status: 'ativo',
    estoque_minimo: 0,
    estoque_nativo_id: '',
    tipo_compra: 'ambos',
    fornecedor_padrao_id: ''
  });

  // Categorias fixas predefinidas
  const categoriasPredefinidas = [
    'Geral',
    'Bebidas',
    'Bebidas Alcoólicas',
    'Bebidas Não Alcoólicas',
    'Carnes',
    'Frutos do Mar',
    'Vegetais',
    'Temperos e Condimentos',
    'Laticínios',
    'Grãos e Cereais',
    'Massas',
    'Pães e Padaria',
    'Doces e Sobremesas',
    'Óleos e Gorduras',
    'Produtos de Limpeza',
    'Descartáveis',
    'Utensílios',
    'Equipamentos',
    'Material de Escritório',
    'Uniformes',
    'Outros'
  ];

  const unidadesMedida = [
    'unidade', 'kg', 'g', 'litro', 'ml', 'metro', 'cm', 'dúzia', 'caixa', 'pacote', 'lata', 'garrafa'
  ];

  // Estados para criação de nova categoria
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  useEffect(() => {
    // Carregar filtros salvos do localStorage (se existirem)
    const savedFilters = localStorage.getItem('itensEstoque_filters');
    if (savedFilters) {
      try {
        const filters = JSON.parse(savedFilters);
        if (filters.statusFilter) setStatusFilter(filters.statusFilter);
        if (filters.unidadeFilter) setUnidadeFilter(filters.unidadeFilter);
        if (filters.custoFilter) setCustoFilter(filters.custoFilter);
        if (filters.estoqueFilter) setEstoqueFilter(filters.estoqueFilter);
      } catch (e) {
        console.error('Erro ao carregar filtros salvos:', e);
      }
    }

    fetchData();
    fetchIndicadores();
    fetchEstoques();
    fetchFornecedores();
  }, []);

  // Auto-aplicar filtros quando mudarem
  useEffect(() => {
    // Salvar filtros no localStorage
    localStorage.setItem('itensEstoque_filters', JSON.stringify({
      statusFilter,
      unidadeFilter,
      custoFilter,
      estoqueFilter
    }));

    // Recarregar dados (skip na primeira renderização)
    if (estoques.length > 0) {
      fetchData();
    }
  }, [statusFilter, unidadeFilter, custoFilter, estoqueFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase.from('itens_estoque').select('*');

      // Aplicar filtros
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (unidadeFilter !== 'all') {
        query = query.eq('unidade_medida', unidadeFilter);
      }

      if (custoFilter === 'sem_custo') {
        query = query.eq('custo_medio', 0);
      } else if (custoFilter === 'com_custo') {
        query = query.gt('custo_medio', 0);
      }

      const { data, error } = await query.order('nome');

      if (error) throw error;

      // Buscar saldos - filtrar por estoque se selecionado
      let saldosQuery = supabase
        .from('saldos_estoque')
        .select('item_id, quantidade_atual, valor_total, estoque_id');

      if (estoqueFilter !== 'all') {
        saldosQuery = saldosQuery.eq('estoque_id', estoqueFilter);
      }

      const { data: saldosData, error: saldosError } = await saldosQuery;

      if (saldosError) throw saldosError;

      // Agregar saldos por item
      const saldosPorItem = (saldosData || []).reduce((acc: any, saldo: any) => {
        if (!acc[saldo.item_id]) {
          acc[saldo.item_id] = { quantidade_total: 0, valor_total: 0 };
        }
        acc[saldo.item_id].quantidade_total += parseFloat(saldo.quantidade_atual || 0);
        acc[saldo.item_id].valor_total += parseFloat(saldo.valor_total || 0);
        return acc;
      }, {});

      // Adicionar saldos aos itens
      const itensComSaldos = (data || []).map(item => ({
        ...item,
        quantidade_total: saldosPorItem[item.id]?.quantidade_total || 0,
        valor_total_estoque: saldosPorItem[item.id]?.valor_total || 0
      }));

      setItens(itensComSaldos);
    } catch (err) {
      console.error('Error fetching items:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar itens');
    } finally {
      setLoading(false);
    }
  };


  const fetchFornecedores = async () => {
    try {
      const { data, error } = await supabase
        .from('fornecedores')
        .select('id, nome')
        .eq('status', 'ativo')
        .order('nome');

      if (error) throw error;
      setFornecedores(data || []);
    } catch (err) {
      console.error('Error fetching fornecedores:', err);
    }
  };

  const fetchEstoques = async () => {
    try {
      const { data, error } = await supabase
        .from('estoques')
        .select('id, nome')
        .eq('status', true)
        .order('nome');

      if (error) throw error;
      setEstoques(data || []);
    } catch (err) {
      console.error('Error fetching estoques:', err);
    }
  };

  const fetchIndicadores = async () => {
    try {
      const { data, error } = await supabase
        .from('itens_estoque')
        .select('*');

      if (error) throw error;

      const totalItens = (data || []).length;
      const itensAtivos = (data || []).filter(i => i.status === 'ativo').length;
      const itensInativos = totalItens - itensAtivos;
      const valorMedioItem = totalItens > 0 
        ? (data || []).reduce((sum, i) => sum + (i.custo_medio || 0), 0) / totalItens
        : 0;
      const itensSemCusto = (data || []).filter(i => (i.custo_medio || 0) === 0).length;
      const unidadesMedidaUnicas = new Set((data || []).map(i => i.unidade_medida)).size;

      setIndicadores({
        total_itens: totalItens,
        itens_ativos: itensAtivos,
        itens_inativos: itensInativos,
        valor_medio_item: valorMedioItem,
        itens_sem_custo: itensSemCusto,
        unidades_medida_unicas: unidadesMedidaUnicas
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
      if (!formData.nome || !formData.unidade_medida) {
        throw new Error('Preencha todos os campos obrigatórios');
      }

      const dataToSave = {
        ...formData,
        custo_medio: parseFloat(formData.custo_medio.toString()) || 0,
        estoque_minimo: parseFloat(formData.estoque_minimo.toString()) || 0,
        estoque_nativo_id: formData.estoque_nativo_id || null,
        fornecedor_padrao_id: formData.fornecedor_padrao_id || null
      };

      if (editingItem) {
        const { error } = await supabase
          .from('itens_estoque')
          .update({ ...dataToSave, atualizado_em: new Date().toISOString() })
          .eq('id', editingItem.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('itens_estoque')
          .insert([dataToSave]);

        if (error) throw error;
      }

      setShowForm(false);
      setEditingItem(null);
      resetForm();
      fetchData();
      fetchIndicadores();
    } catch (err) {
      console.error('Error saving item:', err);
      setError(err instanceof Error ? err.message : 'Erro ao salvar item');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este item?')) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('itens_estoque')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchData();
      fetchIndicadores();
    } catch (err) {
      console.error('Error deleting item:', err);
      setError(err instanceof Error ? err.message : 'Erro ao excluir item');
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (item: ItemEstoque) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('itens_estoque')
        .update({ 
          status: item.status === 'ativo' ? 'inativo' : 'ativo',
          atualizado_em: new Date().toISOString()
        })
        .eq('id', item.id);

      if (error) throw error;
      fetchData();
      fetchIndicadores();
    } catch (err) {
      console.error('Error updating status:', err);
      setError(err instanceof Error ? err.message : 'Erro ao atualizar status');
    } finally {
      setLoading(false);
    }
  };

  const openForm = (item?: ItemEstoque) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        nome: item.nome,
        codigo: item.codigo || '',
        descricao: item.descricao || '',
        tipo_item: item.tipo_item || 'insumo',
        categoria: item.categoria || 'Geral',
        unidade_medida: item.unidade_medida,
        custo_medio: item.custo_medio || 0,
        tem_validade: item.tem_validade || false,
        observacoes: item.observacoes || '',
        status: item.status,
        estoque_minimo: item.estoque_minimo || 0,
        estoque_nativo_id: (item as any).estoque_nativo_id || '',
        tipo_compra: (item as any).tipo_compra || 'ambos',
        fornecedor_padrao_id: (item as any).fornecedor_padrao_id || ''
      });
    } else {
      setEditingItem(null);
      resetForm();
    }
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      codigo: '',
      descricao: '',
      tipo_item: 'insumo',
      categoria: 'Geral',
      unidade_medida: 'unidade',
      custo_medio: 0,
      tem_validade: false,
      observacoes: '',
      status: 'ativo',
      estoque_minimo: 0,
      estoque_nativo_id: '',
      tipo_compra: 'ambos',
      fornecedor_padrao_id: ''
    });
    setShowNewCategoryInput(false);
    setNewCategoryName('');
  };

  const handleCategoryChange = (value: string) => {
    if (value === 'nova_categoria') {
      setShowNewCategoryInput(true);
      setNewCategoryName('');
    } else {
      setFormData({ ...formData, categoria: value });
      setShowNewCategoryInput(false);
    }
  };

  const handleNewCategoryConfirm = () => {
    if (newCategoryName.trim()) {
      setFormData({ ...formData, categoria: newCategoryName.trim() });
      setShowNewCategoryInput(false);
      setNewCategoryName('');
    }
  };

  const handleNewCategoryCancel = () => {
    setShowNewCategoryInput(false);
    setNewCategoryName('');
    setFormData({ ...formData, categoria: 'Geral' });
  };

  const filteredItens = itens.filter(item => {
    const matchesSearch = item.nome.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const exportData = () => {
    if (filteredItens.length === 0) {
      alert('Não há dados para exportar');
      return;
    }

    const headers = [
      'Nome',
      'Código',
      'Tipo',
      'Categoria',
      'Descrição',
      'Unidade de Medida',
      'Custo Médio',
      'Estoque Mínimo',
      'Tem Validade',
      'Status',
      'Observações',
      'Criado em'
    ];

    const data = filteredItens.map(item => [
      item.nome,
      item.codigo || '',
      item.tipo_item === 'insumo' ? 'Insumo' : 'Produto para Venda',
      item.categoria || 'Geral',
      item.descricao || '',
      item.unidade_medida,
      item.custo_medio,
      item.estoque_minimo,
      item.tem_validade ? 'Sim' : 'Não',
      item.status ? 'Ativo' : 'Inativo',
      item.observacoes || '',
      dayjs(item.criado_em).format('DD/MM/YYYY')
    ]);

    const fileName = `itens-estoque-${dayjs().format('YYYY-MM-DD')}`;
    exportToExcel(data, fileName, headers);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Itens de Estoque</h3>
          <p className="text-sm text-gray-500 mt-1">
            {estoqueFilter === 'all'
              ? 'Visualizando quantidades somadas de todos os estoques'
              : `Visualizando quantidades do estoque: ${estoques.find(e => e.id === estoqueFilter)?.nome || ''}`
            }
          </p>
        </div>
        <div className="flex gap-2">
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
            Novo Item
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
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <Package className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-500">Total Itens</p>
                <p className="text-2xl font-bold text-blue-600">
                  {indicadores.total_itens}
                </p>
                <p className="text-sm text-gray-600">Cadastrados</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <CheckCircle className="w-8 h-8 text-green-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-500">Itens Ativos</p>
                <p className="text-2xl font-bold text-green-600">
                  {indicadores.itens_ativos}
                </p>
                <p className="text-sm text-gray-600">Em uso</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <EyeOff className="w-8 h-8 text-gray-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-500">Itens Inativos</p>
                <p className="text-2xl font-bold text-gray-600">
                  {indicadores.itens_inativos}
                </p>
                <p className="text-sm text-gray-600">Desabilitados</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <DollarSign className="w-8 h-8 text-purple-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-500">Custo Médio</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatCurrency(indicadores.valor_medio_item)}
                </p>
                <p className="text-sm text-gray-600">Por item</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <AlertTriangle className="w-8 h-8 text-orange-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-500">Sem Custo</p>
                <p className="text-2xl font-bold text-orange-600">
                  {indicadores.itens_sem_custo}
                </p>
                <p className="text-sm text-gray-600">Precisam revisão</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <Target className="w-8 h-8 text-teal-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-500">Unidades</p>
                <p className="text-2xl font-bold text-teal-600">
                  {indicadores.unidades_medida_unicas}
                </p>
                <p className="text-sm text-gray-600">Diferentes</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Aviso de Filtros Ativos */}
      {hasActiveFilters && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-yellow-400 mr-3" />
              <div>
                <p className="text-sm font-medium text-yellow-800">
                  Filtros ativos - Alguns itens podem estar ocultos
                </p>
                <p className="text-sm text-yellow-700 mt-1">
                  Mostrando {filteredItens.length} de {itens.length} itens
                </p>
              </div>
            </div>
            <button
              onClick={clearAllFilters}
              className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 text-sm font-medium"
            >
              Limpar Todos os Filtros
            </button>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-700 flex items-center">
            <Filter className="w-4 h-4 mr-2" />
            Filtros de Busca
            {hasActiveFilters && (
              <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                {[statusFilter !== 'all', unidadeFilter !== 'all', custoFilter !== 'all', estoqueFilter !== 'all', searchTerm !== ''].filter(Boolean).length} ativo(s)
              </span>
            )}
          </h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar itens..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#7D1F2C] focus:border-[#7D1F2C] ${
                  searchTerm !== '' ? 'border-yellow-400 bg-yellow-50' : 'border-gray-300'
                }`}
              />
            </div>
          </div>

          <div>
            <select
              value={estoqueFilter}
              onChange={(e) => setEstoqueFilter(e.target.value)}
              className={`w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#7D1F2C] focus:border-[#7D1F2C] ${
                estoqueFilter !== 'all' ? 'border-yellow-400 bg-yellow-50' : 'border-gray-300'
              }`}
            >
              <option value="all">Todos os Estoques (Soma)</option>
              {estoques.map((estoque) => (
                <option key={estoque.id} value={estoque.id}>
                  {estoque.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className={`w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#7D1F2C] focus:border-[#7D1F2C] ${
                statusFilter !== 'all' ? 'border-yellow-400 bg-yellow-50' : 'border-gray-300'
              }`}
            >
              <option value="all">Todos os Status</option>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>
          </div>

          <div>
            <select
              value={unidadeFilter}
              onChange={(e) => setUnidadeFilter(e.target.value)}
              className={`w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#7D1F2C] focus:border-[#7D1F2C] ${
                unidadeFilter !== 'all' ? 'border-yellow-400 bg-yellow-50' : 'border-gray-300'
              }`}
            >
              <option value="all">Todas as Unidades</option>
              {unidadesMedida.map((unidade) => (
                <option key={unidade} value={unidade}>
                  {unidade}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={custoFilter}
              onChange={(e) => setCustoFilter(e.target.value as any)}
              className={`w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#7D1F2C] focus:border-[#7D1F2C] ${
                custoFilter !== 'all' ? 'border-yellow-400 bg-yellow-50' : 'border-gray-300'
              }`}
            >
              <option value="all">Todos os Custos</option>
              <option value="com_custo">Com Custo</option>
              <option value="sem_custo">Sem Custo</option>
            </select>
          </div>

          {hasActiveFilters && (
            <div>
              <button
                onClick={clearAllFilters}
                className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 flex items-center justify-center gap-2"
                title="Limpar todos os filtros"
              >
                <X className="w-4 h-4" />
                Limpar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Lista de Itens */}
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
                    Item
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Código
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Categoria
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unidade de Medida
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Custo Médio
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {estoqueFilter === 'all'
                      ? 'Qtd. Total (Todos)'
                      : `Qtd. em ${estoques.find(e => e.id === estoqueFilter)?.nome || 'Estoque'}`
                    }
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor Total
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estoque Mínimo
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Criado em
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredItens.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{item.nome}</div>
                        {item.descricao && (
                          <div className="text-sm text-gray-500">{item.descricao}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {item.codigo || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        item.tipo_item === 'insumo' ? 'text-blue-700 bg-blue-100' : 'text-green-700 bg-green-100'
                      }`}>
                        {item.tipo_item === 'insumo' ? 'Insumo' : 'Produto para Venda'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {item.categoria || 'Geral'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
                        {item.unidade_medida}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`font-medium ${
                        item.custo_medio > 0 ? 'text-gray-900' : 'text-orange-600'
                      }`}>
                        {formatCurrency(item.custo_medio)}
                      </div>
                      {item.custo_medio === 0 && (
                        <div className="text-xs text-orange-600 flex items-center">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Sem custo
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`font-medium ${
                        (item.quantidade_total || 0) < item.estoque_minimo
                          ? 'text-red-600'
                          : 'text-gray-900'
                      }`}>
                        {(item.quantidade_total || 0).toFixed(3)} {item.unidade_medida}
                      </div>
                      {(item.quantidade_total || 0) < item.estoque_minimo && (
                        <div className="text-xs text-red-600 flex items-center">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Abaixo do mínimo
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`font-medium ${
                        (item.valor_total_estoque || 0) > 0 ? 'text-green-600' : 'text-gray-400'
                      }`}>
                        {formatCurrency(item.valor_total_estoque || 0)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm text-gray-900">
                          <span className="text-red-600 font-medium">Crítico:</span> {item.estoque_minimo}
                        </div>
                        <div className="text-sm text-gray-900">
                          <span className="text-yellow-600 font-medium">Baixo:</span> {item.ponto_reposicao || 0}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        item.status === 'ativo' ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100'
                      }`}>
                        {item.status === 'ativo' ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">
                        {dayjs(item.criado_em).format('DD/MM/YYYY')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => openForm(item)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => toggleStatus(item)}
                          className={`${item.status === 'ativo' ? 'text-green-600' : 'text-gray-400'} hover:opacity-75`}
                          title={item.status === 'ativo' ? 'Desativar' : 'Ativar'}
                        >
                          {item.status === 'ativo' ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
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

          {filteredItens.length === 0 && (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum item encontrado</h3>
              {hasActiveFilters ? (
                <div>
                  <p className="text-gray-500 mb-4">
                    Nenhum item corresponde aos filtros aplicados.
                  </p>
                  <button
                    onClick={clearAllFilters}
                    className="px-4 py-2 bg-[#7D1F2C] text-white rounded-lg hover:bg-[#6a1a25]"
                  >
                    Limpar Filtros e Ver Todos os Itens
                  </button>
                </div>
              ) : (
                <p className="text-gray-500">Nenhum item cadastrado.</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal do Formulário */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {editingItem ? 'Editar Item' : 'Novo Item'}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome *
                </label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  required
                  placeholder="Ex: Farinha de Trigo"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Código
                </label>
                <input
                  type="text"
                  value={formData.codigo}
                  onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  placeholder="Ex: FAR001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Item *
                </label>
                <select
                  value={formData.tipo_item}
                  onChange={(e) => setFormData({ ...formData, tipo_item: e.target.value as 'insumo' | 'produto_final' })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  required
                >
                  <option value="insumo">Insumo</option>
                  <option value="produto_final">Produto para Venda</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoria *
                </label>
                {!showNewCategoryInput ? (
                  <select
                    value={formData.categoria}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                    required
                  >
                    {categoriasPredefinidas.map((categoria) => (
                      <option key={categoria} value={categoria}>
                        {categoria}
                      </option>
                    ))}
                    <option value="nova_categoria">+ Criar Nova Categoria</option>
                  </select>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                      placeholder="Digite o nome da nova categoria..."
                      autoFocus
                    />
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={handleNewCategoryConfirm}
                        disabled={!newCategoryName.trim()}
                        className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
                      >
                        Confirmar
                      </button>
                      <button
                        type="button"
                        onClick={handleNewCategoryCancel}
                        className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição
                </label>
                <textarea
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  rows={2}
                  placeholder="Descrição detalhada do item..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unidade de Medida *
                </label>
                <select
                  value={formData.unidade_medida}
                  onChange={(e) => setFormData({ ...formData, unidade_medida: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  required
                >
                  {unidadesMedida.map((unidade) => (
                    <option key={unidade} value={unidade}>
                      {unidade}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Custo Médio
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">R$</span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.custo_medio}
                    onChange={(e) => setFormData({ ...formData, custo_medio: parseFloat(e.target.value) || 0 })}
                    className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estoque Crítico (Urgente)
                </label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  value={formData.estoque_minimo}
                  onChange={(e) => setFormData({ ...formData, estoque_minimo: parseFloat(e.target.value) || 0 })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  placeholder="Quantidade crítica"
                />
                <p className="text-xs text-red-600 mt-1">
                  Abaixo desta quantidade = CRÍTICO/URGENTE
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ponto de Reposição (Estoque Baixo)
                </label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  value={formData.ponto_reposicao}
                  onChange={(e) => setFormData({ ...formData, ponto_reposicao: parseFloat(e.target.value) || 0 })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  placeholder="Quantidade para reposição"
                />
                <p className="text-xs text-yellow-600 mt-1">
                  Abaixo desta quantidade = ESTOQUE BAIXO
                </p>
              </div>


              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estoque Nativo
                </label>
                <select
                  value={formData.estoque_nativo_id}
                  onChange={(e) => setFormData({ ...formData, estoque_nativo_id: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                >
                  <option value="">Sem estoque nativo</option>
                  {estoques.map(estoque => (
                    <option key={estoque.id} value={estoque.id}>
                      {estoque.nome}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Estoque principal onde este item é normalmente armazenado
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Compra *
                </label>
                <select
                  value={formData.tipo_compra}
                  onChange={(e) => setFormData({ ...formData, tipo_compra: e.target.value as 'fornecedor' | 'rua' | 'ambos' })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  required
                >
                  <option value="ambos">Ambos (Fornecedor e Rua)</option>
                  <option value="fornecedor">Apenas Fornecedor</option>
                  <option value="rua">Apenas Rua (Feira/Mercado)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {formData.tipo_compra === 'fornecedor' && 'Item comprado via pedido formal com nota fiscal'}
                  {formData.tipo_compra === 'rua' && 'Item comprado na rua, feira ou mercado'}
                  {formData.tipo_compra === 'ambos' && 'Item pode ser comprado de ambas as formas'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fornecedor Padrão
                </label>
                <select
                  value={formData.fornecedor_padrao_id}
                  onChange={(e) => setFormData({ ...formData, fornecedor_padrao_id: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  disabled={formData.tipo_compra === 'rua'}
                >
                  <option value="">Nenhum fornecedor padrão</option>
                  {fornecedores.map(fornecedor => (
                    <option key={fornecedor.id} value={fornecedor.id}>
                      {fornecedor.nome}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {formData.tipo_compra === 'rua'
                    ? 'Não disponível para itens comprados na rua'
                    : 'Fornecedor preferencial para este item'}
                </p>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="tem_validade"
                  checked={formData.tem_validade}
                  onChange={(e) => setFormData({ ...formData, tem_validade: e.target.checked })}
                  className="rounded border-gray-300 text-[#7D1F2C] focus:ring-[#7D1F2C]"
                />
                <label htmlFor="tem_validade" className="ml-2 text-sm text-gray-700">
                  Item tem validade
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="status"
                  checked={formData.status === 'ativo'}
                  onChange={(e) => setFormData({ ...formData, status: e.target.checked ? 'ativo' : 'inativo' })}
                  className="rounded border-gray-300 text-[#7D1F2C] focus:ring-[#7D1F2C]"
                />
                <label htmlFor="status" className="ml-2 text-sm text-gray-700">
                  Item ativo
                </label>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observações
                </label>
                <textarea
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  rows={2}
                  placeholder="Observações adicionais sobre o item..."
                />
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
                disabled={loading || !formData.nome || !formData.unidade_medida}
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

export default ItensEstoque;