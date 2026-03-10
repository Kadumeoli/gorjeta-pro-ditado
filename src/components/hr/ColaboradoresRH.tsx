import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  User,
  DollarSign,
  Users,
  CheckCircle,
  Download,
  FileText,
  Target,
  Activity,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  Clock,
  AlertTriangle,
  Printer
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { testConnection } from '../../lib/supabase';
import { exportToExcel } from '../../utils/reportGenerator';
import FichaColaborador from './FichaColaborador';
import dayjs from 'dayjs';

interface Colaborador {
  id: string;
  nome_completo: string;
  cpf?: string;
  rg?: string;
  data_nascimento?: string;
  funcao_id?: string;
  funcao_personalizada?: string;
  tipo_vinculo: 'clt' | 'freelancer' | 'prestador';
  data_admissao?: string;
  data_demissao?: string;
  status: 'ativo' | 'inativo' | 'afastado' | 'demitido';
  salario_fixo: number;
  valor_diaria: number;
  percentual_comissao: number;
  foto_url?: string;
  telefone?: string;
  email?: string;
  endereco?: string;
  observacoes?: string;
  criado_em: string;
  atualizado_em: string;
  // Dados da função
  funcao_nome?: string;
  funcao_salario_base?: number;
  funcao_percentual_comissao?: number;
  anos_empresa?: number;
}

interface FormData {
  nome_completo: string;
  cpf: string;
  rg: string;
  data_nascimento: string;
  funcao_id: string;
  funcao_personalizada: string;
  tipo_vinculo: 'clt' | 'freelancer' | 'prestador';
  data_admissao: string;
  data_demissao: string;
  salario_fixo: number;
  valor_diaria: number;
  percentual_comissao: number;
  telefone: string;
  email: string;
  endereco: string;
  observacoes: string;
  status: 'ativo' | 'inativo' | 'afastado' | 'demitido';
  foto_url: string;
}

interface IndicadoresColaboradores {
  total_colaboradores: number;
  colaboradores_ativos: number;
  colaboradores_inativos: number;
  colaboradores_afastados: number;
  colaboradores_demitidos: number;
  salario_medio: number;
  colaboradores_com_comissao: number;
  tipos_vinculo: number;
}

