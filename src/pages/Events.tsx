import React, { useState, useEffect } from 'react';
import { Tab } from '@headlessui/react';
import { Plus, Search, Filter, CreditCard as Edit, Trash2, Eye, Calendar, DollarSign, Clock, User, Users, MapPin, CheckCircle, XCircle, AlertTriangle, Download, Phone, FileText, Building, CalendarDays, Target, CheckSquare, MessageSquare } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { testConnection } from '../lib/supabase';
import dayjs from 'dayjs';
import ChatFinanceiroIA from '../components/financeiro/ChatFinanceiroIA';
import { PageHeader, KPICard, SectionCard, Badge } from '../components/ui';

interface EventoFechado {
  id: string;
  nome_evento: string;
  data_evento: string;
  horario_inicio: string;
  horario_fim: string;
  cliente_responsavel: string;
  telefone_cliente?: string;
  tipo_evento: string;
  promocao_vinculada?: string;
  observacoes?: string;
  valor_total: number;
  quantidade_pessoas: number;
  status_pagamento: 'pendente' | 'pago_parcial' | 'pago_total' | 'cancelado';
  forma_pagamento?: string;
  contrato_assinado: boolean;
  convite_impresso: boolean;
  data_retirada_convite?: string;
  data_pagamento_contrato?: string;
  criado_em: string;
}

interface ReservaEspecial {
  id: string;
  data_reserva: string;
  horario_inicio: string;
  horario_fim: string;
  nome_cliente: string;
  telefone_cliente: string;
  quantidade_pessoas: number;
  valor_cobrado: number;
  status_pagamento: 'pendente' | 'pago_parcial' | 'pago_total' | 'cancelado';
  local_reservado: string;
  o_que_esta_incluso?: string;
  detalhes_evento?: string;
  criado_em: string;
}

interface ReservaNormal {
  id: string;
  nome_cliente: string;
  telefone_cliente: string;
  data_reserva: string;
  horario: string;
  numero_pessoas: number;
  local_bar: string;
  observacoes?: string;
  criado_em: string;
}

