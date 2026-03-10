import React, { useState, useEffect } from 'react';
import {
  History,
  Search,
  Calendar,
  Package,
  CheckCircle,
  AlertCircle,
  Clock,
  ArrowLeft,
  Filter,
  Download,
  Eye,
  Trash2,
  FileText,
  TrendingUp,
  AlertTriangle,
  FolderOpen
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import dayjs from '../../../lib/dayjs';

interface ImportacaoVenda {
  id: string;
  arquivo_nome: string;
  arquivo_tamanho?: number;
  criado_em: string;
  processado_em?: string;
  total_linhas: number;
  total_processadas: number;
  total_sucesso: number;
  total_erro: number;
  status: string;
  observacoes?: string;
  estoque?: {
    nome: string;
  };
}

interface HistoricoImportacoesProps {
  onClose: () => void;
  onViewDetails?: (importacaoId: string) => void;
  onReabrir?: (importacaoId: string) => void;
}

const HistoricoImportacoes: React.FC<HistoricoImportacoesProps> = ({ onClose, onViewDetails, onReabrir }) => {
  const [importacoes, setImportacoes] = useState<ImportacaoVenda[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('all');
  const [periodo, setPeriodo] = useState<'week' | 'month' | 'quarter' | 'year' | 'all'>('month');
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const itensPorPagina = 20;

  useEffect(() => {
    fetchImportacoes();
  }, [filtroStatus, periodo, paginaAtual]);

  const fetchImportacoes = async () => {
    try {
      setLoading(true);

      // Calcular datas baseado no período
      let dataInicio = '';
      const dataFim = dayjs().format('YYYY-MM-DD');

      switch (periodo) {
        case 'week':
          dataInicio = dayjs().subtract(7, 'days').format('YYYY-MM-DD');
          break;
        case 'month':
          dataInicio = dayjs().subtract(30, 'days').format('YYYY-MM-DD');
          break;
        case 'quarter':
          dataInicio = dayjs().subtract(90, 'days').format('YYYY-MM-DD');
          break;
        case 'year':
          dataInicio = dayjs().subtract(365, 'days').format('YYYY-MM-DD');
          break;
        default:
          dataInicio = '2020-01-01';
      }

      // Buscar importações com contagem
      let query = supabase
        .from('importacoes_vendas')
        .select('*, estoque:estoques(nome)', { count: 'exact' })
        .order('criado_em', { ascending: false });

      if (periodo !== 'all') {
        query = query
          .gte('criado_em', dataInicio)
          .lte('criado_em', dataFim);
      }

      if (filtroStatus !== 'all') {
        query = query.eq('status', filtroStatus);
      }

      // Paginação
      const inicio = (paginaAtual - 1) * itensPorPagina;
      query = query.range(inicio, inicio + itensPorPagina - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      setImportacoes(data || []);
      setTotalPaginas(Math.ceil((count || 0) / itensPorPagina));
    } catch (error) {
      console.error('Erro ao buscar importações:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta importação? Esta ação não pode ser desfeita.')) return;

    try {
      const { error } = await supabase
        .from('importacoes_vendas')
        .delete()
        .eq('id', id);

      if (error) throw error;

      fetchImportacoes();
    } catch (error) {
      console.error('Erro ao excluir importação:', error);
      alert('Erro ao excluir importação');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
      processada: { label: 'Processada', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle },
      pendente: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
      erro: { label: 'Erro', color: 'bg-red-100 text-red-800 border-red-200', icon: AlertCircle },
      em_processamento: { label: 'Processando', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Clock }
    };

    const config = statusConfig[status] || statusConfig.pendente;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold border ${config.color}`}>
        <Icon className="w-3.5 h-3.5 mr-1.5" />
        {config.label}
      </span>
    );
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes) return '-';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const importacoesFiltradas = importacoes.filter(imp =>
    imp.arquivo_nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const calcularTaxaSucesso = (imp: ImportacaoVenda) => {
    if (imp.total_linhas === 0) return 0;
    return (imp.total_sucesso / imp.total_linhas) * 100;
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <History className="w-7 h-7" />
                  Histórico de Importações
                </h2>
                <p className="text-blue-100 text-sm mt-1">
                  Visualize e gerencie todas as importações de vendas
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="p-6 bg-gray-50 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar por nome do arquivo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <select
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value as any)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="week">Última semana</option>
              <option value="month">Último mês</option>
              <option value="quarter">Último trimestre</option>
              <option value="year">Último ano</option>
              <option value="all">Todo período</option>
            </select>

            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Todos os status</option>
              <option value="processada">Processada</option>
              <option value="pendente">Pendente</option>
              <option value="erro">Erro</option>
              <option value="em_processamento">Em processamento</option>
            </select>
          </div>
        </div>

        {/* Lista de Importações */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <p className="text-gray-500 mt-4">Carregando histórico...</p>
              </div>
            </div>
          ) : importacoesFiltradas.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <History className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">Nenhuma importação encontrada</p>
                <p className="text-gray-400 text-sm mt-2">
                  {searchTerm ? 'Tente ajustar os filtros de busca' : 'Realize sua primeira importação'}
                </p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {importacoesFiltradas.map((imp, index) => {
                const taxaSucesso = calcularTaxaSucesso(imp);

                return (
                  <div
                    key={imp.id}
                    className="p-6 hover:bg-gray-50 transition-all duration-200"
                    style={{
                      animation: `slideIn 0.3s ease-out ${index * 0.05}s both`
                    }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <FileText className="w-5 h-5 text-gray-400" />
                          <h4 className="font-semibold text-gray-900">{imp.arquivo_nome}</h4>
                          {getStatusBadge(imp.status || 'pendente')}
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-3">
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Data de Importação</p>
                            <p className="text-sm font-medium text-gray-900 flex items-center">
                              <Calendar className="w-4 h-4 mr-1 text-gray-400" />
                              {dayjs(imp.criado_em).format('DD/MM/YYYY HH:mm')}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-gray-500 mb-1">Total de Itens</p>
                            <p className="text-sm font-medium text-gray-900 flex items-center">
                              <Package className="w-4 h-4 mr-1 text-gray-400" />
                              {imp.total_linhas || 0}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-gray-500 mb-1">Taxa de Sucesso</p>
                            <p className={`text-sm font-medium flex items-center ${
                              taxaSucesso >= 80 ? 'text-green-600' : taxaSucesso >= 50 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              <TrendingUp className="w-4 h-4 mr-1" />
                              {taxaSucesso.toFixed(1)}%
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-gray-500 mb-1">Tamanho</p>
                            <p className="text-sm font-medium text-gray-900">
                              {formatBytes(imp.arquivo_tamanho)}
                            </p>
                          </div>
                        </div>

                        {/* Barra de progresso */}
                        {imp.total_linhas > 0 && (
                          <div className="mb-3">
                            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                              <span>Progresso</span>
                              <span>{imp.total_processadas || 0} / {imp.total_linhas}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
                                style={{ width: `${((imp.total_processadas || 0) / imp.total_linhas) * 100}%` }}
                              />
                            </div>
                            <div className="flex items-center gap-4 mt-2 text-xs">
                              {imp.total_sucesso > 0 && (
                                <span className="flex items-center text-green-600">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  {imp.total_sucesso} sucesso
                                </span>
                              )}
                              {imp.total_erro > 0 && (
                                <span className="flex items-center text-red-600">
                                  <AlertCircle className="w-3 h-3 mr-1" />
                                  {imp.total_erro} erros
                                </span>
                              )}
                              {imp.processado_em && (
                                <span className="flex items-center text-gray-500">
                                  <Clock className="w-3 h-3 mr-1" />
                                  Processado {dayjs(imp.processado_em).fromNow()}
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {imp.observacoes && (
                          <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <p className="text-sm text-yellow-800 flex items-start">
                              <AlertTriangle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                              {imp.observacoes}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-2">
                        {(imp.status === 'pendente' || imp.status === 'revisao') && onReabrir && (
                          <button
                            onClick={() => onReabrir(imp.id)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Reabrir para processar"
                          >
                            <FolderOpen className="w-5 h-5" />
                          </button>
                        )}
                        {onViewDetails && (
                          <button
                            onClick={() => onViewDetails(imp.id)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Ver detalhes"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(imp.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Paginação */}
        {totalPaginas > 1 && (
          <div className="p-6 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Página {paginaAtual} de {totalPaginas}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPaginaAtual(p => Math.max(1, p - 1))}
                  disabled={paginaAtual === 1}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setPaginaAtual(p => Math.min(totalPaginas, p + 1))}
                  disabled={paginaAtual === totalPaginas}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Próxima
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-6 bg-white border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
};

export default HistoricoImportacoes;
