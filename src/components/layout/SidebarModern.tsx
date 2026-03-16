import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  Home, DollarSign, Warehouse, Users, Music, CalendarDays,
  Settings, BookOpen, AlertTriangle, ClipboardCheck, Target,
  TrendingUp, ChevronDown, LogOut,
} from 'lucide-react';

interface SubModule { name: string; path: string; }
interface Module {
  name: string; path: string;
  icon: React.ElementType; slug: string;
  subModules?: SubModule[];
}

const MODULES: Module[] = [
  { name: 'Início',         path: '/',                   icon: Home,          slug: 'dashboard' },
  { name: 'Financeiro',     path: '/finance',            icon: DollarSign,    slug: 'financeiro',
    subModules: [
      { name: 'Dashboard Financeiro',     path: '/financeiro' },
      { name: 'Fluxo de Caixa',           path: '/finance?tab=0' },
      { name: 'Resumo do Dia',            path: '/finance?tab=1' },
      { name: 'Extrato Diário',           path: '/finance?tab=2' },
      { name: 'Contas a Pagar',           path: '/finance?tab=3' },
      { name: 'Contas a Receber',         path: '/finance?tab=4' },
      { name: 'Histórico / Estornos',     path: '/finance?tab=5' },
      { name: 'Categorizar',             path: '/finance?tab=6' },
      { name: 'Ficha Fornecedor',         path: '/finance?tab=7' },
      { name: 'Kardex Fornecedor',        path: '/finance?tab=8' },
      { name: 'Kardex Completo',          path: '/finance?tab=9' },
      { name: 'Relatórios',             path: '/finance?tab=10' },
      { name: 'Cadastros',              path: '/finance?tab=11' },
      { name: 'Visão Estratégica',        path: '/visao-estrategica' },
      { name: 'Entradas Previsto x Real', path: '/entradas' },
      { name: 'ZIG Recebimentos',         path: '/zig-recebimentos' },
    ],
  },
  { name: 'Estoque',        path: '/advanced-inventory', icon: Warehouse,     slug: 'estoque',
    subModules: [
      { name: 'Dashboard',       path: '/advanced-inventory?tab=0' },
      { name: 'Estoques',        path: '/advanced-inventory?tab=1' },
      { name: 'Itens',           path: '/advanced-inventory?tab=2' },
      { name: 'Fichas Técnicas', path: '/advanced-inventory?tab=3' },
      { name: 'Compras',         path: '/advanced-inventory?tab=4' },
      { name: 'Produção',        path: '/advanced-inventory?tab=5' },
      { name: 'Relatórios',      path: '/advanced-inventory?tab=6' },
      { name: 'Movimentações',   path: '/advanced-inventory?tab=8' },
      { name: 'Kardex Produto',  path: '/advanced-inventory?tab=10' },
      { name: 'Contagem',        path: '/advanced-inventory?tab=11' },
      { name: 'ZIG → Estoque',   path: '/zig-vendas' },
    ],
  },
  { name: 'RH',             path: '/staff',              icon: Users,         slug: 'rh',
    subModules: [
      { name: 'Recrutamento',  path: '/recruitment' },
      { name: 'Colaboradores', path: '/staff?tab=0' },
      { name: 'Escalas',       path: '/staff?tab=1' },
      { name: 'Férias',        path: '/staff?tab=2' },
      { name: 'Ocorrências',   path: '/staff?tab=3' },
      { name: 'Extras',        path: '/staff?tab=4' },
      { name: 'Funções',       path: '/staff?tab=5' },
      { name: 'Configurações', path: '/staff?tab=6' },
      { name: 'Relatórios',    path: '/staff?tab=7' },
      { name: 'Gorjetas',      path: '/staff?tab=8' },
    ],
  },
  { name: 'Músicos',        path: '/musicians',          icon: Music,         slug: 'musicos' },
  { name: 'Eventos',        path: '/events',             icon: CalendarDays,  slug: 'eventos' },
  { name: 'Solicitações',   path: '/solicitacoes',       icon: ClipboardCheck,slug: 'solicitacoes' },
  { name: 'Ocorrências',    path: '/ocorrencias',        icon: AlertTriangle, slug: 'ocorrencias' },
  { name: 'Marketing',      path: '/marketing',          icon: Target,        slug: 'marketing' },
  { name: 'Estratégico',    path: '/gestao-estrategica', icon: TrendingUp,    slug: 'financeiro' },
  { name: 'Manual',         path: '/manual',             icon: BookOpen,      slug: 'manual' },
  { name: 'Configurações',  path: '/settings',           icon: Settings,      slug: 'configuracoes' },
];

