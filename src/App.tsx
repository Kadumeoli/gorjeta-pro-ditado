import React, { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import SidebarModern from './components/layout/SidebarModern';
import ProtectedRoute from './components/layout/ProtectedRoute';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Topbar from './components/layout/Topbar';
import Login from './pages/Login';
import { testConnection } from './lib/supabase';
import { X } from 'lucide-react';

// Blocos de imports lazy
const Dashboard          = lazy(() => import('./pages/Dashboard'));
const DashboardHome      = lazy(() => import('./pages/DashboardHome'));
const Finance            = lazy(() => import('./pages/Finance'));
const AdvancedInventory  = lazy(() => import('./pages/AdvancedInventory'));
const Staff              = lazy(() => import('./pages/Staff'));
const Musicians          = lazy(() => import('./pages/Musicians'));
const Events             = lazy(() => import('./pages/Events'));
const Settings           = lazy(() => import('./pages/Settings'));
const Solicitacoes       = lazy(() => import('./pages/Solicitacoes'));
const Ocorrencias        = lazy(() => import('./pages/Ocorrencias'));
const ManualUsuario      = lazy(() => import('./pages/ManualUsuario'));
const Recruitment        = lazy(() => import('./pages/Recruitment'));
const PreEntrevista      = lazy(() => import('./pages/PreEntrevista'));
const SolicitacaoPublica = lazy(() => import('./pages/SolicitacaoPublica'));
const Marketing          = lazy(() => import('./pages/Marketing'));
const GestaoEstrategica  = lazy(() => import('./pages/GestaoEstrategica'));
const VisaoEstrategica   = lazy(() => import('./pages/VisaoEstrategica'));
const Entradas           = lazy(() => import('./pages/Entradas'));
const DashboardFinanceiro = lazy(() => import('./pages/DashboardFinanceiro'));
const ZigVendasSync      = lazy(() => import('./pages/ZigVendasSync'));
// Adicionado:
const ZigRecebimentos    = lazy(() => import('./pages/ZigRecebimentos'));

function AppContent() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { usuario, logout } = useAuth();

  const toggleSidebar = () => setSidebarOpen(v => !v);
  const closeSidebar  = () => setSidebarOpen(false);

  useEffect(() => { testConnection(); }, []);

  const rotasPublicas = ['/pre-entrevista', '/solicitacao'];
  const isRotaPublica = rotasPublicas.some(r => window.location.pathname.startsWith(r));

  if (!usuario && !isRotaPublica) return <Login />;

  if (isRotaPublica) {
    return (
      <Suspense fallback={<div>Carregando...</div>}>
        <Routes>
          <Route path="/pre-entrevista" element={<PreEntrevista />} />
          <Route path="/solicitacao"    element={<SolicitacaoPublica />} />
        </Routes>
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      <div className="flex h-screen">

        {/* Overlay mobile */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={closeSidebar} />
        )}

        {/* Sidebar */}
        <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white/90 backdrop-blur-xl border-r border-white/20 shadow-xl transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
          <div className="flex flex-col h-full">

            {/* Logo */}
            <div className="flex items-center justify-between h-16 px-6 border-b border-white/20">
              <div className="flex items-center space-x-3">
                <div className="bg-gradient-to-r from-[#7D1F2C] to-[#D4AF37] p-2.5 rounded-xl shadow-lg">
                  <div className="w-6 h-6 bg-white rounded-sm flex items-center justify-center">
                    <span className="text-xs font-bold bg-gradient-to-r from-[#7D1F2C] to-[#D4AF37] bg-clip-text text-transparent">DP</span>
                  </div>
                </div>
                <div>
                  <h1 className="text-lg font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                    Ditado Popular
                  </h1>
                  <p className="text-xs text-gray-500">Sistema de Gestão</p>
                </div>
              </div>
              <button onClick={closeSidebar} className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors">
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <SidebarModern onNavigate={closeSidebar} />
          </div>
        </div>

        {/* Main */}
        <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
          <Topbar toggleSidebar={toggleSidebar} user={usuario} onLogout={logout} />

          <main className="flex-1 relative overflow-y-auto">
            <div className="p-8">
              <Suspense fallback={<div>Carregando...</div>}>
                <Routes>
                  <Route path="/"                    element={<ProtectedRoute moduloSlug="dashboard">    <DashboardHome />       </ProtectedRoute>} />
                  <Route path="/dashboard"           element={<ProtectedRoute moduloSlug="dashboard">    <Dashboard />           </ProtectedRoute>} />
                  <Route path="/finance"             element={<ProtectedRoute moduloSlug="financeiro">   <Finance />             </ProtectedRoute>} />
                  <Route path="/financeiro"          element={<ProtectedRoute moduloSlug="financeiro">   <DashboardFinanceiro /> </ProtectedRoute>} />
                  <Route path="/advanced-inventory"  element={<ProtectedRoute moduloSlug="estoque">      <AdvancedInventory />   </ProtectedRoute>} />
                  <Route path="/staff"               element={<ProtectedRoute moduloSlug="rh">            <Staff />               </ProtectedRoute>} />
                  <Route path="/recruitment"         element={<ProtectedRoute moduloSlug="rh">            <Recruitment />         </ProtectedRoute>} />
                  <Route path="/musicians"           element={<ProtectedRoute moduloSlug="musicos">      <Musicians />           </ProtectedRoute>} />
                  <Route path="/events"              element={<ProtectedRoute moduloSlug="eventos">      <Events />              </ProtectedRoute>} />
                  <Route path="/solicitacoes"        element={<ProtectedRoute moduloSlug="solicitacoes"> <Solicitacoes />         </ProtectedRoute>} />
                  <Route path="/ocorrencias"         element={<ProtectedRoute moduloSlug="ocorrencias">  <Ocorrencias />         </ProtectedRoute>} />
                  <Route path="/marketing"           element={<ProtectedRoute moduloSlug="marketing">    <Marketing />           </ProtectedRoute>} />
                  <Route path="/gestao-estrategica"  element={<ProtectedRoute moduloSlug="financeiro">   <GestaoEstrategica />   </ProtectedRoute>} />
                  <Route path="/visao-estrategica"   element={<ProtectedRoute moduloSlug="financeiro">   <VisaoEstrategica />    </ProtectedRoute>} />
                  <Route path="/entradas"            element={<ProtectedRoute moduloSlug="financeiro">   <Entradas />            </ProtectedRoute>} />
                  <Route path="/zig-vendas"          element={<ProtectedRoute moduloSlug="estoque">      <ZigVendasSync />       </ProtectedRoute>} />
                  
                  {/* Rota de Zig Recebimentos configurada com o slug financeiro */}
                  <Route path="/zig-recebimentos"    element={<ProtectedRoute moduloSlug="financeiro">   <ZigRecebimentos />     </ProtectedRoute>} />
                  
                  <Route path="/manual"              element={<ManualUsuario />} />
                  <Route path="/settings"            element={<ProtectedRoute moduloSlug="configuracoes"><Settings />           </ProtectedRoute>} />
                  <Route path="*" element={
                    <div className="text-center py-12">
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Página não encontrada</h3>
                      <p className="text-gray-500">A URL que você tentou acessar não existe.</p>
                    </div>
                  } />
                </Routes>
              </Suspense>
            </div>
          </main>
        </div>
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