import React, { useState, useEffect, useCallback } from 'react';
import {
  Target, AlertTriangle, CheckCircle, BarChart3, ChevronDown,
  ChevronRight, MessageSquare, Plus, RefreshCw,
  ArrowUp, ArrowDown, Minus, TrendingUp, Users, Package,
  DollarSign, Calendar, X, Save, Loader2
} from 'lucide-react';
import {
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { supabase } from '../lib/supabase';

// ─── Tipos ───────────────────────────────────────────────────────────────────
type OKRStatus = 'on-track' | 'at-risk' | 'off-track' | 'completed';

interface KeyResult {
  id: string;
  objetivo_id: string;
  titulo: string;
  meta_valor: number;
  valor_atual: number;
  unidade: string;
  responsavel: string;
  data_limite: string;
  status: OKRStatus;
}

interface Comentario {
  id: string;
  objetivo_id: string;
  autor: string;
  texto: string;
  criado_em: string;
}

interface Objetivo {
  id: string;
  titulo: string;
  descricao: string;
  trimestre: string;
  responsavel: string;
  status: OKRStatus;
  keyResults: KeyResult[];
  comentarios: Comentario[];
}

interface KPIs {
  receita_mes: number;
  despesa_mes: number;
  saldo_mes: number;
  receita_mes_anterior: number;
  colaboradores_ativos: number;
  folha_mensal: number;
  contas_em_aberto: number;
  valor_em_aberto: number;
  eventos_mes: number;
  receita_eventos: number;
  itens_criticos: number;
}

interface SerieFinanceira {
  label: string;
  Receita: number;
  Despesa: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function moeda(v: number): string {
  if (v >= 1000000) return `R$ ${(v / 1000000).toFixed(1)}M`;
  if (v >= 100000) return `R$ ${(v / 1000).toFixed(0)}k`;
  if (v >= 1000) return `R$ ${(v / 1000).toFixed(1)}k`;
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 });
}
function pct(v: number): string { return `${v.toFixed(1)}%`; }
function num(v: number): string { return v.toLocaleString('pt-BR'); }

function calcProg(atual: number, meta: number): number {
  if (meta === 0) return 0;
  return Math.min(100, Math.round((atual / meta) * 100));
}

const STATUS: Record<OKRStatus, { label: string; tw: string }> = {
  'on-track':  { label: 'No Prazo',  tw: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  'at-risk':   { label: 'Em Risco',  tw: 'text-amber-700  bg-amber-50  border-amber-200'  },
  'off-track': { label: 'Atrasado',  tw: 'text-red-700    bg-red-50    border-red-200'    },
  'completed': { label: 'Concluído', tw: 'text-blue-700   bg-blue-50   border-blue-200'   },
};

function barColor(p: number) {
  if (p >= 90) return 'bg-emerald-400';
  if (p >= 60) return 'bg-amber-400';
  return 'bg-red-400';
}

// ─── KPI Card ────────────────────────────────────────────────────────────────
function KPICard({
  titulo, valor, formato, variacao, meta, alerta, icon: Icon, loading
}: {
  titulo: string;
  valor: number;
  formato: 'currency' | 'percent' | 'number';
  variacao?: number;
  meta?: number;
  alerta?: 'warning' | 'danger';
  icon: React.ElementType;
  loading?: boolean;
}) {
  const display = formato === 'currency' ? moeda(valor) : formato === 'percent' ? pct(valor) : num(valor);
  const prog = meta ? calcProg(valor, meta) : null;

  if (loading) return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm animate-pulse h-28" />
  );

  return (
    <div className={`bg-white rounded-2xl border p-4 shadow-sm transition-shadow hover:shadow-md ${
      alerta === 'danger'  ? 'border-red-200   bg-red-50/20'   :
      alerta === 'warning' ? 'border-amber-200 bg-amber-50/20' : 'border-gray-100'
    }`}>
      <div className="flex items-start justify-between mb-2">
        <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide leading-tight">{titulo}</span>
        <div className={`p-1.5 rounded-xl ml-2 shrink-0 ${
          alerta === 'danger'  ? 'bg-red-100'    :
          alerta === 'warning' ? 'bg-amber-100'  : 'bg-gray-100'
        }`}>
          <Icon className={`w-3.5 h-3.5 ${
            alerta === 'danger'  ? 'text-red-500'    :
            alerta === 'warning' ? 'text-amber-500'  : 'text-gray-500'
          }`} />
        </div>
      </div>

      <p className={`text-xl font-bold leading-none mb-2 ${
        alerta === 'danger'  ? 'text-red-700'    :
        alerta === 'warning' ? 'text-amber-700'  : 'text-gray-900'
      }`}>{display}</p>

      <div className="flex items-center gap-2 min-h-[16px]">
        {variacao !== undefined && (
          <span className={`flex items-center gap-0.5 text-[10px] font-semibold ${
            variacao > 0 ? 'text-emerald-600' : variacao < 0 ? 'text-red-500' : 'text-gray-400'
          }`}>
            {variacao > 0 ? <ArrowUp className="w-2.5 h-2.5" /> : variacao < 0 ? <ArrowDown className="w-2.5 h-2.5" /> : <Minus className="w-2.5 h-2.5" />}
            {Math.abs(variacao).toFixed(1)}% vs mês ant.
          </span>
        )}
        {meta && <span className="text-[10px] text-gray-400 ml-auto font-mono">meta: {formato === 'currency' ? moeda(meta) : pct(meta)}</span>}
      </div>

      {prog !== null && (
        <div className="mt-2 h-1.5 rounded-full bg-gray-100 overflow-hidden">
          <div className={`h-full rounded-full ${barColor(prog)}`} style={{ width: `${prog}%` }} />
        </div>
      )}
    </div>
  );
}

