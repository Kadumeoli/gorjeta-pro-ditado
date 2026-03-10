import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

export interface Usuario {
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
  configuracoes?: any;
}

export interface Permissao {
  modulo_slug: string;
  aba_slug?: string;
  pode_visualizar?: boolean;
  pode_criar: boolean;
  pode_editar: boolean;
  pode_excluir: boolean;
  pode_aprovar: boolean;
}

interface AuthContextType {
  usuario: Usuario | null;
  permissoes: Permissao[];
  loading: boolean;
  error: string | null;
  login: (email: string, senha: string) => Promise<boolean>;
  logout: () => void;
  verificarPermissao: (moduloSlug: string, abaSlug?: string, acao?: string) => boolean;
  temAcessoModulo: (moduloSlug: string) => boolean;
  temAcessoAba: (moduloSlug: string, abaSlug: string) => boolean;
  isMaster: () => boolean;
  isAdmin: () => boolean;
  refreshPermissoes: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [permissoes, setPermissoes] = useState<Permissao[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Verificar se há usuário logado no localStorage
    const savedUser = localStorage.getItem('sistema_usuario');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        setUsuario(user);
        loadPermissoes(user.id);
      } catch (err) {
        console.error('AuthContext: Erro ao carregar usuário salvo:', err);
        localStorage.removeItem('sistema_usuario');
      }
    } else {
      // Para desenvolvimento, usar usuário master padrão
      setUsuarioMasterDesenvolvimento();
    }
    
    setLoading(false);
  }, []);

  const setUsuarioMasterDesenvolvimento = async () => {
    try {
      console.log('AuthContext: Tentando carregar usuário master para desenvolvimento');

      // Verificar se supabase está disponível
      if (!supabase) {
        console.warn('AuthContext: Supabase não configurado, usando usuário temporário');
        const tempUser: Usuario = {
          id: 'temp-master',
          nome_completo: 'Administrador',
          email: 'admin@ditadopopular.com',
          nivel: 'master',
          ativo: true,
          cargo: 'Administrador',
          departamento: 'Administração'
        };
        setUsuario(tempUser);
        setPermissoes([]);
        return tempUser;
      }

      // Buscar usuário master para desenvolvimento
      const { data: userData, error: userError } = await supabase
        .from('usuarios_sistema')
        .select('*')
        .eq('email', 'master@ditadopopular.com')
        .eq('ativo', true)
        .maybeSingle();

      console.log('AuthContext: Resultado da busca do usuário master:', { userData, userError });
      if (userError || !userData) {
        console.warn('AuthContext: Usuário master não encontrado, criando usuário temporário');
        const tempUser: Usuario = {
          id: 'temp-master',
          nome_completo: 'Administrador',
          email: 'admin@ditadopopular.com',
          nivel: 'master',
          ativo: true,
          cargo: 'Administrador',
          departamento: 'Administração'
        };
        setUsuario(tempUser);
        setPermissoes([]); // Master tem acesso total
        console.log('AuthContext: Usuário temporário criado:', tempUser);
        return tempUser;
      }

      console.log('AuthContext: Usuário master encontrado, carregando permissões...');
      setUsuario(userData);
      await loadPermissoes(userData.id);
    } catch (err) {
      console.error('AuthContext: Erro ao carregar usuário master:', err);
      // Fallback para usuário temporário se houver erro ao buscar no DB
      const tempUser: Usuario = {
        id: 'temp-master',
        nome_completo: 'Administrador',
        email: 'admin@ditadopopular.com',
        nivel: 'master',
        ativo: true,
        cargo: 'Administrador',
        departamento: 'Administração'
      };
      setUsuario(tempUser);
      setPermissoes([]);
      console.log('AuthContext: Fallback para usuário temporário devido a erro:', err);
    }
  };

  const loadPermissoes = async (usuarioId: string) => {
    try {
      console.log('AuthContext: Carregando permissões para usuário:', usuarioId);

      // Verificar se supabase está disponível
      if (!supabase) {
        console.warn('AuthContext: Supabase não configurado, permissões vazias');
        setPermissoes([]);
        return;
      }

      // Primeiro, verificar se o usuário é master
      const { data: userData, error: userError } = await supabase
        .from('usuarios_sistema')
        .select('nivel')
        .eq('id', usuarioId)
        .single();

      if (userError) {
        console.error('AuthContext: Erro ao verificar nível do usuário:', userError);
        throw userError;
      }

      console.log('AuthContext: Nível do usuário:', userData.nivel);

      // Se for master, não precisa carregar permissões específicas
      if (userData.nivel === 'master') {
        console.log('AuthContext: Usuário é master, não carregando permissões específicas');
        setPermissoes([]);
        return;
      }

      const { data, error } = await supabase
        .from('vw_permissoes_usuario')
        .select('*')
        .eq('usuario_id', usuarioId);

      if (error) throw error;
      
      console.log('AuthContext: Permissões brutas encontradas:', data); // Log para dados brutos

      const permissoesProcessadas: Permissao[] = (data || []).map(p => ({
        modulo_slug: p.modulo_slug,
        aba_slug: p.aba_slug,
        pode_visualizar: p.pode_visualizar,
        pode_criar: p.pode_criar,
        pode_editar: p.pode_editar,
        pode_excluir: p.pode_excluir,
        pode_aprovar: p.pode_aprovar
      }));

      console.log('AuthContext: Permissões processadas:', permissoesProcessadas);

      // Log para mostrar o status de pode_visualizar por módulo/aba
      console.log('AuthContext: Status de pode_visualizar por módulo/aba:');
      permissoesProcessadas.forEach(p => {
        console.log(`  - Módulo: ${p.modulo_slug}${p.aba_slug ? `, Aba: ${p.aba_slug}` : ''}, Pode Visualizar: ${p.pode_visualizar}`);
      });

      setPermissoes(permissoesProcessadas);
    } catch (err) {
      console.error('AuthContext: Erro ao carregar permissões:', err);
      setPermissoes([]);
    }
  };

  const login = async (email: string, senha: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      console.log('AuthContext: Tentando login com email:', email);

      // Verificar se supabase está disponível
      if (!supabase) {
        console.error('AuthContext: Supabase não configurado');
        setError('Erro de configuração do sistema');
        return false;
      }

      // Buscar usuário por email
      const { data: userData, error: userError } = await supabase
        .from('usuarios_sistema')
        .select('*')
        .eq('email', email)
        .eq('ativo', true)
        .maybeSingle();

      if (userError) {
        console.log('AuthContext: Erro ao buscar usuário:', userError);
        setError('Erro ao conectar com o banco de dados');
        return false;
      }

      if (!userData) {
        console.log('AuthContext: Usuário não encontrado para email:', email);
        setError('Email ou senha incorretos');
        return false;
      }

      console.log('AuthContext: Usuário encontrado:', userData);

      // TODO: Implementar verificação de senha com bcrypt
      // Por enquanto, aceitar qualquer senha para desenvolvimento
      if (senha.length < 3) {
        setError('Senha deve ter pelo menos 3 caracteres');
        return false;
      }

      // Atualizar último acesso
      await supabase
        .from('usuarios_sistema')
        .update({ ultimo_acesso: new Date().toISOString() })
        .eq('id', userData.id);

      setUsuario(userData);
      localStorage.setItem('sistema_usuario', JSON.stringify(userData));

      // Carregar permissões do usuário
      console.log('AuthContext: Carregando permissões após login...');
      await loadPermissoes(userData.id);

      console.log('AuthContext: Login realizado com sucesso');
      return true;
    } catch (err) {
      console.error('AuthContext: Erro no login:', err);
      setError('Erro interno do sistema');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUsuario(null);
    setPermissoes([]);
    localStorage.removeItem('sistema_usuario');
  };

  const verificarPermissao = (moduloSlug: string, abaSlug?: string, acao: string = 'visualizar'): boolean => {
    console.log(`AuthContext: Verificando permissão - Módulo: ${moduloSlug}, Aba: ${abaSlug || 'N/A'}, Ação: ${acao}`);
    console.log('AuthContext: Usuário atual:', usuario);
    console.log('AuthContext: Permissões atuais:', permissoes);
    
    if (!usuario) {
      console.log('AuthContext: Acesso negado - usuário não logado');
      return false;
    }
    
    // Master tem acesso total
    if (usuario.nivel === 'master' || usuario.id === 'temp-master') {
      console.log('AuthContext: Acesso permitido - usuário é master');
      return true; // temp-master para desenvolvimento
    }
    
    // Buscar permissão específica
    const permissao = permissoes.find(p => {
      if (abaSlug) {
        return p.modulo_slug === moduloSlug && p.aba_slug === abaSlug;
      } else {
        return p.modulo_slug === moduloSlug && !p.aba_slug;
      }
    });

    console.log('AuthContext: Permissão encontrada:', permissao);

    if (!permissao) {
      console.log('AuthContext: Acesso negado - permissão não encontrada');
      return false;
    }

    switch (acao) {
      case 'visualizar':
        const podeVisualizar = permissao.pode_visualizar;
        console.log(`AuthContext: Pode visualizar: ${podeVisualizar}`);
        return podeVisualizar;
      case 'criar':
        const podeCriar = permissao.pode_criar;
        console.log(`AuthContext: Pode criar: ${podeCriar}`);
        return podeCriar;
      case 'editar':
        const podeEditar = permissao.pode_editar;
        console.log(`AuthContext: Pode editar: ${podeEditar}`);
        return podeEditar;
      case 'excluir':
        const podeExcluir = permissao.pode_excluir;
        console.log(`AuthContext: Pode excluir: ${podeExcluir}`);
        return podeExcluir;
      case 'aprovar':
        const podeAprovar = permissao.pode_aprovar;
        console.log(`AuthContext: Pode aprovar: ${podeAprovar}`);
        return podeAprovar;
      default:
        console.log('AuthContext: Acesso negado - ação inválida');
        return false;
    }
  };

  const temAcessoModulo = (moduloSlug: string): boolean => {
    console.log(`AuthContext: Verificando acesso ao módulo ${moduloSlug} para usuário:`, usuario);
    
    if (!usuario) {
      console.log('AuthContext: Usuário não logado, negando acesso');
      return false;
    }
    
    // Master tem acesso a tudo
    if (usuario.nivel === 'master' || usuario.id === 'temp-master') {
      console.log(`AuthContext: Usuário ${usuario.nome_completo} é master, permitindo acesso ao módulo ${moduloSlug}`);
      return true;
    }
    
    // Para outros usuários, verificar se tem acesso ao módulo
    const temAcesso = permissoes.some(p => p.modulo_slug === moduloSlug && (p.pode_visualizar || false));
    console.log(`AuthContext: Usuário ${usuario.nome_completo} (${usuario.nivel}) verificando acesso ao módulo ${moduloSlug}:`, temAcesso);
    console.log('AuthContext: Permissões disponíveis:', permissoes.filter(p => p.modulo_slug === moduloSlug));
    return temAcesso;
  };

  const temAcessoAba = (moduloSlug: string, abaSlug: string): boolean => {
    console.log(`AuthContext: Verificando acesso à aba ${abaSlug} do módulo ${moduloSlug}`);
    
    if (!usuario) {
      console.log('AuthContext: Usuário não logado, negando acesso à aba');
      return false;
    }
    
    // Master tem acesso a tudo
    if (usuario.nivel === 'master' || usuario.id === 'temp-master') {
      console.log(`AuthContext: Usuário ${usuario.nome_completo} é master, permitindo acesso à aba ${abaSlug}`);
      return true;
    }
    
    return verificarPermissao(moduloSlug, abaSlug, 'visualizar');
  };

  const isMaster = (): boolean => {
    return usuario?.nivel === 'master';
  };

  const isAdmin = (): boolean => {
    return usuario?.nivel === 'admin' || usuario?.nivel === 'master';
  };

  const refreshPermissoes = async (): Promise<void> => {
    if (usuario) {
      await loadPermissoes(usuario.id);
    }
  };

  const value: AuthContextType = {
    usuario,
    permissoes,
    loading,
    error,
    login,
    logout,
    verificarPermissao,
    temAcessoModulo,
    temAcessoAba,
    isMaster,
    isAdmin,
    refreshPermissoes
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};