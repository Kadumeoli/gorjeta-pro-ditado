import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, Clock, TrendingDown, TrendingUp } from 'lucide-react';
import { buscarAlertasNegativos, estatisticasNegativos } from '../../services/movimentacoesService';
import dayjs from '../../lib/dayjs';

interface AlertaNegativo {
  id: string;
  item_id: string;
  estoque_id: string;
  data_ficou_negativo: string;
  quantidade_negativa: number;
  valor_total: number;
  observacao: string;
  data_regularizacao?: string;
  item: {
    nome: string;
    codigo: string;
    unidade_medida: string;
  };
  estoque: {
    nome: string;
  };
}

interface Estatisticas {
  totalItensNegativos: number;
  totalAlertasAtivos: number;
  valorTotalNegativo: number;
  itensNegativos: any[];
}

export default function AlertasEstoqueNegativo() {
  const [alertas, setAlertas] = useState<AlertaNegativo[]>([]);
  const [stats, setStats] = useState<Estatisticas>({
    totalItensNegativos: 0,
    totalAlertasAtivos: 0,
    valorTotalNegativo: 0,
    itensNegativos: [],
  });
  const [loading, setLoading] = useState(true);
  const [mostrarApenasCriticos, setMostrarApenasCriticos] = useState(false);

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    setLoading(true);
    try {
      const [alertasData, statsData] = await Promise.all([
        buscarAlertasNegativos(),
        estatisticasNegativos(),
      ]);

      setAlertas(alertasData as AlertaNegativo[]);
      setStats(statsData);
    } catch (error) {
      console.error('Erro ao carregar alertas:', error);
    } finally {
      setLoading(false);
    }
  }

  const alertasFiltrados = mostrarApenasCriticos
    ? alertas.filter(a => Math.abs(a.quantidade_negativa) > 5)
    : alertas;

  const formatarTempo = (data: string) => {
    const diff = dayjs().diff(dayjs(data), 'day');
    if (diff === 0) return 'Hoje';
    if (diff === 1) return 'Ontem';
    if (diff < 7) return `${diff} dias atrás`;
    if (diff < 30) return `${Math.floor(diff / 7)} semanas atrás`;
    return `${Math.floor(diff / 30)} meses atrás`;
  };

  const getSeveridade = (quantidade: number) => {
    const abs = Math.abs(quantidade);
    if (abs >= 10) return 'critico';
    if (abs >= 5) return 'alto';
    return 'medio';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (alertas.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-center gap-3">
          <CheckCircle className="h-6 w-6 text-green-600" />
          <div>
            <h3 className="font-semibold text-green-900">Tudo em ordem!</h3>
            <p className="text-sm text-green-700">Nenhum item está com saldo negativo no momento.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-600">Itens Negativos</p>
              <p className="text-2xl font-bold text-red-900">{stats.totalItensNegativos}</p>
            </div>
            <div className="bg-red-100 p-3 rounded-full">
              <TrendingDown className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-600">Alertas Ativos</p>
              <p className="text-2xl font-bold text-orange-900">{stats.totalAlertasAtivos}</p>
            </div>
            <div className="bg-orange-100 p-3 rounded-full">
              <AlertTriangle className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-600">Valor Total</p>
              <p className="text-2xl font-bold text-yellow-900">
                R$ {Math.abs(stats.valorTotalNegativo).toFixed(2)}
              </p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-full">
              <TrendingUp className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex items-center justify-between bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={mostrarApenasCriticos}
              onChange={(e) => setMostrarApenasCriticos(e.target.checked)}
              className="rounded border-gray-300 text-red-600 focus:ring-red-500"
            />
            <span className="text-sm text-gray-700">Mostrar apenas críticos (&gt; 5 unidades)</span>
          </label>
        </div>
        <button
          onClick={carregarDados}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          Atualizar
        </button>
      </div>

      {/* Lista de Alertas */}
      <div className="space-y-2">
        {alertasFiltrados.map((alerta) => {
          const severidade = getSeveridade(alerta.quantidade_negativa);

          return (
            <div
              key={alerta.id}
              className={`border-l-4 rounded-lg p-4 bg-white shadow-sm ${
                severidade === 'critico'
                  ? 'border-red-600 bg-red-50'
                  : severidade === 'alto'
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-yellow-500 bg-yellow-50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <AlertTriangle
                      className={`h-5 w-5 ${
                        severidade === 'critico'
                          ? 'text-red-600'
                          : severidade === 'alto'
                          ? 'text-orange-600'
                          : 'text-yellow-600'
                      }`}
                    />
                    <h3 className="font-semibold text-gray-900">
                      {alerta.item.codigo} - {alerta.item.nome}
                    </h3>
                    {severidade === 'critico' && (
                      <span className="px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-700 rounded-full">
                        CRÍTICO
                      </span>
                    )}
                  </div>

                  <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Estoque</p>
                      <p className="font-medium text-gray-900">{alerta.estoque.nome}</p>
                    </div>

                    <div>
                      <p className="text-gray-600">Saldo Negativo</p>
                      <p className="font-bold text-red-600">
                        {alerta.quantidade_negativa.toFixed(2)} {alerta.item.unidade_medida}
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-600">Valor</p>
                      <p className="font-medium text-gray-900">
                        R$ {Math.abs(alerta.valor_total).toFixed(2)}
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-600">Há quanto tempo</p>
                      <div className="flex items-center gap-1 text-gray-900">
                        <Clock className="h-3 w-3" />
                        <p className="font-medium">{formatarTempo(alerta.data_ficou_negativo)}</p>
                      </div>
                    </div>
                  </div>

                  {alerta.observacao && (
                    <div className="mt-2 text-sm text-gray-600 italic">
                      {alerta.observacao}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {alertasFiltrados.length === 0 && alertas.length > 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>Nenhum alerta crítico encontrado.</p>
          <button
            onClick={() => setMostrarApenasCriticos(false)}
            className="mt-2 text-blue-600 hover:text-blue-800 font-medium"
          >
            Mostrar todos os alertas
          </button>
        </div>
      )}

      {/* Guia de Ação */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">O que fazer?</h4>
        <ul className="space-y-1 text-sm text-blue-800">
          <li>• Verifique se a saída foi lançada antes da entrada correspondente</li>
          <li>• Registre a entrada de mercadoria para regularizar o saldo</li>
          <li>• Confira se não houve erro no lançamento da quantidade</li>
          <li>• Saldos negativos são permitidos mas devem ser regularizados o mais rápido possível</li>
        </ul>
      </div>
    </div>
  );
}
