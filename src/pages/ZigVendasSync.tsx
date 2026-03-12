import { useState, useEffect } from 'react';
import {
  Search, RefreshCw, CheckCircle, XCircle, Clock,
  Package, AlertTriangle, Calendar, ChevronDown, ChevronUp,
  Play, Warehouse, Link2, Plus, Check, X, Info
} from 'lucide-react';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

interface Estoque { id: string; nome: string; }
interface ItemEstoque { id: string; nome: string; unidade_medida: string; custo_medio: number; }

interface ProdutoZig {
  productId: string;
  productName: string;
  productSku: string | null;
  productCategory: string | null;
  count: number;
  eventDate: string;
  mapeado: boolean;
  mapeamento: {
    item_estoque_id: string | null;
    ficha_tecnica_id: string | null;
    estoque_id: string | null;
    tipo_mapeamento: string | null;
  } | null;
}

interface ProdutoEditavel extends ProdutoZig {
  estoqueId: string;
  itemEstoqueId: string;
  fichaId: string;
  tipo: 'direto' | 'ficha';
  novoMapeamento: boolean;
}

interface SyncLog {
  id: string;
  iniciado_em: string;
  status: string;
  dtinicio: string;
  dtfim: string;
  total_movimentacoes: number;
  total_duplicados: number;
  erro_mensagem: string | null;
}

type Etapa = 'busca' | 'revisao' | 'resultado';

