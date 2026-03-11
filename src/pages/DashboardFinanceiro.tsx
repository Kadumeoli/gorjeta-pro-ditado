import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, TrendingDown, DollarSign, AlertTriangle, Clock,
  CheckCircle, RefreshCw, ChevronDown, ChevronUp, ArrowUp,
  ArrowDown, Minus, BarChart3, CreditCard, Calendar, Loader2
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, Cell
} from 'recharts';
import { supabase } from '../lib/supabase';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const R = (v: number) => {
  if (v >= 1000000) return `R$ ${(v / 1000000).toFixed(2).replace('.', ',')}M`;
  if (v >= 1000)    return `R$ ${(v / 1000).toFixed(1).replace('.', ',')}k`;
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 });
};
const Rfull = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const pct = (a: number, b: number) =>
  b === 0 ? null : ((a - b) / b) * 100;

// ─── Tipos ───────────────────────────────────────────────────────────────────
interface KPIs {
  receita_mes: number;
  despesa_mes: number;
  saldo_mes: number;
  receita_ant: number;
  despesa_ant: number;
  contas_vencidas: number;
  valor_vencido: number;
  contas_semana: number;
  valor_semana: number;
  contas_mes: number;
  valor_mes: number;
  contas_futuro: number;
  valor_futuro: number;
  a_receber: number;
}

interface SerieMes {
  mes: string;
  Receita: number;
  Despesa: number;
  Margem: number;
}

interface Categoria {
  categoria: string;
  mes_atual: number;
  mes_anterior: number;
}

interface ContaAberta {
  categoria: string;
  descricao: string;
  saldo_restante: number;
  data_vencimento: string;
  urgencia: 'vencida' | 'esta_semana' | 'este_mes' | 'futuro';
}

// ─── Urgência config ─────────────────────────────────────────────────────────
const URG: Record<string, { label: string; dot: string; row: string; badge: string }> = {
  vencida:      { label: 'Vencida',       dot: 'bg-red-500',    row: 'hover:bg-red-50/50',    badge: 'text-red-700 bg-red-100 border-red-200' },
  esta_semana:  { label: 'Esta semana',   dot: 'bg-amber-400',  row: 'hover:bg-amber-50/50',  badge: 'text-amber-700 bg-amber-100 border-amber-200' },
  este_mes:     { label: 'Este mês',      dot: 'bg-blue-400',   row: 'hover:bg-blue-50/50',   badge: 'text-blue-700 bg-blue-100 border-blue-200' },
  futuro:       { label: 'Futuro',        dot: 'bg-gray-300',   row: 'hover:bg-gray-50/50',   badge: 'text-gray-600 bg-gray-100 border-gray-200' },
};

