import { useState, useEffect } from 'react';
import {
  CreditCard, CheckCircle, XCircle, Clock, RefreshCw,
  AlertTriangle, Info, Play, Search, TrendingUp
} from 'lucide-react';

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

interface SyncLog {
  id: string;
  dtinicio: string;
  dtfim: string;
  status: string;
  iniciado_em: string;
  total_inseridos: number;
  total_duplicados: number;
  total_valor: number;
  erro_mensagem: string | null;
}

type Etapa = 'form' | 'processando' | 'resultado';

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export default function ZigRecebimentos() {
  const [etapa, setEtapa]       = useState<Etapa>('form');
  const [dtinicio, setDtinicio] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().split('T')[0];
  });
  const [dtfim, setDtfim]       = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().split('T')[0];
  });
  const [resultado, setResultado] = useState<any>(null);
  const [logs, setLogs]           = useState<SyncLog[]>([]);
  const [carregandoLogs, setCarregandoLogs] = useState(true);

  useEffect(() => { carregarLogs(); }, []);

  const carregarLogs = async () => {
    setCarregandoLogs(true);
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/zig_recebimentos_sync?select=*&order=iniciado_em.desc&limit=10`,
        { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` } }
      );
      const data = await res.json();
      if (Array.isArray(data)) setLogs(data);
    } finally { setCarregandoLogs(false); }
  };

  const atalhos = [
    { label: 'Ontem', fn: () => { const d = new Date(); d.setDate(d.getDate()-1); const s = d.toISOString().split('T')[0]; setDtinicio(s); setDtfim(s); }},
    { label: 'Últimos 7 dias', fn: () => { const i=new Date(); i.setDate(i.getDate()-7); const f=new Date(); f.setDate(f.getDate()-1); setDtinicio(i.toISOString().split('T')[0]); setDtfim(f.toISOString().split('T')[0]); }},
    { label: 'Mês atual', fn: () => { const n=new Date(); setDtinicio(`${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-01`); setDtfim(n.toISOString().split('T')[0]); }},
  ];

  const handleImportar = async () => {
    setEtapa('processando');
    try {
      const res  = await fetch(`${SUPABASE_URL}/functions/v1/zig-importar-recebimentos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dtinicio, dtfim }),
      });
      const json = await res.json();
      setResultado(json);
      await carregarLogs();
    } catch (e: any) {
      setResultado({ ok: false, error: e.message });
    } finally {
      setEtapa('resultado');
    }
  };

  // ── FORM ─────────────────────────────────────────────────────
  if (etapa === 'form') return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#7D1F2C] flex items-center justify-center">
          <CreditCard size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">ZIG → Contas a Receber</h1>
          <p className="text-sm text-gray-500">Importa faturamento de máquinas integradas por forma de pagamento</p>
        </div>
      </div>

      {/* Formulário */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
        <h2 className="font-semibold text-gray-800">Período de importação</h2>

        {/* Atalhos */}
        <div className="flex gap-2 flex-wrap">
          {atalhos.map(a => (
            <button key={a.label} onClick={a.fn}
              className="px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-200 text-xs font-medium text-gray-600 transition-colors">
              {a.label}
            </button>
          ))}
        </div>

        {/* Datas */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Data início</label>
            <input type="date" value={dtinicio} onChange={e => setDtinicio(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7D1F2C]/30" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Data fim</label>
            <input type="date" value={dtfim} onChange={e => setDtfim(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7D1F2C]/30" />
          </div>
        </div>

        {/* Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700 space-y-1">
          <p className="font-semibold flex items-center gap-1"><Info size={13} /> O que será importado</p>
          <p>• Faturamento real das máquinas integradas ZIG no período</p>
          <p>• Um registro por <strong>forma de pagamento + bandeira</strong> por dia</p>
          <p>• Lançado em <strong>Contas a Receber</strong> já com status "recebido"</p>
          <p>• Registrado no <strong>Fluxo de Caixa</strong> como entrada (origem: zig_maquina)</p>
          <p>• Deduplicação automática — pode reimportar sem duplicar</p>
        </div>

        <button onClick={handleImportar}
          className="w-full flex items-center justify-center gap-2 bg-[#7D1F2C] hover:bg-[#6a1a25] text-white font-semibold py-3 rounded-xl transition-colors">
          <Play size={18} />
          Importar recebimentos ZIG
        </button>
      </div>

      {/* Histórico */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-800">Histórico de importações</h2>
          <button onClick={carregarLogs} className="text-gray-400 hover:text-gray-600 transition-colors">
            <RefreshCw size={15} />
          </button>
        </div>

        {carregandoLogs ? (
          <p className="text-sm text-gray-400 text-center py-4">Carregando...</p>
        ) : logs.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4 italic">Nenhuma importação realizada ainda</p>
        ) : (
          <div className="space-y-2">
            {logs.map(log => (
              <div key={log.id} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-2.5">
                  {log.status === 'sucesso' ? <CheckCircle size={14} className="text-green-500 flex-shrink-0" /> :
                   log.status === 'erro'    ? <XCircle size={14} className="text-red-500 flex-shrink-0" />     :
                   log.status === 'parcial' ? <AlertTriangle size={14} className="text-amber-500 flex-shrink-0" /> :
                                             <Clock size={14} className="text-blue-500 flex-shrink-0" />}
                  <div>
                    <p className="text-sm text-gray-700">
                      {log.dtinicio === log.dtfim ? log.dtinicio : `${log.dtinicio} → ${log.dtfim}`}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(log.iniciado_em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                      {log.erro_mensagem && <span className="text-red-400 ml-1">· {log.erro_mensagem.slice(0, 60)}</span>}
                    </p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                  <p className="text-sm font-bold text-green-600">{fmt(log.total_valor ?? 0)}</p>
                  <p className="text-xs text-gray-400">
                    {log.total_inseridos ?? 0} lançados
                    {(log.total_duplicados ?? 0) > 0 && ` · ${log.total_duplicados} já existiam`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // ── PROCESSANDO ───────────────────────────────────────────────
  if (etapa === 'processando') return (
    <div className="p-6 max-w-2xl mx-auto flex flex-col items-center justify-center gap-6 min-h-64">
      <div className="w-16 h-16 rounded-2xl bg-[#7D1F2C]/10 flex items-center justify-center">
        <RefreshCw size={32} className="text-[#7D1F2C] animate-spin" />
      </div>
      <div className="text-center">
        <p className="font-semibold text-gray-800 text-lg">Importando recebimentos ZIG...</p>
        <p className="text-sm text-gray-500 mt-1">{dtinicio} → {dtfim}</p>
        <p className="text-xs text-gray-400 mt-2">Consultando máquinas integradas e criando lançamentos</p>
      </div>
    </div>
  );

  // ── RESULTADO ─────────────────────────────────────────────────
  const ok = resultado?.ok;
  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Status */}
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${ok ? 'bg-green-100' : 'bg-red-100'}`}>
          {ok ? <CheckCircle size={20} className="text-green-600" /> : <XCircle size={20} className="text-red-500" />}
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {ok ? 'Importação concluída!' : 'Erro na importação'}
          </h1>
          <p className="text-sm text-gray-500">{dtinicio} → {dtfim}</p>
        </div>
      </div>

      {ok && (
        <>
          {/* Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{resultado.total_inseridos ?? 0}</p>
              <p className="text-xs text-gray-500 mt-1">Lançamentos criados</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
              <p className="text-2xl font-bold text-blue-500">{resultado.total_duplicados ?? 0}</p>
              <p className="text-xs text-gray-500 mt-1">Já existiam</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
              <TrendingUp size={20} className="text-[#7D1F2C] mx-auto mb-1" />
              <p className="text-lg font-bold text-[#7D1F2C]">{fmt(resultado.total_valor ?? 0)}</p>
              <p className="text-xs text-gray-500 mt-0.5">Total importado</p>
            </div>
          </div>

          {resultado.total_inseridos === 0 && resultado.total_duplicados === 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700 flex items-start gap-2">
              <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
              <span>Nenhum faturamento encontrado na ZIG para o período selecionado. Verifique se houve vendas por máquinas integradas nessa data.</span>
            </div>
          )}

          {resultado.mensagem && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
              {resultado.mensagem}
            </div>
          )}
        </>
      )}

      {!ok && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-600">
          <p className="font-semibold mb-1">Erro:</p>
          <p className="font-mono text-xs">{resultado?.error}</p>
        </div>
      )}

      {resultado?.erros?.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <p className="text-sm font-semibold text-amber-700 mb-2">Erros parciais:</p>
          {resultado.erros.map((e: string, i: number) => (
            <p key={i} className="text-xs text-amber-600 font-mono">{e}</p>
          ))}
        </div>
      )}

      {/* Ações */}
      <div className="flex gap-3">
        <button
          onClick={() => { setEtapa('form'); setResultado(null); }}
          className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
          <Search size={16} />
          Nova importação
        </button>
        <button
          onClick={() => window.location.href = '/financeiro/contas-receber'}
          className="flex-1 py-3 rounded-xl bg-[#7D1F2C] text-white text-sm font-medium hover:bg-[#6a1a25] transition-colors flex items-center justify-center gap-2">
          <CreditCard size={16} />
          Ver Contas a Receber
        </button>
      </div>
    </div>
  );
}