const Events: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [showGerarContaModal, setShowGerarContaModal] = useState(false);
  const [eventoParaGerarConta, setEventoParaGerarConta] = useState<any>(null);
  const [dataVencimentoConta, setDataVencimentoConta] = useState('');
  const [showChatIA, setShowChatIA] = useState(false);

  // Estados para cada tipo de reserva
  const [eventosFechados, setEventosFechados] = useState<EventoFechado[]>([]);
  const [reservasEspeciais, setReservasEspeciais] = useState<ReservaEspecial[]>([]);
  const [reservasNormais, setReservasNormais] = useState<ReservaNormal[]>([]);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [mesFilter, setMesFilter] = useState(dayjs().month() + 1);
  const [anoFilter, setAnoFilter] = useState(dayjs().year());
  
  // Form data para cada tipo
  const [formEventoFechado, setFormEventoFechado] = useState({
    nome_evento: '',
    data_evento: dayjs().format('YYYY-MM-DD'),
    horario_inicio: '19:00',
    horario_fim: '23:00',
    cliente_responsavel: '',
    telefone_cliente: '',
    tipo_evento: 'festa_privada',
    valor_total: 0,
    quantidade_pessoas: 1,
    observacoes: '',
    contrato_assinado: false,
    convite_impresso: false,
    data_retirada_convite: '',
    data_pagamento_contrato: '',
    status_pagamento: 'pendente' as 'pendente' | 'pago_parcial' | 'pago_total' | 'cancelado'
  });

  const [formReservaEspecial, setFormReservaEspecial] = useState({
    data_reserva: dayjs().format('YYYY-MM-DD'),
    horario_inicio: '19:00',
    horario_fim: '23:00',
    nome_cliente: '',
    telefone_cliente: '',
    quantidade_pessoas: 1,
    valor_cobrado: 0,
    local_reservado: 'mezanino',
    o_que_esta_incluso: '',
    detalhes_evento: ''
  });

  const [formReservaNormal, setFormReservaNormal] = useState({
    nome_cliente: '',
    telefone_cliente: '',
    data_reserva: dayjs().format('YYYY-MM-DD'),
    horario: '19:00',
    numero_pessoas: 1,
    local_bar: 'interna',
    observacoes: ''
  });

  const tabTitles = ['Eventos Fechados', 'Reservas Especiais', 'Reservas Normais'];

  useEffect(() => {
    fetchData();
  }, [selectedTab, mesFilter, anoFilter, statusFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const connectionOk = await testConnection();
      if (!connectionOk) {
        console.warn('Supabase connection failed, using empty data');
        setEventosFechados([]);
        setReservasEspeciais([]);
        setReservasNormais([]);
        setLoading(false);
        return;
      }

      // Filtro por mês/ano
      const inicioMes = dayjs().year(anoFilter).month(mesFilter - 1).startOf('month').format('YYYY-MM-DD');
      const fimMes = dayjs().year(anoFilter).month(mesFilter - 1).endOf('month').format('YYYY-MM-DD');

      if (selectedTab === 0) {
        // Eventos Fechados
        let query = supabase
          .from('eventos_fechados')
          .select('*')
          .gte('data_evento', inicioMes)
          .lte('data_evento', fimMes);

        if (statusFilter !== 'all') {
          query = query.eq('status_pagamento', statusFilter);
        }

        const { data, error } = await query.order('data_evento', { ascending: false });
        if (error) throw error;
        setEventosFechados(data || []);

      } else if (selectedTab === 1) {
        // Reservas Especiais
        let query = supabase
          .from('reservas_especiais')
          .select('*')
          .gte('data_reserva', inicioMes)
          .lte('data_reserva', fimMes);

        if (statusFilter !== 'all') {
          query = query.eq('status_pagamento', statusFilter);
        }

        const { data, error } = await query.order('data_reserva', { ascending: false });
        if (error) throw error;
        setReservasEspeciais(data || []);

      } else if (selectedTab === 2) {
        // Reservas Normais
        const query = supabase
          .from('reservas_normais')
          .select('*')
          .gte('data_reserva', inicioMes)
          .lte('data_reserva', fimMes);

        const { data, error } = await query.order('data_reserva', { ascending: false });
        if (error) throw error;
        setReservasNormais(data || []);
      }

    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);

      let tableName = '';
      let data = {};

      if (selectedTab === 0) {
        tableName = 'eventos_fechados';
        // Converter campos de data vazios para null
        data = {
          ...formEventoFechado,
          data_pagamento_contrato: formEventoFechado.data_pagamento_contrato || null,
          data_retirada_convite: formEventoFechado.data_retirada_convite || null
        };
      } else if (selectedTab === 1) {
        tableName = 'reservas_especiais';
        data = { ...formReservaEspecial, status_pagamento: 'pendente' };
      } else if (selectedTab === 2) {
        tableName = 'reservas_normais';
        data = formReservaNormal;
      }

      if (editingItem) {
        const { error } = await supabase
          .from(tableName)
          .update(data)
          .eq('id', editingItem.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from(tableName)
          .insert([data]);

        if (error) throw error;
      }

      setShowForm(false);
      setEditingItem(null);
      resetForm();
      fetchData();
    } catch (err) {
      console.error('Error saving:', err);
      setError(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este item?')) return;

    try {
      setLoading(true);
      let tableName = '';

      if (selectedTab === 0) tableName = 'eventos_fechados';
      else if (selectedTab === 1) tableName = 'reservas_especiais';
      else if (selectedTab === 2) tableName = 'reservas_normais';

      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchData();
    } catch (err) {
      console.error('Error deleting:', err);
      setError(err instanceof Error ? err.message : 'Erro ao excluir');
    } finally {
      setLoading(false);
    }
  };

  const openForm = (item?: any) => {
    if (item) {
      setEditingItem(item);
      if (selectedTab === 0) {
        setFormEventoFechado({
          nome_evento: item.nome_evento || '',
          data_evento: item.data_evento || '',
          horario_inicio: item.horario_inicio || '',
          horario_fim: item.horario_fim || '',
          cliente_responsavel: item.cliente_responsavel || '',
          telefone_cliente: item.telefone_cliente || '',
          tipo_evento: item.tipo_evento || 'festa_privada',
          valor_total: item.valor_total || 0,
          quantidade_pessoas: item.quantidade_pessoas || 1,
          observacoes: item.observacoes || '',
          contrato_assinado: item.contrato_assinado || false,
          convite_impresso: item.convite_impresso || false,
          data_retirada_convite: item.data_retirada_convite || '',
          data_pagamento_contrato: item.data_pagamento_contrato || '',
          status_pagamento: item.status_pagamento || 'pendente'
        });
      } else if (selectedTab === 1) {
        setFormReservaEspecial({
          data_reserva: item.data_reserva || '',
          horario_inicio: item.horario_inicio || '',
          horario_fim: item.horario_fim || '',
          nome_cliente: item.nome_cliente || '',
          telefone_cliente: item.telefone_cliente || '',
          quantidade_pessoas: item.quantidade_pessoas || 1,
          valor_cobrado: item.valor_cobrado || 0,
          local_reservado: item.local_reservado || 'mezanino',
          o_que_esta_incluso: item.o_que_esta_incluso || '',
          detalhes_evento: item.detalhes_evento || ''
        });
      } else if (selectedTab === 2) {
        setFormReservaNormal({
          nome_cliente: item.nome_cliente || '',
          telefone_cliente: item.telefone_cliente || '',
          data_reserva: item.data_reserva || '',
          horario: item.horario || '',
          numero_pessoas: item.numero_pessoas || 1,
          local_bar: item.local_bar || 'interna',
          observacoes: item.observacoes || ''
        });
      }
    } else {
      setEditingItem(null);
      resetForm();
    }
    setShowForm(true);
  };

  const resetForm = () => {
    setFormEventoFechado({
      nome_evento: '',
      data_evento: dayjs().format('YYYY-MM-DD'),
      horario_inicio: '19:00',
      horario_fim: '23:00',
      cliente_responsavel: '',
      telefone_cliente: '',
      tipo_evento: 'festa_privada',
      valor_total: 0,
      quantidade_pessoas: 1,
      observacoes: '',
      contrato_assinado: false,
      convite_impresso: false,
      data_retirada_convite: '',
      data_pagamento_contrato: '',
      status_pagamento: 'pendente'
    });

    setFormReservaEspecial({
      data_reserva: dayjs().format('YYYY-MM-DD'),
      horario_inicio: '19:00',
      horario_fim: '23:00',
      nome_cliente: '',
      telefone_cliente: '',
      quantidade_pessoas: 1,
      valor_cobrado: 0,
      local_reservado: 'mezanino',
      o_que_esta_incluso: '',
      detalhes_evento: ''
    });

    setFormReservaNormal({
      nome_cliente: '',
      telefone_cliente: '',
      data_reserva: dayjs().format('YYYY-MM-DD'),
      horario: '19:00',
      numero_pessoas: 1,
      local_bar: 'interna',
      observacoes: ''
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pago_total':
        return 'text-green-700 bg-green-100';
      case 'pago_parcial':
        return 'text-yellow-700 bg-yellow-100';
      case 'pendente':
        return 'text-orange-700 bg-orange-100';
      case 'cancelado':
        return 'text-red-700 bg-red-100';
      default:
        return 'text-white/80 bg-gray-100';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pago_total':
        return 'Pago Total';
      case 'pago_parcial':
        return 'Pago Parcial';
      case 'pendente':
        return 'Pendente';
      case 'cancelado':
        return 'Cancelado';
      default:
        return status;
    }
  };

  const getCurrentData = () => {
    switch (selectedTab) {
      case 0: return eventosFechados;
      case 1: return reservasEspeciais;
      case 2: return reservasNormais;
      default: return [];
    }
  };

  const filteredData = getCurrentData().filter(item => {
    const matchesSearch = 
      (item.nome_evento && item.nome_evento.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.nome_cliente && item.nome_cliente.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.cliente_responsavel && item.cliente_responsavel.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
  });

  const renderForm = () => {
    if (selectedTab === 0) {
      // Formulário de Evento Fechado
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-white/80 mb-1">
              Nome do Evento *
            </label>
            <input
              type="text"
              value={formEventoFechado.nome_evento}
              onChange={(e) => setFormEventoFechado({ ...formEventoFechado, nome_evento: e.target.value })}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
              required
              placeholder="Ex: Festa de Aniversário João Silva"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">
              Cliente Responsável *
            </label>
            <input
              type="text"
              value={formEventoFechado.cliente_responsavel}
              onChange={(e) => setFormEventoFechado({ ...formEventoFechado, cliente_responsavel: e.target.value })}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">
              Telefone do Cliente *
            </label>
            <input
              type="tel"
              value={formEventoFechado.telefone_cliente}
              onChange={(e) => setFormEventoFechado({ ...formEventoFechado, telefone_cliente: e.target.value })}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">
              Data do Evento *
            </label>
            <input
              type="date"
              value={formEventoFechado.data_evento}
              onChange={(e) => setFormEventoFechado({ ...formEventoFechado, data_evento: e.target.value })}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">
              Tipo de Evento
            </label>
            <select
              value={formEventoFechado.tipo_evento}
              onChange={(e) => setFormEventoFechado({ ...formEventoFechado, tipo_evento: e.target.value })}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
            >
              <option value="festa_privada">Festa Privada</option>
              <option value="casamento">Casamento</option>
              <option value="aniversario">Aniversário</option>
              <option value="corporativo">Corporativo</option>
              <option value="formatura">Formatura</option>
              <option value="show">Show</option>
              <option value="outros">Outros</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">
              Horário de Início
            </label>
            <input
              type="time"
              value={formEventoFechado.horario_inicio}
              onChange={(e) => setFormEventoFechado({ ...formEventoFechado, horario_inicio: e.target.value })}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">
              Horário de Fim
            </label>
            <input
              type="time"
              value={formEventoFechado.horario_fim}
              onChange={(e) => setFormEventoFechado({ ...formEventoFechado, horario_fim: e.target.value })}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">
              Quantidade de Pessoas
            </label>
            <input
              type="number"
              min="1"
              value={formEventoFechado.quantidade_pessoas}
              onChange={(e) => setFormEventoFechado({ ...formEventoFechado, quantidade_pessoas: parseInt(e.target.value) || 1 })}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">
              Valor Total
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">R$</span>
              </div>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formEventoFechado.valor_total}
                onChange={(e) => setFormEventoFechado({ ...formEventoFechado, valor_total: parseFloat(e.target.value) || 0 })}
                className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
              />
            </div>
          </div>

          {/* Checklist do Evento (Opcional) */}
          <div className="md:col-span-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h4 className="font-medium text-white mb-1 flex items-center">
              <CheckSquare className="w-5 h-5 mr-2 text-[#7D1F2C]" />
              Checklist do Evento (Opcional)
            </h4>
            <p className="text-xs text-gray-500 mb-3">
              Você pode preencher estas informações posteriormente, se desejar.
            </p>

            <div className="space-y-4">
              {/* Contrato Assinado */}
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formEventoFechado.contrato_assinado}
                    onChange={(e) => {
                      const isChecked = e.target.checked;
                      setFormEventoFechado({
                        ...formEventoFechado,
                        contrato_assinado: isChecked,
                        data_pagamento_contrato: isChecked ? formEventoFechado.data_pagamento_contrato : ''
                      });

                      // Se estiver marcando como assinado e for um evento existente, perguntar sobre gerar conta
                      if (isChecked && editingItem && !editingItem.conta_receber_id) {
                        setEventoParaGerarConta(editingItem);
                        setDataVencimentoConta(formEventoFechado.data_evento);
                        setShowGerarContaModal(true);
                      }
                    }}
                    className="rounded border-gray-300 text-[#7D1F2C] focus:ring-[#7D1F2C] mr-2"
                  />
                  <span className="text-sm font-medium text-white/80">
                    📄 Contrato Assinado
                  </span>
                </label>

                {formEventoFechado.contrato_assinado && (
                  <div className="mt-2 ml-6">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Data do Pagamento do Contrato (opcional)
                    </label>
                    <input
                      type="date"
                      value={formEventoFechado.data_pagamento_contrato}
                      onChange={(e) => setFormEventoFechado({
                        ...formEventoFechado,
                        data_pagamento_contrato: e.target.value
                      })}
                      className="w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                    />
                  </div>
                )}
              </div>

              {/* Ingressos Entregues */}
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formEventoFechado.convite_impresso}
                    onChange={(e) => setFormEventoFechado({
                      ...formEventoFechado,
                      convite_impresso: e.target.checked,
                      data_retirada_convite: e.target.checked ? formEventoFechado.data_retirada_convite : ''
                    })}
                    className="rounded border-gray-300 text-[#7D1F2C] focus:ring-[#7D1F2C] mr-2"
                  />
                  <span className="text-sm font-medium text-white/80">
                    🎟️ Ingressos Entregues
                  </span>
                </label>

                {formEventoFechado.convite_impresso && (
                  <div className="mt-2 ml-6">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Data de Retirada dos Ingressos (opcional)
                    </label>
                    <input
                      type="date"
                      value={formEventoFechado.data_retirada_convite}
                      onChange={(e) => setFormEventoFechado({
                        ...formEventoFechado,
                        data_retirada_convite: e.target.value
                      })}
                      className="w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                    />
                  </div>
                )}
              </div>

              {/* Status do Pagamento como parte do checklist */}
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  💰 Status do Pagamento
                </label>
                <select
                  value={formEventoFechado.status_pagamento || 'pendente'}
                  onChange={(e) => setFormEventoFechado({
                    ...formEventoFechado,
                    status_pagamento: e.target.value as 'pendente' | 'pago_parcial' | 'pago_total' | 'cancelado'
                  })}
                  className="ml-6 w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                >
                  <option value="pendente">Pendente</option>
                  <option value="pago_parcial">Pago Parcial</option>
                  <option value="pago_total">Pago Total</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>
            </div>

            {/* Status do Evento */}
            {(formEventoFechado.contrato_assinado || formEventoFechado.convite_impresso || formEventoFechado.status_pagamento !== 'pendente') && (
              <div className="mt-4 p-3 bg-white rounded-lg border border-gray-200">
                <div className="text-sm font-medium text-white/80 mb-2">Status do Evento:</div>
                <div className="flex items-center space-x-4">
                  <div className={`flex items-center ${
                    formEventoFechado.contrato_assinado ? 'text-green-600' : 'text-gray-400'
                  }`}>
                    {formEventoFechado.contrato_assinado ? '✅' : '⏳'} Contrato
                  </div>
                  <div className={`flex items-center ${
                    formEventoFechado.convite_impresso ? 'text-blue-600' : 'text-gray-400'
                  }`}>
                    {formEventoFechado.convite_impresso ? '✅' : '⏳'} Ingressos
                  </div>
                  <div className={`flex items-center ${
                    formEventoFechado.status_pagamento === 'pago_total' ? 'text-green-600' : 'text-gray-400'
                  }`}>
                    {formEventoFechado.status_pagamento === 'pago_total' ? '✅' : '⏳'} Pagamento
                  </div>
                </div>

                {(formEventoFechado.contrato_assinado &&
                  formEventoFechado.convite_impresso &&
                  formEventoFechado.status_pagamento === 'pago_total') && (
                  <div className="mt-2 p-2 bg-green-100 text-green-800 rounded-md text-center text-sm font-medium">
                    🎉 Evento Completo - Tudo Pronto!
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-white/80 mb-1">
              Observações
            </label>
            <textarea
              value={formEventoFechado.observacoes}
              onChange={(e) => setFormEventoFechado({ ...formEventoFechado, observacoes: e.target.value })}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
              rows={3}
            />
          </div>
        </div>
      );
    } else if (selectedTab === 1) {
      // Formulário de Reserva Especial
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">
              Nome do Cliente *
            </label>
            <input
              type="text"
              value={formReservaEspecial.nome_cliente}
              onChange={(e) => setFormReservaEspecial({ ...formReservaEspecial, nome_cliente: e.target.value })}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">
              Telefone do Cliente *
            </label>
            <input
              type="tel"
              value={formReservaEspecial.telefone_cliente}
              onChange={(e) => setFormReservaEspecial({ ...formReservaEspecial, telefone_cliente: e.target.value })}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">
              Data da Reserva *
            </label>
            <input
              type="date"
              value={formReservaEspecial.data_reserva}
              onChange={(e) => setFormReservaEspecial({ ...formReservaEspecial, data_reserva: e.target.value })}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">
              Local Reservado
            </label>
            <select
              value={formReservaEspecial.local_reservado}
              onChange={(e) => setFormReservaEspecial({ ...formReservaEspecial, local_reservado: e.target.value })}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
            >
              <option value="mezanino">Mezanino</option>
              <option value="deck_externo">Deck Externo</option>
              <option value="area_vip">Área VIP</option>
              <option value="salao_principal">Salão Principal</option>
              <option value="varanda">Varanda</option>
              <option value="outros">Outros</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">
              Horário de Início
            </label>
            <input
              type="time"
              value={formReservaEspecial.horario_inicio}
              onChange={(e) => setFormReservaEspecial({ ...formReservaEspecial, horario_inicio: e.target.value })}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">
              Horário de Fim
            </label>
            <input
              type="time"
              value={formReservaEspecial.horario_fim}
              onChange={(e) => setFormReservaEspecial({ ...formReservaEspecial, horario_fim: e.target.value })}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">
              Quantidade de Pessoas
            </label>
            <input
              type="number"
              min="1"
              value={formReservaEspecial.quantidade_pessoas}
              onChange={(e) => setFormReservaEspecial({ ...formReservaEspecial, quantidade_pessoas: parseInt(e.target.value) || 1 })}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">
              Valor Cobrado
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">R$</span>
              </div>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formReservaEspecial.valor_cobrado}
                onChange={(e) => setFormReservaEspecial({ ...formReservaEspecial, valor_cobrado: parseFloat(e.target.value) || 0 })}
                className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
              />
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-white/80 mb-1">
              O que está incluso
            </label>
            <textarea
              value={formReservaEspecial.o_que_esta_incluso}
              onChange={(e) => setFormReservaEspecial({ ...formReservaEspecial, o_que_esta_incluso: e.target.value })}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
              rows={2}
              placeholder="Ex: Decoração, som, iluminação..."
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-white/80 mb-1">
              Detalhes do Evento
            </label>
            <textarea
              value={formReservaEspecial.detalhes_evento}
              onChange={(e) => setFormReservaEspecial({ ...formReservaEspecial, detalhes_evento: e.target.value })}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
              rows={3}
            />
          </div>
        </div>
      );
    } else {
      // Formulário de Reserva Normal
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">
              Nome do Cliente *
            </label>
            <input
              type="text"
              value={formReservaNormal.nome_cliente}
              onChange={(e) => setFormReservaNormal({ ...formReservaNormal, nome_cliente: e.target.value })}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">
              Telefone do Cliente *
            </label>
            <input
              type="tel"
              value={formReservaNormal.telefone_cliente}
              onChange={(e) => setFormReservaNormal({ ...formReservaNormal, telefone_cliente: e.target.value })}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">
              Data da Reserva *
            </label>
            <input
              type="date"
              value={formReservaNormal.data_reserva}
              onChange={(e) => setFormReservaNormal({ ...formReservaNormal, data_reserva: e.target.value })}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">
              Horário
            </label>
            <input
              type="time"
              value={formReservaNormal.horario}
              onChange={(e) => setFormReservaNormal({ ...formReservaNormal, horario: e.target.value })}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">
              Número de Pessoas
            </label>
            <input
              type="number"
              min="1"
              value={formReservaNormal.numero_pessoas}
              onChange={(e) => setFormReservaNormal({ ...formReservaNormal, numero_pessoas: parseInt(e.target.value) || 1 })}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">
              Local no Bar
            </label>
            <select
              value={formReservaNormal.local_bar}
              onChange={(e) => setFormReservaNormal({ ...formReservaNormal, local_bar: e.target.value })}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
            >
              <option value="interna">Área Interna</option>
              <option value="varanda">Varanda</option>
              <option value="deck">Deck</option>
              <option value="mezanino">Mezanino</option>
              <option value="outros">Outros</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-white/80 mb-1">
              Observações
            </label>
            <textarea
              value={formReservaNormal.observacoes}
              onChange={(e) => setFormReservaNormal({ ...formReservaNormal, observacoes: e.target.value })}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
              rows={2}
            />
          </div>
        </div>
      );
    }
  };

  const gerarContaReceber = async () => {
    if (!eventoParaGerarConta) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('criar_conta_receber_evento', {
        p_evento_id: eventoParaGerarConta.id,
        p_data_vencimento: dataVencimentoConta || null
      });

      if (rpcError) throw rpcError;

      alert('Conta a receber gerada com sucesso!');
      setShowGerarContaModal(false);
      setEventoParaGerarConta(null);
      fetchData();
    } catch (err) {
      console.error('Error generating account:', err);
      setError(err instanceof Error ? err.message : 'Erro ao gerar conta a receber');
    } finally {
      setLoading(false);
    }
  };

  const renderTable = () => {
    if (selectedTab === 0) {
      // Tabela de Eventos Fechados
      return (
        <table className="w-full">
          <thead>
            <tr className="text-left bg-gray-50 border-b">
              <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Evento
              </th>
              <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cliente
              </th>
              <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Data/Hora
              </th>
              <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Pessoas
              </th>
              <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Valor
              </th>
              <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Checklist
              </th>
              <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {eventosFechados.map((evento) => (
              <tr key={evento.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div>
                    <div className="font-medium text-white">{evento.nome_evento}</div>
                    <div className="text-sm text-gray-500">{evento.tipo_evento}</div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div>
                    <div className="font-medium text-white">{evento.cliente_responsavel}</div>
                    {evento.telefone_cliente && (
                      <div className="text-sm text-gray-500">{evento.telefone_cliente}</div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div>
                    <div className="text-sm text-white">
                      {dayjs(evento.data_evento).format('DD/MM/YYYY')}
                    </div>
                    <div className="text-sm text-gray-500">
                      {evento.horario_inicio} - {evento.horario_fim}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-white">{evento.quantidade_pessoas}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="font-medium text-white">
                    {formatCurrency(evento.valor_total)}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(evento.status_pagamento)}`}>
                    {getStatusText(evento.status_pagamento)}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-2">
                    <div className={`flex items-center ${
                      evento.contrato_assinado ? 'text-green-600' : 'text-gray-400'
                    }`} title="Contrato Assinado">
                      {evento.contrato_assinado ? '✅' : '❌'} 📄
                    </div>
                    <div className={`flex items-center ${
                      evento.convite_impresso ? 'text-blue-600' : 'text-gray-400'
                    }`} title="Ingressos Entregues">
                      {evento.convite_impresso ? '✅' : '❌'} 🎟️
                    </div>
                    <div className={`flex items-center ${
                      evento.status_pagamento === 'pago_total' ? 'text-green-600' : 'text-gray-400'
                    }`} title="Pagamento">
                      {evento.status_pagamento === 'pago_total' ? '✅' : '❌'} 💰
                    </div>
                  </div>
                  {(evento.contrato_assinado && 
                    evento.convite_impresso && 
                    evento.status_pagamento === 'pago_total') && (
                    <div className="text-xs text-green-600 mt-1 font-medium">
                      🎉 Completo
                    </div>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => openForm(evento)}
                      className="text-blue-600 hover:text-blue-800"
                      title="Editar"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(evento.id)}
                      className="text-red-600 hover:text-red-800"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    } else if (selectedTab === 1) {
      // Tabela de Reservas Especiais
      return (
        <table className="w-full">
          <thead>
            <tr className="text-left bg-gray-50 border-b">
              <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cliente
              </th>
              <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Data/Hora
              </th>
              <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Local
              </th>
              <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Pessoas
              </th>
              <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Valor
              </th>
              <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {reservasEspeciais.map((reserva) => (
              <tr key={reserva.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div>
                    <div className="font-medium text-white">{reserva.nome_cliente}</div>
                    <div className="text-sm text-gray-500">{reserva.telefone_cliente}</div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div>
                    <div className="text-sm text-white">
                      {dayjs(reserva.data_reserva).format('DD/MM/YYYY')}
                    </div>
                    <div className="text-sm text-gray-500">
                      {reserva.horario_inicio} - {reserva.horario_fim}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-white">{reserva.local_reservado}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-white">{reserva.quantidade_pessoas}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="font-medium text-white">
                    {formatCurrency(reserva.valor_cobrado)}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(reserva.status_pagamento)}`}>
                    {getStatusText(reserva.status_pagamento)}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => openForm(reserva)}
                      className="text-blue-600 hover:text-blue-800"
                      title="Editar"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(reserva.id)}
                      className="text-red-600 hover:text-red-800"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    } else {
      // Tabela de Reservas Normais
      return (
        <table className="w-full">
          <thead>
            <tr className="text-left bg-gray-50 border-b">
              <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cliente
              </th>
              <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Data/Hora
              </th>
              <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Pessoas
              </th>
              <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Local
              </th>
              <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Observações
              </th>
              <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {reservasNormais.map((reserva) => (
              <tr key={reserva.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div>
                    <div className="font-medium text-white">{reserva.nome_cliente}</div>
                    <div className="text-sm text-gray-500">{reserva.telefone_cliente}</div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div>
                    <div className="text-sm text-white">
                      {dayjs(reserva.data_reserva).format('DD/MM/YYYY')}
                    </div>
                    <div className="text-sm text-gray-500">{reserva.horario}</div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-white">{reserva.numero_pessoas}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-white">{reserva.local_bar}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-500">{reserva.observacoes || '-'}</span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => openForm(reserva)}
                      className="text-blue-600 hover:text-blue-800"
                      title="Editar"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(reserva.id)}
                      className="text-red-600 hover:text-red-800"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-white/90">Sistema de Reservas</h2>
          <button
            onClick={() => openForm()}
            className="px-4 py-2 bg-[#7D1F2C] text-white rounded-lg hover:bg-[#6a1a25]"
          >
            <Plus className="w-4 h-4 inline mr-2" />
            Nova {tabTitles[selectedTab].slice(0, -1)}
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* Filtros */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7D1F2C] focus:border-[#7D1F2C]"
                />
              </div>
            </div>

            {(selectedTab === 0 || selectedTab === 1) && (
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#7D1F2C] focus:border-[#7D1F2C]"
                >
                  <option value="all">Todos os Status</option>
                  <option value="pendente">Pendente</option>
                  <option value="pago_parcial">Pago Parcial</option>
                  <option value="pago_total">Pago Total</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>
            )}

            <div>
              <select
                value={mesFilter}
                onChange={(e) => setMesFilter(parseInt(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#7D1F2C] focus:border-[#7D1F2C]"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {dayjs().month(i).format('MMMM')}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={anoFilter}
                onChange={(e) => setAnoFilter(parseInt(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#7D1F2C] focus:border-[#7D1F2C]"
              >
                {Array.from({ length: 3 }, (_, i) => dayjs().year() - 1 + i).map(ano => (
                  <option key={ano} value={ano}>
                    {ano}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-xl shadow">
          <Tab.Group selectedIndex={selectedTab} onChange={(index) => setSelectedTab(index)}>
            <Tab.List className="flex space-x-1 rounded-xl bg-gray-100 p-1 mb-6 overflow-x-auto">
              {tabTitles.map((title) => (
                <Tab
                  key={title}
                  className={({ selected }) =>
                    `flex items-center whitespace-nowrap rounded-lg py-2.5 px-4 text-sm font-medium leading-5 transition-all
                    ${selected
                      ? 'bg-[#7D1F2C] text-white shadow'
                      : 'text-white/80 hover:bg-white hover:text-white'
                    }`
                  }
                >
                  {title}
                </Tab>
              ))}
            </Tab.List>

            <Tab.Panels>
              {tabTitles.map((title, index) => (
                <Tab.Panel key={title} className="rounded-xl p-6">
                  {loading ? (
                    <div className="flex justify-center items-center h-64">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#7D1F2C]"></div>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      {filteredData.length > 0 ? (
                        renderTable()
                      ) : (
                        <div className="text-center py-12">
                          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-white mb-2">
                            Nenhum {title.toLowerCase().slice(0, -1)} encontrado
                          </h3>
                          <p className="text-gray-500">
                            {searchTerm || statusFilter !== 'all'
                              ? `Nenhum ${title.toLowerCase().slice(0, -1)} corresponde aos filtros aplicados.`
                              : `Nenhum ${title.toLowerCase().slice(0, -1)} cadastrado.`}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </Tab.Panel>
              ))}
            </Tab.Panels>
          </Tab.Group>
        </div>

        {/* Modal do Formulário */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-medium text-white mb-4">
                {editingItem ? 'Editar' : 'Novo'} {tabTitles[selectedTab].slice(0, -1)}
              </h3>
              
              {renderForm()}
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditingItem(null);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-white/80 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="px-4 py-2 bg-[#7D1F2C] text-white rounded-md hover:bg-[#6a1a25] disabled:opacity-50"
                >
                  {loading ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal para Gerar Conta a Receber */}
        {showGerarContaModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-medium text-white mb-4">
                Gerar Conta a Receber
              </h3>

              <p className="text-sm text-gray-600 mb-4">
                Deseja gerar uma conta a receber para este evento?
              </p>

              <div className="mb-4">
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Evento: <span className="font-bold">{eventoParaGerarConta?.nome_evento}</span>
                </label>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Valor: <span className="font-bold">R$ {eventoParaGerarConta?.valor_total?.toFixed(2)}</span>
                </label>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-white/80 mb-1">
                  Data de Vencimento
                </label>
                <input
                  type="date"
                  value={dataVencimentoConta}
                  onChange={(e) => setDataVencimentoConta(e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Deixe em branco para usar a data do evento
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowGerarContaModal(false);
                    setEventoParaGerarConta(null);
                    setError(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-white/80 hover:bg-gray-50"
                >
                  Não, agora não
                </button>
                <button
                  onClick={gerarContaReceber}
                  disabled={loading}
                  className="px-4 py-2 bg-[#7D1F2C] text-white rounded-md hover:bg-[#6a1a25] disabled:opacity-50"
                >
                  {loading ? 'Gerando...' : 'Sim, gerar conta'}
                </button>
              </div>
            </div>
          </div>
        )}

      {/* Botão flutuante do Chat IA */}
      {!showChatIA && (
        <button
          onClick={() => setShowChatIA(true)}
          className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-full shadow-2xl hover:shadow-3xl hover:scale-110 transition-all duration-300 flex items-center justify-center z-40 group"
          title="Chat com Super Agente IA"
        >
          <MessageSquare className="w-7 h-7" />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse"></span>
          <div className="absolute right-full mr-4 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            Super Agente IA - Eventos
          </div>
        </button>
      )}

      {/* Modal do Chat IA */}
      {showChatIA && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-3xl">
            <ChatFinanceiroIA onClose={() => setShowChatIA(false)} />
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default Events;