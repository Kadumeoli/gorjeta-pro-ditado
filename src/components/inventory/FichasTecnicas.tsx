import React, { useState, useEffect } from 'react';
import { Package, Trash2, Plus } from 'lucide-react';

// Função de formatação (ajuste se a sua for diferente)
const formatCurrency = (valor: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
};

const FichasTecnicas = () => {
  const [showForm, setShowForm] = useState(true);
  const [loading, setLoading] = useState(false);
  const [editingFicha, setEditingFicha] = useState<any>(null);
  const [itensEstoque, setItensEstoque] = useState<any[]>([]);
  const [fichasDisponiveis, setFichasDisponiveis] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    nome: '',
    porcoes: 1,
    ingredientes: [] as any[]
  });

  // Função para adicionar novo ingrediente (já com baixa_estoque: true)
  const adicionarIngrediente = () => {
    setFormData({
      ...formData,
      ingredientes: [
        ...formData.ingredientes,
        {
          tipo: 'item',
          quantidade: 0,
          item_estoque_id: '',
          observacoes: '',
          baixa_estoque: true // Adicionado para o Toggle funcionar
        }
      ]
    });
  };

  const atualizarIngrediente = (index: number, campo: string, valor: any) => {
    const novosIngredientes = [...formData.ingredientes];
    novosIngredientes[index] = { ...novosIngredientes[index], [campo]: valor };
    setFormData({ ...formData, ingredientes: novosIngredientes });
  };

  const removerIngrediente = (index: number) => {
    const novosIngredientes = formData.ingredientes.filter((_, i) => i !== index);
    setFormData({ ...formData, ingredientes: novosIngredientes });
  };

  const calcularCustoTotal = () => {
    return formData.ingredientes.reduce((total, ing) => {
      if (ing.tipo === 'item' && ing.item_estoque_id) {
        const item = itensEstoque.find(i => i.id === ing.item_estoque_id);
        return total + ((item?.custo_medio || 0) * (ing.quantidade || 0));
      }
      if (ing.tipo === 'ficha' && ing.ficha_tecnica_ingrediente_id) {
        const ficha = fichasDisponiveis.find(f => f.id === ing.ficha_tecnica_ingrediente_id);
        if (ficha && ficha.porcoes) {
          return total + (((ficha.custo_total || 0) / ficha.porcoes) * (ing.quantidade || 0));
        }
      }
      return total;
    }, 0);
  };

  const handleSave = async () => {
    setLoading(true);
    // Aqui vai a sua lógica de salvar no Supabase
    console.log("Salvando dados...", formData);
    setTimeout(() => setLoading(false), 1000);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Fichas Técnicas</h1>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-[#7D1F2C] text-white px-4 py-2 rounded-lg hover:bg-[#6a1a25]"
          >
            <Plus className="w-5 h-5" />
            Nova Ficha Técnica
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">
              {editingFicha ? 'Editar Ficha Técnica' : 'Nova Ficha Técnica'}
            </h2>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Receita</label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  placeholder="Ex: Bolo de Chocolate"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rendimento (Porções)</label>
                <input
                  type="number"
                  min="1"
                  value={formData.porcoes}
                  onChange={(e) => setFormData({ ...formData, porcoes: parseInt(e.target.value) || 1 })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  required
                />
              </div>
            </div>

            <div className="mt-8">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Ingredientes</h3>
                <button
                  type="button"
                  onClick={adicionarIngrediente}
                  className="flex items-center gap-2 text-sm text-[#7D1F2C] font-medium hover:text-[#6a1a25]"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar Ingrediente
                </button>
              </div>

              {formData.ingredientes.length > 0 ? (
                <div className="space-y-3">
                  {formData.ingredientes.map((ingrediente, index) => (
                    <div key={index} className="grid grid-cols-1 gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                        <div className="md:col-span-1">
                          <label className="block text-xs font-medium text-gray-700 mb-1">Tipo</label>
                          <select
                            value={ingrediente.tipo}
                            onChange={(e) => atualizarIngrediente(index, 'tipo', e.target.value)}
                            className="w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                          >
                            <option value="item">Item de Estoque</option>
                            <option value="ficha">Ficha Técnica</option>
                          </select>
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            {ingrediente.tipo === 'item' ? 'Item' : 'Ficha Técnica'}
                          </label>
                          {ingrediente.tipo === 'item' ? (
                            <select
                              value={ingrediente.item_estoque_id || ''}
                              onChange={(e) => atualizarIngrediente(index, 'item_estoque_id', e.target.value)}
                              className="w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                              required
                            >
                              <option value="">Selecione um item...</option>
                              {itensEstoque.map((item) => (
                                <option key={item.id} value={item.id}>
                                  {item.codigo ? `${item.codigo} - ${item.nome}` : item.nome} ({item.unidade_medida})
                                </option>
                              ))}
                            </select>
                          ) : (
                            <select
                              value={ingrediente.ficha_tecnica_ingrediente_id || ''}
                              onChange={(e) => atualizarIngrediente(index, 'ficha_tecnica_ingrediente_id', e.target.value)}
                              className="w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                              required
                            >
                              <option value="">Selecione uma ficha...</option>
                              {fichasDisponiveis
                                .filter(f => !editingFicha || f.id !== editingFicha.id)
                                .map((ficha) => (
                                  <option key={ficha.id} value={ficha.id}>
                                    {ficha.nome} - {formatCurrency((ficha.custo_total || 0) / (ficha.porcoes || 1))} por porção
                                  </option>
                                ))}
                            </select>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Quantidade</label>
                          <input
                            type="number"
                            step={ingrediente.tipo === 'ficha' ? "1" : "0.001"}
                            min={ingrediente.tipo === 'ficha' ? "1" : "0.001"}
                            placeholder="Qtd"
                            value={ingrediente.quantidade}
                            onChange={(e) => atualizarIngrediente(index, 'quantidade', parseFloat(e.target.value) || 0)}
                            className="w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                            required
                          />
                          {ingrediente.tipo === 'item' && ingrediente.item_estoque_id && (
                            <p className="text-xs text-gray-500 mt-1">
                              {itensEstoque.find(i => i.id === ingrediente.item_estoque_id)?.unidade_medida}
                            </p>
                          )}
                          {ingrediente.tipo === 'ficha' && (
                            <p className="text-xs text-gray-500 mt-1">porções</p>
                          )}
                        </div>

                        <div className="flex flex-col justify-between items-end">
                          <div className="text-sm text-right">
                            {ingrediente.tipo === 'item' && ingrediente.item_estoque_id && ingrediente.quantidade > 0 && (
                              <div>
                                <span className="text-xs text-gray-600">Custo:</span>
                                <div className="font-medium text-[#7D1F2C] text-sm">
                                  {formatCurrency(
                                    (itensEstoque.find(i => i.id === ingrediente.item_estoque_id)?.custo_medio || 0) * ingrediente.quantidade
                                  )}
                                </div>
                              </div>
                            )}
                            {ingrediente.tipo === 'ficha' && ingrediente.ficha_tecnica_ingrediente_id && ingrediente.quantidade > 0 && (
                              <div>
                                <span className="text-xs text-gray-600">Custo:</span>
                                <div className="font-medium text-[#7D1F2C] text-sm">
                                  {(() => {
                                    const ficha = fichasDisponiveis.find(f => f.id === ingrediente.ficha_tecnica_ingrediente_id);
                                    if (ficha && ficha.porcoes) {
                                      return formatCurrency(((ficha.custo_total || 0) / ficha.porcoes) * ingrediente.quantidade);
                                    }
                                    return formatCurrency(0);
                                  })()}
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {/* Botões Toggle e Remover (Aqui está a sua alteração!) */}
                          <div className="flex items-center gap-2 mt-2">
                            <button
                              type="button"
                              onClick={() => atualizarIngrediente(index, 'baixa_estoque', ingrediente.baixa_estoque === false ? true : false)}
                              title={ingrediente.baixa_estoque !== false ? 'Dá baixa no estoque. Clique para marcar como só receita' : 'Não dá baixa no estoque. Clique para ativar baixa'}
                              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border transition-all ${ingrediente.baixa_estoque !== false ? 'bg-green-50 text-green-700 border-green-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200' : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-green-50 hover:text-green-700 hover:border-green-200'}`}
                            >
                              {ingrediente.baixa_estoque !== false ? '📦 Estoque' : '📋 Receita'}
                            </button>
                            <button
                              type="button"
                              onClick={() => removerIngrediente(index)}
                              className="text-red-600 hover:text-red-800 p-1 hover:bg-red-50 rounded-md transition-colors"
                              title="Remover Ingrediente"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Observações (opcional)</label>
                        <input
                          type="text"
                          value={ingrediente.observacoes || ''}
                          onChange={(e) => atualizarIngrediente(index, 'observacoes', e.target.value)}
                          className="w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                          placeholder="Ex: picado, ralado, sem pele..."
                        />
                      </div>
                    </div>
                  ))}

                  <div className="flex justify-end pt-3 border-t border-gray-200">
                    <div className="text-right">
                      <span className="text-sm text-gray-600">Custo Total da Ficha:</span>
                      <span className="ml-2 text-lg font-bold text-[#7D1F2C]">
                        {formatCurrency(calcularCustoTotal())}
                      </span>
                      {formData.porcoes > 0 && (
                        <div className="text-sm text-gray-600">
                          Custo por porção: {formatCurrency(calcularCustoTotal() / formData.porcoes)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Nenhum ingrediente adicionado</p>
                  <button
                    onClick={adicionarIngrediente}
                    className="mt-2 px-4 py-2 bg-[#7D1F2C] text-white rounded-lg hover:bg-[#6a1a25]"
                  >
                    Adicionar Primeiro Ingrediente
                  </button>
                </div>
              )}
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={loading || !formData.nome || formData.ingredientes.length === 0}
                className="px-4 py-2 bg-[#7D1F2C] text-white rounded-md hover:bg-[#6a1a25] disabled:opacity-50"
              >
                {loading ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FichasTecnicas;