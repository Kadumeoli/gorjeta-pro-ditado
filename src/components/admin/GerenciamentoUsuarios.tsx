import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, CreditCard as Edit, Trash2, Eye, EyeOff, Shield, User, Users, Settings, CheckCircle, XCircle, Crown, Star, AlertTriangle, Download, FileText, Lock, Unlock, Calendar, Mail, Phone, Briefcase, Building } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import GerenciamentoPermissoes from './GerenciamentoPermissoes';
import { useAuth } from '../../contexts/AuthContext';
import { exportToExcel } from '../../utils/reportGenerator';
import dayjs from 'dayjs';

interface UsuarioSistema {
  id: string;
  nome_completo: string;
  email: string;
  nivel: 'master' | 'admin' | 'usuario' | 'visitante';
  ativo: boolean;
  ultimo_acesso?: string;
  foto_url?: string;
  telefone?: string;
  cargo?: string;
  departamento?: string;
  data_admissao?: string;
  configuracoes?: any;
  criado_em: string;
  atualizado_em: string;
  // Dados da view
  total_modulos_permitidos?: number;
  total_abas_permitidas?: number;
  abas_com_criacao?: number;
  abas_com_edicao?: number;
  abas_com_exclusao?: number;
  abas_com_aprovacao?: number;
}

interface FormData {
  nome_completo: string;
  email: string;
  senha: string;
  nivel: 'master' | 'admin' | 'usuario' | 'visitante';
  telefone: string;
  cargo: string;
  departamento: string;
  data_admissao: string;
  ativo: boolean;
}

interface IndicadoresUsuarios {
  total_usuarios: number;
  usuarios_ativos: number;
  usuarios_inativos: number;
  masters: number;
  admins: number;
  usuarios_comuns: number;
  visitantes: number;
  ultimo_login?: string;
}

