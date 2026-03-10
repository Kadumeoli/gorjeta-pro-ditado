import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Filter,
  Calendar,
  DollarSign,
  TrendingUp,
  Download,
  Receipt,
  Calculator,
  Award,
  Eye
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { testConnection } from '../../lib/supabase';
import dayjs from '../../lib/dayjs';
import { formatCurrency } from '../../utils/currency';
import { imprimirRecibo } from '../../utils/recibo';
import type { DadosRecibo } from '../../utils/recibo';

interface SaldoGorjeta {
  colaborador_id: string;
  colaborador_nome: string;
  funcao_nome?: string;
  total_vendas: number;
  comissao_base: number;
  bonus_meta: number;
  adicionais_total: number;
  descontos_total: number;
  total_liquido: number;
}

interface VendaGarcom {
  id: string;
  colaborador_id: string;
  data_venda: string;
  turno: string;
  valor_vendas: number;
  quantidade_comandas: number;
  valor_gorjeta: number;
  observacoes?: string;
}

interface GorjetaAdicional {
  id: string;
  colaborador_id: string;
  semana: number;
  ano: number;
  tipo: string;
  descricao: string;
  valor: number;
  data_referencia: string;
}

interface DescontoConsumo {
  id: string;
  colaborador_id: string;
  data_desconto: string;
  valor_desconto: number;
  tipo_consumo: string;
  descricao: string;
}

interface ConfigGorjetas {
  percentual_base: number;      // ex.: 0.05 (5%)
  bonus_meta1_pct: number;      // ex.: 0.01
  bonus_meta2_pct: number;      // ex.: 0.02
  meta1_valor: number;          // ex.: 17000
  meta2_valor: number;          // ex.: 24000
  teto_adiantamento_semanal: number;
  adiantamento_abate_saldo: boolean;
}

