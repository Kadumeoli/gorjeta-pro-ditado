import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  Search, CheckCircle, AlertCircle, CreditCard,
  ChevronRight, ArrowLeft, Check, Loader2, Calendar,
  TrendingUp, RefreshCw, Banknote, Smartphone, Wallet,
  Settings, Building2, Save
} from 'lucide-react';

// ─── tipos ────────────────────────────────────────────────────────────────────
interface ItemPreview {
  paymentId: number;
  paymentName: string;
  valor: number;
  descricao: string;
  formaId: string | null;
  formaLabel: string;
  dataRef: string;
  eventIds: string[];
  contaBancariaId: string | null;
  contaBancariaNome: string | null;
  selecionado: boolean;
}

interface ContaBancaria {
  id: string;
  banco: string;
  tipo_conta: string;
}

interface ConfigForma {
  id: string;
  payment_id: number;
  payment_name: string;
  conta_bancaria_id: string | null;
  ativo: boolean;
}

interface HistoricoSync {
  id: string;
  dtinicio: string;
  dtfim: string;
  status: string;
  total_inseridos: number;
  total_duplicados: number;
  total_valor: number;
  erro_mensagem: string | null;
}

type Etapa = 'periodo' | 'revisao' | 'resultado';
type Aba   = 'importar' | 'configurar';

// ─── helpers ──────────────────────────────────────────────────────────────────
const moeda = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmt = (d: Date) => d.toISOString().split('T')[0];
const hoje = fmt(new Date());
const ontemStr = () => { const d = new Date(); d.setDate(d.getDate() - 1); return fmt(d); };
const SUPABASE_URL = (supabase as any).supabaseUrl as string;

const BADGE: Record<string, string> = {
  sucesso:      'bg-emerald-100 text-emerald-700',
  parcial:      'bg-amber-100 text-amber-700',
  erro:         'bg-red-100 text-red-700',
  em_andamento: 'bg-blue-100 text-blue-700',
};
const BADGE_LABEL: Record<string, string> = {
  sucesso: 'Sucesso', parcial: 'Parcial', erro: 'Erro', em_andamento: 'Em andamento',
};

// Formas que não precisam de conta (zeradas)
const IGNORADAS = new Set(['APP','DELIVERY ONLINE','IFOOD','RAPPI','UBER','ANTECIPADO','VOUCHER']);

function IconeForma({ label }: { label: string }) {
  const l = label.toLowerCase();
  if (l.includes('crédito') || l.includes('débito'))  return <CreditCard className="w-4 h-4" />;
  if (l.includes('pix'))                              return <Smartphone className="w-4 h-4" />;
  if (l.includes('dinheir'))                          return <Banknote className="w-4 h-4" />;
  return <Wallet className="w-4 h-4" />;
}

function corForma(label: string) {
  const l = label.toLowerCase();
  if (l.includes('crédito'))  return 'bg-purple-100 text-purple-700';
  if (l.includes('débito'))   return 'bg-blue-100 text-blue-700';
  if (l.includes('pix'))      return 'bg-teal-100 text-teal-700';
  if (l.includes('dinheir'))  return 'bg-green-100 text-green-700';
  return 'bg-gray-100 text-gray-600';
}

