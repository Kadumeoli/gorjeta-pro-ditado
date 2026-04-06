import React, { useState } from 'react';
import {
  Users,
  Briefcase,
  UserPlus,
  ClipboardList,
  Target,
  TrendingUp,
  Award,
  FileText,
  Star
} from 'lucide-react';
import GestaoVagas from '../components/rh/GestaoVagas';
import GestaoCandidaturas from '../components/rh/GestaoCandidaturas';
import GestaoCargos from '../components/rh/GestaoCargos';
import DashboardRH from '../components/rh/DashboardRH';
import BancoTalentos from '../components/rh/BancoTalentos';
import { PageHeader } from '../components/ui';

type TabType = 'dashboard' | 'vagas' | 'candidaturas' | 'cargos' | 'talentos';

const Recruitment: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
    { id: 'vagas', label: 'Vagas', icon: Briefcase },
    { id: 'candidaturas', label: 'Candidaturas', icon: Users },
    { id: 'talentos', label: 'Banco de Talentos', icon: Star },
    { id: 'cargos', label: 'Cargos', icon: Target }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 bg-gradient-to-br from-[#7D1F2C] to-[#D4AF37] rounded-xl">
            <UserPlus className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Recrutamento & Seleção</h1>
            <p className="text-gray-600">
              Sistema inteligente de R&S com análise de IA
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-lg mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`
                    flex items-center gap-2 px-6 py-4 border-b-2 font-medium text-sm
                    transition-colors duration-200
                    ${
                      activeTab === tab.id
                        ? 'border-[#7D1F2C] text-[#7D1F2C]'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        {activeTab === 'dashboard' && <DashboardRH />}
        {activeTab === 'vagas' && <GestaoVagas />}
        {activeTab === 'candidaturas' && <GestaoCandidaturas />}
        {activeTab === 'talentos' && <BancoTalentos />}
        {activeTab === 'cargos' && <GestaoCargos />}
      </div>

      {/* Info Box */}
      <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-100 rounded-lg">
            <Award className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-blue-900 mb-2">
              Cultura Ditado Popular
            </h3>
            <p className="text-blue-800 text-sm leading-relaxed">
              <strong>DNA:</strong> "Embriagar os corações de felicidade"<br />
              <strong>Valores:</strong> Hospitalidade • Respeito • Qualidade • Inovação • Proatividade
            </p>
            <p className="text-blue-700 text-xs mt-2">
              Nossa IA avalia candidatos com base nesses valores fundamentais
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Recruitment;