const GerenciamentoUsuarios: React.FC = () => {
  const { isMaster, usuario: usuarioLogado } = useAuth();
  const [usuarios, setUsuarios] = useState<UsuarioSistema[]>([]);
  const [indicadores, setIndicadores] = useState<IndicadoresUsuarios | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingUsuario, setEditingUsuario] = useState<UsuarioSistema | null>(null);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [usuarioPermissoes, setUsuarioPermissoes] = useState<UsuarioSistema | null>(null);
  const { refreshPermissoes } = useAuth();
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [nivelFilter, setNivelFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ativo' | 'inativo'>('all');
  const [departamentoFilter, setDepartamentoFilter] = useState('all');
  
  const [formData, setFormData] = useState<FormData>({
    nome_completo: '',
    email: '',
    senha: '',
    nivel: 'usuario',
    telefone: '',
    cargo: '',
    departamento: 'Operacional',
    data_admissao: dayjs().format('YYYY-MM-DD'),
    ativo: true
  });

  const departamentos = [
    'Administração', 'Operacional', 'Cozinha', 'Bar', 'Eventos', 
    'Segurança', 'Limpeza', 'RH', 'Financeiro', 'TI'
  ];

  useEffect(() => {
    if (isMaster()) {
      fetchData();
      fetchIndicadores();
    }
  }, []);

  useEffect(() => {
    if (isMaster()) {
      fetchData();
    }
  }, [nivelFilter, statusFilter, departamentoFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase.from('vw_usuarios_permissoes').select('*');

      // Aplicar filtros
      if (nivelFilter !== 'all') {
        query = query.eq('nivel', nivelFilter);
      }

      if (statusFilter !== 'all') {
        query = query.eq('ativo', statusFilter === 'ativo');
      }

      if (departamentoFilter !== 'all') {
        query = query.eq('departamento', departamentoFilter);
      }

      const { data, error } = await query.order('criado_em', { ascending: false });

      if (error) throw error;
      setUsuarios(data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  const fetchIndicadores = async () => {
    try {
      const { data, error } = await supabase
        .from('usuarios_sistema')
        .select('*');

      if (error) throw error;

      const totalUsuarios = (data || []).length;
      const usuariosAtivos = (data || []).filter(u => u.ativo).length;
      const usuariosInativos = totalUsuarios - usuariosAtivos;
      const masters = (data || []).filter(u => u.nivel === 'master').length;
      const admins = (data || []).filter(u => u.nivel === 'admin').length;
      const usuariosComuns = (data || []).filter(u => u.nivel === 'usuario').length;
      const visitantes = (data || []).filter(u => u.nivel === 'visitante').length;
      
      // Encontrar último login
      const ultimoLogin = (data || [])
        .filter(u => u.ultimo_acesso)
        .sort((a, b) => dayjs(b.ultimo_acesso).diff(dayjs(a.ultimo_acesso)))[0];

      setIndicadores({
        total_usuarios: totalUsuarios,
        usuarios_ativos: usuariosAtivos,
        usuarios_inativos: usuariosInativos,
        masters,
        admins,
        usuarios_comuns: usuariosComuns,
        visitantes,
        ultimo_login: ultimoLogin?.ultimo_acesso
      });
    } catch (err) {
      console.error('Error fetching indicators:', err);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);

      // Validações
      if (!formData.nome_completo || !formData.email) {
        throw new Error('Nome e email são obrigatórios');
      }

      if (!editingUsuario && !formData.senha) {
        throw new Error('Senha é obrigatória para novos usuários');
      }

      // TODO: Implementar hash da senha com bcrypt
      const senhaHash = formData.senha ? `hashed_${formData.senha}` : undefined;

      const dataToSave = {
        nome_completo: formData.nome_completo,
        email: formData.email,
        nivel: formData.nivel,
        telefone: formData.telefone,
        cargo: formData.cargo,
        departamento: formData.departamento,
        data_admissao: formData.data_admissao,
        ativo: formData.ativo,
        ...(senhaHash && { senha_hash: senhaHash }),
        criado_por: usuarioLogado?.id
      };

      if (editingUsuario) {
        // Não permitir que usuário altere seu próprio nível ou desative a si mesmo
        if (editingUsuario.id === usuarioLogado?.id) {
          if (dataToSave.nivel !== editingUsuario.nivel) {
            throw new Error('Você não pode alterar seu próprio nível de acesso');
          }
          if (!dataToSave.ativo) {
            throw new Error('Você não pode desativar sua própria conta');
          }
        }

        const { error } = await supabase
          .from('usuarios_sistema')
          .update({ ...dataToSave, atualizado_em: new Date().toISOString() })
          .eq('id', editingUsuario.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('usuarios_sistema')
          .insert([dataToSave]);

        if (error) throw error;
      }

      setShowForm(false);
      setEditingUsuario(null);
      resetForm();
      fetchData();
      fetchIndicadores();
    } catch (err) {
      console.error('Error saving user:', err);
      setError(err instanceof Error ? err.message : 'Erro ao salvar usuário');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (id === usuarioLogado?.id) {
      alert('Você não pode excluir sua própria conta');
      return;
    }

    if (!confirm('Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.')) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('usuarios_sistema')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchData();
      fetchIndicadores();
    } catch (err) {
      console.error('Error deleting user:', err);
      setError(err instanceof Error ? err.message : 'Erro ao excluir usuário');
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (usuario: UsuarioSistema) => {
    if (usuario.id === usuarioLogado?.id) {
      alert('Você não pode desativar sua própria conta');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('usuarios_sistema')
        .update({ 
          ativo: !usuario.ativo,
          atualizado_em: new Date().toISOString()
        })
        .eq('id', usuario.id);

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

  const openForm = (usuario?: UsuarioSistema) => {
    if (usuario) {
      setEditingUsuario(usuario);
      setFormData({
        nome_completo: usuario.nome_completo,
        email: usuario.email,
        senha: '', // Não carregar senha existente
        nivel: usuario.nivel,
        telefone: usuario.telefone || '',
        cargo: usuario.cargo || '',
        departamento: usuario.departamento || 'Operacional',
        data_admissao: usuario.data_admissao || dayjs().format('YYYY-MM-DD'),
        ativo: usuario.ativo
      });
    } else {
      setEditingUsuario(null);
      resetForm();
    }
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      nome_completo: '',
      email: '',
      senha: '',
      nivel: 'usuario',
      telefone: '',
      cargo: '',
      departamento: 'Operacional',
      data_admissao: dayjs().format('YYYY-MM-DD'),
      ativo: true
    });
  };

  const openPermissionsModal = (usuario: UsuarioSistema) => {
    setUsuarioPermissoes(usuario);
    setShowPermissionsModal(true);
  };

  const filteredUsuarios = usuarios.filter(usuario => {
    const matchesSearch = usuario.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         usuario.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         usuario.cargo?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const getNivelColor = (nivel: string) => {
    switch (nivel) {
      case 'master':
        return 'text-red-700 bg-red-100 border border-red-200';
      case 'admin':
        return 'text-purple-700 bg-purple-100 border border-purple-200';
      case 'usuario':
        return 'text-blue-700 bg-blue-100 border border-blue-200';
      case 'visitante':
        return 'text-gray-700 bg-gray-100 border border-gray-200';
      default:
        return 'text-gray-700 bg-gray-100 border border-gray-200';
    }
  };

  const getNivelIcon = (nivel: string) => {
    switch (nivel) {
      case 'master':
        return <Crown className="w-4 h-4" />;
      case 'admin':
        return <Star className="w-4 h-4" />;
      case 'usuario':
        return <User className="w-4 h-4" />;
      case 'visitante':
        return <Eye className="w-4 h-4" />;
      default:
        return <User className="w-4 h-4" />;
    }
  };

  const getNivelText = (nivel: string) => {
    switch (nivel) {
      case 'master':
        return 'Master';
      case 'admin':
        return 'Administrador';
      case 'usuario':
        return 'Usuário';
      case 'visitante':
        return 'Visitante';
      default:
        return nivel;
    }
  };

  const exportData = () => {
    if (filteredUsuarios.length === 0) {
      alert('Não há dados para exportar');
      return;
    }

    const headers = [
      'Nome Completo',
      'Email',
      'Nível',
      'Cargo',
      'Departamento',
      'Data Admissão',
      'Status',
      'Último Acesso',
      'Módulos Permitidos',
      'Abas Permitidas'
    ];

    const data = filteredUsuarios.map(usuario => [
      usuario.nome_completo,
      usuario.email,
      getNivelText(usuario.nivel),
      usuario.cargo || '',
      usuario.departamento || '',
      usuario.data_admissao ? dayjs(usuario.data_admissao).format('DD/MM/YYYY') : '',
      usuario.ativo ? 'Ativo' : 'Inativo',
      usuario.ultimo_acesso ? dayjs(usuario.ultimo_acesso).format('DD/MM/YYYY HH:mm') : 'Nunca',
      usuario.total_modulos_permitidos || 0,
      usuario.total_abas_permitidas || 0
    ]);

    const fileName = `usuarios-sistema-${dayjs().format('YYYY-MM-DD')}`;
    exportToExcel(data, fileName, headers);
  };

  // Verificar se é master
  if (!isMaster()) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Acesso Negado</h3>
          <p className="text-gray-500">
            Apenas usuários com nível Master podem gerenciar usuários do sistema.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Gerenciamento de Usuários</h3>
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
            Novo Usuário
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
                <p className="text-sm font-medium text-gray-500">Total Usuários</p>
                <p className="text-2xl font-bold text-blue-600">
                  {indicadores.total_usuarios}
                </p>
                <p className="text-sm text-gray-600">
                  {indicadores.usuarios_ativos} ativos
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <Crown className="w-8 h-8 text-red-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-500">Masters & Admins</p>
                <p className="text-2xl font-bold text-red-600">
                  {indicadores.masters + indicadores.admins}
                </p>
                <p className="text-sm text-gray-600">
                  {indicadores.masters} masters, {indicadores.admins} admins
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <User className="w-8 h-8 text-green-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-500">Usuários Comuns</p>
                <p className="text-2xl font-bold text-green-600">
                  {indicadores.usuarios_comuns}
                </p>
                <p className="text-sm text-gray-600">
                  {indicadores.visitantes} visitantes
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <Calendar className="w-8 h-8 text-purple-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-500">Último Acesso</p>
                <p className="text-lg font-bold text-purple-600">
                  {indicadores.ultimo_login ? dayjs(indicadores.ultimo_login).format('DD/MM/YYYY') : 'N/A'}
                </p>
                <p className="text-sm text-gray-600">
                  {indicadores.ultimo_login ? dayjs(indicadores.ultimo_login).format('HH:mm') : 'Nenhum acesso'}
                </p>
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
                placeholder="Buscar usuários..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7D1F2C] focus:border-[#7D1F2C]"
              />
            </div>
          </div>

          <div>
            <select
              value={nivelFilter}
              onChange={(e) => setNivelFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#7D1F2C] focus:border-[#7D1F2C]"
            >
              <option value="all">Todos os Níveis</option>
              <option value="master">Master</option>
              <option value="admin">Administrador</option>
              <option value="usuario">Usuário</option>
              <option value="visitante">Visitante</option>
            </select>
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
            </select>
          </div>

          <div>
            <select
              value={departamentoFilter}
              onChange={(e) => setDepartamentoFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#7D1F2C] focus:border-[#7D1F2C]"
            >
              <option value="all">Todos os Departamentos</option>
              {departamentos.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
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

      {/* Lista de Usuários */}
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
                    Usuário
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nível
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cargo/Departamento
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Permissões
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Último Acesso
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
                {filteredUsuarios.map((usuario) => (
                  <tr key={usuario.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-[#7D1F2C] flex items-center justify-center text-white font-medium mr-3">
                          {usuario.nome_completo.split(' ').map(n => n[0]).join('').substring(0, 2)}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{usuario.nome_completo}</div>
                          <div className="text-sm text-gray-500">{usuario.email}</div>
                          {usuario.telefone && (
                            <div className="text-sm text-gray-500 flex items-center">
                              <Phone className="w-3 h-3 mr-1" />
                              {usuario.telefone}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getNivelColor(usuario.nivel)}`}>
                        {getNivelIcon(usuario.nivel)}
                        <span className="ml-1">{getNivelText(usuario.nivel)}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        {usuario.cargo && (
                          <div className="flex items-center text-sm text-gray-900">
                            <Briefcase className="w-4 h-4 mr-1 text-gray-400" />
                            {usuario.cargo}
                          </div>
                        )}
                        {usuario.departamento && (
                          <div className="flex items-center text-sm text-gray-500">
                            <Building className="w-4 h-4 mr-1 text-gray-400" />
                            {usuario.departamento}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <div className="text-gray-900">
                          {usuario.total_modulos_permitidos || 0} módulos
                        </div>
                        <div className="text-gray-500">
                          {usuario.total_abas_permitidas || 0} abas
                        </div>
                        <div className="flex space-x-1 mt-1">
                          {(usuario.abas_com_criacao || 0) > 0 && (
                            <span className="text-xs bg-green-100 text-green-700 px-1 rounded">
                              C: {usuario.abas_com_criacao}
                            </span>
                          )}
                          {(usuario.abas_com_edicao || 0) > 0 && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-1 rounded">
                              E: {usuario.abas_com_edicao}
                            </span>
                          )}
                          {(usuario.abas_com_exclusao || 0) > 0 && (
                            <span className="text-xs bg-red-100 text-red-700 px-1 rounded">
                              D: {usuario.abas_com_exclusao}
                            </span>
                          )}
                          {(usuario.abas_com_aprovacao || 0) > 0 && (
                            <span className="text-xs bg-purple-100 text-purple-700 px-1 rounded">
                              A: {usuario.abas_com_aprovacao}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        {usuario.ultimo_acesso ? (
                          <>
                            <div className="text-gray-900">
                              {dayjs(usuario.ultimo_acesso).format('DD/MM/YYYY')}
                            </div>
                            <div className="text-gray-500">
                              {dayjs(usuario.ultimo_acesso).format('HH:mm')}
                            </div>
                          </>
                        ) : (
                          <span className="text-gray-400">Nunca acessou</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                        usuario.ativo ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100'
                      }`}>
                        {usuario.ativo ? <CheckCircle className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                        {usuario.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => openPermissionsModal(usuario)}
                          className="text-purple-600 hover:text-purple-800"
                          title="Gerenciar Permissões"
                        >
                          <Shield className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openForm(usuario)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => toggleStatus(usuario)}
                          className={`${usuario.ativo ? 'text-green-600' : 'text-gray-400'} hover:opacity-75`}
                          title={usuario.ativo ? 'Desativar' : 'Ativar'}
                          disabled={usuario.id === usuarioLogado?.id}
                        >
                          {usuario.ativo ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleDelete(usuario.id)}
                          className="text-red-600 hover:text-red-800"
                          title="Excluir"
                          disabled={usuario.id === usuarioLogado?.id}
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

          {filteredUsuarios.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum usuário encontrado</h3>
              <p className="text-gray-500">
                {searchTerm || nivelFilter !== 'all' || statusFilter !== 'all' || departamentoFilter !== 'all'
                  ? 'Nenhum usuário corresponde aos filtros aplicados.'
                  : 'Nenhum usuário cadastrado.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Modal do Formulário de Usuário */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {editingUsuario ? 'Editar Usuário' : 'Novo Usuário'}
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
                  placeholder="Nome completo do usuário"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  required
                  placeholder="email@ditadopopular.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {editingUsuario ? 'Nova Senha (deixe vazio para manter)' : 'Senha *'}
                </label>
                <input
                  type="password"
                  value={formData.senha}
                  onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  required={!editingUsuario}
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nível de Acesso *
                </label>
                <select
                  value={formData.nivel}
                  onChange={(e) => setFormData({ ...formData, nivel: e.target.value as any })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  required
                  disabled={editingUsuario?.id === usuarioLogado?.id}
                >
                  <option value="visitante">Visitante</option>
                  <option value="usuario">Usuário</option>
                  <option value="admin">Administrador</option>
                  <option value="master">Master</option>
                </select>
                {editingUsuario?.id === usuarioLogado?.id && (
                  <p className="text-xs text-gray-500 mt-1">
                    Você não pode alterar seu próprio nível
                  </p>
                )}
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
                  Cargo
                </label>
                <input
                  type="text"
                  value={formData.cargo}
                  onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  placeholder="Ex: Gerente, Analista, Atendente"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Departamento *
                </label>
                <select
                  value={formData.departamento}
                  onChange={(e) => setFormData({ ...formData, departamento: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  required
                >
                  {departamentos.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
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

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="ativo"
                  checked={formData.ativo}
                  onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                  className="rounded border-gray-300 text-[#7D1F2C] focus:ring-[#7D1F2C]"
                  disabled={editingUsuario?.id === usuarioLogado?.id}
                />
                <label htmlFor="ativo" className="ml-2 text-sm text-gray-700">
                  Usuário ativo
                </label>
                {editingUsuario?.id === usuarioLogado?.id && (
                  <p className="text-xs text-gray-500 ml-2">
                    (Você não pode desativar sua própria conta)
                  </p>
                )}
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
                disabled={loading || !formData.nome_completo || !formData.email || (!editingUsuario && !formData.senha)}
                className="px-4 py-2 bg-[#7D1F2C] text-white rounded-md hover:bg-[#6a1a25] disabled:opacity-50"
              >
                {loading ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Permissões - TODO: Implementar componente completo */}
      {showPermissionsModal && usuarioPermissoes && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Permissões - {usuarioPermissoes.nome_completo}
              </h3>
              <button
                onClick={() => setShowPermissionsModal(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Fechar
              </button>
            </div>
            <GerenciamentoPermissoes
              usuarioId={usuarioPermissoes.id}
              usuarioNome={usuarioPermissoes.nome_completo}
              onClose={() => {
                setShowPermissionsModal(false);
                setUsuarioPermissoes(null);
                refreshPermissoes(); // Refresh permissions in AuthContext after saving
              }}
              onSave={() => {}}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default GerenciamentoUsuarios;