// ─── OKR Card ────────────────────────────────────────────────────────────────
function OKRCard({ obj, onRefresh }: { obj: Objetivo; onRefresh: () => void }) {
  const [open, setOpen] = useState(false);
  const [comentario, setComentario] = useState('');
  const [saving, setSaving] = useState(false);

  const prog = obj.keyResults.length > 0
    ? Math.round(obj.keyResults.reduce((a, kr) => a + calcProg(kr.valor_atual, kr.meta_valor), 0) / obj.keyResults.length)
    : 0;

  const s = STATUS[obj.status];

  const saveComentario = async () => {
    if (!comentario.trim()) return;
    setSaving(true);
    await supabase.from('okr_comentarios').insert({ objetivo_id: obj.id, autor: 'Usuário', texto: comentario.trim() });
    setComentario('');
    setSaving(false);
    onRefresh();
  };

  const updateKRStatus = async (id: string, status: OKRStatus) => {
    await supabase.from('okr_key_results').update({ status }).eq('id', id);
    onRefresh();
  };

  const updateKRValor = async (id: string, valor: number) => {
    if (isNaN(valor)) return;
    await supabase.from('okr_key_results').update({ valor_atual: valor }).eq('id', id);
    onRefresh();
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 flex items-start gap-3 cursor-pointer hover:bg-gray-50/60 transition-colors select-none"
        onClick={() => setOpen(v => !v)}>
        <span className="mt-0.5 text-gray-400 shrink-0">
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-2">
            <h3 className="text-sm font-semibold text-gray-900 leading-snug">{obj.titulo}</h3>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 ${s.tw}`}>{s.label}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
              <div className={`h-full rounded-full ${barColor(prog)}`} style={{ width: `${prog}%` }} />
            </div>
            <span className="text-xs font-bold text-gray-600 font-mono w-8 text-right shrink-0">{prog}%</span>
          </div>
          <div className="flex items-center gap-2 mt-1.5 text-[11px] text-gray-400">
            <span>{obj.responsavel}</span>
            <span>·</span>
            <span>{obj.trimestre}</span>
            {obj.comentarios.length > 0 && (
              <span className="flex items-center gap-1">· <MessageSquare className="w-3 h-3" />{obj.comentarios.length}</span>
            )}
          </div>
        </div>
      </div>

      {/* Expandido */}
      {open && (
        <div className="border-t border-gray-100 px-5 py-4 space-y-5">
          {obj.descricao && (
            <p className="text-xs text-gray-500 bg-gray-50 rounded-xl px-3 py-2.5 leading-relaxed">{obj.descricao}</p>
          )}

          {/* Key Results */}
          {obj.keyResults.length > 0 && (
            <div className="space-y-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Key Results</p>
              {obj.keyResults.map(kr => {
                const p = calcProg(kr.valor_atual, kr.meta_valor);
                const ks = STATUS[kr.status];
                return (
                  <div key={kr.id} className="space-y-1.5 bg-gray-50 rounded-xl p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-gray-800">{kr.titulo}</span>
                      <select
                        value={kr.status}
                        onChange={e => updateKRStatus(kr.id, e.target.value as OKRStatus)}
                        onClick={e => e.stopPropagation()}
                        className={`text-[10px] font-semibold border rounded-full px-2 py-0.5 cursor-pointer ${ks.tw}`}
                      >
                        <option value="on-track">No Prazo</option>
                        <option value="at-risk">Em Risco</option>
                        <option value="off-track">Atrasado</option>
                        <option value="completed">Concluído</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                        <div className={`h-full rounded-full ${barColor(p)}`} style={{ width: `${p}%` }} />
                      </div>
                      <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                        <input
                          type="number"
                          defaultValue={kr.valor_atual}
                          onBlur={e => updateKRValor(kr.id, parseFloat(e.target.value))}
                          className="w-20 text-[11px] border border-gray-200 rounded-lg px-2 py-0.5 text-right font-mono bg-white"
                        />
                        <span className="text-[11px] text-gray-400">/ {kr.meta_valor} {kr.unidade}</span>
                      </div>
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-400">
                      <span>{kr.responsavel}</span>
                      <span>Prazo: {new Date(kr.data_limite + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Comentários */}
          {obj.comentarios.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Comentários</p>
              {obj.comentarios.map(c => (
                <div key={c.id} className="bg-gray-50 rounded-xl px-3 py-2.5">
                  <div className="flex justify-between mb-1">
                    <span className="text-xs font-bold text-gray-700">{c.autor}</span>
                    <span className="text-[10px] text-gray-400">{new Date(c.criado_em).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">{c.texto}</p>
                </div>
              ))}
            </div>
          )}

          {/* Novo comentário */}
          <div className="flex gap-2" onClick={e => e.stopPropagation()}>
            <input
              type="text"
              value={comentario}
              onChange={e => setComentario(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveComentario()}
              placeholder="Adicionar comentário..."
              className="flex-1 text-xs border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#7D1F2C]/20 focus:border-[#7D1F2C]"
            />
            <button
              onClick={saveComentario}
              disabled={saving || !comentario.trim()}
              className="px-3 py-2 rounded-xl text-white bg-gradient-to-r from-[#7D1F2C] to-[#D4AF37] disabled:opacity-40"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Modal Novo OKR ───────────────────────────────────────────────────────────
function ModalOKR({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [trimestre, setTrimestre] = useState('Q2 2026');
  const [responsavel, setResponsavel] = useState('');
  const [saving, setSaving] = useState(false);

  const salvar = async () => {
    if (!titulo.trim() || !responsavel.trim()) return;
    setSaving(true);
    await supabase.from('okr_objetivos').insert({
      titulo: titulo.trim(), descricao: descricao.trim(),
      trimestre, responsavel: responsavel.trim(), status: 'on-track'
    });
    setSaving(false);
    onSave();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-gray-900">Novo Objetivo</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Título *</label>
            <input value={titulo} onChange={e => setTitulo(e.target.value)}
              placeholder="Ex: Aumentar receita para R$ 300k"
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#7D1F2C]/20 focus:border-[#7D1F2C]" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Descrição</label>
            <textarea value={descricao} onChange={e => setDescricao(e.target.value)}
              placeholder="Contexto e motivação do objetivo..." rows={2}
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#7D1F2C]/20 focus:border-[#7D1F2C] resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Trimestre</label>
              <select value={trimestre} onChange={e => setTrimestre(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none">
                <option>Q1 2026</option><option>Q2 2026</option>
                <option>Q3 2026</option><option>Q4 2026</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Responsável *</label>
              <input value={responsavel} onChange={e => setResponsavel(e.target.value)}
                placeholder="Nome ou área"
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#7D1F2C]/20 focus:border-[#7D1F2C]" />
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm text-gray-600 border border-gray-200 hover:bg-gray-50">
            Cancelar
          </button>
          <button onClick={salvar} disabled={saving || !titulo.trim() || !responsavel.trim()}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[#7D1F2C] to-[#D4AF37] disabled:opacity-40">
            {saving ? 'Salvando...' : 'Criar Objetivo'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Página Principal ────────────────────────────────────────────────────────
type Tab = 'dashboard' | 'okrs' | 'alertas';

export default function GestaoEstrategica() {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [serie, setSerie] = useState<SerieFinanceira[]>([]);
  const [objetivos, setObjetivos] = useState<Objetivo[]>([]);
  const [modalOKR, setModalOKR] = useState(false);

  const load = useCallback(async () => {
    try {
      const hoje = new Date();
      const anoMes = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
      const inicioMes = `${anoMes}-01`;
      const mesAnt = hoje.getMonth() === 0
        ? `${hoje.getFullYear() - 1}-12`
        : `${hoje.getFullYear()}-${String(hoje.getMonth()).padStart(2, '0')}`;
      const inicioMesAnt = `${mesAnt}-01`;
      const fimMesAnt = new Date(hoje.getFullYear(), hoje.getMonth(), 0).toISOString().split('T')[0];
      const inicio30d = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

      // Todas as queries em paralelo
      const [
        { data: fcMes },
        { data: fcAnt },
        { data: colab },
        { data: contasAb },
        { data: evs },
        { data: fcSerie },
        { data: okrObjs },
      ] = await Promise.all([
        supabase.from('fluxo_caixa').select('tipo,valor').gte('data', inicioMes),
        supabase.from('fluxo_caixa').select('tipo,valor').gte('data', inicioMesAnt).lte('data', fimMesAnt),
        supabase.from('colaboradores').select('salario_fixo').eq('status', 'ativo'),
        supabase.from('contas_pagar').select('saldo_restante').eq('status', 'em_aberto'),
        supabase.from('eventos_fechados').select('valor_total').gte('data_evento', inicioMes),
        supabase.from('fluxo_caixa').select('tipo,valor,data').gte('data', inicio30d).order('data'),
        supabase.from('okr_objetivos').select('*').order('criado_em'),
      ]);

      // Itens com saldo crítico — usa RPC ou query direta sem join aninhado
      const { data: saldosCrit } = await supabase
        .from('saldos_estoque')
        .select('quantidade_atual, item_id')
        .lte('quantidade_atual', 0);

      const receitaMes = (fcMes || []).filter(r => r.tipo === 'entrada').reduce((a, b) => a + +b.valor, 0);
      const despesaMes = (fcMes || []).filter(r => r.tipo === 'saida').reduce((a, b) => a + +b.valor, 0);
      const receitaAnt = (fcAnt || []).filter(r => r.tipo === 'entrada').reduce((a, b) => a + +b.valor, 0);
      const folha = (colab || []).reduce((a, b) => a + +(b.salario_fixo || 0), 0);

      setKpis({
        receita_mes: receitaMes,
        despesa_mes: despesaMes,
        saldo_mes: receitaMes - despesaMes,
        receita_mes_anterior: receitaAnt,
        colaboradores_ativos: colab?.length || 0,
        folha_mensal: folha,
        contas_em_aberto: contasAb?.length || 0,
        valor_em_aberto: (contasAb || []).reduce((a, b) => a + +(b.saldo_restante || 0), 0),
        eventos_mes: evs?.length || 0,
        receita_eventos: (evs || []).reduce((a, b) => a + +(b.valor_total || 0), 0),
        itens_criticos: saldosCrit?.length || 0,
      });

      // Série financeira — agrupa por dia
      const porDia: Record<string, { R: number; D: number }> = {};
      (fcSerie || []).forEach(r => {
        if (!porDia[r.data]) porDia[r.data] = { R: 0, D: 0 };
        if (r.tipo === 'entrada') porDia[r.data].R += +r.valor;
        else porDia[r.data].D += +r.valor;
      });
      setSerie(
        Object.entries(porDia)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([data, v]) => ({
            label: new Date(data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
            Receita: v.R,
            Despesa: v.D,
          }))
      );

      // OKRs com key results e comentários
      if (okrObjs && okrObjs.length > 0) {
        const detalhes = await Promise.all(
          okrObjs.map(async (o) => {
            const [{ data: krs }, { data: cms }] = await Promise.all([
              supabase.from('okr_key_results').select('*').eq('objetivo_id', o.id).order('criado_em'),
              supabase.from('okr_comentarios').select('*').eq('objetivo_id', o.id).order('criado_em'),
            ]);
            return { ...o, keyResults: krs || [], comentarios: cms || [] } as Objetivo;
          })
        );
        setObjetivos(detalhes);
      } else {
        setObjetivos([]);
      }
    } catch (err) {
      console.error('[GestaoEstrategica] erro:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const refresh = () => { setRefreshing(true); load(); };

  // Métricas derivadas
  const varReceita = kpis && kpis.receita_mes_anterior > 0
    ? ((kpis.receita_mes - kpis.receita_mes_anterior) / kpis.receita_mes_anterior) * 100 : 0;
  const pctPessoal = kpis && kpis.receita_mes > 0 ? (kpis.folha_mensal / kpis.receita_mes) * 100 : 0;
  const pctMargem  = kpis && kpis.receita_mes > 0 ? (kpis.saldo_mes   / kpis.receita_mes) * 100 : 0;

  // Alertas dinâmicos
  const alertas = !kpis ? [] : [
    kpis.itens_criticos > 0 && {
      id: 'estoque', tipo: 'warning',
      titulo: `${kpis.itens_criticos} item(ns) com saldo zerado no estoque`,
      msg: 'Verifique o módulo de estoque e reponha os itens críticos.',
    },
    kpis.valor_em_aberto > 0 && {
      id: 'contas', tipo: 'warning',
      titulo: `${kpis.contas_em_aberto} conta(s) a pagar em aberto`,
      msg: `Total de ${moeda(kpis.valor_em_aberto)} aguardando pagamento.`,
    },
    pctPessoal > 45 && {
      id: 'pessoal', tipo: 'danger',
      titulo: 'Custo de pessoal acima de 45% da receita',
      msg: `Folha de ${moeda(kpis!.folha_mensal)} = ${pct(pctPessoal)} da receita do mês.`,
    },
    kpis.saldo_mes < 0 && {
      id: 'saldo', tipo: 'danger',
      titulo: 'Saldo negativo no mês',
      msg: `Despesas superaram receitas em ${moeda(Math.abs(kpis.saldo_mes))}.`,
    },
    kpis.receita_mes > kpis.receita_mes_anterior && kpis.receita_mes_anterior > 0 && {
      id: 'crescimento', tipo: 'info',
      titulo: `Receita cresceu ${pct(varReceita)} vs mês anterior`,
      msg: `De ${moeda(kpis.receita_mes_anterior)} para ${moeda(kpis.receita_mes)}.`,
    },
  ].filter(Boolean) as { id: string; tipo: string; titulo: string; msg: string }[];

  const critCount = alertas.filter(a => a.tipo !== 'info').length;
  const okrSummary = {
    onTrack:  objetivos.filter(o => o.status === 'on-track').length,
    atRisk:   objetivos.filter(o => o.status === 'at-risk').length,
    offTrack: objetivos.filter(o => o.status === 'off-track').length,
  };

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-[#7D1F2C] to-[#D4AF37] bg-clip-text text-transparent">
            Gestão Estratégica
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Dados em tempo real • {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</p>
        </div>
        <button onClick={refresh} disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 shadow-sm">
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────────────── */}
      <div className="flex gap-1.5 bg-gray-100 p-1 rounded-2xl w-fit">
        {([
          { id: 'dashboard', label: 'Dashboard',   icon: BarChart3 },
          { id: 'okrs',      label: 'OKRs',         icon: Target },
          { id: 'alertas',   label: `Alertas${critCount > 0 ? ` (${critCount})` : ''}`, icon: AlertTriangle },
        ] as { id: Tab; label: string; icon: React.ElementType }[]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              tab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            <t.icon className="w-3.5 h-3.5" />{t.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: DASHBOARD
      ════════════════════════════════════════════════════════════════════════ */}
      {tab === 'dashboard' && (
        <div className="space-y-6">

          {/* KPIs linha 1 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
            <KPICard titulo="Receita do Mês"   valor={kpis?.receita_mes || 0}  formato="currency" variacao={varReceita} icon={TrendingUp} loading={loading} />
            <KPICard titulo="Despesas do Mês"  valor={kpis?.despesa_mes || 0}  formato="currency" icon={DollarSign}   loading={loading} />
            <KPICard titulo="Saldo do Mês"     valor={kpis?.saldo_mes || 0}    formato="currency" icon={DollarSign}
              alerta={kpis && kpis.saldo_mes < 0 ? 'danger' : undefined}       loading={loading} />
            <KPICard titulo="Margem Líquida"   valor={pctMargem}               formato="percent"  icon={BarChart3}
              alerta={pctMargem < 10 ? 'danger' : pctMargem < 20 ? 'warning' : undefined}         loading={loading} />
            <KPICard titulo="% Custo Pessoal"  valor={pctPessoal}              formato="percent"  icon={Users} meta={40}
              alerta={pctPessoal > 50 ? 'danger' : pctPessoal > 40 ? 'warning' : undefined}       loading={loading} />
            <KPICard titulo="Itens c/ Saldo 0" valor={kpis?.itens_criticos || 0} formato="number" icon={Package}
              alerta={kpis && kpis.itens_criticos > 0 ? 'warning' : undefined} loading={loading} />
          </div>

          {/* KPIs linha 2 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KPICard titulo="Colaboradores Ativos" valor={kpis?.colaboradores_ativos || 0} formato="number" icon={Users}     loading={loading} />
            <KPICard titulo="Folha Mensal"          valor={kpis?.folha_mensal || 0}          formato="currency" icon={Users}  loading={loading} />
            <KPICard titulo="Eventos este Mês"      valor={kpis?.eventos_mes || 0}           formato="number" icon={Calendar} loading={loading} />
            <KPICard titulo="Receita de Eventos"    valor={kpis?.receita_eventos || 0}       formato="currency" icon={Calendar} loading={loading} />
          </div>

          {/* Gráfico + resumo OKR */}
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">

            {/* Gráfico — 3/5 */}
            <div className="xl:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-sm font-bold text-gray-900 mb-0.5">Receita vs Despesa — 30 dias</p>
              <p className="text-xs text-gray-400 mb-4">Fonte: fluxo_caixa</p>
              {loading ? (
                <div className="h-48 bg-gray-100 rounded-xl animate-pulse" />
              ) : serie.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-sm text-gray-400">Sem dados no período</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={serie} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gRec" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#7D1F2C" stopOpacity={0.18} />
                        <stop offset="95%" stopColor="#7D1F2C" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gDesp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#D4AF37" stopOpacity={0.18} />
                        <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                      tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      formatter={(v: number, name: string) => [moeda(v), name]}
                      contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 11 }}
                    />
                    <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                    <Area type="monotone" dataKey="Receita" stroke="#7D1F2C" strokeWidth={2} fill="url(#gRec)"  dot={false} />
                    <Area type="monotone" dataKey="Despesa" stroke="#D4AF37" strokeWidth={2} fill="url(#gDesp)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Resumo OKR — 2/5 */}
            <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-bold text-gray-900">Status OKRs</p>
                <button onClick={() => setTab('okrs')} className="text-xs text-[#7D1F2C] font-semibold hover:underline">Ver todos →</button>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { label: 'No Prazo',  value: okrSummary.onTrack,  tw: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
                  { label: 'Em Risco',  value: okrSummary.atRisk,   tw: 'text-amber-700   bg-amber-50   border-amber-200' },
                  { label: 'Atrasado',  value: okrSummary.offTrack, tw: 'text-red-700     bg-red-50     border-red-200' },
                ].map(s => (
                  <div key={s.label} className={`rounded-xl border p-3 text-center ${s.tw}`}>
                    <p className="text-2xl font-extrabold">{s.value}</p>
                    <p className="text-[10px] font-semibold mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>

              <div className="flex-1 space-y-2 overflow-y-auto">
                {loading ? (
                  [1,2,3].map(i => <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />)
                ) : objetivos.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-6">Nenhum OKR criado ainda</p>
                ) : objetivos.slice(0, 4).map(o => {
                  const p = o.keyResults.length > 0
                    ? Math.round(o.keyResults.reduce((a, kr) => a + calcProg(kr.valor_atual, kr.meta_valor), 0) / o.keyResults.length) : 0;
                  const s = STATUS[o.status];
                  return (
                    <div key={o.id} className="flex items-center gap-3 bg-gray-50 rounded-xl p-2.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-800 truncate">{o.titulo}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <div className="flex-1 h-1 rounded-full bg-gray-200 overflow-hidden">
                            <div className={`h-full rounded-full ${barColor(p)}`} style={{ width: `${p}%` }} />
                          </div>
                          <span className="text-[10px] font-mono text-gray-500">{p}%</span>
                        </div>
                      </div>
                      <span className={`text-[10px] font-semibold border rounded-full px-2 py-0.5 shrink-0 ${s.tw}`}>{s.label}</span>
                    </div>
                  );
                })}
              </div>

              {/* Alertas preview */}
              {critCount > 0 && (
                <button onClick={() => setTab('alertas')}
                  className="mt-4 flex items-center gap-2 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 hover:bg-amber-100 transition-colors">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {critCount} alerta{critCount > 1 ? 's' : ''} ativo{critCount > 1 ? 's' : ''} → ver detalhes
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: OKRs
      ════════════════════════════════════════════════════════════════════════ */}
      {tab === 'okrs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex gap-2">
              {[
                { label: 'Total',    value: objetivos.length,       tw: 'text-gray-700    bg-white      border-gray-200'    },
                { label: 'No Prazo', value: okrSummary.onTrack,  tw: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
                { label: 'Em Risco', value: okrSummary.atRisk,   tw: 'text-amber-700   bg-amber-50   border-amber-200'   },
                { label: 'Atrasado', value: okrSummary.offTrack, tw: 'text-red-700     bg-red-50     border-red-200'     },
              ].map(s => (
                <div key={s.label} className={`rounded-2xl border px-4 py-2.5 text-center shadow-sm ${s.tw}`}>
                  <p className="text-lg font-extrabold">{s.value}</p>
                  <p className="text-[10px] font-semibold">{s.label}</p>
                </div>
              ))}
            </div>
            <button onClick={() => setModalOKR(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[#7D1F2C] to-[#D4AF37] shadow-sm hover:shadow-md transition-all">
              <Plus className="w-3.5 h-3.5" /> Novo Objetivo
            </button>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-20 bg-white rounded-2xl border border-gray-100 animate-pulse" />)}
            </div>
          ) : objetivos.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
              <Target className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-500">Nenhum objetivo criado ainda</p>
              <p className="text-xs text-gray-400 mt-1 mb-5">Defina os OKRs do trimestre para acompanhar o progresso</p>
              <button onClick={() => setModalOKR(true)}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[#7D1F2C] to-[#D4AF37]">
                Criar Primeiro Objetivo
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {objetivos.map(o => <OKRCard key={o.id} obj={o} onRefresh={load} />)}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: ALERTAS
      ════════════════════════════════════════════════════════════════════════ */}
      {tab === 'alertas' && (
        <div className="space-y-3 max-w-2xl">
          {loading ? (
            [1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-2xl animate-pulse" />)
          ) : alertas.length === 0 ? (
            <div className="text-center py-14 bg-white rounded-2xl border border-gray-100">
              <CheckCircle className="w-9 h-9 text-emerald-400 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-600">Tudo certo por aqui!</p>
              <p className="text-xs text-gray-400 mt-1">Nenhum alerta ativo no momento.</p>
            </div>
          ) : alertas.map(a => {
            const cfg = {
              danger:  { bg: 'bg-red-50   border-red-200',   text: 'text-red-700',   icon: AlertTriangle },
              warning: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', icon: AlertTriangle },
              info:    { bg: 'bg-blue-50  border-blue-200',  text: 'text-blue-700',  icon: CheckCircle },
            }[a.tipo] ?? { bg: 'bg-gray-50 border-gray-200', text: 'text-gray-700', icon: AlertTriangle };
            return (
              <div key={a.id} className={`rounded-2xl border px-4 py-3.5 ${cfg.bg}`}>
                <div className="flex items-start gap-3">
                  <cfg.icon className={`w-4 h-4 mt-0.5 shrink-0 ${cfg.text}`} />
                  <div>
                    <p className={`text-sm font-bold ${cfg.text}`}>{a.titulo}</p>
                    <p className={`text-xs mt-0.5 opacity-80 ${cfg.text}`}>{a.msg}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalOKR && <ModalOKR onClose={() => setModalOKR(false)} onSave={load} />}
    </div>
  );
}
