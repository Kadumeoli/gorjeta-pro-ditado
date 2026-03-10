import React, { useState, useEffect } from 'react';
import {
  X, FileText, Image as ImageIcon, MessageSquare, Calendar,
  CheckCircle, Clock, Tag, DollarSign, Users, Edit2, Trash2,
  Plus, Upload, ExternalLink
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import dayjs from '../../lib/dayjs';
import ChatCampanha from './ChatCampanha';

interface Campanha {
  id: string;
  nome: string;
  descricao: string;
  objetivo: string;
  status: string;
  prioridade: string;
  tipo: string;
  canais: string[];
  data_inicio: string;
  data_fim: string;
  budget_planejado: number;
  budget_gasto: number;
  tags: string[];
  brief_id: string | null;
  created_at: string;
}

interface Ativo {
  id: string;
  nome: string;
  tipo: string;
  url: string;
  thumbnail_url: string;
  tamanho_bytes: number;
  formato: string;
}

interface Aprovacao {
  id: string;
  status: string;
  tipo: string;
  comentario: string;
  created_at: string;
}

interface Atividade {
  id: string;
  acao: string;
  descricao: string;
  created_at: string;
}

interface Brief {
  id: string;
  nome: string;
  objetivo: string;
  publico_alvo: string;
  mensagem_principal: string;
  cta: string;
  deadline: string;
  budget: number;
  observacoes: string;
  checklist: any[];
  status: string;
}

interface DetalhesCampanhaProps {
  campanhaId: string;
  onClose: () => void;
  onEdit: () => void;
  onDeleted: () => void;
}

const statusLabels: Record<string, string> = {
  draft: 'Rascunho',
  em_producao: 'Em Produção',
  em_revisao: 'Em Revisão',
  aprovado: 'Aprovado',
  agendado: 'Agendado',
  publicado: 'Publicado',
  pausado: 'Pausado',
  concluido: 'Concluído',
  cancelado: 'Cancelado'
};

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  em_producao: 'bg-blue-100 text-blue-800',
  em_revisao: 'bg-yellow-100 text-yellow-800',
  aprovado: 'bg-green-100 text-green-800',
  agendado: 'bg-sky-100 text-sky-800',
  publicado: 'bg-emerald-100 text-emerald-800',
  pausado: 'bg-orange-100 text-orange-800',
  concluido: 'bg-teal-100 text-teal-800',
  cancelado: 'bg-red-100 text-red-800'
};

