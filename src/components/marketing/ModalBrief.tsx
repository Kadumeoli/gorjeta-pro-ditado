import React, { useState, useEffect } from 'react';
import { X, Plus, Check, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import dayjs from '../../lib/dayjs';

interface ChecklistItem {
  label: string;
  done: boolean;
}

interface BriefForm {
  id?: string;
  nome: string;
  objetivo: string;
  publico_alvo: string;
  mensagem_principal: string;
  cta: string;
  formatos_necessarios: string[];
  referencias: string[];
  deadline: string;
  budget: number;
  observacoes: string;
  checklist: ChecklistItem[];
  status: string;
  template: boolean;
}

interface ModalBriefProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  brief?: BriefForm | null;
}

const emptyBrief: BriefForm = {
  nome: '',
  objetivo: '',
  publico_alvo: '',
  mensagem_principal: '',
  cta: '',
  formatos_necessarios: [],
  referencias: [],
  deadline: dayjs().add(7, 'day').format('YYYY-MM-DD'),
  budget: 0,
  observacoes: '',
  checklist: [],
  status: 'aberto',
  template: false
};

const formatosComuns = [
  '1080x1080 (Feed)', '1080x1920 (Stories)', '1200x628 (Facebook)',
  '1920x1080 (YouTube)', '1080x1350 (Portrait)', '600x600 (Thumb)',
  'Video 15s', 'Video 30s', 'Video 60s', 'Carrossel'
];

