import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  Search, ArrowLeft, Calculator, TrendingUp, TrendingDown,
  Loader2, Check, Minus, AlertCircle, QrCode, Copy, CheckCheck,
  Filter, EyeOff, Eye, RotateCcw, PackagePlus, X,
} from 'lucide-react';
import type { ContagemItem, GrupoContagem } from './types';
import { GRUPOS } from './types';
import * as service from './contagemService';
import { itemEstaIgnorado } from './contagemService';
import { formatCurrency } from '../../../utils/currency';

interface Props {
  contagemId: string;
  estoqueName: string;
  onVoltar: () => void;
  onFinalizar: () => void;
}

// URL do app em produção
const APP_URL = (import.meta.env.VITE_APP_URL as string | undefined)?.replace(/\/$/, '')
  || 'https://sistema-ditado-3-0-d-yntp.bolt.host';

const COR_BADGE: Record<string, string> = {
  blue:   'bg-blue-100 text-blue-700 border-blue-200',
  red:    'bg-red-100 text-red-700 border-red-200',
  green:  'bg-green-100 text-green-700 border-green-200',
  yellow: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  purple: 'bg-purple-100 text-purple-700 border-purple-200',
  gray:   'bg-gray-100 text-gray-600 border-gray-200',
};

const COR_ABA_ATIVA: Record<string, string> = {
  blue:   'border-blue-500 text-blue-700 bg-blue-50',
  red:    'border-red-500 text-red-700 bg-red-50',
  green:  'border-green-500 text-green-700 bg-green-50',
  yellow: 'border-yellow-500 text-yellow-700 bg-yellow-50',
  purple: 'border-purple-500 text-purple-700 bg-purple-50',
  gray:   'border-gray-500 text-gray-700 bg-gray-50',
};

