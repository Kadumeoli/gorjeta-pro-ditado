import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Trash2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import dayjs from '../../lib/dayjs';
import ModalEvento from './ModalEvento';

interface Evento {
  id: string;
  campanha_id: string;
  titulo: string;
  descricao: string;
  tipo: 'publicacao' | 'evento' | 'deadline' | 'reuniao';
  data_inicio: string;
  data_fim: string;
  dia_completo: boolean;
  cor: string;
  campanha_nome?: string;
}

const tipoLabels = {
  publicacao: 'Publicação',
  evento: 'Evento',
  deadline: 'Deadline',
  reuniao: 'Reunião'
};

const tipoColors = {
  publicacao: 'bg-blue-500',
  evento: 'bg-purple-500',
  deadline: 'bg-red-500',
  reuniao: 'bg-green-500'
};

const CalendarioMarketing: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs | null>(null);
  const [showNovoEvento, setShowNovoEvento] = useState(false);
  const [dataInicialEvento, setDataInicialEvento] = useState<string>('');

  useEffect(() => {
    fetchEventos();
  }, [currentDate, view]);

  const fetchEventos = async () => {
    try {
      setLoading(true);
      let startDate, endDate;

      if (view === 'month') {
        startDate = currentDate.startOf('month').startOf('week');
        endDate = currentDate.endOf('month').endOf('week');
      } else if (view === 'week') {
        startDate = currentDate.startOf('week');
        endDate = currentDate.endOf('week');
      } else {
        startDate = currentDate.startOf('day');
        endDate = currentDate.endOf('day');
      }

      const { data, error } = await supabase
        .from('campanhas_timeline')
        .select(`
          *,
          campanhas_marketing!inner(nome)
        `)
        .gte('data_inicio', startDate.toISOString())
        .lte('data_inicio', endDate.toISOString())
        .order('data_inicio', { ascending: true });

      if (error) throw error;

      const eventosFormatados = data?.map(e => ({
        ...e,
        campanha_nome: (e as any).campanhas_marketing?.nome
      })) || [];

      setEventos(eventosFormatados);
    } catch (error) {
      console.error('Erro ao carregar eventos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrevious = () => {
    if (view === 'month') {
      setCurrentDate(currentDate.subtract(1, 'month'));
    } else if (view === 'week') {
      setCurrentDate(currentDate.subtract(1, 'week'));
    } else {
      setCurrentDate(currentDate.subtract(1, 'day'));
    }
  };

  const handleNext = () => {
    if (view === 'month') {
      setCurrentDate(currentDate.add(1, 'month'));
    } else if (view === 'week') {
      setCurrentDate(currentDate.add(1, 'week'));
    } else {
      setCurrentDate(currentDate.add(1, 'day'));
    }
  };

  const handleToday = () => {
    setCurrentDate(dayjs());
  };

  const handleNovoEvento = (data?: string) => {
    setDataInicialEvento(data || dayjs().format('YYYY-MM-DD'));
    setShowNovoEvento(true);
  };

  const handleDeleteEvento = async (id: string) => {
    if (!confirm('Excluir este evento?')) return;
    try {
      await supabase.from('campanhas_timeline').delete().eq('id', id);
      fetchEventos();
    } catch (error) {
      console.error('Erro ao excluir evento:', error);
    }
  };

  const getEventosParaDia = (dia: dayjs.Dayjs) => {
    return eventos.filter(evento =>
      dayjs(evento.data_inicio).isSame(dia, 'day')
    );
  };

  const renderMonthView = () => {
    const startOfMonth = currentDate.startOf('month');
    const endOfMonth = currentDate.endOf('month');
    const startDate = startOfMonth.startOf('week');
    const endDate = endOfMonth.endOf('week');

    const days = [];
    let day = startDate;

    while (day.isBefore(endDate) || day.isSame(endDate, 'day')) {
      days.push(day);
      day = day.add(1, 'day');
    }

    return (
      <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(dia => (
          <div
            key={dia}
            className="bg-gray-50 p-3 text-center font-semibold text-sm text-white/80"
          >
            {dia}
          </div>
        ))}
        {days.map(dia => {
          const eventosNoDia = getEventosParaDia(dia);
          const isCurrentMonth = dia.month() === currentDate.month();
          const isToday = dia.isSame(dayjs(), 'day');

          return (
            <div
              key={dia.format('YYYY-MM-DD')}
              className={`bg-white p-2 min-h-[100px] ${
                isCurrentMonth ? '' : 'opacity-40'
              } ${isToday ? 'ring-2 ring-amber-500' : ''} cursor-pointer hover:bg-gray-50`}
              onClick={() => setSelectedDate(dia)}
            >
              <div className="flex justify-between items-center mb-2">
                <span
                  className={`text-sm font-medium ${
                    isToday
                      ? 'bg-amber-600 text-white w-6 h-6 rounded-full flex items-center justify-center'
                      : 'text-white/80'
                  }`}
                >
                  {dia.date()}
                </span>
              </div>
              <div className="space-y-1">
                {eventosNoDia.slice(0, 3).map(evento => (
                  <div
                    key={evento.id}
                    className={`text-xs p-1 rounded truncate ${
                      tipoColors[evento.tipo]
                    } text-white`}
                  >
                    {evento.titulo}
                  </div>
                ))}
                {eventosNoDia.length > 3 && (
                  <div className="text-xs text-gray-500 px-1">
                    +{eventosNoDia.length - 3} mais
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderWeekView = () => {
    const startOfWeek = currentDate.startOf('week');
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push(startOfWeek.add(i, 'day'));
    }

    return (
      <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200">
        {days.map(dia => {
          const eventosNoDia = getEventosParaDia(dia);
          const isToday = dia.isSame(dayjs(), 'day');

          return (
            <div key={dia.format('YYYY-MM-DD')} className="bg-white">
              <div
                className={`p-3 text-center border-b border-gray-200 ${
                  isToday ? 'bg-amber-50' : ''
                }`}
              >
                <div className="text-xs text-gray-600">
                  {dia.format('ddd')}
                </div>
                <div
                  className={`text-lg font-semibold ${
                    isToday
                      ? 'bg-amber-600 text-white w-8 h-8 rounded-full flex items-center justify-center mx-auto'
                      : 'text-white'
                  }`}
                >
                  {dia.date()}
                </div>
              </div>
              <div className="p-2 space-y-2 min-h-[400px]">
                {eventosNoDia.map(evento => (
                  <div
                    key={evento.id}
                    className={`p-2 rounded text-xs ${
                      tipoColors[evento.tipo]
                    } text-white`}
                  >
                    <div className="font-medium">{evento.titulo}</div>
                    {!evento.dia_completo && (
                      <div className="text-xs mt-1 opacity-90">
                        {dayjs(evento.data_inicio).format('HH:mm')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-white">
            {view === 'month' && currentDate.format('MMMM YYYY')}
            {view === 'week' && `Semana de ${currentDate.startOf('week').format('DD/MM')} - ${currentDate.endOf('week').format('DD/MM')}`}
            {view === 'day' && currentDate.format('DD [de] MMMM [de] YYYY')}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevious}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={handleToday}
              className="px-3 py-1 text-sm font-medium text-white/80 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Hoje
            </button>
            <button
              onClick={handleNext}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setView('month')}
              className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                view === 'month'
                  ? 'bg-white text-white shadow-sm'
                  : 'text-gray-600 hover:text-white'
              }`}
            >
              Mês
            </button>
            <button
              onClick={() => setView('week')}
              className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                view === 'week'
                  ? 'bg-white text-white shadow-sm'
                  : 'text-gray-600 hover:text-white'
              }`}
            >
              Semana
            </button>
            <button
              onClick={() => setView('day')}
              className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                view === 'day'
                  ? 'bg-white text-white shadow-sm'
                  : 'text-gray-600 hover:text-white'
              }`}
            >
              Dia
            </button>
          </div>

          <button
            onClick={() => handleNovoEvento()}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Novo Evento
          </button>
        </div>
      </div>

      <div className="flex gap-4 text-sm">
        {Object.entries(tipoLabels).map(([tipo, label]) => (
          <div key={tipo} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded ${tipoColors[tipo as keyof typeof tipoColors]}`} />
            <span className="text-white/80">{label}</span>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Carregando eventos...</p>
        </div>
      ) : (
        <>
          {view === 'month' && renderMonthView()}
          {view === 'week' && renderWeekView()}
          {view === 'day' && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <p className="text-center text-gray-500">Visualização por dia será implementada</p>
            </div>
          )}
        </>
      )}

      {selectedDate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">
                {selectedDate.format('DD [de] MMMM [de] YYYY')}
              </h3>
              <button
                onClick={() => setSelectedDate(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-3">
              {getEventosParaDia(selectedDate).length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">Nenhum evento neste dia</p>
                  <button
                    onClick={() => {
                      setSelectedDate(null);
                      handleNovoEvento(selectedDate.format('YYYY-MM-DD'));
                    }}
                    className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm"
                  >
                    Criar Evento
                  </button>
                </div>
              ) : (
                getEventosParaDia(selectedDate).map(evento => (
                  <div
                    key={evento.id}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              tipoColors[evento.tipo]
                            } text-white`}
                          >
                            {tipoLabels[evento.tipo]}
                          </span>
                          {evento.campanha_nome && (
                            <span className="text-xs text-gray-600">
                              {evento.campanha_nome}
                            </span>
                          )}
                        </div>
                        <h4 className="font-semibold text-white mb-1">
                          {evento.titulo}
                        </h4>
                        {evento.descricao && (
                          <p className="text-sm text-gray-600">
                            {evento.descricao}
                          </p>
                        )}
                        {!evento.dia_completo && (
                          <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                            <Clock className="w-4 h-4" />
                            {dayjs(evento.data_inicio).format('HH:mm')}
                            {evento.data_fim && (
                              <> - {dayjs(evento.data_fim).format('HH:mm')}</>
                            )}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteEvento(evento.id)}
                        className="p-1.5 hover:bg-red-50 rounded transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setSelectedDate(null);
                  handleNovoEvento(selectedDate.format('YYYY-MM-DD'));
                }}
                className="flex items-center gap-2 text-sm text-amber-600 hover:text-amber-700 font-medium"
              >
                <Plus className="w-4 h-4" />
                Adicionar evento neste dia
              </button>
            </div>
          </div>
        </div>
      )}

      <ModalEvento
        isOpen={showNovoEvento}
        onClose={() => setShowNovoEvento(false)}
        onSaved={() => {
          setShowNovoEvento(false);
          fetchEventos();
        }}
        dataInicial={dataInicialEvento}
      />
    </div>
  );
};

export default CalendarioMarketing;
