import React, { lazy, Suspense, useEffect } from 'react';
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
const ContagemMobile      = lazy(() => import('./components/inventory/contagem/ContagemMobile'));

const PageLoader = () => (
  <div className="flex items-center justify-center h-full min-h-[300px]">
    <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-[#7D1F2C]" />
  </div>
);

function AppContent() {
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
    <div className="flex h-screen overflow-hidden bg-gray-100">

      {/* ── SIDEBAR ── */}
      <aside className="
        hidden lg:flex flex-col w-64
        bg-[#140d0f] border-r border-white/[0.05]
        flex-shrink-0
      ">
        {/* Logo */}
        <div className="flex items-center gap-3 h-14 px-4 border-b border-white/[0.05] flex-shrink-0">
          <div
            className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#7D1F2C,#D4AF37)' }}
          >
            <span className="text-white text-[10px] font-black tracking-tighter">DP</span>
          </div>
          <div>
            <p className="text-[13px] font-bold text-white/90 leading-none tracking-tight">Ditado Popular</p>
            <p className="text-[10px] text-white/30 mt-0.5 tracking-widest uppercase">Gestão</p>
          </div>
        </div>
        <SidebarModern />
      </aside>

      {/* ── MAIN ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Topbar */}
        <header className="h-14 flex items-center px-4 gap-3 bg-[#140d0f] border-b border-white/[0.05] flex-shrink-0">
          <Topbar toggleSidebar={() => {}} user={usuario} onLogout={logout} />
        </header>

        {/* Conteúdo */}
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
