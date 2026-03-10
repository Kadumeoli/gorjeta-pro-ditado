import React, { useState } from "react";

const ConfiguracoesRH: React.FC = () => {
  const [cfg, setCfg] = useState({
    percentual_base: 0.05,
    bonus_meta1_pct: 0.01,
    bonus_meta2_pct: 0.02,
    meta1_valor: 17000,
    meta2_valor: 24000,
    teto_adiantamento_semanal: 395,
    adiantamento_abate_saldo: true,
  });

  function handleNumber<K extends keyof typeof cfg>(key: K, value: string) {
    const parsed = Number(value.replace(",", "."));
    setCfg((s) => ({ ...s, [key]: isNaN(parsed) ? s[key] : parsed }) as typeof s);
  }

  function handleBoolean<K extends keyof typeof cfg>(key: K, value: boolean) {
    setCfg((s) => ({ ...s, [key]: value }));
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-semibold">Configurações de Gorjetas</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border rounded-md p-3 space-y-2">
          <div className="text-sm font-semibold">Percentuais</div>
          <label className="flex items-center justify-between text-sm">
            <span>% Base</span>
            <input
              className="border rounded px-2 py-1 w-32 text-right"
              value={cfg.percentual_base}
              onChange={(e) => handleNumber("percentual_base", e.target.value)}
            />
          </label>
          <label className="flex items-center justify-between text-sm">
            <span>Bônus Meta 1</span>
            <input
              className="border rounded px-2 py-1 w-32 text-right"
              value={cfg.bonus_meta1_pct}
              onChange={(e) => handleNumber("bonus_meta1_pct", e.target.value)}
            />
          </label>
          <label className="flex items-center justify-between text-sm">
            <span>Bônus Meta 2</span>
            <input
              className="border rounded px-2 py-1 w-32 text-right"
              value={cfg.bonus_meta2_pct}
              onChange={(e) => handleNumber("bonus_meta2_pct", e.target.value)}
            />
          </label>
        </div>

        <div className="border rounded-md p-3 space-y-2">
          <div className="text-sm font-semibold">Metas (faixas semanais)</div>
          <label className="flex items-center justify-between text-sm">
            <span>Meta 1 – de (R$)</span>
            <input
              className="border rounded px-2 py-1 w-32 text-right"
              value={cfg.meta1_valor}
              onChange={(e) => handleNumber("meta1_valor", e.target.value)}
            />
          </label>
          <label className="flex items-center justify-between text-sm">
            <span>Meta 2 – a partir de (R$)</span>
            <input
              className="border rounded px-2 py-1 w-32 text-right"
              value={cfg.meta2_valor}
              onChange={(e) => handleNumber("meta2_valor", e.target.value)}
            />
          </label>
          <p className="text-xs text-gray-500">
            Regras: Meta 1 válida de R$ 17.000 até R$ 23.999 (+1%). Meta 2 a partir de R$ 24.000 (+2%).
          </p>
        </div>

        <div className="border rounded-md p-3 space-y-2">
          <div className="text-sm font-semibold">Adiantamentos (Vales)</div>
          <label className="flex items-center justify-between text-sm">
            <span>Teto semanal por garçom (R$)</span>
            <input
              className="border rounded px-2 py-1 w-32 text-right"
              value={cfg.teto_adiantamento_semanal}
              onChange={(e) => handleNumber("teto_adiantamento_semanal", e.target.value)}
            />
          </label>
          <label className="flex items-center justify-between text-sm">
            <span>Abater adiantamento no saldo?</span>
            <input
              type="checkbox"
              checked={cfg.adiantamento_abate_saldo}
              onChange={(e) => handleBoolean("adiantamento_abate_saldo", e.target.checked)}
            />
          </label>
          <p className="text-xs text-gray-500">
            Com abate ativo: saldo = máx(0, líquida − (pagos + adiantamentos)).
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <button className="px-3 py-2 border rounded-md text-sm" onClick={() => alert("Salvar (integração pendente)")}>
          Salvar
        </button>
        <button className="px-3 py-2 border rounded-md text-sm" onClick={() => console.log("Preview cfg:", cfg)}>
          Pré-visualizar
        </button>
      </div>

      <p className="text-xs text-gray-500">
        *Este componente é um placeholder para compilar. Integre com Supabase/config_gorjetas quando desejar persistir.
      </p>
    </div>
  );
};

export default ConfiguracoesRH;