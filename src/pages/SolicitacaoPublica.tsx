import React, { useState } from 'react';
import { Package, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PageHeader, SectionCard } from '../components/ui';

export default function SolicitacaoPublica() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [numeroSolicitacao, setNumeroSolicitacao] = useState('');
  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    solicitante_nome: '',
    solicitante_email: '',
    solicitante_telefone: '',
    local_servico: '',
    equipamento_afetado: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('solicitacoes')
        .insert({
          titulo: formData.titulo,
          descricao: formData.descricao,
          solicitante_nome: formData.solicitante_nome,
          solicitante_email: formData.solicitante_email || null,
          solicitante_telefone: formData.solicitante_telefone || null,
          local_servico: formData.local_servico || null,
          equipamento_afetado: formData.equipamento_afetado || null,
          origem: 'publica',
          status: 'enviado',
          prioridade: 'normal',
          data_solicitacao: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      setNumeroSolicitacao(data.numero_solicitacao);
      setSuccess(true);
      setFormData({
        titulo: '',
        descricao: '',
        solicitante_nome: '',
        solicitante_email: '',
        solicitante_telefone: '',
        local_servico: '',
        equipamento_afetado: ''
      });
    } catch (error) {
      console.error('Erro ao enviar solicitação:', error);
      alert('Erro ao enviar solicitação. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Solicitação Enviada!
          </h2>
          <p className="text-gray-600 mb-4">
            Sua solicitação foi registrada com sucesso.
          </p>
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600 mb-1">Número da Solicitação:</p>
            <p className="text-2xl font-bold text-blue-600">{numeroSolicitacao}</p>
          </div>
          <p className="text-sm text-gray-500 mb-6">
            Guarde este número para acompanhar o andamento da sua solicitação.
            Nossa equipe irá analisá-la e entrar em contato em breve.
          </p>
          <button
            onClick={() => {
              setSuccess(false);
              setNumeroSolicitacao('');
            }}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Fazer Nova Solicitação
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <Package className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  Nova Solicitação
                </h1>
                <p className="text-blue-100 text-sm">
                  Preencha o formulário abaixo para fazer sua solicitação
                </p>
              </div>
            </div>
          </div>

          {/* Informações */}
          <div className="bg-blue-50 border-l-4 border-blue-400 px-6 py-4">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-blue-900 font-medium mb-1">
                  Informações Importantes:
                </p>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Descreva detalhadamente o que precisa</li>
                  <li>• Informe o local onde o serviço deve ser realizado</li>
                  <li>• Não é necessário informar valores ou fornecedores</li>
                  <li>• Nossa equipe irá complementar as informações técnicas</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {/* Dados do Solicitante */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 pb-2 border-b">
                Seus Dados
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Seu Nome <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="solicitante_nome"
                  value={formData.solicitante_nome}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Digite seu nome completo"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email (opcional)
                  </label>
                  <input
                    type="email"
                    name="solicitante_email"
                    value={formData.solicitante_email}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="seu@email.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Telefone (opcional)
                  </label>
                  <input
                    type="tel"
                    name="solicitante_telefone"
                    value={formData.solicitante_telefone}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
            </div>

            {/* Detalhes da Solicitação */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 pb-2 border-b">
                Detalhes da Solicitação
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Título da Solicitação <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="titulo"
                  value={formData.titulo}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ex: Conserto de ar condicionado, Compra de materiais, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descrição Detalhada <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="descricao"
                  value={formData.descricao}
                  onChange={handleChange}
                  required
                  rows={5}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  placeholder="Descreva detalhadamente o que você precisa, incluindo o motivo e qualquer informação relevante..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Quanto mais detalhes você fornecer, mais rápido conseguiremos atender sua solicitação
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Local onde o serviço deve ser realizado
                </label>
                <input
                  type="text"
                  name="local_servico"
                  value={formData.local_servico}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ex: Salão principal, Cozinha, Escritório, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Equipamento ou Item Afetado (se aplicável)
                </label>
                <input
                  type="text"
                  name="equipamento_afetado"
                  value={formData.equipamento_afetado}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ex: Ar condicionado da sala 2, Impressora HP, etc."
                />
              </div>
            </div>

            {/* Botões */}
            <div className="flex gap-4 pt-6 border-t">
              <button
                type="button"
                onClick={() => setFormData({
                  titulo: '',
                  descricao: '',
                  solicitante_nome: '',
                  solicitante_email: '',
                  solicitante_telefone: '',
                  local_servico: '',
                  equipamento_afetado: ''
                })}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Limpar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Enviando...' : 'Enviar Solicitação'}
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-gray-600">
          <p>Após o envio, você receberá um número de protocolo.</p>
          <p>Nossa equipe analisará sua solicitação e entrará em contato.</p>
        </div>
      </div>
    </div>
  );
}
