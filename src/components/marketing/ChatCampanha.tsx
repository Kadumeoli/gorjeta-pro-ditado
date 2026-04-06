import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Paperclip,
  Smile,
  Pin,
  MoreVertical,
  Edit2,
  Trash2,
  Reply
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import dayjs from '../../lib/dayjs';

interface Mensagem {
  id: string;
  campanha_id: string;
  usuario_id: string;
  mensagem: string;
  mencoes: string[];
  anexos: any[];
  thread_pai_id: string | null;
  editado: boolean;
  fixado: boolean;
  created_at: string;
  updated_at: string;
}

interface ChatCampanhaProps {
  campanhaId: string;
}

const ChatCampanha: React.FC<ChatCampanhaProps> = ({ campanhaId }) => {
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [novaMensagem, setNovaMensagem] = useState('');
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [replyTo, setReplyTo] = useState<Mensagem | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (campanhaId) {
      fetchMensagens();
      subscribeToMessages();
    }
  }, [campanhaId]);

  useEffect(() => {
    scrollToBottom();
  }, [mensagens]);

  const fetchMensagens = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('campanhas_chat')
        .select('*')
        .eq('campanha_id', campanhaId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMensagens(data || []);
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToMessages = () => {
    const subscription = supabase
      .channel(`chat_${campanhaId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'campanhas_chat',
          filter: `campanha_id=eq.${campanhaId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setMensagens(prev => [...prev, payload.new as Mensagem]);
          } else if (payload.eventType === 'UPDATE') {
            setMensagens(prev =>
              prev.map(m => (m.id === payload.new.id ? payload.new as Mensagem : m))
            );
          } else if (payload.eventType === 'DELETE') {
            setMensagens(prev => prev.filter(m => m.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleEnviarMensagem = async () => {
    if (!novaMensagem.trim() || enviando) return;

    try {
      setEnviando(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error('Usuário não autenticado');

      const mencoes = extrairMencoes(novaMensagem);

      const { error } = await supabase
        .from('campanhas_chat')
        .insert({
          campanha_id: campanhaId,
          usuario_id: user.id,
          mensagem: novaMensagem,
          mencoes,
          thread_pai_id: replyTo?.id || null
        });

      if (error) throw error;

      setNovaMensagem('');
      setReplyTo(null);
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      alert('Erro ao enviar mensagem');
    } finally {
      setEnviando(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleEnviarMensagem();
    }
  };

  const extrairMencoes = (texto: string): string[] => {
    const regex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    const mencoes: string[] = [];
    let match;
    while ((match = regex.exec(texto)) !== null) {
      mencoes.push(match[2]);
    }
    return mencoes;
  };

  const handleFixarMensagem = async (mensagemId: string, fixado: boolean) => {
    try {
      const { error } = await supabase
        .from('campanhas_chat')
        .update({ fixado: !fixado })
        .eq('id', mensagemId);

      if (error) throw error;
    } catch (error) {
      console.error('Erro ao fixar mensagem:', error);
    }
  };

  const handleDeletarMensagem = async (mensagemId: string) => {
    if (!confirm('Deseja deletar esta mensagem?')) return;

    try {
      const { error } = await supabase
        .from('campanhas_chat')
        .delete()
        .eq('id', mensagemId);

      if (error) throw error;
    } catch (error) {
      console.error('Erro ao deletar mensagem:', error);
    }
  };

  const mensagensFixadas = mensagens.filter(m => m.fixado);
  const mensagensNormais = mensagens.filter(m => !m.fixado);

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-lg border border-gray-200">
      {mensagensFixadas.length > 0 && (
        <div className="border-b border-gray-200 bg-amber-50 p-4">
          <p className="text-xs font-semibold text-amber-900 mb-2 flex items-center gap-2">
            <Pin className="w-4 h-4" />
            Mensagens Fixadas
          </p>
          {mensagensFixadas.map(msg => (
            <div key={msg.id} className="text-sm text-white/80 mb-1">
              {msg.mensagem}
            </div>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <p className="text-center text-gray-500 py-8">Carregando mensagens...</p>
        ) : mensagensNormais.length === 0 ? (
          <p className="text-center text-gray-500 py-8">
            Nenhuma mensagem ainda. Inicie a conversa!
          </p>
        ) : (
          mensagensNormais.map(mensagem => (
            <div
              key={mensagem.id}
              className="group flex gap-3 hover:bg-gray-50 p-2 rounded-lg transition-colors"
            >
              <div className="flex-shrink-0 w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                <span className="text-xs font-medium text-gray-600">U</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm text-white">Usuário</span>
                  <span className="text-xs text-gray-500">
                    {dayjs(mensagem.created_at).format('HH:mm')}
                  </span>
                  {mensagem.editado && (
                    <span className="text-xs text-gray-400">(editado)</span>
                  )}
                </div>
                {mensagem.thread_pai_id && (
                  <div className="text-xs text-gray-500 mb-1 pl-3 border-l-2 border-gray-300">
                    Respondendo...
                  </div>
                )}
                <p className="text-sm text-white/80 whitespace-pre-wrap">
                  {mensagem.mensagem}
                </p>
                {mensagem.anexos && mensagem.anexos.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {mensagem.anexos.map((anexo, idx) => (
                      <div
                        key={idx}
                        className="px-3 py-1 bg-gray-100 rounded text-xs flex items-center gap-2"
                      >
                        <Paperclip className="w-3 h-3" />
                        {anexo.nome}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setReplyTo(mensagem)}
                    className="p-1 hover:bg-gray-200 rounded"
                    title="Responder"
                  >
                    <Reply className="w-4 h-4 text-gray-600" />
                  </button>
                  <button
                    onClick={() => handleFixarMensagem(mensagem.id, mensagem.fixado)}
                    className="p-1 hover:bg-gray-200 rounded"
                    title={mensagem.fixado ? 'Desafixar' : 'Fixar'}
                  >
                    <Pin className="w-4 h-4 text-gray-600" />
                  </button>
                  <button
                    onClick={() => handleDeletarMensagem(mensagem.id)}
                    className="p-1 hover:bg-gray-200 rounded"
                    title="Deletar"
                  >
                    <Trash2 className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {replyTo && (
        <div className="border-t border-b border-gray-200 bg-gray-50 p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Reply className="w-4 h-4 text-gray-600" />
            <span className="text-sm text-white/80">
              Respondendo: {replyTo.mensagem.substring(0, 50)}...
            </span>
          </div>
          <button
            onClick={() => setReplyTo(null)}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <div className="border-t border-gray-200 p-4">
        <div className="flex items-end gap-2">
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <Paperclip className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1">
            <textarea
              value={novaMensagem}
              onChange={(e) => setNovaMensagem(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Digite sua mensagem... (use @ para mencionar)"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
              rows={2}
              disabled={enviando}
            />
          </div>
          <button
            onClick={handleEnviarMensagem}
            disabled={!novaMensagem.trim() || enviando}
            className="p-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Pressione Enter para enviar, Shift+Enter para nova linha
        </p>
      </div>
    </div>
  );
};

export default ChatCampanha;
