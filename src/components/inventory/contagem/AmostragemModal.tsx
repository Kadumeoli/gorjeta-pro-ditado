import React, { useEffect, useState, useMemo } from 'react';
import {
  X,
  BarChart3,
  Loader2,
  Package,
  Info,
  Shuffle,
  TrendingUp,
  AlertTriangle,
  Target,
} from 'lucide-react';
import type { Estoque } from './types';
import * as service from './contagemService';
import { useAuth } from '../../../contexts/AuthContext';
import { formatCurrency } from '../../../utils/currency';

interface Props {
  onClose: () => void;
  onCreated: (contagemId: string) => void;
}

type MetodoAmostragem = 'aleatorio' | 'abc_valor' | 'maior_divergencia';
type NivelConfianca = 90 | 95 | 99;
type MargemErro = 1 | 3 | 5 | 10;

interface ItemEstoque {
  id: string;
  nome: string;
  codigo: string;
  unidade_medida: string;
  saldo: number;
  valor_unitario: number;
  valor_total: number;
}

const Z_SCORES: Record<NivelConfianca, number> = {
  90: 1.645,
  95: 1.96,
  99: 2.576,
};

function calcularTamanhoAmostra(
  populacao: number,
  confianca: NivelConfianca,
  margem: MargemErro
): number {
  const z = Z_SCORES[confianca];
  const p = 0.5;
  const e = margem / 100;
  const nInfinito = (z * z * p * (1 - p)) / (e * e);
  const nAjustado = nInfinito / (1 + (nInfinito - 1) / populacao);
  return Math.ceil(Math.min(nAjustado, populacao));
}

function selecionarItensAleatorio(itens: ItemEstoque[], tamanho: number): ItemEstoque[] {
  const shuffled = [...itens].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, tamanho);
}

function selecionarItensABC(itens: ItemEstoque[], tamanho: number): ItemEstoque[] {
  const sorted = [...itens].sort((a, b) => b.valor_total - a.valor_total);
  const totalValor = sorted.reduce((s, i) => s + i.valor_total, 0);

  let acumulado = 0;
  const classificados = sorted.map((item) => {
    acumulado += item.valor_total;
    const pct = totalValor > 0 ? (acumulado / totalValor) * 100 : 0;
    const classe = pct <= 80 ? 'A' : pct <= 95 ? 'B' : 'C';
    return { ...item, classe };
  });

  const classA = classificados.filter((i) => i.classe === 'A');
  const classB = classificados.filter((i) => i.classe === 'B');
  const classC = classificados.filter((i) => i.classe === 'C');

  const propA = Math.ceil(tamanho * 0.6);
  const propB = Math.ceil(tamanho * 0.25);
  const propC = tamanho - propA - propB;

  const selecionados = [
    ...classA.slice(0, Math.min(propA, classA.length)),
    ...classB.sort(() => Math.random() - 0.5).slice(0, Math.min(propB, classB.length)),
    ...classC.sort(() => Math.random() - 0.5).slice(0, Math.min(propC, classC.length)),
  ];

  while (selecionados.length < tamanho && selecionados.length < itens.length) {
    const ids = new Set(selecionados.map((i) => i.id));
    const restantes = itens.filter((i) => !ids.has(i.id));
    if (restantes.length === 0) break;
    selecionados.push(restantes[Math.floor(Math.random() * restantes.length)]);
  }

  return selecionados.slice(0, tamanho);
}

function selecionarItensMaiorValor(itens: ItemEstoque[], tamanho: number): ItemEstoque[] {
  const sorted = [...itens].sort((a, b) => b.valor_total - a.valor_total);
  return sorted.slice(0, tamanho);
}

