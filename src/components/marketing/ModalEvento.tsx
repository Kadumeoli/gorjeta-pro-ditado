import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import dayjs from '../../lib/dayjs';

interface EventoForm {
  id?: string;
  campanha_id: string;
  titulo: string;
  descricao: string;
  tipo: string;
  data_inicio: string;
  hora_inicio: string;
  data_fim: string;
  hora_fim: string;
  dia_completo: boolean;
  cor: string;
}

interface ModalEventoProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  evento?: EventoForm | null;
  dataInicial?: string;
}

const tipoOptions = [
  { value: 'publicacao', label: 'Publicação', cor: '#3B82F6' },
  { value: 'evento', label: 'Evento', cor: '#8B5CF6' },
  { value: 'deadline', label: 'Deadline', cor: '#EF4444' },
  { value: 'reuniao', label: 'Reunião', cor: '#10B981' }
];

const coresDisponiveis = [
  '#D97706', '#EF4444', '#3B82F6', '#10B981',
  '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'
];

const ModalEvento: React.FC<ModalEventoProps> = ({ isOpen, onClose, onSaved, evento, dataInicial }) => {
  const [form, setForm] = useState<EventoForm>({
    campanha_id: '',
    titulo: '',
    descricao: '',
    tipo: 'publicacao',
    data_inicio: dayjs().format('YYYY-MM-DD'),
    hora_inicio: '09:00',
    data_fim: dayjs().format('YYYY-MM-DD'),
    hora_fim: '10:00',
    dia_completo: false,
    cor: '#D97706'
  });
  const [campanhas, setCampanhas] = useState<{ id: string; nome: string }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchCampanhas();
      if (evento) {
        setForm({
          ...evento,
          data_inicio: evento.data_inicio ? dayjs(evento.data_inicio).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
          hora_inicio: evento.data_inicio ? dayjs(evento.data_inicio).format('HH:mm') : '09:00',
          data_fim: evento.data_fim ? dayjs(evento.data_fim).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
          hora_fim: evento.data_fim ? dayjs(evento.data_fim).format('HH:mm') : '10:00'
        });
      } else {
        const dt = dataInicial || dayjs().format('YYYY-MM-DD');
        setForm({
          campanha_id: '',
          titulo: '',
          descricao: '',
          tipo: 'publicacao',
          data_inicio: dt,
          hora_inicio: '09:00',
          data_fim: dt,
          hora_fim: '10:00',
          dia_completo: false,
          cor: '#D97706'
        });
      }
    }
  }, [isOpen, evento, dataInicial]);

  const fetchCampanhas = async () => {
    const { data } = await supabase
      .from('campanhas_marketing')
      .select('id, nome')
      .not('status', 'in', '("cancelado","concluido")')
      .order('nome');
    setCampanhas(data || []);
  };

  const handleSave = async () => {
    if (!form.titulo.trim()) {
      alert('Título é obrigatório');
      return;
    }
    if (!form.campanha_id) {
      alert('Selecione uma campanha');
      return;
    }

    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      const dataInicio = form.dia_completo
        ? dayjs(form.data_inicio).startOf('day').toISOString()
        : dayjs(`${form.data_inicio} ${form.hora_inicio}`).toISOString();

      const dataFim = form.dia_completo
        ? dayjs(form.data_fim).endOf('day').toISOString()
        : dayjs(`${form.data_fim} ${form.hora_fim}`).toISOString();

      const payload = {
        campanha_id: form.campanha_id,
        titulo: form.titulo,
        descricao: form.descricao,
        tipo: form.tipo,
        data_inicio: dataInicio,
        data_fim: dataFim,
        dia_completo: form.dia_completo,
        cor: form.cor
      };

      if (form.id) {
        const { error } = await supabase
          .from('campanhas_timeline')
          .update(payload)
          .eq('id', form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('campanhas_timeline')
          .insert({ ...payload, created_by: user.id });
        if (error) throw error;
      }

      onSaved();
      onClose();
    } catch (error: any) {
      console.error('Erro ao salvar evento:', error);
      alert('Erro ao salvar: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-amber-50 to-orange-50">
          <h2 className="text-xl font-bold text-gray-900">
            {form.id ? 'Editar Evento' : 'Novo Evento'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white/80 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Campanha *</label>
            <select
              value={form.campanha_id}
              onChange={e => setForm({ ...form, campanha_id: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            >
              <option value="">Selecione a campanha</option>
              {campanhas.map(c => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Título *</label>
            <input
              type="text"
              value={form.titulo}
              onChange={e => setForm({ ...form, titulo: e.target.value })}
              placeholder="Ex: Post Instagram - Happy Hour"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Tipo</label>
            <div className="grid grid-cols-2 gap-2">
              {tipoOptions.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setForm({ ...form, tipo: t.value, cor: t.cor })}
                  className={`px-3 py-2.5 rounded-lg border-2 text-sm font-medium transition-all flex items-center gap-2 ${
                    form.tipo === t.value
                      ? 'border-amber-500 bg-amber-50 text-amber-800'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: t.cor }} />
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
              <input
                type="checkbox"
                checked={form.dia_completo}
                onChange={e => setForm({ ...form, dia_completo: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
              />
              Dia completo
            </label>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Data Início</label>
                <input
                  type="date"
                  value={form.data_inicio}
                  onChange={e => setForm({ ...form, data_inicio: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                />
              </div>
              {!form.dia_completo && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Hora Início</label>
                  <input
                    type="time"
                    value={form.hora_inicio}
                    onChange={e => setForm({ ...form, hora_inicio: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Data Fim</label>
                <input
                  type="date"
                  value={form.data_fim}
                  onChange={e => setForm({ ...form, data_fim: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                />
              </div>
              {!form.dia_completo && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Hora Fim</label>
                  <input
                    type="time"
                    value={form.hora_fim}
                    onChange={e => setForm({ ...form, hora_fim: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                  />
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Cor</label>
            <div className="flex gap-2">
              {coresDisponiveis.map(cor => (
                <button
                  key={cor}
                  type="button"
                  onClick={() => setForm({ ...form, cor })}
                  className={`w-8 h-8 rounded-full transition-all ${
                    form.cor === cor ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: cor }}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Descrição</label>
            <textarea
              value={form.descricao}
              onChange={e => setForm({ ...form, descricao: e.target.value })}
              placeholder="Detalhes do evento..."
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
            />
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
            disabled={saving || !form.titulo.trim() || !form.campanha_id}
            className="px-6 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium disabled:opacity-50"
          >
            {saving ? 'Salvando...' : form.id ? 'Salvar' : 'Criar Evento'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalEvento;
