import React, { useState, useEffect } from 'react';
import {
  Check,
  X,
  Clock,
  MessageSquare,
  AlertCircle,
  Filter,
  Search
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import dayjs from '../../lib/dayjs';

interface Aprovacao {
  id: string;
  campanha_id: string;
  ativo_id: string | null;
  aprovador_id: string;
  status: 'pendente' | 'aprovado' | 'rejeitado';
  comentario: string | null;
  tipo: 'campanha' | 'ativo' | 'brief';
  ordem: number;
  created_at: string;
  updated_at: string;
  campanha?: {
    nome: string;
    prioridade: string;
  };
  ativo?: {
    nome: string;
    thumbnail_url: string;
  };
}

const tipoLabels = {
  campanha: 'Campanha',
  ativo: 'Ativo',
  brief: 'Brief'
};

const statusColors = {
  pendente: 'bg-yellow-100 text-yellow-800',
  aprovado: 'bg-green-100 text-green-800',
  rejeitado: 'bg-red-100 text-red-800'
};

const SistemaAprovacoes: React.FC = () => {
  const [aprovacoes, setAprovacoes] = useState<Aprovacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState<string>('pendente');
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAprovacao, setSelectedAprovacao] = useState<Aprovacao | null>(null);
  const [comentario, setComentario] = useState('');
  const [processando, setProcessando] = useState(false);

  useEffect(() => {
    fetchAprovacoes();
  }, [filtroStatus, filtroTipo]);

  const fetchAprovacoes = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      let query = supabase
        .from('campanhas_aprovacoes')
        .select(`
          *,
          campanhas_marketing(nome, prioridade),
          ativos_marketing(nome, thumbnail_url)
        `)
        .eq('aprovador_id', user.id)
        .order('created_at', { ascending: false });

      if (filtroStatus !== 'todos') {
        query = query.eq('status', filtroStatus);
      }

      if (filtroTipo !== 'todos') {
        query = query.eq('tipo', filtroTipo);
      }

      const { data, error } = await query;

      if (error) throw error;

      const aprovacoesFormatadas = data?.map(a => ({
        ...a,
        campanha: (a as any).campanhas_marketing,
        ativo: (a as any).ativos_marketing
      })) || [];

      setAprovacoes(aprovacoesFormatadas);
    } catch (error) {
      console.error('Erro ao carregar aprovações:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAprovar = async (aprovacaoId: string) => {
    if (!confirm('Deseja aprovar este item?')) return;

    try {
      setProcessando(true);
      const { error } = await supabase
        .from('campanhas_aprovacoes')
        .update({
          status: 'aprovado',
          comentario: comentario || null
        })
        .eq('id', aprovacaoId);

      if (error) throw error;

      await fetchAprovacoes();
      setSelectedAprovacao(null);
      setComentario('');
      alert('Item aprovado com sucesso!');
    } catch (error) {
      console.error('Erro ao aprovar:', error);
      alert('Erro ao aprovar item');
    } finally {
      setProcessando(false);
    }
  };

  const handleRejeitar = async (aprovacaoId: string) => {
    if (!comentario.trim()) {
      alert('Por favor, adicione um comentário explicando a rejeição.');
      return;
    }

    if (!confirm('Deseja rejeitar este item?')) return;

    try {
      setProcessando(true);
      const { error } = await supabase
        .from('campanhas_aprovacoes')
        .update({
          status: 'rejeitado',
          comentario
        })
        .eq('id', aprovacaoId);

      if (error) throw error;

      await fetchAprovacoes();
      setSelectedAprovacao(null);
      setComentario('');
      alert('Item rejeitado.');
    } catch (error) {
      console.error('Erro ao rejeitar:', error);
      alert('Erro ao rejeitar item');
    } finally {
      setProcessando(false);
    }
  };

  const filteredAprovacoes = aprovacoes.filter(a =>
    searchTerm === '' ||
    a.campanha?.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.ativo?.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const aprovacoesStats = {
    pendentes: aprovacoes.filter(a => a.status === 'pendente').length,
    aprovadas: aprovacoes.filter(a => a.status === 'aprovado').length,
    rejeitadas: aprovacoes.filter(a => a.status === 'rejeitado').length
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-700">Pendentes</p>
              <p className="text-2xl font-bold text-yellow-900">
                {aprovacoesStats.pendentes}
              </p>
            </div>
            <Clock className="w-8 h-8 text-yellow-600" />
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-700">Aprovadas</p>
              <p className="text-2xl font-bold text-green-900">
                {aprovacoesStats.aprovadas}
              </p>
            </div>
            <Check className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-700">Rejeitadas</p>
              <p className="text-2xl font-bold text-red-900">
                {aprovacoesStats.rejeitadas}
              </p>
            </div>
            <X className="w-8 h-8 text-red-600" />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar aprovações..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
        </div>

        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
        >
          <option value="todos">Todos os status</option>
          <option value="pendente">Pendente</option>
          <option value="aprovado">Aprovado</option>
          <option value="rejeitado">Rejeitado</option>
        </select>

        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
        >
          <option value="todos">Todos os tipos</option>
          <option value="campanha">Campanhas</option>
          <option value="ativo">Ativos</option>
          <option value="brief">Briefs</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Carregando aprovações...</p>
        </div>
      ) : filteredAprovacoes.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">Nenhuma aprovação encontrada</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAprovacoes.map(aprovacao => (
            <div
              key={aprovacao.id}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        statusColors[aprovacao.status]
                      }`}
                    >
                      {aprovacao.status}
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-white/80">
                      {tipoLabels[aprovacao.tipo]}
                    </span>
                    {aprovacao.campanha?.prioridade && (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                        {aprovacao.campanha.prioridade}
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-semibold text-white mb-2">
                    {aprovacao.tipo === 'campanha' && aprovacao.campanha?.nome}
                    {aprovacao.tipo === 'ativo' && aprovacao.ativo?.nome}
                    {aprovacao.tipo === 'brief' && 'Brief de Campanha'}
                  </h3>

                  {aprovacao.ativo?.thumbnail_url && (
                    <img
                      src={aprovacao.ativo.thumbnail_url}
                      alt={aprovacao.ativo.nome}
                      className="w-32 h-32 object-cover rounded-lg mb-3"
                    />
                  )}

                  {aprovacao.comentario && (
                    <div className="flex items-start gap-2 mt-3 p-3 bg-gray-50 rounded-lg">
                      <MessageSquare className="w-4 h-4 text-gray-500 mt-0.5" />
                      <p className="text-sm text-white/80">{aprovacao.comentario}</p>
                    </div>
                  )}

                  <div className="flex items-center gap-4 mt-4 text-sm text-gray-500">
                    <span>Ordem: {aprovacao.ordem}</span>
                    <span>•</span>
                    <span>Criado {dayjs(aprovacao.created_at).fromNow()}</span>
                  </div>
                </div>

                {aprovacao.status === 'pendente' && (
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => setSelectedAprovacao(aprovacao)}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <Check className="w-4 h-4" />
                      Aprovar
                    </button>
                    <button
                      onClick={() => {
                        setSelectedAprovacao(aprovacao);
                        setComentario('');
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <X className="w-4 h-4" />
                      Rejeitar
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedAprovacao && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <h3 className="text-xl font-bold text-white mb-4">
              {selectedAprovacao.status === 'pendente' ? 'Aprovar/Rejeitar' : 'Detalhes da Aprovação'}
            </h3>

            <div className="mb-4">
              <p className="text-sm text-white/80 mb-2">
                <strong>Tipo:</strong> {tipoLabels[selectedAprovacao.tipo]}
              </p>
              <p className="text-sm text-white/80 mb-2">
                <strong>Item:</strong>{' '}
                {selectedAprovacao.tipo === 'campanha' && selectedAprovacao.campanha?.nome}
                {selectedAprovacao.tipo === 'ativo' && selectedAprovacao.ativo?.nome}
                {selectedAprovacao.tipo === 'brief' && 'Brief de Campanha'}
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-white/80 mb-2">
                Comentário {selectedAprovacao.status === 'pendente' && '(opcional para aprovar, obrigatório para rejeitar)'}
              </label>
              <textarea
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                placeholder="Adicione seus comentários aqui..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                rows={4}
                disabled={selectedAprovacao.status !== 'pendente'}
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setSelectedAprovacao(null);
                  setComentario('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={processando}
              >
                Cancelar
              </button>
              {selectedAprovacao.status === 'pendente' && (
                <>
                  <button
                    onClick={() => handleRejeitar(selectedAprovacao.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                    disabled={processando}
                  >
                    <X className="w-4 h-4" />
                    Rejeitar
                  </button>
                  <button
                    onClick={() => handleAprovar(selectedAprovacao.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                    disabled={processando}
                  >
                    <Check className="w-4 h-4" />
                    Aprovar
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SistemaAprovacoes;
