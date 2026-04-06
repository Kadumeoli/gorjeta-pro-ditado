import { useEffect, useState } from 'react';
import { Package, AlertTriangle, TrendingUp, TrendingDown, DollarSign, Activity, ArrowRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { estatisticasNegativos } from '../../services/movimentacoesService';
import { Link } from 'react-router-dom';
import AlertasEstoqueNegativo from './AlertasEstoqueNegativo';

interface Stats {
  totalItens: number;
  valorTotal: number;
  itensCriticos: number;
  movimentacoesHoje: number;
  itensNegativos: number;
  valorNegativos: number;
}

interface ItemCritico {
  item_nome: string;
  item_codigo: string;
  estoque_nome: string;
  quantidade_atual: number;
  status_estoque: string;
}

interface Movimentacao {
  id: string;
  tipo_movimentacao: string;
  quantidade: number;
  data_movimentacao: string;
  item: {
    nome: string;
    codigo: string;
  };
  estoque_origem?: {
    nome: string;
  };
  estoque_destino?: {
    nome: string;
  };
}

export default function DashboardEstoque() {
  const [stats, setStats] = useState<Stats>({
    totalItens: 0,
    valorTotal: 0,
    itensCriticos: 0,
    movimentacoesHoje: 0,
    itensNegativos: 0,
    valorNegativos: 0,
  });
  const [itensCriticos, setItensCriticos] = useState<ItemCritico[]>([]);
  const [movimentacoesRecentes, setMovimentacoesRecentes] = useState<Movimentacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostrarAlertas, setMostrarAlertas] = useState(false);

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    setLoading(true);
    try {
      // Buscar estatísticas gerais
      const { data: saldos } = await supabase
        .from('vw_saldos_consolidados')
        .select('quantidade_atual, valor_total, status_estoque');

      // Buscar itens críticos e negativos
      const { data: criticos } = await supabase
        .from('vw_saldos_consolidados')
        .select('*')
        .in('status_estoque', ['CRITICO', 'NEGATIVO', 'ZERADO'])
        .order('quantidade_atual', { ascending: true })
        .limit(10);

      // Buscar movimentações de hoje
      const hoje = new Date().toISOString().split('T')[0];
      const { data: movimentacoes } = await supabase
        .from('movimentacoes_estoque')
        .select(`
          id,
          tipo_movimentacao,
          quantidade,
          data_movimentacao,
          item:itens_estoque(nome, codigo),
          estoque_origem:estoque_origem_id(nome),
          estoque_destino:estoque_destino_id(nome)
        `)
        .eq('data_movimentacao', hoje)
        .order('data_movimentacao', { ascending: false })
        .limit(10);

      // Buscar estatísticas de negativos
      const statsNegativos = await estatisticasNegativos();

      // Calcular totais
      const totalItens = saldos?.length || 0;
      const valorTotal = saldos?.reduce((sum, s) => sum + (s.valor_total || 0), 0) || 0;
      const itensCriticosCount = saldos?.filter(s => ['CRITICO', 'NEGATIVO', 'ZERADO'].includes(s.status_estoque)).length || 0;

      setStats({
        totalItens,
        valorTotal,
        itensCriticos: itensCriticosCount,
        movimentacoesHoje: movimentacoes?.length || 0,
        itensNegativos: statsNegativos.totalItensNegativos,
        valorNegativos: statsNegativos.valorTotalNegativo,
      });

      setItensCriticos(criticos || []);
      setMovimentacoesRecentes(movimentacoes || []);
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
    } finally {
      setLoading(false);
    }
  }

  const getTipoMovimentacaoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      entrada: 'Entrada',
      saida: 'Saída',
      transferencia: 'Transferência',
      ajuste_positivo: 'Ajuste +',
      ajuste_negativo: 'Ajuste -',
      producao: 'Produção',
      consumo: 'Consumo',
      perda: 'Perda',
      venda: 'Venda',
      devolucao: 'Devolução',
    };
    return labels[tipo] || tipo;
  };

  const getTipoMovimentacaoColor = (tipo: string) => {
    if (['entrada', 'producao', 'devolucao', 'ajuste_positivo'].includes(tipo)) {
      return 'text-green-600 bg-green-50';
    }
    if (['saida', 'consumo', 'perda', 'venda', 'ajuste_negativo'].includes(tipo)) {
      return 'text-red-600 bg-red-50';
    }
    return 'text-blue-600 bg-blue-50';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cards de Estatísticas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total de Itens</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalItens}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Valor Total</p>
              <p className="text-2xl font-bold text-gray-900">
                R$ {stats.valorTotal.toFixed(2)}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Movimentações Hoje</p>
              <p className="text-2xl font-bold text-gray-900">{stats.movimentacoesHoje}</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <Activity className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Itens Críticos</p>
              <p className="text-2xl font-bold text-gray-900">{stats.itensCriticos}</p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-full">
              <AlertTriangle className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Alerta de Itens Negativos */}
      {stats.itensNegativos > 0 && (
        <div className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-300 rounded-lg p-6 shadow-lg">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="bg-red-100 p-3 rounded-full">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-red-900 mb-1">
                  {stats.itensNegativos} {stats.itensNegativos === 1 ? 'item está' : 'itens estão'} com saldo NEGATIVO
                </h3>
                <p className="text-red-700 mb-3">
                  Valor total em negativo: R$ {Math.abs(stats.valorNegativos).toFixed(2)}
                </p>
                <p className="text-sm text-red-600">
                  Itens com saldo negativo indicam que houve saída antes da entrada.
                  Regularize o mais rápido possível para manter a acuracidade do estoque.
                </p>
              </div>
            </div>
            <button
              onClick={() => setMostrarAlertas(!mostrarAlertas)}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 font-medium flex items-center gap-2"
            >
              {mostrarAlertas ? 'Ocultar' : 'Ver Detalhes'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Mostrar alertas detalhados se solicitado */}
      {mostrarAlertas && stats.itensNegativos > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Detalhes dos Itens Negativos</h3>
          <AlertasEstoqueNegativo />
        </div>
      )}

      {/* Grid com Itens Críticos e Movimentações Recentes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Itens Críticos */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Itens que Precisam de Atenção</h3>
          <div className="space-y-2">
            {itensCriticos.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Nenhum item crítico no momento</p>
            ) : (
              itensCriticos.map((item, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border-l-4 ${
                    item.status_estoque === 'NEGATIVO'
                      ? 'border-red-600 bg-red-50'
                      : item.status_estoque === 'ZERADO'
                      ? 'border-gray-400 bg-gray-50'
                      : 'border-yellow-500 bg-yellow-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {item.item_codigo} - {item.item_nome}
                      </p>
                      <p className="text-sm text-gray-600">{item.estoque_nome}</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${
                        item.status_estoque === 'NEGATIVO' ? 'text-red-600' : 'text-gray-900'
                      }`}>
                        {item.quantidade_atual.toFixed(2)}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        item.status_estoque === 'NEGATIVO'
                          ? 'bg-red-100 text-red-700'
                          : item.status_estoque === 'ZERADO'
                          ? 'bg-gray-200 text-gray-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {item.status_estoque}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Movimentações Recentes */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Movimentações de Hoje</h3>
          <div className="space-y-2">
            {movimentacoesRecentes.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Nenhuma movimentação hoje</p>
            ) : (
              movimentacoesRecentes.map((mov) => (
                <div key={mov.id} className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded font-medium ${getTipoMovimentacaoColor(mov.tipo_movimentacao)}`}>
                          {getTipoMovimentacaoLabel(mov.tipo_movimentacao)}
                        </span>
                        <p className="text-sm font-medium text-gray-900">
                          {mov.item?.codigo} - {mov.item?.nome}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-600">
                        {mov.estoque_origem && <span>De: {mov.estoque_origem.nome}</span>}
                        {mov.estoque_destino && <span>Para: {mov.estoque_destino.nome}</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">{mov.quantidade.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Ações Rápidas */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Ações Rápidas</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => {}}
            className="flex flex-col items-center justify-center p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
          >
            <TrendingUp className="h-8 w-8 text-blue-600 mb-2" />
            <span className="text-sm font-medium text-gray-700">Nova Movimentação</span>
          </button>

          <button
            onClick={() => {}}
            className="flex flex-col items-center justify-center p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors"
          >
            <Package className="h-8 w-8 text-green-600 mb-2" />
            <span className="text-sm font-medium text-gray-700">Nova Contagem</span>
          </button>

          <button
            onClick={() => {}}
            className="flex flex-col items-center justify-center p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors"
          >
            <Package className="h-8 w-8 text-purple-600 mb-2" />
            <span className="text-sm font-medium text-gray-700">Cadastrar Item</span>
          </button>

          <button
            onClick={() => {}}
            className="flex flex-col items-center justify-center p-4 border-2 border-gray-200 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-colors"
          >
            <Activity className="h-8 w-8 text-orange-600 mb-2" />
            <span className="text-sm font-medium text-gray-700">Relatórios</span>
          </button>
        </div>
      </div>
    </div>
  );
}
