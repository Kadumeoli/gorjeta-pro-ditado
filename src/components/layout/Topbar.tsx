import React, { useState } from 'react';
import { Bell, Menu, Search, User, LogOut, Settings, ChevronDown } from 'lucide-react';
import { Usuario } from '../../contexts/AuthContext';

interface TopbarProps {
  toggleSidebar: () => void;
  user: Usuario | null;
  onLogout: () => void;
}

const Topbar: React.FC<TopbarProps> = ({ toggleSidebar, user, onLogout }) => {
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="relative z-10 bg-white/80 backdrop-blur-xl border-b border-white/20 shadow-sm">
      <div className="container flex items-center justify-between h-16 px-6 mx-auto">
        {/* Mobile hamburger */}
        <button
          className="p-2 -ml-1 rounded-xl lg:hidden focus:outline-none focus:ring-2 focus:ring-[#7D1F2C]/20 hover:bg-gray-100/80 transition-all duration-200"
          onClick={toggleSidebar}
          aria-label="Menu"
        >
          <Menu className="w-6 h-6 text-gray-700" />
        </button>

        {/* Search */}
        <div className="flex justify-center flex-1 lg:mr-32">
          <div className="relative w-full max-w-lg">
            <div className="absolute inset-y-0 left-0 flex items-center pl-4">
              <Search className="w-5 h-5 text-gray-400" />
            </div>
            <input
              className="w-full pl-12 pr-4 py-3 text-sm text-gray-700 placeholder-gray-400 bg-white/60 backdrop-blur-sm border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7D1F2C]/20 focus:border-[#7D1F2C]/30 transition-all duration-200"
              type="text"
              placeholder="Buscar em todo o sistema..."
              aria-label="Search"
            />
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <div className="relative">
            <button
              className="relative p-2 rounded-xl text-gray-600 hover:text-gray-800 hover:bg-white/60 focus:outline-none focus:ring-2 focus:ring-[#7D1F2C]/20 transition-all duration-200"
              aria-label="Notifications"
            >
              <Bell className="w-6 h-6" />
              <span className="absolute top-1 right-1 inline-flex items-center justify-center w-3 h-3 text-xs font-bold text-white bg-gradient-to-r from-red-500 to-pink-500 rounded-full">
                3
              </span>
            </button>
          </div>

          {/* Profile */}
          <div className="relative">
            <button
              className="flex items-center space-x-3 p-2 rounded-xl hover:bg-white/60 focus:outline-none focus:ring-2 focus:ring-[#7D1F2C]/20 transition-all duration-200"
              aria-label="Account"
              onClick={() => setShowUserMenu(!showUserMenu)}
            >
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-[#7D1F2C] to-[#D4AF37] flex items-center justify-center shadow-lg">
                  {user ? (
                    <span className="text-white font-medium text-sm">
                      {user.nome_completo.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                    </span>
                  ) : (
                    <User className="w-5 h-5 text-white" />
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 border-2 border-white rounded-full"></div>
              </div>
              {user ? (
                <div className="hidden md:block text-left">
                  <div className="text-sm font-semibold text-gray-800">{user.nome_completo}</div>
                  <div className="text-xs text-gray-500 capitalize">{user.cargo || user.nivel}</div>
                </div>
              ) : (
                <div className="hidden md:block text-left">
                  <div className="text-sm font-semibold text-gray-800">Usuário</div>
                  <div className="text-xs text-gray-500">Carregando...</div>
                </div>
              )}
              <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`} />
            </button>

            {/* User dropdown menu */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 py-2 z-50 transform transition-all duration-200 origin-top-right">
                <div className="px-4 py-3 border-b border-gray-100/50">
                  {user ? (
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-[#7D1F2C] to-[#D4AF37] flex items-center justify-center">
                        <span className="text-white font-medium">
                          {user.nome_completo.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="font-semibold text-gray-800">{user.nome_completo}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                        <div className="text-xs text-gray-400 capitalize bg-gray-100 px-2 py-1 rounded-full mt-1 inline-block">
                          {user.cargo || user.nivel}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-[#7D1F2C] to-[#D4AF37] flex items-center justify-center">
                        <User className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-800">Carregando...</div>
                        <div className="text-sm text-gray-500">---</div>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="py-2">
                  <button className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50/80 transition-colors duration-150">
                    <Settings className="w-4 h-4 mr-3 text-gray-500" />
                    Configurações
                  </button>
                  <button
                    onClick={onLogout}
                    className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50/80 transition-colors duration-150"
                  >
                    <LogOut className="w-4 h-4 mr-3" />
                    Sair do Sistema
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Topbar;