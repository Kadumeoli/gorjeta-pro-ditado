import React, { useState, useEffect } from 'react';
import {
  Plus,
  TrendingUp,
  Calendar,
  AlertCircle,
  DollarSign,
  Target,
  FileText,
  Upload,
  Users,
  BarChart3,
  Copy,
  Eye,
  Pencil,
  Trash2,
  CheckCircle,
  Clock,
  Search
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import dayjs from '../lib/dayjs';
import KanbanCampanhas from '../components/marketing/KanbanCampanhas';
import BibliotecaAtivos from '../components/marketing/BibliotecaAtivos';
import CalendarioMarketing from '../components/marketing/CalendarioMarketing';
import SistemaAprovacoes from '../components/marketing/SistemaAprovacoes';
import AnalyticsMarketing from '../components/marketing/AnalyticsMarketing';
import ModalBrief from '../components/marketing/ModalBrief';
import { PageHeader, KPICard, SectionCard } from '../components/ui';

interface DashboardStats {
  campanhas_ativas: number;
  proximas_publicacoes: number;
  budget_usado: number;
  budget_total: number;
}

interface Atividade {
  id: string;
  campanha_id: string;
  campanha_nome: string;
  usuario_nome: string;
  acao: string;
  descricao: string;
  created_at: string;
}

const Marketing: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    campanhas_ativas: 0,
    proximas_publicacoes: 0,
    budget_usado: 0,
    budget_total: 0
  });
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'campanhas' | 'ativos' | 'calendario' | 'aprovacoes' | 'analytics' | 'briefs' | 'templates'>('dashboard');
  const [showNovoBrief, setShowNovoBrief] = useState(false);
  const [briefs, setBriefs] = useState<any[]>([]);
  const [briefsLoading, setBriefsLoading] = useState(false);
  const [briefSearch, setBriefSearch] = useState('');
  const [templates, setTemplates] = useState<any[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templateSearch, setTemplateSearch] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const { data: campanhas } = await supabase
        .from('campanhas_marketing')
        .select('id, status, budget_planejado, budget_gasto')
        .in('status', ['em_producao', 'em_revisao', 'aprovado', 'agendado']);

      const campanhasAtivas = campanhas?.filter(c =>
        ['em_producao', 'em_revisao', 'aprovado'].includes(c.status)
      ).length || 0;

      const budgetUsado = campanhas?.reduce((sum, c) => sum + (Number(c.budget_gasto) || 0), 0) || 0;
      const budgetTotal = campanhas?.reduce((sum, c) => sum + (Number(c.budget_planejado) || 0), 0) || 0;

      const { data: timeline } = await supabase
        .from('campanhas_timeline')
        .select('id')
        .gte('data_inicio', dayjs().startOf('day').toISOString())
        .lte('data_inicio', dayjs().add(7, 'days').endOf('day').toISOString());

      const { data: atividadesData } = await supabase
        .from('campanhas_atividades')
        .select(`
          id,
          campanha_id,
          usuario_id,
          acao,
          descricao,
          created_at,
          campanhas_marketing!inner(nome)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      const atividadesFormatadas = atividadesData?.map(a => ({
        id: a.id,
        campanha_id: a.campanha_id,
        campanha_nome: (a as any).campanhas_marketing?.nome || 'Campanha',
        usuario_nome: 'Usuário',
        acao: a.acao,
        descricao: a.descricao,
        created_at: a.created_at
      })) || [];

      setStats({
        campanhas_ativas: campanhasAtivas,
        proximas_publicacoes: timeline?.length || 0,
        budget_usado: budgetUsado,
        budget_total: budgetTotal
      });

      setAtividades(atividadesFormatadas);
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBriefs = async () => {
    try {
      setBriefsLoading(true);
      const { data } = await supabase
        .from('briefs_marketing')
        .select('*, campanhas_marketing(nome)')
        .order('created_at', { ascending: false });
      setBriefs(data || []);
    } catch (error) {
      console.error('Erro ao carregar briefs:', error);
    } finally {
      setBriefsLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      setTemplatesLoading(true);
      const { data } = await supabase
        .from('templates_campanha')
        .select('*')
        .order('uso_contagem', { ascending: false });
      setTemplates(data || []);
    } catch (error) {
      console.error('Erro ao carregar templates:', error);
    } finally {
      setTemplatesLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'briefs') fetchBriefs();
    if (activeTab === 'templates') fetchTemplates();
  }, [activeTab]);

  const handleNovaCampanha = () => {
    setActiveTab('campanhas');
  };

  const handleDeleteBrief = async (id: string) => {
    if (!confirm('Excluir este brief?')) return;
    try {
      await supabase.from('briefs_marketing').delete().eq('id', id);
      fetchBriefs();
    } catch (error) {
      console.error('Erro ao excluir brief:', error);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Excluir este template?')) return;
    try {
      await supabase.from('templates_campanha').delete().eq('id', id);
      fetchTemplates();
    } catch (error) {
      console.error('Erro ao excluir template:', error);
    }
  };

  const handleUsarTemplate = async (template: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from('campanhas_marketing').insert({
        nome: template.nome + ' (cópia)',
        objetivo: template.configuracao?.objetivo || '',
        descricao: template.descricao || '',
        tipo: template.categoria || 'branding',
        canais: template.configuracao?.canais || [],
        budget_planejado: template.configuracao?.budget_planejado || 0,
        tags: template.configuracao?.tags || [],
        responsavel_id: user.id,
        created_by: user.id,
        status: 'draft'
      });

      if (error) throw error;

      await supabase.from('templates_campanha')
        .update({ uso_contagem: (template.uso_contagem || 0) + 1 })
        .eq('id', template.id);

      alert('Campanha criada a partir do template!');
      setActiveTab('campanhas');
    } catch (error: any) {
      console.error('Erro ao usar template:', error);
      alert('Erro: ' + (error.message || 'Erro desconhecido'));
    }
  };

  const acaoIcons: Record<string, any> = {
    criou: Plus,
    editou: FileText,
    aprovou: Target,
    rejeitou: AlertCircle,
    comentou: Users,
    alterou_status: BarChart3
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Marketing</h1>
          <p className="text-sm text-gray-600 mt-1">
            Gerencie suas campanhas, ativos e performance
          </p>
        </div>
        <button
          onClick={handleNovaCampanha}
          className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Criar Campanha
        </button>
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        {[
          { id: 'dashboard', label: 'Dashboard' },
          { id: 'campanhas', label: 'Campanhas' },
          { id: 'briefs', label: 'Briefs' },
          { id: 'templates', label: 'Templates' },
          { id: 'ativos', label: 'Ativos' },
          { id: 'calendario', label: 'Calendário' },
          { id: 'aprovacoes', label: 'Aprovações' },
          { id: 'analytics', label: 'Analytics' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              activeTab === tab.id
                ? 'border-amber-600 text-amber-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'dashboard' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Campanhas Ativas</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {stats.campanhas_ativas}
                  </p>
                </div>
                <div className="p-3 bg-amber-100 rounded-lg">
                  <Target className="w-6 h-6 text-amber-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Próximas Publicações</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {stats.proximas_publicacoes}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Próximos 7 dias</p>
                </div>
                <div className="p-3 bg-sky-100 rounded-lg">
                  <Calendar className="w-6 h-6 text-sky-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Budget Usado</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    R$ {stats.budget_usado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    de R$ {stats.budget_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="p-3 bg-lime-100 rounded-lg">
                  <DollarSign className="w-6 h-6 text-lime-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Utilização</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {stats.budget_total > 0
                      ? ((stats.budget_usado / stats.budget_total) * 100).toFixed(1)
                      : 0}%
                  </p>
                </div>
                <div className="p-3 bg-emerald-100 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Feed de Atividades
              </h2>
              <div className="space-y-4">
                {loading ? (
                  <p className="text-center text-gray-500 py-8">Carregando...</p>
                ) : atividades.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">
                    Nenhuma atividade recente
                  </p>
                ) : (
                  atividades.map(atividade => {
                    const Icon = acaoIcons[atividade.acao] || FileText;
                    return (
                      <div
                        key={atividade.id}
                        className="flex items-start gap-4 p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                      >
                        <div className="p-2 bg-white rounded-lg border border-gray-200">
                          <Icon className="w-4 h-4 text-gray-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {atividade.descricao}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-500">
                              {atividade.campanha_nome}
                            </span>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-xs text-gray-500">
                              {dayjs(atividade.created_at).fromNow()}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Performance Rápida
              </h2>
              <div className="space-y-4">
                <div className="text-center py-12">
                  <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">
                    Métricas de performance serão exibidas aqui
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">
              Atalhos Rápidos
            </h3>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => { setActiveTab('briefs'); setTimeout(() => setShowNovoBrief(true), 100); }}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <FileText className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Novo Brief</span>
              </button>
              <button
                onClick={() => setActiveTab('templates')}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Target className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Templates</span>
              </button>
              <button
                onClick={() => setActiveTab('ativos')}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Upload className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Upload de Ativo</span>
              </button>
            </div>
          </div>
        </>
      )}

      {activeTab === 'campanhas' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <KanbanCampanhas />
        </div>
      )}

      {activeTab === 'ativos' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <BibliotecaAtivos />
        </div>
      )}

      {activeTab === 'calendario' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <CalendarioMarketing />
        </div>
      )}

      {activeTab === 'aprovacoes' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <SistemaAprovacoes />
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <AnalyticsMarketing />
        </div>
      )}

      {activeTab === 'briefs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar briefs..."
                value={briefSearch}
                onChange={e => setBriefSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => setShowNovoBrief(true)}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Novo Brief
            </button>
          </div>

          {briefsLoading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Carregando briefs...</p>
            </div>
          ) : briefs.filter(b =>
            !briefSearch || b.nome?.toLowerCase().includes(briefSearch.toLowerCase())
          ).length === 0 ? (
            <div className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 p-12 text-center">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Nenhum brief cadastrado</h3>
              <p className="text-sm text-gray-500 mb-6">
                Crie briefs estruturados para organizar as demandas de criação
              </p>
              <button
                onClick={() => setShowNovoBrief(true)}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm"
              >
                Criar Primeiro Brief
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {briefs
                .filter(b => !briefSearch || b.nome?.toLowerCase().includes(briefSearch.toLowerCase()))
                .map(brief => {
                  const statusColors: Record<string, string> = {
                    rascunho: 'bg-gray-100 text-gray-700',
                    em_andamento: 'bg-blue-100 text-blue-700',
                    em_revisao: 'bg-amber-100 text-amber-700',
                    aprovado: 'bg-green-100 text-green-700',
                    concluido: 'bg-emerald-100 text-emerald-700'
                  };
                  const statusLabels: Record<string, string> = {
                    rascunho: 'Rascunho',
                    em_andamento: 'Em andamento',
                    em_revisao: 'Em revisão',
                    aprovado: 'Aprovado',
                    concluido: 'Concluído'
                  };
                  return (
                    <div key={brief.id} className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <span className={`px-2 py-1 rounded-md text-xs font-medium ${statusColors[brief.status] || 'bg-gray-100 text-gray-700'}`}>
                          {statusLabels[brief.status] || brief.status}
                        </span>
                        <button
                          onClick={() => handleDeleteBrief(brief.id)}
                          className="p-1 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
                        </button>
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">{brief.nome}</h3>
                      {brief.objetivo && (
                        <p className="text-sm text-gray-600 line-clamp-2 mb-3">{brief.objetivo}</p>
                      )}
                      {(brief as any).campanhas_marketing?.nome && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
                          <Target className="w-3.5 h-3.5" />
                          {(brief as any).campanhas_marketing.nome}
                        </div>
                      )}
                      {brief.deadline && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <Clock className="w-3.5 h-3.5" />
                          {dayjs(brief.deadline).format('DD/MM/YYYY')}
                        </div>
                      )}
                      <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400">
                        Criado {dayjs(brief.created_at).fromNow()}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'templates' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar templates..."
                value={templateSearch}
                onChange={e => setTemplateSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
          </div>

          {templatesLoading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Carregando templates...</p>
            </div>
          ) : templates.filter(t =>
            !templateSearch || t.nome?.toLowerCase().includes(templateSearch.toLowerCase())
          ).length === 0 ? (
            <div className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 p-12 text-center">
              <Copy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Nenhum template disponível</h3>
              <p className="text-sm text-gray-500 max-w-md mx-auto">
                Templates são criados automaticamente ao salvar um brief como template ou ao criar campanhas recorrentes.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates
                .filter(t => !templateSearch || t.nome?.toLowerCase().includes(templateSearch.toLowerCase()))
                .map(template => {
                  const categoriaColors: Record<string, string> = {
                    branding: 'bg-amber-100 text-amber-700',
                    performance: 'bg-blue-100 text-blue-700',
                    social: 'bg-sky-100 text-sky-700',
                    email: 'bg-green-100 text-green-700',
                    evento: 'bg-teal-100 text-teal-700'
                  };
                  return (
                    <div key={template.id} className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition-shadow group">
                      <div className="flex items-start justify-between mb-3">
                        <span className={`px-2 py-1 rounded-md text-xs font-medium ${categoriaColors[template.categoria] || 'bg-gray-100 text-gray-700'}`}>
                          {template.categoria || 'Geral'}
                        </span>
                        <button
                          onClick={() => handleDeleteTemplate(template.id)}
                          className="p-1 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
                        </button>
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-1">{template.nome}</h3>
                      {template.descricao && (
                        <p className="text-sm text-gray-600 line-clamp-2 mb-3">{template.descricao}</p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-gray-500 mb-4">
                        <span className="flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5" />
                          Usado {template.uso_contagem || 0}x
                        </span>
                      </div>
                      <button
                        onClick={() => handleUsarTemplate(template)}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors text-sm font-medium"
                      >
                        <Copy className="w-4 h-4" />
                        Usar Template
                      </button>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      <ModalBrief
        isOpen={showNovoBrief}
        onClose={() => setShowNovoBrief(false)}
        onSaved={() => {
          setShowNovoBrief(false);
          fetchBriefs();
        }}
      />
    </div>
  );
};

export default Marketing;
