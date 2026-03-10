import React, { useState, useEffect } from 'react';
import { 
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart, 
  Pie,
  Cell
} from 'recharts';
import { Calendar, Filter, Plus, Download, FileText, CreditCard as Edit, Trash2, ArrowUpRight, ArrowDownRight, Search, Upload, DollarSign, Settings, CreditCard, TrendingUp, BarChart3, Building2, Users, Activity, Receipt, CheckSquare, PieChart as PieChartIcon } from 'lucide-react';
import dayjs from 'dayjs';
import { supabase } from '../lib/supabase';
import { testConnection } from '../lib/supabase';
import { useLocation, useNavigate } from 'react-router-dom';
import GeneralRegistrations from './GeneralRegistrations';
import ContasPagar from '../components/financeiro/ContasPagar';
import ContasReceber from '../components/financeiro/ContasReceber';
import FluxoCaixa from '../components/financeiro/FluxoCaixa';
import ResumoDia from '../components/financeiro/ResumoDia';
import ExtratoDiario from '../components/financeiro/ExtratoDiario';
import FichaFinanceiraFornecedor from '../components/financeiro/FichaFinanceiraFornecedor';
import KardexFinanceiroFornecedor from '../components/financeiro/KardexFinanceiroFornecedor';
import RelatoriosGerenciais from '../components/diretoria/RelatoriosGerenciais';
import KardexFornecedor from '../components/financeiro/KardexFornecedor';
import ChatFinanceiroIA from '../components/financeiro/ChatFinanceiroIA';
import CategorizarLancamentos from '../components/financeiro/CategorizarLancamentos';
import HistoricoPagamentosEstorno from '../components/financeiro/HistoricoPagamentosEstorno';
import { MessageSquare } from 'lucide-react';
import 'dayjs/locale/pt-br';

dayjs.locale('pt-br');

interface Transaction {
  id: string;
  tipo: 'entrada' | 'saida';
  valor: number;
  data: string;
  descricao: string;
  centro_custo: string;
  comprovante?: string;
  criado_por?: string;
}

