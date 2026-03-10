import React from 'react';
import { X, Calendar, Package, DollarSign, TrendingDown, Truck, FileText, AlertCircle, CheckCircle, Clock, User } from 'lucide-react';
import dayjs from 'dayjs';

interface ItemCompra {
  id: string;
  item_nome: string;
  item_codigo?: string;
  unidade_medida: string;
  quantidade: number;
  quantidade_pedida?: number;
  quantidade_recebida?: number;
  custo_unitario_original?: number;
  custo_unitario: number;
  custo_unitario_final?: number;
  custo_total: number;
  valor_desconto_item?: number;
  percentual_desconto_item?: number;
  divergencia?: boolean;
  motivo_divergencia?: string;
}

interface Compra {
  id: string;
  fornecedor_nome?: string;
  numero_documento?: string;
  data_pedido?: string;
  data_compra: string;
  data_entrega_prevista?: string;
  data_entrega_real?: string;
  estoque_destino_nome?: string;
  valor_produtos?: number;
  valor_encargos?: number;
  percentual_encargos?: number;
  descricao_encargos?: string;
  valor_desconto?: number;
  percentual_desconto?: number;
  motivo_desconto?: string;
  valor_total: number;
  observacoes?: string;
  status: 'pendente' | 'recebido' | 'cancelado';
  criado_em: string;
  itens?: ItemCompra[];
}

interface ModalVisualizacaoCompraProps {
  compra: Compra;
  onClose: () => void;
}

