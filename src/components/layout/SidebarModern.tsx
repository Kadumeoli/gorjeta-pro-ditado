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
  group?: 'operacao' | 'gestao' | 'sistema';
}

const MODULES: Module[] = [
  { name: 'Dashboard',      path: '/',                   icon: Home,          slug: 'dashboard',       group: 'operacao' },
  { name: 'RH',             path: '/staff',              icon: Users,         slug: 'rh',              group: 'operacao',
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
  { name: 'Músicos',        path: '/musicians',          icon: Music,         slug: 'musicos',         group: 'operacao' },
  { name: 'Eventos',        path: '/events',             icon: CalendarDays,  slug: 'eventos',         group: 'operacao' },
  { name: 'Financeiro',     path: '/finance',            icon: DollarSign,    slug: 'financeiro',      group: 'gestao',
    subModules: [
      { name: 'Dashboard Financeiro',     path: '/financeiro' },
      { name: 'Fluxo de Caixa',           path: '/finance?tab=0' },
      { name: 'Resumo do Dia',            path: '/finance?tab=1' },
      { name: 'Extrato Diário',           path: '/finance?tab=2' },
      { name: 'Contas a Pagar',           path: '/finance?tab=3' },
      { name: 'Contas a Receber',         path: '/finance?tab=4' },
      { name: 'Histórico / Estornos',     path: '/finance?tab=5' },
      { name: 'Categorizar',              path: '/finance?tab=6' },
      { name: 'Ficha Fornecedor',         path: '/finance?tab=7' },
      { name: 'Kardex Fornecedor',        path: '/finance?tab=8' },
      { name: 'Kardex Completo',          path: '/finance?tab=9' },
      { name: 'Relatórios',               path: '/finance?tab=10' },
      { name: 'Cadastros',                path: '/finance?tab=11' },
      { name: 'Visão Estratégica',        path: '/visao-estrategica' },
      { name: 'Entradas Previsto x Real', path: '/entradas' },
      { name: 'ZIG Recebimentos',         path: '/zig-recebimentos' },
      { name: 'DRE Simplificado',         path: '/dre-simplificado' },
    ],
  },
  { name: 'Estoque',        path: '/advanced-inventory', icon: Warehouse,     slug: 'estoque',         group: 'gestao',
    subModules: [
      { name: 'Dashboard',        path: '/advanced-inventory?tab=0' },
      { name: 'Inventário',       path: '/advanced-inventory?tab=1' },
      { name: 'Estoques',         path: '/advanced-inventory?tab=2' },
      { name: 'Itens',            path: '/advanced-inventory?tab=3' },
      { name: 'Fichas Técnicas',  path: '/advanced-inventory?tab=4' },
      { name: 'Compras',          path: '/advanced-inventory?tab=5' },
      { name: 'Produção',         path: '/advanced-inventory?tab=6' },
      { name: 'Requisições',      path: '/advanced-inventory?tab=7' },
      { name: 'Relatórios',       path: '/advanced-inventory?tab=8' },
      { name: 'Movimentações',    path: '/advanced-inventory?tab=9' },
      { name: 'Kardex Produto',   path: '/advanced-inventory?tab=10' },
      { name: 'Contagem',         path: '/advanced-inventory?tab=11' },
      { name: 'Vendas',           path: '/advanced-inventory?tab=12' },
      { name: 'ZIG → Estoque',    path: '/zig-vendas' },
      { name: 'Lista de Compras', path: '/lista-compras' },
    ],
  },
  { name: 'Estratégico',    path: '/gestao-estrategica', icon: TrendingUp,    slug: 'financeiro',      group: 'gestao' },
  { name: 'Marketing',      path: '/marketing',          icon: Target,        slug: 'marketing',       group: 'gestao' },
  { name: 'Solicitações',   path: '/solicitacoes',       icon: ClipboardCheck,slug: 'solicitacoes',    group: 'sistema' },
  { name: 'Ocorrências',    path: '/ocorrencias',        icon: AlertTriangle, slug: 'ocorrencias',     group: 'sistema' },
  { name: 'Manual',         path: '/manual',             icon: BookOpen,      slug: 'manual',          group: 'sistema' },
  { name: 'Configurações',  path: '/settings',           icon: Settings,      slug: 'configuracoes',   group: 'sistema' },
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

  const filtered = MODULES.filter(m => temAcessoModulo(m.slug));
  const operacao = filtered.filter(m => m.group === 'operacao');
  const gestao   = filtered.filter(m => m.group === 'gestao');
  const sistema  = filtered.filter(m => m.group === 'sistema');

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
            className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group
              ${active
                ? 'bg-wine/30 text-white border-l-2 border-wine'
                : 'text-white/40 hover:text-white/70 hover:bg-white/5'
              }`}
          >
            <m.icon className={`flex-shrink-0 ${active ? 'text-white' : 'text-white/40 group-hover:text-white/60'}`} size={16} />
            <span className="flex-1 text-left text-sm font-sans font-medium">{m.name}</span>
            {active && <span className="w-1.5 h-1.5 rounded-full bg-gold flex-shrink-0" />}
            <ChevronDown className={`transition-transform duration-200 ${open ? 'rotate-180' : ''} text-white/30`} size={14} />
          </button>
        ) : (
          <Link
            to={m.path}
            onClick={onNavigate}
            title={m.name}
            className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group
              ${active
                ? 'bg-wine/30 text-white border-l-2 border-wine'
                : 'text-white/40 hover:text-white/70 hover:bg-white/5'
              }`}
          >
            <m.icon className={`flex-shrink-0 ${active ? 'text-white' : 'text-white/40 group-hover:text-white/60'}`} size={16} />
            <span className="text-sm font-sans font-medium">{m.name}</span>
            {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-gold flex-shrink-0" />}
          </Link>
        )}

        {hasChildren && open && (
          <div className="mt-1 ml-3 pl-4 border-l border-white/10 space-y-0.5">
            {m.subModules!.map(sub => (
              <Link
                key={sub.path}
                to={sub.path}
                onClick={onNavigate}
                className={`flex items-center justify-between px-3 py-2 rounded-md text-xs font-sans transition-all duration-150
                  ${isActive(sub.path)
                    ? 'text-gold bg-gold/8 font-medium'
                    : 'text-white/35 hover:text-white/60 hover:bg-white/5'
                  }`}
              >
                {sub.name}
                {isActive(sub.path) && <span className="w-1 h-1 rounded-full bg-gold flex-shrink-0" />}
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  };

  const GroupLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="flex items-center gap-2 px-3 py-2 mb-1">
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />
      <span className="text-[10px] font-sans font-semibold uppercase tracking-widest text-gold/60">{children}</span>
      <div className="flex-1 h-px bg-gradient-to-r from-gold/20 via-transparent to-transparent" />
    </div>
  );

  return (
    <div className="flex flex-col h-full relative grain-texture" style={{ background: 'var(--bg-dark)' }}>
      <div className="px-4 py-6 border-b border-white/5">
        <h1 className="font-display text-2xl font-bold text-white leading-none mb-1">Gorjeta Pro</h1>
        <p className="text-xs font-sans text-white/40">Ditado Popular</p>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {operacao.length > 0 && (
          <>
            <GroupLabel>Operação</GroupLabel>
            {operacao.map(renderModule)}
          </>
        )}

        {gestao.length > 0 && (
          <>
            <div className="h-3" />
            <GroupLabel>Gestão</GroupLabel>
            {gestao.map(renderModule)}
          </>
        )}

        {sistema.length > 0 && (
          <>
            <div className="h-3" />
            <GroupLabel>Sistema</GroupLabel>
            {sistema.map(renderModule)}
          </>
        )}
      </div>

      <div className="px-3 py-4 border-t border-white/5">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, var(--wine), var(--gold))' }}>
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white text-xs font-sans font-semibold truncate">
              {usuario?.nome_completo?.split(' ')[0] ?? 'Usuário'}
            </p>
            <p className="text-white/40 text-[10px] font-sans capitalize truncate">
              {usuario?.cargo ?? usuario?.nivel ?? '—'}
            </p>
          </div>
          <button onClick={logout} title="Sair" className="text-white/25 hover:text-danger/80 transition-colors flex-shrink-0">
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SidebarModern;
