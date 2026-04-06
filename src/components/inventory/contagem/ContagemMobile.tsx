/**
 * Página pública de contagem para celular — sem autenticação.
 * Rota: /contagem-mobile/:token
 */
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  Loader2, Check, AlertCircle, Search, Filter,
  TrendingUp, TrendingDown, Minus, CheckCircle, Package,
} from 'lucide-react';
import type { GrupoContagem } from './types';
import { GRUPOS } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

interface ItemMobile {
  id: string;
  item_nome: string;
  item_codigo: string;
  unidade_medida: string;
  grupo_contagem: GrupoContagem;
  quantidade_sistema: number;
  quantidade_contada: number | null;
  observacao: string | null;
}

const COR_GRUPO: Record<string, string> = {
  blue:   'bg-blue-100 text-blue-700',
  red:    'bg-red-100 text-red-700',
  green:  'bg-green-100 text-green-700',
  yellow: 'bg-yellow-100 text-yellow-700',
  purple: 'bg-purple-100 text-purple-700',
  gray:   'bg-gray-100 text-gray-600',
};

export default function ContagemMobile() {
  const { token } = useParams<{ token: string }>();
  const [itens, setItens]         = useState<ItemMobile[]>([]);
  const [estoque, setEstoque]     = useState('');
  const [loading, setLoading]     = useState(true);
  const [erro, setErro]           = useState('');
  const [grupo, setGrupo]         = useState<GrupoContagem | 'todos'>('todos');
  const [search, setSearch]       = useState('');
  const [apenasPendentes, setApenasPendentes] = useState(false);
  const [saving, setSaving]       = useState<Set<string>>(new Set());
  const [saved, setSaved]         = useState<Set<string>>(new Set());
  const [errored, setErrored]     = useState<Set<string>>(new Set());

  const debounce = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    if (!token) return;
    fetch(`${SUPABASE_URL}/functions/v1/contagem-publica?token=${token}`)
      .then(r => r.json())
      .then(d => {
        if (!d.ok) { setErro(d.error || 'Erro'); return; }
        setItens(d.itens);
        setEstoque(d.estoque_nome);
      })
      .catch(() => setErro('Erro ao carregar contagem'))
      .finally(() => setLoading(false));
    return () => { debounce.current.forEach(t => clearTimeout(t)); };
  }, [token]);

  const salvar = useCallback((itemId: string, quantidade: number | null, obs?: string) => {
    const key = itemId;
    const ex = debounce.current.get(key);
    if (ex) clearTimeout(ex);

    debounce.current.set(key, setTimeout(async () => {
      debounce.current.delete(key);
      setSaving(p => new Set(p).add(itemId));
      try {
        const body: any = { item_id: itemId };
        if (quantidade !== undefined) body.quantidade_contada = quantidade;
        if (obs !== undefined) body.observacao = obs;

        const r = await fetch(`${SUPABASE_URL}/functions/v1/contagem-publica?token=${token}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const d = await r.json();
        if (!d.ok) throw new Error(d.error);
        setSaved(p => new Set(p).add(itemId));
        setTimeout(() => setSaved(p => { const n = new Set(p); n.delete(itemId); return n; }), 2000);
      } catch {
        setErrored(p => new Set(p).add(itemId));
      } finally {
        setSaving(p => { const n = new Set(p); n.delete(itemId); return n; });
      }
    }, 700));
  }, [token]);

  const handleQtd = (itemId: string, value: string) => {
    const parsed = value === '' ? null : parseFloat(value);
    if (parsed !== null && isNaN(parsed)) return;
    setItens(prev => prev.map(i => i.id === itemId ? { ...i, quantidade_contada: parsed } : i));
    setErrored(p => { const n = new Set(p); n.delete(itemId); return n; });
    setSaved(p => { const n = new Set(p); n.delete(itemId); return n; });
    salvar(itemId, parsed);
  };

  const handleObs = (itemId: string, value: string) => {
    setItens(prev => prev.map(i => i.id === itemId ? { ...i, observacao: value } : i));
    salvar(itemId, itens.find(i => i.id === itemId)?.quantidade_contada ?? null, value);
  };

  // Stats
  const total    = itens.length;
  const contados = itens.filter(i => i.quantidade_contada !== null).length;
  const pct      = total > 0 ? Math.round((contados / total) * 100) : 0;

  const statsPorGrupo: Record<string, { total: number; contados: number }> = {};
  for (const item of itens) {
    const g = item.grupo_contagem || 'outros';
    if (!statsPorGrupo[g]) statsPorGrupo[g] = { total: 0, contados: 0 };
    statsPorGrupo[g].total++;
    if (item.quantidade_contada !== null) statsPorGrupo[g].contados++;
  }

  const visiveis = itens.filter(i => {
    if (grupo !== 'todos' && (i.grupo_contagem || 'outros') !== grupo) return false;
    if (apenasPendentes && i.quantidade_contada !== null) return false;
    if (search) {
      const t = search.toLowerCase();
      if (!i.item_nome.toLowerCase().includes(t) && !i.item_codigo.toLowerCase().includes(t)) return false;
    }
    return true;
  }).sort((a, b) => a.item_nome.localeCompare(b.item_nome));

  // ── Estados de erro/loading ──
  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-3 p-6">
      <Loader2 className="w-10 h-10 animate-spin text-[#7D1F2C]" />
      <p className="text-sm text-gray-500">Carregando contagem...</p>
    </div>
  );

  if (erro) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4 p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center">
        <AlertCircle className="w-8 h-8 text-red-500" />
      </div>
      <h1 className="text-lg font-bold text-white">Link inválido</h1>
      <p className="text-sm text-gray-500">{erro}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* HEADER FIXO */}
      <div className="bg-[#7D1F2C] text-white px-4 pt-safe-top pt-4 pb-3 sticky top-0 z-30">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-white/80" />
            <h1 className="font-bold text-base">{estoque}</h1>
          </div>
          <span className="text-sm font-bold text-white/90">{contados}/{total}</span>
        </div>
        {/* Barra de progresso */}
        <div className="h-2 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#D4AF37] rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-[11px] text-white/70 mt-1">{pct}% concluído</p>
      </div>

      {/* ABAS DE GRUPO */}
      <div className="bg-white border-b border-gray-100 px-2 py-2 overflow-x-auto flex gap-1.5 sticky top-[calc(72px)] z-20">
        <button
          onClick={() => setGrupo('todos')}
          className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold border-2 transition-all ${
            grupo === 'todos' ? 'bg-[#7D1F2C] text-white border-[#7D1F2C]' : 'bg-white text-gray-600 border-gray-200'
          }`}>
          Todos {contados}/{total}
        </button>
        {GRUPOS.map(g => {
          const s = statsPorGrupo[g.key];
          if (!s || s.total === 0) return null;
          const ativo = grupo === g.key;
          const ok    = s.contados === s.total;
          return (
            <button key={g.key} onClick={() => setGrupo(g.key)}
              className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold border-2 transition-all ${
                ativo ? `border-2 ${COR_GRUPO[g.cor]} border-current`
                : ok ? 'bg-green-50 text-green-700 border-green-300'
                : 'bg-white text-gray-600 border-gray-200'
              }`}>
              {g.emoji} {g.label}
              <span className="ml-0.5 opacity-70">{s.contados}/{s.total}</span>
              {ok && <Check className="w-3 h-3" />}
            </button>
          );
        })}
      </div>

      {/* BUSCA + FILTRO */}
      <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 flex gap-2 sticky top-[calc(72px+52px)] z-10">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar item..."
            className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#7D1F2C]/30"
          />
        </div>
        <button
          onClick={() => setApenasPendentes(!apenasPendentes)}
          className={`px-3 py-2.5 rounded-xl text-xs font-semibold border-2 flex items-center gap-1 transition-all ${
            apenasPendentes ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-gray-600 border-gray-200'
          }`}>
          <Filter className="w-3.5 h-3.5" />
          Pendentes
        </button>
      </div>

      {/* LISTA DE CARDS */}
      <div className="flex-1 px-3 py-3 space-y-3 pb-8">
        {visiveis.length === 0 && (
          <div className="py-20 text-center space-y-2">
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto" />
            <p className="text-base font-semibold text-white/80">
              {apenasPendentes ? 'Todos contados neste grupo! 🎉' : 'Nenhum item aqui'}
            </p>
          </div>
        )}

        {visiveis.map(item => {
          const contado  = item.quantidade_contada !== null;
          const dif      = contado ? item.quantidade_contada! - item.quantidade_sistema : null;
          const isOk     = contado && dif === 0;
          const isDif    = contado && dif !== null && dif !== 0;
          const isSaving = saving.has(item.id);
          const isSaved  = saved.has(item.id);
          const hasErr   = errored.has(item.id);

          return (
            <div key={item.id}
              className={`bg-white rounded-2xl border-2 shadow-sm overflow-hidden transition-all active:scale-[0.99] ${
                hasErr  ? 'border-red-300' :
                isOk    ? 'border-green-300' :
                isDif   ? 'border-orange-300' :
                'border-gray-100'
              }`}>

              {/* Nome + status */}
              <div className={`flex items-start justify-between px-4 pt-3 pb-2 ${
                isOk ? 'bg-green-50/60' : isDif ? 'bg-orange-50/60' : ''
              }`}>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white text-sm leading-snug">{item.item_nome}</p>
                  {item.item_codigo && (
                    <p className="text-[11px] text-gray-400 mt-0.5">{item.item_codigo}</p>
                  )}
                </div>
                <div className="ml-2 mt-0.5 shrink-0">
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin text-blue-400" /> :
                   isSaved  ? <Check className="w-4 h-4 text-green-500" /> :
                   hasErr   ? <AlertCircle className="w-4 h-4 text-red-500" /> :
                   contado  ? <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center"><Check className="w-2.5 h-2.5 text-white" /></div> :
                              <div className="w-4 h-4 rounded-full border-2 border-gray-300" />}
                </div>
              </div>

              <div className="px-4 pb-4 space-y-3">
                {/* Sistema vs Contado */}
                <div className="flex items-end gap-3">
                  {/* Saldo sistema */}
                  <div className="text-center">
                    <p className="text-[10px] text-gray-400 uppercase font-medium mb-1">Sistema</p>
                    <div className="bg-gray-100 rounded-xl px-3 py-2 min-w-[64px]">
                      <p className="text-xl font-bold text-gray-600 tabular-nums leading-none">
                        {item.quantidade_sistema}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{item.unidade_medida}</p>
                    </div>
                  </div>

                  {/* Input contado — GRANDE para celular */}
                  <div className="flex-1">
                    <p className="text-[10px] text-gray-500 uppercase font-medium text-center mb-1">Quantidade contada</p>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.001"
                      value={item.quantidade_contada === null ? '' : item.quantidade_contada}
                      onChange={e => handleQtd(item.id, e.target.value)}
                      placeholder="0"
                      className={`w-full text-center text-4xl font-black border-2 rounded-2xl py-3 focus:outline-none focus:ring-4 transition-all tabular-nums ${
                        hasErr ? 'border-red-300 bg-red-50 text-red-700 focus:ring-red-200' :
                        isOk   ? 'border-green-300 bg-green-50 text-green-800 focus:ring-green-200' :
                        isDif  ? 'border-orange-300 bg-orange-50 text-orange-800 focus:ring-orange-200' :
                                 'border-gray-200 bg-gray-50 text-white focus:ring-[#7D1F2C]/20 focus:border-[#7D1F2C]'
                      }`}
                    />
                  </div>

                  {/* Diferença */}
                  {contado && dif !== null && (
                    <div className="text-center min-w-[56px]">
                      <p className="text-[10px] text-gray-400 uppercase font-medium mb-1">Dif.</p>
                      <div className={`rounded-xl py-2 px-2 ${
                        dif > 0 ? 'bg-green-100' : dif < 0 ? 'bg-red-100' : 'bg-gray-100'
                      }`}>
                        {dif > 0 && <TrendingUp className="w-4 h-4 text-green-600 mx-auto mb-0.5" />}
                        {dif < 0 && <TrendingDown className="w-4 h-4 text-red-600 mx-auto mb-0.5" />}
                        {dif === 0 && <Minus className="w-4 h-4 text-gray-400 mx-auto mb-0.5" />}
                        <p className={`text-sm font-bold tabular-nums ${
                          dif > 0 ? 'text-green-700' : dif < 0 ? 'text-red-700' : 'text-gray-500'
                        }`}>
                          {dif > 0 ? '+' : ''}{dif.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Observação */}
                <input
                  type="text"
                  value={item.observacao || ''}
                  onChange={e => handleObs(item.id, e.target.value)}
                  placeholder="Observação..."
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#7D1F2C]/20"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
