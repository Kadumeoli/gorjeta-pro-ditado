import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  RefreshCw, CheckCircle, XCircle, Clock,
  Package, AlertTriangle, Calendar, ChevronDown, ChevronUp
} from 'lucide-react';

interface SyncLog {
  id: string;
  iniciado_em: string;
  finalizado_em: string | null;
  status: 'rodando' | 'sucesso' | 'erro';
  dtinicio: string;
  dtfim: string;
  total_produtos_zig: number;
  total_mapeados: number;
  total_nao_mapeados: number;
  total_movimentacoes: number;
  total_duplicados: number;
  erro_mensagem: string | null;
  nao_mapeados_lista: string[] | null;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

export default function ZigVendasSync() {
  const [dtinicio, setDtinicio] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  });
  const [dtfim, setDtfim] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  });
  const [sincronizando, setSincronizando] = useState(false);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [carregandoLogs, setCarregandoLogs] = useState(true);
  const [ultimoResultado, setUltimoResultado] = useState<any>(null);
  const [expandido, setExpandido] = useState<string | null>(null);

  const carregarLogs = async () => {
    setCarregandoLogs(true);
    const { data } = await supabase
      .from('zig_vendas_sync_logs')
      .select('*')
      .order('iniciado_em', { ascending: false })
      .limit(15);
    if (data) setLogs(data);
    setCarregandoLogs(false);
  };

  useEffect(() => { carregarLogs(); }, []);

  const handleSync = async () => {
    setSincronizando(true);
    setUltimoResultado(null);
    try {
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/sync-zig-vendas-estoque`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dtinicio, dtfim }),
        }
      );
      const json = await res.json();
      setUltimoResultado(json);
      await carregarLogs();
    } catch (err: any) {
      setUltimoResultado({ ok: false, error: err.message });
    } finally {
      setSincronizando(false);
    }
  };

  const fmtDataHora = (s: string) =>
    new Date(s).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

  const StatusBadge = ({ status }: { status: string }) => {
    if (status === 'sucesso') return (
      <span className="flex items-center gap-1 text-green-600 text-xs font-medium">
        <CheckCircle size={13} /> Sucesso
      </span>
    );
    if (status === 'erro') return (
      <span className="flex items-center gap-1 text-red-500 text-xs font-medium">
        <XCircle size={13} /> Erro
      </span>
    );
    return (
      <span className="flex items-center gap-1 text-yellow-500 text-xs font-medium">
        <Clock size={13} /> Rodando
      </span>
    );
  };

  const atalhos = [
    {
      label: 'Ontem', fn: () => {
        const d = new Date(); d.setDate(d.getDate() - 1);
        const s = d.toISOString().split('T')[0];
        setDtinicio(s); setDtfim(s);
      }
    },
    {
      label: 'Últimos 7 dias', fn: () => {
        const fim = new Date(); fim.setDate(fim.getDate() - 1);
        const ini = new Date(); ini.setDate(ini.getDate() - 7);
        setDtinicio(ini.toISOString().split('T')[0]);
        setDtfim(fim.toISOString().split('T')[0]);
      }
    },
    {
      label: 'Mês atual', fn: () => {
        const now = new Date();
        setDtinicio(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`);
        setDtfim(now.toISOString().split('T')[0]);
      }
    },
  ];

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#7D1F2C] flex items-center justify-center">
          <Package size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">ZIG → Estoque</h1>
          <p className="text-sm text-gray-500">Baixa de estoque automática via saída de produtos ZIG</p>
        </div>
      </div>

      {/* Painel de sincronização */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
        <h2 className="font-semibold text-gray-800">Nova Sincronização</h2>

        {/* Atalhos */}
        <div className="flex gap-2 flex-wrap">
          {atalhos.map(a => (
            <button
              key={a.label}
              onClick={a.fn}
              className="px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-200 text-xs font-medium text-gray-600 transition-colors"
            >
              {a.label}
            </button>
          ))}
        </div>

        {/* Datas */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Data início</label>
            <input
              type="date"
              value={dtinicio}
              onChange={e => setDtinicio(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7D1F2C]/30"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Data fim</label>
            <input
              type="date"
              value={dtfim}
              onChange={e => setDtfim(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7D1F2C]/30"
            />
          </div>
        </div>

        {/* Info */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700 space-y-1">
          <p className="font-semibold flex items-center gap-1"><AlertTriangle size={13} /> Como funciona</p>
          <p>1. Busca vendas no ZIG pelo período selecionado</p>
          <p>2. Para cada produto, localiza o mapeamento ZIG → item de estoque</p>
          <p>3. Gera baixa de estoque (saída) com o custo médio do item</p>
          <p>4. Produtos sem mapeamento são listados para revisão manual</p>
        </div>

        {/* Botão */}
        <button
          onClick={handleSync}
          disabled={sincronizando}
          className="w-full flex items-center justify-center gap-2 bg-[#7D1F2C] hover:bg-[#6a1a25] disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
        >
          <RefreshCw size={18} className={sincronizando ? 'animate-spin' : ''} />
          {sincronizando ? 'Sincronizando...' : 'Sincronizar agora'}
        </button>

        {/* Resultado */}
        {ultimoResultado && (
          <div className={`rounded-xl p-4 text-sm space-y-2 ${
            ultimoResultado.ok
              ? 'bg-green-50 border border-green-200'
              : 'bg-red-50 border border-red-200'
          }`}>
            {ultimoResultado.ok ? (
              <>
                <p className="font-semibold text-green-700 flex items-center gap-1">
                  <CheckCircle size={15} /> Sincronização concluída
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Produtos ZIG',  v: ultimoResultado.resumo?.total_produtos_zig,   color: 'text-gray-700'   },
                    { label: 'Mapeados',       v: ultimoResultado.resumo?.total_mapeados,       color: 'text-green-600'  },
                    { label: 'Baixas criadas', v: ultimoResultado.resumo?.total_movimentacoes,  color: 'text-blue-600'   },
                    { label: 'S/ mapeamento',  v: ultimoResultado.resumo?.total_nao_mapeados,   color: 'text-amber-600'  },
                  ].map(item => (
                    <div key={item.label} className="bg-white rounded-lg p-2 text-center border border-gray-100">
                      <p className={`text-lg font-bold ${item.color}`}>{item.v ?? 0}</p>
                      <p className="text-xs text-gray-500">{item.label}</p>
                    </div>
                  ))}
                </div>
                {ultimoResultado.resumo?.nao_mapeados?.length > 0 && (
                  <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                    <p className="text-xs font-semibold text-amber-700 mb-2 flex items-center gap-1">
                      <AlertTriangle size={12} />
                      Produtos sem mapeamento ({ultimoResultado.resumo.nao_mapeados.length})
                    </p>
                    <div className="space-y-0.5 max-h-32 overflow-y-auto">
                      {ultimoResultado.resumo.nao_mapeados.map((n: string) => (
                        <p key={n} className="text-xs text-amber-600 font-mono">{n}</p>
                      ))}
                    </div>
                    <p className="text-xs text-amber-600 mt-2">
                      Adicione em <strong>Estoque → Itens → Mapeamento de Vendas</strong>
                    </p>
                  </div>
                )}
              </>
            ) : (
              <p className="text-red-600 font-medium">Erro: {ultimoResultado.error}</p>
            )}
          </div>
        )}
      </div>

      {/* Histórico */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-800">Histórico de Sincronizações</h2>
          <button
            onClick={carregarLogs}
            className="text-xs text-[#7D1F2C] hover:underline flex items-center gap-1"
          >
            <RefreshCw size={12} /> Atualizar
          </button>
        </div>

        {carregandoLogs ? (
          <div className="text-center py-8 text-gray-400 text-sm">Carregando...</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            Nenhuma sincronização realizada ainda.
          </div>
        ) : (
          <div className="space-y-2">
            {logs.map(log => (
              <div key={log.id} className="rounded-xl border border-gray-100 overflow-hidden">
                <div
                  className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => setExpandido(expandido === log.id ? null : log.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <StatusBadge status={log.status} />
                      <span className="text-xs text-gray-400">{fmtDataHora(log.iniciado_em)}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Calendar size={11} />
                      {log.dtinicio} → {log.dtfim}
                    </div>
                  </div>

                  {log.status === 'sucesso' && (
                    <div className="flex gap-4 text-center flex-shrink-0">
                      <div>
                        <p className="text-xs text-gray-400">ZIG</p>
                        <p className="text-sm font-bold text-gray-700">{log.total_produtos_zig}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Baixas</p>
                        <p className="text-sm font-bold text-green-600">{log.total_movimentacoes}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">S/ map.</p>
                        <p className={`text-sm font-bold ${log.total_nao_mapeados > 0 ? 'text-amber-500' : 'text-gray-400'}`}>
                          {log.total_nao_mapeados}
                        </p>
                      </div>
                    </div>
                  )}

                  {log.status === 'erro' && (
                    <p className="text-xs text-red-500 truncate max-w-xs">{log.erro_mensagem}</p>
                  )}

                  <div className="text-gray-400 flex-shrink-0">
                    {expandido === log.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>

                {expandido === log.id && log.nao_mapeados_lista && log.nao_mapeados_lista.length > 0 && (
                  <div className="p-4 bg-amber-50 border-t border-amber-100">
                    <p className="text-xs font-semibold text-amber-700 mb-2 flex items-center gap-1">
                      <AlertTriangle size={12} />
                      Produtos sem mapeamento ({log.nao_mapeados_lista.length})
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                      {log.nao_mapeados_lista.map(nome => (
                        <p key={nome} className="text-xs text-amber-600 font-mono bg-white px-2 py-1 rounded border border-amber-100">
                          {nome}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