export default function ContagemContador({ contagemId, estoqueName, onVoltar, onFinalizar }: Props) {
  const [itens, setItens]                 = useState<ContagemItem[]>([]);
  const [loading, setLoading]             = useState(true);
  const [searchTerm, setSearchTerm]       = useState('');
  const [grupoAtivo, setGrupoAtivo]       = useState<GrupoContagem | 'todos' | 'ignorados'>('todos');
  const [savingItems, setSavingItems]     = useState<Set<string>>(new Set());
  const [savedItems, setSavedItems]       = useState<Set<string>>(new Set());
  const [errorItems, setErrorItems]       = useState<Set<string>>(new Set());
  const [token, setToken]                 = useState<string | null>(null);
  const [copiado, setCopiado]             = useState(false);
  const [showLinkPanel, setShowLinkPanel] = useState(false);
  const [gerandoToken, setGerandoToken]   = useState(false);
  const [filtroPendentes, setFiltroPendentes] = useState(false);

  // ── Adicionar item ausente ─────────────────────────────────────────────────
  const [showAdicionarPanel, setShowAdicionarPanel] = useState(false);
  const [buscaAusente, setBuscaAusente]             = useState('');
  const [itensDisponiveis, setItensDisponiveis]     = useState<{id:string;nome:string;codigo:string;unidade_medida:string;custo_medio:number;grupo_contagem:string}[]>([]);
  const [loadingDisponiveis, setLoadingDisponiveis] = useState(false);
  const [adicionando, setAdicionando]               = useState<string | null>(null);

  const debounceTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    loadItems();
    return () => { debounceTimers.current.forEach(t => clearTimeout(t)); };
  }, [contagemId]);

  const loadItems = async () => {
    setLoading(true);
    try { setItens(await service.loadItensContagem(contagemId)); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  // ── Buscar itens do catálogo que não estão na contagem ────────────────────
  const buscarItensAusentes = useCallback(async (termo: string) => {
    if (termo.length < 2) { setItensDisponiveis([]); return; }
    setLoadingDisponiveis(true);
    try {
      const { supabase: sb } = await import('../../../lib/supabase');
      const { data, error } = await sb
        .from('itens_estoque')
        .select('id, nome, codigo, unidade_medida, custo_medio, grupo_contagem')
        .eq('status', 'ativo')
        .eq('ignorar_contagem', false)
        .or(`nome.ilike.%${termo}%,codigo.ilike.%${termo}%`)
        .order('nome')
        .limit(15);
      if (error) throw error;
      const idsNaContagem = new Set(itens.map(i => i.item_estoque_id));
      setItensDisponiveis((data || []).filter((d: any) => !idsNaContagem.has(d.id)));
    } catch { setItensDisponiveis([]); }
    finally { setLoadingDisponiveis(false); }
  }, [itens]);

  useEffect(() => {
    const t = setTimeout(() => buscarItensAusentes(buscaAusente), 400);
    return () => clearTimeout(t);
  }, [buscaAusente, buscarItensAusentes]);

  // ── Adicionar item ausente com saldo sistema = 0 ──────────────────────────
  const adicionarItemAusente = useCallback(async (item: typeof itensDisponiveis[0]) => {
    setAdicionando(item.id);
    try {
      const { supabase: sb } = await import('../../../lib/supabase');
      const { data, error } = await sb
        .from('contagens_estoque_itens')
        .insert({
          contagem_id:        contagemId,
          item_estoque_id:    item.id,
          quantidade_sistema: 0,
          valor_unitario:     item.custo_medio || 0,
        })
        .select('id')
        .single();
      if (error) throw error;

      const novoItem: ContagemItem = {
        id:                       data.id,
        item_estoque_id:          item.id,
        item_nome:                item.nome,
        item_codigo:              item.codigo || '',
        unidade_medida:           item.unidade_medida,
        grupo_contagem:           (item.grupo_contagem as any) || 'outros',
        ignorar_contagem_cadastro: false,
        ignorar_override:         null,
        quantidade_sistema:       0,
        quantidade_contada:       null,
        valor_unitario:           item.custo_medio || 0,
        diferenca:                null,
        valor_diferenca:          null,
        observacao:               null,
      };
      setItens(prev => [...prev, novoItem]);
      setItensDisponiveis(prev => prev.filter(i => i.id !== item.id));
      setBuscaAusente('');
      setShowAdicionarPanel(false);
    } catch (e: any) {
      alert('Erro ao adicionar item: ' + (e as any).message);
    } finally {
      setAdicionando(null);
    }
  }, [contagemId, itensDisponiveis]);

  // Salva com debounce
  const salvarCampo = useCallback((itemId: string, updates: Parameters<typeof service.atualizarItem>[1]) => {
    const key = Object.keys(updates)[0] + '-' + itemId;
    const ex  = debounceTimers.current.get(key);
    if (ex) clearTimeout(ex);
    debounceTimers.current.set(key, setTimeout(async () => {
      debounceTimers.current.delete(key);
      setSavingItems(p => new Set(p).add(itemId));
      try {
        await service.atualizarItem(itemId, updates);
        setSavedItems(p => new Set(p).add(itemId));
        setTimeout(() => setSavedItems(p => { const n = new Set(p); n.delete(itemId); return n; }), 2000);
      } catch { setErrorItems(p => new Set(p).add(itemId)); }
      finally { setSavingItems(p => { const n = new Set(p); n.delete(itemId); return n; }); }
    }, 600));
  }, []);

  const handleQuantidadeChange = useCallback((itemId: string, value: string) => {
    const parsed = value === '' ? null : parseFloat(value);
    if (parsed !== null && isNaN(parsed)) return;
    setItens(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      const diff = parsed !== null ? parsed - item.quantidade_sistema : null;
      return { ...item, quantidade_contada: parsed, diferenca: diff,
               valor_diferenca: diff !== null ? diff * item.valor_unitario : null };
    }));
    setErrorItems(p => { const n = new Set(p); n.delete(itemId); return n; });
    setSavedItems(p => { const n = new Set(p); n.delete(itemId); return n; });
    salvarCampo(itemId, { quantidade_contada: parsed });
  }, [salvarCampo]);

  const handleObsChange = useCallback((itemId: string, value: string) => {
    setItens(prev => prev.map(i => i.id === itemId ? { ...i, observacao: value } : i));
    salvarCampo(itemId, { observacao: value || '' });
  }, [salvarCampo]);

  // Toggle ignorar — override por contagem
  const handleToggleIgnorar = useCallback(async (item: ContagemItem) => {
    const atualmenteIgnorado = itemEstaIgnorado(item);
    // Se está ignorado → forçar contar (override false)
    // Se está contando → ignorar nesta contagem (override true)
    const novoOverride = atualmenteIgnorado ? false : true;

    setItens(prev => prev.map(i =>
      i.id === item.id ? { ...i, ignorar_override: novoOverride } : i
    ));
    try {
      await service.atualizarItem(item.id, { ignorar_override: novoOverride });
    } catch {
      // Reverte em caso de erro
      setItens(prev => prev.map(i =>
        i.id === item.id ? { ...i, ignorar_override: item.ignorar_override } : i
      ));
    }
  }, []);

  // Resetar override (voltar ao padrão do cadastro)
  const handleResetarOverride = useCallback(async (item: ContagemItem) => {
    setItens(prev => prev.map(i =>
      i.id === item.id ? { ...i, ignorar_override: null } : i
    ));
    try {
      await service.atualizarItem(item.id, { ignorar_override: null });
    } catch {
      setItens(prev => prev.map(i =>
        i.id === item.id ? { ...i, ignorar_override: item.ignorar_override } : i
      ));
    }
  }, []);

  const handleGerarLink = async () => {
    setGerandoToken(true);
    try {
      const t = await service.gerarTokenContagem(contagemId);
      setToken(t);
      setShowLinkPanel(true);
    } catch (e: any) { alert('Erro ao gerar link: ' + e.message); }
    finally { setGerandoToken(false); }
  };

  const linkPublico = token ? `${APP_URL}/contagem-mobile/${token}` : '';

  const copiarLink = async () => {
    if (!linkPublico) return;
    await navigator.clipboard.writeText(linkPublico);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  };

  // Separar itens ativos e ignorados
  const itensAtivos   = useMemo(() => itens.filter(i => !itemEstaIgnorado(i)), [itens]);
  const itensIgnorados = useMemo(() => itens.filter(i => itemEstaIgnorado(i)), [itens]);

  // Stats apenas dos ativos
  const statsPorGrupo = useMemo(() => {
    const map: Record<string, { total: number; contados: number }> = {};
    for (const item of itensAtivos) {
      const g = item.grupo_contagem || 'outros';
      if (!map[g]) map[g] = { total: 0, contados: 0 };
      map[g].total++;
      if (item.quantidade_contada !== null) map[g].contados++;
    }
    return map;
  }, [itensAtivos]);

  const statsGeral = useMemo(() => ({
    total: itensAtivos.length,
    contados: itensAtivos.filter(i => i.quantidade_contada !== null).length,
    ignorados: itensIgnorados.length,
  }), [itensAtivos, itensIgnorados]);

  // Lista visível
  const itensFiltrados = useMemo(() => {
    let r: ContagemItem[];
    if (grupoAtivo === 'ignorados') {
      r = itensIgnorados;
    } else {
      r = itensAtivos;
      if (grupoAtivo !== 'todos') r = r.filter(i => (i.grupo_contagem || 'outros') === grupoAtivo);
      if (filtroPendentes) r = r.filter(i => i.quantidade_contada === null);
    }
    if (searchTerm) {
      const t = searchTerm.toLowerCase();
      r = r.filter(i => i.item_nome.toLowerCase().includes(t) || i.item_codigo.toLowerCase().includes(t));
    }
    return [...r].sort((a, b) => a.item_nome.localeCompare(b.item_nome));
  }, [itens, grupoAtivo, filtroPendentes, searchTerm, itensAtivos, itensIgnorados]);

  const progressPct = statsGeral.total > 0 ? (statsGeral.contados / statsGeral.total) * 100 : 0;

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-24 gap-3">
      <Loader2 className="w-8 h-8 animate-spin text-[#7D1F2C]" />
      <p className="text-sm text-gray-500">Carregando itens...</p>
    </div>
  );

  return (
    <div className="flex flex-col h-full">

      {/* ── HEADER ── */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-20">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={onVoltar} className="p-2 hover:bg-gray-100 rounded-xl shrink-0">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-gray-900 truncate">{estoqueName}</h2>
              <p className="text-xs text-gray-500">
                {statsGeral.contados}/{statsGeral.total} contados
                {statsGeral.ignorados > 0 && <span className="text-gray-400 ml-1">· {statsGeral.ignorados} ignorados</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={token ? () => setShowLinkPanel(!showLinkPanel) : handleGerarLink}
              disabled={gerandoToken}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#7D1F2C] text-[#7D1F2C] text-xs font-semibold hover:bg-[#7D1F2C]/5 transition-all"
              title="Gerar link para celular">
              {gerandoToken ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
              <span className="hidden sm:inline">Link Celular</span>
            </button>
            {/* Botão adicionar item ausente */}
            <button
              onClick={() => { setShowAdicionarPanel(!showAdicionarPanel); setBuscaAusente(''); setItensDisponiveis([]); }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
                showAdicionarPanel
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'border-blue-300 text-blue-700 hover:bg-blue-50'
              }`}
              title="Adicionar item que não aparece na lista">
              <PackagePlus className="w-4 h-4" />
              <span className="hidden sm:inline">+ Item</span>
            </button>
            <button
              onClick={onFinalizar}
              disabled={statsGeral.contados === 0}
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-40 flex items-center gap-2 shadow-sm">
              <Calculator className="w-4 h-4" />
              <span className="hidden sm:inline">Finalizar</span>
            </button>
          </div>
        </div>

        {/* Progresso */}
        <div className="mt-2.5 flex items-center gap-2">
          <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#7D1F2C] to-[#D4AF37] rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-gray-600 tabular-nums w-9 text-right">
            {Math.round(progressPct)}%
          </span>
        </div>

        {/* Painel do link */}
        {showLinkPanel && token && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
            <p className="text-xs font-semibold text-blue-800">🔗 Link para celular (válido 7 dias)</p>
            <div className="flex gap-2">
              <input readOnly value={linkPublico}
                className="flex-1 text-xs bg-white border border-blue-200 rounded-lg px-2 py-1.5 text-gray-700"
                onClick={e => (e.target as HTMLInputElement).select()} />
              <button onClick={copiarLink}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700">
                {copiado ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiado ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
            <p className="text-[10px] text-blue-600">
              Mande pelo WhatsApp — o funcionário abre no celular sem precisar de login.
            </p>
          </div>
        )}
      </div>

      {/* ── PAINEL ADICIONAR ITEM AUSENTE ── */}
      {showAdicionarPanel && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-blue-800 flex items-center gap-1.5">
              <PackagePlus className="w-3.5 h-3.5" />
              Adicionar item com saldo zero ou ausente da lista
            </p>
            <button onClick={() => setShowAdicionarPanel(false)} className="text-blue-400 hover:text-blue-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[11px] text-blue-600">
            Use quando o item foi vendido e zerou antes da contagem, ou quando o sistema está desatualizado mas o produto existe fisicamente.
          </p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-blue-400" />
            <input
              type="text"
              value={buscaAusente}
              onChange={e => setBuscaAusente(e.target.value)}
              placeholder="Buscar item por nome ou código..."
              autoFocus
              className="w-full pl-8 pr-3 py-2 text-sm border border-blue-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            {loadingDisponiveis && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-blue-400" />
            )}
          </div>
          {buscaAusente.length >= 2 && itensDisponiveis.length === 0 && !loadingDisponiveis && (
            <p className="text-xs text-blue-500 italic px-1">
              Nenhum item encontrado fora da contagem com este nome.
            </p>
          )}
          {itensDisponiveis.length > 0 && (
            <div className="bg-white border border-blue-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto shadow-sm">
              {itensDisponiveis.map(item => (
                <button
                  key={item.id}
                  onClick={() => adicionarItemAusente(item)}
                  disabled={adicionando === item.id}
                  className="w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-blue-50 border-b border-blue-50 last:border-0 transition-colors disabled:opacity-50"
                >
                  <div className="text-left min-w-0">
                    <p className="font-medium text-gray-900 truncate">{item.nome}</p>
                    <p className="text-[11px] text-gray-400">
                      {item.codigo && <span className="mr-2">{item.codigo}</span>}
                      {item.unidade_medida}
                      <span className="ml-2 text-orange-500 font-semibold">Sistema: 0</span>
                    </p>
                  </div>
                  <div className="ml-3 shrink-0">
                    {adicionando === item.id
                      ? <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                      : <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-1 rounded-lg">Adicionar</span>
                    }
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── ABAS DE GRUPO ── */}
      <div className="bg-white border-b border-gray-100 sticky top-[88px] z-10">
        <div className="flex overflow-x-auto scrollbar-hide px-2 py-2 gap-1.5">
          {/* Todos */}
          <button onClick={() => setGrupoAtivo('todos')}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border-2 transition-all ${
              grupoAtivo === 'todos'
                ? 'bg-[#7D1F2C] text-white border-[#7D1F2C]'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}>
            Todos
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
              grupoAtivo === 'todos' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
            }`}>
              {statsGeral.contados}/{statsGeral.total}
            </span>
          </button>

          {/* Grupos */}
          {GRUPOS.map(g => {
            const s = statsPorGrupo[g.key] || { total: 0, contados: 0 };
            if (s.total === 0) return null;
            const ativo    = grupoAtivo === g.key;
            const completo = s.total > 0 && s.contados === s.total;
            return (
              <button key={g.key} onClick={() => setGrupoAtivo(g.key)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border-2 transition-all ${
                  ativo     ? COR_ABA_ATIVA[g.cor]
                  : completo ? 'bg-green-50 text-green-700 border-green-200'
                  :            'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                }`}>
                <span>{g.emoji}</span>
                <span>{g.label}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  ativo ? COR_BADGE[g.cor] : completo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {s.contados}/{s.total}
                </span>
                {completo && <Check className="w-3 h-3 text-green-600" />}
              </button>
            );
          })}

          {/* Ignorados */}
          {statsGeral.ignorados > 0 && (
            <button onClick={() => setGrupoAtivo('ignorados')}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border-2 transition-all ${
                grupoAtivo === 'ignorados'
                  ? 'bg-gray-600 text-white border-gray-600'
                  : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-50'
              }`}>
              <EyeOff className="w-3 h-3" />
              Ignorados
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                grupoAtivo === 'ignorados' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-400'
              }`}>
                {statsGeral.ignorados}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* ── BUSCA + FILTRO ── */}
      <div className="bg-gray-50/80 border-b border-gray-100 px-3 py-2 flex gap-2 sticky top-[140px] z-[9]">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome ou código..."
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-[#7D1F2C]/30 focus:border-[#7D1F2C]"
          />
        </div>
        {grupoAtivo !== 'ignorados' && (
          <button onClick={() => setFiltroPendentes(!filtroPendentes)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border-2 transition-all ${
              filtroPendentes ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}>
            <Filter className="w-3.5 h-3.5" />
            Pendentes
          </button>
        )}
      </div>

      {/* ── LISTA DE CARDS ── */}
      <div className="flex-1 overflow-auto px-3 py-3 space-y-2">

        {/* Aviso na aba de ignorados */}
        {grupoAtivo === 'ignorados' && itensFiltrados.length > 0 && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs text-gray-500 flex items-start gap-2">
            <EyeOff className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>
              Estes itens <strong>não serão contados</strong>. Clique em "Contar" em qualquer item para forçar a contagem nesta sessão.
              Itens marcados no <strong>cadastro</strong> têm um ícone de cadeado — o override dura só nesta contagem.
            </span>
          </div>
        )}

        {itensFiltrados.length === 0 && (
          <div className="py-16 text-center text-gray-400">
            <p className="text-sm">
              {searchTerm
                ? 'Nenhum item encontrado'
                : filtroPendentes
                ? '✅ Todos os itens contados neste grupo!'
                : grupoAtivo === 'ignorados'
                ? 'Nenhum item ignorado'
                : 'Nenhum item neste grupo'}
            </p>
          </div>
        )}

        {itensFiltrados.map(item => {
          const ignorado   = itemEstaIgnorado(item);
          const temOverride = item.ignorar_override !== null;
          const isContado  = item.quantidade_contada !== null;
          const isSaving   = savingItems.has(item.id);
          const isSaved    = savedItems.has(item.id);
          const hasError   = errorItems.has(item.id);
          const dif        = item.diferenca;
          const grupo      = GRUPOS.find(g => g.key === (item.grupo_contagem || 'outros'));

          // Card ignorado (aba de ignorados)
          if (ignorado) {
            return (
              <div key={item.id}
                className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 flex items-center justify-between opacity-70">
                <div className="flex items-center gap-3 min-w-0">
                  <EyeOff className="w-4 h-4 text-gray-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-500 line-through truncate">{item.item_nome}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {item.item_codigo && <span className="text-[11px] text-gray-400">{item.item_codigo}</span>}
                      {grupo && <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${COR_BADGE[grupo.cor]}`}>{grupo.emoji} {grupo.label}</span>}
                      {item.ignorar_contagem_cadastro && !temOverride && (
                        <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">🔒 Cadastro</span>
                      )}
                      {temOverride && (
                        <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">Override</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  {/* Botão Contar — força este item */}
                  <button onClick={() => handleToggleIgnorar(item)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-green-200 text-green-600 text-xs font-semibold hover:bg-green-50 transition-all">
                    <Eye className="w-3 h-3" />
                    Contar
                  </button>
                  {/* Resetar override se tem */}
                  {temOverride && (
                    <button onClick={() => handleResetarOverride(item)}
                      title="Voltar ao padrão do cadastro"
                      className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-50">
                      <RotateCcw className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          }

          // Card ativo (contagem normal)
          return (
            <div key={item.id}
              className={`bg-white rounded-2xl border-2 shadow-sm transition-all ${
                hasError              ? 'border-red-300'
                : isContado && dif === 0 ? 'border-green-200'
                : isContado && dif !== 0 ? 'border-orange-300'
                : 'border-gray-100'
              }`}>

              {/* Header do card */}
              <div className={`flex items-start justify-between px-4 pt-3 pb-2 ${
                isContado && dif === 0 ? 'bg-green-50/50 rounded-t-2xl'
                : isContado && dif !== 0 ? 'bg-orange-50/50 rounded-t-2xl'
                : ''
              }`}>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm leading-tight">{item.item_nome}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {item.item_codigo && <span className="text-[11px] text-gray-400">{item.item_codigo}</span>}
                    {grupo && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${COR_BADGE[grupo.cor]}`}>
                        {grupo.emoji} {grupo.label}
                      </span>
                    )}
                    {temOverride && item.ignorar_override === false && (
                      <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">
                        Forçado a contar
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-3 shrink-0">
                  {/* Status de salvamento */}
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                   : isSaved ? <Check className="w-4 h-4 text-green-500" />
                   : hasError ? <AlertCircle className="w-4 h-4 text-red-500" />
                   : isContado ? <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center"><Check className="w-2.5 h-2.5 text-white" /></div>
                   : <div className="w-4 h-4 rounded-full border-2 border-gray-300" />}
                  {/* Botão ignorar */}
                  <button onClick={() => handleToggleIgnorar(item)}
                    title="Não contar este item"
                    className="p-1.5 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-all">
                    <EyeOff className="w-3.5 h-3.5" />
                  </button>
                  {/* Reset override se existe */}
                  {temOverride && (
                    <button onClick={() => handleResetarOverride(item)}
                      title="Voltar ao padrão do cadastro"
                      className="p-1.5 rounded-lg text-gray-300 hover:text-gray-500 hover:bg-gray-50 transition-all">
                      <RotateCcw className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              <div className="px-4 pb-3 space-y-3">
                {/* Sistema vs Contado vs Diferença */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2 text-center">
                    <p className="text-[10px] text-gray-500 uppercase font-medium">Sistema</p>
                    <p className="text-lg font-bold text-gray-700 tabular-nums leading-tight">{item.quantidade_sistema}</p>
                    <p className="text-[10px] text-gray-400">{item.unidade_medida}</p>
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] text-gray-500 uppercase font-medium text-center mb-1">Contado</p>
                    <input
                      type="number" inputMode="decimal" step="0.001"
                      value={item.quantidade_contada === null ? '' : item.quantidade_contada}
                      onChange={e => handleQuantidadeChange(item.id, e.target.value)}
                      placeholder="—"
                      className={`w-full text-center text-2xl font-bold border-2 rounded-xl py-2 focus:outline-none focus:ring-2 transition-colors tabular-nums ${
                        hasError              ? 'border-red-300 bg-red-50 text-red-700 focus:ring-red-200'
                        : isContado && dif === 0 ? 'border-green-300 bg-green-50/70 text-green-800 focus:ring-green-200'
                        : isContado && dif !== 0 ? 'border-orange-300 bg-orange-50/70 text-orange-800 focus:ring-orange-200'
                        : 'border-gray-200 bg-white text-gray-900 focus:ring-[#7D1F2C]/20 focus:border-[#7D1F2C]'
                      }`}
                    />
                  </div>
                  {isContado && dif !== null && (
                    <div className="w-20 text-center">
                      <p className="text-[10px] text-gray-500 uppercase font-medium mb-1">Dif.</p>
                      <div className={`rounded-xl px-2 py-2 ${dif > 0 ? 'bg-green-100' : dif < 0 ? 'bg-red-100' : 'bg-gray-100'}`}>
                        <p className={`text-sm font-bold tabular-nums ${dif > 0 ? 'text-green-700' : dif < 0 ? 'text-red-700' : 'text-gray-500'}`}>
                          {dif > 0 && <TrendingUp className="w-3 h-3 inline mr-0.5" />}
                          {dif < 0 && <TrendingDown className="w-3 h-3 inline mr-0.5" />}
                          {dif === 0 && <Minus className="w-3 h-3 inline mr-0.5" />}
                          {dif > 0 ? '+' : ''}{dif.toFixed(2)}
                        </p>
                        {item.valor_diferenca !== null && item.valor_diferenca !== 0 && (
                          <p className={`text-[10px] font-medium ${dif > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {item.valor_diferenca > 0 ? '+' : ''}{formatCurrency(item.valor_diferenca)}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                {/* Observação */}
                <input type="text" value={item.observacao || ''}
                  onChange={e => handleObsChange(item.id, e.target.value)}
                  placeholder="Observação (opcional)..."
                  className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-[#7D1F2C]/20 focus:border-[#7D1F2C] bg-gray-50 focus:bg-white"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
