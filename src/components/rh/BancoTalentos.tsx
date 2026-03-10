import React, { useState, useEffect } from 'react';
import {
  Users, Search, Filter, Eye, Star, Phone, Mail, Calendar,
  Briefcase, DollarSign, Clock, CheckCircle, XCircle, Edit
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import FichaCandidato from './FichaCandidato';

interface Talento {
  id: string;
  candidato_id: string;
  data_inclusao: string;
  motivo_inclusao: string;
  areas_interesse: string[];
  disponibilidade: string;
  pretensao_salarial: number;
  observacoes: string;
  status: string;
  candidato?: {
    nome: string;
    email: string;
    telefone: string;
    endereco: string;
    cidade: string;
    estado: string;
    curriculo_texto: string;
  };
  candidatura?: {
    vaga?: {
      titulo: string;
    };
  };
}

export default function BancoTalentos() {
  const [talentos, setTalentos] = useState<Talento[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ativo');
  const [selectedTalento, setSelectedTalento] = useState<Talento | null>(null);
  const [showFicha, setShowFicha] = useState(false);

  useEffect(() => {
    carregarTalentos();
  }, [statusFilter]);

  const carregarTalentos = async () => {
    try {
      setLoading(true);
      console.log('Carregando talentos com filtro:', statusFilter);

      let query = supabase
        .from('banco_talentos')
        .select(`
          *,
          candidato:rh_candidatos(*),
          candidatura:rh_candidaturas(
            vaga:rh_vagas(titulo)
          )
        `)
        .order('data_inclusao', { ascending: false });

      if (statusFilter !== 'todos') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      console.log('Resultado da query:', { data, error });

      if (error) throw error;
      setTalentos(data || []);
      console.log('Talentos carregados:', data?.length || 0);
    } catch (error) {
      console.error('Erro ao carregar banco de talentos:', error);
      alert('Erro ao carregar banco de talentos: ' + (error as any).message);
    } finally {
      setLoading(false);
    }
  };

  const filteredTalentos = talentos.filter(t => {
    const searchLower = searchTerm.toLowerCase();
    return (
      t.candidato?.nome.toLowerCase().includes(searchLower) ||
      t.candidato?.email.toLowerCase().includes(searchLower) ||
      t.areas_interesse?.some(area => area.toLowerCase().includes(searchLower))
    );
  });

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; label: string; icon: any }> = {
      ativo: { color: 'bg-green-100 text-green-800', label: 'Ativo', icon: CheckCircle },
      contatado: { color: 'bg-blue-100 text-blue-800', label: 'Contatado', icon: Phone },
      contratado: { color: 'bg-purple-100 text-purple-800', label: 'Contratado', icon: Star },
      inativo: { color: 'bg-gray-100 text-gray-800', label: 'Inativo', icon: XCircle }
    };
    const badge = badges[status] || badges.ativo;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${badge.color}`}>
        <Icon className="w-4 h-4" />
        {badge.label}
      </span>
    );
  };

  const atualizarStatus = async (id: string, novoStatus: string) => {
    try {
      const { error } = await supabase
        .from('banco_talentos')
        .update({ status: novoStatus })
        .eq('id', id);

      if (error) throw error;
      await carregarTalentos();
      alert('Status atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      alert('Erro ao atualizar status');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-8 h-8 text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Banco de Talentos</h2>
            <p className="text-gray-600">Candidatos em destaque para futuras oportunidades</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por nome, email ou área de interesse..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="ativo">Ativos</option>
              <option value="contatado">Contatados</option>
              <option value="contratado">Contratados</option>
              <option value="inativo">Inativos</option>
              <option value="todos">Todos</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-600">Carregando talentos...</p>
          </div>
        ) : filteredTalentos.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Nenhum talento encontrado</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTalentos.map((talento) => (
              <div
                key={talento.id}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {talento.candidato?.nome}
                    </h3>
                    {getStatusBadge(talento.status)}
                  </div>
                </div>

                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  {talento.candidato?.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span className="truncate">{talento.candidato.email}</span>
                    </div>
                  )}

                  {talento.candidato?.telefone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span>{talento.candidato.telefone}</span>
                    </div>
                  )}

                  {talento.areas_interesse && talento.areas_interesse.length > 0 && (
                    <div className="flex items-start gap-2">
                      <Briefcase className="w-4 h-4 text-gray-400 mt-0.5" />
                      <div className="flex flex-wrap gap-1">
                        {talento.areas_interesse.slice(0, 3).map((area, idx) => (
                          <span key={idx} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                            {area}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {talento.pretensao_salarial && (
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-gray-400" />
                      <span>R$ {talento.pretensao_salarial.toLocaleString('pt-BR')}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Calendar className="w-4 h-4" />
                    <span>Incluído em {new Date(talento.data_inclusao).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedTalento(talento);
                      setShowFicha(true);
                    }}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm"
                  >
                    <Eye className="w-4 h-4" />
                    Ver Ficha
                  </button>

                  <select
                    value={talento.status}
                    onChange={(e) => atualizarStatus(talento.id, e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="ativo">Ativo</option>
                    <option value="contatado">Contatado</option>
                    <option value="contratado">Contratado</option>
                    <option value="inativo">Inativo</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showFicha && selectedTalento && (
        <FichaCandidato
          talento={selectedTalento}
          onClose={() => {
            setShowFicha(false);
            setSelectedTalento(null);
          }}
          onUpdate={carregarTalentos}
        />
      )}
    </div>
  );
}
