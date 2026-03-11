import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard,
  DollarSign,
  Package,
  Users,
  Music,
  CalendarDays,
  Settings,
  BookOpen,
  AlertTriangle,
  ChevronDown,
  TrendingUp,
  CreditCard,
  CheckSquare,
  Building2,
  Activity,
  Receipt,
  PieChart,
  Warehouse,
  Factory,
  ClipboardList,
  ShoppingCart,
  FileText,
  BarChart3,
  Calendar,
  UserCog,
  ClipboardCheck,
  Home,
  UserPlus,
  Briefcase,
  Tag,
  ArrowLeftRight,
  Target,
  LineChart
} from 'lucide-react';

interface SubModule {
  name: string;
  path: string;
  tab?: number;
  icon: React.ElementType;
}

interface Module {
  name: string;
  path: string;
  icon: React.ElementType;
  color: string;
  slug: string;
  subModules?: SubModule[];
}

interface SidebarModernProps {
  onNavigate?: () => void;
}

const SidebarModern: React.FC<SidebarModernProps> = ({ onNavigate }) => {
  const location = useLocation();
  const { temAcessoModulo } = useAuth();
  const [expandedModule, setExpandedModule] = useState<string | null>(null);

  const navigation: Module[] = [
    {
      name: 'Início',
      path: '/',
      icon: Home,
      color: 'from-blue-500 to-indigo-600',
      slug: 'dashboard'
    },
    {
      name: 'Financeiro',
      path: '/finance',
      icon: DollarSign,
      color: 'from-green-500 to-emerald-600',
      slug: 'financeiro',
      subModules: [
        { name: 'Dashboard Financeiro',              path: '/financeiro',          icon: LineChart       },
        { name: 'Fluxo de Caixa',                    path: '/finance?tab=0',       tab: 0,  icon: TrendingUp      },
        { name: 'Resumo do Dia',                     path: '/finance?tab=1',       tab: 1,  icon: Calendar        },
        { name: 'Extrato Diário',                    path: '/finance?tab=2',       tab: 2,  icon: FileText        },
        { name: 'Contas a Pagar',                    path: '/finance?tab=3',       tab: 3,  icon: CreditCard      },
        { name: 'Contas a Receber',                  path: '/finance?tab=4',       tab: 4,  icon: Receipt         },
        { name: 'Histórico e Estornos',              path: '/finance?tab=5',       tab: 5,  icon: ArrowLeftRight  },
        { name: 'Categorizar Lançamentos',           path: '/finance?tab=6',       tab: 6,  icon: Tag             },
        { name: 'Ficha Fornecedor',                  path: '/finance?tab=7',       tab: 7,  icon: Building2       },
        { name: 'Kardex Fornecedor',                 path: '/finance?tab=8',       tab: 8,  icon: Activity        },
        { name: 'Kardex Completo',                   path: '/finance?tab=9',       tab: 9,  icon: FileText        },
        { name: 'Relatórios',                        path: '/finance?tab=10',      tab: 10, icon: PieChart        },
        { name: 'Cadastros',                         path: '/finance?tab=11',      tab: 11, icon: Settings        },
        { name: 'Visão Estratégica',                 path: '/visao-estrategica',          icon: Target          },
        { name: 'Entradas (Previsto x Realizado)',   path: '/entradas',                   icon: TrendingUp      },
      ]
    },
    {
      name: 'Estoque',
      path: '/advanced-inventory',
      icon: Warehouse,
      color: 'from-purple-500 to-indigo-600',
      slug: 'estoque',
      subModules: [
        { name: 'Dashboard',       path: '/advanced-inventory?tab=0',  tab: 0,  icon: BarChart3      },
        { name: 'Estoques',        path: '/advanced-inventory?tab=1',  tab: 1,  icon: Warehouse      },
        { name: 'Itens',           path: '/advanced-inventory?tab=2',  tab: 2,  icon: Package        },
        { name: 'Fichas Técnicas', path: '/advanced-inventory?tab=3',  tab: 3,  icon: ClipboardList  },
        { name: 'Compras',         path: '/advanced-inventory?tab=4',  tab: 4,  icon: ShoppingCart   },
        { name: 'Produção',        path: '/advanced-inventory?tab=5',  tab: 5,  icon: Factory        },
        { name: 'Relatórios',      path: '/advanced-inventory?tab=6',  tab: 6,  icon: FileText       },
        { name: 'Movimentações',   path: '/advanced-inventory?tab=8',  tab: 8,  icon: Activity       },
        { name: 'Kardex Produto',  path: '/advanced-inventory?tab=10', tab: 10, icon: Activity       },
        { name: 'Contagem',        path: '/advanced-inventory?tab=11', tab: 11, icon: ClipboardCheck },
      ]
    },
    {
      name: 'RH',
      path: '/staff',
      icon: Users,
      color: 'from-orange-500 to-amber-600',
      slug: 'rh',
      subModules: [
        { name: 'Recrutamento & Seleção', path: '/recruitment',      icon: UserPlus    },
        { name: 'Colaboradores',          path: '/staff?tab=0', tab: 0, icon: Users      },
        { name: 'Escalas',                path: '/staff?tab=1', tab: 1, icon: Calendar   },
        { name: 'Férias',                 path: '/staff?tab=2', tab: 2, icon: CalendarDays },
        { name: 'Ocorrências',            path: '/staff?tab=3', tab: 3, icon: AlertTriangle },
        { name: 'Extras/Freelancers',     path: '/staff?tab=4', tab: 4, icon: Users      },
        { name: 'Funções',                path: '/staff?tab=5', tab: 5, icon: UserCog    },
        { name: 'Configurações',          path: '/staff?tab=6', tab: 6, icon: Settings   },
        { name: 'Relatórios',             path: '/staff?tab=7', tab: 7, icon: FileText   },
        { name: 'Gorjetas',               path: '/staff?tab=8', tab: 8, icon: DollarSign },
      ]
    },
    {
      name: 'Músicos',
      path: '/musicians',
      icon: Music,
      color: 'from-pink-500 to-rose-600',
      slug: 'musicos'
    },
    {
      name: 'Eventos',
      path: '/events',
      icon: CalendarDays,
      color: 'from-teal-500 to-cyan-600',
      slug: 'eventos'
    },
    {
      name: 'Solicitações',
      path: '/solicitacoes',
      icon: ClipboardCheck,
      color: 'from-blue-500 to-sky-600',
      slug: 'solicitacoes'
    },
    {
      name: 'Ocorrências',
      path: '/ocorrencias',
      icon: AlertTriangle,
      color: 'from-red-500 to-rose-600',
      slug: 'ocorrencias'
    },
    {
      name: 'Marketing',
      path: '/marketing',
      icon: Target,
      color: 'from-amber-500 to-orange-600',
      slug: 'marketing'
    },
    {
      name: 'Gestão Estratégica',
      path: '/gestao-estrategica',
      icon: Target,
      color: 'from-[#7D1F2C] to-[#D4AF37]',
      slug: 'financeiro'
    },
    {
      name: 'Manual',
      path: '/manual',
      icon: BookOpen,
      color: 'from-gray-500 to-slate-600',
      slug: 'manual'
    },
    {
      name: 'Configurações',
      path: '/settings',
      icon: Settings,
      color: 'from-gray-600 to-zinc-600',
      slug: 'configuracoes'
    }
  ];

  // Auto-expand módulo atual
  useEffect(() => {
    const currentModule = navigation.find(module =>
      location.pathname === module.path ||
      (module.subModules && module.subModules.some(sub =>
        location.pathname + location.search === sub.path ||
        location.pathname === sub.path
      ))
    );
    if (currentModule && currentModule.subModules) {
      setExpandedModule(currentModule.slug);
    }
  }, [location]);

  const isActive = (path: string) => {
    return location.pathname + location.search === path || location.pathname === path;
  };

  const toggleModule = (slug: string) => {
    setExpandedModule(expandedModule === slug ? null : slug);
  };

  const filteredNavigation = navigation.filter(module =>
    temAcessoModulo(module.slug)
  );

  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
      {filteredNavigation.map((module) => {
        const hasSubModules = module.subModules && module.subModules.length > 0;
        const isExpanded = expandedModule === module.slug;
        const isModuleActive = location.pathname === module.path ||
                              (hasSubModules && module.subModules!.some(sub =>
                                location.pathname + location.search === sub.path ||
                                location.pathname === sub.path
                              ));

        return (
          <div key={module.slug + module.path} className="space-y-1">
            {/* Módulo Principal */}
            {hasSubModules ? (
              <button
                onClick={() => toggleModule(module.slug)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isModuleActive
                    ? `bg-gradient-to-r ${module.color} text-white shadow-lg`
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <module.icon className="w-5 h-5" />
                  <span>{module.name}</span>
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
              </button>
            ) : (
              <Link
                to={module.path}
                onClick={onNavigate}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive(module.path)
                    ? `bg-gradient-to-r ${module.color} text-white shadow-lg`
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <module.icon className="w-5 h-5" />
                <span>{module.name}</span>
              </Link>
            )}

            {/* Submódulos */}
            {hasSubModules && isExpanded && (
              <div className="ml-4 pl-3 border-l-2 border-gray-200 space-y-0.5 py-1">
                {module.subModules!.map((subModule) => (
                  <Link
                    key={subModule.path}
                    to={subModule.path}
                    onClick={onNavigate}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                      isActive(subModule.path)
                        ? `bg-gradient-to-r ${module.color} bg-opacity-10 text-gray-900 font-medium`
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <subModule.icon className="w-4 h-4" />
                    <span>{subModule.name}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
};

export default SidebarModern;
