import { useState, useEffect } from 'react';
import {
  Search, RefreshCw, CheckCircle, XCircle, Clock,
  Package, AlertTriangle, Info, Play, Warehouse, Link2, X, Check,
  EyeOff, Eye
} from 'lucide-react';

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

interface Estoque     { id: string; nome: string; }
interface ItemEstoque { id: string; nome: string; unidade_medida: string; custo_medio: number; categoria: string; }
interface Ficha       { id: string; nome: string; custo_total: number; categoria: string; porcoes: number; }

interface ProdutoZig {
  productId: string; productName: string; productSku: string | null;
  productCategory: string | null; count: number; eventDate: string;
  mapeado: boolean;
  ignorar_estoque: boolean;
  mapeamento: {
    item_estoque_id: string|null; ficha_tecnica_id: string|null;
    estoque_id: string|null; tipo_mapeamento: string|null;
    ignorar_estoque: boolean;
  } | null;
}

interface ProdutoEditavel extends ProdutoZig {
  estoqueId:     string;
  vinculoTipo:   'item' | 'ficha' | '';
  itemEstoqueId: string;
  fichaId:       string;
  ignorado:      boolean; // controle local do toggle
  salvandoIgnore: boolean;
}

interface SyncLog {
  id: string; iniciado_em: string; status: string;
  dtinicio: string; dtfim: string;
  total_movimentacoes: number; total_duplicados: number; erro_mensagem: string | null;
}

type Etapa = 'busca' | 'revisao' | 'resultado';

