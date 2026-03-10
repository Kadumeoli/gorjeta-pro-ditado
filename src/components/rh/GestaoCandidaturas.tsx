import React, { useState, useEffect } from 'react';
import {
  Users, Upload, FileText, Brain, TrendingUp,
  CheckCircle, XCircle, Clock, Search, Filter,
  Eye, Mail, Phone, MapPin, Calendar, Award,
  AlertCircle, Download, MessageSquare, Link as LinkIcon, Copy
} from 'lucide-react';
import { candidaturaService, vagaService, candidatoService } from '../../services/rhService';
import { supabase } from '../../lib/supabase';
import PreEntrevistaView from './PreEntrevistaView';

interface Candidatura {
  id: string;
  vaga_id: string;
  candidato_id: string;
  status: string;
  etapa_atual: string;
  data_aplicacao: string;
  notas?: Record<string, number>;
  pontuacao_geral?: number;
  parecer_ia?: string;
  recomendacao?: string;
  observacoes?: string;
  vaga?: any;
  candidato?: any;
}

interface Vaga {
  id: string;
  titulo: string;
  status: string;
}

const GestaoCandidaturas: React.FC = () => {
  const [candidaturas, setCandidaturas] = useState<Candidatura[]>([]);
  const [vagas, setVagas] = useState<Vaga[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVaga, setSelectedVaga] = useState<string>('todas');
  const [selectedStatus, setSelectedStatus] = useState<string>('todas');
  const [searchTerm, setSearchTerm] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedCandidatura, setSelectedCandidatura] = useState<Candidatura | null>(null);
  const [showAnaliseModal, setShowAnaliseModal] = useState(false);
  const [preEntrevistas, setPreEntrevistas] = useState<Record<string, any>>({});
  const [showProximaEtapaModal, setShowProximaEtapaModal] = useState(false);

  useEffect(() => {
    carregarDados();
  }, [selectedVaga, selectedStatus]);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [candidaturasData, vagasData] = await Promise.all([
        candidaturaService.listar(
          selectedVaga === 'todas' ? undefined : selectedVaga,
          selectedStatus === 'todas' ? undefined : selectedStatus
        ),
        vagaService.listar()
      ]);
      setCandidaturas(candidaturasData);
      setVagas(vagasData.filter(v => v.status === 'aberta'));

      // Carregar status das pré-entrevistas
      if (candidaturasData.length > 0) {
        const { data: preEntrevistasData } = await supabase
          .from('rh_pre_entrevistas')
          .select('candidatura_id, status, pontuacao, recomendacao')
          .in('candidatura_id', candidaturasData.map(c => c.id));

        const preEntrevistasMap: Record<string, any> = {};
        preEntrevistasData?.forEach(pe => {
          preEntrevistasMap[pe.candidatura_id] = pe;
        });
        setPreEntrevistas(preEntrevistasMap);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      alert('Erro ao carregar candidaturas');
    } finally {
      setLoading(false);
    }
  };

  const handleAnalisarCurriculo = async (candidaturaId: string, curriculoTexto: string) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analisar-curriculo-ia`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            candidatura_id: candidaturaId,
            curriculo_texto: curriculoTexto
          })
        }
      );

      if (!response.ok) throw new Error('Erro ao analisar currículo');

      const result = await response.json();
      alert('Currículo analisado com sucesso!');
      carregarDados();
    } catch (error) {
      console.error('Erro ao analisar currículo:', error);
      alert('Erro ao analisar currículo');
    }
  };

  const handleGerarLinkPreEntrevista = async (candidatura_id: string) => {
    try {
      // Verificar se já existe link
      const { data: existente, error: erroCheck } = await supabase
        .from('rh_pre_entrevistas')
        .select('token')
        .eq('candidatura_id', candidatura_id)
        .maybeSingle();

      if (erroCheck) {
        console.error('Erro ao verificar pré-entrevista:', erroCheck);
        throw erroCheck;
      }

      let token;
      if (existente) {
        token = existente.token;
      } else {
        // Gerar token único
        token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');

        // Criar registro
        const { error: erroInsert } = await supabase
          .from('rh_pre_entrevistas')
          .insert({
            candidatura_id,
            token,
            status: 'pendente'
          });

        if (erroInsert) {
          console.error('Erro ao inserir pré-entrevista:', erroInsert);
          throw erroInsert;
        }
      }

      const link = `${window.location.origin}/pre-entrevista?token=${token}`;

      // Copiar para clipboard
      await navigator.clipboard.writeText(link);
      alert('Link copiado para a área de transferência!\n\nEnvie este link para o candidato realizar a pré-entrevista.');

      // Recarregar dados para atualizar status
      await carregarDados();
    } catch (error) {
      console.error('Erro ao gerar link:', error);
      alert('Erro ao gerar link de pré-entrevista: ' + (error as any).message);
    }
  };

  const avancarProximaEtapa = async (decisao: 'entrevista' | 'dispensar' | 'banco_talentos') => {
    if (!selectedCandidatura) return;

    try {
      let novoStatus = '';
      let novaEtapa = '';

      switch (decisao) {
        case 'entrevista':
          novoStatus = 'em_processo';
          novaEtapa = 'entrevista_pessoal';
          break;
        case 'dispensar':
          novoStatus = 'recusado';
          novaEtapa = 'finalizado';
          break;
        case 'banco_talentos':
          novoStatus = 'banco_talentos';
          novaEtapa = 'banco_talentos';
          break;
      }

      // Atualizar candidatura (o trigger adicionará automaticamente ao banco de talentos)
      await candidaturaService.atualizar(selectedCandidatura.id, {
        status: novoStatus,
        etapa_atual: novaEtapa
      });

      // Mensagens específicas para cada decisão
      if (decisao === 'banco_talentos') {
        alert('Candidato adicionado ao Banco de Talentos com sucesso!');
      } else if (decisao === 'entrevista') {
        alert('Candidato convocado para entrevista pessoal!');
      } else {
        alert('Candidatura atualizada com sucesso!');
      }

      setShowProximaEtapaModal(false);
      setSelectedCandidatura(null);
      await carregarDados();
    } catch (error) {
      console.error('Erro ao avançar etapa:', error);
      alert('Erro ao avançar para próxima etapa: ' + (error as any).message);
    }
  };

  const handleUploadCurriculo = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const nome = formData.get('nome') as string;
    const email = formData.get('email') as string;
    const telefone = formData.get('telefone') as string;
    const vaga_id = formData.get('vaga_id') as string;
    const curriculoTexto = formData.get('curriculo_texto') as string;

    try {
      let candidato = await candidatoService.buscarPorEmail(email);

      if (!candidato) {
        candidato = await candidatoService.criar({
          nome,
          email,
          telefone
        });
      }

      // Verificar se já existe candidatura para esta vaga
      const candidaturasExistentes = await candidaturaService.listar(vaga_id);
      const jaSeCandidata = candidaturasExistentes.some(c => c.candidato_id === candidato.id);

      if (jaSeCandidata) {
        alert('Este candidato já se candidatou para esta vaga');
        return;
      }

      const candidatura = await candidaturaService.criar({
        vaga_id,
        candidato_id: candidato.id,
        curriculo_url: '',
        status: 'novo',
        etapa_atual: 'triagem_curriculo'
      });

      await handleAnalisarCurriculo(candidatura.id, curriculoTexto);

      form.reset();
      setShowUploadModal(false);
      await carregarCandidaturas();
    } catch (error) {
      console.error('Erro ao cadastrar candidatura:', error);
      alert('Erro ao cadastrar candidatura: ' + (error as any).message);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; label: string; icon: any }> = {
      nova: { color: 'bg-blue-100 text-blue-800', label: 'Nova', icon: Clock },
      triagem: { color: 'bg-yellow-100 text-yellow-800', label: 'Em Triagem', icon: Filter },
      aprovado: { color: 'bg-green-100 text-green-800', label: 'Aprovado', icon: CheckCircle },
      reprovado: { color: 'bg-red-100 text-red-800', label: 'Reprovado', icon: XCircle },
      banco_talentos: { color: 'bg-purple-100 text-purple-800', label: 'Banco de Talentos', icon: Award }
    };

    const badge = badges[status] || badges.nova;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon className="w-3 h-3" />
        {badge.label}
      </span>
    );
  };

  const getRecomendacaoBadge = (recomendacao?: string) => {
    if (!recomendacao) return null;

    const badges: Record<string, { color: string; label: string }> = {
      apto: { color: 'bg-green-100 text-green-800 border-green-300', label: 'Recomendado' },
      banco_talentos: { color: 'bg-purple-100 text-purple-800 border-purple-300', label: 'Banco de Talentos' },
      nao_recomendado: { color: 'bg-red-100 text-red-800 border-red-300', label: 'Não Recomendado' }
    };

    const badge = badges[recomendacao] || { color: 'bg-gray-100 text-gray-800', label: recomendacao };

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${badge.color}`}>
        <Brain className="w-3 h-3" />
        IA: {badge.label}
      </span>
    );
  };

  const candidaturasFiltradas = candidaturas.filter(c => {
    const searchLower = searchTerm.toLowerCase();
    return (
      c.candidato?.nome?.toLowerCase().includes(searchLower) ||
      c.candidato?.email?.toLowerCase().includes(searchLower) ||
      c.vaga?.titulo?.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando candidaturas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestão de Candidaturas</h2>
          <p className="text-gray-600">Análise e acompanhamento de candidatos</p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Upload className="w-5 h-5" />
          Nova Candidatura
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total</p>
              <p className="text-2xl font-bold text-gray-900">{candidaturas.length}</p>
            </div>
            <Users className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Em Triagem</p>
              <p className="text-2xl font-bold text-yellow-600">
                {candidaturas.filter(c => c.status === 'triagem').length}
              </p>
            </div>
            <Filter className="w-8 h-8 text-yellow-600" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Aprovados</p>
              <p className="text-2xl font-bold text-green-600">
                {candidaturas.filter(c => c.status === 'aprovado').length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Banco de Talentos</p>
              <p className="text-2xl font-bold text-purple-600">
                {candidaturas.filter(c => c.status === 'banco_talentos').length}
              </p>
            </div>
            <Award className="w-8 h-8 text-purple-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por nome, email ou vaga..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <select
            value={selectedVaga}
            onChange={(e) => setSelectedVaga(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="todas">Todas as Vagas</option>
            {vagas.map(vaga => (
              <option key={vaga.id} value={vaga.id}>{vaga.titulo}</option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="todas">Todos os Status</option>
            <option value="nova">Nova</option>
            <option value="triagem">Em Triagem</option>
            <option value="aprovado">Aprovado</option>
            <option value="reprovado">Reprovado</option>
            <option value="banco_talentos">Banco de Talentos</option>
          </select>
        </div>

        {candidaturasFiltradas.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">Nenhuma candidatura encontrada</p>
          </div>
        ) : (
          <div className="space-y-4">
            {candidaturasFiltradas.map(candidatura => (
              <div
                key={candidatura.id}
                className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {candidatura.candidato?.nome}
                      </h3>
                      {getStatusBadge(candidatura.status)}
                      {getRecomendacaoBadge(candidatura.recomendacao)}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail className="w-4 h-4" />
                        {candidatura.candidato?.email}
                      </div>
                      {candidatura.candidato?.telefone && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Phone className="w-4 h-4" />
                          {candidatura.candidato.telefone}
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Award className="w-4 h-4" />
                        Vaga: {candidatura.vaga?.titulo}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        {new Date(candidatura.data_aplicacao).toLocaleDateString('pt-BR')}
                      </div>
                    </div>

                    {candidatura.pontuacao_geral && (
                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-medium text-gray-700">
                            Pontuação Geral: {candidatura.pontuacao_geral}/100
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${candidatura.pontuacao_geral}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {candidatura.parecer_ia && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                        <div className="flex items-start gap-2">
                          <Brain className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-blue-900 mb-1">Parecer da IA</p>
                            <p className="text-sm text-blue-800">{candidatura.parecer_ia}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="ml-4 flex flex-col gap-2">
                    {preEntrevistas[candidatura.id]?.status === 'concluida' ? (
                      <button
                        onClick={() => {
                          setSelectedCandidatura(candidatura);
                          setShowProximaEtapaModal(true);
                        }}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                        title="Decidir próxima etapa"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Próxima Etapa
                      </button>
                    ) : (
                      <button
                        onClick={() => handleGerarLinkPreEntrevista(candidatura.id)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                        title="Gerar link de pré-entrevista com IA"
                      >
                        <LinkIcon className="w-4 h-4" />
                        {preEntrevistas[candidatura.id] ? 'Reenviar Link' : 'Pré-Entrevista'}
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setSelectedCandidatura(candidatura);
                        setShowAnaliseModal(true);
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      Ver Detalhes
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Nova Candidatura</h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleUploadCurriculo} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Vaga *
                </label>
                <select
                  name="vaga_id"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Selecione uma vaga</option>
                  {vagas.map(vaga => (
                    <option key={vaga.id} value={vaga.id}>{vaga.titulo}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  name="nome"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Telefone *
                </label>
                <input
                  type="tel"
                  name="telefone"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Currículo (Cole o texto aqui) *
                </label>
                <textarea
                  name="curriculo_texto"
                  required
                  rows={10}
                  placeholder="Cole aqui o texto do currículo do candidato..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <Brain className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-800">
                    O currículo será automaticamente analisado pela IA com base na cultura organizacional do Ditado Popular.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Cadastrar e Analisar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAnaliseModal && selectedCandidatura && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Análise Detalhada</h3>
              <button
                onClick={() => setShowAnaliseModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  {selectedCandidatura.candidato?.nome}
                </h4>
                <div className="flex items-center gap-2">
                  {getStatusBadge(selectedCandidatura.status)}
                  {getRecomendacaoBadge(selectedCandidatura.recomendacao)}
                </div>
              </div>

              {selectedCandidatura.pontuacao_geral && (
                <div>
                  <h5 className="font-medium text-gray-900 mb-2">Pontuação Geral</h5>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 bg-gray-200 rounded-full h-4">
                      <div
                        className="bg-blue-600 h-4 rounded-full transition-all"
                        style={{ width: `${selectedCandidatura.pontuacao_geral}%` }}
                      />
                    </div>
                    <span className="text-2xl font-bold text-blue-600">
                      {selectedCandidatura.pontuacao_geral}/100
                    </span>
                  </div>
                </div>
              )}

              {selectedCandidatura.parecer_ia && (
                <div>
                  <h5 className="font-medium text-gray-900 mb-2">Parecer da IA</h5>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-gray-800">{selectedCandidatura.parecer_ia}</p>
                  </div>
                </div>
              )}

              <div>
                <PreEntrevistaView candidatura_id={selectedCandidatura.id} />
              </div>

              {selectedCandidatura.notas && Object.keys(selectedCandidatura.notas).length > 0 && (
                <div>
                  <h5 className="font-medium text-gray-900 mb-4">Notas por Competência</h5>
                  <div className="space-y-3">
                    {Object.entries(selectedCandidatura.notas).map(([competencia, nota]) => (
                      <div key={competencia}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm text-gray-700">{competencia}</span>
                          <span className="text-sm font-medium text-gray-900">{nota}/100</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-500 h-2 rounded-full transition-all"
                            style={{ width: `${nota}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  onClick={() => setShowAnaliseModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showProximaEtapaModal && selectedCandidatura && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Próxima Etapa do Processo</h3>
              <button
                onClick={() => {
                  setShowProximaEtapaModal(false);
                  setSelectedCandidatura(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                {selectedCandidatura.candidato?.nome}
              </h4>
              <p className="text-gray-600 mb-4">
                Escolha o que fazer com este candidato após a pré-entrevista:
              </p>

              {preEntrevistas[selectedCandidatura.id]?.pontuacao && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-900">Pontuação da Pré-Entrevista</span>
                    <span className="text-lg font-bold text-blue-600">
                      {preEntrevistas[selectedCandidatura.id].pontuacao}/100
                    </span>
                  </div>
                  {preEntrevistas[selectedCandidatura.id]?.recomendacao && (
                    <p className="text-sm text-blue-800 capitalize">
                      Recomendação: {preEntrevistas[selectedCandidatura.id].recomendacao.replace('_', ' ')}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <button
                onClick={() => avancarProximaEtapa('entrevista')}
                className="w-full px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6" />
                  <div className="text-left">
                    <p className="font-semibold">Convocar para Entrevista Pessoal</p>
                    <p className="text-sm text-green-100">Candidato aprovado para próxima fase</p>
                  </div>
                </div>
                <Calendar className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>

              <button
                onClick={() => avancarProximaEtapa('banco_talentos')}
                className="w-full px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <Users className="w-6 h-6" />
                  <div className="text-left">
                    <p className="font-semibold">Adicionar ao Banco de Talentos</p>
                    <p className="text-sm text-blue-100">Guardar para futuras oportunidades</p>
                  </div>
                </div>
                <Award className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>

              <button
                onClick={() => avancarProximaEtapa('dispensar')}
                className="w-full px-6 py-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <XCircle className="w-6 h-6" />
                  <div className="text-left">
                    <p className="font-semibold">Dispensar Candidato</p>
                    <p className="text-sm text-red-100">Não seguir com o processo seletivo</p>
                  </div>
                </div>
                <AlertCircle className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            </div>

            <div className="mt-6 pt-4 border-t">
              <button
                onClick={() => {
                  setShowProximaEtapaModal(false);
                  setSelectedCandidatura(null);
                }}
                className="w-full px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GestaoCandidaturas;
