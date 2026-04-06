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
  MessageSquare,
  Eye,
  ChevronRight
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
import InventarioConsolidado from '../components/inventory/InventarioConsolidado';
import DashboardEstoque from '../components/inventory/DashboardEstoque';
import { PageHeader, KPICard } from '../components/ui';

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
    'Inventário',
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
    Eye,
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
        // Dashboard Unificado com Sistema de Alertas de Negativos
        return <DashboardEstoque />;
      case -1:
        return (
          <div className="space-y-6" style={{ minHeight: '400px' }}>
            {/* Indicadores */}
            {indicadores && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 hover:shadow-lg transition-all">
                  <div className="flex items-center">
                    <div className="p-3 bg-gradient-to-br from-[#7D1F2C] to-[#601C28] rounded-lg">
                      <Package className="w-8 h-8 text-white" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total de Itens</p>
                      <p className="text-3xl font-bold text-[#7D1F2C]">
                        {indicadores.total_itens}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Cadastrados</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 hover:shadow-lg transition-all">
                  <div className="flex items-center">
                    <div className="p-3 bg-gradient-to-br from-rose-600 to-rose-700 rounded-lg">
                      <AlertTriangle className="w-8 h-8 text-white" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Nível Crítico</p>
                      <p className="text-3xl font-bold text-rose-600">
                        {indicadores.itens_abaixo_minimo}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Reposição urgente</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 hover:shadow-lg transition-all">
                  <div className="flex items-center">
                    <div className="p-3 bg-gradient-to-br from-[#D4AF37] to-[#C5A028] rounded-lg">
                      <DollarSign className="w-8 h-8 text-white" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Valor Total</p>
                      <p className="text-3xl font-bold text-[#D4AF37]">
                        {formatCurrency(indicadores.valor_total_estoque)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Em estoque</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 hover:shadow-lg transition-all">
                  <div className="flex items-center">
                    <div className="p-3 bg-gradient-to-br from-violet-600 to-violet-700 rounded-lg">
                      <Activity className="w-8 h-8 text-white" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Movimentações</p>
                      <p className="text-3xl font-bold text-violet-600">
                        {indicadores.movimentacoes_mes}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Este mês</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Atividades do Mês */}
            {indicadores && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 hover:shadow-lg transition-all">
                  <div className="flex items-center">
                    <div className="p-3 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-lg">
                      <TrendingUp className="w-8 h-8 text-white" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Entradas</p>
                      <p className="text-3xl font-bold text-emerald-600">
                        {indicadores.entradas_mes}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Este mês</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 hover:shadow-lg transition-all">
                  <div className="flex items-center">
                    <div className="p-3 bg-gradient-to-br from-rose-600 to-rose-700 rounded-lg">
                      <TrendingDown className="w-8 h-8 text-white" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Saídas</p>
                      <p className="text-3xl font-bold text-rose-600">
                        {indicadores.saidas_mes}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Este mês</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 hover:shadow-lg transition-all">
                  <div className="flex items-center">
                    <div className="p-3 bg-gradient-to-br from-sky-600 to-sky-700 rounded-lg">
                      <Factory className="w-8 h-8 text-white" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Produções</p>
                      <p className="text-3xl font-bold text-sky-600">
                        {indicadores.producoes_mes}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Este mês</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 hover:shadow-lg transition-all">
                  <div className="flex items-center">
                    <div className="p-3 bg-gradient-to-br from-amber-600 to-amber-700 rounded-lg">
                      <ShoppingCart className="w-8 h-8 text-white" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Compras</p>
                      <p className="text-3xl font-bold text-amber-600">
                        {indicadores.compras_mes}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Este mês</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Itens Críticos */}
            <div className="rounded-xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="p-6 border-b" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                <h4 className="text-lg font-medium text-white flex items-center">
                  <AlertTriangle className="w-5 h-5 mr-2 text-rose-400" />
                  Itens Críticos (Abaixo do Estoque Mínimo)
                </h4>
              </div>

              {itensCriticos.length > 0 ? (
                <div className="p-6">
                  <div className="space-y-3">
                    {itensCriticos.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-4 rounded-lg" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                        <div className="flex items-center">
                          <AlertTriangle className="w-5 h-5 text-rose-400 mr-3" />
                          <div>
                            <div className="font-medium text-white">{item.nome}</div>
                            {item.codigo && (
                              <div className="text-sm text-white/50">Código: {item.codigo}</div>
                            )}
                            <div className="text-sm text-white/60">
                              Estoque: {item.estoque_nome}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-rose-400">
                            {item.quantidade} {item.unidade_medida}
                          </div>
                          <div className="text-xs text-white/50">
                            Mínimo: {item.estoque_minimo} {item.unidade_medida}
                          </div>
                          <div className="text-xs text-rose-400">
                            Déficit: {(item.estoque_minimo - item.quantidade).toFixed(3)} {item.unidade_medida}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center">
                  <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">Todos os itens estão OK!</h3>
                  <p className="text-white/50">
                    Nenhum item está abaixo do estoque mínimo.
                  </p>
                </div>
              )}
            </div>
          </div>
        );
      case 1:
        return <InventarioConsolidado />;
      case 2:
        return <EstoquesGerenciamento />;
      case 3:
        return <ItensEstoque />;
      case 4:
        return <FichasTecnicas />;
      case 5:
        return <ComprasEstoque />;
      case 6:
        return <ProducaoEstoque />;
      case 7:
        return <RequisicoesInternas />;
      case 8:
        return <RelatoriosEstoque />;
      case 9:
        return <MovimentacoesEstoque />;
      case 10:
        return <KardexProduto />;
      case 11:
        return <ContagemEstoque />;
      case 12:
        return <VendasDashboard />;
      default:
        return (
          <div className="text-center py-8">
            <p className="text-white/50">Módulo em desenvolvimento</p>
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col min-h-screen -m-6 lg:-m-8" style={{ background: '#0d0f1a' }}>

      {/* HERO DA SEÇÃO */}
      <div
        className="relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #7D1F2C 0%, #5a1520 60%, #3d0f16 100%)',
        }}
      >
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '24px 24px',
          }}
        />
        <div
          className="absolute -top-20 -right-20 w-80 h-80 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #D4AF37, transparent 70%)' }}
        />

        <div className="relative px-6 lg:px-8 pt-7 pb-0">
          <div className="flex items-center gap-1.5 mb-4">
            <span className="text-white/30 text-xs">Estoque</span>
            <ChevronRight className="text-white/20" style={{width:'12px',height:'12px'}} />
            <span className="text-white/60 text-xs font-medium">{tabTitles[selectedTab]}</span>
          </div>

          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}
              >
                <Warehouse className="text-white/80" style={{width:'18px',height:'18px'}} />
              </div>
              <div>
                <h1 className="text-white text-2xl font-bold leading-none tracking-tight">
                  Gestão de Estoque
                </h1>
                <p className="text-white/40 text-sm mt-1">Controle completo do estoque e movimentações</p>
              </div>
            </div>
          </div>

          <nav className="flex items-end gap-0 mt-6 overflow-x-auto scrollbar-hide">
            {tabTitles.map((title, index) => {
              const Icon = tabIcons[index];
              const active = index === selectedTab;
              return (
                <button
                  key={index}
                  onClick={() => handleTabChange(index)}
                  className={`
                    flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium
                    border-b-2 whitespace-nowrap transition-all duration-150 flex-shrink-0
                    ${active
                      ? 'border-[#D4AF37] text-white bg-white/5'
                      : 'border-transparent text-white/35 hover:text-white/60 hover:bg-white/5'
                    }
                  `}
                >
                  <Icon style={{width:'12px',height:'12px'}} />
                  {title}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* CONTEÚDO */}
      <div className="flex-1 px-6 lg:px-8 py-6" style={{ background: '#0d0f1a' }}>
        {error && (
          <div className="mb-6 p-4 rounded-lg" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5' }}>
            {error}
          </div>
        )}

        {renderTabContent()}
      </div>

      {/* Botão flutuante do Chat IA */}
      {!showChatIA && (
        <button
          onClick={() => setShowChatIA(true)}
          className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-br from-[#7D1F2C] to-[#D4AF37] text-white rounded-full shadow-2xl hover:shadow-3xl hover:scale-110 transition-all duration-300 flex items-center justify-center z-40 group"
          title="Chat com Super Agente IA"
        >
          <MessageSquare className="w-7 h-7" />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white animate-pulse"></span>
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