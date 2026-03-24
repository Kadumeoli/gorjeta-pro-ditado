import React, { lazy, Suspense, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import SidebarModern from './components/layout/SidebarModern';
import ProtectedRoute from './components/layout/ProtectedRoute';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Topbar from './components/layout/Topbar';
import Login from './pages/Login';
import { testConnection } from './lib/supabase';

const Dashboard           = lazy(() => import('./pages/Dashboard'));
const DashboardHome       = lazy(() => import('./pages/DashboardHome'));
const Finance             = lazy(() => import('./pages/Finance'));
const AdvancedInventory   = lazy(() => import('./pages/AdvancedInventory'));
const Staff               = lazy(() => import('./pages/Staff'));
const Musicians           = lazy(() => import('./pages/Musicians'));
const Events              = lazy(() => import('./pages/Events'));
const Settings            = lazy(() => import('./pages/Settings'));
const Solicitacoes        = lazy(() => import('./pages/Solicitacoes'));
const Ocorrencias         = lazy(() => import('./pages/Ocorrencias'));
const ManualUsuario       = lazy(() => import('./pages/ManualUsuario'));
const Recruitment         = lazy(() => import('./pages/Recruitment'));
const PreEntrevista       = lazy(() => import('./pages/PreEntrevista'));
const SolicitacaoPublica  = lazy(() => import('./pages/SolicitacaoPublica'));
const Marketing           = lazy(() => import('./pages/Marketing'));
const GestaoEstrategica   = lazy(() => import('./pages/GestaoEstrategica'));
const VisaoEstrategica    = lazy(() => import('./pages/VisaoEstrategica'));
const Entradas            = lazy(() => import('./pages/Entradas'));
const DashboardFinanceiro = lazy(() => import('./pages/DashboardFinanceiro'));
const ZigVendasSync       = lazy(() => import('./pages/ZigVendasSync'));
const ZigRecebimentos     = lazy(() => import('./pages/ZigRecebimentos'));
const ListaCompras        = lazy(() => import('./pages/ListaCompras'));
const ContagemMobile      = lazy(() => import('./components/inventory/contagem/ContagemMobile'));

const PageLoader = () => (
  <div className="flex items-center justify-center h-full min-h-[300px]">
    <div className="animate-spin rounded-full h-7 w-7 border-2 border-white/10 border-t-[#D4AF37]" />
  </div>
);

function AppContent() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { usuario, logout } = useAuth();

  useEffect(() => { testConnection(); }, []);

  const rotasPublicas = ['/pre-entrevista', '/solicitacao', '/contagem-mobile'];
  const isRotaPublica = rotasPublicas.some(r => window.location.pathname.startsWith(r));

  if (!usuario && !isRotaPublica) return <Login />;

  if (isRotaPublica) {
    return (
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/pre-entrevista"         element={<PreEntrevista />} />
          <Route path="/solicitacao"            element={<SolicitacaoPublica />} />
          <Route path="/contagem-mobile/:token" element={<ContagemMobile />} />
        </Routes>
      </Suspense>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#0a0608' }}>

      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden bg-black/60 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── SIDEBAR ── */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 flex flex-col w-60
        bg-[#0f0a0b] border-r border-white/[0.05]
        transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:inset-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center gap-3 h-14 px-4 border-b border-white/[0.05] flex-shrink-0">
          <div className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#7D1F2C,#D4AF37)' }}>
            <span className="text-white text-[10px] font-black tracking-tighter">DP</span>
          </div>
          <div>
            <p className="text-[13px] font-bold text-white/90 leading-none tracking-tight">Ditado Popular</p>
            <p className="text-[10px] text-white/25 mt-0.5 tracking-widest uppercase">Gestão</p>
          </div>
          <button onClick={() => setSidebarOpen(false)}
            className="ml-auto lg:hidden p-1.5 text-white/30 hover:text-white/60 rounded-lg hover:bg-white/8">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <SidebarModern onNavigate={() => setSidebarOpen(false)} />
      </aside>

      {/* ── MAIN ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Topbar toggleSidebar={() => setSidebarOpen(v => !v)} user={usuario} onLogout={logout} />

        <main className="flex-1 overflow-y-auto bg-gray-100">
          <div className="p-6 lg:p-8 min-h-full">
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/"                    element={<ProtectedRoute moduloSlug="dashboard">     <DashboardHome />       </ProtectedRoute>} />
                <Route path="/dashboard"           element={<ProtectedRoute moduloSlug="dashboard">     <Dashboard />           </ProtectedRoute>} />
                <Route path="/finance"             element={<ProtectedRoute moduloSlug="financeiro">    <Finance />             </ProtectedRoute>} />
                <Route path="/financeiro"          element={<ProtectedRoute moduloSlug="financeiro">    <DashboardFinanceiro /> </ProtectedRoute>} />
                <Route path="/advanced-inventory"  element={<ProtectedRoute moduloSlug="estoque">       <AdvancedInventory />   </ProtectedRoute>} />
                <Route path="/staff"               element={<ProtectedRoute moduloSlug="rh">            <Staff />               </ProtectedRoute>} />
                <Route path="/recruitment"         element={<ProtectedRoute moduloSlug="rh">            <Recruitment />         </ProtectedRoute>} />
                <Route path="/musicians"           element={<ProtectedRoute moduloSlug="musicos">       <Musicians />           </ProtectedRoute>} />
                <Route path="/events"              element={<ProtectedRoute moduloSlug="eventos">       <Events />              </ProtectedRoute>} />
                <Route path="/solicitacoes"        element={<ProtectedRoute moduloSlug="solicitacoes">  <Solicitacoes />        </ProtectedRoute>} />
                <Route path="/ocorrencias"         element={<ProtectedRoute moduloSlug="ocorrencias">   <Ocorrencias />         </ProtectedRoute>} />
                <Route path="/marketing"           element={<ProtectedRoute moduloSlug="marketing">     <Marketing />           </ProtectedRoute>} />
                <Route path="/gestao-estrategica"  element={<ProtectedRoute moduloSlug="financeiro">    <GestaoEstrategica />   </ProtectedRoute>} />
                <Route path="/visao-estrategica"   element={<ProtectedRoute moduloSlug="financeiro">    <VisaoEstrategica />    </ProtectedRoute>} />
                <Route path="/entradas"            element={<ProtectedRoute moduloSlug="financeiro">    <Entradas />            </ProtectedRoute>} />
                <Route path="/zig-vendas"          element={<ProtectedRoute moduloSlug="estoque">       <ZigVendasSync />       </ProtectedRoute>} />
                <Route path="/zig-recebimentos"    element={<ProtectedRoute moduloSlug="financeiro">    <ZigRecebimentos />     </ProtectedRoute>} />
                <Route path="/lista-compras"       element={<ProtectedRoute moduloSlug="estoque">       <ListaCompras />        </ProtectedRoute>} />
                <Route path="/manual"              element={<ManualUsuario />} />
                <Route path="/settings"            element={<ProtectedRoute moduloSlug="configuracoes"> <Settings />            </ProtectedRoute>} />
                <Route path="*" element={
                  <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
                    <p className="text-6xl font-black text-gray-200 mb-4">404</p>
                    <h3 className="text-lg font-semibold text-gray-700 mb-1">Página não encontrada</h3>
                    <p className="text-sm text-gray-400">A URL acessada não existe.</p>
                  </div>
                } />
              </Routes>
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;
