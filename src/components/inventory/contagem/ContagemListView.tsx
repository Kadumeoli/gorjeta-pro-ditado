import React, { useEffect, useState } from 'react';
import {
  ClipboardCheck,
  Plus,
  History,
  Eye,
  Play,
  Package,
  AlertTriangle,
  TrendingDown,
  Loader2,
  Trash2,
  BarChart3,
} from 'lucide-react';
import dayjs from 'dayjs';
import type { Contagem } from './types';
import * as service from './contagemService';
import { formatCurrency } from '../../../utils/currency';

interface Props {
  onNovaContagem: () => void;
  onContinuarContagem: (contagem: Contagem) => void;
  onVerResultado: (contagem: Contagem) => void;
  onHistorico: () => void;
  onAmostragem: () => void;
}

const ContagemListView: React.FC<Props> = ({
  onNovaContagem,
  onContinuarContagem,
  onVerResultado,
  onHistorico,
  onAmostragem,
}) => {
  const [contagens, setContagens] = useState<Contagem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const data = await service.loadContagensAtivas();
      setContagens(data);
    } catch (err) {
      console.error('Erro ao carregar contagens:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelar = async (contagem: Contagem) => {
    if (!confirm('Deseja cancelar esta contagem? Esta acao nao pode ser desfeita.')) return;
    try {
      await service.cancelarContagem(contagem.id);
      load();
    } catch (err: any) {
      alert('Erro ao cancelar: ' + err.message);
    }
  };

  const emAndamento = contagens.filter((c) => c.status === 'em_andamento');
  const finalizadas = contagens.filter((c) => c.status === 'finalizada');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Contagem de Estoque</h2>
          <p className="text-sm text-gray-500 mt-1">
            Gerencie contagens fisicas e compare com saldos do sistema
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={onHistorico}
            className="px-4 py-2.5 bg-white border border-gray-200 text-white/80 rounded-xl hover:bg-gray-50 flex items-center gap-2 text-sm font-medium shadow-sm transition-colors"
          >
            <History className="w-4 h-4" />
            Historico
          </button>
          <button
            onClick={onAmostragem}
            className="px-4 py-2.5 bg-white border border-teal-200 text-teal-700 rounded-xl hover:bg-teal-50 flex items-center gap-2 text-sm font-medium shadow-sm transition-colors"
          >
            <BarChart3 className="w-4 h-4" />
            Amostragem
          </button>
          <button
            onClick={onNovaContagem}
            className="px-5 py-2.5 bg-gradient-to-r from-[#7D1F2C] to-[#D4AF37] text-white rounded-xl hover:opacity-90 flex items-center gap-2 text-sm font-semibold shadow-md transition-all"
          >
            <Plus className="w-4 h-4" />
            Nova Contagem
          </button>
        </div>
      </div>

      {finalizadas.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
            Aguardando Processamento
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {finalizadas.map((c) => (
              <div
                key={c.id}
                className="bg-white rounded-2xl border border-amber-200 shadow-sm hover:shadow-md transition-all p-5 group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white text-sm">{c.estoque_nome}</h4>
                      <p className="text-xs text-gray-500">{c.responsavel}</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">
                    Finalizada
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="text-center p-2 bg-gray-50 rounded-lg">
                    <p className="text-lg font-bold text-white">{c.total_itens_contados}</p>
                    <p className="text-[10px] text-gray-500 uppercase">Contados</p>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded-lg">
                    <p className="text-lg font-bold text-orange-600">{c.total_diferencas}</p>
                    <p className="text-[10px] text-gray-500 uppercase">Diferenças</p>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded-lg">
                    <p className="text-sm font-bold text-red-600">
                      {formatCurrency(Math.abs(c.valor_total_diferencas))}
                    </p>
                    <p className="text-[10px] text-gray-500 uppercase">Valor</p>
                  </div>
                </div>
                <button
                  onClick={() => onVerResultado(c)}
                  className="w-full py-2 bg-amber-600 text-white rounded-xl text-sm font-semibold hover:bg-amber-700 flex items-center justify-center gap-2 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  Ver Resultado
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {emAndamento.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
            Em Andamento
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {emAndamento.map((c) => (
              <div
                key={c.id}
                className="bg-white rounded-2xl border border-blue-100 shadow-sm hover:shadow-md transition-all p-5 group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
                      <ClipboardCheck className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white text-sm">{c.estoque_nome}</h4>
                      <p className="text-xs text-gray-500">{c.responsavel}</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                    Em Andamento
                  </span>
                </div>
                <p className="text-xs text-gray-400 mb-4">
                  Iniciada em {dayjs(c.criado_em).format('DD/MM/YYYY [as] HH:mm')}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => onContinuarContagem(c)}
                    className="flex-1 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 flex items-center justify-center gap-2 transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    Continuar
                  </button>
                  <button
                    onClick={() => handleCancelar(c)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                    title="Cancelar contagem"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {contagens.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
          <div className="w-20 h-20 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-6">
            <Package className="w-10 h-10 text-gray-300" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">
            Nenhuma contagem em andamento
          </h3>
          <p className="text-gray-500 text-sm mb-8 max-w-md mx-auto">
            Inicie uma nova contagem de estoque para comparar quantidades fisicas com os saldos do
            sistema e gerar ajustes automaticos.
          </p>
          <button
            onClick={onNovaContagem}
            className="px-6 py-3 bg-gradient-to-r from-[#7D1F2C] to-[#D4AF37] text-white rounded-xl hover:opacity-90 font-semibold shadow-md transition-all"
          >
            Iniciar Nova Contagem
          </button>
        </div>
      )}
    </div>
  );
};

export default ContagemListView;
