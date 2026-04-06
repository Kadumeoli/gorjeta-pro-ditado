import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  Users,
  UserCheck,
  TrendingUp,
  Clock,
  Award,
  AlertCircle
} from 'lucide-react';
import { rhDashboardService, vagaService, candidaturaService } from '../../services/rhService';

interface Estatisticas {
  vagas_abertas: number;
  total_candidaturas: number;
  candidaturas_novos: number;
  candidaturas_aprovados: number;
}

const DashboardRH: React.FC = () => {
  const [stats, setStats] = useState<Estatisticas | null>(null);
  const [loading, setLoading] = useState(true);
  const [vagasRecentes, setVagasRecentes] = useState<any[]>([]);
  const [candidaturasRecentes, setCandidaturasRecentes] = useState<any[]>([]);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [estatisticas, vagas, candidaturas] = await Promise.all([
        rhDashboardService.obterEstatisticas(),
        vagaService.listar('aberta'),
        candidaturaService.listar()
      ]);

      setStats(estatisticas);
      setVagasRecentes(vagas.slice(0, 5));
      setCandidaturasRecentes(candidaturas.slice(0, 5));
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#7D1F2C]"></div>
      </div>
    );
  }

  const cards = [
    {
      title: 'Vagas Abertas',
      value: stats?.vagas_abertas || 0,
      icon: Briefcase,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600'
    },
    {
      title: 'Total Candidaturas',
      value: stats?.total_candidaturas || 0,
      icon: Users,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600'
    },
    {
      title: 'Aguardando Análise',
      value: stats?.candidaturas_novos || 0,
      icon: Clock,
      color: 'from-amber-500 to-amber-600',
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-600'
    },
    {
      title: 'Aprovados',
      value: stats?.candidaturas_aprovados || 0,
      icon: UserCheck,
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Cards de estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={index}
              className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 ${card.bgColor} rounded-lg`}>
                  <Icon className={`w-6 h-6 ${card.textColor}`} />
                </div>
                <TrendingUp className="w-5 h-5 text-gray-400" />
              </div>
              <h3 className="text-gray-600 text-sm font-medium mb-1">{card.title}</h3>
              <p className="text-3xl font-bold text-white">{card.value}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vagas Recentes */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">Vagas Abertas</h3>
            <Briefcase className="w-5 h-5 text-gray-400" />
          </div>

          {vagasRecentes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Briefcase className="w-12 h-12 mx-auto mb-2 opacity-20" />
              <p>Nenhuma vaga aberta</p>
            </div>
          ) : (
            <div className="space-y-3">
              {vagasRecentes.map((vaga) => (
                <div
                  key={vaga.id}
                  className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-white mb-1">{vaga.titulo}</h4>
                      <p className="text-sm text-gray-600">{vaga.cargo?.nome}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-gray-500">
                          {new Date(vaga.data_abertura).toLocaleDateString('pt-BR')}
                        </span>
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                          {vaga.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Candidaturas Recentes */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">Candidaturas Recentes</h3>
            <Users className="w-5 h-5 text-gray-400" />
          </div>

          {candidaturasRecentes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-2 opacity-20" />
              <p>Nenhuma candidatura registrada</p>
            </div>
          ) : (
            <div className="space-y-3">
              {candidaturasRecentes.map((candidatura) => (
                <div
                  key={candidatura.id}
                  className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-white mb-1">
                        {candidatura.candidato?.nome}
                      </h4>
                      <p className="text-sm text-gray-600">{candidatura.vaga?.titulo}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-gray-500">
                          {new Date(candidatura.data_aplicacao).toLocaleDateString('pt-BR')}
                        </span>
                        <span
                          className={`px-2 py-0.5 text-xs rounded-full ${
                            candidatura.status === 'novo'
                              ? 'bg-blue-100 text-blue-700'
                              : candidatura.status === 'aprovado'
                              ? 'bg-green-100 text-green-700'
                              : candidatura.status === 'reprovado'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-gray-100 text-white/80'
                          }`}
                        >
                          {candidatura.status}
                        </span>
                      </div>
                    </div>
                    {candidatura.pontuacao_geral && (
                      <div className="text-right">
                        <div className="text-2xl font-bold text-[#7D1F2C]">
                          {candidatura.pontuacao_geral.toFixed(0)}
                        </div>
                        <div className="text-xs text-gray-500">Pontuação</div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Info sobre IA */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-indigo-100 rounded-lg">
            <Award className="w-6 h-6 text-indigo-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-indigo-900 mb-2">Análise Inteligente com IA</h3>
            <p className="text-indigo-800 text-sm leading-relaxed">
              Nosso sistema utiliza inteligência artificial para avaliar automaticamente currículos,
              considerando competências técnicas e alinhamento com os valores do Ditado Popular:
              Hospitalidade, Respeito, Qualidade, Inovação e Proatividade.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardRH;