interface Props { onNavigate?: () => void; }

const SidebarModern: React.FC<Props> = ({ onNavigate }) => {
  const location = useLocation();
  const { temAcessoModulo, usuario, logout } = useAuth();
  const [expanded, setExpanded] = useState<string | null>(() => {
    const cur = MODULES.find(m =>
      m.subModules?.some(s =>
        location.pathname + location.search === s.path || location.pathname === s.path
      )
    );
    return cur?.slug ?? null;
  });

  const filtered  = MODULES.filter(m => temAcessoModulo(m.slug));
  const main      = filtered.filter(m => !['manual','configuracoes'].includes(m.slug));
  const utils     = filtered.filter(m =>  ['manual','configuracoes'].includes(m.slug));

  const isActive  = (path: string) =>
    location.pathname + location.search === path || location.pathname === path;
  const isModActive = (m: Module) =>
    isActive(m.path) || !!m.subModules?.some(s => isActive(s.path));

  const initials = usuario?.nome_completo
    ?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() ?? 'U';

  const renderModule = (m: Module) => {
    const active      = isModActive(m);
    const open        = expanded === m.slug;
    const hasChildren = !!m.subModules?.length;

    return (
      <div key={m.slug + m.path}>
        {hasChildren ? (
          <button
            onClick={() => setExpanded(p => p === m.slug ? null : m.slug)}
            title={m.name}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all duration-150 group
              ${active ? 'bg-[#7D1F2C]/20 text-white' : 'text-white/40 hover:text-white/75 hover:bg-white/6'}`}
          >
            <m.icon className={`flex-shrink-0 ${active ? 'text-[#f5c0c8]' : 'text-white/30 group-hover:text-white/55'}`} style={{ width: 15, height: 15 }} />
            <span className="flex-1 text-left text-[13px] leading-none">{m.name}</span>
            <ChevronDown className={`transition-transform duration-200 ${open ? 'rotate-180' : ''} text-white/20`} style={{ width: 13, height: 13 }} />
          </button>
        ) : (
          <Link
            to={m.path}
            onClick={onNavigate}
            title={m.name}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all duration-150 group
              ${active ? 'bg-[#7D1F2C]/25 text-white ring-1 ring-[#7D1F2C]/40' : 'text-white/40 hover:text-white/75 hover:bg-white/6'}`}
          >
            <m.icon className={`flex-shrink-0 ${active ? 'text-[#f5c0c8]' : 'text-white/30 group-hover:text-white/55'}`} style={{ width: 15, height: 15 }} />
            <span className="text-[13px] leading-none">{m.name}</span>
            {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#D4AF37] flex-shrink-0" />}
          </Link>
        )}

        {hasChildren && open && (
          <div className="mt-0.5 mb-1 ml-4 pl-3 border-l border-white/[0.07] space-y-0.5">
            {m.subModules!.map(sub => (
              <Link
                key={sub.path}
                to={sub.path}
                onClick={onNavigate}
                className={`flex items-center justify-between px-2 py-2 rounded-lg text-[12px] transition-all duration-100
                  ${isActive(sub.path) ? 'text-[#D4AF37] bg-[#D4AF37]/8' : 'text-white/30 hover:text-white/65 hover:bg-white/5'}`}
              >
                {sub.name}
                {isActive(sub.path) && <span className="w-1 h-1 rounded-full bg-[#D4AF37] flex-shrink-0" />}
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5
        [&::-webkit-scrollbar]:w-0.5 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-track]:bg-transparent">
        {main.map(renderModule)}
        <div className="my-2 mx-2 border-t border-white/[0.06]" />
        {utils.map(renderModule)}
      </div>

      <div className="px-2 py-3 border-t border-white/[0.05]">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#7D1F2C,#D4AF37)' }}>
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white/65 text-[11px] font-medium truncate leading-tight">
              {usuario?.nome_completo?.split(' ')[0] ?? 'Usuário'}
            </p>
            <p className="text-white/25 text-[10px] capitalize truncate leading-tight">
              {usuario?.cargo ?? usuario?.nivel ?? '—'}
            </p>
          </div>
          <button onClick={logout} title="Sair" className="text-white/20 hover:text-red-400/70 transition-colors flex-shrink-0">
            <LogOut style={{ width: 13, height: 13 }} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SidebarModern;
