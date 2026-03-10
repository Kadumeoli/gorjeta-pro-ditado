import React from "react";

const RelatoriosRH: React.FC = () => {
  return (
    <div className="p-4 space-y-3">
      <h2 className="text-lg font-semibold">Relatórios de RH</h2>
      <p className="text-sm text-gray-600">
        Em breve: exportações (Excel/PDF), filtros por período/colaborador,
        e relatórios de gorjetas, descontos e adiantamentos.
      </p>

      <div className="rounded-md border p-3">
        <button className="px-3 py-2 border rounded-md text-sm" disabled>
          Exportar (em breve)
        </button>
      </div>
    </div>
  );
};

export default RelatoriosRH;