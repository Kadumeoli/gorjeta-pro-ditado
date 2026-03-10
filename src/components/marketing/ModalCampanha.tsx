import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import dayjs from '../../lib/dayjs';

interface CampanhaForm {
  id?: string;
  nome: string;
  descricao: string;
  objetivo: string;
  status: string;
  prioridade: string;
  tipo: string;
  canais: string[];
  data_inicio: string;
  data_fim: string;
  budget_planejado: number;
  tags: string[];
  brief_id: string | null;
  responsavel_gestor_id: string | null;
  responsavel_designer_id: string | null;
  responsavel_trafego_id: string | null;
}

interface ModalCampanhaProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  campanha?: CampanhaForm | null;
}

const statusOptions = [
  { value: 'draft', label: 'Rascunho' },
  { value: 'em_producao', label: 'Em Produção' },
  { value: 'em_revisao', label: 'Em Revisão' },
  { value: 'aprovado', label: 'Aprovado' },
  { value: 'agendado', label: 'Agendado' },
  { value: 'publicado', label: 'Publicado' },
  { value: 'pausado', label: 'Pausado' },
  { value: 'concluido', label: 'Concluído' },
  { value: 'cancelado', label: 'Cancelado' }
];

const prioridadeOptions = [
  { value: 'baixa', label: 'Baixa' },
  { value: 'media', label: 'Média' },
  { value: 'alta', label: 'Alta' },
  { value: 'urgente', label: 'Urgente' }
];

const tipoOptions = [
  { value: 'pago', label: 'Pago' },
  { value: 'organico', label: 'Orgânico' },
  { value: 'hibrido', label: 'Híbrido' }
];

const canaisDisponiveis = [
  'Facebook', 'Instagram', 'Google Ads', 'TikTok',
  'YouTube', 'LinkedIn', 'Twitter/X', 'WhatsApp',
  'Email', 'SMS', 'Outdoor', 'Rádio'
];

const emptyForm: CampanhaForm = {
  nome: '',
  descricao: '',
  objetivo: '',
  status: 'draft',
  prioridade: 'media',
  tipo: 'hibrido',
  canais: [],
  data_inicio: dayjs().format('YYYY-MM-DD'),
  data_fim: dayjs().add(30, 'day').format('YYYY-MM-DD'),
  budget_planejado: 0,
  tags: [],
  brief_id: null,
  responsavel_gestor_id: null,
  responsavel_designer_id: null,
  responsavel_trafego_id: null
};

