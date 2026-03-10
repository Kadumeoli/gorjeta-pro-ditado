import React, { useState } from 'react';
import {
  Target, TrendingUp, TrendingDown, AlertTriangle, CheckCircle,
  Clock, DollarSign, Users, Package, BarChart3, ChevronDown,
  ChevronRight, MessageSquare, Plus, Download, RefreshCw,
  Zap, ShoppingCart, ArrowUp, ArrowDown, Minus
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

// ─── Tipos ────────────────────────────────────────────────────────────────────
type OKRStatus = 'on-track' | 'at-risk' | 'off-track' | 'completed';

interface KeyResult {
  id: string;
  titulo: string;
  metaValor: number;
  valorAtual: number;
  unidade: string;
  responsavel: string;
  dataLimite: string;
  status: OKRStatus;
}

interface Objetivo {
  id: string;
  titulo: string;
  descricao: string;
  trimestre: string;
  responsavel: string;
  keyResults: KeyResult[];
  status: OKRStatus;
  comentarios: { id: string; autor: string; texto: string; criadoEm: string }[];
}

interface KPICard {
  id: string;
  titulo: string;
  valor: number;
  variacao: number;
  tendencia: 'up' | 'down' | 'stable';
  formato: 'currency' | 'percent' | 'number';
  meta?: number;
  alerta?: 'warning' | 'danger';
}

// ─── Dados Mock ───────────────────────────────────────────────────────────────
const KPI_CARDS: KPICard[] = [
  { id: 'receita', titulo: 'Receita Bruta', valor: 387420, variacao: 12.4, tendencia: 'up', formato: 'currency', meta: 360000 },
  { id: 'margem', titulo: 'Margem Líquida', valor: 23.8, variacao: -1.2, tendencia: 'down', formato: 'percent', meta: 25, alerta: 'warning' },
  { id: 'ticket', titulo: 'Ticket Médio', valor: 82.50, variacao: 4.7, tendencia: 'up', formato: 'currency', meta: 80 },
  { id: 'transacoes', titulo: 'Transações/Dia', valor: 342, variacao: 8.1, tendencia: 'up', formato: 'number' },
  { id: 'cogs', titulo: 'CMV %', valor: 31.2, variacao: 0.8, tendencia: 'up', formato: 'percent', meta: 30, alerta: 'warning' },
  { id: 'pessoal', titulo: 'Custo Pessoal %', valor: 28.3, variacao: 2.3, tendencia: 'up', formato: 'percent', meta: 26, alerta: 'danger' },
];

const OBJETIVOS: Objetivo[] = [
  {
    id: 'okr1',
    titulo: 'Alcançar R$ 1.5M de receita no Q3',
    descricao: 'Crescer receita consolidada em 20% vs Q3 do ano anterior',
    trimestre: 'Q3 2024',
    responsavel: 'Direção',
    status: 'on-track',
    keyResults: [
      { id: 'kr1', titulo: 'Receita mensal ≥ R$ 500k', metaValor: 500000, valorAtual: 387420, unidade: 'R$', responsavel: 'Gerência', dataLimite: '2024-09-30', status: 'on-track' },
      { id: 'kr2', titulo: 'Ticket médio ≥ R$ 85', metaValor: 85, valorAtual: 82.5, unidade: 'R$', responsavel: 'Operações', dataLimite: '2024-09-30', status: 'at-risk' },
      { id: 'kr3', titulo: 'Eventos/mês ≥ 8', metaValor: 8, valorAtual: 7, unidade: 'eventos', responsavel: 'Eventos', dataLimite: '2024-09-30', status: 'at-risk' },
    ],
    comentarios: [
      { id: 'c1', autor: 'Direção', texto: 'Boa evolução em julho. Foco no ticket médio em agosto.', criadoEm: '2024-08-01' },
    ],
  },
  {
    id: 'okr2',
    titulo: 'Reduzir CMV para abaixo de 30%',
    descricao: 'Otimizar compras e fichas técnicas para reduzir custo de mercadoria vendida',
    trimestre: 'Q3 2024',
    responsavel: 'Estoque',
    status: 'at-risk',
    keyResults: [
      { id: 'kr4', titulo: 'CMV ≤ 30% da receita', metaValor: 30, valorAtual: 31.2, unidade: '%', responsavel: 'Compras', dataLimite: '2024-09-30', status: 'at-risk' },
      { id: 'kr5', titulo: 'Desperdício ≤ 1.5%', metaValor: 1.5, valorAtual: 2.1, unidade: '%', responsavel: 'Estoque', dataLimite: '2024-09-30', status: 'off-track' },
    ],
    comentarios: [],
  },
  {
    id: 'okr3',
    titulo: 'Reduzir custo de pessoal para 26% da receita',
    descricao: 'Otimizar escala e reduzir horas extras desnecessárias',
    trimestre: 'Q3 2024',
    responsavel: 'RH',
    status: 'off-track',
    keyResults: [
      { id: 'kr6', titulo: 'Custo pessoal ≤ 26% receita', metaValor: 26, valorAtual: 28.3, unidade: '%', responsavel: 'RH', dataLimite: '2024-09-30', status: 'off-track' },
      { id: 'kr7', titulo: 'Horas extras ≤ 5% do total', metaValor: 5, valorAtual: 8.4, unidade: '%', responsavel: 'RH', dataLimite: '2024-09-30', status: 'off-track' },
    ],
    comentarios: [
      { id: 'c2', autor: 'RH', texto: 'Contratações recentes impactando. Revisando escala da próxima semana.', criadoEm: '2024-08-05' },
    ],
  },
];

const VENDAS_SERIE = Array.from({ length: 14 }, (_, i) => {
  const date = new Date();
  date.setDate(date.getDate() - (13 - i));
  return {
    data: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    Receita: Math.round(18000 + Math.random() * 8000),
    Meta: 22000,
  };
});

const CUSTOS_SERIE = Array.from({ length: 7 }, (_, i) => {
  const date = new Date();
  date.setDate(date.getDate() - (6 - i));
  const receita = Math.round(18000 + Math.random() * 8000);
  return {
    data: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    CMV: Math.round(receita * 0.31),
    Pessoal: Math.round(receita * 0.28),
    Outros: Math.round(receita * 0.12),
  };
});

const ALERTAS = [
  { id: 'a1', tipo: 'danger', titulo: 'Custo de pessoal acima da meta', mensagem: '28.3% vs meta 26%. Diferença de R$ 8.4k este mês.', tempo: 'há 30min' },
  { id: 'a2', tipo: 'warning', titulo: 'CMV em risco', mensagem: 'CMV 31.2% vs meta 30%. Revisar compras da semana.', tempo: 'há 1h' },
  { id: 'a3', tipo: 'warning', titulo: 'Ticket médio abaixo do OKR', mensagem: 'R$ 82,50 vs meta R$ 85. Foco em upsell.', tempo: 'há 2h' },
  { id: 'a4', tipo: 'info', titulo: 'Receita Q3 no prazo', mensagem: 'Progresso 77% da meta trimestral. Tendência positiva.', tempo: 'há 3h' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatVal(valor: number, formato: KPICard['formato']): string {
  if (formato === 'currency') {
    if (valor >= 100000) return `R$ ${(valor / 1000).toFixed(0)}k`;
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 });
  }
  if (formato === 'percent') return `${valor.toFixed(1)}%`;
  return valor.toLocaleString('pt-BR');
}

function calcProgress(atual: number, meta: number): number {
  return Math.min(100, Math.round((atual / meta) * 100));
}

const STATUS_CONFIG: Record<OKRStatus, { label: string; color: string; bg: string; border: string }> = {
  'on-track': { label: 'No Prazo', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  'at-risk': { label: 'Em Risco', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
  'off-track': { label: 'Atrasado', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' },
  'completed': { label: 'Concluído', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
};

const ALERTA_CONFIG: Record<string, { bg: string; border: string; color: string; icon: React.ElementType }> = {
  danger: { bg: 'bg-red-50', border: 'border-red-200', color: 'text-red-700', icon: AlertTriangle },
  warning: { bg: 'bg-amber-50', border: 'border-amber-200', color: 'text-amber-700', icon: AlertTriangle },
  info: { bg: 'bg-blue-50', border: 'border-blue-200', color: 'text-blue-700', icon: CheckCircle },
};

// ─── Subcomponentes ───────────────────────────────────────────────────────────
function KPICardComponent({ card }: { card: KPICard }) {
  const isUp = card.tendencia === 'up';
  const isDown = card.tendencia === 'down';
  const progress = card.meta ? calcProgress(card.valor, card.meta) : null;

  return (
    <div className={`bg-white rounded-2xl border p-4 shadow-sm hover:shadow-md transition-shadow ${
      card.alerta === 'danger' ? 'border-red-200 bg-red-50/30' :
      card.alerta === 'warning' ? 'border-amber-200 bg-amber-50/20' :
      'border-gray-100'
    }`}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{card.titulo}</span>
        {card.alerta && (
          <AlertTriangle className={`w-3.5 h-3.5 ${card.alerta === 'danger' ? 'text-red-500' : 'text-amber-500'}`} />
        )}
      </div>

      <p className={`text-2xl font-bold mb-3 ${
        card.alerta === 'danger' ? 'text-red-700' :
        card.alerta === 'warning' ? 'text-amber-700' :
        'text-gray-900'
      }`}>
        {formatVal(card.valor, card.formato)}
      </p>

      <div className="flex items-center justify-between gap-2">
        <div className={`flex items-center gap-1 text-xs font-medium ${
          isUp ? 'text-emerald-600' : isDown ? 'text-red-500' : 'text-gray-500'
        }`}>
          {isUp ? <ArrowUp className="w-3 h-3" /> : isDown ? <ArrowDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
          <span>{Math.abs(card.variacao).toFixed(1)}% vs anterior</span>
        </div>
        {card.meta && (
          <span className="text-[10px] text-gray-400 font-mono">
            meta: {formatVal(card.meta, card.formato)}
          </span>
        )}
      </div>

      {progress !== null && (
        <div className="mt-2.5 h-1.5 rounded-full bg-gray-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              progress >= 90 ? 'bg-emerald-400' : progress >= 70 ? 'bg-amber-400' : 'bg-red-400'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}

function OKRCardComponent({ objetivo }: { objetivo: Objetivo }) {
  const [expanded, setExpanded] = useState(false);
  const sc = STATUS_CONFIG[objetivo.status];
  const overallProgress = Math.round(
    objetivo.keyResults.reduce((acc, kr) => acc + calcProgress(kr.valorAtual, kr.metaValor), 0) /
    objetivo.keyResults.length
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div
        className="px-5 py-4 flex items-start gap-3 cursor-pointer hover:bg-gray-50/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <button className="mt-0.5 text-gray-400 shrink-0">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-2">
            <h3 className="text-sm font-semibold text-gray-900 leading-snug">{objetivo.titulo}</h3>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border shrink-0 ${sc.color} ${sc.bg} ${sc.border}`}>
              {sc.label}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  overallProgress >= 90 ? 'bg-emerald-400' : overallProgress >= 70 ? 'bg-amber-400' : 'bg-red-400'
                }`}
                style={{ width: `${overallProgress}%` }}
              />
            </div>
            <span className="text-xs font-bold text-gray-600 font-mono shrink-0">{overallProgress}%</span>
          </div>

          <div className="flex items-center gap-3 mt-1.5 text-[11px] text-gray-400">
            <span>{objetivo.responsavel}</span>
            <span>·</span>
            <span>{objetivo.trimestre}</span>
            {objetivo.comentarios.length > 0 && (
              <>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  {objetivo.comentarios.length}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 px-5 py-4 space-y-4">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Key Results</p>
          {objetivo.keyResults.map((kr) => {
            const ksc = STATUS_CONFIG[kr.status];
            const prog = calcProgress(kr.valorAtual, kr.metaValor);
            return (
              <div key={kr.id} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-gray-700 font-medium">{kr.titulo}</span>
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${ksc.color} ${ksc.bg} ${ksc.border}`}>
                    {ksc.label}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${prog >= 90 ? 'bg-emerald-400' : prog >= 70 ? 'bg-amber-400' : 'bg-red-400'}`}
                      style={{ width: `${prog}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-gray-500 font-mono shrink-0">
                    {kr.valorAtual}{kr.unidade} / {kr.metaValor}{kr.unidade}
                  </span>
                </div>
                <div className="flex justify-between text-[10px] text-gray-400">
                  <span>{kr.responsavel}</span>
                  <span>Prazo: {new Date(kr.dataLimite).toLocaleDateString('pt-BR')}</span>
                </div>
              </div>
            );
          })}

          {objetivo.comentarios.length > 0 && (
            <div className="border-t border-gray-100 pt-3 space-y-2">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Comentários</p>
              {objetivo.comentarios.map((c) => (
                <div key={c.id} className="bg-gray-50 rounded-xl px-3 py-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-gray-700">{c.autor}</span>
                    <span className="text-[10px] text-gray-400">{new Date(c.criadoEm).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <p className="text-xs text-gray-600">{c.texto}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────
type Tab = 'dashboard' | 'okrs' | 'alertas';

const GestaoEstrategica: React.FC = () => {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await new Promise(r => setTimeout(r, 800));
    setRefreshing(false);
  };

  const summary = {
    onTrack: OBJETIVOS.filter(o => o.status === 'on-track').length,
    atRisk: OBJETIVOS.filter(o => o.status === 'at-risk').length,
    offTrack: OBJETIVOS.filter(o => o.status === 'off-track').length,
  };

  const alertasNaoLidos = ALERTAS.filter(a => a.tipo === 'danger' || a.tipo === 'warning').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-[#7D1F2C] to-[#D4AF37] bg-clip-text text-transparent">
            Gestão Estratégica
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">OKRs, KPIs e indicadores operacionais — Q3 2024</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 shadow-sm transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-white bg-gradient-to-r from-[#7D1F2C] to-[#D4AF37] shadow-sm hover:shadow-md transition-all">
            <Download className="w-3.5 h-3.5" />
            Exportar
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 bg-gray-100 p-1 rounded-2xl w-fit">
        {([
          { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
          { id: 'okrs', label: 'OKRs & KPIs', icon: Target },
          { id: 'alertas', label: `Alertas ${alertasNaoLidos > 0 ? `(${alertasNaoLidos})` : ''}`, icon: AlertTriangle },
        ] as { id: Tab; label: string; icon: React.ElementType }[]).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              tab === t.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Dashboard ──────────────────────────────────────────────────── */}
      {tab === 'dashboard' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {KPI_CARDS.map(card => (
              <KPICardComponent key={card.id} card={card} />
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {/* Receita vs Meta */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="mb-4">
                <h2 className="text-sm font-semibold text-gray-900">Receita vs Meta (14 dias)</h2>
                <p className="text-xs text-gray-400 mt-0.5">Valores diários em R$</p>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={VENDAS_SERIE} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="receitaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7D1F2C" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#7D1F2C" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="data" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                    tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => [`R$ ${v.toLocaleString('pt-BR')}`, '']} />
                  <Area type="monotone" dataKey="Receita" stroke="#7D1F2C" strokeWidth={2} fill="url(#receitaGrad)" dot={false} />
                  <Area type="monotone" dataKey="Meta" stroke="#D4AF37" strokeWidth={1.5} fill="none" dot={false} strokeDasharray="5 3" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Composição de Custos */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="mb-4">
                <h2 className="text-sm font-semibold text-gray-900">Composição de Custos (7 dias)</h2>
                <p className="text-xs text-gray-400 mt-0.5">CMV + Pessoal + Outros</p>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={CUSTOS_SERIE} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="data" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                    tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => [`R$ ${v.toLocaleString('pt-BR')}`, '']} />
                  <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="CMV" fill="#7D1F2C" radius={[3, 3, 0, 0]} stackId="a" />
                  <Bar dataKey="Pessoal" fill="#D4AF37" radius={[0, 0, 0, 0]} stackId="a" />
                  <Bar dataKey="Outros" fill="#e2e8f0" radius={[3, 3, 0, 0]} stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* OKR Summary + Alertas */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            {/* OKR Resumo */}
            <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-900">Resumo dos OKRs — Q3 2024</h2>
                <button
                  onClick={() => setTab('okrs')}
                  className="text-xs text-[#7D1F2C] hover:underline font-medium"
                >
                  Ver todos →
                </button>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { label: 'No Prazo', value: summary.onTrack, color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
                  { label: 'Em Risco', value: summary.atRisk, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
                  { label: 'Atrasado', value: summary.offTrack, color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
                ].map(s => (
                  <div key={s.label} className={`rounded-xl border p-3 text-center ${s.bg}`}>
                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                    <p className={`text-xs font-medium mt-0.5 ${s.color}`}>{s.label}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                {OBJETIVOS.map(obj => {
                  const sc = STATUS_CONFIG[obj.status];
                  const prog = Math.round(
                    obj.keyResults.reduce((acc, kr) => acc + calcProgress(kr.valorAtual, kr.metaValor), 0) /
                    obj.keyResults.length
                  );
                  return (
                    <div key={obj.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-900 truncate">{obj.titulo}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${prog >= 90 ? 'bg-emerald-400' : prog >= 70 ? 'bg-amber-400' : 'bg-red-400'}`}
                              style={{ width: `${prog}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-mono text-gray-500 shrink-0">{prog}%</span>
                        </div>
                      </div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border shrink-0 ${sc.color} ${sc.bg} ${sc.border}`}>
                        {sc.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Alertas rápidos */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-900">Alertas</h2>
                <button onClick={() => setTab('alertas')} className="text-xs text-[#7D1F2C] hover:underline font-medium">
                  Ver todos →
                </button>
              </div>
              <div className="space-y-2">
                {ALERTAS.slice(0, 4).map(a => {
                  const ac = ALERTA_CONFIG[a.tipo];
                  return (
                    <div key={a.id} className={`rounded-xl border px-3 py-2.5 ${ac.bg} ${ac.border}`}>
                      <div className="flex items-start gap-2">
                        <ac.icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${ac.color}`} />
                        <div>
                          <p className={`text-xs font-semibold ${ac.color}`}>{a.titulo}</p>
                          <p className={`text-[11px] mt-0.5 opacity-80 ${ac.color}`}>{a.mensagem}</p>
                          <p className="text-[10px] text-gray-400 mt-1">{a.tempo}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: OKRs ───────────────────────────────────────────────────────── */}
      {tab === 'okrs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Total', value: OBJETIVOS.length, color: 'text-gray-700', bg: 'bg-white border-gray-200' },
                { label: 'No Prazo', value: summary.onTrack, color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
                { label: 'Em Risco', value: summary.atRisk, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
                { label: 'Atrasado', value: summary.offTrack, color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
              ].map(s => (
                <div key={s.label} className={`rounded-2xl border p-4 text-center shadow-sm ${s.bg}`}>
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className={`text-xs font-medium mt-0.5 ${s.color}`}>{s.label}</p>
                </div>
              ))}
            </div>
            <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm text-white bg-gradient-to-r from-[#7D1F2C] to-[#D4AF37] shadow-sm hover:shadow-md transition-all">
              <Plus className="w-3.5 h-3.5" />
              Novo Objetivo
            </button>
          </div>

          <div className="space-y-3">
            {OBJETIVOS.map(obj => (
              <OKRCardComponent key={obj.id} objetivo={obj} />
            ))}
          </div>
        </div>
      )}

      {/* ── Tab: Alertas ────────────────────────────────────────────────────── */}
      {tab === 'alertas' && (
        <div className="space-y-3 max-w-2xl">
          <p className="text-sm text-gray-500">{ALERTAS.length} alertas ativos</p>
          {ALERTAS.map(a => {
            const ac = ALERTA_CONFIG[a.tipo];
            return (
              <div key={a.id} className={`rounded-2xl border px-4 py-3.5 ${ac.bg} ${ac.border}`}>
                <div className="flex items-start gap-3">
                  <ac.icon className={`w-4 h-4 mt-0.5 shrink-0 ${ac.color}`} />
                  <div className="flex-1">
                    <p className={`text-sm font-semibold ${ac.color}`}>{a.titulo}</p>
                    <p className={`text-xs mt-1 opacity-80 ${ac.color}`}>{a.mensagem}</p>
                    <p className="text-[11px] text-gray-400 mt-1.5">{a.tempo}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default GestaoEstrategica;