const ModalVisualizacaoCompra: React.FC<ModalVisualizacaoCompraProps> = ({ compra, onClose }) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'recebido':
        return 'bg-green-100 text-green-800';
      case 'pendente':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelado':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'recebido':
        return 'Recebido';
      case 'pendente':
        return 'Pendente';
      case 'cancelado':
        return 'Cancelado';
      default:
        return status;
    }
  };

  const calcularDiasAtraso = () => {
    if (!compra.data_entrega_prevista || compra.status === 'cancelado') return null;

    const dataReferencia = compra.data_entrega_real || dayjs().format('YYYY-MM-DD');
    const dias = dayjs(dataReferencia).diff(dayjs(compra.data_entrega_prevista), 'day');

    return dias;
  };

  const diasAtraso = calcularDiasAtraso();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xl font-semibold text-white">Detalhes da Compra</h3>
              <p className="text-sm text-blue-100 mt-1">
                {compra.numero_documento && `Doc: ${compra.numero_documento} • `}
                Criado em {dayjs(compra.criado_em).format('DD/MM/YYYY HH:mm')}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(compra.status)}`}>
                {getStatusText(compra.status)}
              </span>
              <button
                onClick={onClose}
                className="text-white hover:text-blue-100 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Informações Gerais */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Fornecedor e Destino */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                <User className="w-5 h-5 mr-2 text-blue-600" />
                Fornecedor e Destino
              </h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-600">Fornecedor:</span>
                  <p className="font-medium text-gray-900">{compra.fornecedor_nome || 'Não informado'}</p>
                </div>
                <div>
                  <span className="text-gray-600">Estoque Destino:</span>
                  <p className="font-medium text-gray-900">{compra.estoque_destino_nome}</p>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                <Calendar className="w-5 h-5 mr-2 text-blue-600" />
                Timeline da Compra
              </h4>
              <div className="space-y-3">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-1.5"></div>
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="text-xs text-gray-600">Data do Pedido</p>
                    <p className="text-sm font-medium text-gray-900">
                      {compra.data_pedido ? dayjs(compra.data_pedido).format('DD/MM/YYYY') : 'Não informado'}
                    </p>
                  </div>
                </div>

                {compra.data_entrega_prevista && (
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <div className="w-2 h-2 bg-yellow-600 rounded-full mt-1.5"></div>
                    </div>
                    <div className="ml-3 flex-1">
                      <p className="text-xs text-gray-600">Entrega Prevista</p>
                      <p className="text-sm font-medium text-gray-900">
                        {dayjs(compra.data_entrega_prevista).format('DD/MM/YYYY')}
                      </p>
                    </div>
                  </div>
                )}

                {compra.data_entrega_real && (
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <div className="w-2 h-2 bg-green-600 rounded-full mt-1.5"></div>
                    </div>
                    <div className="ml-3 flex-1">
                      <p className="text-xs text-gray-600">Entrega Real</p>
                      <p className="text-sm font-medium text-gray-900">
                        {dayjs(compra.data_entrega_real).format('DD/MM/YYYY')}
                      </p>
                    </div>
                  </div>
                )}

                {diasAtraso !== null && diasAtraso > 0 && compra.status !== 'cancelado' && (
                  <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded">
                    <div className="flex items-center text-orange-700">
                      <Clock className="w-4 h-4 mr-1" />
                      <span className="text-xs font-medium">
                        {diasAtraso} {diasAtraso === 1 ? 'dia' : 'dias'} de atraso
                      </span>
                    </div>
                  </div>
                )}

                {diasAtraso !== null && diasAtraso < 0 && (
                  <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                    <div className="flex items-center text-blue-700">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      <span className="text-xs font-medium">
                        Entregue {Math.abs(diasAtraso)} {Math.abs(diasAtraso) === 1 ? 'dia' : 'dias'} antes do prazo
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Valores Financeiros */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-6 border border-green-200">
            <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
              <DollarSign className="w-5 h-5 mr-2 text-green-600" />
              Resumo Financeiro
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <p className="text-xs text-gray-600 mb-1">Valor dos Produtos</p>
                <p className="text-lg font-bold text-gray-900">
                  {formatCurrency(compra.valor_produtos || compra.valor_total)}
                </p>
              </div>

              {compra.valor_desconto && compra.valor_desconto > 0 && (
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <p className="text-xs text-gray-600 mb-1">Desconto Aplicado</p>
                  <p className="text-lg font-bold text-green-600">
                    - {formatCurrency(compra.valor_desconto)}
                  </p>
                  {compra.percentual_desconto && compra.percentual_desconto > 0 && (
                    <p className="text-xs text-green-600">({compra.percentual_desconto.toFixed(2)}%)</p>
                  )}
                </div>
              )}

              {compra.valor_encargos && compra.valor_encargos > 0 && (
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <p className="text-xs text-gray-600 mb-1">Encargos</p>
                  <p className="text-lg font-bold text-orange-600">
                    + {formatCurrency(compra.valor_encargos)}
                  </p>
                  {compra.percentual_encargos && compra.percentual_encargos > 0 && (
                    <p className="text-xs text-orange-600">({compra.percentual_encargos.toFixed(2)}%)</p>
                  )}
                </div>
              )}

              <div className="bg-white rounded-lg p-4 shadow-sm border-2 border-green-600">
                <p className="text-xs text-gray-600 mb-1">Valor Total</p>
                <p className="text-xl font-bold text-green-600">
                  {formatCurrency(compra.valor_total)}
                </p>
              </div>
            </div>

            {compra.motivo_desconto && (
              <div className="mt-4 p-3 bg-green-100 border border-green-300 rounded">
                <p className="text-xs font-medium text-green-800 mb-1">Motivo do Desconto:</p>
                <p className="text-sm text-green-700">{compra.motivo_desconto}</p>
              </div>
            )}

            {compra.descricao_encargos && (
              <div className="mt-4 p-3 bg-orange-100 border border-orange-300 rounded">
                <p className="text-xs font-medium text-orange-800 mb-1">Descrição dos Encargos:</p>
                <p className="text-sm text-orange-700">{compra.descricao_encargos}</p>
              </div>
            )}
          </div>

          {/* Itens da Compra */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
              <Package className="w-5 h-5 mr-2 text-blue-600" />
              Itens da Compra ({compra.itens?.length || 0})
            </h4>

            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Qtd Pedida</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Qtd Recebida</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Custo Orig.</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Desconto</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Custo Final</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {compra.itens?.map((item) => (
                      <tr key={item.id} className={item.divergencia ? 'bg-yellow-50' : 'hover:bg-gray-50'}>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-gray-900">{item.item_nome}</p>
                            {item.item_codigo && (
                              <p className="text-xs text-gray-500">Cód: {item.item_codigo}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-sm text-gray-900">
                            {item.quantidade_pedida || item.quantidade} {item.unidade_medida}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center">
                            <span className={`text-sm font-medium ${
                              item.divergencia ? 'text-orange-600' : 'text-gray-900'
                            }`}>
                              {item.quantidade_recebida || item.quantidade} {item.unidade_medida}
                            </span>
                            {item.divergencia && (
                              <AlertCircle className="w-4 h-4 text-orange-600 ml-1" />
                            )}
                          </div>
                          {item.motivo_divergencia && (
                            <p className="text-xs text-orange-600 mt-1">{item.motivo_divergencia}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm text-gray-600">
                            {formatCurrency(item.custo_unitario_original || item.custo_unitario)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {item.valor_desconto_item && item.valor_desconto_item > 0 ? (
                            <div>
                              <span className="text-sm font-medium text-green-600">
                                - {formatCurrency(item.valor_desconto_item)}
                              </span>
                              {item.percentual_desconto_item && item.percentual_desconto_item > 0 && (
                                <p className="text-xs text-green-600">
                                  ({item.percentual_desconto_item.toFixed(1)}%)
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm font-medium text-gray-900">
                            {formatCurrency(item.custo_unitario_final || item.custo_unitario)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm font-bold text-gray-900">
                            {formatCurrency(item.custo_total)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Observações */}
          {compra.observacoes && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2 flex items-center">
                <FileText className="w-4 h-4 mr-2" />
                Observações
              </h4>
              <p className="text-sm text-blue-800 whitespace-pre-wrap">{compra.observacoes}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalVisualizacaoCompra;
