import React from 'react';
import { X, AlertTriangle, CheckCircle, Package } from 'lucide-react';
import { VerificacaoEstoque } from '../../../services/producaoService';

interface ModalVerificacaoInsumosProps {
  verificacoes: VerificacaoEstoque[];
  onClose: () => void;
  onConfirm: () => void;
  disponivel: boolean;
}

const ModalVerificacaoInsumos: React.FC<ModalVerificacaoInsumosProps> = ({
  verificacoes,
  onClose,
  onConfirm,
  disponivel
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            Verificação de Disponibilidade de Insumos
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className={`p-4 rounded-lg mb-4 ${
          disponivel ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-center">
            {disponivel ? (
              <CheckCircle className="w-6 h-6 text-green-600 mr-3" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-red-600 mr-3" />
            )}
            <div>
              <h4 className={`font-medium ${disponivel ? 'text-green-900' : 'text-red-900'}`}>
                {disponivel
                  ? 'Todos os insumos estão disponíveis'
                  : 'Atenção: Alguns insumos não estão disponíveis em quantidade suficiente'}
              </h4>
              <p className={`text-sm ${disponivel ? 'text-green-700' : 'text-red-700'}`}>
                {disponivel
                  ? 'A produção pode ser iniciada normalmente'
                  : 'Verifique a disponibilidade dos insumos abaixo antes de prosseguir'}
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Insumo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Necessário
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Disponível
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Estoque
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {verificacoes.map((v, index) => (
                <tr key={index} className={!v.tem_estoque_suficiente ? 'bg-red-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {v.tem_estoque_suficiente ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <Package className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="font-medium text-gray-900">{v.item_nome}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-medium text-gray-900">
                      {v.quantidade_necessaria.toFixed(3)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`font-medium ${
                      v.tem_estoque_suficiente ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {v.quantidade_disponivel.toFixed(3)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {v.estoque_nome}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          {disponivel && (
            <button
              onClick={onConfirm}
              className="px-4 py-2 bg-[#7D1F2C] text-white rounded-md hover:bg-[#6a1a25]"
            >
              Confirmar e Prosseguir
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModalVerificacaoInsumos;
