import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  Home, DollarSign, Warehouse, Users, Music, CalendarDays,
  Settings, BookOpen, AlertTriangle, ClipboardCheck, Target,
  TrendingUp, ChevronRight, LogOut, X,
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

export default function SidebarModern({ onNavigate }: Props) {
  const location = useLocation();
  const { temAcessoModulo, usuario, logout } = useAuth();
  const [flyout, setFlyout] = useState<string | null>(null);

  const filtered = MODULES.filter(m => temAcessoModulo(m.slug));
  const main  = filtered.filter(m => !['manual','configuracoes'].includes(m.slug));
  const utils = filtered.filter(m =>  ['manual','configuracoes'].includes(m.slug));

  const isActive = (path: string) =>
    location.pathname + location.search === path || location.pathname === path;

  const isModActive = (m: Module) =>
    isActive(m.path) || !!m.subModules?.some(s => isActive(s.path));

  const initials = usuario?.nome_completo
    ?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() ?? 'U';

  const handleIconClick = (m: Module) => {
    if (m.subModules?.length) {
      setFlyout(prev => prev === m.slug ? null : m.slug);
    } else {
      setFlyout(null);
      onNavigate?.();
    }
  };

  const activeFlyoutModule = filtered.find(m => m.slug === flyout);

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'visible', position: 'relative' }}>

      {/* ── RAIL DE ÍCONES (sempre visível, 60px) ── */}
      <div style={{
        width: 60, background: '#0a0608',
        borderRight: '1px solid rgba(255,255,255,0.05)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', padding: '12px 0', gap: 2,
        flexShrink: 0, zIndex: 10,
      }}>
        {/* Logo */}
        <div style={{
          width: 32, height: 32, borderRadius: 10, marginBottom: 12, flexShrink: 0,
          background: 'linear-gradient(135deg,#7D1F2C,#D4AF37)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ color: 'white', fontSize: 9, fontWeight: 800 }}>DP</span>
        </div>

        {/* Módulos principais */}
        {main.map(m => {
          const active = isModActive(m);
          const open   = flyout === m.slug;
          return (
            <div key={m.slug} style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center' }}>
              <button
                onClick={() => handleIconClick(m)}
                title={m.name}
                style={{
                  width: 40, height: 40, borderRadius: 10, border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: active || open ? 'rgba(125,31,44,0.35)' : 'transparent',
                  outline: active || open ? '1px solid rgba(125,31,44,0.5)' : 'none',
                  transition: 'all 0.15s',
                  position: 'relative',
                }}
                onMouseEnter={e => { if (!active && !open) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; }}
                onMouseLeave={e => { if (!active && !open) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <m.icon style={{
                  width: 16, height: 16,
                  color: active || open ? '#f5c0c8' : 'rgba(255,255,255,0.35)',
                }} />
                {active && (
                  <span style={{
                    position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)',
                    width: 3, height: 18, borderRadius: '2px 0 0 2px',
                    background: '#D4AF37',
                  }} />
                )}
              </button>
            </div>
          );
        })}

        {/* Divisor */}
        <div style={{ width: 28, borderTop: '1px solid rgba(255,255,255,0.06)', margin: '4px 0' }} />

        {/* Utilitários */}
        {utils.map(m => {
          const active = isModActive(m);
          return (
            <div key={m.slug} style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center' }}>
              <button
                onClick={() => handleIconClick(m)}
                title={m.name}
                style={{
                  width: 40, height: 40, borderRadius: 10, border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: active ? 'rgba(125,31,44,0.35)' : 'transparent',
                  outline: active ? '1px solid rgba(125,31,44,0.5)' : 'none',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <m.icon style={{ width: 16, height: 16, color: active ? '#f5c0c8' : 'rgba(255,255,255,0.35)' }} />
              </button>
            </div>
          );
        })}

        {/* Avatar / logout */}
        <div style={{ marginTop: 'auto', paddingBottom: 4 }}>
          <button
            onClick={logout}
            title={`${usuario?.nome_completo ?? 'Usuário'} — Sair`}
            style={{
              width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg,#7D1F2C,#D4AF37)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontSize: 10, fontWeight: 700,
            }}
          >
            {initials}
          </button>
        </div>
      </div>

      {/* ── PAINEL FLYOUT (aparece ao clicar em módulo com submódulos) ── */}
      {flyout && activeFlyoutModule?.subModules && (
        <>
          {/* Overlay para fechar */}
          <div
            onClick={() => setFlyout(null)}
            style={{
              position: 'fixed', inset: 0, zIndex: 8,
            }}
          />
          <div style={{
            position: 'absolute', left: 60, top: 0, bottom: 0,
            width: 220, zIndex: 9,
            background: '#120b0d',
            borderRight: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', flexDirection: 'column',
            animation: 'slideInLeft 0.15s ease-out',
          }}>
            <style>{`
              @keyframes slideInLeft {
                from { opacity: 0; transform: translateX(-8px); }
                to   { opacity: 1; transform: translateX(0); }
              }
            `}</style>

            {/* Header do flyout */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 14px 10px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {activeFlyoutModule && (
                  <activeFlyoutModule.icon style={{ width: 14, height: 14, color: '#f5c0c8' }} />
                )}
                <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: 600 }}>
                  {activeFlyoutModule?.name}
                </span>
              </div>
              <button
                onClick={() => setFlyout(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'rgba(255,255,255,0.25)' }}
              >
                <X style={{ width: 13, height: 13 }} />
              </button>
            </div>

            {/* Lista de submódulos */}
            <div style={{
              flex: 1, overflowY: 'auto', padding: '8px',
              scrollbarWidth: 'none',
            }}>
              {activeFlyoutModule?.subModules?.map(sub => {
                const subActive = isActive(sub.path);
                return (
                  <Link
                    key={sub.path}
                    to={sub.path}
                    onClick={() => { setFlyout(null); onNavigate?.(); }}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '9px 10px', borderRadius: 8, marginBottom: 1,
                      textDecoration: 'none',
                      background: subActive ? 'rgba(212,175,55,0.1)' : 'transparent',
                      border: subActive ? '1px solid rgba(212,175,55,0.2)' : '1px solid transparent',
                      color: subActive ? '#D4AF37' : 'rgba(255,255,255,0.4)',
                      fontSize: 12,
                      transition: 'all 0.1s',
                    }}
                    onMouseEnter={e => { if (!subActive) { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.75)'; } }}
                    onMouseLeave={e => { if (!subActive) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.4)'; } }}
                  >
                    {sub.name}
                    {subActive && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#D4AF37', flexShrink: 0 }} />}
                  </Link>
                );
              })}
            </div>

            {/* Footer */}
            <div style={{
              borderTop: '1px solid rgba(255,255,255,0.06)',
              padding: '10px 12px',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <div style={{
                width: 26, height: 26, borderRadius: 7, flexShrink: 0,
                background: 'linear-gradient(135deg,#7D1F2C,#D4AF37)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontSize: 9, fontWeight: 700,
              }}>
                {initials}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {usuario?.nome_completo?.split(' ')[0] ?? 'Usuário'}
                </p>
                <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10, margin: 0, textTransform: 'capitalize' }}>
                  {usuario?.cargo ?? usuario?.nivel ?? '—'}
                </p>
              </div>
              <button onClick={logout} title="Sair" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.2)', padding: 2 }}>
                <LogOut style={{ width: 13, height: 13 }} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
