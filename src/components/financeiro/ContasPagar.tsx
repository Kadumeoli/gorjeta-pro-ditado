import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Calendar, DollarSign, Building2, Eye, CreditCard as Edit, Trash2, CheckSquare, XSquare, Clock, AlertTriangle, CheckCircle, XCircle, Download, FileText, Star, MessageSquare, User, CreditCard, Receipt, Target, Activity, Sparkles } from 'lucide-react';
import { supabase, testConnection } from '../../lib/supabase';
import { ReportGenerator, exportToExcel, formatCurrency } from '../../utils/reportGenerator';
import dayjs from 'dayjs';
import ImportarBoletoIA from './ImportarBoletoIA';
import LancamentoLoteIA from './LancamentoLoteIA';
import ModalVisualizarConta from './ModalVisualizarConta';
import { sugerirCategoria } from '../../services/aiCategorizacao';
import { detectarDuplicatas } from '../../services/aiDetectorDuplicatas';
import { SearchableSelect } from '../common/SearchableSelect';

interface ContaPagar {
  id: string;
  fornecedor_id: string;
  fornecedor_nome: string;
  descricao: string;
  categoria_id?: string;
  categoria_nome?: string;
  categoria_completa?: string;
  centro_custo_id?: string;
  centro_custo_nome?: string;
  forma_pagamento_id?: string;
  forma_pagamento_nome?: string;
  valor_total: number;
  valor_pago: number;
  saldo_restante: number;
  valor_original?: number;
  valor_final?: number;
  desconto?: number;
  juros?: number;
  data_vencimento: string;
  data_emissao: string;
  data_primeira_baixa?: string;
  data_baixa_integral?: string;
  numero_documento?: string;
  status: 'em_aberto' | 'parcialmente_pago' | 'pago' | 'vencido' | 'cancelado' | 'autorizado_pagamento';
  aprovado_para_pagamento: boolean;
  aprovado_por?: string;
  data_aprovacao?: string;
  observacoes?: string;
  prioridade_sugerida?: 'baixa' | 'media' | 'alta' | 'urgente';
  observacao_tesouraria?: string;
  observacao_aprovacao?: string;
  sugerido_por?: string;
  data_sugestao?: string;
  esta_vencida: boolean;
  dias_vencimento: number;
  situacao_vencimento?: 'atrasada' | 'vence_hoje' | 'vence_em_breve' | 'no_prazo' | 'paga' | 'cancelada';
  dias_para_vencer?: number;
  criado_em: string;
  criado_por_nome?: string;
  sugerido_por_nome?: string;
  aprovado_por_nome?: string;
  eh_recorrente?: boolean;
  frequencia_recorrencia?: string;
  dia_vencimento_recorrente?: number;
  recorrencia_ativa?: boolean;
  data_inicio_recorrencia?: string;
  data_fim_recorrencia?: string;
  eh_parcelado?: boolean;
  numero_parcela?: number;
  total_parcelas?: number;
  parcelamento_grupo_id?: string;
  pagamentos_historico?: any[];
  total_pagamentos_parciais?: number;
}

interface FormData {
  fornecedor_id: string;
  descricao: string;
  categoria_id: string;
  centro_custo_id: string;
  forma_pagamento_id: string;
  valor_total: number;
  desconto: number;
  juros: number;
  data_emissao: string;
  data_vencimento: string;
  numero_documento: string;
  observacoes: string;
  prioridade_sugerida: 'baixa' | 'media' | 'alta' | 'urgente';
  observacao_tesouraria: string;
  eh_recorrente: boolean;
  frequencia_recorrencia: string;
  dia_vencimento_recorrente: number;
  data_fim_recorrencia: string;
  eh_parcelado: boolean;
  total_parcelas: number;
}

interface IndicadoresContas {
  total_contas: number;
  valor_total: number;
  valor_pago: number;
  saldo_pendente: number;
  contas_vencidas: number;
  valor_vencido: number;
  contas_aprovadas: number;
  valor_aprovado: number;
  ticket_medio: number;
  contas_a_vencer: number;
  valor_a_vencer: number;
  contas_vence_hoje: number;
  valor_vence_hoje: number;
}

interface ContaBancaria {
  id: string;
  banco: string;
  tipo_conta: string;
  numero_conta?: string;
  saldo_atual: number;
}

interface BaixaModal {
  isOpen: boolean;
  conta: ContaPagar | null;
  valorPagamento: number;
  dataPagamento: string;
  formaPagamentoId: string;
  contaBancariaId: string;
  numeroComprovante: string;
  observacoes: string;
}

