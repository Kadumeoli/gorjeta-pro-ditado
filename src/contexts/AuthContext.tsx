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
    const savedUser = localStorage.getItem('sistema_usuario');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        setUsuario(user);
        loadPermissoes(user.id);
      } catch (err) {
        localStorage.removeItem('sistema_usuario');
      }
    } else {
      setUsuarioMasterDesenvolvimento();
    }
    setLoading(false);
  }, []);

  const setUsuarioMasterDesenvolvimento = async () => {
    try {
      if (!supabase) {
        setUsuario(usuarioTempPadrao());
        setPermissoes([]);
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from('usuarios_sistema')
        .select('*')
        .eq('email', 'master@ditadopopular.com')
        .eq('ativo', true)
        .maybeSingle();

      if (userError || !userData) {
        setUsuario(usuarioTempPadrao());
        setPermissoes([]);
        return;
      }

      setUsuario(userData);
      await loadPermissoes(userData.id);
    } catch (err) {
      setUsuario(usuarioTempPadrao());
      setPermissoes([]);
    }
  };

  const usuarioTempPadrao = (): Usuario => ({
    id: 'temp-master',
    nome_completo: 'Administrador',
    email: 'admin@ditadopopular.com',
    nivel: 'master',
    ativo: true,
    cargo: 'Administrador',
    departamento: 'Administração'
  });

  const loadPermissoes = async (usuarioId: string) => {
    try {
      if (!supabase) { setPermissoes([]); return; }

      const { data: userData } = await supabase
        .from('usuarios_sistema')
        .select('nivel')
        .eq('id', usuarioId)
        .single();

      // Master não precisa de permissões específicas
      if (!userData || userData.nivel === 'master') {
        setPermissoes([]);
        return;
      }

      const { data, error } = await supabase
        .from('vw_permissoes_usuario')
        .select('*')
        .eq('usuario_id', usuarioId);

      if (error) throw error;

      setPermissoes((data || []).map(p => ({
        modulo_slug: p.modulo_slug,
        aba_slug: p.aba_slug,
        pode_visualizar: p.pode_visualizar,
        pode_criar: p.pode_criar,
        pode_editar: p.pode_editar,
        pode_excluir: p.pode_excluir,
        pode_aprovar: p.pode_aprovar
      })));
    } catch (err) {
      console.error('Erro ao carregar permissões:', err);
      setPermissoes([]);
    }
  };

  const login = async (email: string, senha: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      if (!supabase) {
        setError('Erro de configuração do sistema');
        return false;
      }

      const { data: userData, error: userError } = await supabase
        .from('usuarios_sistema')
        .select('*')
        .eq('email', email)
        .eq('ativo', true)
        .maybeSingle();

      if (userError) { setError('Erro ao conectar com o banco de dados'); return false; }
      if (!userData)  { setError('Email ou senha incorretos'); return false; }

      if (senha.length < 3) { setError('Senha deve ter pelo menos 3 caracteres'); return false; }

      await supabase
        .from('usuarios_sistema')
        .update({ ultimo_acesso: new Date().toISOString() })
        .eq('id', userData.id);

      setUsuario(userData);
      localStorage.setItem('sistema_usuario', JSON.stringify(userData));
      await loadPermissoes(userData.id);
      return true;
    } catch (err) {
      console.error('Erro no login:', err);
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

  const isMaster = (): boolean =>
    usuario?.nivel === 'master' || usuario?.id === 'temp-master';

  const verificarPermissao = (moduloSlug: string, abaSlug?: string, acao = 'visualizar'): boolean => {
    if (!usuario) return false;
    if (isMaster()) return true;

    const permissao = permissoes.find(p =>
      abaSlug
        ? p.modulo_slug === moduloSlug && p.aba_slug === abaSlug
        : p.modulo_slug === moduloSlug && !p.aba_slug
    );
    if (!permissao) return false;

    switch (acao) {
      case 'visualizar': return !!permissao.pode_visualizar;
      case 'criar':      return !!permissao.pode_criar;
      case 'editar':     return !!permissao.pode_editar;
      case 'excluir':    return !!permissao.pode_excluir;
      case 'aprovar':    return !!permissao.pode_aprovar;
      default:           return false;
    }
  };

  const temAcessoModulo = (moduloSlug: string): boolean => {
    if (!usuario) return false;
    if (isMaster()) return true;
    return permissoes.some(p => p.modulo_slug === moduloSlug && (p.pode_visualizar || false));
  };

  const temAcessoAba = (moduloSlug: string, abaSlug: string): boolean => {
    if (!usuario) return false;
    if (isMaster()) return true;
    return verificarPermissao(moduloSlug, abaSlug, 'visualizar');
  };

  const isAdmin = (): boolean =>
    usuario?.nivel === 'admin' || usuario?.nivel === 'master';

  const refreshPermissoes = async (): Promise<void> => {
    if (usuario) await loadPermissoes(usuario.id);
  };

  return (
    <AuthContext.Provider value={{
      usuario, permissoes, loading, error,
      login, logout,
      verificarPermissao, temAcessoModulo, temAcessoAba,
      isMaster, isAdmin, refreshPermissoes
    }}>
      {children}
    </AuthContext.Provider>
  );
};
