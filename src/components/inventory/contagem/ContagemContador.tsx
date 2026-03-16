import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  Search, ArrowLeft, Calculator, TrendingUp, TrendingDown,
  Loader2, Check, Minus, AlertCircle, QrCode, Copy, CheckCheck,
  ChevronDown, ChevronUp, Filter,
} from 'lucide-react';
import type { ContagemItem, GrupoContagem } from './types';
import { GRUPOS } from './types';
import * as service from './contagemService';
import { formatCurrency } from '../../../utils/currency';

interface Props {
  contagemId: string;
  estoqueName: string;
  onVoltar: () => void;
  onFinalizar: () => void;
}

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
  const [grupoAtivo, setGrupoAtivo]       = useState<GrupoContagem | 'todos'>('todos');
  const [savingItems, setSavingItems]     = useState<Set<string>>(new Set());
  const [savedItems, setSavedItems]       = useState<Set<string>>(new Set());
  const [errorItems, setErrorItems]       = useState<Set<string>>(new Set());
  const [token, setToken]                 = useState<string | null>(null);
  const [copiado, setCopiado]             = useState(false);
  const [showLinkPanel, setShowLinkPanel] = useState(false);
  const [gerandoToken, setGerandoToken]   = useState(false);
  const [filtroPendentes, setFiltroPendentes] = useState(false);

  const debounceTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const inputRefs      = useRef<Map<string, HTMLInputElement>>(new Map());

  useEffect(() => {
    loadItems();
    return () => { debounceTimers.current.forEach(t => clearTimeout(t)); };
  }, [contagemId]);

  const loadItems = async () => {
    setLoading(true);
    try {
      const data = await service.loadItensContagem(contagemId);
      setItens(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleQuantidadeChange = useCallback((itemId: string, value: string) => {
    const parsed = value === '' ? null : parseFloat(value);
    if (parsed !== null && isNaN(parsed)) return;

    setItens(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      const diff = parsed !== null ? parsed - item.quantidade_sistema : null;
      return { ...item, quantidade_contada: parsed, diferenca: diff,
               valor_diferenca: diff !== null ? diff * item.valor_unitario : null };
    }));
    setSavedItems(prev => { const n = new Set(prev); n.delete(itemId); return n; });
    setErrorItems(prev => { const n = new Set(prev); n.delete(itemId); return n; });

    const key = `qty-${itemId}`;
    const existing = debounceTimers.current.get(key);
    if (existing) clearTimeout(existing);
    debounceTimers.current.set(key, setTimeout(async () => {
      debounceTimers.current.delete(key);
      setSavingItems(prev => new Set(prev).add(itemId));
      try {
        await service.atualizarItem(itemId, { quantidade_contada: parsed });
        setSavedItems(prev => new Set(prev).add(itemId));
        setTimeout(() => setSavedItems(prev => { const n = new Set(prev); n.delete(itemId); return n; }), 2000);
      } catch { setErrorItems(prev => new Set(prev).add(itemId)); }
      finally { setSavingItems(prev => { const n = new Set(prev); n.delete(itemId); return n; }); }
    }, 600));
  }, []);

  const handleObsChange = useCallback((itemId: string, value: string) => {
    setItens(prev => prev.map(i => i.id === itemId ? { ...i, observacao: value } : i));
    const key = `obs-${itemId}`;
    const existing = debounceTimers.current.get(key);
    if (existing) clearTimeout(existing);
    debounceTimers.current.set(key, setTimeout(async () => {
      debounceTimers.current.delete(key);
      try { await service.atualizarItem(itemId, { observacao: value || '' }); } catch {}
    }, 800));
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

  const linkPublico = token
    ? `${window.location.origin}/contagem-mobile/${token}`
    : '';

  const copiarLink = async () => {
    if (!linkPublico) return;
    await navigator.clipboard.writeText(linkPublico);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  };

  // Estatísticas por grupo
  const statsPorGrupo = useMemo(() => {
    const map: Record<string, { total: number; contados: number }> = {};
    for (const item of itens) {
      const g = item.grupo_contagem || 'outros';
      if (!map[g]) map[g] = { total: 0, contados: 0 };
      map[g].total++;
      if (item.quantidade_contada !== null) map[g].contados++;
    }
    return map;
  }, [itens]);

  const statsGeral = useMemo(() => {
    const contados = itens.filter(i => i.quantidade_contada !== null);
    return { total: itens.length, contados: contados.length };
  }, [itens]);

  // Itens filtrados
  const itensFiltrados = useMemo(() => {
    let r = itens;
    if (grupoAtivo !== 'todos') r = r.filter(i => (i.grupo_contagem || 'outros') === grupoAtivo);
    if (filtroPendentes) r = r.filter(i => i.quantidade_contada === null);
    if (searchTerm) {
      const t = searchTerm.toLowerCase();
      r = r.filter(i => i.item_nome.toLowerCase().includes(t) || i.item_codigo.toLowerCase().includes(t));
    }
    return [...r].sort((a, b) => a.item_nome.localeCompare(b.item_nome));
  }, [itens, grupoAtivo, filtroPendentes, searchTerm]);

  const progressPct = statsGeral.total > 0 ? (statsGeral.contados / statsGeral.total) * 100 : 0;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#7D1F2C]" />
        <p className="text-sm text-gray-500">Carregando itens...</p>
      </div>
    );
  }

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
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* Botão link celular */}
            <button
              onClick={token ? () => setShowLinkPanel(!showLinkPanel) : handleGerarLink}
              disabled={gerandoToken}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#7D1F2C] text-[#7D1F2C] text-xs font-semibold hover:bg-[#7D1F2C]/5 transition-all"
              title="Gerar link para celular">
              {gerandoToken
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <QrCode className="w-4 h-4" />}
              <span className="hidden sm:inline">Link Celular</span>
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

        {/* Barra de progresso */}
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
            <p className="text-xs font-semibold text-blue-800">
              🔗 Link para contagem no celular (válido 7 dias)
            </p>
            <div className="flex gap-2">
              <input
                readOnly value={linkPublico}
                className="flex-1 text-xs bg-white border border-blue-200 rounded-lg px-2 py-1.5 text-gray-700 select-all"
                onClick={e => (e.target as HTMLInputElement).select()}
              />
              <button
                onClick={copiarLink}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700">
                {copiado ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiado ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
            <p className="text-[10px] text-blue-600">
              O funcionário abre este link no celular, sem precisar fazer login.
            </p>
          </div>
        )}
      </div>

      {/* ── ABAS POR GRUPO ── */}
      <div className="bg-white border-b border-gray-100 sticky top-[calc(var(--header-h,88px))] z-10">
        <div className="flex overflow-x-auto scrollbar-hide px-2 py-2 gap-1.5">
          {/* Aba "Todos" */}
          <button
            onClick={() => setGrupoAtivo('todos')}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              grupoAtivo === 'todos'
                ? 'bg-[#7D1F2C] text-white border-[#7D1F2C]'
                : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
            }`}>
            Todos
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
              grupoAtivo === 'todos' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              {statsGeral.contados}/{statsGeral.total}
            </span>
          </button>

          {GRUPOS.map(g => {
            const s = statsPorGrupo[g.key] || { total: 0, contados: 0 };
            if (s.total === 0) return null;
            const ativo = grupoAtivo === g.key;
            const completo = s.total > 0 && s.contados === s.total;
            return (
              <button
                key={g.key}
                onClick={() => setGrupoAtivo(g.key)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border-2 transition-all ${
                  ativo
                    ? COR_ABA_ATIVA[g.cor]
                    : completo
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
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
        </div>
      </div>

      {/* ── BUSCA + FILTRO ── */}
      <div className="bg-gray-50/80 border-b border-gray-100 px-3 py-2 flex gap-2 sticky top-[calc(var(--header-h,88px)+52px)] z-[9]">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text" value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome ou código..."
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-[#7D1F2C]/30 focus:border-[#7D1F2C]"
          />
        </div>
        <button
          onClick={() => setFiltroPendentes(!filtroPendentes)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
            filtroPendentes
              ? 'bg-amber-500 text-white border-amber-500'
              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
          }`}>
          <Filter className="w-3.5 h-3.5" />
          Pendentes
        </button>
      </div>

      {/* ── LISTA DE CARDS ── */}
      <div className="flex-1 overflow-auto px-3 py-3 space-y-2">
        {itensFiltrados.length === 0 && (
          <div className="py-16 text-center text-gray-400">
            <p className="text-sm">
              {searchTerm ? 'Nenhum item encontrado' : filtroPendentes ? '✅ Todos os itens contados neste grupo!' : 'Nenhum item neste grupo'}
            </p>
          </div>
        )}

        {itensFiltrados.map(item => {
          const isContado   = item.quantidade_contada !== null;
          const isSaving    = savingItems.has(item.id);
          const isSaved     = savedItems.has(item.id);
          const hasError    = errorItems.has(item.id);
          const dif         = item.diferenca;
          const grupo       = GRUPOS.find(g => g.key === (item.grupo_contagem || 'outros'));

          return (
            <div
              key={item.id}
              className={`bg-white rounded-2xl border-2 shadow-sm transition-all ${
                hasError    ? 'border-red-300'
                : isContado && dif === 0 ? 'border-green-200'
                : isContado && dif !== 0 ? 'border-orange-300'
                : 'border-gray-100'
              }`}>

              {/* Cabeçalho do card */}
              <div className={`flex items-start justify-between px-4 pt-3 pb-2 ${
                isContado && dif === 0 ? 'bg-green-50/50 rounded-t-2xl'
                : isContado && dif !== 0 ? 'bg-orange-50/50 rounded-t-2xl'
                : ''
              }`}>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm leading-tight">{item.item_nome}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {item.item_codigo && (
                      <span className="text-[11px] text-gray-400">{item.item_codigo}</span>
                    )}
                    {grupo && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${COR_BADGE[grupo.cor]}`}>
                        {grupo.emoji} {grupo.label}
                      </span>
                    )}
                  </div>
                </div>
                {/* Status */}
                <div className="ml-3 shrink-0">
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                  ) : isSaved ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : hasError ? (
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  ) : isContado ? (
                    <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-white" />
                    </div>
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                  )}
                </div>
              </div>

              {/* Corpo do card */}
              <div className="px-4 pb-3 space-y-3">
                {/* Linha sistema vs contado */}
                <div className="flex items-center gap-3">
                  {/* Sistema */}
                  <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2 text-center">
                    <p className="text-[10px] text-gray-500 uppercase font-medium">Sistema</p>
                    <p className="text-lg font-bold text-gray-700 tabular-nums leading-tight">
                      {item.quantidade_sistema}
                    </p>
                    <p className="text-[10px] text-gray-400">{item.unidade_medida}</p>
                  </div>

                  {/* Input contado */}
                  <div className="flex-1">
                    <p className="text-[10px] text-gray-500 uppercase font-medium text-center mb-1">Contado</p>
                    <input
                      ref={el => { if (el) inputRefs.current.set(`qty-${item.id}`, el); }}
                      type="number"
                      inputMode="decimal"
                      step="0.001"
                      value={item.quantidade_contada === null ? '' : item.quantidade_contada}
                      onChange={e => handleQuantidadeChange(item.id, e.target.value)}
                      placeholder="—"
                      className={`w-full text-center text-2xl font-bold border-2 rounded-xl py-2 focus:outline-none focus:ring-2 transition-colors tabular-nums ${
                        hasError
                          ? 'border-red-300 bg-red-50 text-red-700 focus:ring-red-300'
                          : isContado && dif === 0
                          ? 'border-green-300 bg-green-50/70 text-green-800 focus:ring-green-300'
                          : isContado && dif !== 0
                          ? 'border-orange-300 bg-orange-50/70 text-orange-800 focus:ring-orange-300'
                          : 'border-gray-200 bg-white text-gray-900 focus:ring-[#7D1F2C]/30 focus:border-[#7D1F2C]'
                      }`}
                    />
                  </div>

                  {/* Diferença */}
                  {isContado && dif !== null && (
                    <div className="w-20 text-center">
                      <p className="text-[10px] text-gray-500 uppercase font-medium mb-1">Dif.</p>
                      <div className={`rounded-xl px-2 py-2 ${
                        dif > 0 ? 'bg-green-100' : dif < 0 ? 'bg-red-100' : 'bg-gray-100'
                      }`}>
                        <p className={`text-sm font-bold tabular-nums ${
                          dif > 0 ? 'text-green-700' : dif < 0 ? 'text-red-700' : 'text-gray-500'
                        }`}>
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
                <input
                  type="text"
                  value={item.observacao || ''}
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
