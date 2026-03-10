import React, { useState, useEffect } from 'react';
import {
  Users,
  DollarSign,
  Package,
  TrendingUp,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  Activity,
  MessageSquare
} from 'lucide-react';
import ChatFinanceiroIA from '../components/financeiro/ChatFinanceiroIA';

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [showChatIA, setShowChatIA] = useState(false);
  const [indicadores, setIndicadores] = useState({
    colaboradoresAtivos: 0,
    vendasMes: 0,
    estoqueBaixo: 0,
    solicitacoesPendentes: 0
  });

  const [atividades, setAtividades] = useState([]);

  useEffect(() => {
    // Simular carregamento de dados
    setTimeout(() => {
      setIndicadores({
        colaboradoresAtivos: 25,
        vendasMes: 45230.50,
        estoqueBaixo: 8,
        solicitacoesPendentes: 12
      });
      
      setAtividades([
        { id: 1, tipo: 'venda', descricao: 'Nova venda registrada', tempo: '5 min atrás' },
        { id: 2, tipo: 'estoque', descricao: 'Produto abaixo do estoque mínimo', tempo: '15 min atrás' },
        { id: 3, tipo: 'rh', descricao: 'Novo colaborador cadastrado', tempo: '1 hora atrás' },
        { id: 4, tipo: 'financeiro', descricao: 'Pagamento processado', tempo: '2 horas atrás' }
      ]);
      
      setLoading(false);
    }, 1000);
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const cards = [
    {
      title: 'Colaboradores Ativos',
      value: indicadores.colaboradoresAtivos,
      icon: Users,
      color: 'bg-blue-500',
      textColor: 'text-blue-600'
    },
    {
      title: 'Vendas do Mês',
      value: formatCurrency(indicadores.vendasMes),
      icon: DollarSign,
      color: 'bg-green-500',
      textColor: 'text-green-600'
    },
    {
      title: 'Estoque Baixo',
      value: indicadores.estoqueBaixo,
      icon: Package,
      color: 'bg-orange-500',
      textColor: 'text-orange-600'
    },
    {
      title: 'Solicitações Pendentes',
      value: indicadores.solicitacoesPendentes,
      icon: Clock,
      color: 'bg-red-500',
      textColor: 'text-red-600'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Visão geral do sistema</p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <Activity className="w-4 h-4" />
          <span>Última atualização: agora</span>
        </div>
      </div>

      {/* Cards de Indicadores */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, index) => (
          <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{card.title}</p>
                <p className={`text-2xl font-bold ${card.textColor} mt-1`}>
                  {card.value}
                </p>
              </div>
              <div className={`${card.color} p-3 rounded-lg`}>
                <card.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Grid de Conteúdo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Atividades Recentes */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Atividades Recentes</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {atividades.map((atividade: any) => (
                <div key={atividade.id} className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    {atividade.tipo === 'venda' && (
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <DollarSign className="w-4 h-4 text-green-600" />
                      </div>
                    )}
                    {atividade.tipo === 'estoque' && (
                      <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                        <Package className="w-4 h-4 text-orange-600" />
                      </div>
                    )}
                    {atividade.tipo === 'rh' && (
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <Users className="w-4 h-4 text-blue-600" />
                      </div>
                    )}
                    {atividade.tipo === 'financeiro' && (
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                        <TrendingUp className="w-4 h-4 text-purple-600" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{atividade.descricao}</p>
                    <p className="text-xs text-gray-500">{atividade.tempo}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Resumo Rápido */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Resumo Rápido</h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm text-gray-600">Tarefas Completas</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">84%</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-orange-500" />
                <span className="text-sm text-gray-600">Em Andamento</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">12</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span className="text-sm text-gray-600">Alertas</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">3</span>
            </div>
            
            <div className="pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Performance Mensal</span>
                <span className="text-sm font-semibold text-green-600">+12%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: '84%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Gráfico de Vendas (Placeholder) */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Vendas dos Últimos 7 Dias</h2>
            <BarChart3 className="w-5 h-5 text-gray-500" />
          </div>
        </div>
        <div className="p-6">
          <div className="h-64 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <BarChart3 className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>Gráfico de vendas será implementado em breve</p>
            </div>
          </div>
        </div>
      </div>

      {/* Botão flutuante do Chat IA */}
      {!showChatIA && (
        <button
          onClick={() => setShowChatIA(true)}
          className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-full shadow-2xl hover:shadow-3xl hover:scale-110 transition-all duration-300 flex items-center justify-center z-40 group"
          title="Chat com Super Agente IA"
        >
          <MessageSquare className="w-7 h-7" />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse"></span>
          <div className="absolute right-full mr-4 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            Super Agente IA
          </div>
        </button>
      )}

      {/* Modal do Chat IA */}
      {showChatIA && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-3xl">
            <ChatFinanceiroIA onClose={() => setShowChatIA(false)} />
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;