import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, TrendingDown, DollarSign, Package,
  AlertTriangle, ArrowUpRight, ArrowDownRight,
  BarChart3, Activity, Calendar, Target,
  Warehouse, Users, Music, CalendarDays,
  ClipboardCheck, BookOpen, Settings, RefreshCw,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  AreaChart, Area, BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);

const today = new Date().toLocaleDateString('pt-BR', {
  weekday: 'long', day: 'numeric', month: 'long',
});

const QUICK = [
  { label: 'Financeiro',    path: '/finance',              icon: DollarSign,    bg: '#7D1F2C', fg: '#f5c0c8' },
  { label: 'Estoque',       path: '/advanced-inventory',   icon: Warehouse,     bg: '#1e3a2a', fg: '#4ade80' },
  { label: 'RH',            path: '/staff',                icon: Users,         bg: '#1a2030', fg: '#60a5fa' },
  { label: 'Músicos',       path: '/musicians',            icon: Music,         bg: '#201a30', fg: '#a78bfa' },
  { label: 'Eventos',       path: '/events',               icon: CalendarDays,  bg: '#2a1a1a', fg: '#f87171' },
  { label: 'Solicitações',  path: '/solicitacoes',         icon: ClipboardCheck,bg: '#241e10', fg: '#D4AF37' },
  { label: 'Ocorrências',   path: '/ocorrencias',          icon: AlertTriangle, bg: '#2a1a10', fg: '#fb923c' },
  { label: 'Estratégico',   path: '/gestao-estrategica',   icon: Target,        bg: '#0f1a20', fg: '#22d3ee' },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#1a1020', border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 10, padding: '10px 14px', fontSize: 12,
    }}>
      <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color, margin: '2px 0', fontWeight: 600 }}>
          {p.name}: {fmt(p.value)}
        </p>
      ))}
    </div>
  );
};

