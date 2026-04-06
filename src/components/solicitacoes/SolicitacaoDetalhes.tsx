import React, { useState, useEffect } from 'react';
import { X, Calendar, User, Building, Package, DollarSign, Clock, MessageSquare, FileText, Download, CreditCard as Edit, CheckCircle, XCircle, AlertTriangle, Star, Upload, Settings, Wrench, ShoppingCart, TrendingUp, AlertCircle, Info } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import dayjs from 'dayjs';
import { ReportGenerator } from '../../utils/reportGenerator';

interface SolicitacaoDetalhesProps {
  isOpen: boolean;
  onClose: () => void;
  solicitacao: any;
  onUpdate: () => void;
}

interface Comentario {
  id: string;
  autor_nome: string;
  comentario: string;
  tipo_comentario: string;
  criado_em: string;
}

interface Anexo {
  id: string;
  nome_arquivo: string;
  caminho_storage: string;
  tipo_arquivo?: string;
  tamanho_bytes?: number;
  enviado_por?: string;
  criado_em: string;
}

interface HistoricoItem {
  id: string;
  tipo_alteracao: string;
  campo_alterado?: string;
  valor_anterior?: string;
  valor_novo?: string;
  descricao: string;
  usuario: string;
  criado_em: string;
}

const SolicitacaoDetalhes: React.FC<SolicitacaoDetalhesProps> = ({
  isOpen,
  onClose,
  solicitacao,
  onUpdate
}) => {
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const [historico, setHistorico] = useState<HistoricoItem[]>([]);
  const [novoComentario, setNovoComentario] = useState('');
  const [tipoComentario, setTipoComentario] = useState('geral');
  const [loading, setLoading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'detalhes' | 'comentarios' | 'anexos' | 'historico'>('detalhes');

  useEffect(() => {
    if (isOpen && solicitacao) {
      fetchComentarios();
      fetchAnexos();
      fetchHistorico();
    }
  }, [isOpen, solicitacao]);

  const fetchComentarios = async () => {
    try {
      const { data, error } = await supabase
        .from('comentarios_solicitacao')
        .select('*')
        .eq('solicitacao_id', solicitacao.id)
        .order('criado_em', { ascending: true });

      if (error) throw error;
      setComentarios(data || []);
    } catch (err) {
      console.error('Error fetching comments:', err);
    }
  };

  const fetchAnexos = async () => {
    try {
      const { data, error } = await supabase
        .from('solicitacoes_anexos')
        .select('*')
        .eq('solicitacao_id', solicitacao.id)
        .order('criado_em', { ascending: false });

      if (error) throw error;
      setAnexos(data || []);
    } catch (err) {
      console.error('Error fetching attachments:', err);
    }
  };

  const fetchHistorico = async () => {
    try {
      const { data, error } = await supabase
        .from('solicitacoes_historico')
        .select('*')
        .eq('solicitacao_id', solicitacao.id)
        .order('criado_em', { ascending: false });

      if (error) throw error;
      setHistorico(data || []);
    } catch (err) {
      console.error('Error fetching history:', err);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploadingFile(true);
      setError(null);

      const fileExt = file.name.split('.').pop();
      const fileName = `${solicitacao.id}/${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('solicitacoes-anexos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('solicitacoes_anexos')
        .insert([{
          solicitacao_id: solicitacao.id,
          nome_arquivo: file.name,
          caminho_storage: uploadData.path,
          tipo_arquivo: file.type,
          tamanho_bytes: file.size,
          enviado_por: 'Usuário Sistema'
        }]);

      if (dbError) throw dbError;

      await fetchAnexos();
      await fetchHistorico();
      alert('Arquivo anexado com sucesso!');
    } catch (err) {
      console.error('Error uploading file:', err);
      setError('Erro ao fazer upload do arquivo. Verifique o tamanho e tipo do arquivo.');
    } finally {
      setUploadingFile(false);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const handleDownloadAnexo = async (anexo: Anexo) => {
    try {
      const { data, error } = await supabase.storage
        .from('solicitacoes-anexos')
        .download(anexo.caminho_storage);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = anexo.nome_arquivo;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading file:', err);
      alert('Erro ao baixar o arquivo');
    }
  };

  const handleDeleteAnexo = async (anexoId: string, caminhoStorage: string) => {
    if (!confirm('Tem certeza que deseja excluir este anexo?')) return;

    try {
      await supabase.storage
        .from('solicitacoes-anexos')
        .remove([caminhoStorage]);

      const { error } = await supabase
        .from('solicitacoes_anexos')
        .delete()
        .eq('id', anexoId);

      if (error) throw error;

      await fetchAnexos();
      await fetchHistorico();
      alert('Anexo excluído com sucesso!');
    } catch (err) {
      console.error('Error deleting attachment:', err);
      alert('Erro ao excluir anexo');
    }
  };

  const adicionarComentario = async () => {
    if (!novoComentario.trim()) return;

    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('comentarios_solicitacao')
        .insert([{
          solicitacao_id: solicitacao.id,
          autor_nome: 'Usuário Sistema', // TODO: Pegar do contexto
          comentario: novoComentario,
          tipo_comentario: tipoComentario
        }]);

      if (error) throw error;

      setNovoComentario('');
      setTipoComentario('geral');
      fetchComentarios();
      fetchHistorico();
    } catch (err) {
      console.error('Error adding comment:', err);
      setError('Erro ao adicionar comentário');
    } finally {
      setLoading(false);
    }
  };

  const atualizarStatus = async (novoStatus: string, observacoes?: string) => {
    try {
      setLoading(true);

      const updateData: any = {
        status: novoStatus
      };

      // Não há campos data_inicio_execucao, data_conclusao ou observacoes_execucao na tabela
      // Esses campos foram removidos do código

      const { error } = await supabase
        .from('solicitacoes')
        .update(updateData)
        .eq('id', solicitacao.id);

      if (error) throw error;

      // Adicionar comentário automático sobre mudança de status
      await supabase
        .from('comentarios_solicitacao')
        .insert([{
          solicitacao_id: solicitacao.id,
          autor_nome: 'Sistema',
          comentario: `Status alterado para: ${getStatusText(novoStatus)}${observacoes ? `. Observações: ${observacoes}` : ''}`,
          tipo_comentario: 'execucao'
        }]);

      onUpdate();
      fetchComentarios();
      fetchHistorico();
    } catch (err) {
      console.error('Error updating status:', err);
      setError('Erro ao atualizar status');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'rascunho':
        return 'text-white/80 bg-gray-100';
      case 'enviado':
        return 'text-blue-700 bg-blue-100';
      case 'em_analise':
        return 'text-yellow-700 bg-yellow-100';
      case 'aprovado':
        return 'text-green-700 bg-green-100';
      case 'em_execucao':
        return 'text-purple-700 bg-purple-100';
      case 'aguardando_orcamento':
        return 'text-orange-700 bg-orange-100';
      case 'orcamento_aprovado':
        return 'text-indigo-700 bg-indigo-100';
      case 'concluido':
        return 'text-green-700 bg-green-100';
      case 'rejeitado':
        return 'text-red-700 bg-red-100';
      case 'cancelado':
        return 'text-white/80 bg-gray-100';
      default:
        return 'text-white/80 bg-gray-100';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'rascunho':
        return 'Rascunho';
      case 'enviado':
        return 'Enviado';
      case 'em_analise':
        return 'Em Análise';
      case 'aprovado':
        return 'Aprovado';
      case 'em_execucao':
        return 'Em Execução';
      case 'aguardando_orcamento':
        return 'Aguardando Orçamento';
      case 'orcamento_aprovado':
        return 'Orçamento Aprovado';
      case 'concluido':
        return 'Concluído';
      case 'rejeitado':
        return 'Rejeitado';
      case 'cancelado':
        return 'Cancelado';
      default:
        return status;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getTipoComentarioColor = (tipo: string) => {
    switch (tipo) {
      case 'tecnico':
        return 'border-l-blue-500 bg-blue-50';
      case 'financeiro':
        return 'border-l-green-500 bg-green-50';
      case 'aprovacao':
        return 'border-l-purple-500 bg-purple-50';
      case 'execucao':
        return 'border-l-orange-500 bg-orange-50';
      default:
        return 'border-l-gray-500 bg-gray-50';
    }
  };

  const getTipoHistoricoIcon = (tipo: string) => {
    switch (tipo) {
      case 'criacao':
        return <Star className="w-5 h-5 text-blue-600" />;
      case 'status':
        return <TrendingUp className="w-5 h-5 text-green-600" />;
      case 'financeiro':
        return <DollarSign className="w-5 h-5 text-emerald-600" />;
      case 'dados':
        return <Edit className="w-5 h-5 text-orange-600" />;
      case 'comentario':
        return <MessageSquare className="w-5 h-5 text-purple-600" />;
      case 'anexo':
        return <FileText className="w-5 h-5 text-blue-600" />;
      default:
        return <Info className="w-5 h-5 text-gray-600" />;
    }
  };

  const getTipoHistoricoColor = (tipo: string) => {
    switch (tipo) {
      case 'criacao':
        return 'bg-blue-50 border-blue-200';
      case 'status':
        return 'bg-green-50 border-green-200';
      case 'financeiro':
        return 'bg-emerald-50 border-emerald-200';
      case 'dados':
        return 'bg-orange-50 border-orange-200';
      case 'comentario':
        return 'bg-purple-50 border-purple-200';
      case 'anexo':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getTipoHistoricoTexto = (tipo: string) => {
    switch (tipo) {
      case 'criacao':
        return 'Criação';
      case 'status':
        return 'Mudança de Status';
      case 'financeiro':
        return 'Alteração Financeira';
      case 'dados':
        return 'Atualização de Dados';
      case 'comentario':
        return 'Novo Comentário';
      case 'anexo':
        return 'Anexo';
      default:
        return tipo;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[95vh] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-medium text-white">
              {solicitacao.numero_solicitacao} - {solicitacao.titulo}
            </h3>
            <div className="flex items-center space-x-2 mt-1">
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(solicitacao.status)}`}>
                {getStatusText(solicitacao.status)}
              </span>
              <span className="text-sm text-gray-500">
                Criado em {dayjs(solicitacao.data_solicitacao).format('DD/MM/YYYY')}
              </span>
            </div>
          </div>
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

        <div className="flex h-[calc(95vh-140px)]">
          {/* Sidebar com Tabs */}
          <div className="w-64 border-r border-gray-200 p-4">
            <nav className="space-y-2">
              <button
                onClick={() => setActiveTab('detalhes')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'detalhes'
                    ? 'bg-[#7D1F2C] text-white'
                    : 'text-white/80 hover:bg-gray-100'
                }`}
              >
                <FileText className="w-4 h-4 mr-2" />
                Detalhes
              </button>
              <button
                onClick={() => setActiveTab('comentarios')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'comentarios'
                    ? 'bg-[#7D1F2C] text-white'
                    : 'text-white/80 hover:bg-gray-100'
                }`}
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Comentários ({comentarios.length})
              </button>
              <button
                onClick={() => setActiveTab('anexos')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'anexos'
                    ? 'bg-[#7D1F2C] text-white'
                    : 'text-white/80 hover:bg-gray-100'
                }`}
              >
                <FileText className="w-4 h-4 mr-2" />
                Anexos ({anexos.length})
              </button>
              <button
                onClick={() => setActiveTab('historico')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'historico'
                    ? 'bg-[#7D1F2C] text-white'
                    : 'text-white/80 hover:bg-gray-100'
                }`}
              >
                <Clock className="w-4 h-4 mr-2" />
                Histórico
              </button>
            </nav>

            {/* Ações Rápidas */}
            <div className="mt-6 space-y-2">
              <h4 className="text-sm font-medium text-gray-500 mb-2">Ações Rápidas</h4>
              
              {solicitacao.status === 'aprovado' && (
                <button
                  onClick={() => atualizarStatus('em_execucao')}
                  className="w-full px-3 py-2 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700"
                >
                  <Settings className="w-4 h-4 inline mr-1" />
                  Iniciar Execução
                </button>
              )}

              {solicitacao.status === 'em_execucao' && (
                <button
                  onClick={() => atualizarStatus('concluido')}
                  className="w-full px-3 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 inline mr-1" />
                  Marcar Concluído
                </button>
              )}

              {['enviado', 'em_analise'].includes(solicitacao.status) && (
                <>
                  <button
                    onClick={() => atualizarStatus('aprovado')}
                    className="w-full px-3 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
                  >
                    <CheckCircle className="w-4 h-4 inline mr-1" />
                    Aprovar
                  </button>
                  <button
                    onClick={() => atualizarStatus('rejeitado')}
                    className="w-full px-3 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700"
                  >
                    <XCircle className="w-4 h-4 inline mr-1" />
                    Rejeitar
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Conteúdo Principal */}
          <div className="flex-1 p-6 overflow-y-auto">
            {activeTab === 'detalhes' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-md font-medium text-white mb-3">Informações da Solicitação</h4>
                    <div className="space-y-3">
                      <div>
                        <span className="text-sm text-gray-600">Número:</span>
                        <span className="ml-2 font-medium">{solicitacao.numero_solicitacao}</span>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Tipo:</span>
                        <span className="ml-2 font-medium">{solicitacao.tipo_nome}</span>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Prioridade:</span>
                        <span className="ml-2 font-medium">{solicitacao.prioridade}</span>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Status:</span>
                        <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(solicitacao.status)}`}>
                          {getStatusText(solicitacao.status)}
                        </span>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Data Solicitação:</span>
                        <span className="ml-2 font-medium">
                          {dayjs(solicitacao.data_solicitacao).format('DD/MM/YYYY HH:mm')}
                        </span>
                      </div>
                      {solicitacao.data_limite && (
                        <div>
                          <span className="text-sm text-gray-600">Data Limite:</span>
                          <span className={`ml-2 font-medium ${
                            dayjs(solicitacao.data_limite).isBefore(dayjs()) ? 'text-red-600' : ''
                          }`}>
                            {dayjs(solicitacao.data_limite).format('DD/MM/YYYY')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-md font-medium text-white mb-3">Dados do Solicitante</h4>
                    <div className="space-y-3">
                      <div>
                        <span className="text-sm text-gray-600">Nome:</span>
                        <span className="ml-2 font-medium">{solicitacao.solicitante_nome}</span>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Setor:</span>
                        <span className="ml-2 font-medium">{solicitacao.setor_solicitante}</span>
                      </div>
                      {solicitacao.solicitante_email && (
                        <div>
                          <span className="text-sm text-gray-600">Email:</span>
                          <span className="ml-2 font-medium">{solicitacao.solicitante_email}</span>
                        </div>
                      )}
                      {solicitacao.local_servico && (
                        <div>
                          <span className="text-sm text-gray-600">Local:</span>
                          <span className="ml-2 font-medium">{solicitacao.local_servico}</span>
                        </div>
                      )}
                      {solicitacao.equipamento_afetado && (
                        <div>
                          <span className="text-sm text-gray-600">Equipamento:</span>
                          <span className="ml-2 font-medium">{solicitacao.equipamento_afetado}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-md font-medium text-white mb-3">Descrição</h4>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-white/80">{solicitacao.descricao}</p>
                  </div>
                </div>

                {solicitacao.detalhes_tecnicos && (
                  <div>
                    <h4 className="text-md font-medium text-white mb-3">Detalhes Técnicos</h4>
                    <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                      <p className="text-white/80">{solicitacao.detalhes_tecnicos}</p>
                    </div>
                  </div>
                )}

                {(solicitacao.valor_estimado > 0 || solicitacao.valor_total_orcado > 0) && (
                  <div>
                    <h4 className="text-md font-medium text-white mb-3">Informações Financeiras</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {solicitacao.valor_estimado > 0 && (
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <div className="text-sm text-gray-600">Valor Estimado</div>
                          <div className="text-lg font-bold text-white">
                            {formatCurrency(solicitacao.valor_estimado)}
                          </div>
                        </div>
                      )}
                      {solicitacao.valor_total_orcado > 0 && (
                        <div className="p-4 bg-blue-50 rounded-lg">
                          <div className="text-sm text-gray-600">Valor Orçado</div>
                          <div className="text-lg font-bold text-blue-600">
                            {formatCurrency(solicitacao.valor_total_orcado)}
                          </div>
                        </div>
                      )}
                      {solicitacao.valor_aprovado > 0 && (
                        <div className="p-4 bg-green-50 rounded-lg">
                          <div className="text-sm text-gray-600">Valor Aprovado</div>
                          <div className="text-lg font-bold text-green-600">
                            {formatCurrency(solicitacao.valor_aprovado)}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'comentarios' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-md font-medium text-white mb-4">Comentários</h4>
                  
                  {/* Adicionar novo comentário */}
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                      <div className="md:col-span-3">
                        <textarea
                          value={novoComentario}
                          onChange={(e) => setNovoComentario(e.target.value)}
                          className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                          rows={3}
                          placeholder="Adicionar comentário..."
                        />
                      </div>
                      <div className="space-y-2">
                        <select
                          value={tipoComentario}
                          onChange={(e) => setTipoComentario(e.target.value)}
                          className="w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                        >
                          <option value="geral">Geral</option>
                          <option value="tecnico">Técnico</option>
                          <option value="financeiro">Financeiro</option>
                          <option value="aprovacao">Aprovação</option>
                          <option value="execucao">Execução</option>
                        </select>
                        <button
                          onClick={adicionarComentario}
                          disabled={loading || !novoComentario.trim()}
                          className="w-full px-3 py-2 bg-[#7D1F2C] text-white text-sm rounded-md hover:bg-[#6a1a25] disabled:opacity-50"
                        >
                          Adicionar
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Lista de comentários */}
                  <div className="space-y-4">
                    {comentarios.map((comentario) => (
                      <div key={comentario.id} className={`p-4 rounded-lg border-l-4 ${getTipoComentarioColor(comentario.tipo_comentario)}`}>
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <span className="font-medium text-white">{comentario.autor_nome}</span>
                            <span className="ml-2 text-xs text-gray-500 capitalize">
                              ({comentario.tipo_comentario})
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">
                            {dayjs(comentario.criado_em).format('DD/MM/YYYY HH:mm')}
                          </span>
                        </div>
                        <p className="text-white/80">{comentario.comentario}</p>
                      </div>
                    ))}

                    {comentarios.length === 0 && (
                      <div className="text-center py-8">
                        <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">Nenhum comentário ainda</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'anexos' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h4 className="text-md font-medium text-white">Anexos</h4>
                  <label className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 cursor-pointer">
                    <Upload className="w-4 h-4 inline mr-1" />
                    {uploadingFile ? 'Enviando...' : 'Adicionar Anexo'}
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={uploadingFile}
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.jpg,.jpeg,.png,.gif,.webp"
                    />
                  </label>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                <div className="space-y-3">
                  {anexos.map((anexo) => (
                    <div key={anexo.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <div className="flex items-center flex-1">
                        <FileText className="w-5 h-5 text-gray-400 mr-3" />
                        <div className="flex-1">
                          <div className="font-medium text-white">{anexo.nome_arquivo}</div>
                          <div className="text-sm text-gray-500">
                            {anexo.tipo_arquivo || 'Arquivo'}
                            {anexo.tamanho_bytes && ` • ${(anexo.tamanho_bytes / 1024 / 1024).toFixed(2)} MB`}
                            {' • '}
                            {dayjs(anexo.criado_em).format('DD/MM/YYYY HH:mm')}
                          </div>
                          {anexo.enviado_por && (
                            <div className="text-xs text-gray-500">Enviado por: {anexo.enviado_por}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleDownloadAnexo(anexo)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Baixar arquivo"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteAnexo(anexo.id, anexo.caminho_storage)}
                          className="text-red-600 hover:text-red-800"
                          title="Excluir anexo"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {anexos.length === 0 && (
                    <div className="text-center py-8">
                      <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">Nenhum anexo ainda</p>
                      <p className="text-sm text-gray-400 mt-2">
                        Clique em "Adicionar Anexo" para enviar um arquivo
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'historico' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-md font-medium text-white">Histórico Completo</h4>
                  <span className="text-sm text-gray-500">
                    {historico.length} {historico.length === 1 ? 'registro' : 'registros'}
                  </span>
                </div>

                {historico.length > 0 ? (
                  <div className="relative">
                    {/* Linha do tempo */}
                    <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>

                    <div className="space-y-6">
                      {historico.map((item, index) => (
                        <div key={item.id} className="relative pl-16">
                          {/* Ícone na timeline */}
                          <div className="absolute left-3 top-1 bg-white p-1 rounded-full border-2 border-gray-200">
                            {getTipoHistoricoIcon(item.tipo_alteracao)}
                          </div>

                          {/* Conteúdo do histórico */}
                          <div className={`p-4 rounded-lg border ${getTipoHistoricoColor(item.tipo_alteracao)}`}>
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-1">
                                  <span className="text-sm font-semibold text-white">
                                    {getTipoHistoricoTexto(item.tipo_alteracao)}
                                  </span>
                                  {item.campo_alterado && (
                                    <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded">
                                      {item.campo_alterado}
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-white/80">{item.descricao}</p>

                                {/* Mostrar valores anterior e novo se existirem */}
                                {(item.valor_anterior || item.valor_novo) && item.tipo_alteracao !== 'status' && item.tipo_alteracao !== 'comentario' && (
                                  <div className="mt-2 grid grid-cols-2 gap-3 text-xs">
                                    {item.valor_anterior && (
                                      <div className="bg-white bg-opacity-50 p-2 rounded">
                                        <div className="text-gray-500 mb-1">Valor Anterior</div>
                                        <div className="font-medium text-white/80 truncate">
                                          {item.valor_anterior}
                                        </div>
                                      </div>
                                    )}
                                    {item.valor_novo && (
                                      <div className="bg-white bg-opacity-50 p-2 rounded">
                                        <div className="text-gray-500 mb-1">Novo Valor</div>
                                        <div className="font-medium text-white/80 truncate">
                                          {item.valor_novo}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>

                              <div className="text-right ml-4">
                                <div className="text-xs text-gray-500">
                                  {dayjs(item.criado_em).format('DD/MM/YYYY')}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {dayjs(item.criado_em).format('HH:mm')}
                                </div>
                                {item.usuario && item.usuario !== 'Sistema' && (
                                  <div className="text-xs text-gray-600 mt-1 font-medium">
                                    {item.usuario}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg mb-2">Nenhum histórico disponível</p>
                    <p className="text-gray-400 text-sm">
                      As alterações nesta solicitação aparecerão aqui
                    </p>
                  </div>
                )}

                {/* Estatísticas do histórico */}
                {historico.length > 0 && (
                  <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <div className="text-xs text-blue-600 mb-1">Status</div>
                      <div className="text-lg font-bold text-blue-700">
                        {historico.filter(h => h.tipo_alteracao === 'status').length}
                      </div>
                    </div>
                    <div className="bg-emerald-50 p-3 rounded-lg">
                      <div className="text-xs text-emerald-600 mb-1">Financeiro</div>
                      <div className="text-lg font-bold text-emerald-700">
                        {historico.filter(h => h.tipo_alteracao === 'financeiro').length}
                      </div>
                    </div>
                    <div className="bg-purple-50 p-3 rounded-lg">
                      <div className="text-xs text-purple-600 mb-1">Comentários</div>
                      <div className="text-lg font-bold text-purple-700">
                        {historico.filter(h => h.tipo_alteracao === 'comentario').length}
                      </div>
                    </div>
                    <div className="bg-orange-50 p-3 rounded-lg">
                      <div className="text-xs text-orange-600 mb-1">Anexos</div>
                      <div className="text-lg font-bold text-orange-700">
                        {historico.filter(h => h.tipo_alteracao === 'anexo').length}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SolicitacaoDetalhes;