import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { AlertCircle, Plus, Search, Filter, FileText, User, Clock, CheckCircle, AlertTriangle, X } from 'lucide-react';
import dayjs from '../lib/dayjs';
import { PageHeader, SectionCard, Badge } from '../components/ui';

interface Ocorrencia {
  id: string;
  data_ocorrencia: string;
  setor: string;
  tipo_ocorrencia: string;
  gravidade: string;
  titulo: string;
  descricao: string;
  envolvidos?: string;
  acoes_tomadas?: string;
  observacoes?: string;
  registrado_por?: string;
  status: string;
  criado_em: string;
  atualizado_em: string;
}

const Ocorrencias: React.FC = () => {
  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Ocorrencia | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSetor, setFilterSetor] = useState('');
  const [filterGravidade, setFilterGravidade] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [formData, setFormData] = useState({
    data_ocorrencia: dayjs().format('YYYY-MM-DDTHH:mm'),
    setor: 'bar',
    tipo_ocorrencia: 'cliente',
    gravidade: 'media',
    titulo: '',
    descricao: '',
    envolvidos: '',
    acoes_tomadas: '',
    observacoes: '',
    status: 'aberta'
  });

  const setores = [
    { value: 'bar', label: 'Bar' },
    { value: 'cozinha', label: 'Cozinha' },
    { value: 'eventos', label: 'Eventos' },
    { value: 'administracao', label: 'Administração' },
    { value: 'rh', label: 'RH' },
    { value: 'estoque', label: 'Estoque' },
    { value: 'financeiro', label: 'Financeiro' },
    { value: 'atendimento', label: 'Atendimento' },
    { value: 'outros', label: 'Outros' }
  ];

  const tiposOcorrencia = [
    { value: 'cliente', label: 'Cliente' },
    { value: 'funcionario', label: 'Funcionário' },
    { value: 'equipamento', label: 'Equipamento' },
    { value: 'operacional', label: 'Operacional' },
    { value: 'seguranca', label: 'Segurança' },
    { value: 'financeiro', label: 'Financeiro' },
    { value: 'outros', label: 'Outros' }
  ];

  const gravidades = [
    { value: 'baixa', label: 'Baixa', color: 'bg-blue-100 text-blue-800' },
    { value: 'media', label: 'Média', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'alta', label: 'Alta', color: 'bg-orange-100 text-orange-800' },
    { value: 'critica', label: 'Crítica', color: 'bg-red-100 text-red-800' }
  ];

  const statusOptions = [
    { value: 'aberta', label: 'Aberta', color: 'bg-red-100 text-red-800' },
    { value: 'em_analise', label: 'Em Análise', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'resolvida', label: 'Resolvida', color: 'bg-green-100 text-green-800' },
    { value: 'arquivada', label: 'Arquivada', color: 'bg-gray-100 text-white/90' }
  ];

  useEffect(() => {
    fetchOcorrencias();
  }, []);

  const fetchOcorrencias = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('ocorrencias_setor')
        .select('*')
        .order('data_ocorrencia', { ascending: false });

      if (fetchError) throw fetchError;
      setOcorrencias(data || []);
    } catch (err) {
      console.error('Error fetching ocorrencias:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar ocorrências');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!formData.titulo || !formData.descricao) {
        setError('Título e descrição são obrigatórios');
        return;
      }

      const dataToSave = {
        ...formData,
        data_ocorrencia: dayjs(formData.data_ocorrencia).toISOString()
      };

      if (editingItem) {
        const { error: updateError } = await supabase
          .from('ocorrencias_setor')
          .update(dataToSave)
          .eq('id', editingItem.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('ocorrencias_setor')
          .insert([dataToSave]);

        if (insertError) throw insertError;
      }

      await fetchOcorrencias();
      resetForm();
      setShowForm(false);
    } catch (err) {
      console.error('Error saving ocorrencia:', err);
      setError(err instanceof Error ? err.message : 'Erro ao salvar ocorrência');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta ocorrência?')) return;

    try {
      setLoading(true);
      const { error: deleteError } = await supabase
        .from('ocorrencias_setor')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
      await fetchOcorrencias();
    } catch (err) {
      console.error('Error deleting ocorrencia:', err);
      setError(err instanceof Error ? err.message : 'Erro ao excluir ocorrência');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      data_ocorrencia: dayjs().format('YYYY-MM-DDTHH:mm'),
      setor: 'bar',
      tipo_ocorrencia: 'cliente',
      gravidade: 'media',
      titulo: '',
      descricao: '',
      envolvidos: '',
      acoes_tomadas: '',
      observacoes: '',
      status: 'aberta'
    });
    setEditingItem(null);
  };

  const handleEdit = (item: Ocorrencia) => {
    setEditingItem(item);
    setFormData({
      data_ocorrencia: dayjs(item.data_ocorrencia).format('YYYY-MM-DDTHH:mm'),
      setor: item.setor,
      tipo_ocorrencia: item.tipo_ocorrencia,
      gravidade: item.gravidade,
      titulo: item.titulo,
      descricao: item.descricao,
      envolvidos: item.envolvidos || '',
      acoes_tomadas: item.acoes_tomadas || '',
      observacoes: item.observacoes || '',
      status: item.status
    });
    setShowForm(true);
  };

  const getGravidadeColor = (gravidade: string) => {
    return gravidades.find(g => g.value === gravidade)?.color || 'bg-gray-100 text-white/90';
  };

  const getStatusColor = (status: string) => {
    return statusOptions.find(s => s.value === status)?.color || 'bg-gray-100 text-white/90';
  };

  const filteredOcorrencias = ocorrencias.filter(item => {
    const matchSearch = searchTerm === '' ||
      item.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.envolvidos && item.envolvidos.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchSetor = filterSetor === '' || item.setor === filterSetor;
    const matchGravidade = filterGravidade === '' || item.gravidade === filterGravidade;
    const matchStatus = filterStatus === '' || item.status === filterStatus;

    return matchSearch && matchSetor && matchGravidade && matchStatus;
  });

  const getStatsCard = () => {
    const abertas = ocorrencias.filter(o => o.status === 'aberta').length;
    const criticas = ocorrencias.filter(o => o.gravidade === 'critica' && o.status !== 'resolvida').length;
    const hoje = ocorrencias.filter(o => dayjs(o.data_ocorrencia).isSame(dayjs(), 'day')).length;

    return { abertas, criticas, hoje };
  };

  const stats = getStatsCard();

  if (loading && ocorrencias.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Livro de Ocorrências</h1>
          <p className="text-gray-600">Registro de acontecimentos nos setores</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="flex items-center px-4 py-2 bg-[#7D1F2C] text-white rounded-lg hover:bg-[#6a1a25]"
        >
          <Plus className="h-5 w-5 mr-2" />
          Nova Ocorrência
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          {error}
        </div>
      )}

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-600 font-medium">Ocorrências Abertas</p>
              <p className="text-2xl font-bold text-red-900">{stats.abertas}</p>
            </div>
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-600 font-medium">Críticas/Altas</p>
              <p className="text-2xl font-bold text-orange-900">{stats.criticas}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-orange-500" />
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium">Hoje</p>
              <p className="text-2xl font-bold text-blue-900">{stats.hoje}</p>
            </div>
            <Clock className="h-8 w-8 text-blue-500" />
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Buscar ocorrências..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7D1F2C] focus:border-transparent"
            />
          </div>

          <select
            value={filterSetor}
            onChange={(e) => setFilterSetor(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7D1F2C] focus:border-transparent"
          >
            <option value="">Todos os setores</option>
            {setores.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>

          <select
            value={filterGravidade}
            onChange={(e) => setFilterGravidade(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7D1F2C] focus:border-transparent"
          >
            <option value="">Todas as gravidades</option>
            {gravidades.map(g => (
              <option key={g.value} value={g.value}>{g.label}</option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7D1F2C] focus:border-transparent"
          >
            <option value="">Todos os status</option>
            {statusOptions.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Lista de Ocorrências */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="overflow-x-auto">
          {filteredOcorrencias.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Nenhuma ocorrência encontrada</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredOcorrencias.map((item) => (
                <div key={item.id} className="p-6 hover:bg-gray-50">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-white">{item.titulo}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getGravidadeColor(item.gravidade)}`}>
                          {gravidades.find(g => g.value === item.gravidade)?.label}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                          {statusOptions.find(s => s.value === item.status)?.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                        <span className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          {dayjs(item.data_ocorrencia).format('DD/MM/YYYY HH:mm')}
                        </span>
                        <span className="font-medium">
                          {setores.find(s => s.value === item.setor)?.label}
                        </span>
                        <span>
                          {tiposOcorrencia.find(t => t.value === item.tipo_ocorrencia)?.label}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(item)}
                        className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium text-white/80">Descrição: </span>
                      <span className="text-gray-600">{item.descricao}</span>
                    </div>
                    {item.envolvidos && (
                      <div>
                        <span className="font-medium text-white/80">Envolvidos: </span>
                        <span className="text-gray-600">{item.envolvidos}</span>
                      </div>
                    )}
                    {item.acoes_tomadas && (
                      <div>
                        <span className="font-medium text-white/80">Ações Tomadas: </span>
                        <span className="text-gray-600">{item.acoes_tomadas}</span>
                      </div>
                    )}
                    {item.observacoes && (
                      <div>
                        <span className="font-medium text-white/80">Observações: </span>
                        <span className="text-gray-600">{item.observacoes}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Formulário */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">
                  {editingItem ? 'Editar Ocorrência' : 'Nova Ocorrência'}
                </h2>
                <button
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Data e Hora */}
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">
                    Data e Hora da Ocorrência *
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.data_ocorrencia}
                    onChange={(e) => setFormData({ ...formData, data_ocorrencia: e.target.value })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  />
                </div>

                {/* Setor e Tipo */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-1">
                      Setor *
                    </label>
                    <select
                      value={formData.setor}
                      onChange={(e) => setFormData({ ...formData, setor: e.target.value })}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                    >
                      {setores.map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-1">
                      Tipo de Ocorrência *
                    </label>
                    <select
                      value={formData.tipo_ocorrencia}
                      onChange={(e) => setFormData({ ...formData, tipo_ocorrencia: e.target.value })}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                    >
                      {tiposOcorrencia.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Gravidade e Status */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-1">
                      Gravidade *
                    </label>
                    <select
                      value={formData.gravidade}
                      onChange={(e) => setFormData({ ...formData, gravidade: e.target.value })}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                    >
                      {gravidades.map(g => (
                        <option key={g.value} value={g.value}>{g.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-1">
                      Status *
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                    >
                      {statusOptions.map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Título */}
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">
                    Título *
                  </label>
                  <input
                    type="text"
                    value={formData.titulo}
                    onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                    placeholder="Resumo breve da ocorrência"
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  />
                </div>

                {/* Descrição */}
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">
                    Descrição Detalhada *
                  </label>
                  <textarea
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    rows={4}
                    placeholder="Descreva o acontecimento em detalhes"
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  />
                </div>

                {/* Envolvidos */}
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">
                    Pessoas/Clientes Envolvidos
                  </label>
                  <input
                    type="text"
                    value={formData.envolvidos}
                    onChange={(e) => setFormData({ ...formData, envolvidos: e.target.value })}
                    placeholder="Ex: João Silva, Maria Santos"
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  />
                </div>

                {/* Ações Tomadas */}
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">
                    Ações Tomadas
                  </label>
                  <textarea
                    value={formData.acoes_tomadas}
                    onChange={(e) => setFormData({ ...formData, acoes_tomadas: e.target.value })}
                    rows={3}
                    placeholder="Descreva as ações que foram tomadas para resolver ou mitigar a situação"
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  />
                </div>

                {/* Observações */}
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">
                    Observações Adicionais
                  </label>
                  <textarea
                    value={formData.observacoes}
                    onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                    rows={2}
                    placeholder="Outras informações relevantes"
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-white/80 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="px-4 py-2 bg-[#7D1F2C] text-white rounded-md hover:bg-[#6a1a25] disabled:opacity-50"
                >
                  {loading ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Ocorrencias;
