import React, { useState, useEffect } from 'react';
import { 
  X,
  Plus,
  Trash2,
  Upload,
  FileText,
  Package,
  DollarSign,
  Calendar,
  User,
  Building,
  Wrench,
  ShoppingCart,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import dayjs from 'dayjs';

interface SolicitacaoFormProps {
  isOpen: boolean;
  onClose: () => void;
  solicitacao?: any;
  onSave: () => void;
}

interface TipoSolicitacao {
  id: string;
  nome: string;
  tipo_categoria: string;
  prazo_padrao_dias: number;
  valor_limite_aprovacao: number;
}

interface ItemSolicitacao {
  item_nome: string;
  item_descricao: string;
  especificacao_tecnica: string;
  marca_sugerida: string;
  modelo_sugerido: string;
  quantidade: number;
  unidade_medida: string;
  valor_unitario_estimado: number;
  fornecedor_sugerido: string;
  link_produto: string;
  observacoes: string;
}

interface FormData {
  numero_solicitacao: string;
  tipo_solicitacao_id: string;
  titulo: string;
  descricao: string;
  prioridade: 'baixa' | 'normal' | 'alta' | 'urgente' | 'critica';
  solicitante_nome: string;
  solicitante_email: string;
  solicitante_telefone: string;
  setor_solicitante: string;
  local_servico: string;
  equipamento_afetado: string;
  detalhes_tecnicos: string;
  data_limite: string;
  valor_estimado: number;
  fornecedor_responsavel: string;
  contato_fornecedor: string;
  numero_orcamento: string;
  itens: ItemSolicitacao[];
}

const SolicitacaoForm: React.FC<SolicitacaoFormProps> = ({
  isOpen,
  onClose,
  solicitacao,
  onSave
}) => {
  const [tiposSolicitacao, setTiposSolicitacao] = useState<TipoSolicitacao[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  
  const [formData, setFormData] = useState<FormData>({
    numero_solicitacao: '',
    tipo_solicitacao_id: '',
    titulo: '',
    descricao: '',
    prioridade: 'normal',
    solicitante_nome: 'Usuário Sistema', // TODO: Pegar do contexto de usuário
    solicitante_email: '',
    solicitante_telefone: '',
    setor_solicitante: 'Administração',
    local_servico: '',
    equipamento_afetado: '',
    detalhes_tecnicos: '',
    data_limite: '',
    valor_estimado: 0,
    fornecedor_responsavel: '',
    contato_fornecedor: '',
    numero_orcamento: '',
    itens: []
  });

  const setores = [
    'Administração', 'Bar', 'Cozinha', 'Eventos', 'Limpeza', 
    'Segurança', 'Recepção', 'Estoque', 'Manutenção', 'TI'
  ];

  const unidadesMedida = [
    'unidade', 'metro', 'metro²', 'metro³', 'kg', 'litro', 
    'caixa', 'pacote', 'conjunto', 'par', 'dúzia'
  ];

  useEffect(() => {
    if (isOpen) {
      fetchTiposSolicitacao();
      
      if (solicitacao) {
        // TODO: Carregar dados da solicitação para edição
        setFormData({
          numero_solicitacao: solicitacao.numero_solicitacao || '',
          tipo_solicitacao_id: solicitacao.tipo_solicitacao_id || '',
          titulo: solicitacao.titulo || '',
          descricao: solicitacao.descricao || '',
          prioridade: solicitacao.prioridade || 'normal',
          solicitante_nome: solicitacao.solicitante_nome || 'Usuário Sistema',
          solicitante_email: solicitacao.solicitante_email || '',
          solicitante_telefone: solicitacao.solicitante_telefone || '',
          setor_solicitante: solicitacao.setor_solicitante || 'Administração',
          local_servico: solicitacao.local_servico || '',
          equipamento_afetado: solicitacao.equipamento_afetado || '',
          detalhes_tecnicos: solicitacao.detalhes_tecnicos || '',
          data_limite: solicitacao.data_limite ? dayjs(solicitacao.data_limite).format('YYYY-MM-DD') : '',
          valor_estimado: solicitacao.valor_estimado || 0,
          fornecedor_responsavel: solicitacao.fornecedor_responsavel || '',
          contato_fornecedor: solicitacao.contato_fornecedor || '',
          numero_orcamento: solicitacao.numero_orcamento || '',
          itens: []
        });
      } else {
        resetForm();
      }
    }
  }, [isOpen, solicitacao]);

  const fetchTiposSolicitacao = async () => {
    try {
      const { data, error } = await supabase
        .from('tipos_solicitacao')
        .select('*')
        .eq('status', true)
        .order('nome');

      if (error) throw error;
      setTiposSolicitacao(data || []);
    } catch (err) {
      console.error('Error fetching request types:', err);
    }
  };

  const handleSave = async (saveAsDraft = false) => {
    try {
      setLoading(true);
      setError(null);

      // Generate unique request number for new requests
      let numeroSolicitacao = formData.numero_solicitacao;
      if (!solicitacao && !numeroSolicitacao) {
        const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
        numeroSolicitacao = `SOL-${timestamp}-${random}`;
      }

      // Validações
      if (!formData.titulo || !formData.descricao || !formData.tipo_solicitacao_id) {
        throw new Error('Preencha todos os campos obrigatórios');
      }

      // Calcular data limite se não definida
      let dataLimite = formData.data_limite;
      if (!dataLimite) {
        const tipoSelecionado = tiposSolicitacao.find(t => t.id === formData.tipo_solicitacao_id);
        if (tipoSelecionado) {
          dataLimite = dayjs().add(tipoSelecionado.prazo_padrao_dias, 'days').format('YYYY-MM-DD');
        }
      }

      const dataToSave = {
        ...formData,
        numero_solicitacao: numeroSolicitacao,
        data_limite: dataLimite || null,
        status: saveAsDraft ? 'rascunho' : 'enviado',
        valor_estimado: parseFloat(formData.valor_estimado.toString()) || 0
      };
      
      // Remove itens from dataToSave as it doesn't exist in solicitacoes table
      const { itens, ...solicitacaoData } = dataToSave;

      let solicitacaoId: string;

      if (solicitacao) {
        // Editar solicitação existente
        const { error } = await supabase
          .from('solicitacoes')
          .update(solicitacaoData)
          .eq('id', solicitacao.id);

        if (error) throw error;
        solicitacaoId = solicitacao.id;
      } else {
        // Criar nova solicitação
        const { data: novaSolicitacao, error } = await supabase
          .from('solicitacoes')
          .insert([solicitacaoData])
          .select()
          .single();

        if (error) throw error;
        solicitacaoId = novaSolicitacao.id;
      }


      onSave();
    } catch (err) {
      console.error('Error saving request:', err);
      setError(err instanceof Error ? err.message : 'Erro ao salvar solicitação');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      numero_solicitacao: '',
      tipo_solicitacao_id: '',
      titulo: '',
      descricao: '',
      prioridade: 'normal',
      solicitante_nome: 'Usuário Sistema',
      solicitante_email: '',
      solicitante_telefone: '',
      setor_solicitante: 'Administração',
      local_servico: '',
      equipamento_afetado: '',
      detalhes_tecnicos: '',
      data_limite: '',
      valor_estimado: 0,
      fornecedor_responsavel: '',
      contato_fornecedor: '',
      numero_orcamento: '',
      itens: []
    });
    setStep(1);
  };

  const adicionarItem = () => {
    setFormData({
      ...formData,
      itens: [
        ...formData.itens,
        {
          item_nome: '',
          item_descricao: '',
          especificacao_tecnica: '',
          marca_sugerida: '',
          modelo_sugerido: '',
          quantidade: 1,
          unidade_medida: 'unidade',
          valor_unitario_estimado: 0,
          fornecedor_sugerido: '',
          link_produto: '',
          observacoes: ''
        }
      ]
    });
  };

  const removerItem = (index: number) => {
    const novosItens = formData.itens.filter((_, i) => i !== index);
    setFormData({ ...formData, itens: novosItens });
  };

  const atualizarItem = (index: number, campo: keyof ItemSolicitacao, valor: any) => {
    const novosItens = [...formData.itens];
    novosItens[index] = { ...novosItens[index], [campo]: valor };
    setFormData({ ...formData, itens: novosItens });
  };

  const calcularValorTotalEstimado = () => {
    return formData.itens.reduce((total, item) => 
      total + (item.quantidade * item.valor_unitario_estimado), 0
    );
  };

  const getTipoSelecionado = () => {
    return tiposSolicitacao.find(t => t.id === formData.tipo_solicitacao_id);
  };

  const isAquisicao = () => {
    const tipo = getTipoSelecionado();
    return tipo?.tipo_categoria.includes('aquisicao');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[95vh] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-white">
            {solicitacao ? 'Editar Solicitação' : 'Nova Solicitação'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {error && (
          <div className="m-6 p-4 bg-red-100 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        <div className="p-6 overflow-y-auto max-h-[calc(95vh-140px)]">
          {/* Step Indicator */}
          <div className="flex items-center justify-center mb-6">
            <div className="flex items-center space-x-4">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                step >= 1 ? 'bg-[#7D1F2C] text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                1
              </div>
              <div className={`w-16 h-1 ${step >= 2 ? 'bg-[#7D1F2C]' : 'bg-gray-200'}`}></div>
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                step >= 2 ? 'bg-[#7D1F2C] text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                2
              </div>
              <div className={`w-16 h-1 ${step >= 3 ? 'bg-[#7D1F2C]' : 'bg-gray-200'}`}></div>
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                step >= 3 ? 'bg-[#7D1F2C] text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                3
              </div>
            </div>
          </div>

          {/* Step 1: Informações Básicas */}
          {step === 1 && (
            <div className="space-y-6">
              <h4 className="text-lg font-medium text-white mb-4">
                Informações Básicas da Solicitação
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-white/80 mb-1">
                    Tipo de Solicitação *
                  </label>
                  <select
                    value={formData.tipo_solicitacao_id}
                    onChange={(e) => setFormData({ ...formData, tipo_solicitacao_id: e.target.value })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                    required
                  >
                    <option value="">Selecione o tipo de solicitação...</option>
                    {tiposSolicitacao.map((tipo) => (
                      <option key={tipo.id} value={tipo.id}>
                        {tipo.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-white/80 mb-1">
                    Título *
                  </label>
                  <input
                    type="text"
                    value={formData.titulo}
                    onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                    required
                    placeholder="Ex: Manutenção do ar condicionado da cozinha"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">
                    Prioridade *
                  </label>
                  <select
                    value={formData.prioridade}
                    onChange={(e) => setFormData({ ...formData, prioridade: e.target.value as any })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                    required
                  >
                    <option value="baixa">Baixa</option>
                    <option value="normal">Normal</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                    <option value="critica">Crítica</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">
                    Setor Solicitante *
                  </label>
                  <select
                    value={formData.setor_solicitante}
                    onChange={(e) => setFormData({ ...formData, setor_solicitante: e.target.value })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                    required
                  >
                    {setores.map((setor) => (
                      <option key={setor} value={setor}>
                        {setor}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-white/80 mb-1">
                    Descrição Detalhada *
                  </label>
                  <textarea
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                    rows={4}
                    required
                    placeholder="Descreva detalhadamente o que precisa ser feito..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">
                    Local do Serviço
                  </label>
                  <input
                    type="text"
                    value={formData.local_servico}
                    onChange={(e) => setFormData({ ...formData, local_servico: e.target.value })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                    placeholder="Ex: Cozinha, Salão principal, Área externa"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">
                    Equipamento Afetado
                  </label>
                  <input
                    type="text"
                    value={formData.equipamento_afetado}
                    onChange={(e) => setFormData({ ...formData, equipamento_afetado: e.target.value })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                    placeholder="Ex: Ar condicionado Split 18000 BTU"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">
                    Data Limite
                  </label>
                  <input
                    type="date"
                    value={formData.data_limite}
                    onChange={(e) => setFormData({ ...formData, data_limite: e.target.value })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  />
                  {getTipoSelecionado() && (
                    <p className="text-xs text-gray-500 mt-1">
                      Prazo padrão: {getTipoSelecionado()?.prazo_padrao_dias} dias
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">
                    Valor Estimado
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">R$</span>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.valor_estimado}
                      onChange={(e) => setFormData({ ...formData, valor_estimado: parseFloat(e.target.value) || 0 })}
                      className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-md text-white/80 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => setStep(2)}
                  disabled={!formData.titulo || !formData.descricao || !formData.tipo_solicitacao_id}
                  className="px-4 py-2 bg-[#7D1F2C] text-white rounded-md hover:bg-[#6a1a25] disabled:opacity-50"
                >
                  Próximo: Detalhes Técnicos
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Detalhes Técnicos */}
          {step === 2 && (
            <div className="space-y-6">
              <h4 className="text-lg font-medium text-white mb-4">
                Detalhes Técnicos e Fornecedor
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-white/80 mb-1">
                    Detalhes Técnicos
                  </label>
                  <textarea
                    value={formData.detalhes_tecnicos}
                    onChange={(e) => setFormData({ ...formData, detalhes_tecnicos: e.target.value })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                    rows={3}
                    placeholder="Especificações técnicas, modelos, marcas preferidas, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">
                    Fornecedor Sugerido
                  </label>
                  <input
                    type="text"
                    value={formData.fornecedor_responsavel}
                    onChange={(e) => setFormData({ ...formData, fornecedor_responsavel: e.target.value })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                    placeholder="Nome do fornecedor"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">
                    Contato do Fornecedor
                  </label>
                  <input
                    type="text"
                    value={formData.contato_fornecedor}
                    onChange={(e) => setFormData({ ...formData, contato_fornecedor: e.target.value })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                    placeholder="Telefone ou email"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">
                    Solicitante
                  </label>
                  <input
                    type="text"
                    value={formData.solicitante_nome}
                    onChange={(e) => setFormData({ ...formData, solicitante_nome: e.target.value })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">
                    Email do Solicitante
                  </label>
                  <input
                    type="email"
                    value={formData.solicitante_email}
                    onChange={(e) => setFormData({ ...formData, solicitante_email: e.target.value })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  />
                </div>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-white/80 hover:bg-gray-50"
                >
                  Voltar
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="px-4 py-2 bg-[#7D1F2C] text-white rounded-md hover:bg-[#6a1a25]"
                >
                  {isAquisicao() ? 'Próximo: Itens' : 'Finalizar'}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Itens (só para aquisições) */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h4 className="text-lg font-medium text-white">
                  {isAquisicao() ? 'Itens a Serem Adquiridos' : 'Finalizar Solicitação'}
                </h4>
                {isAquisicao() && (
                  <button
                    onClick={adicionarItem}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4 inline mr-1" />
                    Adicionar Item
                  </button>
                )}
              </div>

              {isAquisicao() ? (
                <>
                  {formData.itens.length > 0 ? (
                    <div className="space-y-4">
                      {formData.itens.map((item, index) => (
                        <div key={index} className="p-4 border border-gray-200 rounded-lg">
                          <div className="flex justify-between items-start mb-3">
                            <h5 className="font-medium text-white">Item {index + 1}</h5>
                            <button
                              onClick={() => removerItem(index)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Nome do Item *
                              </label>
                              <input
                                type="text"
                                value={item.item_nome}
                                onChange={(e) => atualizarItem(index, 'item_nome', e.target.value)}
                                className="w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                                required
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Quantidade
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={item.quantidade}
                                onChange={(e) => atualizarItem(index, 'quantidade', parseFloat(e.target.value) || 1)}
                                className="w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Unidade
                              </label>
                              <select
                                value={item.unidade_medida}
                                onChange={(e) => atualizarItem(index, 'unidade_medida', e.target.value)}
                                className="w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                              >
                                {unidadesMedida.map((unidade) => (
                                  <option key={unidade} value={unidade}>
                                    {unidade}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Valor Unit. Estimado
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.valor_unitario_estimado}
                                onChange={(e) => atualizarItem(index, 'valor_unitario_estimado', parseFloat(e.target.value) || 0)}
                                className="w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Marca/Modelo
                              </label>
                              <input
                                type="text"
                                value={item.marca_sugerida}
                                onChange={(e) => atualizarItem(index, 'marca_sugerida', e.target.value)}
                                className="w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                                placeholder="Marca/Modelo sugerido"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Fornecedor Sugerido
                              </label>
                              <input
                                type="text"
                                value={item.fornecedor_sugerido}
                                onChange={(e) => atualizarItem(index, 'fornecedor_sugerido', e.target.value)}
                                className="w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                              />
                            </div>

                            <div className="md:col-span-3">
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Especificação Técnica
                              </label>
                              <textarea
                                value={item.especificacao_tecnica}
                                onChange={(e) => atualizarItem(index, 'especificacao_tecnica', e.target.value)}
                                className="w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                                rows={2}
                                placeholder="Especificações técnicas detalhadas..."
                              />
                            </div>

                            <div className="md:col-span-3 flex justify-end">
                              <div className="text-right">
                                <span className="text-sm text-gray-600">Valor Total:</span>
                                <span className="ml-2 text-lg font-bold text-[#7D1F2C]">
                                  {new Intl.NumberFormat('pt-BR', {
                                    style: 'currency',
                                    currency: 'BRL'
                                  }).format(item.quantidade * item.valor_unitario_estimado)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}

                      <div className="flex justify-end pt-3 border-t border-gray-200">
                        <div className="text-right">
                          <span className="text-sm text-gray-600">Valor Total da Solicitação:</span>
                          <span className="ml-2 text-xl font-bold text-[#7D1F2C]">
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL'
                            }).format(calcularValorTotalEstimado())}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                      <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 mb-4">Nenhum item adicionado</p>
                      <button
                        onClick={adicionarItem}
                        className="px-4 py-2 bg-[#7D1F2C] text-white rounded-lg hover:bg-[#6a1a25]"
                      >
                        Adicionar Primeiro Item
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">Solicitação Pronta!</h3>
                  <p className="text-gray-500 mb-4">
                    Sua solicitação está pronta para ser enviada.
                  </p>
                </div>
              )}

              <div className="flex justify-between">
                <button
                  onClick={() => setStep(2)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-white/80 hover:bg-gray-50"
                >
                  Voltar
                </button>
                <div className="space-x-3">
                  <button
                    onClick={() => handleSave(true)}
                    disabled={loading}
                    className="px-4 py-2 border border-gray-300 rounded-md text-white/80 hover:bg-gray-50 disabled:opacity-50"
                  >
                    {loading ? 'Salvando...' : 'Salvar Rascunho'}
                  </button>
                  <button
                    onClick={() => handleSave(false)}
                    disabled={loading || (!isAquisicao() ? false : formData.itens.length === 0)}
                    className="px-4 py-2 bg-[#7D1F2C] text-white rounded-md hover:bg-[#6a1a25] disabled:opacity-50"
                  >
                    {loading ? 'Enviando...' : 'Enviar Solicitação'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SolicitacaoForm;