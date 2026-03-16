import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  Home, DollarSign, Warehouse, Users, Music, CalendarDays,
  Settings, BookOpen, AlertTriangle, ClipboardCheck, Target,
  TrendingUp, CreditCard, Receipt, ArrowLeftRight, Tag,
  Building2, Activity, FileText, PieChart, BarChart3,
  ShoppingCart, Factory, ClipboardList, Calendar, UserCog,
  UserPlus, RefreshCw, LineChart, ChevronRight, LogOut,
} from 'lucide-react';

interface SubModule { name: string; path: string; icon: React.ElementType; }
interface Module {
  name: string; path: string; icon: React.ElementType;
  slug: string; subModules?: SubModule[];
}
interface Props { onNavigate?: () => void; }

const MODULES: Module[] = [
  { name: 'Início',              path: '/',                    icon: Home,          slug: 'dashboard' },
  {
    name: 'Financeiro',          path: '/finance',             icon: DollarSign,    slug: 'financeiro',
    subModules: [
      { name: 'Dashboard',                  path: '/financeiro',        icon: LineChart      },
      { name: 'Fluxo de Caixa',             path: '/finance?tab=0',     icon: TrendingUp     },
      { name: 'Resumo do Dia',              path: '/finance?tab=1',     icon: Calendar       },
      { name: 'Extrato Diário',             path: '/finance?tab=2',     icon: FileText       },
      { name: 'Contas a Pagar',             path: '/finance?tab=3',     icon: CreditCard     },
      { name: 'Contas a Receber',           path: '/finance?tab=4',     icon: Receipt        },
      { name: 'Histórico / Estornos',       path: '/finance?tab=5',     icon: ArrowLeftRight },
      { name: 'Categorizar',                path: '/finance?tab=6',     icon: Tag            },
      { name: 'Ficha Fornecedor',           path: '/finance?tab=7',     icon: Building2      },
      { name: 'Kardex Fornecedor',          path: '/finance?tab=8',     icon: Activity       },
      { name: 'Kardex Completo',            path: '/finance?tab=9',     icon: FileText       },
      { name: 'Relatórios',                 path: '/finance?tab=10',    icon: PieChart       },
      { name: 'Cadastros',                  path: '/finance?tab=11',    icon: Settings       },
      { name: 'Visão Estratégica',          path: '/visao-estrategica', icon: Target         },
      { name: 'Entradas Previsto x Real',   path: '/entradas',          icon: TrendingUp     },
      { name: 'ZIG Recebimentos',           path: '/zig-recebimentos',  icon: RefreshCw      },
    ],
  },
  {
    name: 'Estoque',             path: '/advanced-inventory',  icon: Warehouse,     slug: 'estoque',
    subModules: [
      { name: 'Dashboard',       path: '/advanced-inventory?tab=0',  icon: BarChart3     },
      { name: 'Estoques',        path: '/advanced-inventory?tab=1',  icon: Warehouse     },
      { name: 'Itens',           path: '/advanced-inventory?tab=2',  icon: ClipboardList },
      { name: 'Fichas Técnicas', path: '/advanced-inventory?tab=3',  icon: ClipboardList },
      { name: 'Compras',         path: '/advanced-inventory?tab=4',  icon: ShoppingCart  },
      { name: 'Produção',        path: '/advanced-inventory?tab=5',  icon: Factory       },
      { name: 'Relatórios',      path: '/advanced-inventory?tab=6',  icon: FileText      },
      { name: 'Movimentações',   path: '/advanced-inventory?tab=8',  icon: Activity      },
      { name: 'Kardex Produto',  path: '/advanced-inventory?tab=10', icon: Activity      },
      { name: 'Contagem',        path: '/advanced-inventory?tab=11', icon: ClipboardCheck},
      { name: 'ZIG → Estoque',   path: '/zig-vendas',                icon: RefreshCw     },
    ],
  },
  {
    name: 'RH',                  path: '/staff',               icon: Users,         slug: 'rh',
    subModules: [
      { name: 'Recrutamento',    path: '/recruitment',   icon: UserPlus      },
      { name: 'Colaboradores',   path: '/staff?tab=0',   icon: Users         },
      { name: 'Escalas',         path: '/staff?tab=1',   icon: Calendar      },
      { name: 'Férias',          path: '/staff?tab=2',   icon: CalendarDays  },
      { name: 'Ocorrências',     path: '/staff?tab=3',   icon: AlertTriangle },
      { name: 'Extras',          path: '/staff?tab=4',   icon: Users         },
      { name: 'Funções',         path: '/staff?tab=5',   icon: UserCog       },
      { name: 'Configurações',   path: '/staff?tab=6',   icon: Settings      },
      { name: 'Relatórios',      path: '/staff?tab=7',   icon: FileText      },
      { name: 'Gorjetas',        path: '/staff?tab=8',   icon: DollarSign    },
    ],
  },
  { name: 'Músicos',           path: '/musicians',        icon: Music,          slug: 'musicos'       },
  { name: 'Eventos',           path: '/events',           icon: CalendarDays,   slug: 'eventos'       },
  { name: 'Solicitações',      path: '/solicitacoes',     icon: ClipboardCheck, slug: 'solicitacoes'  },
  { name: 'Ocorrências',       path: '/ocorrencias',      icon: AlertTriangle,  slug: 'ocorrencias'   },
  { name: 'Marketing',         path: '/marketing',        icon: Target,         slug: 'marketing'     },
  { name: 'Estratégico',       path: '/gestao-estrategica', icon: Target,       slug: 'financeiro'    },
  { name: 'Manual',            path: '/manual',           icon: BookOpen,       slug: 'manual'        },
  { name: 'Configurações',     path: '/settings',         icon: Settings,       slug: 'configuracoes' },
];