// ─── Componente: KPI Card ────────────────────────────────────────────────────
function KPICard({
  titulo, valor, comparativo, formato = 'currency', alerta, sub, icon: Icon, loading
}: {
  titulo: string; valor: number; comparativo?: number;
  formato?: 'currency' | 'number'; alerta?: 'danger' | 'warning' | 'ok';
  sub?: string; icon: React.ElementType; loading?: boolean;
}) {
  const variacao = comparativo !== undefined ? pct(valor, comparativo) : null;
  const display  = formato === 'currency' ? R(valor) : valor.toLocaleString('pt-BR');

  if (loading) return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm animate-pulse h-32" />
  );

  return (
    <div className={`bg-white rounded-2xl border p-5 shadow-sm hover:shadow-md transition-all ${
      alerta === 'danger'  ? 'border-red-200   bg-gradient-to-br from-white to-red-50/30'   :
      alerta === 'warning' ? 'border-amber-200 bg-gradient-to-br from-white to-amber-50/30' :
      alerta === 'ok'      ? 'border-emerald-200 bg-gradient-to-br from-white to-emerald-50/20' :
      'border-gray-100'
    }`}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{titulo}</p>
        <div className={`p-2 rounded-xl ${
          alerta === 'danger'  ? 'bg-red-100'     :
          alerta === 'warning' ? 'bg-amber-100'   :
          alerta === 'ok'      ? 'bg-emerald-100' : 'bg-gray-100'
        }`}>
          <Icon className={`w-4 h-4 ${
            alerta === 'danger'  ? 'text-red-600'     :
            alerta === 'warning' ? 'text-amber-600'   :
            alerta === 'ok'      ? 'text-emerald-600' : 'text-gray-500'
          }`} />
        </div>
      </div>

      <p className={`text-2xl font-extrabold tracking-tight ${
        alerta === 'danger'  ? 'text-red-700'     :
        alerta === 'warning' ? 'text-amber-700'   :
        alerta === 'ok'      ? 'text-emerald-700' : 'text-gray-900'
      }`}>{display}</p>

      <div className="flex items-center justify-between mt-2 gap-2">
        {variacao !== null && variacao !== undefined ? (
          <span className={`flex items-center gap-0.5 text-[11px] font-semibold ${
            variacao > 0 ? 'text-emerald-600' : variacao < 0 ? 'text-red-500' : 'text-gray-400'
          }`}>
            {variacao > 0 ? <ArrowUp className="w-3 h-3" /> : variacao < 0 ? <ArrowDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
            {Math.abs(variacao).toFixed(1)}% vs mês ant.
          </span>
        ) : <span />}
        {sub && <p className="text-[10px] text-gray-400 font-medium">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Página Principal ────────────────────────────────────────────────────────
export default function DashboardFinanceiro() {
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [kpis,         setKpis]         = useState<KPIs | null>(null);
  const [serie,        setSerie]        = useState<SerieMes[]>([]);
  const [categorias,   setCategorias]   = useState<Categoria[]>([]);
  const [contas,       setContas]       = useState<ContaAberta[]>([]);
  const [filtroUrg,    setFiltroUrg]    = useState<string>('todas');
  const [expandCats,   setExpandCats]   = useState(false);
  const [expandContas, setExpandContas] = useState(false);
  const [sortCat,      setSortCat]      = useState<'valor' | 'nome'>('valor');

  const load = useCallback(async () => {
    try {
      const hoje         = new Date();
      const inicioMes    = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0];
      const fimMes       = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1).toISOString().split('T')[0];
      const inicioMesAnt = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1).toISOString().split('T')[0];
      const fimMesAnt    = new Date(hoje.getFullYear(), hoje.getMonth(), 0).toISOString().split('T')[0];
      const inicio6m     = new Date(hoje.getFullYear(), hoje.getMonth() - 5, 1).toISOString().split('T')[0];

      const [
        { data: fcMes },
        { data: fcAnt },
        { data: fcSerie },
        { data: contasAbSumar },
        { data: aReceber },
      ] = await Promise.all([
        supabase.from('fluxo_caixa').select('tipo,valor').gte('data', inicioMes).lt('data', fimMes),
        supabase.from('fluxo_caixa').select('tipo,valor').gte('data', inicioMesAnt).lte('data', fimMesAnt),
        supabase.from('fluxo_caixa').select('tipo,valor,data').gte('data', inicio6m).order('data'),
        supabase.from('contas_pagar').select('saldo_restante,data_vencimento').eq('status','em_aberto').gt('saldo_restante', 0),
        supabase.from('contas_receber').select('saldo_restante').not('status', 'in', '("recebido","cancelado")'),
      ]);

      const recMes  = (fcMes  || []).filter(r => r.tipo === 'entrada').reduce((a, b) => a + +b.valor, 0);
      const despMes = (fcMes  || []).filter(r => r.tipo === 'saida'  ).reduce((a, b) => a + +b.valor, 0);
      const recAnt  = (fcAnt  || []).filter(r => r.tipo === 'entrada').reduce((a, b) => a + +b.valor, 0);
      const despAnt = (fcAnt  || []).filter(r => r.tipo === 'saida'  ).reduce((a, b) => a + +b.valor, 0);

      // Classifica urgência das contas em aberto
      const todayStr = hoje.toISOString().split('T')[0];
      const semanaStr = new Date(hoje.getTime() + 7 * 86400000).toISOString().split('T')[0];
      const mesStr    = new Date(hoje.getTime() + 30 * 86400000).toISOString().split('T')[0];

      const classifica = (d: string): ContaAberta['urgencia'] => {
        if (d < todayStr)  return 'vencida';
        if (d <= semanaStr) return 'esta_semana';
        if (d <= mesStr)    return 'este_mes';
        return 'futuro';
      };

      const resumoUrg = { vencida: { q: 0, v: 0 }, esta_semana: { q: 0, v: 0 }, este_mes: { q: 0, v: 0 }, futuro: { q: 0, v: 0 } };
      (contasAbSumar || []).forEach(c => {
        const u = classifica(c.data_vencimento);
        resumoUrg[u].q++;
        resumoUrg[u].v += +c.saldo_restante;
      });

      setKpis({
        receita_mes:    recMes,
        despesa_mes:    despMes,
        saldo_mes:      recMes - despMes,
        receita_ant:    recAnt,
        despesa_ant:    despAnt,
        contas_vencidas: resumoUrg.vencida.q,
        valor_vencido:   resumoUrg.vencida.v,
        contas_semana:   resumoUrg.esta_semana.q,
        valor_semana:    resumoUrg.esta_semana.v,
        contas_mes:      resumoUrg.este_mes.q,
        valor_mes:       resumoUrg.este_mes.v,
        contas_futuro:   resumoUrg.futuro.q,
        valor_futuro:    resumoUrg.futuro.v,
        a_receber: (aReceber || []).reduce((a, b) => a + +(b.saldo_restante || 0), 0),
      });

      // Série mensal
      const porMes: Record<string, { label: string; R: number; D: number }> = {};
      (fcSerie || []).forEach(r => {
        const m = r.data.slice(0, 7);
        if (!porMes[m]) {
          const d = new Date(m + '-01T12:00:00');
          porMes[m] = {
            label: d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
            R: 0, D: 0
          };
        }
        r.tipo === 'entrada' ? (porMes[m].R += +r.valor) : (porMes[m].D += +r.valor);
      });
      setSerie(
        Object.entries(porMes)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([, v]) => ({ mes: v.label, Receita: v.R, Despesa: v.D, Margem: v.R - v.D }))
      );

      // Categorias de despesa — mês atual e anterior
      const { data: catData } = await supabase.rpc
        ? supabase.from('contas_pagar').select('valor_pago, data_vencimento, categoria_id, categorias_financeiras(nome)').gt('valor_pago', 0)
        : { data: null };

      // Fallback: query direta
      const { data: rawCats } = await supabase
        .from('contas_pagar')
        .select('valor_pago, data_vencimento, categorias_financeiras(nome)')
        .gt('valor_pago', 0)
        .gte('data_vencimento', inicioMesAnt);

      const catMap: Record<string, { atual: number; anterior: number }> = {};
      (rawCats || []).forEach((r: any) => {
        const nome = r.categorias_financeiras?.nome || 'Sem categoria';
        const dv   = r.data_vencimento as string;
        if (!catMap[nome]) catMap[nome] = { atual: 0, anterior: 0 };
        if (dv >= inicioMes && dv < fimMes)       catMap[nome].atual    += +r.valor_pago;
        if (dv >= inicioMesAnt && dv < inicioMes) catMap[nome].anterior += +r.valor_pago;
      });

      setCategorias(
        Object.entries(catMap)
          .map(([categoria, v]) => ({ categoria, mes_atual: v.atual, mes_anterior: v.anterior }))
          .filter(c => c.mes_atual > 0 || c.mes_anterior > 0)
          .sort((a, b) => b.mes_atual - a.mes_atual)
      );

      // Contas em aberto detalhadas
      const { data: contasDet } = await supabase
        .from('contas_pagar')
        .select('descricao, saldo_restante, data_vencimento, categorias_financeiras(nome)')
        .eq('status', 'em_aberto')
        .gt('saldo_restante', 0)
        .order('data_vencimento', { ascending: true });

      setContas(
        (contasDet || []).map((c: any) => ({
          categoria:       c.categorias_financeiras?.nome || 'Sem categoria',
          descricao:       c.descricao,
          saldo_restante:  +c.saldo_restante,
          data_vencimento: c.data_vencimento,
          urgencia:        classifica(c.data_vencimento),
        }))
      );
    } catch (err) {
      console.error('[DashboardFinanceiro]', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  const refresh = () => { setRefreshing(true); load(); };

  // Derived
  const totalAberto     = (kpis?.valor_vencido || 0) + (kpis?.valor_semana || 0) + (kpis?.valor_mes || 0) + (kpis?.valor_futuro || 0);
  const totalQtdAberto  = (kpis?.contas_vencidas || 0) + (kpis?.contas_semana || 0) + (kpis?.contas_mes || 0) + (kpis?.contas_futuro || 0);
  const margemPct       = kpis && kpis.receita_mes > 0 ? (kpis.saldo_mes / kpis.receita_mes) * 100 : 0;

  const catsSorted = [...categorias].sort((a, b) =>
    sortCat === 'valor' ? b.mes_atual - a.mes_atual : a.categoria.localeCompare(b.categoria)
  );
  const catsVisiveis = expandCats ? catsSorted : catsSorted.slice(0, 10);
  const maxCat       = categorias.reduce((m, c) => Math.max(m, c.mes_atual, c.mes_anterior), 0);

  const contasFiltradas = filtroUrg === 'todas'
    ? contas : contas.filter(c => c.urgencia === filtroUrg);
  const contasVisiveis  = expandContas ? contasFiltradas : contasFiltradas.slice(0, 15);

  const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const mesAtualNome = meses[new Date().getMonth()];

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
            Dashboard <span className="bg-gradient-to-r from-[#7D1F2C] to-[#D4AF37] bg-clip-text text-transparent">Financeiro</span>
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {mesAtualNome} {new Date().getFullYear()} · Dados em tempo real
          </p>
        </div>
        <button onClick={refresh} disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 shadow-sm transition-all">
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {/* ── KPIs principais ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <KPICard titulo="Receita do Mês"  valor={kpis?.receita_mes || 0} comparativo={kpis?.receita_ant}
          icon={TrendingUp} alerta="ok" loading={loading} />
        <KPICard titulo="Despesas do Mês" valor={kpis?.despesa_mes || 0} comparativo={kpis?.despesa_ant}
          icon={TrendingDown} loading={loading} />
        <KPICard titulo="Saldo do Mês"    valor={kpis?.saldo_mes || 0}
          icon={DollarSign}
          alerta={kpis && kpis.saldo_mes < 0 ? 'danger' : 'ok'}
          sub={`Margem ${margemPct.toFixed(1)}%`}
          loading={loading} />
        <KPICard titulo="A Receber"        valor={kpis?.a_receber || 0}
          icon={CreditCard} alerta="warning" loading={loading} />
      </div>

      {/* ── Contas a pagar — blocos de urgência ────────────────────────── */}
      <div>
        <h2 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          Contas a Pagar em Aberto
          <span className="text-xs font-normal text-gray-400 ml-1">
            — {totalQtdAberto} contas · {R(totalAberto)} total
          </span>
        </h2>

        {/* 4 cards de urgência */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
          {[
            { key: 'vencida',     label: 'Vencidas',      qtd: kpis?.contas_vencidas || 0, val: kpis?.valor_vencido || 0,  cor: 'border-red-200   bg-red-50',    txt: 'text-red-700',    ico: AlertTriangle },
            { key: 'esta_semana', label: 'Esta semana',   qtd: kpis?.contas_semana   || 0, val: kpis?.valor_semana  || 0,  cor: 'border-amber-200 bg-amber-50',  txt: 'text-amber-700',  ico: Clock },
            { key: 'este_mes',    label: 'Este mês',      qtd: kpis?.contas_mes      || 0, val: kpis?.valor_mes     || 0,  cor: 'border-blue-200  bg-blue-50',   txt: 'text-blue-700',   ico: Calendar },
            { key: 'futuro',      label: 'Futuro',        qtd: kpis?.contas_futuro   || 0, val: kpis?.valor_futuro  || 0,  cor: 'border-gray-200  bg-gray-50',   txt: 'text-gray-600',   ico: CheckCircle },
          ].map(u => (
            <button
              key={u.key}
              onClick={() => setFiltroUrg(filtroUrg === u.key ? 'todas' : u.key)}
              className={`rounded-2xl border p-4 text-left transition-all hover:shadow-md ${u.cor} ${
                filtroUrg === u.key ? 'ring-2 ring-offset-1 ring-[#7D1F2C]' : ''
              }`}
            >
              {loading
                ? <div className="animate-pulse space-y-2"><div className="h-3 bg-gray-200 rounded w-3/4"/><div className="h-6 bg-gray-200 rounded w-1/2"/></div>
                : <>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-xs font-bold uppercase tracking-wide ${u.txt}`}>{u.label}</span>
                      <u.ico className={`w-4 h-4 ${u.txt}`} />
                    </div>
                    <p className={`text-xl font-extrabold ${u.txt}`}>{R(u.val)}</p>
                    <p className={`text-xs mt-0.5 font-medium opacity-70 ${u.txt}`}>{u.qtd} conta{u.qtd !== 1 ? 's' : ''}</p>
                  </>
              }
            </button>
          ))}
        </div>

        {/* Tabela de contas */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
              {filtroUrg === 'todas' ? 'Todas as contas em aberto' : URG[filtroUrg]?.label}
              <span className="ml-2 font-normal text-gray-400">({contasFiltradas.length})</span>
            </p>
            {filtroUrg !== 'todas' && (
              <button onClick={() => setFiltroUrg('todas')} className="text-xs text-gray-400 hover:text-gray-600">
                ver todas
              </button>
            )}
          </div>

          <div className="divide-y divide-gray-50">
            {loading
              ? [1,2,3,4,5].map(i => <div key={i} className="h-12 animate-pulse bg-gray-50 mx-4 my-1 rounded-xl" />)
              : contasVisiveis.length === 0
              ? <p className="text-sm text-gray-400 text-center py-8">Nenhuma conta nesta categoria</p>
              : contasVisiveis.map((c, i) => {
                  const uc = URG[c.urgencia];
                  return (
                    <div key={i} className={`flex items-center gap-3 px-5 py-3 transition-colors ${uc.row}`}>
                      <div className={`w-2 h-2 rounded-full shrink-0 ${uc.dot}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-800 truncate">{c.descricao}</p>
                        <p className="text-[10px] text-gray-400">{c.categoria}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-gray-900">{Rfull(c.saldo_restante)}</p>
                        <p className="text-[10px] text-gray-400">
                          {new Date(c.data_vencimento + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <span className={`text-[9px] font-bold border rounded-full px-2 py-0.5 shrink-0 ${uc.badge}`}>
                        {uc.label}
                      </span>
                    </div>
                  );
                })
            }
          </div>

          {contasFiltradas.length > 15 && (
            <button
              onClick={() => setExpandContas(v => !v)}
              className="w-full py-3 text-xs font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-1 border-t border-gray-100"
            >
              {expandContas
                ? <><ChevronUp className="w-3.5 h-3.5" /> Ver menos</>
                : <><ChevronDown className="w-3.5 h-3.5" /> Ver todas ({contasFiltradas.length} contas)</>
              }
            </button>
          )}
        </div>
      </div>

      {/* ── Gráfico 6 meses ────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-bold text-gray-900">Receita vs Despesa — 6 meses</p>
          <BarChart3 className="w-4 h-4 text-gray-300" />
        </div>
        <p className="text-xs text-gray-400 mb-5">Fonte: fluxo_caixa</p>
        {loading
          ? <div className="h-56 bg-gray-100 rounded-xl animate-pulse" />
          : <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={serie} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="gR" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#7D1F2C" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#7D1F2C" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gD" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#D4AF37" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                  tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(v: number, name: string) => [Rfull(v), name]}
                  contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }}
                />
                <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="Receita" stroke="#7D1F2C" strokeWidth={2.5} fill="url(#gR)"  dot={false} activeDot={{ r: 4, fill: '#7D1F2C' }} />
                <Area type="monotone" dataKey="Despesa" stroke="#D4AF37" strokeWidth={2.5} fill="url(#gD)" dot={false} activeDot={{ r: 4, fill: '#D4AF37' }} />
              </AreaChart>
            </ResponsiveContainer>
        }
      </div>

      {/* ── Gastos por Categoria ───────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <p className="text-sm font-bold text-gray-900">Gastos por Categoria</p>
            <p className="text-xs text-gray-400 mt-0.5">Mês atual vs mês anterior · {categorias.length} categorias</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-400 font-medium">Ordenar:</span>
            <button
              onClick={() => setSortCat(s => s === 'valor' ? 'nome' : 'valor')}
              className="text-[10px] font-semibold text-[#7D1F2C] hover:underline"
            >
              {sortCat === 'valor' ? 'Por valor' : 'A–Z'}
            </button>
          </div>
        </div>

        {/* Legenda */}
        <div className="flex items-center gap-4 px-5 py-2 bg-gray-50 border-b border-gray-100">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-[#7D1F2C]" />
            <span className="text-[10px] font-semibold text-gray-600">Mês atual</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-gray-200" />
            <span className="text-[10px] font-semibold text-gray-400">Mês anterior</span>
          </div>
        </div>

        <div className="divide-y divide-gray-50">
          {loading
            ? [1,2,3,4,5,6,7,8].map(i => (
                <div key={i} className="px-5 py-3 animate-pulse">
                  <div className="h-3 bg-gray-200 rounded w-1/3 mb-2" />
                  <div className="h-2 bg-gray-100 rounded w-full" />
                </div>
              ))
            : catsVisiveis.map((c, i) => {
                const barAtual    = maxCat > 0 ? (c.mes_atual / maxCat) * 100 : 0;
                const barAnterior = maxCat > 0 ? (c.mes_anterior / maxCat) * 100 : 0;
                const varPct      = pct(c.mes_atual, c.mes_anterior);
                return (
                  <div key={i} className="px-5 py-3 hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-gray-700">{c.categoria}</span>
                      <div className="flex items-center gap-3 shrink-0 ml-4">
                        {varPct !== null && (
                          <span className={`text-[10px] font-bold flex items-center gap-0.5 ${
                            varPct > 10 ? 'text-red-500' : varPct < -10 ? 'text-emerald-600' : 'text-gray-400'
                          }`}>
                            {varPct > 0 ? <ArrowUp className="w-2.5 h-2.5" /> : varPct < 0 ? <ArrowDown className="w-2.5 h-2.5" /> : <Minus className="w-2.5 h-2.5" />}
                            {Math.abs(varPct).toFixed(0)}%
                          </span>
                        )}
                        <span className="text-xs font-bold text-gray-900 w-20 text-right font-mono">
                          {c.mes_atual > 0 ? R(c.mes_atual) : <span className="text-gray-300">—</span>}
                        </span>
                      </div>
                    </div>
                    {/* Barras duplas */}
                    <div className="space-y-1">
                      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full rounded-full bg-[#7D1F2C] transition-all duration-700"
                          style={{ width: `${barAtual}%` }} />
                      </div>
                      {c.mes_anterior > 0 && (
                        <div className="h-1 rounded-full bg-gray-100 overflow-hidden">
                          <div className="h-full rounded-full bg-gray-300 transition-all duration-700"
                            style={{ width: `${barAnterior}%` }} />
                        </div>
                      )}
                    </div>
                    {c.mes_anterior > 0 && (
                      <p className="text-[9px] text-gray-400 mt-1">
                        Mês ant.: {R(c.mes_anterior)}
                      </p>
                    )}
                  </div>
                );
              })
          }
        </div>

        {categorias.length > 10 && (
          <button
            onClick={() => setExpandCats(v => !v)}
            className="w-full py-3 text-xs font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-1 border-t border-gray-100"
          >
            {expandCats
              ? <><ChevronUp className="w-3.5 h-3.5" /> Mostrar menos</>
              : <><ChevronDown className="w-3.5 h-3.5" /> Ver todas ({categorias.length} categorias)</>
            }
          </button>
        )}
      </div>

    </div>
  );
}
