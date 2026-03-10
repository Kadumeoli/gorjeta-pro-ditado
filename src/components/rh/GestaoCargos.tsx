import React, { useState, useEffect } from 'react';
import { Target, Award, TrendingUp, CheckCircle, AlertCircle } from 'lucide-react';
import { cargoService, Cargo } from '../../services/rhService';

const GestaoCargos: React.FC = () => {
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCargo, setSelectedCargo] = useState<Cargo | null>(null);

  useEffect(() => {
    carregarCargos();
  }, []);

  const carregarCargos = async () => {
    try {
      setLoading(true);
      const data = await cargoService.listar();
      setCargos(data);
    } catch (error) {
      console.error('Erro ao carregar cargos:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#7D1F2C]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestão de Cargos (Scorecards)</h2>
          <p className="text-gray-600">{cargos.length} cargos cadastrados</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lista de Cargos */}
        <div className="space-y-3">
          {cargos.map((cargo) => (
            <div
              key={cargo.id}
              onClick={() => setSelectedCargo(cargo)}
              className={`p-4 border rounded-xl cursor-pointer transition-all ${
                selectedCargo?.id === cargo.id
                  ? 'border-[#7D1F2C] bg-red-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 mb-1">{cargo.nome}</h3>
                  <p className="text-sm text-gray-600 line-clamp-2">{cargo.descricao}</p>
                  <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" />
                      {cargo.competencias?.obrigatorias?.length || 0} obrigatórias
                    </div>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-4 h-4" />
                      {cargo.indicadores?.length || 0} indicadores
                    </div>
                  </div>
                </div>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    cargo.status === 'ativo'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {cargo.status}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Detalhes do Cargo */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 sticky top-4 max-h-[calc(100vh-120px)] overflow-y-auto">
          {selectedCargo ? (
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{selectedCargo.nome}</h3>
                <p className="text-gray-600">{selectedCargo.descricao}</p>
              </div>

              <div>
                <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <Target className="w-5 h-5 text-[#7D1F2C]" />
                  Missão
                </h4>
                <p className="text-gray-700 text-sm bg-gray-50 p-3 rounded-lg">
                  {selectedCargo.missao}
                </p>
              </div>

              {selectedCargo.competencias?.obrigatorias && selectedCargo.competencias.obrigatorias.length > 0 && (
                <div>
                  <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    Competências Obrigatórias
                  </h4>
                  <ul className="space-y-2">
                    {selectedCargo.competencias.obrigatorias.map((comp, idx) => (
                      <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                        <span className="text-green-600 mt-1">•</span>
                        <span>{comp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedCargo.competencias?.desejaveis && selectedCargo.competencias.desejaveis.length > 0 && (
                <div>
                  <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <Award className="w-5 h-5 text-blue-600" />
                    Competências Desejáveis
                  </h4>
                  <ul className="space-y-2">
                    {selectedCargo.competencias.desejaveis.map((comp, idx) => (
                      <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                        <span className="text-blue-600 mt-1">•</span>
                        <span>{comp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedCargo.competencias?.comportamentais && selectedCargo.competencias.comportamentais.length > 0 && (
                <div>
                  <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <Award className="w-5 h-5 text-purple-600" />
                    Competências Comportamentais
                  </h4>
                  <ul className="space-y-2">
                    {selectedCargo.competencias.comportamentais.map((comp, idx) => (
                      <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                        <span className="text-purple-600 mt-1">•</span>
                        <span>{comp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedCargo.indicadores && selectedCargo.indicadores.length > 0 && (
                <div>
                  <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-[#D4AF37]" />
                    Indicadores de Performance
                  </h4>
                  <div className="space-y-3">
                    {selectedCargo.indicadores.map((ind: any, idx) => (
                      <div key={idx} className="bg-gray-50 p-3 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-sm text-gray-900">{ind.nome}</span>
                          <span className="text-xs text-[#7D1F2C] font-medium">Meta: {ind.meta}</span>
                        </div>
                        <p className="text-xs text-gray-600">{ind.descricao}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedCargo.remuneracao && (
                <div>
                  <h4 className="font-bold text-gray-900 mb-2">Remuneração</h4>
                  <p className="text-sm text-gray-700 bg-green-50 p-3 rounded-lg">
                    {selectedCargo.remuneracao}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Target className="w-16 h-16 mx-auto mb-3 opacity-20" />
              <p>Selecione um cargo para ver os detalhes</p>
            </div>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
          <div>
            <h4 className="font-bold text-blue-900 mb-1">Scorecards Pré-Cadastrados</h4>
            <p className="text-sm text-blue-800">
              Todos os cargos do Ditado Popular já estão cadastrados com suas competências,
              indicadores e informações completas. Ao criar uma vaga, basta selecionar o cargo
              e o formulário será preenchido automaticamente.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GestaoCargos;