const AmostragemModal: React.FC<Props> = ({ onClose, onCreated }) => {
  const { usuario } = useAuth();
  const [estoques, setEstoques] = useState<Estoque[]>([]);
  const [estoqueId, setEstoqueId] = useState('');
  const [responsavel, setResponsavel] = useState(usuario?.nome_completo || '');
  const [metodo, setMetodo] = useState<MetodoAmostragem>('abc_valor');
  const [confianca, setConfianca] = useState<NivelConfianca>(95);
  const [margem, setMargem] = useState<MargemErro>(5);
  const [loadingEstoques, setLoadingEstoques] = useState(true);
  const [loadingItens, setLoadingItens] = useState(false);
  const [criando, setCriando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [itensEstoque, setItensEstoque] = useState<ItemEstoque[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [itensSelecionados, setItensSelecionados] = useState<ItemEstoque[]>([]);

  useEffect(() => {
    service.loadEstoques().then((data) => {
      setEstoques(data);
      setLoadingEstoques(false);
    });
  }, []);

  useEffect(() => {
    if (!estoqueId) {
      setItensEstoque([]);
      setShowPreview(false);
      return;
    }
    setLoadingItens(true);
    service.loadItensEstoqueComSaldo(estoqueId).then((data) => {
      setItensEstoque(data);
      setLoadingItens(false);
      setShowPreview(false);
    }).catch(() => setLoadingItens(false));
  }, [estoqueId]);

  const populacao = itensEstoque.length;
  const tamanhoAmostra = useMemo(
    () => (populacao > 0 ? calcularTamanhoAmostra(populacao, confianca, margem) : 0),
    [populacao, confianca, margem]
  );
  const percentual = populacao > 0 ? ((tamanhoAmostra / populacao) * 100).toFixed(1) : '0';

  const handlePreview = () => {
    if (itensEstoque.length === 0) return;
    let selecionados: ItemEstoque[];
    switch (metodo) {
      case 'aleatorio':
        selecionados = selecionarItensAleatorio(itensEstoque, tamanhoAmostra);
        break;
      case 'abc_valor':
        selecionados = selecionarItensABC(itensEstoque, tamanhoAmostra);
        break;
      case 'maior_divergencia':
        selecionados = selecionarItensMaiorValor(itensEstoque, tamanhoAmostra);
        break;
      default:
        selecionados = selecionarItensAleatorio(itensEstoque, tamanhoAmostra);
    }
    setItensSelecionados(selecionados);
    setShowPreview(true);
  };

  const handleCriar = async () => {
    if (!estoqueId || !responsavel.trim() || itensSelecionados.length === 0) return;

    setCriando(true);
    setError(null);
    try {
      const contagemId = await service.criarContagemAmostragem({
        estoque_id: estoqueId,
        responsavel: responsavel.trim(),
        observacoes: `Amostragem estatistica: ${metodo === 'aleatorio' ? 'Aleatoria' : metodo === 'abc_valor' ? 'Curva ABC' : 'Maior valor'} | Confianca: ${confianca}% | Margem: ${margem}% | Amostra: ${itensSelecionados.length}/${populacao} itens (${percentual}%)`,
        criado_por: usuario?.id,
        item_ids: itensSelecionados.map((i) => i.id),
      });
      onCreated(contagemId);
    } catch (err: any) {
      setError(err.message || 'Erro ao criar contagem por amostragem');
    } finally {
      setCriando(false);
    }
  };

  const valorTotalAmostra = itensSelecionados.reduce((s, i) => s + i.valor_total, 0);
  const valorTotalEstoque = itensEstoque.reduce((s, i) => s + i.valor_total, 0);
  const coberturaValor = valorTotalEstoque > 0 ? ((valorTotalAmostra / valorTotalEstoque) * 100).toFixed(1) : '0';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-600 to-emerald-500 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Recontagem por Amostragem</h3>
              <p className="text-xs text-gray-500">Selecao estatistica de itens para verificacao</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Estoque</label>
              {loadingEstoques ? (
                <div className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Carregando...
                </div>
              ) : (
                <select
                  value={estoqueId}
                  onChange={(e) => setEstoqueId(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
                  required
                >
                  <option value="">Selecione o estoque</option>
                  {estoques.map((e) => (
                    <option key={e.id} value={e.id}>{e.nome}</option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Responsavel</label>
              <input
                type="text"
                value={responsavel}
                onChange={(e) => setResponsavel(e.target.value)}
                placeholder="Nome do responsavel"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Metodo de Amostragem</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  value: 'abc_valor' as MetodoAmostragem,
                  label: 'Curva ABC',
                  desc: 'Prioriza itens de maior valor',
                  icon: <TrendingUp className="w-4 h-4" />,
                },
                {
                  value: 'aleatorio' as MetodoAmostragem,
                  label: 'Aleatorio',
                  desc: 'Selecao aleatoria uniforme',
                  icon: <Shuffle className="w-4 h-4" />,
                },
                {
                  value: 'maior_divergencia' as MetodoAmostragem,
                  label: 'Maior Valor',
                  desc: 'Itens mais caros do estoque',
                  icon: <Target className="w-4 h-4" />,
                },
              ].map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => { setMetodo(m.value); setShowPreview(false); }}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    metodo === m.value
                      ? 'border-teal-500 bg-teal-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={metodo === m.value ? 'text-teal-600' : 'text-gray-400'}>{m.icon}</span>
                    <span className={`text-sm font-semibold ${metodo === m.value ? 'text-teal-700' : 'text-gray-700'}`}>
                      {m.label}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500">{m.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nivel de Confianca</label>
              <select
                value={confianca}
                onChange={(e) => { setConfianca(Number(e.target.value) as NivelConfianca); setShowPreview(false); }}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
              >
                <option value={90}>90% - Aceitavel</option>
                <option value={95}>95% - Recomendado</option>
                <option value={99}>99% - Rigoroso</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Margem de Erro</label>
              <select
                value={margem}
                onChange={(e) => { setMargem(Number(e.target.value) as MargemErro); setShowPreview(false); }}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
              >
                <option value={1}>1% - Alta precisao</option>
                <option value={3}>3% - Boa precisao</option>
                <option value={5}>5% - Padrao</option>
                <option value={10}>10% - Rapida</option>
              </select>
            </div>
          </div>

          {estoqueId && !loadingItens && populacao > 0 && (
            <div className="bg-gradient-to-r from-teal-50 to-emerald-50 rounded-xl p-4 border border-teal-100">
              <div className="flex items-start gap-2 mb-3">
                <Info className="w-4 h-4 text-teal-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-teal-800 font-medium">Calculo da Amostra</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="text-center p-2 bg-white/70 rounded-lg">
                  <p className="text-lg font-bold text-gray-900">{populacao}</p>
                  <p className="text-[10px] text-gray-500 uppercase">Total Itens</p>
                </div>
                <div className="text-center p-2 bg-white/70 rounded-lg">
                  <p className="text-lg font-bold text-teal-700">{tamanhoAmostra}</p>
                  <p className="text-[10px] text-gray-500 uppercase">Amostra</p>
                </div>
                <div className="text-center p-2 bg-white/70 rounded-lg">
                  <p className="text-lg font-bold text-teal-600">{percentual}%</p>
                  <p className="text-[10px] text-gray-500 uppercase">Cobertura</p>
                </div>
                <div className="text-center p-2 bg-white/70 rounded-lg">
                  <p className="text-sm font-bold text-gray-700">{formatCurrency(valorTotalEstoque)}</p>
                  <p className="text-[10px] text-gray-500 uppercase">Valor Total</p>
                </div>
              </div>
              <p className="text-[11px] text-teal-600 mt-2">
                Formula: n = (Z^2 * p * q) / E^2 ajustado para populacao finita (N={populacao})
              </p>
            </div>
          )}

          {loadingItens && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400 mr-2" />
              <span className="text-sm text-gray-500">Carregando itens do estoque...</span>
            </div>
          )}

          {estoqueId && !loadingItens && populacao === 0 && (
            <div className="flex items-center gap-2 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <p className="text-sm text-amber-700">Nenhum item com saldo encontrado neste estoque.</p>
            </div>
          )}

          {!showPreview && estoqueId && populacao > 0 && !loadingItens && (
            <button
              type="button"
              onClick={handlePreview}
              className="w-full py-2.5 bg-white border-2 border-teal-200 text-teal-700 rounded-xl text-sm font-semibold hover:bg-teal-50 transition-colors"
            >
              Gerar Amostra ({tamanhoAmostra} itens)
            </button>
          )}

          {showPreview && itensSelecionados.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-700">
                  Itens Selecionados ({itensSelecionados.length})
                </h4>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span>Cobertura em valor: <strong className="text-teal-700">{coberturaValor}%</strong></span>
                  <button
                    type="button"
                    onClick={handlePreview}
                    className="text-teal-600 hover:text-teal-800 font-medium flex items-center gap-1"
                  >
                    <Shuffle className="w-3 h-3" />
                    Resortear
                  </button>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden max-h-48 overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase">Item</th>
                      <th className="px-3 py-2 text-center text-[10px] font-semibold text-gray-500 uppercase w-20">Saldo</th>
                      <th className="px-3 py-2 text-right text-[10px] font-semibold text-gray-500 uppercase w-24">Valor Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {itensSelecionados.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50/50">
                        <td className="px-3 py-1.5">
                          <span className="text-sm font-medium text-gray-900">{item.nome}</span>
                          <span className="text-[10px] text-gray-400 ml-2">{item.codigo}</span>
                        </td>
                        <td className="px-3 py-1.5 text-center text-sm text-gray-700 tabular-nums">
                          {item.saldo} {item.unidade_medida}
                        </td>
                        <td className="px-3 py-1.5 text-right text-sm font-medium text-gray-900 tabular-nums">
                          {formatCurrency(item.valor_total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleCriar}
            disabled={criando || !showPreview || itensSelecionados.length === 0 || !responsavel.trim()}
            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-500 text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
          >
            {criando ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Criando...
              </>
            ) : (
              <>
                <BarChart3 className="w-4 h-4" />
                Iniciar Amostragem
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AmostragemModal;
