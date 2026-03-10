import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  Search,
  ArrowLeft,
  CheckSquare,
  Calculator,
  TrendingUp,
  TrendingDown,
  Loader2,
  Filter,
  Check,
  Minus,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { ContagemItem, ContagemStats, FilterMode } from './types';
import * as service from './contagemService';
import { formatCurrency } from '../../../utils/currency';

interface Props {
  contagemId: string;
  estoqueName: string;
  onVoltar: () => void;
  onFinalizar: () => void;
}

const FILTERS: { value: FilterMode; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'pendentes', label: 'Pendentes' },
  { value: 'contados', label: 'Contados' },
  { value: 'divergentes', label: 'Divergentes' },
  { value: 'sobras', label: 'Sobras' },
  { value: 'perdas', label: 'Perdas' },
];

const ContagemContador: React.FC<Props> = ({
  contagemId,
  estoqueName,
  onVoltar,
  onFinalizar,
}) => {
  const [itens, setItens] = useState<ContagemItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('todos');
  const [savingItems, setSavingItems] = useState<Set<string>>(new Set());
  const [savedItems, setSavedItems] = useState<Set<string>>(new Set());
  const [errorItems, setErrorItems] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'nome' | 'codigo' | 'diferenca'>('nome');
  const [sortAsc, setSortAsc] = useState(true);

  const debounceTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const searchRef = useRef<HTMLInputElement>(null);
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  useEffect(() => {
    loadItems();
    return () => {
      debounceTimers.current.forEach((t) => clearTimeout(t));
    };
  }, [contagemId]);

  const loadItems = async () => {
    setLoading(true);
    try {
      const data = await service.loadItensContagem(contagemId);
      setItens(data);
    } catch (err) {
      console.error('Erro ao carregar itens:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleQuantidadeChange = useCallback(
    (itemId: string, value: string) => {
      const parsed = value === '' ? null : parseFloat(value);
      const isValid = parsed === null || !isNaN(parsed);
      if (!isValid) return;

      setItens((prev) =>
        prev.map((item) => {
          if (item.id !== itemId) return item;
          const diff = parsed !== null ? parsed - item.quantidade_sistema : null;
          const valDiff = diff !== null ? diff * item.valor_unitario : null;
          return {
            ...item,
            quantidade_contada: parsed,
            diferenca: diff,
            valor_diferenca: valDiff,
          };
        })
      );

      setSavedItems((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
      setErrorItems((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });

      const key = `qty-${itemId}`;
      const existing = debounceTimers.current.get(key);
      if (existing) clearTimeout(existing);

      debounceTimers.current.set(
        key,
        setTimeout(async () => {
          debounceTimers.current.delete(key);
          setSavingItems((prev) => new Set(prev).add(itemId));
          try {
            await service.atualizarItem(itemId, { quantidade_contada: parsed });
            setSavedItems((prev) => new Set(prev).add(itemId));
            setTimeout(() => {
              setSavedItems((prev) => {
                const next = new Set(prev);
                next.delete(itemId);
                return next;
              });
            }, 2000);
          } catch {
            setErrorItems((prev) => new Set(prev).add(itemId));
          } finally {
            setSavingItems((prev) => {
              const next = new Set(prev);
              next.delete(itemId);
              return next;
            });
          }
        }, 600)
      );
    },
    []
  );

  const handleObservacaoChange = useCallback((itemId: string, value: string) => {
    setItens((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, observacao: value } : item))
    );

    const key = `obs-${itemId}`;
    const existing = debounceTimers.current.get(key);
    if (existing) clearTimeout(existing);

    debounceTimers.current.set(
      key,
      setTimeout(async () => {
        debounceTimers.current.delete(key);
        try {
          await service.atualizarItem(itemId, { observacao: value || '' });
        } catch (err) {
          console.error('Erro ao salvar observacao:', err);
        }
      }, 800)
    );
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>, itemId: string, field: 'qty' | 'obs') => {
      if (e.key === 'Enter' || (e.key === 'Tab' && !e.shiftKey)) {
        const filtered = filteredItens;
        const currentIndex = filtered.findIndex((i) => i.id === itemId);
        if (currentIndex < filtered.length - 1) {
          const nextItem = filtered[currentIndex + 1];
          const nextRef = inputRefs.current.get(`${field}-${nextItem.id}`);
          if (nextRef) {
            e.preventDefault();
            nextRef.focus();
            if (field === 'qty') nextRef.select();
          }
        }
      }
    },
    [itens, searchTerm, filterMode, sortBy, sortAsc]
  );

  const stats: ContagemStats = useMemo(() => {
    const contados = itens.filter((i) => i.quantidade_contada !== null);
    const comDif = contados.filter((i) => i.diferenca !== null && i.diferenca !== 0);
    const sobras = comDif.filter((i) => i.diferenca! > 0);
    const perdas = comDif.filter((i) => i.diferenca! < 0);

    return {
      totalItens: itens.length,
      contados: contados.length,
      pendentes: itens.length - contados.length,
      comDiferenca: comDif.length,
      sobras: sobras.length,
      perdas: perdas.length,
      valorSobras: sobras.reduce((s, i) => s + (i.valor_diferenca || 0), 0),
      valorPerdas: Math.abs(perdas.reduce((s, i) => s + (i.valor_diferenca || 0), 0)),
    };
  }, [itens]);

  const filteredItens = useMemo(() => {
    let result = itens;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (i) =>
          i.item_nome.toLowerCase().includes(term) || i.item_codigo.toLowerCase().includes(term)
      );
    }

    switch (filterMode) {
      case 'pendentes':
        result = result.filter((i) => i.quantidade_contada === null);
        break;
      case 'contados':
        result = result.filter((i) => i.quantidade_contada !== null);
        break;
      case 'divergentes':
        result = result.filter(
          (i) => i.quantidade_contada !== null && i.diferenca !== null && i.diferenca !== 0
        );
        break;
      case 'sobras':
        result = result.filter(
          (i) => i.quantidade_contada !== null && i.diferenca !== null && i.diferenca > 0
        );
        break;
      case 'perdas':
        result = result.filter(
          (i) => i.quantidade_contada !== null && i.diferenca !== null && i.diferenca < 0
        );
        break;
    }

    result = [...result].sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case 'nome':
          cmp = a.item_nome.localeCompare(b.item_nome);
          break;
        case 'codigo':
          cmp = (a.item_codigo || '').localeCompare(b.item_codigo || '');
          break;
        case 'diferenca':
          cmp = (a.diferenca || 0) - (b.diferenca || 0);
          break;
      }
      return sortAsc ? cmp : -cmp;
    });

    return result;
  }, [itens, searchTerm, filterMode, sortBy, sortAsc]);

  const progressPct = stats.totalItens > 0 ? (stats.contados / stats.totalItens) * 100 : 0;

  const handleSort = (col: 'nome' | 'codigo' | 'diferenca') => {
    if (sortBy === col) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(col);
      setSortAsc(true);
    }
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (sortBy !== col) return null;
    return sortAsc ? (
      <ChevronUp className="w-3 h-3" />
    ) : (
      <ChevronDown className="w-3 h-3" />
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <p className="text-sm text-gray-500">Carregando itens da contagem...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-20">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onVoltar}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{estoqueName}</h2>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>
                  {stats.contados}/{stats.totalItens} itens contados
                </span>
                {stats.comDiferenca > 0 && (
                  <span className="text-orange-600 font-medium">
                    {stats.comDiferenca} divergencias
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onFinalizar}
            disabled={stats.contados === 0}
            className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 shadow-md transition-all"
          >
            <Calculator className="w-4 h-4" />
            Finalizar Contagem
          </button>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-gray-600 tabular-nums">
            {Math.round(progressPct)}%
          </span>
        </div>
      </div>

      <div className="bg-white border-b border-gray-100 px-4 py-2.5 flex flex-col sm:flex-row gap-2 sticky top-[88px] z-10">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            ref={searchRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder='Buscar item por nome ou codigo... (tecle "/" para focar)'
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {FILTERS.map((f) => {
            const active = filterMode === f.value;
            let count = 0;
            switch (f.value) {
              case 'todos':
                count = stats.totalItens;
                break;
              case 'pendentes':
                count = stats.pendentes;
                break;
              case 'contados':
                count = stats.contados;
                break;
              case 'divergentes':
                count = stats.comDiferenca;
                break;
              case 'sobras':
                count = stats.sobras;
                break;
              case 'perdas':
                count = stats.perdas;
                break;
            }
            return (
              <button
                key={f.value}
                onClick={() => setFilterMode(f.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
                  active
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f.label}
                <span
                  className={`text-[10px] px-1 rounded ${active ? 'bg-blue-500 text-blue-100' : 'bg-gray-200 text-gray-500'}`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex gap-4 px-4 py-2.5 bg-gray-50/50 border-b border-gray-100 overflow-x-auto">
        <div className="flex items-center gap-1.5 text-xs">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-gray-600">
            Sobras: <strong className="text-green-700">{formatCurrency(stats.valorSobras)}</strong>
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-gray-600">
            Perdas: <strong className="text-red-700">{formatCurrency(stats.valorPerdas)}</strong>
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-gray-600">
            Resultado:{' '}
            <strong
              className={
                stats.valorSobras - stats.valorPerdas >= 0 ? 'text-green-700' : 'text-red-700'
              }
            >
              {formatCurrency(stats.valorSobras - stats.valorPerdas)}
            </strong>
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-[5]">
            <tr>
              <th className="w-8 px-3 py-2.5"></th>
              <th
                className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none"
                onClick={() => handleSort('nome')}
              >
                <span className="inline-flex items-center gap-1">
                  Item <SortIcon col="nome" />
                </span>
              </th>
              <th className="px-3 py-2.5 text-center text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-28">
                Sistema
              </th>
              <th className="px-3 py-2.5 text-center text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-32">
                Contado
              </th>
              <th
                className="px-3 py-2.5 text-center text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-28 cursor-pointer hover:text-gray-700 select-none"
                onClick={() => handleSort('diferenca')}
              >
                <span className="inline-flex items-center gap-1">
                  Diferenca <SortIcon col="diferenca" />
                </span>
              </th>
              <th className="px-3 py-2.5 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-28">
                Valor Dif.
              </th>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                Obs.
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredItens.map((item) => {
              const isContado = item.quantidade_contada !== null;
              const isSaving = savingItems.has(item.id);
              const isSaved = savedItems.has(item.id);
              const hasError = errorItems.has(item.id);
              const dif = item.diferenca;

              return (
                <tr
                  key={item.id}
                  className={`transition-colors ${
                    !isContado
                      ? 'bg-amber-50/40 hover:bg-amber-50/70'
                      : dif && dif !== 0
                        ? 'hover:bg-gray-50'
                        : 'hover:bg-gray-50'
                  }`}
                >
                  <td className="px-3 py-2 text-center">
                    {isSaving ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400 mx-auto" />
                    ) : isSaved ? (
                      <Check className="w-3.5 h-3.5 text-green-500 mx-auto" />
                    ) : hasError ? (
                      <AlertCircle className="w-3.5 h-3.5 text-red-500 mx-auto" />
                    ) : isContado ? (
                      <CheckSquare className="w-3.5 h-3.5 text-green-400 mx-auto" />
                    ) : (
                      <div className="w-3.5 h-3.5 border-2 border-gray-300 rounded mx-auto" />
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium text-gray-900 text-sm leading-tight">
                      {item.item_nome}
                    </div>
                    <div className="text-[11px] text-gray-400">{item.item_codigo}</div>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className="text-sm font-medium text-gray-700 tabular-nums">
                      {item.quantidade_sistema}
                    </span>
                    <span className="text-[10px] text-gray-400 ml-1">{item.unidade_medida}</span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <input
                      ref={(el) => {
                        if (el) inputRefs.current.set(`qty-${item.id}`, el);
                      }}
                      type="number"
                      step="0.001"
                      value={item.quantidade_contada === null ? '' : item.quantidade_contada}
                      onChange={(e) => handleQuantidadeChange(item.id, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, item.id, 'qty')}
                      className={`w-full px-2 py-1.5 text-center text-sm font-semibold border rounded-lg tabular-nums transition-colors ${
                        hasError
                          ? 'border-red-300 bg-red-50 text-red-700 focus:ring-red-500'
                          : isContado
                            ? 'border-green-200 bg-green-50/50 text-gray-900 focus:ring-green-500'
                            : 'border-gray-200 bg-white text-gray-700 focus:ring-blue-500'
                      } focus:ring-2 focus:border-transparent`}
                      placeholder="-"
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    {isContado && dif !== null && (
                      <span
                        className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md font-semibold text-xs tabular-nums ${
                          dif > 0
                            ? 'bg-green-100 text-green-700'
                            : dif < 0
                              ? 'bg-red-100 text-red-700'
                              : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {dif > 0 && <TrendingUp className="w-3 h-3" />}
                        {dif < 0 && <TrendingDown className="w-3 h-3" />}
                        {dif === 0 && <Minus className="w-3 h-3" />}
                        {dif > 0 ? '+' : ''}
                        {dif.toFixed(3)}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {isContado && item.valor_diferenca !== null && item.valor_diferenca !== 0 && (
                      <span
                        className={`text-xs font-semibold tabular-nums ${
                          item.valor_diferenca > 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {item.valor_diferenca > 0 ? '+' : ''}
                        {formatCurrency(item.valor_diferenca)}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <input
                      ref={(el) => {
                        if (el) inputRefs.current.set(`obs-${item.id}`, el);
                      }}
                      type="text"
                      value={item.observacao || ''}
                      onChange={(e) => handleObservacaoChange(item.id, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, item.id, 'obs')}
                      className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                      placeholder="..."
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredItens.length === 0 && (
          <div className="py-16 text-center">
            <Filter className="w-8 h-8 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">
              {searchTerm
                ? 'Nenhum item encontrado para esta busca'
                : 'Nenhum item neste filtro'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContagemContador;