export default function ZigVendasSync() {
  const [etapa, setEtapa]       = useState<Etapa>('busca');
  const [dtinicio, setDtinicio] = useState(() => { const d=new Date(); d.setDate(d.getDate()-1); return d.toISOString().split('T')[0]; });
  const [dtfim, setDtfim]       = useState(() => { const d=new Date(); d.setDate(d.getDate()-1); return d.toISOString().split('T')[0]; });
  const [buscando, setBuscando]     = useState(false);
  const [processando, setProcessando] = useState(false);
  const [erroBusca, setErroBusca]   = useState('');
  const [produtos, setProdutos]     = useState<ProdutoEditavel[]>([]);
  const [estoques, setEstoques]     = useState<Estoque[]>([]);
  const [itens, setItens]           = useState<ItemEstoque[]>([]);
  const [fichas, setFichas]         = useState<Ficha[]>([]);
  const [resultado, setResultado]   = useState<any>(null);
  const [logs, setLogs]             = useState<SyncLog[]>([]);
  const [buscaVinculo, setBuscaVinculo] = useState<Record<string, string>>({});

  useEffect(() => { carregarLogs(); }, []);

  const carregarLogs = async () => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/zig_vendas_sync_logs?select=*&order=iniciado_em.desc&limit=10`, {
      headers: { 'apikey': SUPABASE_ANON, 'Authorization': `Bearer ${SUPABASE_ANON}` }
    });
    const data = await res.json();
    if (Array.isArray(data)) setLogs(data);
  };

  const atalhos = [
    { label: 'Ontem',         fn: () => { const d=new Date(); d.setDate(d.getDate()-1); const s=d.toISOString().split('T')[0]; setDtinicio(s); setDtfim(s); }},
    { label: 'Últimos 7 dias',fn: () => { const i=new Date(); i.setDate(i.getDate()-7); const f=new Date(); f.setDate(f.getDate()-1); setDtinicio(i.toISOString().split('T')[0]); setDtfim(f.toISOString().split('T')[0]); }},
    { label: 'Mês atual',     fn: () => { const n=new Date(); setDtinicio(`${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-01`); setDtfim(n.toISOString().split('T')[0]); }},
  ];

  const handleBuscar = async () => {
    setBuscando(true); setErroBusca('');
    try {
      const res  = await fetch(`${SUPABASE_URL}/functions/v1/zig-buscar-vendas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dtinicio, dtfim }),
      });
      const json = await res.json();
      if (!json.ok) { setErroBusca(json.error || 'Erro ao buscar'); return; }

      setEstoques(json.estoques || []);
      setItens(json.itensEstoque || []);
      setFichas(json.fichas || []);

      const editaveis: ProdutoEditavel[] = (json.produtos || []).map((p: ProdutoZig) => ({
        ...p,
        estoqueId:     p.mapeamento?.estoque_id        || '',
        itemEstoqueId: p.mapeamento?.item_estoque_id    || '',
        fichaId:       p.mapeamento?.ficha_tecnica_id   || '',
        vinculoTipo:   p.mapeamento?.ficha_tecnica_id ? 'ficha' : p.mapeamento?.item_estoque_id ? 'item' : '',
        ignorado:      p.mapeamento?.ignorar_estoque ?? p.ignorar_estoque ?? false,
        salvandoIgnore: false,
      }));
      setProdutos(editaveis);
      setEtapa('revisao');
    } catch(e: any) { setErroBusca(e.message); }
    finally { setBuscando(false); }
  };

  const update = (id: string, changes: Partial<ProdutoEditavel>) =>
    setProdutos(prev => prev.map(p => p.productId === id ? { ...p, ...changes } : p));

  // Toggle ignorar estoque — persiste imediatamente na tabela de mapeamento
  const toggleIgnorar = async (prod: ProdutoEditavel) => {
    const novoValor = !prod.ignorado;
    update(prod.productId, { ignorado: novoValor, salvandoIgnore: true });

    try {
      // Upsert no mapeamento usando nome_externo como chave
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/mapeamento_itens_vendas?nome_externo=eq.${encodeURIComponent(prod.productName)}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_ANON,
            'Authorization': `Bearer ${SUPABASE_ANON}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({ ignorar_estoque: novoValor }),
        }
      );

      // Se não existe mapeamento ainda, insere
      if (res.status === 404 || res.status === 200 && (await res.text()) === '') {
        await fetch(`${SUPABASE_URL}/rest/v1/mapeamento_itens_vendas`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_ANON,
            'Authorization': `Bearer ${SUPABASE_ANON}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({
            nome_externo:    prod.productName,
            nome_normalizado: prod.productName.toLowerCase().trim(),
            ignorar_estoque: novoValor,
            origem:          'zig',
            confianca:       1,
          }),
        });
      }
    } catch (e) {
      // Reverte em caso de erro
      update(prod.productId, { ignorado: !novoValor });
    } finally {
      update(prod.productId, { salvandoIgnore: false });
    }
  };

  // Produto "pronto" = ignorado OU tem estoque + vínculo
  const pronto = (p: ProdutoEditavel) =>
    p.ignorado || !!(p.estoqueId && (p.itemEstoqueId || p.fichaId));

  const ativos       = produtos.filter(p => !p.ignorado);
  const ignorados    = produtos.filter(p =>  p.ignorado);
  const todosProntos = produtos.every(pronto);
  const qtdPendentes = ativos.filter(p => !pronto(p)).length;

  const filtrarVinculo = (prodId: string, tipo: 'item' | 'ficha') => {
    const q = (buscaVinculo[prodId] || '').toLowerCase();
    if (tipo === 'item')  return q ? itens.filter(i => i.nome.toLowerCase().includes(q))  : itens;
    return q ? fichas.filter(f => f.nome.toLowerCase().includes(q)) : fichas;
  };

  const nomeEstoque = (id: string) => estoques.find(e => e.id === id)?.nome || '—';
  const nomeItem    = (id: string) => itens.find(i => i.id === id)?.nome    || '—';
  const nomeFicha   = (id: string) => fichas.find(f => f.id === id)?.nome   || '—';

  const handleProcessar = async () => {
    if (!todosProntos) return;
    setProcessando(true);
    try {
      // Envia apenas os produtos NÃO ignorados
      const payload = ativos
        .filter(p => p.estoqueId && (p.itemEstoqueId || p.fichaId))
        .map(p => ({
          productId:       p.productId,
          productName:     p.productName,
          productCategory: p.productCategory,
          count:           p.count,
          eventDate:       p.eventDate,
          estoqueId:       p.estoqueId,
          itemEstoqueId:   p.vinculoTipo === 'item'  ? p.itemEstoqueId : null,
          fichaTecnicaId:  p.vinculoTipo === 'ficha' ? p.fichaId       : null,
        }));
      const res  = await fetch(`${SUPABASE_URL}/functions/v1/zig-processar-baixas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dtinicio, dtfim, produtos: payload }),
      });
      const json = await res.json();
      setResultado(json);
      setEtapa('resultado');
      await carregarLogs();
    } catch(e: any) {
      setResultado({ ok: false, error: e.message });
      setEtapa('resultado');
    } finally { setProcessando(false); }
  };

  // ── BUSCA ───────────────────────────────────────────────────
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
          <p>2. Você escolhe o estoque de saída e vincula ao item ou ficha técnica</p>
          <p>3. Produtos que não movimentam estoque podem ser marcados como <strong>ignorados</strong></p>
          <p>4. O mapeamento fica salvo — na próxima vez já vem preenchido</p>
          <p>5. Confirme e processe as baixas de estoque</p>
        </div>
        {erroBusca && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">{erroBusca}</div>}
        <button onClick={handleBuscar} disabled={buscando}
          className="w-full flex items-center justify-center gap-2 bg-[#7D1F2C] hover:bg-[#6a1a25] disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors">
          <Search size={18} className={buscando ? 'animate-pulse' : ''} />
          {buscando ? 'Buscando vendas na ZIG...' : 'Buscar vendas'}
        </button>
      </div>

      {logs.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-semibold text-gray-800 mb-4">Últimas sincronizações</h2>
          <div className="space-y-2">
            {logs.map(log => (
              <div key={log.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <div className="flex items-center gap-2">
                    {log.status === 'sucesso' ? <CheckCircle size={13} className="text-green-500" /> :
                     log.status === 'erro'    ? <XCircle size={13} className="text-red-500" />     :
                                               <Clock size={13} className="text-yellow-500" />}
                    <span className="text-xs text-gray-500">{new Date(log.iniciado_em).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'})}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{log.dtinicio} → {log.dtfim}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-green-600">{log.total_movimentacoes ?? 0} baixas</p>
                  {(log.total_duplicados ?? 0) > 0 && <p className="text-xs text-gray-400">{log.total_duplicados} já proc.</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // ── REVISÃO ──────────────────────────────────────────────────
  if (etapa === 'revisao') return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => setEtapa('busca')} className="text-gray-400 hover:text-gray-700 text-sm">← Voltar</button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Revisar vendas</h1>
            <p className="text-sm text-gray-500">{dtinicio} → {dtfim} · {produtos.length} produtos</p>
          </div>
        </div>
        <div className="flex gap-2 text-xs flex-wrap">
          <span className="px-2 py-1 bg-green-50 text-green-700 rounded-lg border border-green-200 font-medium">
            ✓ {produtos.filter(pronto).length} prontos
          </span>
          {qtdPendentes > 0 && (
            <span className="px-2 py-1 bg-amber-50 text-amber-700 rounded-lg border border-amber-200 font-medium">
              ⚠ {qtdPendentes} pendentes
            </span>
          )}
          {ignorados.length > 0 && (
            <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded-lg border border-gray-200 font-medium">
              ⊘ {ignorados.length} ignorados
            </span>
          )}
        </div>
      </div>

      {!todosProntos && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 text-sm text-amber-800 flex items-start gap-2">
          <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
          <span>Todos os produtos precisam ter estoque e vínculo, ou estar marcados como <strong>ignorados</strong>, antes de processar.</span>
        </div>
      )}

      {/* ── Produtos ativos ── */}
      <div className="space-y-3">
        {ativos.map(prod => {
          const ok = pronto(prod);
          const q  = buscaVinculo[prod.productId] || '';
          return (
            <div key={prod.productId}
              className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${ok ? 'border-green-200' : 'border-amber-300'}`}>

              {/* Header */}
              <div className={`flex items-center justify-between px-4 py-3 ${ok ? 'bg-green-50' : 'bg-amber-50'}`}>
                <div className="flex items-center gap-3 min-w-0">
                  {ok ? <Check size={15} className="text-green-600 flex-shrink-0" />
                      : <AlertTriangle size={15} className="text-amber-500 flex-shrink-0" />}
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">{prod.productName}</p>
                    <p className="text-xs text-gray-400">
                      {prod.productCategory && <span className="italic mr-2">{prod.productCategory}</span>}
                      {prod.mapeado && <span className="text-blue-500">mapeado anteriormente</span>}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-800">{prod.count}</p>
                    <p className="text-xs text-gray-400">unid.</p>
                  </div>
                  {/* ★ TOGGLE IGNORAR */}
                  <button
                    onClick={() => toggleIgnorar(prod)}
                    disabled={prod.salvandoIgnore}
                    title="Não baixar este item do estoque"
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                      prod.salvandoIgnore
                        ? 'opacity-50 cursor-wait bg-gray-50 border-gray-200 text-gray-400'
                        : 'bg-white border-gray-200 text-gray-500 hover:border-red-300 hover:text-red-500 hover:bg-red-50'
                    }`}>
                    <EyeOff size={12} />
                    Ignorar
                  </button>
                </div>
              </div>

              <div className="px-4 py-4 space-y-4">
                {/* Estoque */}
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1 mb-1">
                    <Warehouse size={11} /> Estoque de saída
                  </label>
                  <select value={prod.estoqueId}
                    onChange={e => update(prod.productId, { estoqueId: e.target.value })}
                    className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7D1F2C]/30 ${
                      prod.estoqueId ? 'border-gray-200' : 'border-amber-300 bg-amber-50'
                    }`}>
                    <option value="">— Selecione o estoque —</option>
                    {estoques.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                  </select>
                </div>

                {/* Tipo de vínculo */}
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1 mb-2">
                    <Link2 size={11} /> Vínculo de baixa
                  </label>

                  {!prod.itemEstoqueId && !prod.fichaId && (
                    <div className="flex gap-2 mb-3">
                      <button
                        onClick={() => update(prod.productId, { vinculoTipo: 'item' })}
                        className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-colors ${
                          prod.vinculoTipo === 'item'
                            ? 'bg-[#7D1F2C] text-white border-[#7D1F2C]'
                            : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                        }`}>
                        Item de estoque
                      </button>
                      <button
                        onClick={() => update(prod.productId, { vinculoTipo: 'ficha' })}
                        className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-colors ${
                          prod.vinculoTipo === 'ficha'
                            ? 'bg-[#7D1F2C] text-white border-[#7D1F2C]'
                            : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                        }`}>
                        Ficha técnica
                      </button>
                    </div>
                  )}

                  {prod.itemEstoqueId && (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 flex items-center gap-2">
                        <Package size={13} className="text-gray-400" />
                        {nomeItem(prod.itemEstoqueId)}
                        <span className="text-xs text-gray-400 ml-1">— item</span>
                      </div>
                      <button onClick={() => update(prod.productId, { itemEstoqueId: '', fichaId: '', vinculoTipo: '' })}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors" title="Remover">
                        <X size={15} />
                      </button>
                    </div>
                  )}

                  {prod.fichaId && (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 flex items-center gap-2">
                        <RefreshCw size={13} className="text-gray-400" />
                        {nomeFicha(prod.fichaId)}
                        <span className="text-xs text-gray-400 ml-1">— ficha técnica</span>
                      </div>
                      <button onClick={() => update(prod.productId, { itemEstoqueId: '', fichaId: '', vinculoTipo: '' })}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors" title="Remover">
                        <X size={15} />
                      </button>
                    </div>
                  )}

                  {!prod.itemEstoqueId && !prod.fichaId && prod.vinculoTipo === 'item' && (
                    <div>
                      <div className="relative mb-1">
                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input type="text" placeholder="Buscar item de estoque..."
                          value={q}
                          onChange={e => setBuscaVinculo(prev => ({ ...prev, [prod.productId]: e.target.value }))}
                          className="w-full border border-amber-300 bg-amber-50 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7D1F2C]/30 focus:bg-white focus:border-gray-200" />
                      </div>
                      {q && (
                        <div className="border border-gray-200 rounded-xl bg-white shadow-lg max-h-44 overflow-y-auto">
                          {filtrarVinculo(prod.productId, 'item').slice(0, 20).map(item => (
                            <button key={item.id}
                              onClick={() => { update(prod.productId, { itemEstoqueId: item.id, fichaId: '', vinculoTipo: 'item' }); setBuscaVinculo(prev => ({ ...prev, [prod.productId]: '' })); }}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-50 last:border-0 transition-colors flex items-center justify-between">
                              <span className="font-medium text-gray-800">{item.nome}</span>
                              <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                                {item.unidade_medida}
                                {item.custo_medio > 0 && ` · R$ ${Number(item.custo_medio).toFixed(2)}`}
                              </span>
                            </button>
                          ))}
                          {filtrarVinculo(prod.productId, 'item').length === 0 && (
                            <p className="px-3 py-3 text-sm text-gray-400 italic text-center">Nenhum item encontrado</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {!prod.itemEstoqueId && !prod.fichaId && prod.vinculoTipo === 'ficha' && (
                    <div>
                      <div className="relative mb-1">
                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input type="text" placeholder="Buscar ficha técnica..."
                          value={q}
                          onChange={e => setBuscaVinculo(prev => ({ ...prev, [prod.productId]: e.target.value }))}
                          className="w-full border border-amber-300 bg-amber-50 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7D1F2C]/30 focus:bg-white focus:border-gray-200" />
                      </div>
                      {q && (
                        <div className="border border-gray-200 rounded-xl bg-white shadow-lg max-h-44 overflow-y-auto">
                          {filtrarVinculo(prod.productId, 'ficha').slice(0, 20).map(f => (
                            <button key={f.id}
                              onClick={() => { update(prod.productId, { fichaId: f.id, itemEstoqueId: '', vinculoTipo: 'ficha' }); setBuscaVinculo(prev => ({ ...prev, [prod.productId]: '' })); }}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-50 last:border-0 transition-colors flex items-center justify-between">
                              <span className="font-medium text-gray-800">{f.nome}</span>
                              <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                                {f.porcoes > 0 && `${f.porcoes} porç.`}
                                {f.custo_total > 0 && ` · R$ ${Number(f.custo_total).toFixed(2)}`}
                              </span>
                            </button>
                          ))}
                          {filtrarVinculo(prod.productId, 'ficha').length === 0 && (
                            <p className="px-3 py-3 text-sm text-gray-400 italic text-center">Nenhuma ficha encontrada</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {!prod.itemEstoqueId && !prod.fichaId && !prod.vinculoTipo && (
                    <p className="text-xs text-amber-600 italic">Escolha o tipo de vínculo acima</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Produtos ignorados ── */}
      {ignorados.length > 0 && (
        <div className="mt-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1">
            <EyeOff size={11} /> Ignorados — não serão baixados do estoque
          </p>
          <div className="space-y-2">
            {ignorados.map(prod => (
              <div key={prod.productId}
                className="bg-gray-50 rounded-2xl border border-gray-200 px-4 py-3 flex items-center justify-between opacity-60 hover:opacity-80 transition-opacity">
                <div className="flex items-center gap-3 min-w-0">
                  <EyeOff size={14} className="text-gray-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-600 line-through">{prod.productName}</p>
                    <p className="text-xs text-gray-400">{prod.productCategory || '—'} · {prod.count} unid.</p>
                  </div>
                </div>
                {/* Desfazer ignore */}
                <button
                  onClick={() => toggleIgnorar(prod)}
                  disabled={prod.salvandoIgnore}
                  title="Voltar a processar este item"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-500 hover:border-green-300 hover:text-green-600 hover:bg-green-50 transition-all disabled:opacity-50">
                  <Eye size={12} />
                  Reativar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Botão processar sticky */}
      <div className="sticky bottom-4 pt-2">
        <button onClick={handleProcessar} disabled={!todosProntos || processando}
          className={`w-full flex items-center justify-center gap-2 font-bold py-4 rounded-2xl transition-all shadow-lg text-white ${
            todosProntos ? 'bg-[#7D1F2C] hover:bg-[#6a1a25] shadow-[#7D1F2C]/30' : 'bg-gray-300 cursor-not-allowed shadow-gray-200'
          }`}>
          <Play size={18} className={processando ? 'animate-pulse' : ''} />
          {processando
            ? 'Processando baixas...'
            : todosProntos
              ? `Processar ${ativos.filter(p => p.estoqueId).length} produto(s)${ignorados.length > 0 ? ` · ${ignorados.length} ignorado(s)` : ''}`
              : `Aguardando ${qtdPendentes} mapeamento(s)`}
        </button>
      </div>
    </div>
  );

  // ── RESULTADO ────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${resultado?.ok ? 'bg-green-100' : 'bg-red-100'}`}>
          {resultado?.ok ? <CheckCircle size={20} className="text-green-600" /> : <XCircle size={20} className="text-red-500" />}
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{resultado?.ok ? 'Baixas processadas!' : 'Erro ao processar'}</h1>
          <p className="text-sm text-gray-500">{dtinicio} → {dtfim}</p>
        </div>
      </div>

      {resultado?.ok && resultado.resumo && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Processados', v: resultado.resumo.total_processados,  color: 'text-gray-700'  },
            { label: 'Baixas',      v: resultado.resumo.total_movimentacoes, color: 'text-green-600' },
            { label: 'Já proc.',    v: resultado.resumo.total_duplicados,    color: 'text-blue-500'  },
            { label: 'Erros',       v: resultado.resumo.total_erros,         color: 'text-red-500'   },
          ].map(item => (
            <div key={item.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
              <p className={`text-2xl font-bold ${item.color}`}>{item.v ?? 0}</p>
              <p className="text-xs text-gray-500 mt-1">{item.label}</p>
            </div>
          ))}
        </div>
      )}

      {ignorados.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 text-sm text-gray-500">
          <p className="flex items-center gap-2 font-medium"><EyeOff size={14} /> {ignorados.length} produto(s) ignorado(s) nesta importação</p>
          <p className="text-xs mt-1 text-gray-400">Estes itens ficam salvos como ignorados e serão pulados automaticamente na próxima vez.</p>
        </div>
      )}

      {resultado?.resumo?.erros?.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <p className="text-sm font-semibold text-red-700 mb-2">Erros encontrados:</p>
          {resultado.resumo.erros.map((e: string) => (
            <p key={e} className="text-xs text-red-600 font-mono mt-1">{e}</p>
          ))}
        </div>
      )}

      {!resultado?.ok && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-600">{resultado?.error}</div>
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