const ModalCampanha: React.FC<ModalCampanhaProps> = ({ isOpen, onClose, onSaved, campanha }) => {
  const [form, setForm] = useState<CampanhaForm>(emptyForm);
  const [novaTag, setNovaTag] = useState('');
  const [saving, setSaving] = useState(false);
  const [briefs, setBriefs] = useState<{ id: string; nome: string }[]>([]);
  const [step, setStep] = useState(1);

  useEffect(() => {
    if (isOpen) {
      if (campanha) {
        setForm({
          ...emptyForm,
          ...campanha,
          data_inicio: campanha.data_inicio || dayjs().format('YYYY-MM-DD'),
          data_fim: campanha.data_fim || dayjs().add(30, 'day').format('YYYY-MM-DD')
        });
      } else {
        setForm(emptyForm);
      }
      setStep(1);
      fetchBriefs();
    }
  }, [isOpen, campanha]);

  const fetchBriefs = async () => {
    const { data } = await supabase
      .from('briefs_marketing')
      .select('id, nome')
      .eq('status', 'aberto')
      .order('created_at', { ascending: false });
    setBriefs(data || []);
  };

  const handleAddTag = () => {
    if (novaTag.trim() && !form.tags.includes(novaTag.trim())) {
      setForm({ ...form, tags: [...form.tags, novaTag.trim()] });
      setNovaTag('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setForm({ ...form, tags: form.tags.filter(t => t !== tag) });
  };

  const toggleCanal = (canal: string) => {
    if (form.canais.includes(canal)) {
      setForm({ ...form, canais: form.canais.filter(c => c !== canal) });
    } else {
      setForm({ ...form, canais: [...form.canais, canal] });
    }
  };

  const handleSave = async () => {
    if (!form.nome.trim()) {
      alert('Nome da campanha é obrigatório');
      return;
    }

    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      const payload = {
        nome: form.nome,
        descricao: form.descricao,
        objetivo: form.objetivo,
        status: form.status,
        prioridade: form.prioridade,
        tipo: form.tipo,
        canais: form.canais,
        data_inicio: form.data_inicio || null,
        data_fim: form.data_fim || null,
        budget_planejado: form.budget_planejado,
        tags: form.tags,
        brief_id: form.brief_id || null,
        responsavel_gestor_id: form.responsavel_gestor_id || null,
        responsavel_designer_id: form.responsavel_designer_id || null,
        responsavel_trafego_id: form.responsavel_trafego_id || null
      };

      if (form.id) {
        const { error } = await supabase
          .from('campanhas_marketing')
          .update(payload)
          .eq('id', form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('campanhas_marketing')
          .insert({ ...payload, created_by: user.id });
        if (error) throw error;
      }

      onSaved();
      onClose();
    } catch (error: any) {
      console.error('Erro ao salvar campanha:', error);
      alert('Erro ao salvar: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-amber-50 to-orange-50">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {form.id ? 'Editar Campanha' : 'Nova Campanha'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">Etapa {step} de 3</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/80 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="flex border-b border-gray-200">
          {[
            { n: 1, label: 'Informações' },
            { n: 2, label: 'Canais e Budget' },
            { n: 3, label: 'Configurações' }
          ].map(s => (
            <button
              key={s.n}
              onClick={() => setStep(s.n)}
              className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${
                step === s.n
                  ? 'border-amber-600 text-amber-700 bg-amber-50/50'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Nome da Campanha *
                </label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={e => setForm({ ...form, nome: e.target.value })}
                  placeholder="Ex: Promoção Happy Hour Verão"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Objetivo
                </label>
                <input
                  type="text"
                  value={form.objetivo}
                  onChange={e => setForm({ ...form, objetivo: e.target.value })}
                  placeholder="Ex: Aumentar vendas em 20% durante o happy hour"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Descrição
                </label>
                <textarea
                  value={form.descricao}
                  onChange={e => setForm({ ...form, descricao: e.target.value })}
                  placeholder="Descreva os detalhes da campanha..."
                  rows={4}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
                  <select
                    value={form.status}
                    onChange={e => setForm({ ...form, status: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  >
                    {statusOptions.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Prioridade</label>
                  <select
                    value={form.prioridade}
                    onChange={e => setForm({ ...form, prioridade: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  >
                    {prioridadeOptions.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Data Início</label>
                  <input
                    type="date"
                    value={form.data_inicio}
                    onChange={e => setForm({ ...form, data_inicio: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Data Fim</label>
                  <input
                    type="date"
                    value={form.data_fim}
                    onChange={e => setForm({ ...form, data_fim: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Tipo</label>
                <div className="grid grid-cols-3 gap-3">
                  {tipoOptions.map(o => (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => setForm({ ...form, tipo: o.value })}
                      className={`px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                        form.tipo === o.value
                          ? 'border-amber-600 bg-amber-50 text-amber-800'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Canais de Divulgação
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {canaisDisponiveis.map(canal => (
                    <button
                      key={canal}
                      type="button"
                      onClick={() => toggleCanal(canal)}
                      className={`px-3 py-2 rounded-lg border text-sm transition-all ${
                        form.canais.includes(canal)
                          ? 'border-amber-600 bg-amber-50 text-amber-800 font-medium'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {canal}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Budget Planejado (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.budget_planejado}
                  onChange={e => setForm({ ...form, budget_planejado: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Brief Vinculado
                </label>
                <select
                  value={form.brief_id || ''}
                  onChange={e => setForm({ ...form, brief_id: e.target.value || null })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  <option value="">Nenhum brief vinculado</option>
                  {briefs.map(b => (
                    <option key={b.id} value={b.id}>{b.nome}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Tags</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={novaTag}
                    onChange={e => setNovaTag(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                    placeholder="Adicionar tag..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <Plus className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
                {form.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {form.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm"
                      >
                        {tag}
                        <button onClick={() => handleRemoveTag(tag)} className="hover:text-red-600">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="flex gap-2">
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium"
              >
                Anterior
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium"
              disabled={saving}
            >
              Cancelar
            </button>
            {step < 3 ? (
              <button
                onClick={() => setStep(step + 1)}
                className="px-6 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium"
              >
                Próximo
              </button>
            ) : (
              <button
                onClick={handleSave}
                disabled={saving || !form.nome.trim()}
                className="px-6 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium disabled:opacity-50"
              >
                {saving ? 'Salvando...' : form.id ? 'Salvar Alterações' : 'Criar Campanha'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalCampanha;
