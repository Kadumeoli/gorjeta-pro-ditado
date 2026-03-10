import React, { useEffect, useState, useMemo } from 'react';
import {
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Calculator,
  RefreshCw,
  Download,
  FileText,
  Loader2,
  Package,
  Minus,
} from 'lucide-react';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import type { ContagemResultado as ResultadoType, ContagemItem } from './types';
import * as service from './contagemService';
import { formatCurrency } from '../../../utils/currency';
import { useAuth } from '../../../contexts/AuthContext';
import { ReportGenerator } from '../../../utils/reportGenerator';

interface Props {
  contagemId: string;
  onVoltar: () => void;
  onReconferir: () => void;
  onProcessado: () => void;
}

type ResultFilter = 'todos' | 'divergentes' | 'sobras' | 'perdas' | 'ok';

const ContagemResultado: React.FC<Props> = ({
  contagemId,
  onVoltar,
  onReconferir,
  onProcessado,
}) => {
  const { usuario } = useAuth();
  const [resultado, setResultado] = useState<ResultadoType | null>(null);
  const [loading, setLoading] = useState(true);
  const [processando, setProcessando] = useState(false);
  const [filter, setFilter] = useState<ResultFilter>('divergentes');

  useEffect(() => {
    loadResultado();
  }, [contagemId]);

  const loadResultado = async () => {
    setLoading(true);
    try {
      const data = await service.loadContagemCompleta(contagemId);
      setResultado(data);
    } catch (err) {
      console.error('Erro ao carregar resultado:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessar = async () => {
    if (
      !confirm(
        'Deseja processar os ajustes? Sera criada uma movimentacao de estoque para cada diferenca encontrada.'
      )
    )
      return;

    setProcessando(true);
    try {
      const result = await service.processarContagem(contagemId, usuario?.id);
      if (result?.success === false) {
        alert(result.error || 'Erro ao processar');
        return;
      }
      alert(result?.message || 'Ajustes processados com sucesso!');
      onProcessado();
    } catch (err: any) {
      alert('Erro ao processar: ' + err.message);
    } finally {
      setProcessando(false);
    }
  };

  const handleReconferir = async () => {
    if (!confirm('Deseja reabrir esta contagem para reconferencia?')) return;
    try {
      const result = await service.reabrirContagem(contagemId);
      if (result?.success === false) {
        alert(result.error || 'Erro ao reabrir');
        return;
      }
      onReconferir();
    } catch (err: any) {
      alert('Erro ao reabrir: ' + err.message);
    }
  };

  const exportarXLSX = () => {
    if (!resultado) return;

    const rows = resultado.itens
      .filter((i) => i.quantidade_contada !== null)
      .map((item) => ({
        Codigo: item.item_codigo,
        Item: item.item_nome,
        Unidade: item.unidade_medida,
        'Qtd. Sistema': item.quantidade_sistema,
        'Qtd. Contada': item.quantidade_contada,
        Diferenca: item.diferenca,
        'Valor Unit.': item.valor_unitario,
        'Valor Diferenca': item.valor_diferenca,
        Observacao: item.observacao || '',
      }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Resultado Contagem');
    const fileName = `contagem_${resultado.contagem.estoque_nome}_${dayjs().format('YYYY-MM-DD')}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const exportarPDF = () => {
    if (!resultado || !stats) return;

    const report = new ReportGenerator({ orientation: 'landscape' });
    const dataContagem = dayjs(resultado.contagem.data_contagem).format('DD/MM/YYYY HH:mm');
    let y = report.addHeader(
      'Resultado de Contagem de Estoque',
      `${resultado.contagem.estoque_nome} - ${dataContagem}`
    );

    const acuraciaVal = stats.contados > 0 ? ((stats.ok / stats.contados) * 100).toFixed(1) : '0';
    const resumoData = [
      ['Responsavel', resultado.contagem.responsavel],
      ['Itens Contados', String(stats.contados)],
      ['Acuracia', `${acuraciaVal}%`],
      ['Divergencias', String(stats.comDiferenca)],
      ['Sobras', `${stats.sobras} itens - ${formatCurrency(stats.valorSobras)}`],
      ['Perdas', `${stats.perdas} itens - ${formatCurrency(stats.valorPerdas)}`],
      ['Impacto Liquido', `${stats.valorLiquido >= 0 ? '+' : ''}${formatCurrency(stats.valorLiquido)}`],
      ['Status', resultado.contagem.status === 'processada' ? 'Processada' : 'Finalizada'],
    ];
    y = report.addTable(['Indicador', 'Valor'], resumoData, y);

    const contados = resultado.itens.filter((i) => i.quantidade_contada !== null);
    const divergentes = contados.filter((i) => i.diferenca !== null && i.diferenca !== 0);

    if (divergentes.length > 0) {
      y += 5;
      report.pdf.setFontSize(12);
      report.pdf.setFont('helvetica', 'bold');
      report.pdf.text('Itens com Divergencia', 20, y);
      y += 8;

      const tableHeaders = ['Codigo', 'Item', 'Unidade', 'Sistema', 'Contado', 'Diferenca', 'Val. Unit.', 'Val. Dif.', 'Obs.'];
      const tableData = divergentes.map((item) => [
        item.item_codigo,
        item.item_nome,
        item.unidade_medida,
        String(item.quantidade_sistema),
        String(item.quantidade_contada),
        `${item.diferenca! > 0 ? '+' : ''}${item.diferenca}`,
        formatCurrency(item.valor_unitario),
        `${item.valor_diferenca! > 0 ? '+' : ''}${formatCurrency(item.valor_diferenca || 0)}`,
        item.observacao || '',
      ]);
      y = report.addTable(tableHeaders, tableData, y);
    }

    if (contados.length > divergentes.length) {
      const okItens = contados.filter((i) => i.diferenca === 0);
      if (okItens.length > 0) {
        y += 5;
        report.pdf.setFontSize(12);
        report.pdf.setFont('helvetica', 'bold');
        report.pdf.text(`Itens Conferidos OK (${okItens.length})`, 20, y);
        y += 8;

        const okHeaders = ['Codigo', 'Item', 'Unidade', 'Qtd. Sistema', 'Qtd. Contada'];
        const okData = okItens.map((item) => [
          item.item_codigo,
          item.item_nome,
          item.unidade_medida,
          String(item.quantidade_sistema),
          String(item.quantidade_contada),
        ]);
        report.addTable(okHeaders, okData, y);
      }
    }

    const fileName = `contagem_${resultado.contagem.estoque_nome}_${dayjs().format('YYYY-MM-DD')}.pdf`;
    report.save(fileName);
  };

  const stats = useMemo(() => {
    if (!resultado) return null;
    const contados = resultado.itens.filter((i) => i.quantidade_contada !== null);
    const comDif = contados.filter((i) => i.diferenca !== null && i.diferenca !== 0);
    const sobras = comDif.filter((i) => i.diferenca! > 0);
    const perdas = comDif.filter((i) => i.diferenca! < 0);
    const ok = contados.filter((i) => i.diferenca === 0);

    return {
      contados: contados.length,
      comDiferenca: comDif.length,
      ok: ok.length,
      sobras: sobras.length,
      perdas: perdas.length,
      valorSobras: sobras.reduce((s, i) => s + (i.valor_diferenca || 0), 0),
      valorPerdas: Math.abs(perdas.reduce((s, i) => s + (i.valor_diferenca || 0), 0)),
      valorLiquido: contados.reduce((s, i) => s + (i.valor_diferenca || 0), 0),
    };
  }, [resultado]);

  const filteredItens = useMemo(() => {
    if (!resultado) return [];
    const contados = resultado.itens.filter((i) => i.quantidade_contada !== null);
    switch (filter) {
      case 'divergentes':
        return contados.filter((i) => i.diferenca !== null && i.diferenca !== 0);
      case 'sobras':
        return contados.filter((i) => i.diferenca !== null && i.diferenca > 0);
      case 'perdas':
        return contados.filter((i) => i.diferenca !== null && i.diferenca < 0);
      case 'ok':
        return contados.filter((i) => i.diferenca === 0);
      default:
        return contados;
    }
  }, [resultado, filter]);

  if (loading || !resultado || !stats) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const isProcessada = resultado.contagem.status === 'processada';
  const acuracia = stats.contados > 0 ? ((stats.ok / stats.contados) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onVoltar}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Resultado da Contagem
            </h2>
            <p className="text-xs text-gray-500">
              {resultado.contagem.estoque_nome} &middot;{' '}
              {resultado.contagem.responsavel} &middot;{' '}
              {dayjs(resultado.contagem.data_contagem).format('DD/MM/YYYY HH:mm')}
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={exportarPDF}
            className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 flex items-center gap-2 shadow-sm transition-colors"
          >
            <FileText className="w-4 h-4" />
            Exportar PDF
          </button>
          <button
            onClick={exportarXLSX}
            className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 flex items-center gap-2 shadow-sm transition-colors"
          >
            <Download className="w-4 h-4" />
            Exportar XLSX
          </button>
          {!isProcessada && (
            <>
              <button
                onClick={handleReconferir}
                className="px-4 py-2 bg-white border border-orange-200 text-orange-700 rounded-xl text-sm font-medium hover:bg-orange-50 flex items-center gap-2 shadow-sm transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Reconferir
              </button>
              <button
                onClick={handleProcessar}
                disabled={processando || stats.comDiferenca === 0}
                className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-40 flex items-center gap-2 shadow-md transition-all"
              >
                {processando ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                Processar Ajustes
              </button>
            </>
          )}
          {isProcessada && (
            <span className="px-4 py-2 bg-green-100 text-green-700 rounded-xl text-sm font-semibold flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Processada em {dayjs(resultado.contagem.processado_em).format('DD/MM/YYYY HH:mm')}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          label="Itens Contados"
          value={stats.contados.toString()}
          icon={<FileText className="w-4 h-4 text-blue-500" />}
          color="blue"
        />
        <StatCard
          label="Acuracia"
          value={`${acuracia}%`}
          icon={<CheckCircle className="w-4 h-4 text-green-500" />}
          color="green"
        />
        <StatCard
          label="Divergencias"
          value={stats.comDiferenca.toString()}
          icon={<AlertTriangle className="w-4 h-4 text-orange-500" />}
          color="orange"
        />
        <StatCard
          label="Sobras"
          value={formatCurrency(stats.valorSobras)}
          subtitle={`${stats.sobras} itens`}
          icon={<TrendingUp className="w-4 h-4 text-green-500" />}
          color="green"
        />
        <StatCard
          label="Perdas"
          value={formatCurrency(stats.valorPerdas)}
          subtitle={`${stats.perdas} itens`}
          icon={<TrendingDown className="w-4 h-4 text-red-500" />}
          color="red"
        />
        <StatCard
          label="Impacto Liquido"
          value={formatCurrency(Math.abs(stats.valorLiquido))}
          subtitle={stats.valorLiquido >= 0 ? 'Positivo' : 'Negativo'}
          icon={<Calculator className="w-4 h-4 text-gray-500" />}
          color={stats.valorLiquido >= 0 ? 'green' : 'red'}
        />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap gap-1">
          {[
            { value: 'divergentes' as ResultFilter, label: 'Divergentes', count: stats.comDiferenca },
            { value: 'perdas' as ResultFilter, label: 'Perdas', count: stats.perdas },
            { value: 'sobras' as ResultFilter, label: 'Sobras', count: stats.sobras },
            { value: 'ok' as ResultFilter, label: 'Conferidos OK', count: stats.ok },
            { value: 'todos' as ResultFilter, label: 'Todos', count: stats.contados },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === f.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.label} ({f.count})
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase">
                  Item
                </th>
                <th className="px-4 py-2.5 text-center text-[11px] font-semibold text-gray-500 uppercase w-24">
                  Sistema
                </th>
                <th className="px-4 py-2.5 text-center text-[11px] font-semibold text-gray-500 uppercase w-24">
                  Contado
                </th>
                <th className="px-4 py-2.5 text-center text-[11px] font-semibold text-gray-500 uppercase w-28">
                  Diferenca
                </th>
                <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-gray-500 uppercase w-28">
                  Val. Unit.
                </th>
                <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-gray-500 uppercase w-28">
                  Val. Dif.
                </th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase">
                  Obs.
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredItens.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-gray-900 text-sm">{item.item_nome}</div>
                    <div className="text-[11px] text-gray-400">{item.item_codigo}</div>
                  </td>
                  <td className="px-4 py-2.5 text-center text-sm text-gray-700 tabular-nums">
                    {item.quantidade_sistema} {item.unidade_medida}
                  </td>
                  <td className="px-4 py-2.5 text-center text-sm font-semibold text-gray-900 tabular-nums">
                    {item.quantidade_contada} {item.unidade_medida}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    {item.diferenca !== null && item.diferenca !== 0 ? (
                      <span
                        className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-xs font-bold tabular-nums ${
                          item.diferenca > 0
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {item.diferenca > 0 && <TrendingUp className="w-3 h-3" />}
                        {item.diferenca < 0 && <TrendingDown className="w-3 h-3" />}
                        {item.diferenca > 0 ? '+' : ''}
                        {item.diferenca}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-500">
                        <Minus className="w-3 h-3" />
                        OK
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right text-xs text-gray-500 tabular-nums">
                    {formatCurrency(item.valor_unitario)}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {item.valor_diferenca !== null && item.valor_diferenca !== 0 && (
                      <span
                        className={`text-xs font-bold tabular-nums ${
                          item.valor_diferenca > 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {item.valor_diferenca > 0 ? '+' : ''}
                        {formatCurrency(item.valor_diferenca)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-500 max-w-[200px] truncate">
                    {item.observacao || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredItens.length === 0 && (
          <div className="py-12 text-center">
            <Package className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Nenhum item neste filtro</p>
          </div>
        )}
      </div>
    </div>
  );
};

function StatCard({
  label,
  value,
  subtitle,
  icon,
  color,
}: {
  label: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-medium text-gray-500 uppercase">{label}</span>
        {icon}
      </div>
      <p
        className={`text-lg font-bold ${
          color === 'red'
            ? 'text-red-600'
            : color === 'green'
              ? 'text-green-600'
              : color === 'orange'
                ? 'text-orange-600'
                : 'text-gray-900'
        }`}
      >
        {value}
      </p>
      {subtitle && <p className="text-[10px] text-gray-400 mt-0.5">{subtitle}</p>}
    </div>
  );
}

export default ContagemResultado;
