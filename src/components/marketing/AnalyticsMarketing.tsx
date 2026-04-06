import React, { useState, useEffect } from 'react';
import {
  Eye, MousePointer, DollarSign, TrendingUp, BarChart3,
  ArrowUpRight, ArrowDownRight, Calendar, Filter
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { supabase } from '../../lib/supabase';
import dayjs from '../../lib/dayjs';

interface MetricaAgg {
  data: string;
  canal: string;
  impressoes: number;
  cliques: number;
  conversoes: number;
  gasto: number;
  receita: number;
}

interface CampanhaResumo {
  id: string;
  nome: string;
  status: string;
  budget_planejado: number;
  budget_gasto: number;
  total_impressoes: number;
  total_cliques: number;
  total_conversoes: number;
  total_gasto: number;
  total_receita: number;
}

const COLORS = ['#D97706', '#3B82F6', '#10B981', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

const AnalyticsMarketing: React.FC = () => {
  const [periodo, setPeriodo] = useState('30d');
  const [metricas, setMetricas] = useState<MetricaAgg[]>([]);
  const [campanhas, setCampanhas] = useState<CampanhaResumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [canalFiltro, setCanalFiltro] = useState('todos');

  useEffect(() => {
    fetchData();
  }, [periodo]);

  const getDateRange = () => {
    const end = dayjs();
    let start;
    switch (periodo) {
      case '7d': start = end.subtract(7, 'day'); break;
      case '30d': start = end.subtract(30, 'day'); break;
      case '90d': start = end.subtract(90, 'day'); break;
      default: start = end.subtract(30, 'day');
    }
    return { start: start.format('YYYY-MM-DD'), end: end.format('YYYY-MM-DD') };
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const { start, end } = getDateRange();

      const { data: metricasData } = await supabase
        .from('campanhas_metricas')
        .select('*')
        .gte('data', start)
        .lte('data', end)
        .order('data', { ascending: true });

      setMetricas(metricasData || []);

      const { data: campanhasData } = await supabase
        .from('campanhas_marketing')
        .select('id, nome, status, budget_planejado, budget_gasto')
        .not('status', 'eq', 'cancelado');

      const campanhasComMetricas = (campanhasData || []).map(c => {
        const metricasCampanha = (metricasData || []).filter(m => m.campanha_id === c.id);
        return {
          ...c,
          total_impressoes: metricasCampanha.reduce((s, m) => s + Number(m.impressoes), 0),
          total_cliques: metricasCampanha.reduce((s, m) => s + Number(m.cliques), 0),
          total_conversoes: metricasCampanha.reduce((s, m) => s + Number(m.conversoes), 0),
          total_gasto: metricasCampanha.reduce((s, m) => s + Number(m.gasto), 0),
          total_receita: metricasCampanha.reduce((s, m) => s + Number(m.receita), 0)
        };
      });

      setCampanhas(campanhasComMetricas);
    } catch (error) {
      console.error('Erro ao carregar analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const metricasFiltradas = canalFiltro === 'todos'
    ? metricas
    : metricas.filter(m => m.canal === canalFiltro);

  const totalImpressions = metricasFiltradas.reduce((s, m) => s + Number(m.impressoes), 0);
  const totalClicks = metricasFiltradas.reduce((s, m) => s + Number(m.cliques), 0);
  const totalConversions = metricasFiltradas.reduce((s, m) => s + Number(m.conversoes), 0);
  const totalSpend = metricasFiltradas.reduce((s, m) => s + Number(m.gasto), 0);
  const totalRevenue = metricasFiltradas.reduce((s, m) => s + Number(m.receita), 0);
  const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions * 100) : 0;
  const avgCPC = totalClicks > 0 ? totalSpend / totalClicks : 0;
  const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0;

  const dadosPorDia = metricasFiltradas.reduce((acc, m) => {
    const existing = acc.find(a => a.data === m.data);
    if (existing) {
      existing.impressoes += Number(m.impressoes);
      existing.cliques += Number(m.cliques);
      existing.conversoes += Number(m.conversoes);
      existing.gasto += Number(m.gasto);
      existing.receita += Number(m.receita);
    } else {
      acc.push({
        data: m.data,
        impressoes: Number(m.impressoes),
        cliques: Number(m.cliques),
        conversoes: Number(m.conversoes),
        gasto: Number(m.gasto),
        receita: Number(m.receita)
      });
    }
    return acc;
  }, [] as any[]).sort((a, b) => a.data.localeCompare(b.data));

  const dadosPorCanal = metricas.reduce((acc, m) => {
    const existing = acc.find(a => a.canal === m.canal);
    if (existing) {
      existing.gasto += Number(m.gasto);
      existing.cliques += Number(m.cliques);
    } else {
      acc.push({ canal: m.canal, gasto: Number(m.gasto), cliques: Number(m.cliques) });
    }
    return acc;
  }, [] as { canal: string; gasto: number; cliques: number }[]);

  const canaisUnicos = [...new Set(metricas.map(m => m.canal))];

  const formatNumber = (n: number) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toLocaleString('pt-BR');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Analytics de Marketing</h2>
        <div className="flex items-center gap-3">
          {canaisUnicos.length > 0 && (
            <select
              value={canalFiltro}
              onChange={e => setCanalFiltro(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
            >
              <option value="todos">Todos os canais</option>
              {canaisUnicos.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}
          <div className="flex bg-gray-100 rounded-lg p-1">
            {[
              { value: '7d', label: '7 dias' },
              { value: '30d', label: '30 dias' },
              { value: '90d', label: '90 dias' }
            ].map(p => (
              <button
                key={p.value}
                onClick={() => setPeriodo(p.value)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  periodo === p.value
                    ? 'bg-white text-white shadow-sm'
                    : 'text-gray-600 hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { label: 'Impressões', value: formatNumber(totalImpressions), icon: Eye, color: 'bg-blue-50 text-blue-700' },
          { label: 'Cliques', value: formatNumber(totalClicks), icon: MousePointer, color: 'bg-amber-50 text-amber-700' },
          { label: 'CTR', value: avgCTR.toFixed(2) + '%', icon: TrendingUp, color: 'bg-green-50 text-green-700' },
          { label: 'CPC', value: 'R$ ' + avgCPC.toFixed(2), icon: DollarSign, color: 'bg-sky-50 text-sky-700' },
          { label: 'Conversões', value: formatNumber(totalConversions), icon: ArrowUpRight, color: 'bg-emerald-50 text-emerald-700' },
          { label: 'Gasto Total', value: 'R$ ' + formatNumber(totalSpend), icon: DollarSign, color: 'bg-red-50 text-red-700' },
          { label: 'ROAS', value: roas.toFixed(2) + 'x', icon: BarChart3, color: 'bg-teal-50 text-teal-700' }
        ].map((kpi, idx) => (
          <div key={idx} className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className={`p-1.5 rounded ${kpi.color}`}>
                <kpi.icon className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs text-gray-500">{kpi.label}</span>
            </div>
            <p className="text-lg font-bold text-white">{kpi.value}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Carregando dados...</p>
        </div>
      ) : metricas.length === 0 ? (
        <div className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 p-12 text-center">
          <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white/80 mb-2">Nenhuma métrica registrada</h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            As métricas serão exibidas aqui quando campanhas estiverem ativas e dados forem sincronizados
            das plataformas de anúncios.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-white/80 mb-4">Impressões e Cliques por Dia</h3>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={dadosPorDia}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="data"
                  tickFormatter={v => dayjs(v).format('DD/MM')}
                  tick={{ fontSize: 11 }}
                />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  labelFormatter={v => dayjs(v).format('DD/MM/YYYY')}
                  formatter={(value: number) => formatNumber(value)}
                />
                <Area
                  type="monotone"
                  dataKey="impressoes"
                  name="Impressões"
                  stroke="#3B82F6"
                  fill="#3B82F680"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="cliques"
                  name="Cliques"
                  stroke="#D97706"
                  fill="#D9770680"
                  strokeWidth={2}
                />
                <Legend />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-white/80 mb-4">Gasto vs Receita por Dia</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={dadosPorDia}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="data"
                  tickFormatter={v => dayjs(v).format('DD/MM')}
                  tick={{ fontSize: 11 }}
                />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  labelFormatter={v => dayjs(v).format('DD/MM/YYYY')}
                  formatter={(value: number) => 'R$ ' + value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                />
                <Bar dataKey="gasto" name="Gasto" fill="#EF4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="receita" name="Receita" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Legend />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {dadosPorCanal.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-white/80 mb-4">Distribuição por Canal</h3>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={dadosPorCanal}
                    dataKey="gasto"
                    nameKey="canal"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ canal, percent }) => `${canal} ${(percent * 100).toFixed(0)}%`}
                  >
                    {dadosPorCanal.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => 'R$ ' + value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-white/80 mb-4">Performance por Campanha</h3>
            <div className="space-y-3 max-h-[280px] overflow-y-auto">
              {campanhas
                .filter(c => c.total_impressoes > 0 || c.total_gasto > 0)
                .sort((a, b) => b.total_impressoes - a.total_impressoes)
                .map((c, idx) => {
                  const ctr = c.total_impressoes > 0 ? (c.total_cliques / c.total_impressoes * 100) : 0;
                  return (
                    <div key={c.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                        style={{ backgroundColor: COLORS[idx % COLORS.length] }}>
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{c.nome}</p>
                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                          <span>{formatNumber(c.total_impressoes)} imp.</span>
                          <span>{formatNumber(c.total_cliques)} cliques</span>
                          <span>CTR {ctr.toFixed(2)}%</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-white">
                          R$ {Number(c.total_gasto).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              {campanhas.filter(c => c.total_impressoes > 0 || c.total_gasto > 0).length === 0 && (
                <p className="text-center text-gray-400 text-sm py-8">Nenhuma campanha com dados</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsMarketing;
