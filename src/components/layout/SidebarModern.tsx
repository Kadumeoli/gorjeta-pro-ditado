import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard, DollarSign, Package, Users, Music,
  CalendarDays, Settings, BookOpen, AlertTriangle,
  ChevronDown, TrendingUp, CreditCard, Building2, Activity,
  Receipt, PieChart, Warehouse, Factory, ClipboardList,
  ShoppingCart, FileText, BarChart3, Calendar, UserCog,
  ClipboardCheck, Home, UserPlus, Tag, ArrowLeftRight,
  Target, LineChart, RefreshCw
} from 'lucide-react';

interface SubModule { name: string; path: string; tab?: number; icon: React.ElementType; }
interface Module {
  name: string; path: string; icon: React.ElementType;
  slug: string; subModules?: SubModule[];
}
interface SidebarModernProps { onNavigate?: () => void; }

const SidebarModern: React.FC<SidebarModernProps> = ({ onNavigate }) => {
  const location = useLocation();
  const { temAcessoModulo } = useAuth();
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const navigation: Module[] = [
    { name: 'Início',             path: '/',                   icon: Home,          slug: 'dashboard' },
    {
      name: 'Financeiro', path: '/finance', icon: DollarSign, slug: 'financeiro',
      subModules: [
        { name: 'Dashboard Financeiro',            path: '/financeiro',        icon: LineChart      },
        { name: 'Fluxo de Caixa',                  path: '/finance?tab=0',     icon: TrendingUp     },
        { name: 'Resumo do Dia',                   path: '/finance?tab=1',     icon: Calendar       },
        { name: 'Extrato Diário',                  path: '/finance?tab=2',     icon: FileText       },
        { name: 'Contas a Pagar',                  path: '/finance?tab=3',     icon: CreditCard     },
        { name: 'Contas a Receber',                path: '/finance?tab=4',     icon: Receipt        },
        { name: 'Histórico e Estornos',            path: '/finance?tab=5',     icon: ArrowLeftRight },
        { name: 'Categorizar Lançamentos',         path: '/finance?tab=6',     icon: Tag            },
        { name: 'Ficha Fornecedor',                path: '/finance?tab=7',     icon: Building2      },
        { name: 'Kardex Fornecedor',               path: '/finance?tab=8',     icon: Activity       },
        { name: 'Kardex Completo',                 path: '/finance?tab=9',     icon: FileText       },
        { name: 'Relatórios',                      path: '/finance?tab=10',    icon: PieChart       },
        { name: 'Cadastros',                       path: '/finance?tab=11',    icon: Settings       },
        { name: 'Visão Estratégica',               path: '/visao-estrategica', icon: Target         },
        { name: 'Entradas Previsto x Real',        path: '/entradas',          icon: TrendingUp     },
        { name: 'ZIG Recebimentos',                path: '/zig-recebimentos',  icon: RefreshCw      },
      ]
    },
    {
      name: 'Estoque', path: '/advanced-inventory', icon: Warehouse, slug: 'estoque',
      subModules: [
        { name: 'Dashboard',       path: '/advanced-inventory?tab=0',  icon: BarChart3     },
        { name: 'Estoques',        path: '/advanced-inventory?tab=1',  icon: Warehouse     },
        { name: 'Itens',           path: '/advanced-inventory?tab=2',  icon: Package       },
        { name: 'Fichas Técnicas', path: '/advanced-inventory?tab=3',  icon: ClipboardList },
        { name: 'Compras',         path: '/advanced-inventory?tab=4',  icon: ShoppingCart  },
        { name: 'Produção',        path: '/advanced-inventory?tab=5',  icon: Factory       },
        { name: 'Relatórios',      path: '/advanced-inventory?tab=6',  icon: FileText      },
        { name: 'Movimentações',   path: '/advanced-inventory?tab=8',  icon: Activity      },
        { name: 'Kardex Produto',  path: '/advanced-inventory?tab=10', icon: Activity      },
        { name: 'Contagem',        path: '/advanced-inventory?tab=11', icon: ClipboardCheck},
        { name: 'ZIG → Estoque',   path: '/zig-vendas',                icon: RefreshCw     },
      ]
    },
    {
      name: 'RH', path: '/staff', icon: Users, slug: 'rh',
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
      ]
    },
    { name: 'Músicos',           path: '/musicians',         icon: Music,          slug: 'musicos'       },
    { name: 'Eventos',           path: '/events',            icon: CalendarDays,   slug: 'eventos'       },
    { name: 'Solicitações',      path: '/solicitacoes',      icon: ClipboardCheck, slug: 'solicitacoes'  },
    { name: 'Ocorrências',       path: '/ocorrencias',       icon: AlertTriangle,  slug: 'ocorrencias'   },
    { name: 'Marketing',         path: '/marketing',         icon: Target,         slug: 'marketing'     },
    { name: 'Gestão Estratégica',path: '/gestao-estrategica',icon: Target,         slug: 'financeiro'    },
    { name: 'Manual',            path: '/manual',            icon: BookOpen,       slug: 'manual'        },
    { name: 'Configurações',     path: '/settings',          icon: Settings,       slug: 'configuracoes' },
  ];

  useEffect(() => {
    const cur = navigation.find(m =>
      location.pathname === m.path ||
      (m.subModules && m.subModules.some(s =>
        location.pathname + location.search === s.path || location.pathname === s.path
      ))
    );
    if (cur?.subModules) setExpandedModule(cur.slug);
  }, [location]);

  const isActive = (path: string) =>
    location.pathname + location.search === path || location.pathname === path;

  const isModuleActive = (m: Module) =>
    location.pathname === m.path ||
    (m.subModules?.some(s =>
      location.pathname + location.search === s.path || location.pathname === s.path
    ) ?? false);

  const filtered = navigation.filter(m => temAcessoModulo(m.slug));

  // Módulos principais vs utilitários
  const mainModules = filtered.filter(m => !['manual','configuracoes'].includes(m.slug));
  const utilModules = filtered.filter(m => ['manual','configuracoes'].includes(m.slug));

  const renderModule = (module: Module) => {
    const hasSubModules = (module.subModules?.length ?? 0) > 0;
    const isExpanded   = expandedModule === module.slug;
    const active       = isModuleActive(module);
    const hovered      = hoveredItem === module.slug;

    return (
      <div key={module.slug + module.path}>
        {hasSubModules ? (
          <button
            onClick={() => setExpandedModule(isExpanded ? null : module.slug)}
            onMouseEnter={() => setHoveredItem(module.slug)}
            onMouseLeave={() => setHoveredItem(null)}
            className={`
              w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm
              font-medium transition-all duration-200 group relative
              ${active
                ? 'bg-gradient-to-r from-[#7D1F2C] to-[#9B2535] text-white shadow-lg shadow-[#7D1F2C]/25'
                : 'text-[#c8b8bc] hover:text-white hover:bg-white/8'
              }
            `}
          >
            {/* Active glow */}
            {active && (
              <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#7D1F2C]/40 to-transparent blur-sm -z-10" />
            )}
            <div className="flex items-center gap-3">
              <div className={`
                flex items-center justify-center w-7 h-7 rounded-lg transition-all
                ${active ? 'bg-white/20' : 'bg-white/5 group-hover:bg-white/10'}
              `}>
                <module.icon className="w-4 h-4" />
              </div>
              <span className="tracking-wide">{module.name}</span>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 opacity-60 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
          </button>
        ) : (
          <Link
            to={module.path}
            onClick={onNavigate}
            onMouseEnter={() => setHoveredItem(module.slug)}
            onMouseLeave={() => setHoveredItem(null)}
            className={`
              flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm
              font-medium transition-all duration-200 group relative
              ${isActive(module.path)
                ? 'bg-gradient-to-r from-[#7D1F2C] to-[#9B2535] text-white shadow-lg shadow-[#7D1F2C]/25'
                : 'text-[#c8b8bc] hover:text-white hover:bg-white/8'
              }
            `}
          >
            {isActive(module.path) && (
              <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#7D1F2C]/40 to-transparent blur-sm -z-10" />
            )}
            <div className={`
              flex items-center justify-center w-7 h-7 rounded-lg transition-all
              ${isActive(module.path) ? 'bg-white/20' : 'bg-white/5 group-hover:bg-white/10'}
            `}>
              <module.icon className="w-4 h-4" />
            </div>
            <span className="tracking-wide">{module.name}</span>
          </Link>
        )}

        {/* Submódulos */}
        {hasSubModules && isExpanded && (
          <div className="mt-0.5 ml-3 pl-3 border-l border-white/10 space-y-0.5 py-1">
            {module.subModules!.map(sub => {
              const subActive = isActive(sub.path);
              return (
                <Link
                  key={sub.path}
                  to={sub.path}
                  onClick={onNavigate}
                  className={`
                    flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs
                    font-medium transition-all duration-150 group
                    ${subActive
                      ? 'text-[#D4AF37] bg-[#D4AF37]/10'
                      : 'text-[#9a8a8e] hover:text-[#e8d8dc] hover:bg-white/5'
                    }
                  `}
                >
                  <sub.icon className={`w-3.5 h-3.5 flex-shrink-0 ${subActive ? 'text-[#D4AF37]' : ''}`} />
                  <span className="leading-tight">{sub.name}</span>
                  {subActive && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#D4AF37] flex-shrink-0" />
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <nav className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-0.5
      [&::-webkit-scrollbar]:w-1
      [&::-webkit-scrollbar-track]:bg-transparent
      [&::-webkit-scrollbar-thumb]:bg-white/10
      [&::-webkit-scrollbar-thumb]:rounded-full">

      {/* Módulos principais */}
      <div className="space-y-0.5">
        {mainModules.map(renderModule)}
      </div>

      {/* Divisor */}
      {utilModules.length > 0 && (
        <div className="my-3 border-t border-white/8" />
      )}

      {/* Utilitários */}
      <div className="space-y-0.5">
        {utilModules.map(renderModule)}
      </div>
    </nav>
  );
};

export default SidebarModern;