const Finance: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedTab, setSelectedTab] = useState(0);
  const [dateFilter, setDateFilter] = useState('month');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewTransactionForm, setShowNewTransactionForm] = useState(false);
  const [showChatIA, setShowChatIA] = useState(false);
  const [newTransaction, setNewTransaction] = useState<Partial<Transaction>>({
    tipo: 'entrada',
    centro_custo: 'Bar'
  });
  
  const COLORS = ['#7D1F2C', '#D4AF37', '#2C3333', '#596869'];
  
  // Parse tab from URL on mount and when URL changes
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (tabParam !== null) {
      const tabIndex = parseInt(tabParam);
      if (!isNaN(tabIndex) && tabIndex >= 0 && tabIndex < tabTitles.length) {
        setSelectedTab(tabIndex);
      }
    }
  }, [location.search]);

  // Fetch transactions only for tab 0 when filters change
  useEffect(() => {
    if (selectedTab === 0) {
      fetchTransactions();
    }
  }, [selectedTab, dateFilter, categoryFilter]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError(null);

      // Test connection first
      const connectionOk = await testConnection();
      
      if (!connectionOk) {
        console.warn('Supabase connection failed, using empty data');
        setTransactions([]);
        setLoading(false);
        return;
      }

      let query = supabase.from('fluxo_caixa').select('*');

      // Apply date filter
      const today = dayjs();
      if (dateFilter === 'week') {
        query = query.gte('data', today.subtract(7, 'day').format('YYYY-MM-DD'));
      } else if (dateFilter === 'month') {
        query = query.gte('data', today.subtract(1, 'month').format('YYYY-MM-DD'));
      } else if (dateFilter === 'year') {
        query = query.gte('data', today.subtract(1, 'year').format('YYYY-MM-DD'));
      }

      // Apply category filter
      if (categoryFilter !== 'all') {
        query = query.eq('centro_custo', categoryFilter);
      }

      const { data, error: fetchError } = await query.order('data', { ascending: false });

      if (fetchError) {
        throw new Error(`Error fetching transactions: ${fetchError.message}`);
      }

      setTransactions(data || []);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      console.warn('Using empty data due to connection issues');
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleNewTransaction = async () => {
    try {
      const { data, error } = await supabase
        .from('fluxo_caixa')
        .insert([{
          ...newTransaction,
          data: dayjs(newTransaction.data).format('YYYY-MM-DD'),
          valor: Number(newTransaction.valor),
          criado_por: null // Always null for development
        }])
        .select();

      if (error) throw error;

      setTransactions([...(data || []), ...transactions]);
      setShowNewTransactionForm(false);
      setNewTransaction({ tipo: 'entrada', centro_custo: 'Bar' });
    } catch (error) {
      console.error('Error creating transaction:', error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('comprovantes')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('comprovantes')
        .getPublicUrl(filePath);

      setNewTransaction({ ...newTransaction, comprovante: publicUrl });
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  };

  const calculateBalance = () => {
    return transactions.reduce((acc, curr) => {
      return acc + (curr.tipo === 'entrada' ? curr.valor : -curr.valor);
    }, 0);
  };

  const getChartData = () => {
    const grouped = transactions.reduce((acc: any, curr) => {
      const date = dayjs(curr.data).format('DD/MM');
      if (!acc[date]) {
        acc[date] = { date, entrada: 0, saida: 0 };
      }
      if (curr.tipo === 'entrada') {
        acc[date].entrada += curr.valor;
      } else {
        acc[date].saida += curr.valor;
      }
      return acc;
    }, {});

    return Object.values(grouped);
  };

  const getPieChartData = () => {
    const grouped = transactions
      .filter(t => t.tipo === 'saida')
      .reduce((acc: any, curr) => {
        if (!acc[curr.centro_custo]) {
          acc[curr.centro_custo] = 0;
        }
        acc[curr.centro_custo] += curr.valor;
        return acc;
      }, {});

    return Object.entries(grouped).map(([name, value]) => ({ name, value }));
  };

  const tabTitles = [
    'Fluxo de Caixa',
    'Resumo do Dia',
    'Extrato Diário',
    'Contas a Pagar',
    'Contas a Receber',
    'Histórico e Estornos',
    'Categorizar Lançamentos',
    'Ficha Fornecedor',
    'Kardex Fornecedor',
    'Kardex Completo',
    'Relatórios Gerenciais',
    'Cadastros Gerais'
  ];

  const renderTabContent = (index: number) => {
    switch (index) {
      case 0:
        return <FluxoCaixa />;
      case 1:
        return <ResumoDia />;
      case 2:
        return <ExtratoDiario />;
      case 3:
        return <ContasPagar />;
      case 4:
        return <ContasReceber />;
      case 5:
        return <HistoricoPagamentosEstorno />;
      case 6:
        return <CategorizarLancamentos />;
      case 7:
        return <FichaFinanceiraFornecedor />;
      case 8:
        return <KardexFinanceiroFornecedor />;
      case 9:
        return <KardexFornecedor />;
      case 10:
        return <RelatoriosGerenciais />;
      case 11:
        return <GeneralRegistrations />;
      default:
        return (
          <div className="text-center py-8">
            <p className="text-gray-500">Módulo em desenvolvimento</p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        {renderTabContent(selectedTab)}
      </div>

      {/* New Transaction Modal */}
      {showNewTransactionForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Novo Lançamento
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Tipo
                </label>
                <select
                  value={newTransaction.tipo}
                  onChange={(e) => setNewTransaction({
                    ...newTransaction,
                    tipo: e.target.value as 'entrada' | 'saida'
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                >
                  <option value="entrada">Entrada</option>
                  <option value="saida">Saída</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Valor
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">R$</span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    value={newTransaction.valor || ''}
                    onChange={(e) => setNewTransaction({
                      ...newTransaction,
                      valor: parseFloat(e.target.value)
                    })}
                    className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Data
                </label>
                <input
                  type="date"
                  value={newTransaction.data || ''}
                  onChange={(e) => setNewTransaction({
                    ...newTransaction,
                    data: e.target.value
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Descrição
                </label>
                <input
                  type="text"
                  value={newTransaction.descricao || ''}
                  onChange={(e) => setNewTransaction({
                    ...newTransaction,
                    descricao: e.target.value
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Centro de Custo
                </label>
                <select
                  value={newTransaction.centro_custo}
                  onChange={(e) => setNewTransaction({
                    ...newTransaction,
                    centro_custo: e.target.value
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                >
                  <option value="Bar">Bar</option>
                  <option value="Cozinha">Cozinha</option>
                  <option value="Eventos">Eventos</option>
                  <option value="RH">RH</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Comprovante
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                  <div className="space-y-1 text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600">
                      <label className="relative cursor-pointer bg-white rounded-md font-medium text-[#7D1F2C] hover:text-[#6a1a25]">
                        <span>Upload de arquivo</span>
                        <input
                          type="file"
                          className="sr-only"
                          onChange={handleFileUpload}
                          accept=".pdf,.jpg,.jpeg,.png"
                        />
                      </label>
                      <p className="pl-1">ou arraste e solte</p>
                    </div>
                    <p className="text-xs text-gray-500">
                      PDF ou imagem até 10MB
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowNewTransactionForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleNewTransaction}
                className="px-4 py-2 bg-[#7D1F2C] text-white rounded-md hover:bg-[#6a1a25]"
              >
                Salvar
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
          title="Chat com IA Financeira"
        >
          <MessageSquare className="w-7 h-7" />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse"></span>
          <div className="absolute right-full mr-4 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            Assistente Financeiro IA
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
  );
};

export default Finance;