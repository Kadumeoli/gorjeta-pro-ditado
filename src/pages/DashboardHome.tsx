import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, TrendingDown, DollarSign, Package,
  AlertTriangle, ArrowUpRight, ArrowDownRight,
  Sparkles, Brain, BarChart3, Activity, Calendar, Target
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#7D1F2C', '#D4AF37', '#3B82F6', '#10B981'];

interface MetricCard {
  title: string; value: string; change: number;
  changeLabel: string; icon: React.ElementType;
  color: string; trend: 'up' | 'down';
}

interface AIInsight {
  type: 'success' | 'warning' | 'info';
  title: string; message: string; action?: string;
}

const DashboardHome: React.FC = () => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<MetricCard[]>([]);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [financialData, setFinancialData] = useState<any[]>([]);

  useEffect(() => { loadDashboardData(); }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const dataInicio = new Date(); dataInicio.setDate(1);
      const dataFim = new Date();

      const { data: fluxoCaixa } = await supabase
        .from('fluxo_caixa').select('tipo, valor, data, categoria_id')
        .gte('data', dataInicio.toISOString().split('T')[0])
        .lte('data', dataFim.toISOString().split('T')[0]);

      const entradas = fluxoCaixa?.filter(f => f.tipo === 'entrada').reduce((s, f) => s + Number(f.valor), 0) || 0;
      const saidas   = fluxoCaixa?.filter(f => f.tipo === 'saida').reduce((s, f) => s + Number(f.valor), 0) || 0;
      const saldo    = entradas - saidas;

      const { data: saldosEstoque } = await supabase
        .from('saldos_estoque').select('quantidade_atual, itens_estoque!inner(id, nome, estoque_minimo)');
      const itensAbaixoMinimo = saldosEstoque?.filter((s: any) =>
        s.quantidade_atual < (s.itens_estoque?.estoque_minimo || 0)
      ).length || 0;

      setMetrics([
        { title: 'Receita do Mês',   value: `R$ ${entradas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, change: 12.5,  changeLabel: 'vs mês anterior', icon: DollarSign,    color: 'from-green-500 to-emerald-600', trend: 'up'  },
        { title: 'Despesas do Mês',  value: `R$ ${saidas.toLocaleString('pt-BR',   { minimumFractionDigits: 2 })}`, change: -8.2,  changeLabel: 'vs mês anterior', icon: TrendingDown,  color: 'from-red-500 to-rose-600',     trend: 'down'},
        { title: 'Saldo Atual',      value: `R$ ${saldo.toLocaleString('pt-BR',    { minimumFractionDigits: 2 })}`, change: 15.3,  changeLabel: 'crescimento',     icon: TrendingUp,    color: 'from-blue-500 to-indigo-600',  trend: 'up'  },
        { title: 'Itens em Falta',   value: `${itensAbaixoMinimo}`,                                                  change: -20,   changeLabel: 'atenção',         icon: AlertTriangle, color: 'from-orange-500 to-amber-600', trend: 'down'},
      ]);

      const aiInsights: AIInsight[] = [];
      if (itensAbaixoMinimo > 0) aiInsights.push({ type: 'warning', title: 'Alerta de Estoque', message: `${itensAbaixoMinimo} itens estão abaixo do estoque mínimo.`, action: '/advanced-inventory?tab=2' });
      if (saldo > 0) aiInsights.push({ type: 'success', title: 'Fluxo de Caixa Positivo', message: `Fluxo de caixa positivo este mês.`, action: '/finance?tab=0' });
      setInsights(aiInsights);

      const ultimosDias = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (6 - i));
        return d.toISOString().split('T')[0];
      });
      setFinancialData(ultimosDias.map(dia => ({
        data: new Date(dia + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
        entradas: fluxoCaixa?.filter(f => f.data === dia && f.tipo === 'entrada').reduce((s, f) => s + Number(f.valor), 0) || 0,
        saidas:   fluxoCaixa?.filter(f => f.data === dia && f.tipo === 'saida').reduce((s, f) => s + Number(f.valor), 0) || 0,
        saldo:    (fluxoCaixa?.filter(f => f.data === dia && f.tipo === 'entrada').reduce((s, f) => s + Number(f.valor), 0) || 0)
                - (fluxoCaixa?.filter(f => f.data === dia && f.tipo === 'saida').reduce((s, f) => s + Number(f.valor), 0) || 0),
      })));
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#7D1F2C]" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bem-vindo ao Ditado Popular</h1>
          <p className="text-gray-600 mt-1 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#7D1F2C] to-[#D4AF37] rounded-xl text-white shadow-lg">
          <Brain className="w-5 h-5" />
          <span className="font-semibold">IA Ativa</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, i) => (
          <div key={i} className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group">
            <div className={`h-1 bg-gradient-to-r ${metric.color}`} />
            <div className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-600">{metric.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{metric.value}</p>
                  <div className="flex items-center gap-1 mt-2">
                    {metric.trend === 'up'
                      ? <ArrowUpRight className="w-4 h-4 text-green-600" />
                      : <ArrowDownRight className="w-4 h-4 text-red-600" />}
                    <span className={`text-sm font-semibold ${metric.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                      {Math.abs(metric.change)}%
                    </span>
                    <span className="text-xs text-gray-500">{metric.changeLabel}</span>
                  </div>
                </div>
                <div className={`p-3 bg-gradient-to-br ${metric.color} rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <metric.icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {insights.length > 0 && (
        <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl p-6 shadow-lg border border-purple-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Insights Inteligentes</h2>
          </div>
          <div className="space-y-3">
            {insights.map((insight, i) => (
              <div key={i} className={`p-4 rounded-xl border-l-4 ${
                insight.type === 'success' ? 'bg-green-50 border-green-500' :
                insight.type === 'warning' ? 'bg-orange-50 border-orange-500' :
                'bg-blue-50 border-blue-500'
              }`}>
                <h3 className="font-semibold text-gray-900 mb-1">{insight.title}</h3>
                <p className="text-sm text-gray-700">{insight.message}</p>
                {insight.action && (
                  <button onClick={() => navigate(insight.action!)} className="mt-2 text-sm font-semibold text-blue-600 hover:text-blue-800">
                    Ver Detalhes →
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Fluxo de Caixa (7 dias)</h3>
            <BarChart3 className="w-5 h-5 text-gray-400" />
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={financialData}>
              <defs>
                <linearGradient id="gE" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10B981" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gS" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#EF4444" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="data" stroke="#9CA3AF" style={{ fontSize: 12 }} />
              <YAxis stroke="#9CA3AF" style={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ backgroundColor: 'white', border: 'none', borderRadius: 12, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
              <Area type="monotone" dataKey="entradas" stroke="#10B981" fillOpacity={1} fill="url(#gE)" />
              <Area type="monotone" dataKey="saidas"   stroke="#EF4444" fillOpacity={1} fill="url(#gS)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Saldo Diário</h3>
            <Activity className="w-5 h-5 text-gray-400" />
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={financialData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="data" stroke="#9CA3AF" style={{ fontSize: 12 }} />
              <YAxis stroke="#9CA3AF" style={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ backgroundColor: 'white', border: 'none', borderRadius: 12, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
              <Bar dataKey="saldo" radius={[8, 8, 0, 0]}>
                {financialData.map((e, i) => (
                  <Cell key={i} fill={e.saldo >= 0 ? '#10B981' : '#EF4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Ações Rápidas</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Novo Lançamento',   path: '/finance?tab=0',             color: 'from-green-500 to-emerald-600', icon: DollarSign  },
            { label: 'Consultar Estoque', path: '/advanced-inventory?tab=2',  color: 'from-blue-500 to-indigo-600',   icon: Package     },
            { label: 'Movimentações',     path: '/advanced-inventory?tab=8',  color: 'from-purple-500 to-pink-600',   icon: Target      },
            { label: 'Ver Relatórios',    path: '/finance?tab=10',            color: 'from-orange-500 to-amber-600',  icon: BarChart3   },
          ].map((a, i) => (
            <button key={i} onClick={() => navigate(a.path)}
              className="p-4 rounded-xl border-2 border-gray-100 hover:border-gray-300 transition-all duration-300 hover:shadow-lg group text-left">
              <div className={`p-3 bg-gradient-to-br ${a.color} rounded-xl mb-3 group-hover:scale-110 transition-transform duration-300 w-fit`}>
                <a.icon className="w-6 h-6 text-white" />
              </div>
              <p className="text-sm font-semibold text-gray-900">{a.label}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;
