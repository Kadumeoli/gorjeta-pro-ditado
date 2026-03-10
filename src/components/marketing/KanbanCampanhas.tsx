import React, { useState, useEffect, useRef } from 'react';
import {
  Plus, Search, Filter, Calendar, DollarSign, Users, Tag,
  MoreVertical, GripVertical, ChevronDown, X
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import dayjs from '../../lib/dayjs';
import ModalCampanha from './ModalCampanha';
import DetalhesCampanha from './DetalhesCampanha';

interface Campanha {
  id: string;
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
  budget_gasto: number;
  tags: string[];
  brief_id: string | null;
  responsavel_gestor_id: string;
  responsavel_designer_id: string;
  responsavel_trafego_id: string;
  created_at: string;
}

const colunas = [
  { id: 'draft', titulo: 'Ideias', cor: 'border-gray-300', dotColor: 'bg-gray-400' },
  { id: 'em_producao', titulo: 'Em Produção', cor: 'border-blue-400', dotColor: 'bg-blue-500' },
  { id: 'em_revisao', titulo: 'Em Revisão', cor: 'border-yellow-400', dotColor: 'bg-yellow-500' },
  { id: 'aprovado', titulo: 'Aprovado', cor: 'border-green-400', dotColor: 'bg-green-500' },
  { id: 'agendado', titulo: 'Agendado', cor: 'border-sky-400', dotColor: 'bg-sky-500' },
  { id: 'publicado', titulo: 'Publicado', cor: 'border-emerald-400', dotColor: 'bg-emerald-500' }
];

const prioridadeCores: Record<string, string> = {
  baixa: 'bg-gray-100 text-gray-700',
  media: 'bg-blue-100 text-blue-700',
  alta: 'bg-orange-100 text-orange-700',
  urgente: 'bg-red-100 text-red-700'
};

const filtroPrioridade = [
  { value: 'todas', label: 'Todas' },
  { value: 'baixa', label: 'Baixa' },
  { value: 'media', label: 'Média' },
  { value: 'alta', label: 'Alta' },
  { value: 'urgente', label: 'Urgente' }
];

const filtroTipo = [
  { value: 'todos', label: 'Todos' },
  { value: 'pago', label: 'Pago' },
  { value: 'organico', label: 'Orgânico' },
  { value: 'hibrido', label: 'Híbrido' }
];

const KanbanCampanhas: React.FC = () => {
  const [campanhas, setCampanhas] = useState<Campanha[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCampanhaId, setSelectedCampanhaId] = useState<string | null>(null);
  const [showModalCampanha, setShowModalCampanha] = useState(false);
  const [editingCampanha, setEditingCampanha] = useState<any>(null);
  const [draggedCampanha, setDraggedCampanha] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [filtroPrio, setFiltroPrio] = useState('todas');
  const [filtroTipoSel, setFiltroTipoSel] = useState('todos');
  const [menuAberto, setMenuAberto] = useState<string | null>(null);

  useEffect(() => {
    fetchCampanhas();
  }, []);

  const fetchCampanhas = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('campanhas_marketing')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCampanhas(data || []);
    } catch (error) {
      console.error('Erro ao carregar campanhas:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCampanhasFiltradas = (status: string) => {
    return campanhas.filter(c => {
      if (c.status !== status) return false;
      if (searchTerm && !c.nome.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (filtroPrio !== 'todas' && c.prioridade !== filtroPrio) return false;
      if (filtroTipoSel !== 'todos' && c.tipo !== filtroTipoSel) return false;
      return true;
    });
  };

  const handleDragStart = (e: React.DragEvent, campanhaId: string) => {
    setDraggedCampanha(campanhaId);
    e.dataTransfer.effectAllowed = 'move';
    const el = e.currentTarget as HTMLElement;
    el.style.opacity = '0.5';
  };

  const handleDragEnd = (e: React.DragEvent) => {
    const el = e.currentTarget as HTMLElement;
    el.style.opacity = '1';
    setDraggedCampanha(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(columnId);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    setDragOverColumn(null);

    if (!draggedCampanha) return;
    const campanha = campanhas.find(c => c.id === draggedCampanha);
    if (!campanha || campanha.status === newStatus) return;

    setCampanhas(prev => prev.map(c =>
      c.id === draggedCampanha ? { ...c, status: newStatus } : c
    ));

    try {
      const { error } = await supabase
        .from('campanhas_marketing')
        .update({ status: newStatus })
        .eq('id', draggedCampanha);

      if (error) throw error;
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      fetchCampanhas();
    }
  };

  const handleMoverPara = async (campanhaId: string, novoStatus: string) => {
    setCampanhas(prev => prev.map(c =>
      c.id === campanhaId ? { ...c, status: novoStatus } : c
    ));
    setMenuAberto(null);

    try {
      const { error } = await supabase
        .from('campanhas_marketing')
        .update({ status: novoStatus })
        .eq('id', campanhaId);
      if (error) throw error;
    } catch (error) {
      console.error('Erro ao mover:', error);
      fetchCampanhas();
    }
  };

  const handleEditarCampanha = (campanha: Campanha) => {
    setEditingCampanha(campanha);
    setShowModalCampanha(true);
    setMenuAberto(null);
  };

  const handleExcluir = async (id: string) => {
    if (!confirm('Excluir esta campanha?')) return;
    setMenuAberto(null);
    try {
      const { error } = await supabase
        .from('campanhas_marketing')
        .delete()
        .eq('id', id);
      if (error) throw error;
      setCampanhas(prev => prev.filter(c => c.id !== id));
    } catch (error) {
      console.error('Erro ao excluir:', error);
    }
  };

  const totalFiltered = campanhas.filter(c => {
    if (searchTerm && !c.nome.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (filtroPrio !== 'todas' && c.prioridade !== filtroPrio) return false;
    if (filtroTipoSel !== 'todos' && c.tipo !== filtroTipoSel) return false;
    return true;
  }).length;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar campanhas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-3 py-2 border rounded-lg transition-colors text-sm ${
            showFilters ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-gray-300 hover:bg-gray-50 text-gray-600'
          }`}
        >
          <Filter className="w-4 h-4" />
          Filtros
        </button>
        <button
          onClick={() => {
            setEditingCampanha(null);
            setShowModalCampanha(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Nova Campanha
        </button>
      </div>

      {showFilters && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4 flex items-center gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Prioridade</label>
            <select
              value={filtroPrio}
              onChange={e => setFiltroPrio(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
            >
              {filtroPrioridade.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
            <select
              value={filtroTipoSel}
              onChange={e => setFiltroTipoSel(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
            >
              {filtroTipo.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>
          <div className="ml-auto self-end">
            <span className="text-xs text-gray-500">{totalFiltered} campanhas</span>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-x-auto -mx-6 px-6">
        <div className="inline-flex gap-4 h-full min-w-full pb-4">
          {colunas.map(coluna => {
            const campanhasDaColuna = getCampanhasFiltradas(coluna.id);
            const isOver = dragOverColumn === coluna.id;

            return (
              <div
                key={coluna.id}
                className={`flex-shrink-0 w-72 rounded-xl transition-all ${
                  isOver ? 'bg-amber-50 ring-2 ring-amber-300' : 'bg-gray-50'
                }`}
                onDragOver={e => handleDragOver(e, coluna.id)}
                onDragLeave={handleDragLeave}
                onDrop={e => handleDrop(e, coluna.id)}
              >
                <div className={`flex items-center gap-2 p-4 pb-3 border-b-2 ${coluna.cor}`}>
                  <div className={`w-2.5 h-2.5 rounded-full ${coluna.dotColor}`} />
                  <h3 className="font-semibold text-gray-800 text-sm">{coluna.titulo}</h3>
                  <span className="ml-auto px-2 py-0.5 bg-white rounded-full text-xs font-medium text-gray-600 shadow-sm">
                    {campanhasDaColuna.length}
                  </span>
                </div>

                <div className="p-3 space-y-2.5 min-h-[200px]">
                  {campanhasDaColuna.map(campanha => (
                    <div
                      key={campanha.id}
                      draggable
                      onDragStart={e => handleDragStart(e, campanha.id)}
                      onDragEnd={handleDragEnd}
                      className="bg-white rounded-lg p-3.5 border border-gray-200 hover:shadow-md transition-all cursor-grab active:cursor-grabbing group"
                    >
                      <div className="flex items-start justify-between mb-1.5">
                        <h4
                          className="font-medium text-gray-900 text-sm flex-1 cursor-pointer hover:text-amber-700 transition-colors"
                          onClick={() => setSelectedCampanhaId(campanha.id)}
                        >
                          {campanha.nome}
                        </h4>
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setMenuAberto(menuAberto === campanha.id ? null : campanha.id);
                            }}
                            className="p-1 hover:bg-gray-100 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreVertical className="w-3.5 h-3.5 text-gray-400" />
                          </button>
                          {menuAberto === campanha.id && (
                            <div className="absolute right-0 top-7 w-48 bg-white border border-gray-200 rounded-lg shadow-xl z-20 py-1">
                              <button
                                onClick={() => setSelectedCampanhaId(campanha.id)}
                                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                Ver Detalhes
                              </button>
                              <button
                                onClick={() => handleEditarCampanha(campanha)}
                                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                Editar
                              </button>
                              <div className="border-t border-gray-100 my-1" />
                              <div className="px-3 py-1.5">
                                <p className="text-xs text-gray-400 font-medium mb-1">Mover para</p>
                                {colunas.filter(c => c.id !== campanha.status).map(c => (
                                  <button
                                    key={c.id}
                                    onClick={() => handleMoverPara(campanha.id, c.id)}
                                    className="w-full text-left px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-50 rounded flex items-center gap-2"
                                  >
                                    <div className={`w-2 h-2 rounded-full ${c.dotColor}`} />
                                    {c.titulo}
                                  </button>
                                ))}
                              </div>
                              <div className="border-t border-gray-100 my-1" />
                              <button
                                onClick={() => handleExcluir(campanha.id)}
                                className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                              >
                                Excluir
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {campanha.descricao && (
                        <p
                          className="text-xs text-gray-500 mb-2.5 line-clamp-2 cursor-pointer"
                          onClick={() => setSelectedCampanhaId(campanha.id)}
                        >
                          {campanha.descricao}
                        </p>
                      )}

                      <div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          prioridadeCores[campanha.prioridade] || prioridadeCores.media
                        }`}>
                          {campanha.prioridade}
                        </span>
                        {campanha.tipo && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600 capitalize">
                            {campanha.tipo}
                          </span>
                        )}
                        {campanha.tags && campanha.tags.length > 0 && (
                          <div className="flex items-center gap-0.5">
                            <Tag className="w-3 h-3 text-gray-400" />
                            <span className="text-[10px] text-gray-500">{campanha.tags.length}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-gray-400 pt-2 border-t border-gray-100">
                        <div className="flex items-center gap-3">
                          {campanha.data_inicio && (
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {dayjs(campanha.data_inicio).format('DD/MM')}
                              {campanha.data_fim && <>-{dayjs(campanha.data_fim).format('DD/MM')}</>}
                            </div>
                          )}
                        </div>
                        {campanha.budget_planejado > 0 && (
                          <div className="flex items-center gap-1 font-medium">
                            <DollarSign className="w-3 h-3" />
                            R$ {Number(campanha.budget_planejado).toLocaleString('pt-BR')}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {campanhasDaColuna.length === 0 && !loading && (
                    <div className="flex flex-col items-center justify-center py-8 text-gray-300">
                      <GripVertical className="w-8 h-8 mb-2" />
                      <p className="text-xs">Arraste campanhas aqui</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <ModalCampanha
        isOpen={showModalCampanha}
        onClose={() => {
          setShowModalCampanha(false);
          setEditingCampanha(null);
        }}
        onSaved={fetchCampanhas}
        campanha={editingCampanha}
      />

      {selectedCampanhaId && (
        <DetalhesCampanha
          campanhaId={selectedCampanhaId}
          onClose={() => setSelectedCampanhaId(null)}
          onEdit={() => {
            const c = campanhas.find(c => c.id === selectedCampanhaId);
            if (c) {
              setSelectedCampanhaId(null);
              setEditingCampanha(c);
              setShowModalCampanha(true);
            }
          }}
          onDeleted={() => {
            setSelectedCampanhaId(null);
            fetchCampanhas();
          }}
        />
      )}

      {menuAberto && (
        <div className="fixed inset-0 z-10" onClick={() => setMenuAberto(null)} />
      )}
    </div>
  );
};

export default KanbanCampanhas;
