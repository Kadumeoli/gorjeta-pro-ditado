import React, { useState, useEffect } from 'react';
import {
  Target,
  Search,
  Filter,
  Edit2,
  Trash2,
  Plus,
  TrendingUp,
  Clock,
  Package,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Save,
  X,
  Sparkles,
  BarChart3
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import dayjs from '../../../lib/dayjs';

interface Mapeamento {
  id: string;
  nome_externo: string;
  nome_normalizado: string;
  item_estoque_id: string;
  estoque_id?: string;
  origem: string;
  confianca: number;
  usado_vezes: number;
  tipo_mapeamento: string;
  ultima_utilizacao?: string;
  criado_em: string;
  item_estoque?: {
    nome: string;
    codigo?: string;
    unidade_medida: string;
  };
  estoque?: {
    nome: string;
  };
}

interface BibliotecaMapeamentosProps {
  onClose: () => void;
}

const BibliotecaMapeamentos: React.FC<BibliotecaMapeamentosProps> = ({ onClose }) => {
  const [mapeamentos, setMapeamentos] = useState<Mapeamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroOrigem, setFiltroOrigem] = useState<string>('all');
  const [filtroTipo, setFiltroTipo] = useState<string>('all');
  const [origens, setOrigens] = useState<string[]>([]);
  const [editando, setEditando] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [itensEstoque, setItensEstoque] = useState<any[]>([]);
  const [estoquesDisponiveis, setEstoquesDisponiveis] = useState<any[]>([]);
  const [novoMapeamento, setNovoMapeamento] = useState({
    nome_externo: '',
    item_estoque_id: '',
    estoque_id: '',
    origem: '',
    confianca: 1.0,
    tipo_mapeamento: 'manual'
  });
  const [estatisticas, setEstatisticas] = useState({
    total: 0,
    manuais: 0,
    automaticos: 0,
    taxa_uso_media: 0
  });

  useEffect(() => {
    fetchMapeamentos();
    fetchOrigens();
    fetchItensEstoque();
    fetchEstoques();
  }, [filtroOrigem, filtroTipo]);

  const fetchMapeamentos = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('mapeamento_itens_vendas')
        .select(`
          *,
          item_estoque:itens_estoque(nome, codigo, unidade_medida),
          estoque:estoques(nome)
        `)
        .order('usado_vezes', { ascending: false });

      if (filtroOrigem !== 'all') {
        query = query.eq('origem', filtroOrigem);
      }

      if (filtroTipo !== 'all') {
        query = query.eq('tipo_mapeamento', filtroTipo);
      }

      const { data, error } = await query;

      if (error) throw error;

      setMapeamentos(data || []);

      // Calcular estatísticas
      const total = data?.length || 0;
      const manuais = data?.filter(m => m.tipo_mapeamento === 'manual').length || 0;
      const automaticos = data?.filter(m => m.tipo_mapeamento === 'automatico').length || 0;
      const somaUsos = data?.reduce((acc, m) => acc + (m.usado_vezes || 0), 0) || 0;
      const taxaUsoMedia = total > 0 ? somaUsos / total : 0;

      setEstatisticas({
        total,
        manuais,
        automaticos,
        taxa_uso_media: taxaUsoMedia
      });
    } catch (error) {
      console.error('Erro ao buscar mapeamentos:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrigens = async () => {
    try {
      const { data, error } = await supabase
        .from('mapeamento_itens_vendas')
        .select('origem')
        .not('origem', 'is', null);

      if (error) throw error;

      const uniqueOrigens = Array.from(new Set(data?.map(d => d.origem).filter(Boolean)));
      setOrigens(uniqueOrigens as string[]);
    } catch (error) {
      console.error('Erro ao buscar origens:', error);
    }
  };

  const fetchItensEstoque = async () => {
    try {
      const { data, error } = await supabase
        .from('itens_estoque')
        .select('id, nome, codigo')
        .eq('status', 'ativo')
        .order('nome');

      if (error) throw error;
      setItensEstoque(data || []);
    } catch (error) {
      console.error('Erro ao buscar itens de estoque:', error);
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
      setEstoquesDisponiveis(data || []);
    } catch (error) {
      console.error('Erro ao buscar estoques:', error);
    }
  };

  const handleSalvarNovoMapeamento = async () => {
    if (!novoMapeamento.nome_externo || !novoMapeamento.item_estoque_id) {
      alert('Preencha o nome externo e selecione um item de estoque');
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase
        .from('mapeamento_itens_vendas')
        .insert([{
          nome_externo: novoMapeamento.nome_externo,
          nome_normalizado: novoMapeamento.nome_externo.toLowerCase().trim(),
          item_estoque_id: novoMapeamento.item_estoque_id,
          estoque_id: novoMapeamento.estoque_id || null,
          origem: novoMapeamento.origem || null,
          confianca: novoMapeamento.confianca,
          tipo_mapeamento: 'manual',
          usado_vezes: 0
        }]);

      if (error) throw error;

      setShowAddModal(false);
      setNovoMapeamento({
        nome_externo: '',
        item_estoque_id: '',
        estoque_id: '',
        origem: '',
        confianca: 1.0,
        tipo_mapeamento: 'manual'
      });
      fetchMapeamentos();
    } catch (error) {
      console.error('Erro ao salvar mapeamento:', error);
      alert('Erro ao salvar mapeamento');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este mapeamento?')) return;

    try {
      const { error } = await supabase
        .from('mapeamento_itens_vendas')
        .delete()
        .eq('id', id);

      if (error) throw error;

      fetchMapeamentos();
    } catch (error) {
      console.error('Erro ao excluir mapeamento:', error);
      alert('Erro ao excluir mapeamento');
    }
  };

  const mapeamentosFiltrados = mapeamentos.filter(m =>
    m.nome_externo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.item_estoque?.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.item_estoque?.codigo?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getConfidenceBadge = (confianca: number) => {
    if (confianca >= 0.9) {
      return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">Alta ({(confianca * 100).toFixed(0)}%)</span>;
    } else if (confianca >= 0.7) {
      return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">Média ({(confianca * 100).toFixed(0)}%)</span>;
    } else {
      return <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">Baixa ({(confianca * 100).toFixed(0)}%)</span>;
    }
  };

  const getTipoBadge = (tipo: string) => {
    if (tipo === 'manual') {
      return (
        <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
          <Edit2 className="w-3 h-3 mr-1" />
          Manual
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-full">
          <Sparkles className="w-3 h-3 mr-1" />
          IA
        </span>
      );
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 p-6 text-white">
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
                  <Target className="w-7 h-7" />
                  Biblioteca de Mapeamentos
                </h2>
                <p className="text-green-100 text-sm mt-1">
                  Gerencie correspondências entre produtos externos e internos
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-white text-green-700 rounded-lg font-medium hover:bg-green-50 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Novo Mapeamento
            </button>
          </div>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-4 gap-4 p-6 bg-gray-50 border-b border-gray-200">
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold text-white">{estatisticas.total}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <Target className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Manuais</p>
                <p className="text-2xl font-bold text-blue-600">{estatisticas.manuais}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <Edit2 className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">IA</p>
                <p className="text-2xl font-bold text-purple-600">{estatisticas.automaticos}</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-lg">
                <Sparkles className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Uso Médio</p>
                <p className="text-2xl font-bold text-green-600">{estatisticas.taxa_uso_media.toFixed(1)}x</p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <BarChart3 className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filtros e Busca */}
        <div className="p-6 border-b border-gray-200 bg-white">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar por nome externo, produto interno ou código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>

            <select
              value={filtroOrigem}
              onChange={(e) => setFiltroOrigem(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="all">Todas as origens</option>
              {origens.map(origem => (
                <option key={origem} value={origem}>{origem}</option>
              ))}
            </select>

            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="all">Todos os tipos</option>
              <option value="manual">Manual</option>
              <option value="automatico">IA</option>
            </select>
          </div>
        </div>

        {/* Lista de Mapeamentos */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
                <p className="text-gray-500 mt-4">Carregando mapeamentos...</p>
              </div>
            </div>
          ) : mapeamentosFiltrados.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">Nenhum mapeamento encontrado</p>
                <p className="text-gray-400 text-sm mt-2">
                  {searchTerm ? 'Tente ajustar os filtros de busca' : 'Crie seu primeiro mapeamento'}
                </p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {mapeamentosFiltrados.map((mapeamento, index) => (
                <div
                  key={mapeamento.id}
                  className="p-6 hover:bg-gray-50 transition-all duration-200"
                  style={{
                    animation: `fadeIn 0.3s ease-out ${index * 0.05}s both`
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-white">{mapeamento.nome_externo}</h4>
                            {getTipoBadge(mapeamento.tipo_mapeamento)}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <span className="flex items-center">
                              <Package className="w-4 h-4 mr-1" />
                              {mapeamento.item_estoque?.nome}
                            </span>
                            {mapeamento.item_estoque?.codigo && (
                              <span className="text-gray-400">• {mapeamento.item_estoque.codigo}</span>
                            )}
                            {mapeamento.estoque?.nome && (
                              <span className="text-gray-400">• {mapeamento.estoque.nome}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 mt-3">
                        {getConfidenceBadge(mapeamento.confianca)}

                        {mapeamento.origem && (
                          <span className="text-xs text-gray-500 flex items-center">
                            <Filter className="w-3 h-3 mr-1" />
                            Origem: {mapeamento.origem}
                          </span>
                        )}

                        <span className="text-xs text-gray-500 flex items-center">
                          <TrendingUp className="w-3 h-3 mr-1" />
                          {mapeamento.usado_vezes} uso{mapeamento.usado_vezes !== 1 ? 's' : ''}
                        </span>

                        {mapeamento.ultima_utilizacao && (
                          <span className="text-xs text-gray-500 flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            Último uso: {dayjs(mapeamento.ultima_utilizacao).fromNow()}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditando(mapeamento.id)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(mapeamento.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Exibindo {mapeamentosFiltrados.length} de {mapeamentos.length} mapeamentos
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-gray-200 text-white/80 rounded-lg font-medium hover:bg-gray-300 transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      {/* Modal Adicionar Mapeamento */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl">
            <div className="bg-gradient-to-r from-green-600 to-green-700 p-6 text-white rounded-t-xl">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Plus className="w-6 h-6" />
                Novo Mapeamento Manual
              </h3>
              <p className="text-green-100 text-sm mt-1">
                Crie uma correspondência entre produto externo e interno
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Nome Externo (como aparece na importação) *
                </label>
                <input
                  type="text"
                  value={novoMapeamento.nome_externo}
                  onChange={(e) => setNovoMapeamento({ ...novoMapeamento, nome_externo: e.target.value })}
                  placeholder="Ex: Refrigerante Cola 350ml"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Item do Estoque *
                </label>
                <select
                  value={novoMapeamento.item_estoque_id}
                  onChange={(e) => setNovoMapeamento({ ...novoMapeamento, item_estoque_id: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="">Selecione um item</option>
                  {itensEstoque.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.codigo ? `[${item.codigo}] ` : ''}{item.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Estoque Preferencial (opcional)
                </label>
                <select
                  value={novoMapeamento.estoque_id}
                  onChange={(e) => setNovoMapeamento({ ...novoMapeamento, estoque_id: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="">Nenhum (detectar automaticamente)</option>
                  {estoquesDisponiveis.map(est => (
                    <option key={est.id} value={est.id}>
                      {est.nome}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Se selecionado, a IA sempre usará este estoque para baixas deste produto
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Origem (opcional)
                </label>
                <input
                  type="text"
                  value={novoMapeamento.origem}
                  onChange={(e) => setNovoMapeamento({ ...novoMapeamento, origem: e.target.value })}
                  placeholder="Ex: Sistema POS, Planilha Vendas, etc"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Identifique de onde vem este mapeamento para facilitar filtros futuros
                </p>
              </div>
            </div>

            <div className="p-6 bg-gray-50 rounded-b-xl flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNovoMapeamento({
                    nome_externo: '',
                    item_estoque_id: '',
                    estoque_id: '',
                    origem: '',
                    confianca: 1.0,
                    tipo_mapeamento: 'manual'
                  });
                }}
                className="px-6 py-2.5 bg-gray-200 text-white/80 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSalvarNovoMapeamento}
                disabled={loading}
                className="px-6 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Salvar Mapeamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BibliotecaMapeamentos;