const SidebarModern: React.FC<Props> = ({ onNavigate }) => {
  const location = useLocation();
  const { temAcessoModulo, usuario, logout } = useAuth();
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [flyoutOpen, setFlyoutOpen] = useState(false);
  const flyoutRef = useRef<HTMLDivElement>(null);

  const filtered = MODULES.filter(m => temAcessoModulo(m.slug));
  const mainModules = filtered.filter(m => !['manual', 'configuracoes'].includes(m.slug));
  const utilModules = filtered.filter(m => ['manual', 'configuracoes'].includes(m.slug));

  // Detecta módulo ativo pela rota
  useEffect(() => {
    const cur = filtered.find(m =>
      location.pathname === m.path ||
      m.subModules?.some(s =>
        location.pathname + location.search === s.path ||
        location.pathname === s.path
      )
    );
    if (cur) { setActiveSlug(cur.slug); setFlyoutOpen(!!cur.subModules?.length); }
    else setFlyoutOpen(false);
  }, [location]);

  // Fecha flyout clicando fora
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (flyoutRef.current && !flyoutRef.current.contains(e.target as Node)) {
        setFlyoutOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const isActive = (path: string) =>
    location.pathname + location.search === path || location.pathname === path;

  const activeModule = filtered.find(m => m.slug === activeSlug);
  const initials = usuario?.nome_completo?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'U';

  const handleRailClick = (m: Module) => {
    if (m.subModules?.length) {
      if (activeSlug === m.slug && flyoutOpen) {
        setFlyoutOpen(false);
      } else {
        setActiveSlug(m.slug);
        setFlyoutOpen(true);
      }
    } else {
      setActiveSlug(m.slug);
      setFlyoutOpen(false);
      onNavigate?.();
    }
  };

  const RailIcon = ({ m }: { m: Module }) => {
    const isActiveMod = activeSlug === m.slug;
    return (
      <button
        onClick={() => handleRailClick(m)}
        title={m.name}
        className={`
          relative w-10 h-10 rounded-xl flex items-center justify-center
          transition-all duration-150 group
          ${isActiveMod
            ? 'bg-[#7D1F2C]/40 ring-1 ring-[#7D1F2C]/60'
            : 'hover:bg-white/8'
          }
        `}
      >
        <m.icon className={`w-4.5 h-4.5 ${isActiveMod ? 'text-[#f5c0c8]' : 'text-white/35 group-hover:text-white/65'}`} style={{width:'18px',height:'18px'}} />
        {isActiveMod && (
          <span className="absolute right-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-l-full bg-[#D4AF37]" />
        )}
      </button>
    );
  };

  return (
    <div ref={flyoutRef} className="flex h-full" style={{ position: 'relative' }}>

      {/* ── RAIL ── */}
      <div className="w-[60px] flex flex-col items-center py-3 gap-1 bg-[#0a0608] border-r border-white/[0.05] flex-shrink-0">

        {/* Logo */}
        <div className="w-8 h-8 rounded-lg mb-3 flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#7D1F2C,#D4AF37)' }}
        />

        {/* Módulos principais */}
        {mainModules.map(m => <RailIcon key={m.slug + m.path} m={m} />)}

        {/* Divisor */}
        <div className="w-6 border-t border-white/[0.06] my-1" />

        {/* Utilitários */}
        {utilModules.map(m => <RailIcon key={m.slug + m.path} m={m} />)}

        {/* Avatar */}
        <div className="mt-auto mb-1">
          <button
            title={usuario?.nome_completo || 'Usuário'}
            onClick={logout}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[10px] font-bold hover:opacity-80 transition-all"
            style={{ background: 'linear-gradient(135deg,#7D1F2C,#D4AF37)' }}
          >
            {initials}
          </button>
        </div>
      </div>

      {/* ── FLYOUT ── */}
      {flyoutOpen && activeModule?.subModules && (
        <div className="
          w-[220px] flex flex-col bg-[#0f0a0b]
          border-r border-white/[0.05]
          animate-in slide-in-from-left-2 duration-150
          flex-shrink-0 overflow-hidden
        ">
          {/* Header do flyout */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <activeModule.icon className="text-[#f5c0c8]" style={{width:'14px',height:'14px'}} />
              <span className="text-white/80 text-xs font-semibold tracking-wide">{activeModule.name}</span>
            </div>
            <button onClick={() => setFlyoutOpen(false)} className="text-white/20 hover:text-white/50 transition-colors">
              <ChevronRight style={{width:'14px',height:'14px'}} />
            </button>
          </div>

          {/* Submódulos */}
          <div className="flex-1 overflow-y-auto py-2 px-2
            [&::-webkit-scrollbar]:w-0.5
            [&::-webkit-scrollbar-thumb]:bg-white/10
            [&::-webkit-scrollbar-track]:bg-transparent">
            {activeModule.subModules.map(sub => {
              const active = isActive(sub.path);
              return (
                <Link
                  key={sub.path}
                  to={sub.path}
                  onClick={() => { onNavigate?.(); }}
                  className={`
                    flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs
                    transition-all duration-100 group
                    ${active
                      ? 'bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20'
                      : 'text-white/35 hover:text-white/70 hover:bg-white/5'
                    }
                  `}
                >
                  <sub.icon
                    className={`flex-shrink-0 ${active ? 'text-[#D4AF37]' : 'text-white/25 group-hover:text-white/50'}`}
                    style={{width:'13px',height:'13px'}}
                  />
                  <span className="leading-tight">{sub.name}</span>
                  {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#D4AF37] flex-shrink-0" />}
                </Link>
              );
            })}
          </div>

          {/* Rodapé do flyout */}
          <div className="border-t border-white/[0.06] px-3 py-3">
            <div className="flex items-center gap-2.5">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
                style={{ background: 'linear-gradient(135deg,#7D1F2C,#D4AF37)' }}
              >
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-white/60 text-[11px] font-medium truncate leading-tight">
                  {usuario?.nome_completo?.split(' ')[0] || 'Usuário'}
                </p>
                <p className="text-white/25 text-[10px] capitalize truncate leading-tight">
                  {usuario?.cargo || usuario?.nivel || '—'}
                </p>
              </div>
              <button onClick={logout} title="Sair"
                className="text-white/20 hover:text-red-400/70 transition-colors flex-shrink-0">
                <LogOut style={{width:'13px',height:'13px'}} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SidebarModern;