const DashboardHome: React.FC = () => {
  const navigate = useNavigate();
  const [entradas, setEntradas]   = useState(0);
  const [saidas, setSaidas]       = useState(0);
  const [itensMin, setItensMin]   = useState(0);
  const [loading, setLoading]     = useState(true);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const inicio = new Date(); inicio.setDate(1);
      const fim    = new Date();

      const { data: fc } = await supabase
        .from('fluxo_caixa')
        .select('tipo, valor, data')
        .gte('data', inicio.toISOString().split('T')[0])
        .lte('data', fim.toISOString().split('T')[0]);

      const e = fc?.filter(f => f.tipo === 'entrada').reduce((s, f) => s + Number(f.valor), 0) ?? 0;
      const s = fc?.filter(f => f.tipo === 'saida').reduce((s, f) => s + Number(f.valor), 0) ?? 0;
      setEntradas(e); setSaidas(s);

      const { data: saldos } = await supabase
        .from('saldos_estoque')
        .select('quantidade_atual, itens_estoque!inner(estoque_minimo)');
      setItensMin(saldos?.filter((x: any) => x.quantidade_atual < (x.itens_estoque?.estoque_minimo || 0)).length ?? 0);

      const dias = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (6 - i));
        return d.toISOString().split('T')[0];
      });
      setChartData(dias.map(dia => ({
        data: new Date(dia + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
        entradas: fc?.filter(f => f.data === dia && f.tipo === 'entrada').reduce((s, f) => s + Number(f.valor), 0) ?? 0,
        saidas:   fc?.filter(f => f.data === dia && f.tipo === 'saida').reduce((s, f) => s + Number(f.valor), 0) ?? 0,
        saldo:    (fc?.filter(f => f.data === dia && f.tipo === 'entrada').reduce((s, f) => s + Number(f.valor), 0) ?? 0)
                - (fc?.filter(f => f.data === dia && f.tipo === 'saida').reduce((s, f) => s + Number(f.valor), 0) ?? 0),
      })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const saldo = entradas - saidas;

  const METRICS = [
    {
      label: 'Receita do Mês', value: fmt(entradas),
      delta: '+12.5%', up: true,
      bg: '#0d2218', border: 'rgba(74,222,128,0.15)', fg: '#4ade80', muted: 'rgba(74,222,128,0.5)',
      icon: TrendingUp,
    },
    {
      label: 'Despesas do Mês', value: fmt(saidas),
      delta: '-8.2%', up: false,
      bg: '#1e0a0a', border: 'rgba(248,113,113,0.15)', fg: '#f87171', muted: 'rgba(248,113,113,0.5)',
      icon: TrendingDown,
    },
    {
      label: 'Saldo Atual', value: fmt(saldo),
      delta: saldo >= 0 ? '+15.3%' : '-', up: saldo >= 0,
      bg: '#0a1020', border: 'rgba(96,165,250,0.15)', fg: '#60a5fa', muted: 'rgba(96,165,250,0.5)',
      icon: DollarSign,
    },
    {
      label: 'Itens em Falta', value: String(itensMin),
      delta: itensMin > 0 ? 'atenção' : 'ok', up: itensMin === 0,
      bg: '#1a1000', border: 'rgba(251,146,60,0.15)', fg: '#fb923c', muted: 'rgba(251,146,60,0.5)',
      icon: AlertTriangle,
    },
  ];

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400, background: '#10121a', borderRadius: 16 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          border: '2px solid rgba(212,175,55,0.2)',
          borderTop: '2px solid #D4AF37',
          animation: 'spin 0.8s linear infinite',
          margin: '0 auto 12px',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>Carregando...</p>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, fontFamily: '-apple-system,BlinkMacSystemFont,"Inter",sans-serif' }}>

      {/* ── HEADER ── */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, margin: '0 0 6px', letterSpacing: '0.5px', textTransform: 'capitalize' }}>
            {today}
          </p>
          <h1 style={{ color: 'white', fontSize: 28, fontWeight: 800, margin: 0, letterSpacing: '-0.5px', lineHeight: 1 }}>
            Ditado Popular
          </h1>
        </div>
        <button
          onClick={load}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.25)',
            borderRadius: 10, padding: '7px 14px', cursor: 'pointer', color: '#D4AF37', fontSize: 12, fontWeight: 500,
          }}
        >
          <RefreshCw style={{ width: 13, height: 13 }} />
          Atualizar
        </button>
      </div>

      {/* ── METRIC CARDS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        {METRICS.map((m, i) => (
          <div key={i} style={{
            background: m.bg, borderRadius: 14, padding: '16px 18px',
            border: `1px solid ${m.border}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
              <p style={{ color: m.muted, fontSize: 10, margin: 0, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                {m.label}
              </p>
              <div style={{
                width: 30, height: 30, borderRadius: 8,
                background: `${m.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <m.icon style={{ width: 14, height: 14, color: m.fg }} />
              </div>
            </div>
            <p style={{ color: m.fg, fontSize: 22, fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.5px', lineHeight: 1 }}>
              {m.value}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {m.up
                ? <ArrowUpRight style={{ width: 13, height: 13, color: '#4ade80' }} />
                : <ArrowDownRight style={{ width: 13, height: 13, color: '#f87171' }} />
              }
              <span style={{ color: m.up ? '#4ade80' : '#f87171', fontSize: 11, fontWeight: 600 }}>
                {m.delta}
              </span>
              <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11 }}>vs mês anterior</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── GRÁFICOS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

        {/* Fluxo */}
        <div style={{ background: '#0d0f1a', borderRadius: 14, padding: '16px 18px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 600, margin: 0 }}>Fluxo de Caixa — 7 dias</p>
            <BarChart3 style={{ width: 15, height: 15, color: 'rgba(255,255,255,0.2)' }} />
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="gE" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#4ade80" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#4ade80" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gS" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#f87171" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="data" stroke="rgba(255,255,255,0.15)" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }} />
              <YAxis stroke="rgba(255,255,255,0.15)" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="entradas" name="Entradas" stroke="#4ade80" strokeWidth={2} fill="url(#gE)" />
              <Area type="monotone" dataKey="saidas"   name="Saídas"   stroke="#f87171" strokeWidth={2} fill="url(#gS)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Saldo diário */}
        <div style={{ background: '#0d0f1a', borderRadius: 14, padding: '16px 18px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 600, margin: 0 }}>Saldo Diário</p>
            <Activity style={{ width: 15, height: 15, color: 'rgba(255,255,255,0.2)' }} />
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="data" stroke="rgba(255,255,255,0.15)" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }} />
              <YAxis stroke="rgba(255,255,255,0.15)" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="saldo" name="Saldo" radius={[6, 6, 0, 0]}>
                {chartData.map((e, i) => (
                  <Cell key={i} fill={e.saldo >= 0 ? '#4ade80' : '#f87171'} fillOpacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── ACESSO RÁPIDO ── */}
      <div style={{ background: '#0d0f1a', borderRadius: 14, padding: '16px 18px', border: '1px solid rgba(255,255,255,0.05)' }}>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 600, margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
          Acesso rápido
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8,1fr)', gap: 8 }}>
          {QUICK.map((q, i) => (
            <button
              key={i}
              onClick={() => navigate(q.path)}
              style={{
                background: q.bg, border: `1px solid ${q.fg}22`,
                borderRadius: 12, padding: '12px 8px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                cursor: 'pointer', transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                (e.currentTarget as HTMLElement).style.borderColor = `${q.fg}55`;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLElement).style.borderColor = `${q.fg}22`;
              }}
            >
              <q.icon style={{ width: 18, height: 18, color: q.fg }} />
              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: 500, textAlign: 'center', lineHeight: 1.2 }}>
                {q.label}
              </span>
            </button>
          ))}
        </div>
      </div>

    </div>
  );
};

export default DashboardHome;
