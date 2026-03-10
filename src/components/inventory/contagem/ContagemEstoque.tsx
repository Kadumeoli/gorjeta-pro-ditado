import React, { useState, useCallback } from 'react';
import type { Contagem, ContagemView } from './types';
import * as service from './contagemService';
import ContagemListView from './ContagemListView';
import ContagemNovaModal from './ContagemNovaModal';
import ContagemContador from './ContagemContador';
import ContagemResultado from './ContagemResultado';
import ContagemHistorico from './ContagemHistorico';
import AmostragemModal from './AmostragemModal';

const ContagemEstoque: React.FC = () => {
  const [view, setView] = useState<ContagemView>('list');
  const [showNovaModal, setShowNovaModal] = useState(false);
  const [showAmostragemModal, setShowAmostragemModal] = useState(false);
  const [contagemId, setContagemId] = useState<string | null>(null);
  const [estoqueName, setEstoqueName] = useState('');

  const handleNovaContagem = useCallback(() => {
    setShowNovaModal(true);
  }, []);

  const handleContagemCreated = useCallback((id: string) => {
    setShowNovaModal(false);
    setContagemId(id);
    service.loadContagemCompleta(id).then((data) => {
      setEstoqueName(data.contagem.estoque_nome);
      setView('counting');
    });
  }, []);

  const handleContinuarContagem = useCallback((contagem: Contagem) => {
    setContagemId(contagem.id);
    setEstoqueName(contagem.estoque_nome);
    setView('counting');
  }, []);

  const handleVerResultado = useCallback((contagem: Contagem) => {
    setContagemId(contagem.id);
    setEstoqueName(contagem.estoque_nome);
    setView('result');
  }, []);

  const handleFinalizar = useCallback(async () => {
    if (!contagemId) return;
    if (!confirm('Deseja finalizar a contagem? Voce podera reabrir depois se necessario.')) return;

    try {
      const result = await service.finalizarContagem(contagemId);
      if (result?.success === false) {
        alert(result.error || 'Erro ao finalizar');
        return;
      }
      setView('result');
    } catch (err: any) {
      alert('Erro ao finalizar: ' + err.message);
    }
  }, [contagemId]);

  const handleReconferir = useCallback(() => {
    setView('counting');
  }, []);

  const handleProcessado = useCallback(() => {
    setView('list');
  }, []);

  const handleVoltar = useCallback(() => {
    setView('list');
  }, []);

  return (
    <div>
      {view === 'list' && (
        <ContagemListView
          onNovaContagem={handleNovaContagem}
          onContinuarContagem={handleContinuarContagem}
          onVerResultado={handleVerResultado}
          onHistorico={() => setView('history')}
          onAmostragem={() => setShowAmostragemModal(true)}
        />
      )}

      {view === 'counting' && contagemId && (
        <ContagemContador
          contagemId={contagemId}
          estoqueName={estoqueName}
          onVoltar={handleVoltar}
          onFinalizar={handleFinalizar}
        />
      )}

      {view === 'result' && contagemId && (
        <ContagemResultado
          contagemId={contagemId}
          onVoltar={handleVoltar}
          onReconferir={handleReconferir}
          onProcessado={handleProcessado}
        />
      )}

      {view === 'history' && (
        <ContagemHistorico
          onVoltar={handleVoltar}
          onVerContagem={handleVerResultado}
        />
      )}

      {showNovaModal && (
        <ContagemNovaModal
          onClose={() => setShowNovaModal(false)}
          onCreated={handleContagemCreated}
        />
      )}

      {showAmostragemModal && (
        <AmostragemModal
          onClose={() => setShowAmostragemModal(false)}
          onCreated={(id) => {
            setShowAmostragemModal(false);
            setContagemId(id);
            service.loadContagemCompleta(id).then((data) => {
              setEstoqueName(data.contagem.estoque_nome);
              setView('counting');
            });
          }}
        />
      )}
    </div>
  );
};

export default ContagemEstoque;