export default function ZigVendasSync() {
  const [etapa, setEtapa] = useState<Etapa>('busca');
  const [dtinicio, setDtinicio] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  });
  const [dtfim, setDtfim] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  });

  const [buscando, setBuscando] = useState(false);
  const [processando, setProcessando] = useState(false);
  const [produtos, setProdutos] = useState<ProdutoEditavel[]>([]);
  const [estoques, setEstoques] = useState<Estoque[]>([]);
  const [itensEstoque, setItensEstoque] = useState<ItemEstoque[]>([]);
  const [resultado, setResultado] = useState<any>(null);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [expandLog, setExpandLog] = useState<string | null>(null);
  const [buscaItem, setBuscaItem] = useState<Record<string, string>>({});
  const [erroBusca, setErroBusca] = useState('');

  useEffect(() => { carregarLogs(); }, []);

  const carregarLogs = async () => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/zig_vendas_sync_logs?select=*&order=iniciado_em.desc&limit=10`, {
      headers: {
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY as string,
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      }
    });
    const data = await res.json();
    if (Array.isArray(data)) setLogs(data);
  };

  const atalhos = [
    { label: 'Ontem', fn: () => { const d = new Date(); d.setDate(d.getDate()-1); const s=d.toISOString().split('T')[0]; setDtinicio(s); setDtfim(s); }},
    { label: 'Últimos 7 dias', fn: () => { const ini=new Date(); ini.setDate(ini.getDate()-7); const fim=new Date(); fim.setDate(fim.getDate()-1); setDtinicio(ini.toISOString().split('T')[0]); setDtfim(fim.toISOString().split('T')[0]); }},
    { label: 'Mês atual', fn: () => { const n=new Date(); setDtinicio(`${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-01`); setDtfim(n.toISOString().split('T')[0]); }},
  ];

  const handleBuscar = async () => {
    setBuscando(true);
    setErroBusca('');
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/zig-buscar-vendas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dtinicio, dtfim }),
      });
      const json = await res.json();
      if (!json.ok) { setErroBusca(json.error || 'Erro ao buscar'); return; }

      setEstoques(json.estoques || []);
      setItensEstoque(json.itensEstoque || []);

      const editaveis: ProdutoEditavel[] = (json.produtos || []).map((p: ProdutoZig) => ({
        ...p,
        estoqueId:      p.mapeamento?.estoque_id || '',
        itemEstoqueId:  p.mapeamento?.item_estoque_id || '',
        fichaId:        p.mapeamento?.ficha_tecnica_id || '',
        tipo:           p.mapeamento?.ficha_tecnica_id ? 'ficha' : 'direto',
        novoMapeamento: !p.mapeado,
      }));

      setProdutos(editaveis);
      setEtapa('revisao');
    } catch (e: any) {
      setErroBusca(e.message);
    } finally {
      setBuscando(false);
    }
  };

  const updateProduto = (productId: string, changes: Partial<ProdutoEditavel>) => {
    setProdutos(prev => prev.map(p => p.productId === productId ? { ...p, ...changes } : p));
  };

  const todosMapeados = produtos.every(p =>
    p.estoqueId && (p.itemEstoqueId || p.fichaId)
  );

  const naoMapeados = produtos.filter(p => !p.estoqueId || (!p.itemEstoqueId && !p.fichaId));

  const handleProcessar = async () => {
    if (!todosMapeados) return;
    setProcessando(true);
    try {
      const payload = produtos.map(p => ({
        productId:       p.productId,
        productName:     p.productName,
        productCategory: p.productCategory,
        count:           p.count,
        eventDate:       p.eventDate,
        estoqueId:       p.estoqueId,
        itemEstoqueId:   p.tipo === 'direto' ? p.itemEstoqueId : null,
        fichaTecnicaId:  p.tipo === 'ficha'  ? p.fichaId : null,
      }));

      const res = await fetch(`${SUPABASE_URL}/functions/v1/zig-processar-baixas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dtinicio, dtfim, produtos: payload }),
      });
      const json = await res.json();
      setResultado(json);
      setEtapa('resultado');
      await carregarLogs();
    } catch (e: any) {
      setResultado({ ok: false, error: e.message });
      setEtapa('resultado');
    } finally {
      setProcessando(false);
    }
  };

  const itensFiltrados = (prodId: string) => {
    const q = (buscaItem[prodId] || '').toLowerCase();
    return q ? itensEstoque.filter(i => i.nome.toLowerCase().includes(q)) : itensEstoque;
  };

  const nomeEstoque = (id: string) => estoques.find(e => e.id === id)?.nome || '—';
  const nomeItem    = (id: string) => itensEstoque.find(i => i.id === id)?.nome || '—';

  // ── ETAPA: BUSCA ────────────────────────────────────────────
  if (etapa === 'busca') return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#7D1F2C] flex items-center justify-center">
          <Package size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">ZIG → Estoque</h1>
          <p className="text-sm text-gray-500">Baixa manual de estoque via vendas ZIG</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
        <h2 className="font-semibold text-gray-800">Buscar vendas</h2>

        <div className="flex gap-2 flex-wrap">
          {atalhos.map(a => (
            <button key={a.label} onClick={a.fn}
              className="px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-200 text-xs font-medium text-gray-600 transition-colors">
              {a.label}
            </button>
          ))}
        </div>

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

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700 space-y-1">
          <p className="font-semibold flex items-center gap-1"><Info size={13} /> Como funciona</p>
          <p>1. Busca os produtos vendidos no período via ZIG</p>
          <p>2. Você revisa, escolhe o estoque de saída e vincula ao item</p>
          <p>3. Após revisar todos, clica em Processar para gerar as baixas</p>
          <p>4. O mapeamento fica salvo para sincronizações futuras</p>
        </div>

        {erroBusca && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">
            {erroBusca}
          </div>
        )}

        <button onClick={handleBuscar} disabled={buscando}
          className="w-full flex items-center justify-center gap-2 bg-[#7D1F2C] hover:bg-[#6a1a25] disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors">
          <Search size={18} className={buscando ? 'animate-pulse' : ''} />
          {buscando ? 'Buscando vendas na ZIG...' : 'Buscar vendas'}
        </button>
      </div>

      {/* Histórico */}
      {logs.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-semibold text-gray-800 mb-4">Últimas sincronizações</h2>
          <div className="space-y-2">
            {logs.map(log => (
              <div key={log.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <div className="flex items-center gap-2">
                    {log.status === 'sucesso' ? <CheckCircle size={13} className="text-green-500" /> :
                     log.status === 'erro'    ? <XCircle size={13} className="text-red-500" /> :
                                               <Clock size={13} className="text-yellow-500" />}
                    <span className="text-xs text-gray-500">{new Date(log.iniciado_em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{log.dtinicio} → {log.dtfim}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-green-600">{log.total_movimentacoes} baixas</p>
                  {log.total_duplicados > 0 && <p className="text-xs text-gray-400">{log.total_duplicados} já proc.</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // ── ETAPA: REVISÃO ───────────────────────────────────────────
  if (etapa === 'revisao') return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => setEtapa('busca')} className="text-gray-400 hover:text-gray-600 text-sm">← Voltar</button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Revisar vendas</h1>
            <p className="text-sm text-gray-500">{dtinicio} → {dtfim} · {produtos.length} produtos</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Contador status */}
          <div className="flex gap-2 text-xs">
            <span className="px-2 py-1 bg-green-50 text-green-700 rounded-lg border border-green-200 font-medium">
              ✓ {produtos.filter(p => p.estoqueId && (p.itemEstoqueId || p.fichaId)).length} prontos
            </span>
            {naoMapeados.length > 0 && (
              <span className="px-2 py-1 bg-amber-50 text-amber-700 rounded-lg border border-amber-200 font-medium">
                ⚠ {naoMapeados.length} pendentes
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Aviso se não todos mapeados */}
      {!todosMapeados && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 text-sm text-amber-800 flex items-start gap-2">
          <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
          <span>Todos os produtos precisam ter estoque e item vinculado antes de processar. Faltam <strong>{naoMapeados.length}</strong>.</span>
        </div>
      )}

      {/* Lista de produtos */}
      <div className="space-y-3">
        {produtos.map(prod => {
          const pronto = !!(prod.estoqueId && (prod.itemEstoqueId || prod.fichaId));
          return (
            <div key={prod.productId}
              className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${
                pronto ? 'border-green-200' : 'border-amber-300'
              }`}>
              {/* Cabeçalho do produto */}
              <div className={`flex items-center justify-between px-4 py-3 ${pronto ? 'bg-green-50' : 'bg-amber-50'}`}>
                <div className="flex items-center gap-3 min-w-0">
                  {pronto
                    ? <Check size={16} className="text-green-600 flex-shrink-0" />
                    : <AlertTriangle size={16} className="text-amber-500 flex-shrink-0" />
                  }
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{prod.productName}</p>
                    <p className="text-xs text-gray-500">
                      {prod.productCategory && <span className="mr-2 italic">{prod.productCategory}</span>}
                      {prod.productSku && <span className="font-mono">SKU: {prod.productSku}</span>}
                    </p>
                  </div>
                </div>
                <div className="flex-shrink-0 text-right ml-4">
                  <p className="text-lg font-bold text-gray-800">{prod.count}</p>
                  <p className="text-xs text-gray-400">unid.</p>
                </div>
              </div>

              {/* Campos de mapeamento */}
              <div className="px-4 py-4 space-y-3">
                {/* Estoque de saída */}
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 flex items-center gap-1 uppercase tracking-wide">
                    <Warehouse size={11} /> Estoque de saída
                    {prod.mapeado && !prod.novoMapeamento && (
                      <span className="ml-1 text-blue-500 normal-case font-normal">(mapeado anteriormente)</span>
                    )}
                  </label>
                  <select
                    value={prod.estoqueId}
                    onChange={e => updateProduto(prod.productId, { estoqueId: e.target.value })}
                    className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7D1F2C]/30 ${
                      prod.estoqueId ? 'border-gray-200 bg-white' : 'border-amber-300 bg-amber-50'
                    }`}
                  >
                    <option value="">— Selecione o estoque —</option>
                    {estoques.map(e => (
                      <option key={e.id} value={e.id}>{e.nome}</option>
                    ))}
                  </select>
                </div>

                {/* Item de estoque */}
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 flex items-center gap-1 uppercase tracking-wide">
                    <Link2 size={11} /> Item de estoque vinculado
                  </label>

                  {prod.itemEstoqueId ? (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700">
                        {nomeItem(prod.itemEstoqueId)}
                      </div>
                      <button
                        onClick={() => updateProduto(prod.productId, { itemEstoqueId: '', fichaId: '' })}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                        title="Remover vínculo">
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Buscar item de estoque..."
                          value={buscaItem[prod.productId] || ''}
                          onChange={e => setBuscaItem(prev => ({ ...prev, [prod.productId]: e.target.value }))}
                          className="w-full border border-amber-300 bg-amber-50 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7D1F2C]/30 focus:bg-white focus:border-gray-200"
                        />
                      </div>
                      {buscaItem[prod.productId] && (
                        <div className="border border-gray-200 rounded-xl bg-white shadow-lg max-h-40 overflow-y-auto">
                          {itensFiltrados(prod.productId).slice(0, 15).map(item => (
                            <button
                              key={item.id}
                              onClick={() => {
                                updateProduto(prod.productId, { itemEstoqueId: item.id, fichaId: '', tipo: 'direto' });
                                setBuscaItem(prev => ({ ...prev, [prod.productId]: '' }));
                              }}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-50 last:border-0 transition-colors"
                            >
                              <span className="font-medium text-gray-800">{item.nome}</span>
                              <span className="ml-2 text-xs text-gray-400">{item.unidade_medida}</span>
                              {item.custo_medio > 0 && (
                                <span className="ml-2 text-xs text-gray-400">
                                  R$ {Number(item.custo_medio).toFixed(2)}
                                </span>
                              )}
                            </button>
                          ))}
                          {itensFiltrados(prod.productId).length === 0 && (
                            <p className="px-3 py-2 text-sm text-gray-400 italic">Nenhum item encontrado</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Botão processar */}
      <div className="sticky bottom-4 pt-2">
        <button
          onClick={handleProcessar}
          disabled={!todosMapeados || processando}
          className={`w-full flex items-center justify-center gap-2 font-bold py-4 rounded-2xl transition-all shadow-lg text-white ${
            todosMapeados
              ? 'bg-[#7D1F2C] hover:bg-[#6a1a25] shadow-[#7D1F2C]/30'
              : 'bg-gray-300 cursor-not-allowed shadow-gray-200'
          }`}
        >
          <Play size={18} className={processando ? 'animate-pulse' : ''} />
          {processando
            ? 'Processando baixas...'
            : todosMapeados
              ? `Processar ${produtos.length} produtos`
              : `Aguardando ${naoMapeados.length} mapeamento(s)`
          }
        </button>
      </div>
    </div>
  );

  // ── ETAPA: RESULTADO ────────────────────────────────────────
  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${resultado?.ok ? 'bg-green-100' : 'bg-red-100'}`}>
          {resultado?.ok
            ? <CheckCircle size={20} className="text-green-600" />
            : <XCircle size={20} className="text-red-500" />
          }
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {resultado?.ok ? 'Baixas processadas!' : 'Erro ao processar'}
          </h1>
          <p className="text-sm text-gray-500">{dtinicio} → {dtfim}</p>
        </div>
      </div>

      {resultado?.ok && resultado.resumo && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Processados',  v: resultado.resumo.total_processados,   color: 'text-gray-700'  },
            { label: 'Baixas',       v: resultado.resumo.total_movimentacoes,  color: 'text-green-600' },
            { label: 'Já proc.',     v: resultado.resumo.total_duplicados,     color: 'text-blue-500'  },
            { label: 'Erros',        v: resultado.resumo.total_erros,          color: 'text-red-500'   },
          ].map(item => (
            <div key={item.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
              <p className={`text-2xl font-bold ${item.color}`}>{item.v ?? 0}</p>
              <p className="text-xs text-gray-500 mt-1">{item.label}</p>
            </div>
          ))}
        </div>
      )}

      {resultado?.resumo?.erros?.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <p className="text-sm font-semibold text-red-700 mb-2">Erros encontrados:</p>
          {resultado.resumo.erros.map((e: string) => (
            <p key={e} className="text-xs text-red-600 font-mono">{e}</p>
          ))}
        </div>
      )}

      {!resultado?.ok && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-600">
          {resultado?.error}
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={() => { setEtapa('busca'); setResultado(null); setProdutos([]); }}
          className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
          Nova sincronização
        </button>
        <button onClick={() => setEtapa('revisao')}
          className="flex-1 py-3 rounded-xl bg-[#7D1F2C] text-white text-sm font-medium hover:bg-[#6a1a25] transition-colors">
          Ver revisão
        </button>
      </div>
    </div>
  );
}
