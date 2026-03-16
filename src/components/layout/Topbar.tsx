import React, { useState, useRef, useEffect } from 'react';
import { Search, Bell, Settings, LogOut, ChevronDown, Command } from 'lucide-react';
import { Usuario } from '../../contexts/AuthContext';

interface TopbarProps {
  toggleSidebar: () => void;
  user: Usuario | null;
  onLogout: () => void;
}

const Topbar: React.FC<TopbarProps> = ({ toggleSidebar, user, onLogout }) => {
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

  return (
    <header className="h-12 flex items-center px-4 gap-3 bg-[#0a0608] border-b border-white/[0.05] flex-shrink-0 z-20">

      {/* Busca */}
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all duration-200 ${
        searchFocused
          ? 'bg-white/8 border-white/15 w-72'
          : 'bg-white/[0.04] border-white/[0.06] hover:bg-white/6 w-52'
      }`}>
        <Search className="text-white/25 flex-shrink-0" style={{width:'13px',height:'13px'}} />
        <input
          ref={searchRef}
          type="text"
          placeholder="Buscar..."
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          className="flex-1 bg-transparent text-white/70 placeholder-white/20 text-xs focus:outline-none min-w-0"
        />
        {!searchFocused && (
          <div className="flex items-center gap-0.5 bg-white/5 border border-white/8 rounded px-1 py-0.5 flex-shrink-0">
            <Command className="text-white/20" style={{width:'9px',height:'9px'}} />
            <span className="text-white/20 text-[9px] font-mono">K</span>
          </div>
        )}
      </div>

      <div className="flex-1" />

      {/* Notificações */}
      <button className="relative w-8 h-8 rounded-xl flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/6 transition-all">
        <Bell style={{width:'15px',height:'15px'}} />
        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#D4AF37] rounded-full ring-[1.5px] ring-[#0a0608]" />
      </button>

      {/* Divisor */}
      <div className="w-px h-4 bg-white/[0.06]" />

      {/* Perfil */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setShowUserMenu(!showUserMenu)}
          className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl hover:bg-white/6 transition-all"
        >
          <div
            className="relative w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#7D1F2C,#D4AF37)' }}
          >
            {initials}
            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full ring-[1.5px] ring-[#0a0608]" />
          </div>
          <div className="hidden md:block text-left">
            <p className="text-white/70 text-[11px] font-medium leading-none">
              {user?.nome_completo?.split(' ')[0] || 'Usuário'}
            </p>
            <p className="text-white/25 text-[10px] capitalize mt-0.5 leading-none">
              {user?.cargo || user?.nivel || '—'}
            </p>
          </div>
          <ChevronDown className={`text-white/25 transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`} style={{width:'11px',height:'11px'}} />
        </button>

        {showUserMenu && (
          <div className="absolute right-0 mt-2 w-56 rounded-xl border border-white/[0.08] bg-[#130b0d] shadow-2xl shadow-black/60 overflow-hidden z-50">
            {/* Perfil */}
            <div className="px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg,#7D1F2C,#D4AF37)' }}
                >
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="text-white/80 text-xs font-semibold truncate">{user?.nome_completo || 'Usuário'}</p>
                  <p className="text-white/30 text-[10px] truncate mt-0.5">{user?.email || '—'}</p>
                  <span className="inline-block mt-1 text-[9px] font-medium px-2 py-0.5 rounded-full bg-[#7D1F2C]/30 text-[#f5a0ac] border border-[#7D1F2C]/40 capitalize">
                    {user?.cargo || user?.nivel || 'usuário'}
                  </span>
                </div>
              </div>
            </div>

            {/* Ações */}
            <div className="py-1.5 px-1.5">
              <button className="flex items-center w-full gap-2.5 px-3 py-2.5 rounded-lg text-xs text-white/50 hover:text-white/80 hover:bg-white/6 transition-all">
                <Settings style={{width:'13px',height:'13px'}} />
                Configurações
              </button>
              <div className="my-1 border-t border-white/[0.06]" />
              <button
                onClick={onLogout}
                className="flex items-center w-full gap-2.5 px-3 py-2.5 rounded-lg text-xs text-red-400/60 hover:text-red-400 hover:bg-red-500/8 transition-all"
              >
                <LogOut style={{width:'13px',height:'13px'}} />
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