const ColaboradoresRH: React.FC = () => {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [funcoes, setFuncoes] = useState<any[]>([]);
  const [indicadores, setIndicadores] = useState<IndicadoresColaboradores | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingColaborador, setEditingColaborador] = useState<Colaborador | null>(null);
  const [showFicha, setShowFicha] = useState(false);
  const [fichaColaborador, setFichaColaborador] = useState<Colaborador | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ativo' | 'inativo' | 'afastado' | 'demitido'>('all');
  const [funcaoFilter, setFuncaoFilter] = useState('all');
  const [tipoVinculoFilter, setTipoVinculoFilter] = useState<'all' | 'clt' | 'freelancer' | 'prestador'>('all');
  
  const [formData, setFormData] = useState<FormData>({
    nome_completo: '',
    cpf: '',
    rg: '',
    data_nascimento: '',
    funcao_id: '',
    funcao_personalizada: '',
    tipo_vinculo: 'clt',
    data_admissao: dayjs().format('YYYY-MM-DD'),
    salario_fixo: 0,
    valor_diaria: 0,
    percentual_comissao: 0,
    telefone: '',
    email: '',
    endereco: '',
    observacoes: '',
    status: 'ativo'
  });

  useEffect(() => {
    fetchData();
    fetchFuncoes();
    fetchIndicadores();
  }, []);

  useEffect(() => {
    fetchData();
  }, [statusFilter, funcaoFilter, tipoVinculoFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!supabase) {
        console.warn('Supabase client not initialized');
        setColaboradores([]);
        return;
      }

      let query = supabase.from('vw_colaboradores_completo').select('*');

      // Aplicar filtros
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (funcaoFilter !== 'all') {
        query = query.eq('funcao_id', funcaoFilter);
      }

      if (tipoVinculoFilter !== 'all') {
        query = query.eq('tipo_vinculo', tipoVinculoFilter);
      }

      const { data, error } = await query.order('nome_completo');

      if (error) throw error;
      setColaboradores(data || []);
    } catch (err) {
      console.error('Error fetching employees:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar colaboradores');
    } finally {
      setLoading(false);
    }
  };

  const fetchFuncoes = async () => {
    try {
      const { data, error } = await supabase
        .from('funcoes_rh')
        .select('*')
        .eq('status', 'ativo')
        .order('nome');

      if (error) throw error;
      setFuncoes(data || []);
    } catch (err) {
      console.error('Error fetching functions:', err);
    }
  };

  const fetchIndicadores = async () => {
    try {
      const { data, error } = await supabase
        .from('colaboradores')
        .select('*');

      if (error) throw error;

      const totalColaboradores = (data || []).length;
      const colaboradoresAtivos = (data || []).filter(c => c.status === 'ativo').length;
      const colaboradoresInativos = (data || []).filter(c => c.status === 'inativo').length;
      const colaboradoresAfastados = (data || []).filter(c => c.status === 'afastado').length;
      const colaboradoresDemitidos = (data || []).filter(c => c.status === 'demitido').length;
      const salarioMedio = totalColaboradores > 0 
        ? (data || []).reduce((sum, c) => sum + (c.salario_fixo || 0), 0) / totalColaboradores
        : 0;
      const colaboradoresComComissao = (data || []).filter(c => (c.percentual_comissao || 0) > 0).length;
      const tiposVinculo = new Set((data || []).map(c => c.tipo_vinculo)).size;

      setIndicadores({
        total_colaboradores: totalColaboradores,
        colaboradores_ativos: colaboradoresAtivos,
        colaboradores_inativos: colaboradoresInativos,
        colaboradores_afastados: colaboradoresAfastados,
        colaboradores_demitidos: colaboradoresDemitidos,
        salario_medio: salarioMedio,
        colaboradores_com_comissao: colaboradoresComComissao,
        tipos_vinculo: tiposVinculo
      });
    } catch (err) {
      console.error('Error fetching indicators:', err);
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione uma imagem válida');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('A imagem deve ter no máximo 2MB');
      return;
    }

    try {
      setUploadingPhoto(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `colaboradores/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('fotos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('fotos')
        .getPublicUrl(filePath);

      setFormData({ ...formData, foto_url: publicUrl });
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      alert('Erro ao fazer upload da foto');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);

      // Validações
      if (!formData.nome_completo) {
        throw new Error('Nome completo é obrigatório');
      }

      // Validar data de demissão quando status for inativo ou demitido
      if ((formData.status === 'inativo' || formData.status === 'demitido') && !formData.data_demissao) {
        throw new Error('Data de demissão é obrigatória para colaboradores inativos ou demitidos');
      }

      const dataToSave = {
        ...formData,
        salario_fixo: parseFloat(formData.salario_fixo.toString()) || 0,
        valor_diaria: parseFloat(formData.valor_diaria.toString()) || 0,
        percentual_comissao: parseFloat(formData.percentual_comissao.toString()) || 0,
        funcao_id: formData.funcao_id || null,
        data_nascimento: formData.data_nascimento || null,
        data_admissao: formData.data_admissao || null,
        data_demissao: formData.data_demissao || null,
        foto_url: formData.foto_url || null
      };

      if (editingColaborador) {
        const { error } = await supabase
          .from('colaboradores')
          .update({ ...dataToSave, atualizado_em: new Date().toISOString() })
          .eq('id', editingColaborador.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('colaboradores')
          .insert([dataToSave]);

        if (error) throw error;
      }

      setShowForm(false);
      setEditingColaborador(null);
      resetForm();
      fetchData();
      fetchIndicadores();
    } catch (err) {
      console.error('Error saving employee:', err);
      setError(err instanceof Error ? err.message : 'Erro ao salvar colaborador');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este colaborador?')) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('colaboradores')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchData();
      fetchIndicadores();
    } catch (err) {
      console.error('Error deleting employee:', err);
      setError(err instanceof Error ? err.message : 'Erro ao excluir colaborador');
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (colaborador: Colaborador) => {
    try {
      setLoading(true);
      const newStatus = colaborador.status === 'ativo' ? 'inativo' : 'ativo';
      
      const { error } = await supabase
        .from('colaboradores')
        .update({ 
          status: newStatus,
          atualizado_em: new Date().toISOString()
        })
        .eq('id', colaborador.id);

      if (error) throw error;
      fetchData();
      fetchIndicadores();
    } catch (err) {
      console.error('Error updating status:', err);
      setError(err instanceof Error ? err.message : 'Erro ao atualizar status');
    } finally {
      setLoading(false);
    }
  };

  const openForm = (colaborador?: Colaborador) => {
    if (colaborador) {
      setEditingColaborador(colaborador);
      setFormData({
        nome_completo: colaborador.nome_completo,
        cpf: colaborador.cpf || '',
        rg: colaborador.rg || '',
        data_nascimento: colaborador.data_nascimento || '',
        funcao_id: colaborador.funcao_id || '',
        funcao_personalizada: colaborador.funcao_personalizada || '',
        tipo_vinculo: colaborador.tipo_vinculo,
        data_admissao: colaborador.data_admissao || '',
        salario_fixo: colaborador.salario_fixo || 0,
        valor_diaria: colaborador.valor_diaria || 0,
        percentual_comissao: colaborador.percentual_comissao || 0,
        telefone: colaborador.telefone || '',
        email: colaborador.email || '',
        endereco: colaborador.endereco || '',
        observacoes: colaborador.observacoes || '',
        status: colaborador.status
      });
    } else {
      setEditingColaborador(null);
      resetForm();
    }
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      nome_completo: '',
      cpf: '',
      rg: '',
      data_nascimento: '',
      funcao_id: '',
      funcao_personalizada: '',
      tipo_vinculo: 'clt',
      data_admissao: dayjs().format('YYYY-MM-DD'),
      data_demissao: '',
      salario_fixo: 0,
      valor_diaria: 0,
      percentual_comissao: 0,
      telefone: '',
      email: '',
      endereco: '',
      observacoes: '',
      status: 'ativo',
      foto_url: ''
    });
  };

  const filteredColaboradores = colaboradores.filter(colaborador => {
    const matchesSearch = colaborador.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         colaborador.cpf?.includes(searchTerm) ||
                         colaborador.email?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ativo':
        return 'text-green-700 bg-green-100';
      case 'inativo':
        return 'text-gray-700 bg-gray-100';
      case 'afastado':
        return 'text-yellow-700 bg-yellow-100';
      case 'demitido':
        return 'text-red-700 bg-red-100';
      default:
        return 'text-gray-700 bg-gray-100';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ativo':
        return 'Ativo';
      case 'inativo':
        return 'Inativo';
      case 'afastado':
        return 'Afastado';
      case 'demitido':
        return 'Demitido';
      default:
        return status;
    }
  };

  const getTipoVinculoColor = (tipo: string) => {
    switch (tipo) {
      case 'clt':
        return 'text-blue-700 bg-blue-100';
      case 'freelancer':
        return 'text-purple-700 bg-purple-100';
      case 'prestador':
        return 'text-orange-700 bg-orange-100';
      default:
        return 'text-gray-700 bg-gray-100';
    }
  };

  const getTipoVinculoText = (tipo: string) => {
    switch (tipo) {
      case 'clt':
        return 'CLT';
      case 'freelancer':
        return 'Freelancer';
      case 'prestador':
        return 'Prestador';
      default:
        return tipo;
    }
  };

  const exportData = () => {
    if (filteredColaboradores.length === 0) {
      alert('Não há dados para exportar');
      return;
    }

    const headers = [
      'Nome Completo',
      'CPF',
      'RG',
      'Data Nascimento',
      'Função',
      'Tipo Vínculo',
      'Data Admissão',
      'Salário Fixo',
      'Valor Diária',
      'Percentual Comissão',
      'Telefone',
      'Email',
      'Status',
      'Anos na Empresa'
    ];

    const data = filteredColaboradores.map(colaborador => [
      colaborador.nome_completo,
      colaborador.cpf || '',
      colaborador.rg || '',
      colaborador.data_nascimento ? dayjs(colaborador.data_nascimento).format('DD/MM/YYYY') : '',
      colaborador.funcao_nome || colaborador.funcao_personalizada || '',
      getTipoVinculoText(colaborador.tipo_vinculo),
      colaborador.data_admissao ? dayjs(colaborador.data_admissao).format('DD/MM/YYYY') : '',
      colaborador.salario_fixo,
      colaborador.valor_diaria,
      `${colaborador.percentual_comissao}%`,
      colaborador.telefone || '',
      colaborador.email || '',
      getStatusText(colaborador.status),
      colaborador.anos_empresa?.toFixed(1) || '0'
    ]);

    const fileName = `colaboradores-${dayjs().format('YYYY-MM-DD')}`;
    exportToExcel(data, fileName, headers);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Colaboradores</h3>
        <div className="flex gap-2">
          <button
            onClick={exportData}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            <Download className="w-4 h-4 inline mr-2" />
            Exportar Excel
          </button>
          <button
            onClick={() => openForm()}
            className="px-4 py-2 bg-[#7D1F2C] text-white rounded-lg hover:bg-[#6a1a25]"
          >
            <Plus className="w-4 h-4 inline mr-2" />
            Novo Colaborador
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* Indicadores */}
      {indicadores && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-500">Total Colaboradores</p>
                <p className="text-2xl font-bold text-blue-600">
                  {indicadores.total_colaboradores}
                </p>
                <p className="text-sm text-gray-600">Cadastrados</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <CheckCircle className="w-8 h-8 text-green-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-500">Colaboradores Ativos</p>
                <p className="text-2xl font-bold text-green-600">
                  {indicadores.colaboradores_ativos}
                </p>
                <p className="text-sm text-gray-600">Trabalhando</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <DollarSign className="w-8 h-8 text-purple-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-500">Salário Médio</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatCurrency(indicadores.salario_medio)}
                </p>
                <p className="text-sm text-gray-600">Por colaborador</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <Target className="w-8 h-8 text-orange-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-500">Com Comissão</p>
                <p className="text-2xl font-bold text-orange-600">
                  {indicadores.colaboradores_com_comissao}
                </p>
                <p className="text-sm text-gray-600">Colaboradores</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar colaboradores..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7D1F2C] focus:border-[#7D1F2C]"
              />
            </div>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#7D1F2C] focus:border-[#7D1F2C]"
            >
              <option value="all">Todos os Status</option>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
              <option value="afastado">Afastado</option>
              <option value="demitido">Demitido</option>
            </select>
          </div>

          <div>
            <select
              value={funcaoFilter}
              onChange={(e) => setFuncaoFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#7D1F2C] focus:border-[#7D1F2C]"
            >
              <option value="all">Todas as Funções</option>
              {funcoes.map((funcao) => (
                <option key={funcao.id} value={funcao.id}>
                  {funcao.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={tipoVinculoFilter}
              onChange={(e) => setTipoVinculoFilter(e.target.value as any)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#7D1F2C] focus:border-[#7D1F2C]"
            >
              <option value="all">Todos os Vínculos</option>
              <option value="clt">CLT</option>
              <option value="freelancer">Freelancer</option>
              <option value="prestador">Prestador</option>
            </select>
          </div>

          <div>
            <button
              onClick={fetchData}
              className="w-full px-4 py-2 bg-[#7D1F2C] text-white rounded-md hover:bg-[#6a1a25]"
            >
              <Filter className="w-4 h-4 inline mr-2" />
              Filtrar
            </button>
          </div>
        </div>
      </div>

      {/* Lista de Colaboradores */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#7D1F2C]"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left bg-gray-50 border-b">
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Colaborador
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Função
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo Vínculo
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Admissão
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Salário/Diária
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Comissão
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredColaboradores.map((colaborador) => (
                  <tr key={colaborador.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        {colaborador.foto_url ? (
                          <img
                            src={colaborador.foto_url}
                            alt={colaborador.nome_completo}
                            className="w-10 h-10 rounded-full object-cover mr-3"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-[#7D1F2C] flex items-center justify-center text-white font-medium mr-3">
                            {colaborador.nome_completo.split(' ').map(n => n[0]).join('').substring(0, 2)}
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-gray-900">{colaborador.nome_completo}</div>
                          {colaborador.cpf && (
                            <div className="text-sm text-gray-500">CPF: {colaborador.cpf}</div>
                          )}
                          {colaborador.telefone && (
                            <div className="text-sm text-gray-500 flex items-center">
                              <Phone className="w-3 h-3 mr-1" />
                              {colaborador.telefone}
                            </div>
                          )}
                          {colaborador.email && (
                            <div className="text-sm text-gray-500 flex items-center">
                              <Mail className="w-3 h-3 mr-1" />
                              {colaborador.email}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">
                          {colaborador.funcao_nome || colaborador.funcao_personalizada || 'Não definida'}
                        </div>
                        {colaborador.funcao_salario_base && (
                          <div className="text-sm text-gray-500">
                            Base: {formatCurrency(colaborador.funcao_salario_base)}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTipoVinculoColor(colaborador.tipo_vinculo)}`}>
                        {getTipoVinculoText(colaborador.tipo_vinculo)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        {colaborador.data_admissao && (
                          <div className="text-sm text-gray-900">
                            {dayjs(colaborador.data_admissao).format('DD/MM/YYYY')}
                          </div>
                        )}
                        {colaborador.anos_empresa && (
                          <div className="text-sm text-gray-500">
                            {colaborador.anos_empresa.toFixed(1)} anos
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        {colaborador.salario_fixo > 0 && (
                          <div className="text-sm font-medium text-gray-900">
                            {formatCurrency(colaborador.salario_fixo)}
                          </div>
                        )}
                        {colaborador.valor_diaria > 0 && (
                          <div className="text-sm text-gray-600">
                            Diária: {formatCurrency(colaborador.valor_diaria)}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`font-medium ${
                        colaborador.percentual_comissao > 0 ? 'text-green-600' : 'text-gray-400'
                      }`}>
                        {colaborador.percentual_comissao}%
                      </div>
                      {colaborador.percentual_comissao > 0 && (
                        <div className="text-xs text-green-600">
                          <Target className="w-3 h-3 inline mr-1" />
                          Com comissão
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(colaborador.status)}`}>
                        {getStatusText(colaborador.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setFichaColaborador(colaborador);
                            setShowFicha(true);
                          }}
                          className="text-purple-600 hover:text-purple-800"
                          title="Ver Ficha"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openForm(colaborador)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => toggleStatus(colaborador)}
                          className={`${colaborador.status === 'ativo' ? 'text-green-600' : 'text-gray-400'} hover:opacity-75`}
                          title={colaborador.status === 'ativo' ? 'Desativar' : 'Ativar'}
                        >
                          {colaborador.status === 'ativo' ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleDelete(colaborador.id)}
                          className="text-red-600 hover:text-red-800"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredColaboradores.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum colaborador encontrado</h3>
              <p className="text-gray-500">
                {searchTerm || statusFilter !== 'all' || funcaoFilter !== 'all' || tipoVinculoFilter !== 'all'
                  ? 'Nenhum colaborador corresponde aos filtros aplicados.'
                  : 'Nenhum colaborador cadastrado.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Modal do Formulário */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {editingColaborador ? 'Editar Colaborador' : 'Novo Colaborador'}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  value={formData.nome_completo}
                  onChange={(e) => setFormData({ ...formData, nome_completo: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  required
                  placeholder="Nome completo do colaborador"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CPF
                </label>
                <input
                  type="text"
                  value={formData.cpf}
                  onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  placeholder="000.000.000-00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  RG
                </label>
                <input
                  type="text"
                  value={formData.rg}
                  onChange={(e) => setFormData({ ...formData, rg: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  placeholder="00.000.000-0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data de Nascimento
                </label>
                <input
                  type="date"
                  value={formData.data_nascimento}
                  onChange={(e) => setFormData({ ...formData, data_nascimento: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Função
                </label>
                <select
                  value={formData.funcao_id}
                  onChange={(e) => setFormData({ ...formData, funcao_id: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                >
                  <option value="">Selecione uma função...</option>
                  {funcoes.map((funcao) => (
                    <option key={funcao.id} value={funcao.id}>
                      {funcao.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Função Personalizada
                </label>
                <input
                  type="text"
                  value={formData.funcao_personalizada}
                  onChange={(e) => setFormData({ ...formData, funcao_personalizada: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  placeholder="Se não houver função cadastrada"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Vínculo
                </label>
                <select
                  value={formData.tipo_vinculo}
                  onChange={(e) => setFormData({ ...formData, tipo_vinculo: e.target.value as any })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                >
                  <option value="clt">CLT</option>
                  <option value="freelancer">Freelancer</option>
                  <option value="prestador">Prestador de Serviços</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data de Admissão
                </label>
                <input
                  type="date"
                  value={formData.data_admissao}
                  onChange={(e) => setFormData({ ...formData, data_admissao: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                />
              </div>

              {(formData.status === 'inativo' || formData.status === 'demitido') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data de Demissão *
                  </label>
                  <input
                    type="date"
                    value={formData.data_demissao}
                    onChange={(e) => setFormData({ ...formData, data_demissao: e.target.value })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                    required
                  />
                </div>
              )}

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Foto do Colaborador
                </label>
                <div className="flex items-center gap-4">
                  {formData.foto_url && (
                    <div className="w-24 h-24 rounded-lg overflow-hidden border-2 border-gray-300">
                      <img
                        src={formData.foto_url}
                        alt="Foto do colaborador"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                      id="photo-upload"
                      disabled={uploadingPhoto}
                    />
                    <label
                      htmlFor="photo-upload"
                      className={`inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer ${
                        uploadingPhoto ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {uploadingPhoto ? 'Enviando...' : 'Escolher Foto'}
                    </label>
                    <p className="mt-2 text-xs text-gray-500">
                      Formatos: JPG, PNG. Tamanho máximo: 2MB
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Salário Fixo
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">R$</span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.salario_fixo}
                    onChange={(e) => setFormData({ ...formData, salario_fixo: parseFloat(e.target.value) || 0 })}
                    className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valor da Diária
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">R$</span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.valor_diaria}
                    onChange={(e) => setFormData({ ...formData, valor_diaria: parseFloat(e.target.value) || 0 })}
                    className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Percentual de Comissão
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.percentual_comissao}
                    onChange={(e) => setFormData({ ...formData, percentual_comissao: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">%</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefone
                </label>
                <input
                  type="tel"
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  placeholder="(11) 99999-9999"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  placeholder="email@exemplo.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                >
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                  <option value="afastado">Afastado</option>
                  <option value="demitido">Demitido</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Endereço
                </label>
                <textarea
                  value={formData.endereco}
                  onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  rows={2}
                  placeholder="Endereço completo"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observações
                </label>
                <textarea
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  rows={3}
                  placeholder="Observações sobre o colaborador..."
                />
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={loading || !formData.nome_completo}
                className="px-4 py-2 bg-[#7D1F2C] text-white rounded-md hover:bg-[#6a1a25] disabled:opacity-50"
              >
                {loading ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal da Ficha do Colaborador */}
      {showFicha && fichaColaborador && (
        <FichaColaborador
          colaborador={fichaColaborador}
          onClose={() => {
            setShowFicha(false);
            setFichaColaborador(null);
          }}
        />
      )}
    </div>
  );
};

export default ColaboradoresRH;