const GorjetaGarcons: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFornecedorModal, setShowFornecedorModal] = useState(false);
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [colaboradorParaPagamento, setColaboradorParaPagamento] = useState<string | null>(null);
  const [valorParaPagamento, setValorParaPagamento] = useState(0);
  const [selectedFornecedor, setSelectedFornecedor] = useState('');
  const [semanaAtual, setSemanaAtual] = useState(() => {
    const agora = dayjs();
    return { semana: agora.isoWeek(), ano: agora.year() };
  });

  // Estados principais
  const [colaboradores, setColaboradores] = useState<any[]>([]);
  const [saldos, setSaldos] = useState<SaldoGorjeta[]>([]);
  const [vendas, setVendas] = useState<VendaGarcom[]>([]);
  const [adicionais, setAdicionais] = useState<GorjetaAdicional[]>([]);
  const [descontos, setDescontos] = useState<DescontoConsumo[]>([]);
  const [config, setConfig] = useState<ConfigGorjetas | null>(null);

  // Formulários
  const [showVendaForm, setShowVendaForm] = useState(false);
  const [showAdicionalForm, setShowAdicionalForm] = useState(false);
  const [showDescontoForm, setShowDescontoForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  const [formVenda, setFormVenda] = useState({
    colaborador_id: '',
    data_venda: dayjs().format('YYYY-MM-DD'),
    turno: 'almoco',
    valor_vendas: 0,
    quantidade_comandas: 0,
    valor_gorjeta: 0,
    observacoes: ''
  });

  const [formAdicional, setFormAdicional] = useState({
    colaborador_id: '',
    tipo: 'outros',
    descricao: '',
    valor: 0,
    data_referencia: dayjs().format('YYYY-MM-DD')
  });

  const [formDesconto, setFormDesconto] = useState({
    colaborador_id: '',
    data_desconto: dayjs().format('YYYY-MM-DD'),
    tipo_consumo: 'refeicao',
    descricao: '',
    valor_desconto: 0
  });

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [colaboradorFilter, setColaboradorFilter] = useState('all');

  useEffect(() => {
    carregarDadosSemana();
    carregarConfig();
    carregarFornecedores();
  }, [semanaAtual]);

  const carregarFornecedores = async () => {
    try {
      const connectionOk = await testConnection();
      if (!connectionOk) {
        setFornecedores([]);
        return;
      }

      const { data, error } = await supabase
        .from('fornecedores')
        .select('id, nome')
        .eq('status', 'ativo')
        .order('nome');

      if (error) throw error;
      setFornecedores(data || []);
    } catch (err) {
      console.error('Erro ao carregar fornecedores:', err);
      setFornecedores([]);
    }
  };

  const carregarConfig = async () => {
    try {
      const connectionOk = await testConnection();
      if (!connectionOk) {
        setConfig({
          percentual_base: 0.05,
          bonus_meta1_pct: 0.01,
          bonus_meta2_pct: 0.02,
          meta1_valor: 17000,
          meta2_valor: 24000,
          teto_adiantamento_semanal: 395,
          adiantamento_abate_saldo: true
        });
        return;
      }

      const { data, error } = await supabase.from('config_gorjetas').select('*').maybeSingle();
      if (error || !data) {
        setConfig({
          percentual_base: 0.05,
          bonus_meta1_pct: 0.01,
          bonus_meta2_pct: 0.02,
          meta1_valor: 17000,
          meta2_valor: 24000,
          teto_adiantamento_semanal: 395,
          adiantamento_abate_saldo: true
        });
      } else {
        setConfig(data);
      }
    } catch {
      setConfig({
        percentual_base: 0.05,
        bonus_meta1_pct: 0.01,
        bonus_meta2_pct: 0.02,
        meta1_valor: 17000,
        meta2_valor: 24000,
        teto_adiantamento_semanal: 395,
        adiantamento_abate_saldo: true
      });
    }
  };

  const getWeekDates = (ano: number, semana: number) => {
    const startOfWeek = dayjs().year(ano).isoWeek(semana).startOf('isoWeek');
    const endOfWeek = dayjs().year(ano).isoWeek(semana).endOf('isoWeek');
    return {
      start: startOfWeek.format('YYYY-MM-DD'),
      end: endOfWeek.format('YYYY-MM-DD'),
      startFormatted: startOfWeek.format('DD/MM'),
      endFormatted: endOfWeek.format('DD/MM')
    };
  };

  const carregarDadosSemana = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!supabase) {
        console.warn('Supabase client not initialized');
        setColaboradores([]);
        setSaldos([]);
        setVendas([]);
        setAdicionais([]);
        setDescontos([]);
        return;
      }

      const { start, end } = getWeekDates(semanaAtual.ano, semanaAtual.semana);

      // Colaboradores - Filtrar apenas garçons
      const { data: colaboradoresData, error: colaboradoresError } = await supabase
        .from('vw_colaboradores_completo')
        .select('*')
        .eq('status', 'ativo')
        .ilike('funcao_nome', '%garcom%');

      if (colaboradoresError) throw colaboradoresError;

      // Vendas
      const { data: vendasData, error: vendasError } = await supabase
        .from('vendas_garcom')
        .select('*')
        .gte('data_venda', start)
        .lte('data_venda', end);

      if (vendasError) throw vendasError;

      // Adicionais
      const { data: adicionaisData, error: adicionaisError } = await supabase
        .from('gorjetas_adicionais')
        .select('*')
        .eq('semana', semanaAtual.semana)
        .eq('ano', semanaAtual.ano);

      if (adicionaisError) throw adicionaisError;

      // Descontos
      const { data: descontosData, error: descontosError } = await supabase
        .from('descontos_consumo')
        .select('*')
        .gte('data_desconto', start)
        .lte('data_desconto', end);

      if (descontosError) throw descontosError;

      setColaboradores(colaboradoresData || []);
      setVendas(vendasData || []);
      setAdicionais(adicionaisData || []);
      setDescontos(descontosData || []);

      calcularSaldos(colaboradoresData || [], vendasData || [], adicionaisData || [], descontosData || []);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados da semana');
    } finally {
      setLoading(false);
    }
  };

  const calculateBonusMeta = (totalVendas: number): number => {
    if (!config) return 0;
    if (totalVendas >= config.meta2_valor) return totalVendas * config.bonus_meta2_pct;
    if (totalVendas >= config.meta1_valor) return totalVendas * config.bonus_meta1_pct;
    return 0;
  };

  const calcularSaldos = (
    colaboradoresData: any[],
    vendasData: VendaGarcom[],
    adicionaisData: GorjetaAdicional[],
    descontosData: DescontoConsumo[]
  ) => {
    const basePct = config?.percentual_base ?? 0.05;

    const saldosCalculados: SaldoGorjeta[] = colaboradoresData.map((colaborador) => {
      const vendasColaborador = vendasData.filter((v) => v.colaborador_id === colaborador.id);
      const adicionaisColaborador = adicionaisData.filter((a) => a.colaborador_id === colaborador.id);
      const descontosColaborador = descontosData.filter((d) => d.colaborador_id === colaborador.id);

      const totalVendas = vendasColaborador.reduce((sum, v) => sum + (v.valor_vendas || 0), 0);
      const comissaoBase = totalVendas * basePct;
      const bonusMeta = calculateBonusMeta(totalVendas);
      const adicionaisTotal = adicionaisColaborador.reduce((sum, a) => sum + (a.valor || 0), 0);
      const descontosTotal = descontosColaborador.reduce((sum, d) => sum + (d.valor_desconto || 0), 0);
      const totalLiquido = comissaoBase + bonusMeta + adicionaisTotal - descontosTotal;

      return {
        colaborador_id: colaborador.id,
        colaborador_nome: colaborador.nome_completo,
        funcao_nome: colaborador.funcao_nome,
        total_vendas: totalVendas,
        comissao_base: comissaoBase,
        bonus_meta: bonusMeta,
        adicionais_total: adicionaisTotal,
        descontos_total: descontosTotal,
        total_liquido: Math.max(0, totalLiquido)
      };
    });

    setSaldos(saldosCalculados);
  };

  const gerarPagamentoSemanal = async (colaboradorId: string) => {
    try {
      setLoading(true);
      setError(null);

      const colaborador = colaboradores.find((c) => c.id === colaboradorId);
      if (!colaborador) throw new Error('Colaborador não encontrado');

      // Calcular valor líquido da gorjeta
      const saldoColaborador = saldos.find(s => s.colaborador_id === colaboradorId);
      if (!saldoColaborador) throw new Error('Saldo do colaborador não encontrado');
      
      const valorLiquido = saldoColaborador.total_liquido;
      if (valorLiquido <= 0) {
        alert('Não há valor líquido para pagamento deste colaborador.');
        return;
      }

      // Verificar se já existe uma conta a pagar para este colaborador nesta semana
      const { data: contaExistente, error: checkError } = await supabase
        .from('contas_pagar')
        .select('id')
        .eq('origem_rh_tipo', 'gorjeta_semanal')
        .eq('origem_rh_id', colaboradorId)
        .eq('origem_rh_semana', semanaAtual.semana)
        .eq('origem_rh_ano', semanaAtual.ano)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') throw checkError;

      if (contaExistente) {
        alert('Já existe uma conta a pagar registrada para este colaborador nesta semana.');
        return;
      }

      // Buscar fornecedor para o colaborador (se tiver um padrão)
      // Por enquanto, sempre pedir para escolher fornecedor
      setColaboradorParaPagamento(colaboradorId);
      setValorParaPagamento(valorLiquido);
      setShowFornecedorModal(true);

    } catch (err) {
      console.error('Erro ao preparar pagamento semanal:', err);
      setError(err instanceof Error ? err.message : 'Erro ao preparar pagamento semanal');
    } finally {
      setLoading(false);
    }
  };

  const confirmarPagamentoComFornecedor = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!selectedFornecedor || !colaboradorParaPagamento) {
        throw new Error('Selecione um fornecedor');
      }

      const colaborador = colaboradores.find(c => c.id === colaboradorParaPagamento);
      if (!colaborador) throw new Error('Colaborador não encontrado');

      // Buscar centro de custo "Ditado Popular"
      const { data: centroCusto, error: centroError } = await supabase
        .from('centros_custo')
        .select('id')
        .eq('nome', 'Ditado Popular')
        .eq('status', 'ativo')
        .maybeSingle();

      if (centroError && centroError.code !== 'PGRST116') throw centroError;

      let centroCustoId = centroCusto?.id;
      
      // Se não encontrar o centro de custo, criar um
      if (!centroCustoId) {
        const { data: novoCentro, error: criarCentroError } = await supabase
          .from('centros_custo')
          .insert([{
            nome: 'Ditado Popular',
            descricao: 'Centro de custo principal da empresa',
            status: 'ativo'
          }])
          .select('id')
          .single();

        if (criarCentroError) throw criarCentroError;
        centroCustoId = novoCentro.id;
      }

      // Calcular data de vencimento (sexta-feira da semana)
      const sextaFeiraSemana = dayjs()
        .year(semanaAtual.ano)
        .isoWeek(semanaAtual.semana)
        .endOf('isoWeek')
        .subtract(2, 'days') // Domingo é fim da semana ISO, então subtraímos 2 dias para chegar na sexta
        .format('YYYY-MM-DD');

      // Criar conta a pagar
      const { error: contaError } = await supabase
        .from('contas_pagar')
        .insert([{
          fornecedor_id: selectedFornecedor,
          descricao: `Gorjeta semana ${semanaAtual.semana} colaborador ${colaborador.nome_completo}`,
          valor_total: valorParaPagamento,
          data_vencimento: sextaFeiraSemana,
          data_emissao: dayjs().format('YYYY-MM-DD'),
          centro_custo_id: centroCustoId,
          status: 'em_aberto',
          origem_rh_tipo: 'gorjeta_semanal',
          origem_rh_id: colaboradorParaPagamento,
          origem_rh_semana: semanaAtual.semana,
          origem_rh_ano: semanaAtual.ano,
          observacoes: `Pagamento de gorjeta referente à semana ${semanaAtual.semana}/${semanaAtual.ano}`
        }]);

      if (contaError) throw contaError;

      // Fechar modal
      setShowFornecedorModal(false);
      setColaboradorParaPagamento(null);
      setValorParaPagamento(0);
      setSelectedFornecedor('');

      alert('Conta a pagar criada com sucesso no módulo financeiro!');
      
    } catch (err) {
      console.error('Erro ao criar conta a pagar:', err);
      setError(err instanceof Error ? err.message : 'Erro ao criar conta a pagar');
    } finally {
      setLoading(false);
    }
  };

  const salvarVenda = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!formVenda.colaborador_id || !formVenda.data_venda || !formVenda.valor_vendas) {
        throw new Error('Preencha todos os campos obrigatórios');
      }

      const { error } = await supabase.from('vendas_garcom').insert([
        {
          colaborador_id: formVenda.colaborador_id,
          data_venda: formVenda.data_venda,
          turno: formVenda.turno,
          valor_vendas: formVenda.valor_vendas,
          quantidade_comandas: formVenda.quantidade_comandas || 0,
          valor_gorjeta: formVenda.valor_gorjeta || 0,
          observacoes: formVenda.observacoes
        }
      ]);

      if (error) throw error;

      setShowVendaForm(false);
      setFormVenda({
        colaborador_id: '',
        data_venda: dayjs().format('YYYY-MM-DD'),
        turno: 'almoco',
        valor_vendas: 0,
        quantidade_comandas: 0,
        valor_gorjeta: 0,
        observacoes: ''
      });
      carregarDadosSemana();
    } catch (err) {
      console.error('Erro ao salvar venda:', err);
      setError(err instanceof Error ? err.message : 'Erro ao salvar venda');
    } finally {
      setLoading(false);
    }
  };

  const salvarAdicional = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!formAdicional.colaborador_id || !formAdicional.descricao || !formAdicional.valor) {
        throw new Error('Preencha todos os campos obrigatórios');
      }

      const { error } = await supabase
        .from('gorjetas_adicionais')
        .insert([
          {
            colaborador_id: formAdicional.colaborador_id,
            semana: semanaAtual.semana,
            ano: semanaAtual.ano,
            tipo: formAdicional.tipo,
            descricao: formAdicional.descricao,
            valor: formAdicional.valor,
            data_referencia: formAdicional.data_referencia
          }
        ]);

      if (error) throw error;

      setShowAdicionalForm(false);
      // RESET CORRETO (apenas os campos existentes no estado):
      setFormAdicional({
        colaborador_id: '',
        tipo: 'outros',
        descricao: '',
        valor: 0,
        data_referencia: dayjs().format('YYYY-MM-DD')
      });

      carregarDadosSemana();
    } catch (err) {
      console.error('Erro ao salvar gorjeta adicional:', err);
      setError(err instanceof Error ? err.message : 'Erro ao salvar gorjeta adicional');
    } finally {
      setLoading(false);
    }
  };

  const salvarDesconto = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!formDesconto.colaborador_id || !formDesconto.descricao || !formDesconto.valor_desconto) {
        throw new Error('Preencha todos os campos obrigatórios');
      }

      const { error } = await supabase.from('descontos_consumo').insert([
        {
          colaborador_id: formDesconto.colaborador_id,
          data_desconto: formDesconto.data_desconto,
          valor_desconto: formDesconto.valor_desconto,
          tipo_consumo: formDesconto.tipo_consumo,
          descricao: formDesconto.descricao
        }
      ]);

      if (error) throw error;

      setShowDescontoForm(false);
      setFormDesconto({
        colaborador_id: '',
        data_desconto: dayjs().format('YYYY-MM-DD'),
        tipo_consumo: 'refeicao',
        descricao: '',
        valor_desconto: 0
      });
      carregarDadosSemana();
    } catch (err) {
      console.error('Erro ao salvar desconto:', err);
      setError(err instanceof Error ? err.message : 'Erro ao salvar desconto');
    } finally {
      setLoading(false);
    }
  };

  const gerarRecibo = async (colaboradorId: string) => {
    try {
      setLoading(true);

      const colaborador = colaboradores.find((c) => c.id === colaboradorId);
      if (!colaborador) throw new Error('Colaborador não encontrado');

      const vendasColaborador = vendas.filter((v) => v.colaborador_id === colaboradorId);
      const adicionaisColaborador = adicionais.filter((a) => a.colaborador_id === colaboradorId);
      const descontosColaborador = descontos.filter((d) => d.colaborador_id === colaboradorId);

      const totalVendas = vendasColaborador.reduce((sum, v) => sum + (v.valor_vendas || 0), 0);
      const comissaoBase = totalVendas * (config?.percentual_base || 0.05);
      const bonusMeta = calculateBonusMeta(totalVendas);
      const adicionaisTotal = adicionaisColaborador.reduce((sum, a) => sum + (a.valor || 0), 0);
      const descontosTotal = descontosColaborador.reduce((sum, d) => sum + (d.valor_desconto || 0), 0);
      const valorLiquido = Math.max(0, comissaoBase + bonusMeta + adicionaisTotal - descontosTotal);

      const dadosRecibo: DadosRecibo = {
        colaborador: {
          nome_completo: colaborador.nome_completo,
          funcao_nome: colaborador.funcao_nome || 'Funcionário'
        },
        periodo: { semana: semanaAtual.semana, ano: semanaAtual.ano },
        totais: {
          total_vendas: totalVendas,
          percentual_aplicado: (config?.percentual_base || 0.05) * 100,
          comissao_base: comissaoBase,
          adicionais_total: adicionaisTotal,
          descontos_total: descontosTotal,
          adiantamentos_total: 0,
          valor_liquido: valorLiquido
        },
        detalhamento: {
          vendas: vendasColaborador.map((v) => ({
            data_venda: v.data_venda,
            turno: v.turno,
            valor_vendas: v.valor_vendas,
            observacoes: v.observacoes
          })),
          adicionais: adicionaisColaborador.map((a) => ({
            tipo: a.tipo,
            descricao: a.descricao,
            valor: a.valor,
            data_referencia: a.data_referencia
          })),
          descontos: descontosColaborador.map((d) => ({
            data_desconto: d.data_desconto,
            tipo_consumo: d.tipo_consumo,
            descricao: d.descricao,
            valor_desconto: d.valor_desconto
          })),
          adiantamentos: []
        },
        configuracao: {
          meta1_valor: config?.meta1_valor || 17000,
          meta2_valor: config?.meta2_valor || 24000,
          bonus_meta1_pct: config?.bonus_meta1_pct || 0.01,
          bonus_meta2_pct: config?.bonus_meta2_pct || 0.02,
          adiantamento_abate_saldo: config?.adiantamento_abate_saldo ?? true
        }
      };

      imprimirRecibo(dadosRecibo);
    } catch (error) {
      console.error('Erro ao gerar recibo:', error);
      alert('Erro ao gerar recibo: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
    } finally {
      setLoading(false);
    }
  };

  const alterarSemana = (direcao: 'anterior' | 'proxima') => {
    const ref = dayjs().year(semanaAtual.ano).isoWeek(semanaAtual.semana);
    const nova = direcao === 'anterior' ? ref.subtract(1, 'week') : ref.add(1, 'week');
    setSemanaAtual({ semana: nova.isoWeek(), ano: nova.year() });
  };

  const filteredSaldos = saldos.filter((saldo) => {
    if (colaboradorFilter !== 'all' && saldo.colaborador_id !== colaboradorFilter) return false;
    return saldo.colaborador_nome.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const weekDates = getWeekDates(semanaAtual.ano, semanaAtual.semana);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Gestão de Gorjetas</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setShowVendaForm(true)}
            className="px-4 py-2 bg-[#7D1F2C] text-white rounded-lg hover:bg-[#6a1a25]"
          >
            <Plus className="w-4 h-4 inline mr-2" />
            Nova Venda
          </button>
          <button
            onClick={() => setShowAdicionalForm(true)}
            className="px-4 py-2 bg-[#7D1F2C] text-white rounded-lg hover:bg-[#6a1a25]"
          >
            <Plus className="w-4 h-4 inline mr-2" />
            Gorjeta Adicional
          </button>
          <button
            onClick={() => setShowDescontoForm(true)}
            className="px-4 py-2 bg-[#7D1F2C] text-white rounded-lg hover:bg-[#6a1a25]"
          >
            <Plus className="w-4 h-4 inline mr-2" />
            Desconto
          </button>
          <button
            onClick={() => {/* TODO: Exportar tudo */}}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            <Download className="w-4 h-4 inline mr-2" />
            Exportar Tudo
          </button>
        </div>
      </div>

      {error && <div className="p-4 bg-red-100 text-red-700 rounded-lg">{error}</div>}

      {/* Controles de Semana */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-medium text-gray-900 flex items-center">
            <Calendar className="w-5 h-5 mr-2 text-[#7D1F2C]" />
            Semana {semanaAtual.semana}/{semanaAtual.ano}
          </h4>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => alterarSemana('anterior')}
              className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
              ← Anterior
            </button>
            <span className="text-sm text-gray-600">
              {weekDates.startFormatted} a {weekDates.endFormatted}
            </span>
            <button
              onClick={() => alterarSemana('proxima')}
              className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
              Próxima →
            </button>
          </div>
        </div>

        {/* Resumo da Semana */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center">
              <DollarSign className="w-6 h-6 text-blue-600 mr-2" />
              <div>
                <p className="text-sm text-blue-600">Total Vendas</p>
                <p className="text-xl font-bold text-blue-800">
                  {formatCurrency(saldos.reduce((sum, s) => sum + s.total_vendas, 0))}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center">
              <Award className="w-6 h-6 text-green-600 mr-2" />
              <div>
                <p className="text-sm text-green-600">Total Comissões</p>
                <p className="text-xl font-bold text-green-800">
                  {formatCurrency(saldos.reduce((sum, s) => sum + s.comissao_base + s.bonus_meta, 0))}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center">
              <Plus className="w-6 h-6 text-purple-600 mr-2" />
              <div>
                <p className="text-sm text-purple-600">Adicionais</p>
                <p className="text-xl font-bold text-purple-800">
                  {formatCurrency(saldos.reduce((sum, s) => sum + s.adicionais_total, 0))}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-red-50 p-4 rounded-lg">
            <div className="flex items-center">
              <TrendingUp className="w-6 h-6 text-red-600 mr-2" />
              <div>
                <p className="text-sm text-red-600">Total Líquido</p>
                <p className="text-xl font-bold text-red-800">
                  {formatCurrency(saldos.reduce((sum, s) => sum + s.total_liquido, 0))}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar colaborador..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7D1F2C] focus:border-[#7D1F2C]"
              />
            </div>
          </div>

          <div>
            <select
              value={colaboradorFilter}
              onChange={(e) => setColaboradorFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#7D1F2C] focus:border-[#7D1F2C]"
            >
              <option value="all">Todos os Colaboradores</option>
              {colaboradores.map((colaborador) => (
                <option key={colaborador.id} value={colaborador.id}>
                  {colaborador.nome_completo}
                </option>
              ))}
            </select>
          </div>

          <div>
            <button
              onClick={carregarDadosSemana}
              className="w-full px-4 py-2 bg-[#7D1F2C] text-white rounded-md hover:bg-[#6a1a25]"
            >
              <Filter className="w-4 h-4 inline mr-2" />
              Atualizar
            </button>
          </div>
        </div>
      </div>

      {/* Tabela de Saldos */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#7D1F2C]"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left bg-gray-50 border-b">
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Colaborador</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Função</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Total Vendas</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Comissão Base</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Bônus Meta</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Adicionais</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Descontos</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Total Líquido</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSaldos.map((saldo) => (
                  <tr key={saldo.colaborador_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{saldo.colaborador_nome}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">{saldo.funcao_nome || '-'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-blue-600">{formatCurrency(saldo.total_vendas)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-green-600">{formatCurrency(saldo.comissao_base)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-medium ${saldo.bonus_meta > 0 ? 'text-purple-600' : 'text-gray-400'}`}>
                        {formatCurrency(saldo.bonus_meta)}
                      </span>
                      {saldo.bonus_meta > 0 && <div className="text-xs text-purple-500">Meta atingida!</div>}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-medium ${saldo.adicionais_total > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
                        {formatCurrency(saldo.adicionais_total)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-medium ${saldo.descontos_total > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                        {saldo.descontos_total > 0 ? '-' : ''}
                        {formatCurrency(saldo.descontos_total)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-lg text-gray-900">{formatCurrency(saldo.total_liquido)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => gerarRecibo(saldo.colaborador_id)}
                          className="text-[#7D1F2C] hover:text-[#6a1a25]"
                          title="Gerar Recibo"
                        >
                          <Receipt className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => gerarPagamentoSemanal(saldo.colaborador_id)}
                          className="text-green-600 hover:text-green-800"
                          title="Criar Conta a Pagar"
                        >
                          <DollarSign className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {/* abrir detalhes */}}
                          className="text-blue-600 hover:text-blue-800"
                          title="Ver Detalhes"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredSaldos.length === 0 && (
            <div className="text-center py-12">
              <Calculator className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum saldo de gorjeta encontrado</h3>
              <p className="text-gray-500">
                {searchTerm || colaboradorFilter !== 'all'
                  ? 'Nenhum colaborador corresponde aos filtros aplicados.'
                  : 'Não há dados de gorjetas para esta semana.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Modal de Nova Venda */}
      {showVendaForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {editingItem ? 'Editar Venda' : 'Nova Venda'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Colaborador *</label>
                <select
                  value={formVenda.colaborador_id}
                  onChange={(e) => setFormVenda({ ...formVenda, colaborador_id: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  required
                >
                  <option value="">Selecione um colaborador...</option>
                  {colaboradores.map((colaborador) => (
                    <option key={colaborador.id} value={colaborador.id}>
                      {colaborador.nome_completo}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data da Venda *</label>
                <input
                  type="date"
                  value={formVenda.data_venda}
                  onChange={(e) => setFormVenda({ ...formVenda, data_venda: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Turno *</label>
                <select
                  value={formVenda.turno}
                  onChange={(e) => setFormVenda({ ...formVenda, turno: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  required
                >
                  <option value="almoco">Almoço</option>
                  <option value="jantar">Jantar</option>
                  <option value="noite">Noite</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valor das Vendas *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">R$</span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formVenda.valor_vendas}
                    onChange={(e) =>
                      setFormVenda({ ...formVenda, valor_vendas: parseFloat(e.target.value) || 0 })
                    }
                    className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                <textarea
                  value={formVenda.observacoes}
                  onChange={(e) => setFormVenda({ ...formVenda, observacoes: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  rows={2}
                  placeholder="Observações sobre a venda..."
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowVendaForm(false);
                  setEditingItem(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={salvarVenda}
                disabled={loading || !formVenda.colaborador_id || !formVenda.valor_vendas}
                className="px-4 py-2 bg-[#7D1F2C] text-white rounded-md hover:bg-[#6a1a25] disabled:opacity-50"
              >
                {loading ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Gorjeta Adicional */}
      {showAdicionalForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {editingItem ? 'Editar Gorjeta Adicional' : 'Nova Gorjeta Adicional'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Colaborador *</label>
                <select
                  value={formAdicional.colaborador_id}
                  onChange={(e) => setFormAdicional({ ...formAdicional, colaborador_id: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  required
                >
                  <option value="">Selecione um colaborador...</option>
                  {colaboradores.map((colaborador) => (
                    <option key={colaborador.id} value={colaborador.id}>
                      {colaborador.nome_completo}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
                <select
                  value={formAdicional.tipo}
                  onChange={(e) => setFormAdicional({ ...formAdicional, tipo: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  required
                >
                  <option value="gratificacao_lideranca">Gratificação Liderança</option>
                  <option value="gorjeta_fixa_feijoada">Gorjeta Fixa Feijoada</option>
                  <option value="bonus_especial">Bônus Especial</option>
                  <option value="outros">Outros</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição *</label>
                <input
                  type="text"
                  value={formAdicional.descricao}
                  onChange={(e) => setFormAdicional({ ...formAdicional, descricao: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  placeholder="Ex: Liderança da equipe"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valor *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">R$</span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formAdicional.valor}
                    onChange={(e) =>
                      setFormAdicional({ ...formAdicional, valor: parseFloat(e.target.value) || 0 })
                    }
                    className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data de Referência *</label>
                <input
                  type="date"
                  value={formAdicional.data_referencia}
                  onChange={(e) =>
                    setFormAdicional({ ...formAdicional, data_referencia: e.target.value })
                  }
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  required
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowAdicionalForm(false);
                  setEditingItem(null);
                  setFormAdicional({
                    colaborador_id: '',
                    tipo: 'outros',
                    descricao: '',
                    valor: 0,
                    data_referencia: dayjs().format('YYYY-MM-DD')
                  });
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={salvarAdicional}
                disabled={
                  loading || !formAdicional.colaborador_id || !formAdicional.descricao || !formAdicional.valor
                }
                className="px-4 py-2 bg-[#7D1F2C] text-white rounded-md hover:bg-[#6a1a25] disabled:opacity-50"
              >
                {loading ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Desconto */}
      {showDescontoForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {editingItem ? 'Editar Desconto' : 'Novo Desconto'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Colaborador *</label>
                <select
                  value={formDesconto.colaborador_id}
                  onChange={(e) => setFormDesconto({ ...formDesconto, colaborador_id: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  required
                >
                  <option value="">Selecione um colaborador...</option>
                  {colaboradores.map((colaborador) => (
                    <option key={colaborador.id} value={colaborador.id}>
                      {colaborador.nome_completo}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data do Desconto *</label>
                <input
                  type="date"
                  value={formDesconto.data_desconto}
                  onChange={(e) => setFormDesconto({ ...formDesconto, data_desconto: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Consumo *</label>
                <select
                  value={formDesconto.tipo_consumo}
                  onChange={(e) => setFormDesconto({ ...formDesconto, tipo_consumo: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  required
                >
                  <option value="refeicao">Refeição</option>
                  <option value="bebida">Bebida</option>
                  <option value="lanche">Lanche</option>
                  <option value="cafe">Café</option>
                  <option value="outros">Outros</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição *</label>
                <input
                  type="text"
                  value={formDesconto.descricao}
                  onChange={(e) => setFormDesconto({ ...formDesconto, descricao: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  placeholder="Ex: Almoço executivo"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valor do Desconto *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">R$</span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formDesconto.valor_desconto}
                    onChange={(e) =>
                      setFormDesconto({ ...formDesconto, valor_desconto: parseFloat(e.target.value) || 0 })
                    }
                    className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDescontoForm(false);
                  setEditingItem(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={salvarDesconto}
                disabled={
                  loading || !formDesconto.colaborador_id || !formDesconto.descricao || !formDesconto.valor_desconto
                }
                className="px-4 py-2 bg-[#7D1F2C] text-white rounded-md hover:bg-[#6a1a25] disabled:opacity-50"
              >
                {loading ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Seleção de Fornecedor */}
      {showFornecedorModal && colaboradorParaPagamento && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Selecionar Fornecedor para Pagamento
            </h3>
            
            <div className="mb-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900">Detalhes do Pagamento</h4>
                <div className="text-sm text-blue-700 mt-2">
                  <div><strong>Colaborador:</strong> {colaboradores.find(c => c.id === colaboradorParaPagamento)?.nome_completo}</div>
                  <div><strong>Semana:</strong> {semanaAtual.semana}/{semanaAtual.ano}</div>
                  <div><strong>Valor:</strong> {formatCurrency(valorParaPagamento)}</div>
                  <div><strong>Vencimento:</strong> {dayjs().year(semanaAtual.ano).isoWeek(semanaAtual.semana).endOf('isoWeek').subtract(2, 'days').format('DD/MM/YYYY')} (Sexta-feira)</div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fornecedor para Pagamento *
                </label>
                <select
                  value={selectedFornecedor}
                  onChange={(e) => setSelectedFornecedor(e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  required
                >
                  <option value="">Selecione um fornecedor...</option>
                  {fornecedores.map((fornecedor) => (
                    <option key={fornecedor.id} value={fornecedor.id}>
                      {fornecedor.nome}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  O fornecedor será usado para vincular a conta a pagar no sistema financeiro
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowFornecedorModal(false);
                  setColaboradorParaPagamento(null);
                  setValorParaPagamento(0);
                  setSelectedFornecedor('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarPagamentoComFornecedor}
                disabled={loading || !selectedFornecedor}
                className="px-4 py-2 bg-[#7D1F2C] text-white rounded-md hover:bg-[#6a1a25] disabled:opacity-50"
              >
                {loading ? 'Criando Conta...' : 'Criar Conta a Pagar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GorjetaGarcons;