const ModalBrief: React.FC<ModalBriefProps> = ({ isOpen, onClose, onSaved, brief }) => {
  const [form, setForm] = useState<BriefForm>(emptyBrief);
  const [saving, setSaving] = useState(false);
  const [novoCheckItem, setNovoCheckItem] = useState('');
  const [novaReferencia, setNovaReferencia] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (brief) {
        setForm({
          ...emptyBrief,
          ...brief,
          formatos_necessarios: Array.isArray(brief.formatos_necessarios) ? brief.formatos_necessarios : [],
          referencias: Array.isArray(brief.referencias) ? brief.referencias : [],
          checklist: Array.isArray(brief.checklist) ? brief.checklist : []
        });
      } else {
        setForm(emptyBrief);
      }
    }
  }, [isOpen, brief]);

  const handleAddCheckItem = () => {
    if (!novoCheckItem.trim()) return;
    setForm({
      ...form,
      checklist: [...form.checklist, { label: novoCheckItem.trim(), done: false }]
    });
    setNovoCheckItem('');
  };

  const handleToggleCheckItem = (idx: number) => {
    setForm({
      ...form,
      checklist: form.checklist.map((item, i) =>
        i === idx ? { ...item, done: !item.done } : item
      )
    });
  };

  const handleRemoveCheckItem = (idx: number) => {
    setForm({ ...form, checklist: form.checklist.filter((_, i) => i !== idx) });
  };

  const handleAddReferencia = () => {
    if (!novaReferencia.trim()) return;
    setForm({ ...form, referencias: [...form.referencias, novaReferencia.trim()] });
    setNovaReferencia('');
  };

  const toggleFormato = (formato: string) => {
    if (form.formatos_necessarios.includes(formato)) {
      setForm({ ...form, formatos_necessarios: form.formatos_necessarios.filter(f => f !== formato) });
    } else {
      setForm({ ...form, formatos_necessarios: [...form.formatos_necessarios, formato] });
    }
  };

  const handleSave = async () => {
    if (!form.nome.trim()) {
      alert('Nome do brief é obrigatório');
      return;
    }

    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      const payload = {
        nome: form.nome,
        objetivo: form.objetivo,
        publico_alvo: form.publico_alvo,
        mensagem_principal: form.mensagem_principal,
        cta: form.cta,
        formatos_necessarios: form.formatos_necessarios,
        referencias: form.referencias,
        deadline: form.deadline || null,
        budget: form.budget,
        observacoes: form.observacoes,
        checklist: form.checklist,
        status: form.status,
        template: form.template
      };

      if (form.id) {
        const { error } = await supabase
          .from('briefs_marketing')
          .update(payload)
          .eq('id', form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('briefs_marketing')
          .insert({ ...payload, created_by: user.id });
        if (error) throw error;
      }

      onSaved();
      onClose();
    } catch (error: any) {
      console.error('Erro ao salvar brief:', error);
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
              {form.id ? 'Editar Brief' : 'Novo Brief'}
            </h2>
            <p className="text-sm text-gray-600 mt-0.5">Brief criativo estruturado</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/80 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome do Brief *</label>
              <input
                type="text"
                value={form.nome}
                onChange={e => setForm({ ...form, nome: e.target.value })}
                placeholder="Ex: Brief Happy Hour Verão 2025"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Objetivo</label>
              <textarea
                value={form.objetivo}
                onChange={e => setForm({ ...form, objetivo: e.target.value })}
                placeholder="Qual o objetivo principal desta campanha?"
                rows={2}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Público-Alvo</label>
              <input
                type="text"
                value={form.publico_alvo}
                onChange={e => setForm({ ...form, publico_alvo: e.target.value })}
                placeholder="Ex: Jovens 18-35, classe B"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">CTA</label>
              <input
                type="text"
                value={form.cta}
                onChange={e => setForm({ ...form, cta: e.target.value })}
                placeholder="Ex: Reserve sua mesa!"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Mensagem Principal</label>
              <textarea
                value={form.mensagem_principal}
                onChange={e => setForm({ ...form, mensagem_principal: e.target.value })}
                placeholder="Qual a mensagem-chave que queremos comunicar?"
                rows={2}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Formatos Necessários</label>
            <div className="flex flex-wrap gap-2">
              {formatosComuns.map(formato => (
                <button
                  key={formato}
                  type="button"
                  onClick={() => toggleFormato(formato)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                    form.formatos_necessarios.includes(formato)
                      ? 'border-amber-500 bg-amber-50 text-amber-800'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {formato}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Deadline</label>
              <input
                type="date"
                value={form.deadline}
                onChange={e => setForm({ ...form, deadline: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Budget (R$)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.budget}
                onChange={e => setForm({ ...form, budget: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Referências</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={novaReferencia}
                onChange={e => setNovaReferencia(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddReferencia())}
                placeholder="URL ou referência..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
              />
              <button
                type="button"
                onClick={handleAddReferencia}
                className="px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Plus className="w-4 h-4 text-gray-600" />
              </button>
            </div>
            {form.referencias.length > 0 && (
              <div className="space-y-1">
                {form.referencias.map((ref, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    <span className="flex-1 text-gray-700 truncate">{ref}</span>
                    <button
                      onClick={() => setForm({ ...form, referencias: form.referencias.filter((_, i) => i !== idx) })}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Checklist</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={novoCheckItem}
                onChange={e => setNovoCheckItem(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddCheckItem())}
                placeholder="Adicionar item ao checklist..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
              />
              <button
                type="button"
                onClick={handleAddCheckItem}
                className="px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Plus className="w-4 h-4 text-gray-600" />
              </button>
            </div>
            {form.checklist.length > 0 && (
              <div className="space-y-1.5">
                {form.checklist.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 group">
                    <button
                      type="button"
                      onClick={() => handleToggleCheckItem(idx)}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        item.done ? 'bg-green-500 border-green-500' : 'border-gray-300 hover:border-amber-400'
                      }`}
                    >
                      {item.done && <Check className="w-3 h-3 text-white" />}
                    </button>
                    <span className={`flex-1 text-sm ${item.done ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                      {item.label}
                    </span>
                    <button
                      onClick={() => handleRemoveCheckItem(idx)}
                      className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Observações</label>
            <textarea
              value={form.observacoes}
              onChange={e => setForm({ ...form, observacoes: e.target.value })}
              placeholder="Observações adicionais..."
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
            />
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.template}
                onChange={e => setForm({ ...form, template: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
              />
              Salvar como template reutilizável
            </label>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium"
            disabled={saving}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !form.nome.trim()}
            className="px-6 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium disabled:opacity-50"
          >
            {saving ? 'Salvando...' : form.id ? 'Salvar' : 'Criar Brief'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalBrief;
