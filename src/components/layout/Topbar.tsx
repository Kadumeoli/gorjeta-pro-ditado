import React, { useState, useRef, useEffect } from 'react';
import { Bell, Menu, Search, User, LogOut, Settings, ChevronDown, X, Command } from 'lucide-react';
import { Usuario } from '../../contexts/AuthContext';

interface TopbarProps {
  toggleSidebar: () => void;
  user: Usuario | null;
  onLogout: () => void;
}

const Topbar: React.FC<TopbarProps> = ({ toggleSidebar, user, onLogout }) => {
  const [showUserMenu, setShowUserMenu]   = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const menuRef  = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Atalho ⌘K para focar na busca
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const initials = user
    ? user.nome_completo.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : 'U';

  return (
    <header className="
      relative z-30 h-14 flex items-center px-4 gap-3
      bg-[#0f0a0b]/95 backdrop-blur-xl
      border-b border-white/6
    ">
      {/* Hamburger mobile */}
      <button
        onClick={toggleSidebar}
        className="lg:hidden p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/8 transition-all"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Divisor vertical */}
      <div className="hidden lg:block w-px h-5 bg-white/10" />

      {/* Breadcrumb / título dinâmico */}
      <div className="hidden lg:flex items-center gap-1.5 text-xs">
        <span className="text-white/30 font-medium tracking-widest uppercase text-[10px]">
          Ditado Popular
        </span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Barra de busca */}
      <div className={`
        relative flex items-center gap-2 transition-all duration-300
        ${searchFocused ? 'w-80' : 'w-56'}
      `}>
        <div className={`
          flex items-center w-full gap-2 px-3 py-2 rounded-xl text-sm
          transition-all duration-200
          ${searchFocused
            ? 'bg-white/10 border border-white/20 shadow-lg shadow-black/20'
            : 'bg-white/5 border border-transparent hover:bg-white/8'
          }
        `}>
          <Search className="w-3.5 h-3.5 text-white/30 flex-shrink-0" />
          <input
            ref={searchRef}
            type="text"
            placeholder="Buscar..."
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className="
              flex-1 bg-transparent text-white/80 placeholder-white/25
              text-xs focus:outline-none min-w-0
            "
          />
          {!searchFocused && (
            <kbd className="
              hidden sm:flex items-center gap-0.5 px-1.5 py-0.5
              text-[10px] text-white/20 bg-white/5 border border-white/10
              rounded-md font-mono flex-shrink-0
            ">
              <Command className="w-2.5 h-2.5" />K
            </kbd>
          )}
        </div>
      </div>

      {/* Notificações */}
      <button className="
        relative p-2 rounded-xl text-white/40 hover:text-white/80
        hover:bg-white/8 transition-all duration-200
      ">
        <Bell className="w-4.5 h-4.5 w-[18px] h-[18px]" />
        <span className="
          absolute top-1.5 right-1.5 w-2 h-2
          bg-[#D4AF37] rounded-full
          ring-2 ring-[#0f0a0b]
        " />
      </button>

      {/* Divisor */}
      <div className="w-px h-5 bg-white/8" />

      {/* Perfil */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setShowUserMenu(!showUserMenu)}
          className="
            flex items-center gap-2.5 pl-1 pr-2.5 py-1.5 rounded-xl
            hover:bg-white/8 transition-all duration-200 group
          "
        >
          {/* Avatar */}
          <div className="
            relative w-7 h-7 rounded-lg
            bg-gradient-to-br from-[#7D1F2C] to-[#D4AF37]
            flex items-center justify-center
            text-white text-xs font-bold tracking-wide
            shadow-lg shadow-[#7D1F2C]/30
            ring-1 ring-white/10
          ">
            {initials}
            <span className="
              absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5
              bg-emerald-400 border-2 border-[#0f0a0b] rounded-full
            " />
          </div>

          {/* Nome */}
          <div className="hidden md:block text-left">
            <p className="text-xs font-semibold text-white/80 leading-none">
              {user?.nome_completo?.split(' ')[0] || 'Usuário'}
            </p>
            <p className="text-[10px] text-white/30 mt-0.5 capitalize">
              {user?.cargo || user?.nivel || 'carregando'}
            </p>
          </div>

          <ChevronDown className={`
            w-3 h-3 text-white/30 transition-transform duration-200
            ${showUserMenu ? 'rotate-180' : ''}
          `} />
        </button>

        {/* Dropdown */}
        {showUserMenu && (
          <div className="
            absolute right-0 mt-2 w-60
            bg-[#1a1114] border border-white/10
            rounded-2xl shadow-2xl shadow-black/60
            overflow-hidden z-50
            animate-in fade-in slide-in-from-top-2 duration-150
          ">
            {/* Cabeçalho do perfil */}
            <div className="
              px-4 py-3.5
              bg-gradient-to-b from-white/5 to-transparent
              border-b border-white/8
            ">
              <div className="flex items-center gap-3">
                <div className="
                  w-10 h-10 rounded-xl flex-shrink-0
                  bg-gradient-to-br from-[#7D1F2C] to-[#D4AF37]
                  flex items-center justify-center
                  text-white text-sm font-bold
                  shadow-lg shadow-[#7D1F2C]/30
                ">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white/90 truncate">
                    {user?.nome_completo || 'Usuário'}
                  </p>
                  <p className="text-xs text-white/40 truncate mt-0.5">
                    {user?.email || '—'}
                  </p>
                  <span className="
                    inline-block mt-1 px-2 py-0.5 rounded-full
                    text-[10px] font-medium capitalize
                    bg-[#7D1F2C]/30 text-[#f5a0ac]
                    border border-[#7D1F2C]/40
                  ">
                    {user?.cargo || user?.nivel || 'usuário'}
                  </span>
                </div>
              </div>
            </div>

            {/* Ações */}
            <div className="py-1.5 px-1.5">
              <button className="
                flex items-center w-full gap-3 px-3 py-2.5 rounded-xl
                text-sm text-white/60 hover:text-white/90
                hover:bg-white/8 transition-all duration-150
              ">
                <Settings className="w-4 h-4 flex-shrink-0" />
                <span>Configurações</span>
              </button>

              <div className="my-1 border-t border-white/8" />

              <button
                onClick={onLogout}
                className="
                  flex items-center w-full gap-3 px-3 py-2.5 rounded-xl
                  text-sm text-red-400/80 hover:text-red-400
                  hover:bg-red-500/10 transition-all duration-150
                "
              >
                <LogOut className="w-4 h-4 flex-shrink-0" />
                <span>Sair do sistema</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Topbar;
