import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, LogIn, User, Lock, AlertCircle, CheckCircle } from 'lucide-react';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, loading, error } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    senha: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoading(true);

    try {
      // Validações básicas
      if (!formData.email || !formData.senha) {
        setLoginError('Por favor, preencha todos os campos');
        return;
      }

      if (!formData.email.includes('@')) {
        setLoginError('Por favor, insira um email válido');
        return;
      }

      if (formData.senha.length < 3) {
        setLoginError('A senha deve ter pelo menos 3 caracteres');
        return;
      }

      const success = await login(formData.email, formData.senha);
      
      if (success) {
        navigate('/');
      } else {
        setLoginError('Email ou senha incorretos');
      }
    } catch (err) {
      console.error('Erro no login:', err);
      setLoginError('Erro interno do sistema. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
    // Limpar erro quando usuário começar a digitar
    if (loginError) {
      setLoginError(null);
    }
  };

  // Usuários de demonstração
  const usuariosDemo = [
    { email: 'master@ditadopopular.com', senha: 'master123', nivel: 'Master', descricao: 'Acesso total ao sistema' },
    { email: 'admin@ditadopopular.com', senha: 'admin123', nivel: 'Admin', descricao: 'Acesso administrativo' },
    { email: 'usuario@ditadopopular.com', senha: 'user123', nivel: 'Usuário', descricao: 'Acesso padrão' },
    { email: 'visitante@ditadopopular.com', senha: 'visit123', nivel: 'Visitante', descricao: 'Acesso limitado' }
  ];

  const preencherCredenciais = (email: string, senha: string) => {
    setFormData({ email, senha });
    setLoginError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo e Título */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <div className="bg-gradient-to-r from-[#7D1F2C] to-[#D4AF37] p-4 rounded-2xl shadow-lg">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
                <span className="text-2xl font-bold bg-gradient-to-r from-[#7D1F2C] to-[#D4AF37] bg-clip-text text-transparent">DP</span>
              </div>
            </div>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent mb-2">
            Ditado Popular
          </h1>
          <p className="text-gray-600">Sistema de Gestão Integrada</p>
        </div>

        {/* Formulário de Login */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-semibold text-white/90 mb-2">Fazer Login</h2>
            <p className="text-gray-600">Acesse sua conta para continuar</p>
          </div>

          {(loginError || error) && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
              <AlertCircle className="w-5 h-5 text-red-600 mr-3 flex-shrink-0" />
              <span className="text-red-700 text-sm">{loginError || error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#7D1F2C] focus:border-[#7D1F2C] transition-all duration-200"
                  placeholder="seu.email@ditadopopular.com"
                  required
                  disabled={isLoading || loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Senha
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.senha}
                  onChange={(e) => handleInputChange('senha', e.target.value)}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#7D1F2C] focus:border-[#7D1F2C] transition-all duration-200"
                  placeholder="••••••••"
                  required
                  disabled={isLoading || loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  disabled={isLoading || loading}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || loading || !formData.email || !formData.senha}
              className="w-full bg-gradient-to-r from-[#7D1F2C] to-[#D4AF37] text-white py-3 px-4 rounded-xl font-medium hover:shadow-lg transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center"
            >
              {isLoading || loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  <LogIn className="w-5 h-5 mr-2" />
                  Entrar
                </>
              )}
            </button>
          </form>

          {/* Usuários de Demonstração */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-medium text-white/80 mb-4 text-center">
              Usuários de Demonstração
            </h3>
            <div className="space-y-2">
              {usuariosDemo.map((usuario, index) => (
                <button
                  key={index}
                  onClick={() => preencherCredenciais(usuario.email, usuario.senha)}
                  disabled={isLoading || loading}
                  className="w-full p-3 text-left bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors duration-200 disabled:opacity-50"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-white text-sm">{usuario.nivel}</div>
                      <div className="text-xs text-gray-600">{usuario.descricao}</div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {usuario.email}
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 text-center mt-3">
              Clique em qualquer usuário para preencher automaticamente as credenciais
            </p>
          </div>

          {/* Informações do Sistema */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="text-center">
              <p className="text-xs text-gray-500">
                Sistema de Gestão Integrada v1.0
              </p>
              <p className="text-xs text-gray-400 mt-1">
                © 2025 Ditado Popular. Todos os direitos reservados.
              </p>
            </div>
          </div>
        </div>

        {/* Recursos do Sistema */}
        <div className="mt-8 bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-white/20">
          <h3 className="text-lg font-semibold text-white/90 mb-4 text-center">
            Recursos do Sistema
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
              <span className="text-white/80">Gestão Financeira</span>
            </div>
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
              <span className="text-white/80">Controle de Estoque</span>
            </div>
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
              <span className="text-white/80">Recursos Humanos</span>
            </div>
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
              <span className="text-white/80">Gestão de Eventos</span>
            </div>
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
              <span className="text-white/80">Relatórios Gerenciais</span>
            </div>
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
              <span className="text-white/80">Sistema de Permissões</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;