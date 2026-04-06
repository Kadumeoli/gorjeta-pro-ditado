import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, Bell, Settings, LogOut, ChevronDown, Command, ChevronRight } from 'lucide-react';
import { Usuario } from '../../contexts/AuthContext';

interface TopbarProps {
  toggleSidebar: () => void;
  user: Usuario | null;
  onLogout: () => void;
}

const Topbar: React.FC<TopbarProps> = ({ toggleSidebar, user, onLogout }) => {
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const menuRef   = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowUserMenu(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); searchRef.current?.focus(); }
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, []);

  const initials = user?.nome_completo?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'U';

  const getBreadcrumb = () => {
    const path = location.pathname;
    const search = location.search;

    const routes: { [key: string]: { module: string; sub?: string } } = {
      '/': { module: 'Dashboard' },
      '/finance': { module: 'Financeiro' },
      '/financeiro': { module: 'Financeiro', sub: 'Dashboard' },
      '/advanced-inventory': { module: 'Estoque' },
      '/staff': { module: 'RH' },
      '/recruitment': { module: 'RH', sub: 'Recrutamento' },
      '/musicians': { module: 'Músicos' },
      '/events': { module: 'Eventos' },
      '/solicitacoes': { module: 'Solicitações' },
      '/ocorrencias': { module: 'Ocorrências' },
      '/marketing': { module: 'Marketing' },
      '/gestao-estrategica': { module: 'Estratégico' },
      '/visao-estrategica': { module: 'Financeiro', sub: 'Visão Estratégica' },
      '/entradas': { module: 'Financeiro', sub: 'Entradas' },
      '/zig-recebimentos': { module: 'Financeiro', sub: 'ZIG Recebimentos' },
      '/zig-vendas': { module: 'Estoque', sub: 'ZIG Vendas' },
      '/lista-compras': { module: 'Estoque', sub: 'Lista de Compras' },
      '/manual': { module: 'Manual' },
      '/settings': { module: 'Configurações' },
    };

    if (search.includes('tab=')) {
      const tabMatch = search.match(/tab=(\d+)/);
      if (tabMatch && path === '/finance') {
        const tabs = ['Fluxo de Caixa', 'Resumo do Dia', 'Extrato', 'Contas a Pagar', 'Contas a Receber', 'Histórico', 'Categorizar', 'Ficha Fornecedor', 'Kardex Fornecedor', 'Kardex Completo', 'Relatórios', 'Cadastros'];
        return { module: 'Financeiro', sub: tabs[parseInt(tabMatch[1])] };
      }
      if (tabMatch && path === '/advanced-inventory') {
        const tabs = ['Dashboard', 'Inventário', 'Estoques', 'Itens', 'Fichas Técnicas', 'Compras', 'Produção', 'Requisições', 'Relatórios', 'Movimentações', 'Kardex', 'Contagem', 'Vendas'];
        return { module: 'Estoque', sub: tabs[parseInt(tabMatch[1])] };
      }
      if (tabMatch && path === '/staff') {
        const tabs = ['Colaboradores', 'Escalas', 'Férias', 'Ocorrências', 'Extras', 'Funções', 'Configurações', 'Relatórios', 'Gorjetas'];
        return { module: 'RH', sub: tabs[parseInt(tabMatch[1])] };
      }
    }

    return routes[path] || { module: 'Gorjeta Pro' };
  };

  const breadcrumb = getBreadcrumb();

  return (
    <header className="h-[52px] flex items-center px-6 gap-4" style={{ background: 'var(--bg-dark)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>

      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <span className="font-sans font-semibold text-sm text-white">{breadcrumb.module}</span>
        {breadcrumb.sub && (
          <>
            <ChevronRight size={14} className="text-white/20" />
            <span className="font-sans text-sm text-gold">{breadcrumb.sub}</span>
          </>
        )}
      </div>

      {/* Busca central */}
      <div className="flex-1 max-w-xl mx-auto">
        <div className={`flex items-center gap-2.5 px-4 py-2 rounded-lg border transition-all duration-200 ${
          searchFocused
            ? 'bg-white/10 border-white/20'
            : 'bg-white/5 border-white/10 hover:bg-white/8'
        }`}>
          <Search className="text-white/30 flex-shrink-0" size={16} />
          <input
            ref={searchRef}
            type="text"
            placeholder="Buscar no sistema..."
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className="flex-1 bg-transparent text-white placeholder-white/30 text-sm font-sans focus:outline-none min-w-0"
          />
          {!searchFocused && (
            <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded px-1.5 py-0.5 flex-shrink-0">
              <Command className="text-white/30" size={10} />
              <span className="text-white/30 text-[10px] font-mono font-medium">K</span>
            </div>
          )}
        </div>
      </div>

      {/* Notificações */}
      <button className="relative w-9 h-9 rounded-lg flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/5 transition-all">
        <Bell size={18} />
        <span className="absolute top-1.5 right-1.5 w-5 h-4 bg-gold rounded-full text-[9px] font-sans font-bold text-dark flex items-center justify-center ring-2 ring-dark">
          3
        </span>
      </button>

      {/* Divisor */}
      <div className="w-px h-5 bg-white/10" />

      {/* Perfil */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setShowUserMenu(!showUserMenu)}
          className="flex items-center gap-2.5 pl-1.5 pr-3 py-1.5 rounded-lg hover:bg-white/5 transition-all"
        >
          <div
            className="relative w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, var(--wine), var(--gold))' }}
          >
            {initials}
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-dark" />
          </div>
          <div className="hidden md:block text-left">
            <p className="text-white text-xs font-sans font-semibold leading-tight">
              {user?.nome_completo?.split(' ')[0] || 'Usuário'}
            </p>
            <p className="text-white/40 text-[10px] font-sans capitalize leading-tight">
              {user?.cargo || user?.nivel || '—'}
            </p>
          </div>
          <ChevronDown className={`text-white/30 transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`} size={14} />
        </button>

        {showUserMenu && (
          <div className="absolute right-0 mt-2 w-64 rounded-xl border border-white/10 shadow-2xl shadow-black/60 overflow-hidden z-50" style={{ background: 'var(--bg-card)' }}>
            {/* Perfil */}
            <div className="px-4 py-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, var(--wine), var(--gold))' }}
                >
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-white text-sm font-sans font-semibold truncate">{user?.nome_completo || 'Usuário'}</p>
                  <p className="text-white/40 text-xs font-sans truncate mt-0.5">{user?.email || '—'}</p>
                  <span className="inline-block mt-1.5 badge badge-info">
                    {user?.cargo || user?.nivel || 'usuário'}
                  </span>
                </div>
              </div>
            </div>

            {/* Ações */}
            <div className="py-2 px-2">
              <button className="flex items-center w-full gap-3 px-3 py-2.5 rounded-lg text-sm font-sans text-white/50 hover:text-white/80 hover:bg-white/5 transition-all">
                <Settings size={16} />
                Configurações
              </button>
              <div className="my-1.5 h-px bg-white/10" />
              <button
                onClick={onLogout}
                className="flex items-center w-full gap-3 px-3 py-2.5 rounded-lg text-sm font-sans text-danger/70 hover:text-danger hover:bg-danger/10 transition-all"
              >
                <LogOut size={16} />
                Sair do sistema
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Topbar;