const DetalhesCampanha: React.FC<DetalhesCampanhaProps> = ({
  campanhaId, onClose, onEdit, onDeleted
}) => {
  const [campanha, setCampanha] = useState<Campanha | null>(null);
  const [ativos, setAtivos] = useState<Ativo[]>([]);
  const [aprovacoes, setAprovacoes] = useState<Aprovacao[]>([]);
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [brief, setBrief] = useState<Brief | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'brief' | 'ativos' | 'chat' | 'aprovacoes' | 'historico'>('info');

  useEffect(() => {
    fetchCampanha();
    fetchAtivos();
    fetchAprovacoes();
    fetchAtividades();
  }, [campanhaId]);

  const fetchCampanha = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('campanhas_marketing')
        .select('*')
        .eq('id', campanhaId)
        .maybeSingle();

      if (error) throw error;
      setCampanha(data);

      if (data?.brief_id) {
        const { data: briefData } = await supabase
          .from('briefs_marketing')
          .select('*')
          .eq('id', data.brief_id)
          .maybeSingle();
        setBrief(briefData);
      }
    } catch (error) {
      console.error('Erro ao carregar campanha:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAtivos = async () => {
    const { data } = await supabase
      .from('campanhas_ativos')
      .select('*, ativos_marketing(*)')
      .eq('campanha_id', campanhaId)
      .order('ordem', { ascending: true });

    setAtivos(data?.map((ca: any) => ca.ativos_marketing).filter(Boolean) || []);
  };

  const fetchAprovacoes = async () => {
    const { data } = await supabase
      .from('campanhas_aprovacoes')
      .select('*')
      .eq('campanha_id', campanhaId)
      .order('created_at', { ascending: false });
    setAprovacoes(data || []);
  };

  const fetchAtividades = async () => {
    const { data } = await supabase
      .from('campanhas_atividades')
      .select('*')
      .eq('campanha_id', campanhaId)
      .order('created_at', { ascending: false })
      .limit(30);
    setAtividades(data || []);
  };

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja excluir esta campanha? Esta ação não pode ser desfeita.')) return;

    try {
      const { error } = await supabase
        .from('campanhas_marketing')
        .delete()
        .eq('id', campanhaId);

      if (error) throw error;
      onDeleted();
    } catch (error) {
      console.error('Erro ao excluir:', error);
      alert('Erro ao excluir campanha');
    }
  };

  const handleSolicitarAprovacao = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('campanhas_aprovacoes')
        .insert({
          campanha_id: campanhaId,
          aprovador_id: user.id,
          tipo: 'campanha',
          status: 'pendente'
        });

      if (error) throw error;

      await supabase
        .from('campanhas_marketing')
        .update({ status: 'em_revisao' })
        .eq('id', campanhaId);

      await fetchCampanha();
      await fetchAprovacoes();
      alert('Aprovação solicitada!');
    } catch (error) {
      console.error('Erro ao solicitar aprovação:', error);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading || !campanha) {
    return (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
        <div className="bg-white rounded-xl p-12">
          <p className="text-gray-500">Carregando...</p>
        </div>
      </div>
    );
  }

  const budgetPercent = campanha.budget_planejado > 0
    ? Math.min(100, (campanha.budget_gasto / campanha.budget_planejado) * 100)
    : 0;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-5xl w-full max-h-[92vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[campanha.status]}`}>
                {statusLabels[campanha.status]}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 capitalize">
                {campanha.prioridade}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 capitalize">
                {campanha.tipo}
              </span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">{campanha.nome}</h2>
            {campanha.objetivo && (
              <p className="text-sm text-gray-600 mt-1">{campanha.objetivo}</p>
            )}
          </div>
          <div className="flex items-center gap-2 ml-4">
            <button
              onClick={onEdit}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Editar"
            >
              <Edit2 className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={handleDelete}
              className="p-2 hover:bg-red-50 rounded-lg transition-colors"
              title="Excluir"
            >
              <Trash2 className="w-5 h-5 text-red-500" />
            </button>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        <div className="flex border-b border-gray-200 overflow-x-auto">
          {[
            { id: 'info', label: 'Informações', icon: FileText },
            { id: 'brief', label: 'Brief', icon: FileText },
            { id: 'ativos', label: `Ativos (${ativos.length})`, icon: ImageIcon },
            { id: 'chat', label: 'Chat', icon: MessageSquare },
            { id: 'aprovacoes', label: `Aprovações (${aprovacoes.length})`, icon: CheckCircle },
            { id: 'historico', label: 'Histórico', icon: Clock }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-amber-600 text-amber-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'info' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 mb-1">Período</p>
                  <p className="text-sm font-medium text-gray-900">
                    {campanha.data_inicio ? dayjs(campanha.data_inicio).format('DD/MM/YY') : '-'}
                    {' - '}
                    {campanha.data_fim ? dayjs(campanha.data_fim).format('DD/MM/YY') : '-'}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 mb-1">Budget</p>
                  <p className="text-sm font-medium text-gray-900">
                    R$ {Number(campanha.budget_planejado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 mb-1">Gasto</p>
                  <p className="text-sm font-medium text-gray-900">
                    R$ {Number(campanha.budget_gasto).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 mb-1">Utilização</p>
                  <p className="text-sm font-medium text-gray-900">{budgetPercent.toFixed(1)}%</p>
                </div>
              </div>

              {campanha.budget_planejado > 0 && (
                <div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        budgetPercent > 90 ? 'bg-red-500' : budgetPercent > 70 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${budgetPercent}%` }}
                    />
                  </div>
                </div>
              )}

              {campanha.descricao && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Descrição</h3>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{campanha.descricao}</p>
                </div>
              )}

              {campanha.canais && campanha.canais.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Canais</h3>
                  <div className="flex flex-wrap gap-2">
                    {campanha.canais.map((canal: string, idx: number) => (
                      <span key={idx} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                        {canal}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {campanha.tags && campanha.tags.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {campanha.tags.map((tag: string, idx: number) => (
                      <span key={idx} className="px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-medium">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {['draft', 'em_producao'].includes(campanha.status) && (
                <div className="pt-4 border-t border-gray-200">
                  <button
                    onClick={handleSolicitarAprovacao}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Solicitar Aprovação
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'brief' && (
            <div>
              {brief ? (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">{brief.nome}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      brief.status === 'aberto' ? 'bg-green-100 text-green-800'
                        : brief.status === 'em_uso' ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>{brief.status}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {brief.objetivo && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-xs font-medium text-gray-500 mb-1">Objetivo</p>
                        <p className="text-sm text-gray-800">{brief.objetivo}</p>
                      </div>
                    )}
                    {brief.publico_alvo && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-xs font-medium text-gray-500 mb-1">Público-alvo</p>
                        <p className="text-sm text-gray-800">{brief.publico_alvo}</p>
                      </div>
                    )}
                    {brief.mensagem_principal && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-xs font-medium text-gray-500 mb-1">Mensagem Principal</p>
                        <p className="text-sm text-gray-800">{brief.mensagem_principal}</p>
                      </div>
                    )}
                    {brief.cta && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-xs font-medium text-gray-500 mb-1">CTA</p>
                        <p className="text-sm text-gray-800">{brief.cta}</p>
                      </div>
                    )}
                  </div>
                  {brief.observacoes && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-xs font-medium text-gray-500 mb-1">Observações</p>
                      <p className="text-sm text-gray-800 whitespace-pre-wrap">{brief.observacoes}</p>
                    </div>
                  )}
                  {brief.checklist && brief.checklist.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Checklist</h4>
                      <div className="space-y-2">
                        {brief.checklist.map((item: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                              item.done ? 'bg-green-500 border-green-500' : 'border-gray-300'
                            }`}>
                              {item.done && <CheckCircle className="w-3 h-3 text-white" />}
                            </div>
                            <span className={`text-sm ${item.done ? 'text-gray-500 line-through' : 'text-gray-800'}`}>
                              {item.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 mb-4">Nenhum brief vinculado a esta campanha</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'ativos' && (
            <div>
              {ativos.length === 0 ? (
                <div className="text-center py-12">
                  <ImageIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 mb-4">Nenhum ativo vinculado</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {ativos.map(ativo => (
                    <div key={ativo.id} className="bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
                      <div className="aspect-square bg-gray-100 flex items-center justify-center">
                        {ativo.thumbnail_url ? (
                          <img src={ativo.thumbnail_url} alt={ativo.nome} className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="w-10 h-10 text-gray-400" />
                        )}
                      </div>
                      <div className="p-3">
                        <p className="text-sm font-medium text-gray-900 truncate">{ativo.nome}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {ativo.formato?.toUpperCase()} - {formatFileSize(ativo.tamanho_bytes)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'chat' && (
            <ChatCampanha campanhaId={campanhaId} />
          )}

          {activeTab === 'aprovacoes' && (
            <div>
              {aprovacoes.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Nenhuma aprovação registrada</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {aprovacoes.map(aprov => (
                    <div key={aprov.id} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                      <div className={`p-2 rounded-full ${
                        aprov.status === 'aprovado' ? 'bg-green-100' :
                        aprov.status === 'rejeitado' ? 'bg-red-100' : 'bg-yellow-100'
                      }`}>
                        <CheckCircle className={`w-4 h-4 ${
                          aprov.status === 'aprovado' ? 'text-green-600' :
                          aprov.status === 'rejeitado' ? 'text-red-600' : 'text-yellow-600'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-gray-900 capitalize">{aprov.status}</span>
                          <span className="text-xs text-gray-500">{aprov.tipo}</span>
                        </div>
                        {aprov.comentario && (
                          <p className="text-sm text-gray-600">{aprov.comentario}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          {dayjs(aprov.created_at).format('DD/MM/YYYY HH:mm')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'historico' && (
            <div>
              {atividades.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Nenhuma atividade registrada</p>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
                  <div className="space-y-4">
                    {atividades.map(atv => (
                      <div key={atv.id} className="relative flex items-start gap-4 pl-10">
                        <div className="absolute left-2.5 w-3 h-3 bg-amber-500 rounded-full border-2 border-white" />
                        <div className="flex-1 bg-gray-50 rounded-lg p-4">
                          <p className="text-sm text-gray-800">{atv.descricao}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {dayjs(atv.created_at).format('DD/MM/YYYY HH:mm')} - {dayjs(atv.created_at).fromNow()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DetalhesCampanha;