const ContasPagar: React.FC = () => {
  const [contas, setContas] = useState<ContaPagar[]>([]);
  const [indicadores, setIndicadores] = useState<IndicadoresContas | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingConta, setEditingConta] = useState<ContaPagar | null>(null);
  const [showIAModal, setShowIAModal] = useState(false);

  // Seleção múltipla
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'em_aberto' | 'parcialmente_pago' | 'pago' | 'vencido' | 'cancelado' | 'autorizado_pagamento'>('all');
  const [situacaoFilter, setSituacaoFilter] = useState<'all' | 'atrasada' | 'vence_hoje' | 'vence_em_breve' | 'no_prazo' | 'paga'>('all');
  const [fornecedorFilter, setFornecedorFilter] = useState('all');
  const [prioridadeFilter, setPrioridadeFilter] = useState('all');
  const [dataInicial, setDataInicial] = useState('');
  const [dataFinal, setDataFinal] = useState('');
  
  // Dados para formulários
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [centrosCusto, setCentrosCusto] = useState<any[]>([]);
  const [formasPagamento, setFormasPagamento] = useState<any[]>([]);
  const [contasBancarias, setContasBancarias] = useState<ContaBancaria[]>([]);

  const [baixaModal, setBaixaModal] = useState<BaixaModal>({
    isOpen: false,
    conta: null,
    valorPagamento: 0,
    dataPagamento: dayjs().format('YYYY-MM-DD'),
    formaPagamentoId: '',
    contaBancariaId: '',
    numeroComprovante: '',
    observacoes: ''
  });

  const [showLancamentoLoteModal, setShowLancamentoLoteModal] = useState(false);
  const [modalVisualizacao, setModalVisualizacao] = useState<{ isOpen: boolean; conta: ContaPagar | null }>({
    isOpen: false,
    conta: null
  });

  const [formData, setFormData] = useState<FormData>({
    fornecedor_id: '',
    descricao: '',
    categoria_id: '',
    centro_custo_id: '',
    forma_pagamento_id: '',
    valor_total: 0,
    desconto: 0,
    juros: 0,
    data_emissao: dayjs().format('YYYY-MM-DD'),
    data_vencimento: dayjs().add(30, 'days').format('YYYY-MM-DD'),
    numero_documento: '',
    observacoes: '',
    prioridade_sugerida: 'media',
    observacao_tesouraria: '',
    eh_recorrente: false,
    frequencia_recorrencia: 'mensal',
    dia_vencimento_recorrente: 10,
    data_fim_recorrencia: '',
    eh_parcelado: false,
    total_parcelas: 1
  });

  useEffect(() => {
    fetchData();
    fetchIndicadores();
    fetchFormData();
  }, []);

  useEffect(() => {
    fetchData();
    fetchIndicadores();
  }, [statusFilter, situacaoFilter, fornecedorFilter, prioridadeFilter, dataInicial, dataFinal]);

  const fetchFormData = async () => {
    try {
      // Test connection first
      const connectionOk = await testConnection();

      if (!connectionOk) {
        console.warn('Supabase connection failed, cannot fetch form data');
        setFornecedores([]);
        setCategorias([]);
        setCentrosCusto([]);
        setFormasPagamento([]);
        setContasBancarias([]);
        return;
      }

      const [fornecedoresRes, categoriasRes, centrosRes, formasRes, contasRes] = await Promise.all([
        supabase.from('fornecedores').select('*').eq('status', 'ativo'),
        supabase.from('vw_categoria_tree').select('*').eq('tipo', 'despesa').eq('status', 'ativo'),
        supabase.from('centros_custo').select('*').eq('status', 'ativo'),
        supabase.from('formas_pagamento').select('*').eq('status', 'ativo'),
        supabase.from('vw_bancos_contas_saldo').select('*').eq('status', 'ativo')
      ]);

      setFornecedores(fornecedoresRes.data || []);
      setCategorias(categoriasRes.data || []);
      setCentrosCusto(centrosRes.data || []);
      setFormasPagamento(formasRes.data || []);
      setContasBancarias(contasRes.data || []);
    } catch (err) {
      console.error('Error fetching form data:', err);
      setFornecedores([]);
      setCategorias([]);
      setCentrosCusto([]);
      setFormasPagamento([]);
      setContasBancarias([]);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Test connection first
      const connectionOk = await testConnection();
      
      if (!connectionOk) {
        console.warn('Supabase connection failed, using empty data');
        setContas([]);
        setLoading(false);
        return;
      }

      let query = supabase.from('vw_contas_pagar').select('*');

      // Aplicar filtros
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (fornecedorFilter !== 'all') {
        query = query.eq('fornecedor_id', fornecedorFilter);
      }

      if (prioridadeFilter !== 'all') {
        query = query.eq('prioridade_sugerida', prioridadeFilter);
      }

      if (dataInicial) {
        query = query.gte('data_vencimento', dataInicial);
      }

      if (dataFinal) {
        query = query.lte('data_vencimento', dataFinal);
      }

      const { data, error } = await query.order('data_vencimento', { ascending: true });

      if (error) throw error;
      setContas(data || []);
    } catch (err) {
      console.error('Error fetching accounts payable:', err);
      console.warn('Using empty data due to connection issues');
      setContas([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchIndicadores = async () => {
    try {
      const connectionOk = await testConnection();
      if (!connectionOk) {
        setIndicadores(null);
        return;
      }

      let query = supabase
        .from('vw_contas_pagar')
        .select('valor_total, valor_pago, saldo_restante, status, data_vencimento, aprovado_para_pagamento, fornecedor_id, prioridade_sugerida, situacao_vencimento');

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      if (fornecedorFilter !== 'all') {
        query = query.eq('fornecedor_id', fornecedorFilter);
      }
      if (prioridadeFilter !== 'all') {
        query = query.eq('prioridade_sugerida', prioridadeFilter);
      }
      if (dataInicial) {
        query = query.gte('data_vencimento', dataInicial);
      }
      if (dataFinal) {
        query = query.lte('data_vencimento', dataFinal);
      }

      const { data: contasData, error } = await query;
      if (error) throw error;

      const pendentes = (contasData || []).filter(c => c.saldo_restante > 0);
      const totalContas = pendentes.length;
      const valorTotal = pendentes.reduce((sum, c) => sum + (c.valor_total || 0), 0);
      const valorPago = pendentes.reduce((sum, c) => sum + (c.valor_pago || 0), 0);
      const saldoPendente = pendentes.reduce((sum, c) => sum + (c.saldo_restante || 0), 0);

      const atrasadas = pendentes.filter(c => c.situacao_vencimento === 'atrasada');
      const aVencer = pendentes.filter(c => c.situacao_vencimento === 'vence_em_breve' || c.situacao_vencimento === 'no_prazo');
      const venceHoje = pendentes.filter(c => c.situacao_vencimento === 'vence_hoje');

      const contasAprovadas = pendentes.filter(c => c.aprovado_para_pagamento === true).length;
      const valorAprovado = pendentes.filter(c => c.aprovado_para_pagamento === true)
        .reduce((sum, c) => sum + (c.saldo_restante || 0), 0);

      const ticketMedio = totalContas > 0 ? valorTotal / totalContas : 0;

      setIndicadores({
        total_contas: totalContas,
        valor_total: valorTotal,
        valor_pago: valorPago,
        saldo_pendente: saldoPendente,
        contas_vencidas: atrasadas.length,
        valor_vencido: atrasadas.reduce((sum, c) => sum + (c.saldo_restante || 0), 0),
        contas_aprovadas: contasAprovadas,
        valor_aprovado: valorAprovado,
        ticket_medio: ticketMedio,
        contas_a_vencer: aVencer.length,
        valor_a_vencer: aVencer.reduce((sum, c) => sum + (c.saldo_restante || 0), 0),
        contas_vence_hoje: venceHoje.length,
        valor_vence_hoje: venceHoje.reduce((sum, c) => sum + (c.saldo_restante || 0), 0),
      });
    } catch (err) {
      console.error('Error fetching indicators:', err);
      setIndicadores(null);
    }
  };

  // Handler para dados extraídos pela IA
  const handleIAExtraction = async (extracted: any) => {
    try {
      setLoading(true);
      setShowIAModal(false);

      // 1. Buscar ou criar fornecedor
      let fornecedorId = '';
      const fornecedorNome = extracted.beneficiario.nome;
      const fornecedorCNPJ = extracted.beneficiario.cnpj;

      if (fornecedorCNPJ) {
        // Buscar por CNPJ
        const { data: fornecedorExistente } = await supabase
          .from('fornecedores')
          .select('id')
          .eq('cnpj', fornecedorCNPJ.replace(/\D/g, ''))
          .maybeSingle();

        if (fornecedorExistente) {
          fornecedorId = fornecedorExistente.id;
        } else {
          // Criar novo fornecedor
          const { data: novoFornecedor, error: fornecedorError } = await supabase
            .from('fornecedores')
            .insert({
              nome: fornecedorNome,
              cnpj: fornecedorCNPJ.replace(/\D/g, ''),
            })
            .select()
            .single();

          if (fornecedorError) throw fornecedorError;
          fornecedorId = novoFornecedor.id;
        }
      } else if (fornecedorNome) {
        // Buscar por nome similar
        const { data: fornecedorSimilar } = await supabase
          .from('fornecedores')
          .select('id')
          .ilike('nome', `%${fornecedorNome}%`)
          .limit(1)
          .maybeSingle();

        if (fornecedorSimilar) {
          fornecedorId = fornecedorSimilar.id;
        } else {
          // Criar novo
          const { data: novoFornecedor, error: fornecedorError } = await supabase
            .from('fornecedores')
            .insert({ nome: fornecedorNome })
            .select()
            .single();

          if (fornecedorError) throw fornecedorError;
          fornecedorId = novoFornecedor.id;
        }
      }

      // 2. Detectar duplicatas
      const duplicatas = await detectarDuplicatas({
        fornecedor_id: fornecedorId,
        fornecedor_nome: fornecedorNome,
        valor: extracted.valores.total,
        data_vencimento: extracted.datas.vencimento,
        numero_documento: extracted.codigo_barras || extracted.linha_digitavel,
        descricao: extracted.descricao,
      }, 'pagar');

      // Alertar se encontrou duplicatas
      if (duplicatas.length > 0 && duplicatas[0].tipo === 'exata') {
        const confirmar = window.confirm(
          `⚠️ DUPLICATA DETECTADA!\n\n` +
          `Uma conta similar já existe:\n` +
          `Fornecedor: ${duplicatas[0].conta.fornecedor_nome}\n` +
          `Valor: ${formatCurrency(duplicatas[0].conta.valor)}\n` +
          `Vencimento: ${dayjs(duplicatas[0].conta.data_vencimento).format('DD/MM/YYYY')}\n\n` +
          `Deseja continuar mesmo assim?`
        );
        if (!confirmar) {
          setLoading(false);
          return;
        }
      } else if (duplicatas.length > 0 && duplicatas[0].similaridade >= 0.7) {
        const confirmar = window.confirm(
          `💡 Conta similar encontrada (${(duplicatas[0].similaridade * 100).toFixed(0)}% similar)\n\n` +
          `${duplicatas[0].motivos.join('\n')}\n\n` +
          `Deseja continuar?`
        );
        if (!confirmar) {
          setLoading(false);
          return;
        }
      }

      // 3. Sugerir categoria automaticamente
      const categoriaSugerida = await sugerirCategoria(
        fornecedorId,
        fornecedorNome,
        extracted.descricao || extracted.categoria_sugerida,
        extracted.valores.total
      );

      // 4. Preencher formulário com dados extraídos
      setFormData({
        fornecedor_id: fornecedorId,
        descricao: extracted.descricao || `Boleto - ${fornecedorNome}`,
        categoria_id: categoriaSugerida?.categoria_id || '',
        centro_custo_id: '',
        forma_pagamento_id: '',
        valor_total: extracted.valores.total,
        desconto: extracted.valores.desconto,
        juros: extracted.valores.juros + extracted.valores.multa,
        data_emissao: extracted.datas.emissao || dayjs().format('YYYY-MM-DD'),
        data_vencimento: extracted.datas.vencimento,
        numero_documento: extracted.codigo_barras || extracted.linha_digitavel || '',
        observacoes: extracted.observacoes || '',
        prioridade_sugerida: 'media',
        observacao_tesouraria: categoriaSugerida ? `IA sugeriu categoria: ${categoriaSugerida.categoria_nome} (${(categoriaSugerida.confianca * 100).toFixed(0)}% confiança)` : '',
        eh_recorrente: false,
        frequencia_recorrencia: '',
        dia_vencimento_recorrente: 0,
        data_fim_recorrencia: '',
        eh_parcelado: false,
        total_parcelas: 0,
      });

      // 5. Registrar auditoria de IA
      await supabase.from('ia_extractions_financeiro').insert({
        tipo_extracao: 'boleto',
        tipo_conta: 'pagar',
        dados_extraidos: extracted,
        confidence_media: Object.values(extracted.confidences).reduce((a: any, b: any) => a + b, 0) / Object.keys(extracted.confidences).length,
        categoria_sugerida_id: categoriaSugerida?.categoria_id,
        duplicatas_detectadas: duplicatas.length,
        arquivo_nome: 'boleto.jpg',
        modelo_ia: 'gpt-4o',
      });

      // 6. Abrir formulário com dados pré-preenchidos
      setShowForm(true);
      setLoading(false);

      // Mostrar notificação
      if (categoriaSugerida) {
        alert(
          `✨ Dados extraídos com sucesso!\n\n` +
          `📊 Categoria sugerida: ${categoriaSugerida.categoria_nome}\n` +
          `🎯 Confiança: ${(categoriaSugerida.confianca * 100).toFixed(0)}%\n` +
          `💡 ${categoriaSugerida.razao}\n\n` +
          `Revise os dados e confirme para salvar.`
        );
      }
    } catch (err) {
      console.error('Erro ao processar extração IA:', err);
      setError('Erro ao processar dados da IA. Tente novamente.');
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);

      const valorOriginal = parseFloat(formData.valor_total.toString());
      const desconto = parseFloat(formData.desconto.toString()) || 0;
      const juros = parseFloat(formData.juros.toString()) || 0;
      const valorFinal = valorOriginal - desconto + juros;

      if (editingConta) {
        const dataToSave = {
          ...formData,
          valor_original: valorOriginal,
          valor_total: valorFinal,
          valor_final: valorFinal,
          desconto,
          juros,
          data_fim_recorrencia: formData.data_fim_recorrencia || null
        };

        const { error } = await supabase
          .from('contas_pagar')
          .update(dataToSave)
          .eq('id', editingConta.id);

        if (error) throw error;
      } else {
        if (formData.eh_parcelado && formData.total_parcelas > 1) {
          const parcelamentoGrupoId = crypto.randomUUID();
          const valorParcela = valorFinal / formData.total_parcelas;
          const parcelas = [];

          for (let i = 1; i <= formData.total_parcelas; i++) {
            const dataVencimento = dayjs(formData.data_vencimento).add(i - 1, 'month').format('YYYY-MM-DD');
            parcelas.push({
              fornecedor_id: formData.fornecedor_id,
              descricao: `${formData.descricao} - Parcela ${i}/${formData.total_parcelas}`,
              categoria_id: formData.categoria_id || null,
              centro_custo_id: formData.centro_custo_id || null,
              forma_pagamento_id: formData.forma_pagamento_id || null,
              valor_original: valorParcela,
              valor_total: valorParcela,
              valor_final: valorParcela,
              desconto: 0,
              juros: 0,
              data_emissao: formData.data_emissao,
              data_vencimento: dataVencimento,
              numero_documento: formData.numero_documento || null,
              observacoes: formData.observacoes || null,
              prioridade_sugerida: formData.prioridade_sugerida,
              observacao_tesouraria: formData.observacao_tesouraria || null,
              eh_parcelado: true,
              numero_parcela: i,
              total_parcelas: formData.total_parcelas,
              parcelamento_grupo_id: parcelamentoGrupoId,
              eh_recorrente: false,
              frequencia_recorrencia: null,
              dia_vencimento_recorrente: null,
              data_fim_recorrencia: null
            });
          }

          const { error } = await supabase
            .from('contas_pagar')
            .insert(parcelas);

          if (error) throw error;
        } else if (formData.eh_recorrente) {
          const dataToSave = {
            fornecedor_id: formData.fornecedor_id,
            descricao: formData.descricao,
            categoria_id: formData.categoria_id || null,
            centro_custo_id: formData.centro_custo_id || null,
            forma_pagamento_id: formData.forma_pagamento_id || null,
            valor_original: valorOriginal,
            valor_total: valorFinal,
            valor_final: valorFinal,
            desconto,
            juros,
            data_emissao: formData.data_emissao,
            data_vencimento: formData.data_vencimento,
            numero_documento: formData.numero_documento || null,
            observacoes: formData.observacoes || null,
            prioridade_sugerida: formData.prioridade_sugerida,
            observacao_tesouraria: formData.observacao_tesouraria || null,
            eh_recorrente: true,
            frequencia_recorrencia: formData.frequencia_recorrencia,
            dia_vencimento_recorrente: formData.dia_vencimento_recorrente,
            data_inicio_recorrencia: formData.data_vencimento,
            recorrencia_ativa: true,
            data_fim_recorrencia: formData.data_fim_recorrencia || null,
            eh_parcelado: false,
            numero_parcela: null,
            total_parcelas: null,
            parcelamento_grupo_id: null
          };

          const { error } = await supabase
            .from('contas_pagar')
            .insert([dataToSave]);

          if (error) throw error;
        } else {
          const dataToSave = {
            fornecedor_id: formData.fornecedor_id,
            descricao: formData.descricao,
            categoria_id: formData.categoria_id || null,
            centro_custo_id: formData.centro_custo_id || null,
            forma_pagamento_id: formData.forma_pagamento_id || null,
            valor_original: valorOriginal,
            valor_total: valorFinal,
            valor_final: valorFinal,
            desconto,
            juros,
            data_emissao: formData.data_emissao,
            data_vencimento: formData.data_vencimento,
            numero_documento: formData.numero_documento || null,
            observacoes: formData.observacoes || null,
            prioridade_sugerida: formData.prioridade_sugerida,
            observacao_tesouraria: formData.observacao_tesouraria || null,
            eh_recorrente: false,
            frequencia_recorrencia: null,
            dia_vencimento_recorrente: null,
            data_fim_recorrencia: null,
            eh_parcelado: false,
            numero_parcela: null,
            total_parcelas: null,
            parcelamento_grupo_id: null
          };

          const { error } = await supabase
            .from('contas_pagar')
            .insert([dataToSave]);

          if (error) throw error;
        }
      }

      setShowForm(false);
      setEditingConta(null);
      resetForm();
      fetchData();
      fetchIndicadores();
    } catch (err) {
      console.error('Error saving account:', err);
      setError(err instanceof Error ? err.message : 'Erro ao salvar conta');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta conta? Esta ação irá excluir também todos os pagamentos e lançamentos vinculados.')) return;

    try {
      setLoading(true);
      setError(null);

      console.log('🗑️ Excluindo conta:', id);

      const { data, error } = await supabase
        .from('contas_pagar')
        .delete()
        .eq('id', id)
        .select();

      if (error) {
        console.error('❌ Erro ao excluir:', error);
        throw error;
      }

      console.log('✅ Conta excluída com sucesso:', data);

      // Recarregar dados
      await fetchData();
      await fetchIndicadores();

      alert('Conta excluída com sucesso!');
    } catch (err) {
      console.error('❌ Error deleting account:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro ao excluir conta';
      setError(errorMessage);
      alert(`Erro ao excluir conta: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // Funções de seleção múltipla
  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
    setShowBulkActions(newSelected.size > 0);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredContas.length && filteredContas.length > 0) {
      setSelectedIds(new Set());
      setShowBulkActions(false);
    } else {
      setSelectedIds(new Set(filteredContas.map(c => c.id)));
      setShowBulkActions(true);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    if (!confirm(`Tem certeza que deseja excluir ${selectedIds.size} conta(s)? Esta ação irá excluir também todos os pagamentos e lançamentos vinculados.`)) return;

    try {
      setLoading(true);
      setError(null);

      console.log(`🗑️ Excluindo ${selectedIds.size} contas em lote`);

      const errors = [];
      for (const id of Array.from(selectedIds)) {
        const { error } = await supabase
          .from('contas_pagar')
          .delete()
          .eq('id', id);

        if (error) {
          console.error(`❌ Erro ao excluir conta ${id}:`, error);
          errors.push(error.message);
        }
      }

      if (errors.length > 0) {
        throw new Error(`Erro ao excluir ${errors.length} conta(s): ${errors.join(', ')}`);
      }

      console.log(`✅ ${selectedIds.size} conta(s) excluída(s) com sucesso`);

      setSelectedIds(new Set());
      setShowBulkActions(false);
      await fetchData();
      await fetchIndicadores();

      alert(`${selectedIds.size} conta(s) excluída(s) com sucesso!`);
    } catch (err) {
      console.error('❌ Error deleting accounts:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro ao excluir contas';
      setError(errorMessage);
      alert(`Erro ao excluir contas: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const openForm = (conta?: ContaPagar) => {
    if (conta) {
      setEditingConta(conta);
      setFormData({
        fornecedor_id: conta.fornecedor_id,
        descricao: conta.descricao,
        categoria_id: conta.categoria_id || '',
        centro_custo_id: conta.centro_custo_id || '',
        forma_pagamento_id: conta.forma_pagamento_id || '',
        valor_total: conta.valor_original || conta.valor_total,
        desconto: conta.desconto || 0,
        juros: conta.juros || 0,
        data_emissao: conta.data_emissao,
        data_vencimento: conta.data_vencimento,
        numero_documento: conta.numero_documento || '',
        observacoes: conta.observacoes || '',
        prioridade_sugerida: conta.prioridade_sugerida || 'media',
        observacao_tesouraria: conta.observacao_tesouraria || '',
        eh_recorrente: conta.eh_recorrente || false,
        frequencia_recorrencia: conta.frequencia_recorrencia || 'mensal',
        dia_vencimento_recorrente: conta.dia_vencimento_recorrente || 10,
        data_fim_recorrencia: conta.data_fim_recorrencia || '',
        eh_parcelado: conta.eh_parcelado || false,
        total_parcelas: conta.total_parcelas || 1
      });
    } else {
      setEditingConta(null);
      resetForm();
    }
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      fornecedor_id: '',
      descricao: '',
      categoria_id: '',
      centro_custo_id: '',
      forma_pagamento_id: '',
      valor_total: 0,
      desconto: 0,
      juros: 0,
      data_emissao: dayjs().format('YYYY-MM-DD'),
      data_vencimento: dayjs().add(30, 'days').format('YYYY-MM-DD'),
      numero_documento: '',
      observacoes: '',
      prioridade_sugerida: 'media',
      observacao_tesouraria: '',
      eh_recorrente: false,
      frequencia_recorrencia: 'mensal',
      dia_vencimento_recorrente: 10,
      data_fim_recorrencia: '',
      eh_parcelado: false,
      total_parcelas: 1
    });
  };

  const abrirModalBaixa = (conta: ContaPagar) => {
    setBaixaModal({
      isOpen: true,
      conta,
      valorPagamento: conta.saldo_restante,
      dataPagamento: dayjs().format('YYYY-MM-DD'),
      formaPagamentoId: '',
      contaBancariaId: '',
      numeroComprovante: '',
      observacoes: ''
    });
  };

  const fecharModalBaixa = () => {
    setBaixaModal({
      isOpen: false,
      conta: null,
      valorPagamento: 0,
      dataPagamento: dayjs().format('YYYY-MM-DD'),
      formaPagamentoId: '',
      contaBancariaId: '',
      numeroComprovante: '',
      observacoes: ''
    });
  };

  const handleDarBaixa = async () => {
    if (!baixaModal.conta) return;

    try {
      setLoading(true);
      setError(null);

      if (!baixaModal.formaPagamentoId || !baixaModal.contaBancariaId) {
        throw new Error('Selecione a forma de pagamento e a conta bancária');
      }

      if (baixaModal.valorPagamento <= 0) {
        throw new Error('Valor de pagamento deve ser maior que zero');
      }

      if (baixaModal.valorPagamento > baixaModal.conta.saldo_restante) {
        throw new Error('Valor de pagamento maior que saldo restante');
      }

      const { data: userData } = await supabase.auth.getUser();

      const { error: rpcError } = await supabase.rpc('api_fin_dar_baixa_conta', {
        p_conta_pagar_id: baixaModal.conta.id,
        p_valor_pagamento: baixaModal.valorPagamento,
        p_data_pagamento: baixaModal.dataPagamento,
        p_forma_pagamento_id: baixaModal.formaPagamentoId,
        p_conta_bancaria_id: baixaModal.contaBancariaId,
        p_numero_comprovante: baixaModal.numeroComprovante || null,
        p_observacoes: baixaModal.observacoes || null,
        p_usuario: userData?.user?.id || null
      });

      if (rpcError) throw rpcError;

      fecharModalBaixa();
      fetchData();
      fetchIndicadores();
    } catch (err) {
      console.error('Error recording payment:', err);
      setError(err instanceof Error ? err.message : 'Erro ao dar baixa');
    } finally {
      setLoading(false);
    }
  };

  const filteredContas = contas.filter(conta => {
    const matchesSearch = conta.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         conta.fornecedor_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         conta.numero_documento?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSituacao = situacaoFilter === 'all' || conta.situacao_vencimento === situacaoFilter;
    return matchesSearch && matchesSituacao;
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getStatusColor = (status: string, conta?: ContaPagar) => {
    if (conta && conta.saldo_restante <= 0 && status !== 'cancelado') return 'text-green-700 bg-green-100';
    if (conta?.situacao_vencimento === 'atrasada') return 'text-red-700 bg-red-100';
    if (conta?.situacao_vencimento === 'vence_hoje') return 'text-amber-700 bg-amber-100';
    if (conta?.situacao_vencimento === 'vence_em_breve') return 'text-orange-700 bg-orange-100';
    switch (status) {
      case 'pago': return 'text-green-700 bg-green-100';
      case 'em_aberto': return 'text-blue-700 bg-blue-100';
      case 'parcialmente_pago': return 'text-yellow-700 bg-yellow-100';
      case 'vencido': return 'text-red-700 bg-red-100';
      case 'cancelado': return 'text-gray-700 bg-gray-100';
      case 'autorizado_pagamento': return 'text-teal-700 bg-teal-100';
      default: return 'text-gray-700 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string, conta?: ContaPagar) => {
    if (conta && conta.saldo_restante <= 0 && status !== 'cancelado') return <CheckCircle className="w-4 h-4" />;
    if (conta?.situacao_vencimento === 'atrasada') return <AlertTriangle className="w-4 h-4" />;
    if (conta?.situacao_vencimento === 'vence_hoje') return <Clock className="w-4 h-4" />;
    switch (status) {
      case 'pago': return <CheckCircle className="w-4 h-4" />;
      case 'em_aberto': return <Clock className="w-4 h-4" />;
      case 'parcialmente_pago': return <AlertTriangle className="w-4 h-4" />;
      case 'vencido': return <XCircle className="w-4 h-4" />;
      case 'cancelado': return <FileText className="w-4 h-4" />;
      case 'autorizado_pagamento': return <CheckSquare className="w-4 h-4" />;
      default: return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getStatusText = (status: string, conta?: ContaPagar) => {
    if (conta && conta.saldo_restante <= 0 && status !== 'cancelado') return 'Pago';
    if (conta?.situacao_vencimento === 'atrasada') return 'Atrasada';
    if (conta?.situacao_vencimento === 'vence_hoje') return 'Vence Hoje';
    if (conta?.situacao_vencimento === 'vence_em_breve') return 'Prox. Venc.';
    switch (status) {
      case 'pago': return 'Pago';
      case 'em_aberto': return 'Em Aberto';
      case 'parcialmente_pago': return 'Parcial';
      case 'vencido': return 'Vencido';
      case 'cancelado': return 'Cancelado';
      case 'autorizado_pagamento': return 'Autorizado';
      default: return 'Desconhecido';
    }
  };

  const getPrioridadeColor = (prioridade?: string) => {
    switch (prioridade) {
      case 'urgente':
        return 'text-red-700 bg-red-100 border-red-200';
      case 'alta':
        return 'text-orange-700 bg-orange-100 border-orange-200';
      case 'media':
        return 'text-yellow-700 bg-yellow-100 border-yellow-200';
      case 'baixa':
        return 'text-green-700 bg-green-100 border-green-200';
      default:
        return 'text-gray-700 bg-gray-100 border-gray-200';
    }
  };

  const getPrioridadeIcon = (prioridade?: string) => {
    switch (prioridade) {
      case 'urgente':
        return <AlertTriangle className="w-4 h-4" />;
      case 'alta':
        return <Star className="w-4 h-4" />;
      case 'media':
        return <Clock className="w-4 h-4" />;
      case 'baixa':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getPrioridadeText = (prioridade?: string) => {
    switch (prioridade) {
      case 'urgente':
        return 'Urgente';
      case 'alta':
        return 'Alta';
      case 'media':
        return 'Média';
      case 'baixa':
        return 'Baixa';
      default:
        return 'Não definida';
    }
  };

  const exportData = () => {
    if (filteredContas.length === 0) {
      alert('Não há dados para exportar');
      return;
    }

    const headers = [
      'Fornecedor',
      'Descrição',
      'Categoria',
      'Centro de Custo',
      'Valor Total',
      'Valor Pago',
      'Saldo Restante',
      'Data Vencimento',
      'Data Emissão',
      'Número Documento',
      'Status',
      'Prioridade',
      'Observação Tesouraria',
      'Sugerido Por',
      'Data Sugestão',
      'Aprovado Para Pagamento',
      'Observação Aprovação'
    ];

    const data = filteredContas.map(conta => [
      conta.fornecedor_nome,
      conta.descricao,
      conta.categoria_nome || '',
      conta.centro_custo_nome || '',
      conta.valor_total,
      conta.valor_pago,
      conta.saldo_restante,
      dayjs(conta.data_vencimento).format('DD/MM/YYYY'),
      dayjs(conta.data_emissao).format('DD/MM/YYYY'),
      conta.numero_documento || '',
      getStatusText(conta.status, conta),
      getPrioridadeText(conta.prioridade_sugerida),
      conta.observacao_tesouraria || '',
      conta.sugerido_por_nome || '',
      conta.data_sugestao ? dayjs(conta.data_sugestao).format('DD/MM/YYYY HH:mm') : '',
      conta.aprovado_para_pagamento ? 'Sim' : 'Não',
      conta.observacao_aprovacao || ''
    ]);

    const filename = `contas-pagar-${dayjs().format('YYYY-MM-DD')}`;
    exportToExcel(data, filename, headers);
  };

  const generatePDFReport = () => {
    if (filteredContas.length === 0) {
      alert('Não há dados para gerar relatório');
      return;
    }

    const reportGenerator = new ReportGenerator({
      title: 'Relatório de Contas a Pagar',
      subtitle: `Gerado em ${dayjs().format('DD/MM/YYYY')} - Total de ${filteredContas.length} contas`,
      filename: `contas-pagar-${dayjs().format('YYYY-MM-DD')}.pdf`,
      orientation: 'landscape'
    });
    
    let currentY = reportGenerator.addHeader('Relatório de Contas a Pagar', `Período: ${dayjs().format('DD/MM/YYYY')} - ${filteredContas.length} contas`);

    // Resumo executivo
    if (indicadores) {
      const resumo = [
        ['Total de Contas', indicadores.total_contas.toString()],
        ['Valor Total', formatCurrency(indicadores.valor_total)],
        ['Valor Pago', formatCurrency(indicadores.valor_pago)],
        ['Saldo Pendente', formatCurrency(indicadores.saldo_pendente)],
        ['Contas Vencidas', `${indicadores.contas_vencidas} (${formatCurrency(indicadores.valor_vencido)})`],
        ['Contas Aprovadas', `${indicadores.contas_aprovadas} (${formatCurrency(indicadores.valor_aprovado)})`],
        ['Ticket Médio', formatCurrency(indicadores.ticket_medio)]
      ];

      currentY = reportGenerator.addSection('Resumo Executivo', [], currentY);
      currentY = reportGenerator.addTable(['Indicador', 'Valor'], resumo, currentY);
    }

    // Análise por Prioridade
    const prioridades = ['urgente', 'alta', 'media', 'baixa'];
    const analisesPrioridade = prioridades.map(prioridade => {
      const contasPrioridade = filteredContas.filter(c => c.prioridade_sugerida === prioridade);
      const valorTotal = contasPrioridade.reduce((sum, c) => sum + c.saldo_restante, 0);
      return [
        getPrioridadeText(prioridade),
        contasPrioridade.length.toString(),
        formatCurrency(valorTotal),
        contasPrioridade.length > 0 ? formatCurrency(valorTotal / contasPrioridade.length) : formatCurrency(0)
      ];
    });

    currentY = reportGenerator.addSection('Análise por Prioridade', [], currentY + 10);
    currentY = reportGenerator.addTable(['Prioridade', 'Quantidade', 'Valor Total', 'Ticket Médio'], analisesPrioridade, currentY);

    // Análise por Status
    const statusList = ['em_aberto', 'parcialmente_pago', 'vencido', 'pago'];
    const analiseStatus = statusList.map(status => {
      const contasStatus = filteredContas.filter(c => c.status === status);
      const valorTotal = contasStatus.reduce((sum, c) => sum + c.saldo_restante, 0);
      return [
        getStatusText(status),
        contasStatus.length.toString(),
        formatCurrency(valorTotal),
        contasStatus.length > 0 ? `${((contasStatus.length / filteredContas.length) * 100).toFixed(1)}%` : '0%'
      ];
    });

    currentY = reportGenerator.addSection('Análise por Status', [], currentY + 10);
    currentY = reportGenerator.addTable(['Status', 'Quantidade', 'Saldo Restante', '% do Total'], analiseStatus, currentY);

    // Top 10 Fornecedores por Saldo Pendente
    const fornecedoresSaldo = {};
    filteredContas.forEach(conta => {
      const fornecedor = conta.fornecedor_nome;
      if (!fornecedoresSaldo[fornecedor]) {
        fornecedoresSaldo[fornecedor] = {
          total_contas: 0,
          saldo_pendente: 0,
          valor_total: 0,
          contas_vencidas: 0
        };
      }
      fornecedoresSaldo[fornecedor].total_contas += 1;
      fornecedoresSaldo[fornecedor].saldo_pendente += conta.saldo_restante;
      fornecedoresSaldo[fornecedor].valor_total += conta.valor_total;
      if (conta.esta_vencida) {
        fornecedoresSaldo[fornecedor].contas_vencidas += 1;
      }
    });

    const top10Fornecedores = Object.entries(fornecedoresSaldo)
      .sort(([,a], [,b]) => (b as any).saldo_pendente - (a as any).saldo_pendente)
      .slice(0, 10)
      .map(([fornecedor, dados]: [string, any]) => [
        fornecedor,
        dados.total_contas.toString(),
        formatCurrency(dados.valor_total),
        formatCurrency(dados.saldo_pendente),
        dados.contas_vencidas.toString()
      ]);

    currentY = reportGenerator.addSection('Top 10 Fornecedores por Saldo Pendente', [], currentY + 10);
    currentY = reportGenerator.addTable(['Fornecedor', 'Qtd Contas', 'Valor Total', 'Saldo Pendente', 'Vencidas'], top10Fornecedores, currentY);

    // Contas Críticas (Vencidas e de Alta Prioridade)
    const contasCriticas = filteredContas
      .filter(c => c.esta_vencida || c.prioridade_sugerida === 'urgente' || c.prioridade_sugerida === 'alta')
      .slice(0, 20) // Primeiras 20 para não estourar o PDF
      .map(conta => [
        conta.fornecedor_nome,
        conta.descricao.length > 40 ? conta.descricao.substring(0, 40) + '...' : conta.descricao,
        dayjs(conta.data_vencimento).format('DD/MM/YYYY'),
        formatCurrency(conta.saldo_restante),
        getPrioridadeText(conta.prioridade_sugerida),
        conta.esta_vencida ? `${conta.dias_vencimento} dias` : 'No prazo',
        getStatusText(conta.status, conta)
      ]);

    if (contasCriticas.length > 0) {
      currentY = reportGenerator.addSection('Contas Críticas (Vencidas e Alta Prioridade)', [], currentY + 10);
      currentY = reportGenerator.addTable(['Fornecedor', 'Descrição', 'Vencimento', 'Saldo', 'Prioridade', 'Situação', 'Status'], contasCriticas, currentY);
    }

    reportGenerator.save(`relatorio-contas-pagar-${dayjs().format('YYYY-MM-DD')}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Contas a Pagar</h3>
        <div className="flex gap-2">
          <button
            onClick={exportData}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            <Download className="w-4 h-4 inline mr-2" />
            Exportar Excel
          </button>
          <button
            onClick={generatePDFReport}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <FileText className="w-4 h-4 inline mr-2" />
            Relatório PDF
          </button>
          <button
            onClick={() => setShowLancamentoLoteModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 flex items-center"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Lançamento em Lote (IA)
          </button>
          <button
            onClick={() => setShowIAModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 flex items-center"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Importar Boleto (IA)
          </button>
          <button
            onClick={() => openForm()}
            className="px-4 py-2 bg-[#7D1F2C] text-white rounded-lg hover:bg-[#6a1a25]"
          >
            <Plus className="w-4 h-4 inline mr-2" />
            Nova Conta a Pagar
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* Barra de Ações em Lote */}
      {showBulkActions && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-gray-900">
              {selectedIds.size} conta(s) selecionada(s)
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleBulkDelete}
              disabled={loading}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              Excluir Selecionadas
            </button>
            <button
              onClick={() => {
                setSelectedIds(new Set());
                setShowBulkActions(false);
              }}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
            >
              <XSquare className="w-4 h-4" />
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Indicadores */}
      {indicadores && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                <CreditCard className="w-5 h-5 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Pendentes</p>
                <p className="text-xl font-bold text-gray-900">{indicadores.total_contas}</p>
                <p className="text-xs text-gray-500 truncate">{formatCurrency(indicadores.saldo_pendente)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border border-red-200 border-l-4 border-l-red-500">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-red-600 uppercase tracking-wide">Atrasadas</p>
                <p className="text-xl font-bold text-red-700">{indicadores.contas_vencidas}</p>
                <p className="text-xs text-red-500 truncate">{formatCurrency(indicadores.valor_vencido)}</p>
              </div>
            </div>
          </div>

          {indicadores.contas_vence_hoje > 0 && (
            <div className="bg-white p-5 rounded-xl shadow-sm border border-amber-200 border-l-4 border-l-amber-500">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-amber-600 uppercase tracking-wide">Vencem Hoje</p>
                  <p className="text-xl font-bold text-amber-700">{indicadores.contas_vence_hoje}</p>
                  <p className="text-xs text-amber-500 truncate">{formatCurrency(indicadores.valor_vence_hoje)}</p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white p-5 rounded-xl shadow-sm border border-blue-200 border-l-4 border-l-blue-500">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">A Vencer</p>
                <p className="text-xl font-bold text-blue-700">{indicadores.contas_a_vencer}</p>
                <p className="text-xs text-blue-500 truncate">{formatCurrency(indicadores.valor_a_vencer)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Ja Pago</p>
                <p className="text-xl font-bold text-green-700">{formatCurrency(indicadores.valor_pago)}</p>
                <p className="text-xs text-gray-500 truncate">de {formatCurrency(indicadores.valor_total)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-8 gap-3">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar contas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7D1F2C] focus:border-[#7D1F2C]"
              />
            </div>
          </div>

          <div>
            <SearchableSelect
              options={[
                { value: 'all', label: 'Todas as Situações' },
                { value: 'atrasada', label: 'Atrasadas' },
                { value: 'vence_hoje', label: 'Vencem Hoje' },
                { value: 'vence_em_breve', label: 'Próximos 7 dias' },
                { value: 'no_prazo', label: 'No Prazo' },
                { value: 'paga', label: 'Pagas' }
              ]}
              value={situacaoFilter}
              onChange={(value) => setSituacaoFilter(value as any)}
              placeholder="Situação"
              theme="light"
            />
          </div>

          <div>
            <SearchableSelect
              options={[
                { value: 'all', label: 'Todos os Status' },
                { value: 'em_aberto', label: 'Em Aberto' },
                { value: 'parcialmente_pago', label: 'Parcial' },
                { value: 'autorizado_pagamento', label: 'Autorizado' },
                { value: 'pago', label: 'Pago' },
                { value: 'cancelado', label: 'Cancelado' }
              ]}
              value={statusFilter}
              onChange={(value) => setStatusFilter(value as any)}
              placeholder="Status"
              theme="light"
            />
          </div>

          <div>
            <SearchableSelect
              options={[
                { value: 'all', label: 'Todos os Fornecedores' },
                ...fornecedores.map((f) => ({
                  value: f.id,
                  label: f.nome
                }))
              ]}
              value={fornecedorFilter}
              onChange={(value) => setFornecedorFilter(value)}
              placeholder="Fornecedor"
              theme="light"
            />
          </div>

          <div>
            <SearchableSelect
              options={[
                { value: 'all', label: 'Todas as Prioridades' },
                { value: 'urgente', label: 'Urgente' },
                { value: 'alta', label: 'Alta' },
                { value: 'media', label: 'Média' },
                { value: 'baixa', label: 'Baixa' }
              ]}
              value={prioridadeFilter}
              onChange={(value) => setPrioridadeFilter(value)}
              placeholder="Prioridade"
              theme="light"
            />
          </div>

          <div>
            <input
              type="date"
              value={dataInicial}
              onChange={(e) => setDataInicial(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#7D1F2C] focus:border-[#7D1F2C]"
              placeholder="Data inicial"
            />
          </div>

          <div>
            <input
              type="date"
              value={dataFinal}
              onChange={(e) => setDataFinal(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#7D1F2C] focus:border-[#7D1F2C]"
              placeholder="Data final"
            />
          </div>
        </div>
      </div>

      {/* Tabela */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#7D1F2C]"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left bg-gray-50 border-b">
                  <th className="px-2 py-2 sticky left-0 bg-gray-50 z-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === filteredContas.length && filteredContas.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="px-3 py-2 text-xs font-medium text-gray-500 uppercase">
                    Prioridade
                  </th>
                  <th className="px-3 py-2 text-xs font-medium text-gray-500 uppercase min-w-[180px]">
                    Fornecedor / Descrição
                  </th>
                  <th className="px-3 py-2 text-xs font-medium text-gray-500 uppercase">
                    Vencimento
                  </th>
                  <th className="px-3 py-2 text-xs font-medium text-gray-500 uppercase text-right">
                    Valor Total
                  </th>
                  <th className="px-3 py-2 text-xs font-medium text-gray-500 uppercase text-right">
                    Saldo
                  </th>
                  <th className="px-3 py-2 text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-3 py-2 text-xs font-medium text-gray-500 uppercase sticky right-0 bg-gray-50 z-10 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.1)]">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredContas.map((conta) => (
                  <tr key={conta.id} className="hover:bg-gray-50">
                    <td className="px-2 py-2 sticky left-0 bg-white z-10">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(conta.id)}
                        onChange={() => toggleSelect(conta.id)}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={`inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded border ${getPrioridadeColor(conta.prioridade_sugerida)}`}>
                        {getPrioridadeIcon(conta.prioridade_sugerida)}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="space-y-0.5">
                        <div className="font-semibold text-gray-900 text-sm">{conta.fornecedor_nome}</div>
                        <div className="text-xs text-gray-700">{conta.descricao}</div>
                        {conta.numero_documento && (
                          <div className="text-xs text-gray-500">Doc: {conta.numero_documento}</div>
                        )}
                        {conta.categoria_nome && (
                          <div className="text-xs text-gray-500 flex items-center gap-1">
                            <Target className="w-3 h-3" />
                            {conta.categoria_nome}
                          </div>
                        )}
                        {conta.observacao_tesouraria && (
                          <div className="text-xs text-blue-600 flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            {conta.observacao_tesouraria}
                          </div>
                        )}
                        {conta.total_pagamentos_parciais > 0 && (
                          <div className="flex items-center gap-1 text-xs text-gray-600">
                            <Activity className="w-3 h-3" />
                            {conta.total_pagamentos_parciais === 1 ? (
                              <span>Pago em {dayjs(conta.data_primeira_baixa).format('DD/MM/YY')}</span>
                            ) : (
                              <span>{conta.total_pagamentos_parciais} pagamentos</span>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className={`text-sm ${
                        conta.situacao_vencimento === 'atrasada' ? 'text-red-600 font-semibold' :
                        conta.situacao_vencimento === 'vence_hoje' ? 'text-amber-600 font-semibold' :
                        conta.situacao_vencimento === 'vence_em_breve' ? 'text-orange-600 font-medium' :
                        'text-gray-700'
                      }`}>
                        {dayjs(conta.data_vencimento).format('DD/MM/YY')}
                        {conta.situacao_vencimento === 'atrasada' && (
                          <div className="text-[10px] text-red-500">{conta.dias_vencimento}d atraso</div>
                        )}
                        {conta.situacao_vencimento === 'vence_hoje' && (
                          <div className="text-[10px] text-amber-500 font-semibold">HOJE</div>
                        )}
                        {conta.situacao_vencimento === 'vence_em_breve' && conta.dias_para_vencer != null && (
                          <div className="text-[10px] text-orange-500">{conta.dias_para_vencer}d</div>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-right">
                      <div className="font-semibold text-gray-900 text-sm">
                        {formatCurrency(conta.valor_total)}
                      </div>
                      {conta.valor_pago > 0 && (
                        <div className="text-xs text-green-600">
                          Pago: {formatCurrency(conta.valor_pago)}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-right">
                      <div className={`font-semibold text-sm ${
                        conta.saldo_restante > 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {formatCurrency(conta.saldo_restante)}
                      </div>
                      {conta.valor_pago > 0 && conta.saldo_restante > 0 && (
                        <div className="text-xs text-gray-500">
                          {((conta.valor_pago / conta.valor_total) * 100).toFixed(0)}%
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-full ${getStatusColor(conta.status, conta)}`}>
                        {getStatusIcon(conta.status, conta)}
                        {getStatusText(conta.status, conta)}
                      </span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap sticky right-0 bg-white z-10 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.1)]">
                      <div className="flex items-center gap-1">
                        {conta.saldo_restante > 0 && (
                          <button
                            onClick={() => abrirModalBaixa(conta)}
                            className="px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs font-medium flex items-center gap-1"
                            title="Dar Baixa"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                            Baixa
                          </button>
                        )}
                        <button
                          onClick={() => setModalVisualizacao({ isOpen: true, conta })}
                          className="p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
                          title="Visualizar"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openForm(conta)}
                          className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(conta.id)}
                          className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded disabled:opacity-50"
                          title="Excluir"
                          disabled={loading}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredContas.length === 0 && (
            <div className="text-center py-12">
              <CreditCard className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma conta encontrada</h3>
              <p className="text-gray-500">
                {searchTerm || statusFilter !== 'all' || situacaoFilter !== 'all' || fornecedorFilter !== 'all'
                  ? 'Nenhuma conta corresponde aos filtros aplicados.'
                  : 'Nenhuma conta a pagar cadastrada.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Modal do Formulário */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 z-10">
              <h3 className="text-xl font-semibold text-gray-900">
                {editingConta ? 'Editar Conta a Pagar' : 'Nova Conta a Pagar'}
              </h3>
            </div>

            <div className="p-6 space-y-6">
              {/* Informações Básicas */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Informações Básicas</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fornecedor *
                </label>
                <SearchableSelect
                  options={fornecedores.map((f: any) => ({
                    value: f.id,
                    label: f.nome
                  }))}
                  value={formData.fornecedor_id}
                  onChange={(value) => setFormData({ ...formData, fornecedor_id: value })}
                  placeholder="Buscar fornecedor..."
                  theme="light"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valor Total *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">R$</span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.valor_total}
                    onChange={(e) => setFormData({ ...formData, valor_total: parseFloat(e.target.value) || 0 })}
                    className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Desconto
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">R$</span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.desconto}
                    onChange={(e) => setFormData({ ...formData, desconto: parseFloat(e.target.value) || 0 })}
                    className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Juros
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">R$</span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.juros}
                    onChange={(e) => setFormData({ ...formData, juros: parseFloat(e.target.value) || 0 })}
                    className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Para pagamentos atrasados ou valor maior que o original
                </p>
              </div>

              <div className="md:col-span-2">
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                  <div className="text-base font-semibold text-gray-900 mb-2">
                    Valor Final: {formatCurrency((formData.valor_total || 0) - (formData.desconto || 0) + (formData.juros || 0))}
                  </div>
                  {(formData.desconto > 0 || formData.juros > 0) && (
                    <div className="text-sm text-gray-700 space-y-1">
                      <div>Valor Original: {formatCurrency(formData.valor_total || 0)}</div>
                      {formData.desconto > 0 && <div className="text-green-700">Desconto: -{formatCurrency(formData.desconto)}</div>}
                      {formData.juros > 0 && <div className="text-red-700">Juros: +{formatCurrency(formData.juros)}</div>}
                    </div>
                  )}
                </div>
              </div>
                </div>
              </div>

              {/* Datas */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Datas</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data de Emissão *
                </label>
                <input
                  type="date"
                  value={formData.data_emissao}
                  onChange={(e) => setFormData({ ...formData, data_emissao: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data de Vencimento *
                </label>
                <input
                  type="date"
                  value={formData.data_vencimento}
                  onChange={(e) => setFormData({ ...formData, data_vencimento: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  required
                />
              </div>
                </div>
              </div>

              {/* Categorização */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Categorização</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoria
                </label>
                <SearchableSelect
                  options={categorias.map((cat: any) => ({
                    value: cat.id,
                    label: cat.caminho_completo || cat.nome
                  }))}
                  value={formData.categoria_id}
                  onChange={(value) => setFormData({ ...formData, categoria_id: value })}
                  placeholder="Buscar categoria..."
                  theme="light"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Centro de Custo
                </label>
                <SearchableSelect
                  options={centrosCusto.map((cc: any) => ({
                    value: cc.id,
                    label: cc.nome
                  }))}
                  value={formData.centro_custo_id}
                  onChange={(value) => setFormData({ ...formData, centro_custo_id: value })}
                  placeholder="Buscar centro de custo..."
                  theme="light"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Forma de Pagamento
                </label>
                <SearchableSelect
                  options={formasPagamento.map((fp: any) => ({
                    value: fp.id,
                    label: fp.nome
                  }))}
                  value={formData.forma_pagamento_id}
                  onChange={(value) => setFormData({ ...formData, forma_pagamento_id: value })}
                  placeholder="Buscar forma de pagamento..."
                  theme="light"
                />
              </div>

                </div>
              </div>

              {/* Detalhes Adicionais */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Detalhes Adicionais</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição *
                </label>
                <input
                  type="text"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Número do Documento
                </label>
                <input
                  type="text"
                  value={formData.numero_documento}
                  onChange={(e) => setFormData({ ...formData, numero_documento: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prioridade Sugerida
                </label>
                <select
                  value={formData.prioridade_sugerida}
                  onChange={(e) => setFormData({ ...formData, prioridade_sugerida: e.target.value as any })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                >
                  <option value="baixa">Baixa</option>
                  <option value="media">Média</option>
                  <option value="alta">Alta</option>
                  <option value="urgente">Urgente</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observações
                </label>
                <textarea
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observação da Tesouraria
                </label>
                <textarea
                  value={formData.observacao_tesouraria}
                  onChange={(e) => setFormData({ ...formData, observacao_tesouraria: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  rows={2}
                />
              </div>
                </div>
              </div>

              {/* Seção de Parcelamento */}
              <div className="border-t pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <input
                    type="checkbox"
                    id="eh_parcelado"
                    checked={formData.eh_parcelado}
                    onChange={(e) => setFormData({ ...formData, eh_parcelado: e.target.checked })}
                    className="h-4 w-4 text-[#7D1F2C] focus:ring-[#7D1F2C] border-gray-300 rounded"
                  />
                  <label htmlFor="eh_parcelado" className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                    Pagamento Parcelado
                  </label>
                </div>

                {formData.eh_parcelado && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Número de Parcelas
                      </label>
                      <input
                        type="number"
                        min="2"
                        value={formData.total_parcelas}
                        onChange={(e) => setFormData({ ...formData, total_parcelas: parseInt(e.target.value) || 2 })}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                      />
                    </div>
                    <div className="flex items-end">
                      <div className="text-sm font-medium text-gray-700">
                        Valor por parcela: <span className="text-[#7D1F2C]">{formatCurrency(((formData.valor_total || 0) - (formData.desconto || 0) + (formData.juros || 0)) / (formData.total_parcelas || 1))}</span>
                      </div>
                    </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Seção de Recorrência */}
              <div className="border-t pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <input
                    type="checkbox"
                    id="eh_recorrente"
                    checked={formData.eh_recorrente}
                    onChange={(e) => setFormData({ ...formData, eh_recorrente: e.target.checked })}
                    className="h-4 w-4 text-[#7D1F2C] focus:ring-[#7D1F2C] border-gray-300 rounded"
                  />
                  <label htmlFor="eh_recorrente" className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                    Pagamento Recorrente
                  </label>
                </div>

                {formData.eh_recorrente && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Frequência
                      </label>
                      <select
                        value={formData.frequencia_recorrencia}
                        onChange={(e) => setFormData({ ...formData, frequencia_recorrencia: e.target.value })}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                      >
                        <option value="mensal">Mensal</option>
                        <option value="bimestral">Bimestral</option>
                        <option value="trimestral">Trimestral</option>
                        <option value="semestral">Semestral</option>
                        <option value="anual">Anual</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Dia do Vencimento
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={formData.dia_vencimento_recorrente}
                        onChange={(e) => setFormData({ ...formData, dia_vencimento_recorrente: parseInt(e.target.value) || 10 })}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Data Fim (Opcional)
                      </label>
                      <input
                        type="date"
                        value={formData.data_fim_recorrencia}
                        onChange={(e) => setFormData({ ...formData, data_fim_recorrencia: e.target.value })}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                      />
                    </div>

                    <div className="md:col-span-3">
                      <p className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                        💡 O sistema gerará automaticamente as próximas contas conforme a frequência definida
                      </p>
                    </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => setShowForm(false)}
                className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={loading || !formData.fornecedor_id || !formData.descricao || !formData.valor_total}
                className="px-6 py-2.5 bg-[#7D1F2C] text-white rounded-lg hover:bg-[#6a1a25] disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
              >
                {loading ? 'Salvando...' : 'Salvar Conta'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Baixa */}
      {baixaModal.isOpen && baixaModal.conta && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Dar Baixa em Conta a Pagar
            </h3>

            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-sm">
                <div className="font-medium text-gray-900 mb-1">{baixaModal.conta.fornecedor_nome}</div>
                <div className="text-gray-700 mb-1">{baixaModal.conta.descricao}</div>
                <div className="text-gray-600">
                  <span className="font-medium">Valor Total:</span> {formatCurrency(baixaModal.conta.valor_total)}
                </div>
                <div className="text-gray-600">
                  <span className="font-medium">Valor Pago:</span> {formatCurrency(baixaModal.conta.valor_pago)}
                </div>
                <div className="text-orange-600 font-medium">
                  <span className="font-medium">Saldo Restante:</span> {formatCurrency(baixaModal.conta.saldo_restante)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valor do Pagamento *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">R$</span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={baixaModal.conta.saldo_restante}
                    value={baixaModal.valorPagamento}
                    onChange={(e) => setBaixaModal({
                      ...baixaModal,
                      valorPagamento: parseFloat(e.target.value) || 0
                    })}
                    className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                    required
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Máximo: {formatCurrency(baixaModal.conta.saldo_restante)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data do Pagamento *
                </label>
                <input
                  type="date"
                  value={baixaModal.dataPagamento}
                  onChange={(e) => setBaixaModal({ ...baixaModal, dataPagamento: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Forma de Pagamento *
                </label>
                <SearchableSelect
                  options={formasPagamento.map((fp) => ({
                    value: fp.id,
                    label: fp.nome
                  }))}
                  value={baixaModal.formaPagamentoId}
                  onChange={(value) => setBaixaModal({ ...baixaModal, formaPagamentoId: value })}
                  placeholder="Buscar forma de pagamento..."
                  theme="light"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Conta Bancária *
                </label>
                <SearchableSelect
                  options={contasBancarias.map((cb) => ({
                    value: cb.id,
                    label: `${cb.banco} - ${cb.tipo_conta}${cb.numero_conta ? ` (${cb.numero_conta})` : ''}`,
                    sublabel: `Saldo: ${formatCurrency(cb.saldo_atual)}`
                  }))}
                  value={baixaModal.contaBancariaId}
                  onChange={(value) => setBaixaModal({ ...baixaModal, contaBancariaId: value })}
                  placeholder="Buscar conta bancária..."
                  theme="light"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Número do Comprovante
                </label>
                <input
                  type="text"
                  value={baixaModal.numeroComprovante}
                  onChange={(e) => setBaixaModal({ ...baixaModal, numeroComprovante: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  placeholder="Ex: 123456"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observações
                </label>
                <textarea
                  value={baixaModal.observacoes}
                  onChange={(e) => setBaixaModal({ ...baixaModal, observacoes: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  rows={3}
                  placeholder="Observações sobre o pagamento"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={fecharModalBaixa}
                disabled={loading}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDarBaixa}
                disabled={
                  loading ||
                  !baixaModal.formaPagamentoId ||
                  !baixaModal.contaBancariaId ||
                  baixaModal.valorPagamento <= 0 ||
                  baixaModal.valorPagamento > baixaModal.conta.saldo_restante
                }
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Processando...' : 'Confirmar Baixa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Lançamento em Lote com IA */}
      <LancamentoLoteIA
        isOpen={showLancamentoLoteModal}
        onClose={() => setShowLancamentoLoteModal(false)}
        onSuccess={() => {
          fetchData();
          setShowLancamentoLoteModal(false);
        }}
      />

      {/* Modal de Importação de Boleto com IA */}
      <ImportarBoletoIA
        isOpen={showIAModal}
        onClose={() => setShowIAModal(false)}
        onConfirm={handleIAExtraction}
        tipo="pagar"
      />

      {/* Modal de Visualização de Conta */}
      <ModalVisualizarConta
        isOpen={modalVisualizacao.isOpen}
        conta={modalVisualizacao.conta}
        onClose={() => setModalVisualizacao({ isOpen: false, conta: null })}
      />
    </div>
  );
};

export default ContasPagar;