// ─── componente ───────────────────────────────────────────────────────────────
export default function ZigRecebimentos() {
  const [aba, setAba]             = useState<Aba>('importar');
  const [etapa, setEtapa]         = useState<Etapa>('periodo');
  const [dtinicio, setDtinicio]   = useState(ontemStr());
  const [dtfim, setDtfim]         = useState(ontemStr());
  const [loading, setLoading]     = useState(false);
  const [erro, setErro]           = useState('');
  const [itens, setItens]         = useState<ItemPreview[]>([]);
  const [resultado, setResultado] = useState<any>(null);
  const [historico, setHistorico] = useState<HistoricoSync[]>([]);
  const [loadingHist, setLoadingHist] = useState(false);

  // config
  const [contas, setContas]       = useState<ContaBancaria[]>([]);
  const [configs, setConfigs]     = useState<ConfigForma[]>([]);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configSalvo, setConfigSalvo]   = useState(false);

  useEffect(() => {
    carregarContas();
    carregarConfigs();
  }, []);

  async function carregarContas() {
    const { data } = await supabase
      .from('bancos_contas')
      .select('id, banco, tipo_conta')
      .eq('status', 'ativo')
      .order('banco');
    setContas(data || []);
  }

  async function carregarConfigs() {
    const { data } = await supabase
      .from('zig_config_formas')
      .select('*')
      .eq('ativo', true)
      .order('payment_id');
    setConfigs(data || []);
  }

  async function salvarConfig() {
    setSavingConfig(true);
    for (const c of configs) {
      await supabase
        .from('zig_config_formas')
        .update({ conta_bancaria_id: c.conta_bancaria_id, atualizado_em: new Date().toISOString() })
        .eq('id', c.id);
    }
    setSavingConfig(false);
    setConfigSalvo(true);
    setTimeout(() => setConfigSalvo(false), 2000);
  }

  async function buscarPreview() {
    setLoading(true); setErro('');
    try {
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/zig-preview-recebimentos`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dtinicio, dtfim }) }
      );
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Erro ao buscar dados na ZIG');
      if (!data.itens?.length) { setErro('Nenhum faturamento encontrado para o período.'); return; }
      setItens(data.itens.map((i: any) => ({ ...i, selecionado: true })));
      setEtapa('revisao');
    } catch (e: any) { setErro(e.message); }
    finally { setLoading(false); }
  }

  async function confirmarImportacao() {
    const aprovados = itens.filter(i => i.selecionado);
    if (!aprovados.length) { setErro('Selecione ao menos um item.'); return; }
    setLoading(true); setErro('');
    try {
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/zig-confirmar-recebimentos`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itens: aprovados, dtinicio, dtfim }) }
      );
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Erro ao confirmar');
      setResultado(data);
      setEtapa('resultado');
      carregarHistorico();
    } catch (e: any) { setErro(e.message); }
    finally { setLoading(false); }
  }

  async function carregarHistorico() {
    setLoadingHist(true);
    const { data } = await supabase
      .from('zig_recebimentos_sync')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(8);
    setHistorico(data || []);
    setLoadingHist(false);
  }

  function atalho(tipo: 'ontem' | '7dias' | 'mes') {
    const fim = new Date(); fim.setDate(fim.getDate() - 1);
    const ini = new Date(fim);
    if (tipo === '7dias') ini.setDate(ini.getDate() - 6);
    if (tipo === 'mes')   ini.setDate(1);
    setDtinicio(fmt(ini)); setDtfim(fmt(fim));
  }

  const totalSelecionado = itens.filter(i => i.selecionado).reduce((s, i) => s + i.valor, 0);
  const todosSelected    = itens.length > 0 && itens.every(i => i.selecionado);

  const resumoPorForma = itens.filter(i => i.selecionado).reduce((acc, i) => {
    acc[i.formaLabel] = (acc[i.formaLabel] || 0) + i.valor;
    return acc;
  }, {} as Record<string, number>);

  // ── render ──────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">

      {/* cabeçalho */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#7D1F2C]/10">
            <CreditCard className="w-6 h-6 text-[#7D1F2C]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">ZIG → Faturamento</h1>
            <p className="text-sm text-gray-500">Importação por forma de pagamento</p>
          </div>
        </div>
        {/* abas */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          <button onClick={() => setAba('importar')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all
              ${aba === 'importar' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <TrendingUp className="w-4 h-4" /> Importar
          </button>
          <button onClick={() => setAba('configurar')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all
              ${aba === 'configurar' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <Settings className="w-4 h-4" /> Configurar
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          ABA CONFIGURAR
      ══════════════════════════════════════════════════ */}
      {aba === 'configurar' && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Conta destino por forma de pagamento</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Defina em qual conta bancária cada forma de pagamento é depositada.
              Ex: Dinheiro → Cofre · Crédito/PIX → PagSeguro
            </p>
          </div>

          <div className="divide-y divide-gray-50">
            {configs.filter(c => !IGNORADAS.has(c.payment_name.toUpperCase())).map(c => (
              <div key={c.id} className="flex items-center justify-between px-5 py-3.5 gap-4">
                <div className="flex items-center gap-2 min-w-[140px]">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${corForma(
                    c.payment_name.includes('CRÉD') || c.payment_name === 'CRÉDITO' ? 'crédito' :
                    c.payment_name.includes('DÉB')  || c.payment_name === 'DÉBITO'  ? 'débito'  :
                    c.payment_name
                  )}`}>
                    <IconeForma label={
                      c.payment_name === 'CRÉDITO' ? 'crédito' :
                      c.payment_name === 'DÉBITO'  ? 'débito'  :
                      c.payment_name.toLowerCase()
                    } />
                    {c.payment_name}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-1">
                  <Building2 className="w-4 h-4 text-gray-400 shrink-0" />
                  <select
                    value={c.conta_bancaria_id || ''}
                    onChange={e => setConfigs(prev => prev.map(p =>
                      p.id === c.id ? { ...p, conta_bancaria_id: e.target.value || null } : p
                    ))}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm
                               focus:outline-none focus:ring-2 focus:ring-[#7D1F2C]/30 bg-white">
                    <option value="">— Sem conta definida —</option>
                    {contas.map(ct => (
                      <option key={ct.id} value={ct.id}>
                        {ct.banco} ({ct.tipo_conta})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>

          <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
            <button onClick={salvarConfig} disabled={savingConfig}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#7D1F2C] text-white
                         font-semibold text-sm hover:bg-[#6a1a25] disabled:opacity-60 transition-all">
              {savingConfig
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
                : configSalvo
                ? <><CheckCircle className="w-4 h-4" /> Salvo!</>
                : <><Save className="w-4 h-4" /> Salvar configuração</>}
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          ABA IMPORTAR
      ══════════════════════════════════════════════════ */}
      {aba === 'importar' && (
        <>
          {/* steps */}
          <div className="flex items-center gap-2 text-sm">
            {(['periodo', 'revisao', 'resultado'] as Etapa[]).map((e, idx) => {
              const labels = ['1. Período', '2. Revisar', '3. Confirmar'];
              const ativo  = etapa === e;
              const feito  = (etapa === 'revisao' && idx === 0) ||
                             (etapa === 'resultado' && idx <= 1);
              return (
                <div key={e} className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full font-medium transition-all ${
                    ativo ? 'bg-[#7D1F2C] text-white' :
                    feito ? 'bg-emerald-100 text-emerald-700' :
                    'bg-gray-100 text-gray-400'
                  }`}>{labels[idx]}</span>
                  {idx < 2 && <ChevronRight className="w-4 h-4 text-gray-300" />}
                </div>
              );
            })}
          </div>

          {/* ── ETAPA 1: PERÍODO ── */}
          {etapa === 'periodo' && (
            <div className="space-y-4">
              <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
                <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#7D1F2C]" /> Selecione o período
                </h2>
                <div className="flex gap-2">
                  {[{l:'Ontem',v:'ontem'},{l:'7 dias',v:'7dias'},{l:'Este mês',v:'mes'}].map(a => (
                    <button key={a.v} onClick={() => atalho(a.v as any)}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200
                                 hover:bg-[#7D1F2C] hover:text-white hover:border-[#7D1F2C] transition-all">
                      {a.l}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">De</label>
                    <input type="date" value={dtinicio} max={hoje}
                      onChange={e => setDtinicio(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm
                                 focus:outline-none focus:ring-2 focus:ring-[#7D1F2C]/30" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Até</label>
                    <input type="date" value={dtfim} max={hoje}
                      onChange={e => setDtfim(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm
                                 focus:outline-none focus:ring-2 focus:ring-[#7D1F2C]/30" />
                  </div>
                </div>
                {erro && (
                  <div className="flex items-start gap-2 text-red-600 bg-red-50 rounded-lg p-3 text-sm">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {erro}
                  </div>
                )}
                <button onClick={buscarPreview} disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl
                             bg-[#7D1F2C] text-white font-semibold hover:bg-[#6a1a25]
                             disabled:opacity-60 transition-all">
                  {loading
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Buscando na ZIG...</>
                    : <><Search className="w-4 h-4" /> Buscar Faturamento</>}
                </button>
              </div>

              {/* histórico */}
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-700 text-sm">Histórico de importações</h3>
                  <button onClick={carregarHistorico} className="text-gray-400 hover:text-gray-600">
                    <RefreshCw className={`w-4 h-4 ${loadingHist ? 'animate-spin' : ''}`} />
                  </button>
                </div>
                {historico.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">
                    {loadingHist ? 'Carregando...' : 'Nenhuma importação — clique em ↺ para carregar'}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {historico.map(h => (
                      <div key={h.id}
                        className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                        <div>
                          <p className="text-sm font-medium text-gray-700">
                            {h.dtinicio === h.dtfim ? h.dtinicio : `${h.dtinicio} → ${h.dtfim}`}
                          </p>
                          <p className="text-xs text-gray-400">
                            {h.total_inseridos} inseridos · {h.total_duplicados} já existiam
                          </p>
                        </div>
                        <div className="text-right space-y-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${BADGE[h.status] || 'bg-gray-100 text-gray-500'}`}>
                            {BADGE_LABEL[h.status] || h.status}
                          </span>
                          <p className="text-xs font-semibold text-gray-700">{moeda(h.total_valor || 0)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── ETAPA 2: REVISÃO ── */}
          {etapa === 'revisao' && (
            <div className="space-y-4">
              <button onClick={() => { setEtapa('periodo'); setErro(''); }}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Voltar
              </button>

              {/* cards resumo por forma */}
              {Object.keys(resumoPorForma).length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {Object.entries(resumoPorForma).map(([forma, valor]) => (
                    <div key={forma} className="bg-white border border-gray-200 rounded-xl p-3">
                      <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium mb-2 ${corForma(forma)}`}>
                        <IconeForma label={forma} /> {forma}
                      </div>
                      <p className="text-lg font-bold text-gray-900">{moeda(valor)}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-gray-800">Revisar lançamentos</h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {dtinicio === dtfim ? dtinicio : `${dtinicio} → ${dtfim}`} ·{' '}
                      {itens.filter(i => i.selecionado).length} de {itens.length} selecionados
                    </p>
                  </div>
                  <button onClick={() => setItens(prev => prev.map(i => ({ ...i, selecionado: !todosSelected })))}
                    className="text-xs text-[#7D1F2C] font-medium hover:underline">
                    {todosSelected ? 'Desmarcar todos' : 'Selecionar todos'}
                  </button>
                </div>

                <div className="divide-y divide-gray-50">
                  {itens.map((item, idx) => (
                    <div key={`${item.paymentId}-${item.dataRef}-${idx}`}
                      onClick={() => setItens(prev => prev.map((it, i) =>
                        i === idx ? { ...it, selecionado: !it.selecionado } : it))}
                      className={`flex items-center gap-4 px-5 py-3.5 cursor-pointer transition-colors
                        ${item.selecionado ? 'bg-white hover:bg-gray-50' : 'bg-gray-50 opacity-50 hover:opacity-70'}`}>

                      <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 border-2 transition-all
                        ${item.selecionado ? 'bg-[#7D1F2C] border-[#7D1F2C]' : 'border-gray-300 bg-white'}`}>
                        {item.selecionado && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                      </div>

                      <div className="flex-1 min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${corForma(item.formaLabel)}`}>
                            <IconeForma label={item.formaLabel} /> {item.formaLabel}
                          </span>
                          <span className="text-xs text-gray-400">{item.dataRef}</span>
                        </div>
                        {/* conta destino */}
                        <p className="text-xs text-gray-400 flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {item.contaBancariaNome
                            ? <span className="text-gray-600 font-medium">{item.contaBancariaNome}</span>
                            : <span className="text-amber-500">Sem conta definida</span>}
                        </p>
                      </div>

                      <p className={`text-sm font-bold tabular-nums shrink-0
                        ${item.selecionado ? 'text-emerald-600' : 'text-gray-400'}`}>
                        {moeda(item.valor)}
                      </p>
                    </div>
                  ))}
                </div>

                {/* aviso se algum item sem conta */}
                {itens.some(i => i.selecionado && !i.contaBancariaId) && (
                  <div className="px-5 py-3 bg-amber-50 border-t border-amber-100 flex items-center gap-2 text-xs text-amber-700">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    Alguns itens estão sem conta destino. Configure em{' '}
                    <button onClick={() => setAba('configurar')} className="font-semibold underline">
                      Configurar
                    </button>
                  </div>
                )}

                <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500">Total selecionado</p>
                    <p className="text-xl font-bold text-gray-900">{moeda(totalSelecionado)}</p>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setItens(prev => prev.map(i => ({ ...i, selecionado: false })))}
                      className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100 transition-all">
                      Limpar
                    </button>
                    <button onClick={confirmarImportacao}
                      disabled={loading || !itens.some(i => i.selecionado)}
                      className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#7D1F2C] text-white
                                 font-semibold text-sm hover:bg-[#6a1a25] disabled:opacity-60 transition-all">
                      {loading
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Importando...</>
                        : <><CheckCircle className="w-4 h-4" /> Confirmar Importação</>}
                    </button>
                  </div>
                </div>
              </div>

              {erro && (
                <div className="flex items-start gap-2 text-red-600 bg-red-50 rounded-lg p-3 text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {erro}
                </div>
              )}
            </div>
          )}

          {/* ── ETAPA 3: RESULTADO ── */}
          {etapa === 'resultado' && resultado && (
            <div className="space-y-4">
              <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-emerald-100">
                    <CheckCircle className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <h2 className="font-bold text-gray-900">Importação concluída</h2>
                    <p className="text-xs text-gray-500">
                      {dtinicio === dtfim ? dtinicio : `${dtinicio} → ${dtfim}`}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-emerald-50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-emerald-600">{resultado.total_inseridos}</p>
                    <p className="text-xs text-emerald-700 mt-1">Lançamentos criados</p>
                  </div>
                  <div className="bg-amber-50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-amber-600">{resultado.total_duplicados}</p>
                    <p className="text-xs text-amber-700 mt-1">Já existiam</p>
                  </div>
                  <div className="bg-[#7D1F2C]/5 rounded-xl p-4 text-center">
                    <p className="text-lg font-bold text-[#7D1F2C]">{moeda(resultado.total_valor)}</p>
                    <p className="text-xs text-[#7D1F2C] mt-1">Total importado</p>
                  </div>
                </div>

                {resultado.erros?.length > 0 && (
                  <div className="bg-red-50 rounded-lg p-4 space-y-1">
                    <p className="text-sm font-medium text-red-700 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" /> Erros:
                    </p>
                    {resultado.erros.map((e: string, i: number) => (
                      <p key={i} className="text-xs text-red-600 ml-5">{e}</p>
                    ))}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button onClick={() => { setEtapa('periodo'); setResultado(null); setItens([]); setErro(''); }}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl
                               border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all">
                    <RefreshCw className="w-4 h-4" /> Nova importação
                  </button>
                  <a href="/financeiro/contas-receber"
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl
                               bg-[#7D1F2C] text-white text-sm font-semibold hover:bg-[#6a1a25] transition-all">
                    <TrendingUp className="w-4 h-4" /> Ver Contas a Receber
                  </a>
                </div>
              </div>

              {historico.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <h3 className="font-semibold text-gray-700 text-sm mb-3">Últimas importações</h3>
                  <div className="space-y-2">
                    {historico.slice(0, 5).map(h => (
                      <div key={h.id}
                        className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                        <div>
                          <p className="text-sm font-medium text-gray-700">
                            {h.dtinicio === h.dtfim ? h.dtinicio : `${h.dtinicio} → ${h.dtfim}`}
                          </p>
                          <p className="text-xs text-gray-400">
                            {h.total_inseridos} inseridos · {h.total_duplicados} já existiam
                          </p>
                        </div>
                        <div className="text-right space-y-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${BADGE[h.status] || 'bg-gray-100 text-gray-500'}`}>
                            {BADGE_LABEL[h.status] || h.status}
                          </span>
                          <p className="text-xs font-semibold text-gray-700">{moeda(h.total_valor || 0)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
