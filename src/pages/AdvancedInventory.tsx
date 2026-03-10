import React, { useState, useEffect } from 'react';
import { Tab } from '@headlessui/react';
import { useLocation, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  BarChart3,
  Package,
  ClipboardList,
  ClipboardCheck,
  ArrowLeftRight,
  ShoppingCart,
  Factory,
  FileText,
  Warehouse,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Activity,
  Zap,
  MessageSquare
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import EstoquesGerenciamento from '../components/inventory/EstoquesGerenciamento';
import MovimentacoesEstoque from '../components/inventory/MovimentacoesEstoque';
import ProducaoEstoque from '../components/inventory/ProducaoEstoque';
import ComprasEstoque from '../components/inventory/ComprasEstoque';
import ItensEstoque from '../components/inventory/ItensEstoque';
import FichasTecnicas from '../components/inventory/FichasTecnicas';
import RelatoriosEstoque from '../components/inventory/RelatoriosEstoque';
import KardexProduto from '../components/inventory/KardexProduto';
import RequisicoesInternas from '../components/inventory/RequisicoesInternas';
import ContagemEstoque from '../components/inventory/contagem/ContagemEstoque';
import VendasDashboard from '../components/inventory/VendasDashboard';
import ChatFinanceiroIA from '../components/financeiro/ChatFinanceiroIA';

interface IndicadoresEstoque {
  total_itens: number;
  itens_abaixo_minimo: number;
  valor_total_estoque: number;
  movimentacoes_mes: number;
  entradas_mes: number;
  saidas_mes: number;
  producoes_mes: number;
  compras_mes: number;
}

interface ItemCritico {
  id: string;
  nome: string;
  codigo?: string;
  quantidade: number;
  estoque_minimo: number;
  unidade_medida: string;
  estoque_nome: string;
  dias_sem_movimentacao: number;
}

const AdvancedInventory: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedTab, setSelectedTab] = useState(0);
  const [indicadores, setIndicadores] = useState<IndicadoresEstoque | null>(null);
  const [itensCriticos, setItensCriticos] = useState<ItemCritico[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showChatIA, setShowChatIA] = useState(false);

  const tabTitles = [
    'Dashboard',
    'Estoques',
    'Itens',
    'Fichas Técnicas',
    'Compras',
    'Produção',
    'Requisições',
    'Relatórios',
    'Movimentações',
    'Kardex Produto',
    'Contagem',
    'Vendas'
  ];

  const tabIcons = [
    BarChart3,
    Warehouse,
    Package,
    ClipboardList,
    ShoppingCart,
    Factory,
    FileText,
    FileText,
    ArrowLeftRight,
    FileText,
    ClipboardCheck,
    TrendingUp
  ];

  // Sincronizar com URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (tabParam !== null) {
      const tabIndex = parseInt(tabParam);
      if (!isNaN(tabIndex) && tabIndex >= 0 && tabIndex < tabTitles.length) {
        setSelectedTab(tabIndex);
      }
    }
  }, [location.search]);

  useEffect(() => {
    if (selectedTab === 0) {
      fetchIndicadores();
      fetchItensCriticos();
    }
  }, [selectedTab]);

  const handleTabChange = (index: number) => {
    setSelectedTab(index);
    navigate(`/advanced-inventory?tab=${index}`);
  };

  const fetchIndicadores = async () => {
    try {
      setLoading(true);
      setError(null);

      // Buscar total de itens
      const { data: itensData, error: itensError } = await supabase
        .from('itens_estoque')
        .select('id, estoque_minimo')
        .eq('status', 'ativo');

      if (itensError) throw itensError;

      // Buscar saldos atuais
      const { data: saldosData, error: saldosError } = await supabase
        .from('saldos_estoque')
        .select('quantidade_atual, valor_total')
        .gt('quantidade_atual', 0);

      if (saldosError) throw saldosError;

      // Buscar movimentações do mês
      const inicioMes = dayjs().startOf('month').format('YYYY-MM-DD');
      const fimMes = dayjs().endOf('month').format('YYYY-MM-DD');

      const { data: movimentacoesData, error: movimentacoesError } = await supabase
        .from('movimentacoes_estoque')
        .select('tipo_movimentacao, custo_total')
        .gte('data_movimentacao', inicioMes)
        .lte('data_movimentacao', fimMes);

      if (movimentacoesError) throw movimentacoesError;

      // Buscar produções do mês
      const { data: producoesData, error: producoesError } = await supabase
        .from('producoes')
        .select('id')
        .gte('data_producao', inicioMes)
        .lte('data_producao', fimMes);

      if (producoesError) throw producoesError;

      // Buscar compras do mês
      const { data: comprasData, error: comprasError } = await supabase
        .from('entradas_compras')
        .select('id')
        .gte('data_compra', inicioMes)
        .lte('data_compra', fimMes);

      if (comprasError) throw comprasError;

      // Calcular indicadores
      const totalItens = (itensData || []).length;
      
      // Buscar itens críticos separadamente
      const { data: itensCriticosData, error: criticosError } = await supabase
        .from('saldos_estoque')
        .select(`
          quantidade_atual,
          itens_estoque!inner(estoque_minimo)
        `)
        .gt('quantidade_atual', 0);

      if (criticosError) throw criticosError;

      const itensAbaixoMinimo = (itensCriticosData || []).filter(item =>
        (item.quantidade_atual || 0) < (item.itens_estoque?.estoque_minimo || 0)
      ).length;

      const valorTotalEstoque = (saldosData || [])
        .filter(s => (s.quantidade_atual || 0) > 0)
        .reduce((sum, s) => sum + (s.valor_total || 0), 0);
      
      const movimentacoesMes = (movimentacoesData || []).length;
      const entradasMes = (movimentacoesData || []).filter(m => m.tipo_movimentacao === 'entrada').length;
      const saidasMes = (movimentacoesData || []).filter(m => m.tipo_movimentacao === 'saida').length;
      const producoesMes = (producoesData || []).length;
      const comprasMes = (comprasData || []).length;

      setIndicadores({
        total_itens: totalItens,
        itens_abaixo_minimo: itensAbaixoMinimo,
        valor_total_estoque: valorTotalEstoque,
        movimentacoes_mes: movimentacoesMes,
        entradas_mes: entradasMes,
        saidas_mes: saidasMes,
        producoes_mes: producoesMes,
        compras_mes: comprasMes
      });

    } catch (err) {
      console.error('Error fetching indicators:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar indicadores');
    } finally {
      setLoading(false);
    }
  };

  const fetchItensCriticos = async () => {
    try {
      const { data, error } = await supabase
        .from('saldos_estoque')
        .select(`
          *,
          itens_estoque!inner(
            id,
            codigo,
            nome,
            unidade_medida,
            estoque_minimo
          ),
          estoques!inner(nome)
        `)
        .gt('quantidade_atual', 0)
        .order('quantidade_atual', { ascending: true });

      if (error) throw error;

      // Filtrar apenas itens abaixo do mínimo
      const itensCriticos = (data || []).filter(item =>
        (item.quantidade_atual || 0) < (item.itens_estoque?.estoque_minimo || 0)
      );

      const itensCriticosProcessados: ItemCritico[] = itensCriticos
        .slice(0, 10)
        .map(item => ({
          id: item.itens_estoque?.id || item.id,
          nome: item.itens_estoque?.nome || 'Item não encontrado',
          codigo: item.itens_estoque?.codigo,
          quantidade: item.quantidade_atual || 0,
          estoque_minimo: item.itens_estoque?.estoque_minimo || 0,
          unidade_medida: item.itens_estoque?.unidade_medida || 'un',
          estoque_nome: item.estoques?.nome || 'N/A',
          dias_sem_movimentacao: 0 // TODO: calcular baseado na última movimentação
        }));

      setItensCriticos(itensCriticosProcessados);
    } catch (err) {
      console.error('Error fetching critical items:', err);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const renderTabContent = () => {
    switch (selectedTab) {
      case 0:
        return (
          <div className="space-y-6">
            {/* Indicadores */}
            {indicadores && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex items-center">
                    <Package className="w-8 h-8 text-blue-600 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Total de Itens</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {indicadores.total_itens}
                      </p>
                      <p className="text-sm text-gray-600">Cadastrados</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex items-center">
                    <AlertTriangle className="w-8 h-8 text-red-600 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Nível Crítico</p>
                      <p className="text-2xl font-bold text-red-600">
                        {indicadores.itens_abaixo_minimo}
                      </p>
                      <p className="text-sm text-gray-600">Reposição urgente</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex items-center">
                    <DollarSign className="w-8 h-8 text-green-600 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Valor Total</p>
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(indicadores.valor_total_estoque)}
                      </p>
                      <p className="text-sm text-gray-600">Em estoque</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex items-center">
                    <Activity className="w-8 h-8 text-purple-600 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Movimentações</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {indicadores.movimentacoes_mes}
                      </p>
                      <p className="text-sm text-gray-600">Este mês</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Atividades do Mês */}
            {indicadores && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex items-center">
                    <TrendingUp className="w-8 h-8 text-green-600 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Entradas</p>
                      <p className="text-2xl font-bold text-green-600">
                        {indicadores.entradas_mes}
                      </p>
                      <p className="text-sm text-gray-600">Este mês</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex items-center">
                    <TrendingDown className="w-8 h-8 text-red-600 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Saídas</p>
                      <p className="text-2xl font-bold text-red-600">
                        {indicadores.saidas_mes}
                      </p>
                      <p className="text-sm text-gray-600">Este mês</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex items-center">
                    <Factory className="w-8 h-8 text-blue-600 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Produções</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {indicadores.producoes_mes}
                      </p>
                      <p className="text-sm text-gray-600">Este mês</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex items-center">
                    <ShoppingCart className="w-8 h-8 text-orange-600 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Compras</p>
                      <p className="text-2xl font-bold text-orange-600">
                        {indicadores.compras_mes}
                      </p>
                      <p className="text-sm text-gray-600">Este mês</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Itens Críticos */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h4 className="text-lg font-medium text-gray-900 flex items-center">
                  <AlertTriangle className="w-5 h-5 mr-2 text-red-600" />
                  Itens Críticos (Abaixo do Estoque Mínimo)
                </h4>
              </div>
              
              {itensCriticos.length > 0 ? (
                <div className="p-6">
                  <div className="space-y-3">
                    {itensCriticos.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center">
                          <AlertTriangle className="w-5 h-5 text-red-600 mr-3" />
                          <div>
                            <div className="font-medium text-gray-900">{item.nome}</div>
                            {item.codigo && (
                              <div className="text-sm text-gray-500">Código: {item.codigo}</div>
                            )}
                            <div className="text-sm text-gray-600">
                              Estoque: {item.estoque_nome}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-red-600">
                            {item.quantidade} {item.unidade_medida}
                          </div>
                          <div className="text-xs text-gray-500">
                            Mínimo: {item.estoque_minimo} {item.unidade_medida}
                          </div>
                          <div className="text-xs text-red-600">
                            Déficit: {(item.estoque_minimo - item.quantidade).toFixed(3)} {item.unidade_medida}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center">
                  <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Todos os itens estão OK!</h3>
                  <p className="text-gray-500">
                    Nenhum item está abaixo do estoque mínimo.
                  </p>
                </div>
              )}
            </div>
          </div>
        );
      case 1:
        return <EstoquesGerenciamento />;
      case 2:
        return <ItensEstoque />;
      case 3:
        return <FichasTecnicas />;
      case 4:
        return <ComprasEstoque />;
      case 5:
        return <ProducaoEstoque />;
      case 6:
        return <RequisicoesInternas />;
      case 7:
        return <RelatoriosEstoque />;
      case 8:
        return <MovimentacoesEstoque />;
      case 9:
        return <KardexProduto />;
      case 10:
        return <ContagemEstoque />;
      case 11:
        return <VendasDashboard />;
      default:
        return (
          <div className="text-center py-8">
            <p className="text-gray-500">Módulo em desenvolvimento</p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-800">Gestão de Estoque</h2>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        <Tab.Group selectedIndex={selectedTab} onChange={handleTabChange}>
          <Tab.List className="flex space-x-1 rounded-xl bg-white p-1 mb-6 shadow overflow-x-auto">
            {tabTitles.map((title, index) => {
              const Icon = tabIcons[index];
              return (
                <Tab
                  key={title}
                  className={({ selected }) =>
                    `flex items-center whitespace-nowrap rounded-lg py-2.5 px-4 text-sm font-medium leading-5 transition-all
                    ${selected
                      ? 'bg-[#7D1F2C] text-white shadow'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {title}
                </Tab>
              );
            })}
          </Tab.List>

          <Tab.Panels>
            {tabTitles.map((title, index) => (
              <Tab.Panel key={title} className="rounded-xl bg-white p-6 shadow">
                {renderTabContent()}
              </Tab.Panel>
            ))}
          </Tab.Panels>
        </Tab.Group>
      </div>

      {/* Botão flutuante do Chat IA */}
      {!showChatIA && (
        <button
          onClick={() => setShowChatIA(true)}
          className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-full shadow-2xl hover:shadow-3xl hover:scale-110 transition-all duration-300 flex items-center justify-center z-40 group"
          title="Chat com Super Agente IA"
        >
          <MessageSquare className="w-7 h-7" />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse"></span>
          <div className="absolute right-full mr-4 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            Super Agente IA - Estoque
          </div>
        </button>
      )}

      {/* Modal do Chat IA */}
      {showChatIA && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-3xl">
            <ChatFinanceiroIA onClose={() => setShowChatIA(false)} />
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedInventory;