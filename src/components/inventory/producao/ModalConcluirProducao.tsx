import React, { useState } from 'react';
import { X, CheckCircle, AlertTriangle } from 'lucide-react';

interface ModalConcluirProducaoProps {
  producao: any;
  onClose: () => void;
  onConfirm: (dados: {
    quantidade_produzida: number;
    quantidade_aprovada: number;
    observacoes?: string;
  }) => void;
}

const ModalConcluirProducao: React.FC<ModalConcluirProducaoProps> = ({
  producao,
  onClose,
  onConfirm
}) => {
  const [quantidadeProduzida, setQuantidadeProduzida] = useState(producao.quantidade);
  const [quantidadeAprovada, setQuantidadeAprovada] = useState(producao.quantidade);
  const [observacoes, setObservacoes] = useState('');

  const quantidadeRejeitada = quantidadeProduzida - quantidadeAprovada;
  const percentualDesperdicio = quantidadeProduzida > 0
    ? ((quantidadeRejeitada / quantidadeProduzida) * 100)
    : 0;

  const handleSubmit = () => {
    if (quantidadeProduzida <= 0 || quantidadeAprovada < 0) {
      alert('Por favor, preencha as quantidades corretamente');
      return;
    }

    if (quantidadeAprovada > quantidadeProduzida) {
      alert('A quantidade aprovada não pode ser maior que a quantidade produzida');
      return;
    }

    onConfirm({
      quantidade_produzida: quantidadeProduzida,
      quantidade_aprovada: quantidadeAprovada,
      observacoes
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-white">
            Concluir Produção
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg mb-4 border border-blue-200">
          <div className="flex items-start">
            <CheckCircle className="w-5 h-5 text-blue-600 mr-3 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900">Informações da Produção</h4>
              <p className="text-sm text-blue-700 mt-1">
                Ficha: <span className="font-medium">{producao.ficha_nome}</span>
              </p>
              <p className="text-sm text-blue-700">
                Lote: <span className="font-medium">{producao.lote_producao}</span>
              </p>
              <p className="text-sm text-blue-700">
                Quantidade Planejada: <span className="font-medium">{producao.quantidade}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">
              Quantidade Produzida *
            </label>
            <input
              type="number"
              min="0"
              step="0.001"
              value={quantidadeProduzida}
              onChange={(e) => setQuantidadeProduzida(parseFloat(e.target.value) || 0)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
            />
            <p className="text-xs text-gray-500 mt-1">
              Quantidade total produzida (incluindo aprovadas e rejeitadas)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">
              Quantidade Aprovada *
            </label>
            <input
              type="number"
              min="0"
              max={quantidadeProduzida}
              step="0.001"
              value={quantidadeAprovada}
              onChange={(e) => setQuantidadeAprovada(parseFloat(e.target.value) || 0)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
            />
            <p className="text-xs text-gray-500 mt-1">
              Quantidade aprovada pelo controle de qualidade
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">
              Observações
            </label>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={3}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
              placeholder="Observações sobre a produção..."
            />
          </div>

          {quantidadeRejeitada > 0 && (
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <div className="flex items-start">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mr-3 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-900">Análise de Desperdício</h4>
                  <div className="grid grid-cols-2 gap-4 mt-2 text-sm">
                    <div>
                      <span className="text-yellow-700">Quantidade Rejeitada:</span>
                      <div className="font-bold text-yellow-900">
                        {quantidadeRejeitada.toFixed(3)}
                      </div>
                    </div>
                    <div>
                      <span className="text-yellow-700">Percentual de Desperdício:</span>
                      <div className="font-bold text-yellow-900">
                        {percentualDesperdicio.toFixed(2)}%
                      </div>
                    </div>
                  </div>
                  {percentualDesperdicio > 10 && (
                    <p className="text-xs text-yellow-700 mt-2">
                      ⚠️ Atenção: O desperdício está acima de 10%. Considere registrar o motivo nas observações.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-white/80 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-[#7D1F2C] text-white rounded-md hover:bg-[#6a1a25]"
          >
            Concluir Produção
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalConcluirProducao;
