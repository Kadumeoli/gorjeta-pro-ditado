import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, CreditCard as Edit, Trash2, Eye, Package, DollarSign, AlertTriangle, CheckCircle, Download, FileText, ShoppingCart, Calendar, Building2, Clock, XCircle, Truck, Receipt, Target, Activity, Sparkles, Camera, TrendingDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { exportToExcel } from '../../utils/reportGenerator';
import dayjs from 'dayjs';
import ComprasIAModal from './ComprasIAModal';
import ConferenciaRecebimentoModal from './ConferenciaRecebimentoModal';
import ListaComprasMetricas from './ListaComprasMetricas';
import ConsultaHistoricoIA from './ConsultaHistoricoIA';
import ModalVisualizacaoCompra from './ModalVisualizacaoCompra';
import { SearchableSelect } from '../common/SearchableSelect';

interface EntradaCompra {
  id: string;
  fornecedor_id?: string;
  fornecedor_nome?: string;
  numero_documento?: string;
  data_pedido?: string;
  data_compra: string;
  data_entrega_prevista?: string;
  data_entrega_real?: string;
  estoque_destino_id: string;
  estoque_destino_nome?: string;
  valor_produtos?: number;
  valor_encargos?: number;
  percentual_encargos?: number;
  descricao_encargos?: string;
  valor_desconto?: number;
  percentual_desconto?: number;
  motivo_desconto?: string;
  valor_total: number;
  observacoes?: string;
  status: 'pendente' | 'recebido' | 'cancelado';
  criado_por?: string;
  criado_em: string;
  itens?: ItemEntradaCompra[];
}

interface ItemEntradaCompra {
  id: string;
  entrada_compra_id: string;
  item_id: string;
  item_nome: string;
  item_codigo?: string;
  unidade_medida: string;
  quantidade: number;
  quantidade_pedida?: number;
  quantidade_recebida?: number;
  divergencia?: boolean;
  motivo_divergencia?: string;
  custo_unitario: number;
  custo_unitario_original?: number;
  custo_unitario_final?: number;
  valor_desconto_item?: number;
  percentual_desconto_item?: number;
  custo_total: number;
  data_validade?: string;
}

interface FormDataCompra {
  fornecedor_id: string;
  numero_documento: string;
  data_compra: string;
  data_entrega_prevista?: string;
  estoque_destino_id: string;
  observacoes: string;
  status: 'pendente' | 'recebido' | 'cancelado';
  itens: ItemCompraForm[];
}

interface ItemCompraForm {
  item_id: string;
  quantidade: number;
  custo_unitario: number;
  data_validade?: string;
}

interface IndicadoresCompras {
  total_compras: number;
  compras_pendentes: number;
  compras_recebidas: number;
  valor_total_mes: number;
  valor_pendente: number;
  fornecedores_ativos: number;
}

const ComprasEstoque: React.FC = () => {
  const [compras, setCompras] = useState<EntradaCompra[]>([]);
  const [indicadores, setIndicadores] = useState<IndicadoresCompras | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingCompra, setEditingCompra] = useState<EntradaCompra | null>(null);
  const [showItensModal, setShowItensModal] = useState(false);
  const [compraSelecionada, setCompraSelecionada] = useState<EntradaCompra | null>(null);
  const [showRecebimentoModal, setShowRecebimentoModal] = useState(false);
  const [compraRecebimento, setCompraRecebimento] = useState<EntradaCompra | null>(null);
  const [itensRecebimento, setItensRecebimento] = useState<ItemEntradaCompra[]>([]);
  const [valorEncargosRecebimento, setValorEncargosRecebimento] = useState(0);
  const [percentualEncargosRecebimento, setPercentualEncargosRecebimento] = useState(0);
  const [descricaoEncargosRecebimento, setDescricaoEncargosRecebimento] = useState('');
  const [valorDescontoRecebimento, setValorDescontoRecebimento] = useState(0);
  const [percentualDescontoRecebimento, setPercentualDescontoRecebimento] = useState(0);
  const [motivoDescontoRecebimento, setMotivoDescontoRecebimento] = useState('');
  const [showIAModal, setShowIAModal] = useState(false);
  const [showConsultaHistoricoModal, setShowConsultaHistoricoModal] = useState(false);
  const [showConferenciaModal, setShowConferenciaModal] = useState(false);
  const [compraConferencia, setCompraConferencia] = useState<EntradaCompra | null>(null);
  const [showMetricasModal, setShowMetricasModal] = useState(false);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pendente' | 'recebido' | 'cancelado'>('all');
  const [fornecedorFilter, setFornecedorFilter] = useState('all');
  const [dataInicial, setDataInicial] = useState(dayjs().subtract(30, 'days').format('YYYY-MM-DD'));
  const [dataFinal, setDataFinal] = useState(dayjs().format('YYYY-MM-DD'));
  
  // Dados para formulários
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [estoques, setEstoques] = useState<any[]>([]);
  const [itensEstoque, setItensEstoque] = useState<any[]>([]);
  
  const [formData, setFormData] = useState<FormDataCompra>({
    fornecedor_id: '',
    numero_documento: '',
    data_compra: dayjs().format('YYYY-MM-DD'),
    estoque_destino_id: '',
    observacoes: '',
    status: 'pendente',
    itens: []
  });

  const [searchItemTerm, setSearchItemTerm] = useState('');

  useEffect(() => {
    fetchData();
    fetchIndicadores();
    fetchFormData();
  }, []);

  useEffect(() => {
    fetchData();
    fetchIndicadores();
  }, [statusFilter, fornecedorFilter, dataInicial, dataFinal]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('entradas_compras')
        .select(`
          *,
          fornecedores(nome),
          estoques(nome)
        `);

      // Aplicar filtros
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (fornecedorFilter !== 'all') {
        query = query.eq('fornecedor_id', fornecedorFilter);
      }

      if (dataInicial) {
        query = query.gte('data_compra', dataInicial);
      }

      if (dataFinal) {
        query = query.lte('data_compra', dataFinal);
      }

      const { data, error } = await query.order('data_compra', { ascending: false });

      if (error) throw error;

      const comprasProcessadas: EntradaCompra[] = (data || []).map(compra => ({
        id: compra.id,
        fornecedor_id: compra.fornecedor_id,
        fornecedor_nome: compra.fornecedores?.nome,
        numero_documento: compra.numero_documento,
        data_pedido: compra.data_pedido,
        data_compra: compra.data_compra,
        data_entrega_prevista: compra.data_entrega_prevista,
        data_entrega_real: compra.data_entrega_real,
        estoque_destino_id: compra.estoque_destino_id,
        estoque_destino_nome: compra.estoques?.nome,
        valor_produtos: compra.valor_produtos,
        valor_encargos: compra.valor_encargos,
        percentual_encargos: compra.percentual_encargos,
        descricao_encargos: compra.descricao_encargos,
        valor_desconto: compra.valor_desconto,
        percentual_desconto: compra.percentual_desconto,
        motivo_desconto: compra.motivo_desconto,
        valor_total: compra.valor_total,
        observacoes: compra.observacoes,
        status: compra.status,
        criado_por: compra.criado_por,
        criado_em: compra.criado_em
      }));

      setCompras(comprasProcessadas);
    } catch (err) {
      console.error('Error fetching purchases:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar compras');
    } finally {
      setLoading(false);
    }
  };

  const fetchFormData = async () => {
    try {
      const [fornecedoresRes, estoquesRes, itensRes] = await Promise.all([
        supabase.from('fornecedores').select('*').eq('status', 'ativo'),
        supabase.from('estoques').select('*').eq('status', true),
        supabase.from('itens_estoque').select('*').eq('status', 'ativo').eq('tipo_item', 'insumo')
      ]);

      setFornecedores(fornecedoresRes.data || []);
      setEstoques(estoquesRes.data || []);
      setItensEstoque(itensRes.data || []);
    } catch (err) {
      console.error('Error fetching form data:', err);
    }
  };

  const fetchIndicadores = async () => {
    try {
      // Aplicar os mesmos filtros que são usados no fetchData
      let query = supabase
        .from('entradas_compras')
        .select('*');

      // Aplicar filtro de status
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      // Aplicar filtro de fornecedor
      if (fornecedorFilter !== 'all') {
        query = query.eq('fornecedor_id', fornecedorFilter);
      }

      // Aplicar filtro de data
      if (dataInicial) {
        query = query.gte('data_compra', dataInicial);
      }

      if (dataFinal) {
        query = query.lte('data_compra', dataFinal);
      }

      const { data, error } = await query;

      if (error) throw error;

      const totalCompras = (data || []).length;
      const comprasPendentes = (data || []).filter(c => c.status === 'pendente').length;
      const comprasRecebidas = (data || []).filter(c => c.status === 'recebido').length;
      const valorTotalMes = (data || []).reduce((sum, c) => sum + (c.valor_total || 0), 0);
      const valorPendente = (data || []).filter(c => c.status === 'pendente').reduce((sum, c) => sum + (c.valor_total || 0), 0);

      // Buscar fornecedores únicos dos dados filtrados
      const fornecedoresUnicos = new Set((data || []).map(c => c.fornecedor_id).filter(Boolean));

      setIndicadores({
        total_compras: totalCompras,
        compras_pendentes: comprasPendentes,
        compras_recebidas: comprasRecebidas,
        valor_total_mes: valorTotalMes,
        valor_pendente: valorPendente,
        fornecedores_ativos: fornecedoresUnicos.size
      });
    } catch (err) {
      console.error('Error fetching indicators:', err);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);

      // Validações
      if (!formData.estoque_destino_id || formData.itens.length === 0) {
        throw new Error('Selecione o estoque de destino e adicione pelo menos um item');
      }

      // Verificar se está tentando editar uma compra já recebida
      if (editingCompra && editingCompra.status === 'recebido') {
        throw new Error('Não é possível alterar uma compra que já foi recebida');
      }

      const valorTotal = formData.itens.reduce((sum, item) => sum + (item.quantidade * item.custo_unitario), 0);

      const compraData = {
        fornecedor_id: formData.fornecedor_id,
        numero_documento: formData.numero_documento,
        data_pedido: formData.data_compra, // Usar data_compra como data_pedido por padrão
        data_compra: formData.data_compra,
        data_entrega_prevista: formData.data_entrega_prevista || null,
        estoque_destino_id: formData.estoque_destino_id,
        valor_produtos: valorTotal,
        valor_encargos: 0,
        percentual_encargos: 0,
        descricao_encargos: null,
        valor_desconto: 0,
        percentual_desconto: 0,
        motivo_desconto: null,
        observacoes: formData.observacoes,
        status: formData.status,
        valor_total: valorTotal
      };

      let compraId: string;

      if (editingCompra) {
        // Só permitir edição se status for 'pendente'
        if (editingCompra.status !== 'pendente') {
          throw new Error('Só é possível editar compras com status "Pendente"');
        }

        const { error } = await supabase
          .from('entradas_compras')
          .update(compraData)
          .eq('id', editingCompra.id);

        if (error) throw error;

        // Remover itens antigos
        const { error: deleteError } = await supabase
          .from('itens_entrada_compra')
          .delete()
          .eq('entrada_compra_id', editingCompra.id);

        if (deleteError) throw deleteError;

        compraId = editingCompra.id;
      } else {
        const { data: novaCompra, error } = await supabase
          .from('entradas_compras')
          .insert([compraData])
          .select()
          .single();

        if (error) throw error;
        compraId = novaCompra.id;
      }

      // Inserir itens
      const itensParaInserir = formData.itens.map(item => ({
        entrada_compra_id: compraId,
        item_id: item.item_id,
        quantidade: item.quantidade,
        custo_unitario: item.custo_unitario,
        custo_total: item.quantidade * item.custo_unitario,
        data_validade: item.data_validade || null
      }));

      const { error: itensError } = await supabase
        .from('itens_entrada_compra')
        .insert(itensParaInserir);

      if (itensError) throw itensError;

      setShowForm(false);
      setEditingCompra(null);
      resetForm();
      fetchData();
      fetchIndicadores();
    } catch (err) {
      console.error('Error saving purchase:', err);
      setError(err instanceof Error ? err.message : 'Erro ao salvar compra');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (compra: EntradaCompra) => {
    // Verificar se a compra já foi recebida
    if (compra.status === 'recebido') {
      if (!confirm('Esta compra já foi recebida. Excluir irá reverter as movimentações de estoque. Tem certeza?')) {
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Buscar itens da compra para reverter estoque
        const { data: itensCompra, error: itensError } = await supabase
          .from('itens_entrada_compra')
          .select('*')
          .eq('entrada_compra_id', compra.id);

        if (itensError) throw itensError;

        // Para cada item, reverter o saldo do estoque
        for (const item of itensCompra || []) {
          // Buscar saldo atual
          const { data: saldoAtual, error: saldoError } = await supabase
            .from('saldos_estoque')
            .select('*')
            .eq('estoque_id', compra.estoque_destino_id)
            .eq('item_id', item.item_id)
            .maybeSingle();

          if (saldoError && saldoError.code !== 'PGRST116') throw saldoError;

          if (saldoAtual) {
            const novaQuantidade = (saldoAtual.quantidade_atual || 0) - item.quantidade;
            const novoValorTotal = (saldoAtual.valor_total || 0) - item.custo_total;

            if (novaQuantidade <= 0) {
              // Remover saldo se quantidade for zero ou negativa
              const { error: removeError } = await supabase
                .from('saldos_estoque')
                .delete()
                .eq('id', saldoAtual.id);

              if (removeError) throw removeError;
            } else {
              // Atualizar saldo
              const { error: updateError } = await supabase
                .from('saldos_estoque')
                .update({
                  quantidade_atual: novaQuantidade,
                  valor_total: Math.max(0, novoValorTotal),
                  atualizado_em: new Date().toISOString()
                })
                .eq('id', saldoAtual.id);

              if (updateError) throw updateError;
            }
          }

          // Remover movimentação de estoque correspondente
          const { error: movError } = await supabase
            .from('movimentacoes_estoque')
            .delete()
            .eq('item_id', item.item_id)
            .eq('estoque_destino_id', compra.estoque_destino_id)
            .eq('tipo_movimentacao', 'entrada')
            .eq('quantidade', item.quantidade)
            .eq('custo_unitario', item.custo_unitario);

          if (movError) console.warn('Movimentação não encontrada para remoção:', movError);
        }

        // Excluir a compra (itens serão excluídos em cascata)
        const { error: deleteError } = await supabase
          .from('entradas_compras')
          .delete()
          .eq('id', compra.id);

        if (deleteError) throw deleteError;

        alert('Compra excluída e estoque revertido com sucesso!');
        fetchData();
        fetchIndicadores();
      } catch (err) {
        console.error('Error deleting purchase:', err);
        setError(err instanceof Error ? err.message : 'Erro ao excluir compra');
      } finally {
        setLoading(false);
      }
    } else {
      // Compra pendente ou cancelada - exclusão simples
      if (!confirm('Tem certeza que deseja excluir esta compra?')) return;

      try {
        setLoading(true);
        const { error } = await supabase
          .from('entradas_compras')
          .delete()
          .eq('id', compra.id);

        if (error) throw error;
        fetchData();
        fetchIndicadores();
      } catch (err) {
        console.error('Error deleting purchase:', err);
        setError(err instanceof Error ? err.message : 'Erro ao excluir compra');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleReceberCompra = async (compraId: string) => {
    try {
      setLoading(true);
      setError(null);

      // Buscar compra com seus itens
      const { data: compra, error: compraError } = await supabase
        .from('entradas_compras')
        .select('*')
        .eq('id', compraId)
        .single();

      if (compraError) throw compraError;

      // Buscar itens da compra com informações do item
      const { data: itens, error: itensError } = await supabase
        .from('itens_entrada_compra')
        .select(`
          *,
          itens_estoque!inner(
            nome,
            codigo,
            unidade_medida
          )
        `)
        .eq('entrada_compra_id', compraId);

      if (itensError) throw itensError;

      // Preparar itens para conferência
      const itensFormatados = (itens || []).map(item => ({
        ...item,
        item_nome: item.itens_estoque.nome,
        item_codigo: item.itens_estoque.codigo,
        unidade_medida: item.itens_estoque.unidade_medida,
        quantidade_pedida: item.quantidade_pedida || item.quantidade,
        quantidade_recebida: item.quantidade_pedida || item.quantidade,
        divergencia: false,
        motivo_divergencia: ''
      }));

      setCompraRecebimento(compra);
      setItensRecebimento(itensFormatados);
      setShowRecebimentoModal(true);
    } catch (err) {
      console.error('Error loading purchase for receiving:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar compra');
    } finally {
      setLoading(false);
    }
  };

  const confirmarRecebimento = async () => {
    if (!compraRecebimento) {
      alert('Erro: Compra não encontrada');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Validar que todos os itens com divergência têm motivo
      const itensSemMotivo = itensRecebimento.filter(item => {
        const quantidadePedida = item.quantidade_pedida || item.quantidade;
        const quantidadeRecebida = item.quantidade_recebida ?? quantidadePedida;
        const hasDivergencia = quantidadeRecebida !== quantidadePedida;
        return hasDivergencia && !item.motivo_divergencia?.trim();
      });

      if (itensSemMotivo.length > 0) {
        alert('Por favor, informe o motivo para todos os itens com divergência.');
        setLoading(false);
        return;
      }

      console.log('Iniciando confirmação de recebimento para compra:', compraRecebimento.id);
      console.log('Total de itens:', itensRecebimento.length);

      // Atualizar cada item com a quantidade recebida e custo unitário
      for (const item of itensRecebimento) {
        const quantidadePedida = item.quantidade_pedida || item.quantidade;
        const quantidadeRecebida = item.quantidade_recebida ?? quantidadePedida;

        console.log(`Atualizando item ${item.item_nome}:`, {
          id: item.id,
          quantidadePedida,
          quantidadeRecebida,
          custoUnitario: item.custo_unitario,
          motivo: item.motivo_divergencia
        });

        const updateData: any = {
          quantidade_pedida: quantidadePedida,
          quantidade_recebida: quantidadeRecebida,
          custo_unitario: item.custo_unitario,
          custo_total: quantidadeRecebida * item.custo_unitario,
          data_recebimento: new Date().toISOString()
        };

        // Só incluir motivo_divergencia se tiver valor
        if (item.motivo_divergencia?.trim()) {
          updateData.motivo_divergencia = item.motivo_divergencia.trim();
        }

        const { error: updateError } = await supabase
          .from('itens_entrada_compra')
          .update(updateData)
          .eq('id', item.id);

        if (updateError) {
          console.error('Erro ao atualizar item:', updateError);
          throw new Error(`Erro ao atualizar item ${item.item_nome}: ${updateError.message}`);
        }
      }

      console.log('Todos os itens atualizados. Recalculando valor total...');

      // Calcular valor dos produtos baseado nas quantidades recebidas
      const valorProdutos = itensRecebimento.reduce((sum, item) => {
        const quantidadeRecebida = item.quantidade_recebida ?? item.quantidade_pedida;
        return sum + (quantidadeRecebida * item.custo_unitario);
      }, 0);

      // Calcular valor total com encargos e descontos
      const valorEncargos = valorEncargosRecebimento || 0;
      const valorDesconto = valorDescontoRecebimento || 0;
      const novoValorTotal = valorProdutos + valorEncargos - valorDesconto;

      console.log('Valor produtos:', valorProdutos);
      console.log('Valor encargos:', valorEncargos);
      console.log('Valor desconto:', valorDesconto);
      console.log('Novo valor total calculado:', novoValorTotal);

      // Atualizar status da compra para recebido e atualizar valores
      const { error: statusError } = await supabase
        .from('entradas_compras')
        .update({
          status: 'recebido',
          data_entrega_real: new Date().toISOString().split('T')[0],
          valor_produtos: valorProdutos,
          valor_encargos: valorEncargos,
          percentual_encargos: percentualEncargosRecebimento || 0,
          descricao_encargos: descricaoEncargosRecebimento || null,
          valor_desconto: valorDesconto,
          percentual_desconto: percentualDescontoRecebimento || 0,
          motivo_desconto: motivoDescontoRecebimento || null,
          valor_total: novoValorTotal
        })
        .eq('id', compraRecebimento.id);

      if (statusError) {
        console.error('Erro ao atualizar status:', statusError);
        throw new Error(`Erro ao atualizar status da compra: ${statusError.message}`);
      }

      console.log('Recebimento confirmado com sucesso!');

      alert('Recebimento confirmado com sucesso! O estoque foi atualizado.');
      setShowRecebimentoModal(false);
      setCompraRecebimento(null);
      setItensRecebimento([]);
      setValorEncargosRecebimento(0);
      setPercentualEncargosRecebimento(0);
      setDescricaoEncargosRecebimento('');
      setValorDescontoRecebimento(0);
      setPercentualDescontoRecebimento(0);
      setMotivoDescontoRecebimento('');
      fetchData();
      fetchIndicadores();
    } catch (err) {
      console.error('Erro ao confirmar recebimento:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido ao confirmar recebimento';
      alert(errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleConferenciaComIA = async (compraId: string) => {
    try {
      setLoading(true);
      setError(null);

      // Buscar compra com seus itens
      const { data: compra, error: compraError } = await supabase
        .from('entradas_compras')
        .select('*, fornecedores(nome)')
        .eq('id', compraId)
        .single();

      if (compraError) throw compraError;

      // Buscar itens da compra
      const { data: itens, error: itensError } = await supabase
        .from('itens_entrada_compra')
        .select(`
          *,
          itens_estoque(nome, codigo, unidade_medida)
        `)
        .eq('entrada_compra_id', compraId);

      if (itensError) throw itensError;

      const itensFormatados = (itens || []).map(item => ({
        id: item.id,
        entrada_compra_id: item.entrada_compra_id,
        item_id: item.item_id,
        item_nome: item.itens_estoque.nome,
        item_codigo: item.itens_estoque.codigo,
        unidade_medida: item.itens_estoque.unidade_medida,
        quantidade_pedida: item.quantidade_pedida || item.quantidade,
        quantidade_recebida: item.quantidade_pedida || item.quantidade,
        custo_unitario: item.custo_unitario,
        divergencia: false,
        motivo_divergencia: '',
      }));

      // Criar objeto simples para compra (sem referências circulares)
      const compraSimples = {
        id: compra.id,
        fornecedor_id: compra.fornecedor_id,
        numero_documento: compra.numero_documento,
        data_compra: compra.data_compra,
        estoque_destino_id: compra.estoque_destino_id,
        valor_total: compra.valor_total,
        status: compra.status,
        fornecedores: {
          nome: compra.fornecedores?.nome || '',
        },
      };

      setCompraConferencia(compraSimples);
      setCompraRecebimento(compraSimples);
      setItensRecebimento(itensFormatados);
      setShowConferenciaModal(true);
    } catch (err) {
      console.error('Erro ao carregar conferência:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar conferência');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmarConferencia = (comparacoes: any[]) => {
    // Atualizar itens recebimento com base nas comparações
    const itensAtualizados = itensRecebimento.map(item => {
      const comparacao = comparacoes.find(c =>
        c.item_pedido.item_nome === item.item_nome || c.item_pedido.id === item.id
      );

      if (!comparacao) return item;

      const itemRecebido = comparacao.item_recebido;
      if (!itemRecebido) {
        return {
          ...item,
          quantidade_recebida: 0,
          divergencia: true,
          motivo_divergencia: 'Item não recebido'
        };
      }

      const quantidadeRecebida = itemRecebido.quantidade || item.quantidade_pedida;
      const custoRecebido = itemRecebido.valor_unitario || item.custo_unitario;

      return {
        ...item,
        quantidade_recebida: quantidadeRecebida,
        custo_unitario: custoRecebido,
        divergencia: comparacao.status !== 'ok',
        motivo_divergencia: comparacao.status === 'divergencia'
          ? Object.keys(comparacao.diferencas).join(', ')
          : comparacao.status === 'faltando'
          ? 'Item não recebido'
          : ''
      };
    });

    setItensRecebimento(itensAtualizados);
    setShowConferenciaModal(false);
    setShowRecebimentoModal(true);
  };

  const atualizarQuantidadeRecebida = (itemId: string, quantidade: number) => {
    setItensRecebimento(prev => prev.map(item => {
      if (item.id === itemId) {
        const quantidadePedida = item.quantidade_pedida || item.quantidade;
        return {
          ...item,
          quantidade_recebida: quantidade,
          divergencia: quantidade !== quantidadePedida
        };
      }
      return item;
    }));
  };

  const atualizarCustoUnitarioRecebimento = (itemId: string, custo: number) => {
    setItensRecebimento(prev => prev.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          custo_unitario: custo
        };
      }
      return item;
    }));
  };

  const atualizarMotivoDivergencia = (itemId: string, motivo: string) => {
    setItensRecebimento(prev => prev.map(item =>
      item.id === itemId ? { ...item, motivo_divergencia: motivo } : item
    ));
  };

  const visualizarItens = async (compra: EntradaCompra) => {
    try {
      setLoading(true);
      setCompraSelecionada(compra);

      const { data, error } = await supabase
        .from('itens_entrada_compra')
        .select(`
          *,
          itens_estoque(nome, codigo, unidade_medida)
        `)
        .eq('entrada_compra_id', compra.id);

      if (error) throw error;

      const itensProcessados: ItemEntradaCompra[] = (data || []).map(item => ({
        id: item.id,
        entrada_compra_id: item.entrada_compra_id,
        item_id: item.item_id,
        item_nome: item.itens_estoque?.nome || 'Item não encontrado',
        item_codigo: item.itens_estoque?.codigo,
        unidade_medida: item.itens_estoque?.unidade_medida || 'un',
        quantidade: item.quantidade,
        quantidade_pedida: item.quantidade_pedida,
        quantidade_recebida: item.quantidade_recebida,
        divergencia: item.divergencia,
        motivo_divergencia: item.motivo_divergencia,
        custo_unitario: item.custo_unitario,
        custo_unitario_original: item.custo_unitario_original,
        custo_unitario_final: item.custo_unitario_final,
        valor_desconto_item: item.valor_desconto_item,
        percentual_desconto_item: item.percentual_desconto_item,
        custo_total: item.custo_total,
        data_validade: item.data_validade
      }));

      setCompraSelecionada({ ...compra, itens: itensProcessados });
      setShowItensModal(true);
    } catch (err) {
      console.error('Error fetching items:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar itens');
    } finally {
      setLoading(false);
    }
  };

  const openForm = (compra?: EntradaCompra) => {
    // Verificar se pode editar
    if (compra && compra.status === 'recebido') {
      alert('Não é possível editar uma compra que já foi recebida.');
      return;
    }

    if (compra) {
      setEditingCompra(compra);
      setFormData({
        fornecedor_id: compra.fornecedor_id || '',
        numero_documento: compra.numero_documento || '',
        data_compra: compra.data_compra,
        estoque_destino_id: compra.estoque_destino_id,
        observacoes: compra.observacoes || '',
        status: compra.status,
        itens: [] // Será carregado separadamente se necessário
      });
    } else {
      setEditingCompra(null);
      resetForm();
    }
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      fornecedor_id: '',
      numero_documento: '',
      data_compra: dayjs().format('YYYY-MM-DD'),
      estoque_destino_id: '',
      observacoes: '',
      status: 'pendente',
      itens: []
    });
  };

  const handleIAExtraction = async (extractionData: any) => {
    try {
      setLoading(true);
      setError(null);

      const extracted = extractionData.extracted;
      const fornecedorNome = extracted.emitente?.nome;
      const fornecedorCnpj = extracted.emitente?.cnpj?.replace(/\D/g, '');

      let fornecedorId = null;

      if (fornecedorNome) {
        const { data: fornecedorExistente } = await supabase
          .from('fornecedores')
          .select('id')
          .eq('nome', fornecedorNome)
          .maybeSingle();

        if (fornecedorExistente) {
          fornecedorId = fornecedorExistente.id;
        } else {
          const { data: novoFornecedor, error: fornecedorError } = await supabase
            .from('fornecedores')
            .insert([{
              nome: fornecedorNome,
              cnpj: fornecedorCnpj || null,
              status: 'ativo'
            }])
            .select()
            .single();

          if (fornecedorError) throw fornecedorError;
          fornecedorId = novoFornecedor.id;
        }
      }

      const compraData = {
        fornecedor_id: fornecedorId,
        numero_documento: extracted.documento?.numero || null,
        data_compra: extracted.documento?.data_emissao || dayjs().format('YYYY-MM-DD'),
        estoque_destino_id: extractionData.estoqueDestinoId,
        observacoes: extracted.observacoes || null,
        status: 'pendente' as const,
        valor_total: extracted.totais.valor_total,
        origem_arquivo_url: extractionData.file?.url || null,
        origem_hash: extractionData.file?.hash || null,
        ia_confidences: extracted.confidences || null
      };

      const { data: novaCompra, error: compraError } = await supabase
        .from('entradas_compras')
        .insert([compraData])
        .select()
        .single();

      if (compraError) throw compraError;

      // Usar mapeamentos se disponíveis, caso contrário criar novos itens
      const itemMappings = extractionData.itemMappings || [];

      const itensPromises = extracted.itens.map(async (itemIA: any, index: number) => {
        let itemEstoqueId = null;

        // Verificar se há mapeamento para este item
        const mapping = itemMappings[index];

        if (mapping && mapping.itemId) {
          // Item mapeado para existente
          itemEstoqueId = mapping.itemId;
        } else {
          // Criar novo item
          const { data: novoItem, error: itemError } = await supabase
            .from('itens_estoque')
            .insert([{
              nome: itemIA.descricao,
              codigo: itemIA.codigo || null,
              tipo_item: 'insumo',
              categoria: 'Geral',
              unidade_medida: itemIA.unidade || 'un',
              status: 'ativo'
            }])
            .select()
            .single();

          if (itemError) throw itemError;
          itemEstoqueId = novoItem.id;
        }

        return {
          entrada_compra_id: novaCompra.id,
          item_id: itemEstoqueId,
          quantidade: itemIA.quantidade,
          custo_unitario: itemIA.valor_unitario,
          custo_total: itemIA.valor_total,
          data_validade: null
        };
      });

      const itensParaInserir = await Promise.all(itensPromises);

      const { error: itensError } = await supabase
        .from('itens_entrada_compra')
        .insert(itensParaInserir);

      if (itensError) throw itensError;

      if (extractionData.extraction_id) {
        await supabase
          .from('ai_extractions')
          .update({ entrada_compra_id: novaCompra.id })
          .eq('id', extractionData.extraction_id);
      }

      setShowIAModal(false);
      fetchData();
      fetchIndicadores();

      alert('Compra importada com sucesso via IA!');
    } catch (err) {
      console.error('Erro ao importar compra via IA:', err);
      setError(err instanceof Error ? err.message : 'Erro ao importar compra');
    } finally {
      setLoading(false);
    }
  };

  const adicionarItem = () => {
    setFormData({
      ...formData,
      itens: [
        ...formData.itens,
        {
          item_id: '',
          quantidade: 0,
          custo_unitario: 0,
          data_validade: ''
        }
      ]
    });
  };

  const removerItem = (index: number) => {
    const novosItens = formData.itens.filter((_, i) => i !== index);
    setFormData({ ...formData, itens: novosItens });
  };

  const atualizarItem = (index: number, campo: keyof ItemCompraForm, valor: any) => {
    const novosItens = [...formData.itens];
    novosItens[index] = { ...novosItens[index], [campo]: valor };
    setFormData({ ...formData, itens: novosItens });
  };

  const calcularValorTotal = () => {
    return formData.itens.reduce((sum, item) => sum + (item.quantidade * item.custo_unitario), 0);
  };

  const filteredCompras = compras.filter(compra => {
    const matchesSearch = compra.fornecedor_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         compra.numero_documento?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         compra.observacoes?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'recebido':
        return 'text-green-700 bg-green-100';
      case 'pendente':
        return 'text-yellow-700 bg-yellow-100';
      case 'cancelado':
        return 'text-red-700 bg-red-100';
      default:
        return 'text-white/80 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'recebido':
        return <CheckCircle className="w-4 h-4" />;
      case 'pendente':
        return <Clock className="w-4 h-4" />;
      case 'cancelado':
        return <XCircle className="w-4 h-4" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'recebido':
        return 'Recebido';
      case 'pendente':
        return 'Pendente';
      case 'cancelado':
        return 'Cancelado';
      default:
        return 'Desconhecido';
    }
  };

  const exportData = () => {
    if (filteredCompras.length === 0) {
      alert('Não há dados para exportar');
      return;
    }

    const headers = [
      'Fornecedor',
      'Número Documento',
      'Data Compra',
      'Estoque Destino',
      'Valor Total',
      'Status',
      'Observações'
    ];

    const data = filteredCompras.map(compra => [
      compra.fornecedor_nome || '',
      compra.numero_documento || '',
      dayjs(compra.data_compra).format('DD/MM/YYYY'),
      compra.estoque_destino_nome || '',
      compra.valor_total,
      getStatusText(compra.status),
      compra.observacoes || ''
    ]);

    const fileName = `compras-estoque-${dayjs().format('YYYY-MM-DD')}`;
    exportToExcel(data, fileName, headers);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-white">Compras de Estoque</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setShowMetricasModal(true)}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-white/80 hover:bg-gray-50 flex items-center"
          >
            <Activity className="w-4 h-4 mr-2" />
            Métricas e Análises
          </button>
          <button
            onClick={exportData}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-white/80 hover:bg-gray-50"
          >
            <Download className="w-4 h-4 inline mr-2" />
            Exportar Excel
          </button>
          <button
            onClick={() => setShowConsultaHistoricoModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 flex items-center"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Consultar Histórico (IA)
          </button>
          <button
            onClick={() => setShowIAModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 flex items-center"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Importar com IA
          </button>
          <button
            onClick={() => openForm()}
            className="px-4 py-2 bg-[#7D1F2C] text-white rounded-lg hover:bg-[#6a1a25]"
          >
            <Plus className="w-4 h-4 inline mr-2" />
            Nova Compra
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* Indicadores */}
      {indicadores && (
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <ShoppingCart className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-500">Total Compras</p>
                <p className="text-2xl font-bold text-blue-600">
                  {indicadores.total_compras}
                </p>
                <p className="text-sm text-gray-600">Este mês</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <Clock className="w-8 h-8 text-yellow-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-500">Pendentes</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {indicadores.compras_pendentes}
                </p>
                <p className="text-sm text-gray-600">Aguardando</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <CheckCircle className="w-8 h-8 text-green-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-500">Recebidas</p>
                <p className="text-2xl font-bold text-green-600">
                  {indicadores.compras_recebidas}
                </p>
                <p className="text-sm text-gray-600">Concluídas</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <DollarSign className="w-8 h-8 text-purple-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-500">Valor Total</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatCurrency(indicadores.valor_total_mes)}
                </p>
                <p className="text-sm text-gray-600">Este mês</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <AlertTriangle className="w-8 h-8 text-orange-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-500">Valor Pendente</p>
                <p className="text-2xl font-bold text-orange-600">
                  {formatCurrency(indicadores.valor_pendente)}
                </p>
                <p className="text-sm text-gray-600">A receber</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <Building2 className="w-8 h-8 text-teal-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-500">Fornecedores</p>
                <p className="text-2xl font-bold text-teal-600">
                  {indicadores.fornecedores_ativos}
                </p>
                <p className="text-sm text-gray-600">Ativos</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar compras..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7D1F2C] focus:border-[#7D1F2C]"
              />
            </div>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#7D1F2C] focus:border-[#7D1F2C]"
            >
              <option value="all">Todos os Status</option>
              <option value="pendente">Pendente</option>
              <option value="recebido">Recebido</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>

          <div>
            <SearchableSelect
              options={[
                { value: 'all', label: 'Todos os Fornecedores' },
                ...fornecedores.map(f => ({ value: f.id, label: f.nome }))
              ]}
              value={fornecedorFilter}
              onChange={setFornecedorFilter}
              placeholder="Todos os Fornecedores"
              className="w-full"
            />
          </div>

          <div>
            <input
              type="date"
              value={dataInicial}
              onChange={(e) => setDataInicial(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#7D1F2C] focus:border-[#7D1F2C]"
            />
          </div>

          <div>
            <input
              type="date"
              value={dataFinal}
              onChange={(e) => setDataFinal(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#7D1F2C] focus:border-[#7D1F2C]"
            />
          </div>
        </div>
      </div>

      {/* Lista de Compras */}
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
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fornecedor
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Documento
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data Compra
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estoque Destino
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor Total
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
                {filteredCompras.map((compra) => (
                  <tr key={compra.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-white">
                          {compra.fornecedor_nome || 'Fornecedor não informado'}
                        </div>
                        {compra.observacoes && (
                          <div className="text-sm text-gray-500">{compra.observacoes}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-white">
                        {compra.numero_documento || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-white">
                        {dayjs(compra.data_compra).format('DD/MM/YYYY')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-white">
                        {compra.estoque_destino_nome || 'Estoque não informado'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-white">
                        {formatCurrency(compra.valor_total)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(compra.status)}`}>
                        {getStatusIcon(compra.status)}
                        <span className="ml-1">{getStatusText(compra.status)}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => visualizarItens(compra)}
                          className="text-purple-600 hover:text-purple-800"
                          title="Ver Itens"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {compra.status === 'pendente' && (
                          <>
                            <button
                              onClick={() => openForm(compra)}
                              className="text-blue-600 hover:text-blue-800"
                              title="Editar"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleConferenciaComIA(compra.id)}
                              className="text-blue-600 hover:text-blue-800"
                              title="Conferir com IA"
                            >
                              <Camera className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleReceberCompra(compra.id)}
                              className="text-green-600 hover:text-green-800"
                              title="Receber Compra"
                            >
                              <Truck className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleDelete(compra)}
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
          </div>

          {filteredCompras.length === 0 && (
            <div className="text-center py-12">
              <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">Nenhuma compra encontrada</h3>
              <p className="text-gray-500">
                {searchTerm || statusFilter !== 'all' || fornecedorFilter !== 'all'
                  ? 'Nenhuma compra corresponde aos filtros aplicados.'
                  : 'Nenhuma compra cadastrada.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Modal do Formulário */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-white mb-4">
              {editingCompra ? 'Editar Compra' : 'Nova Compra'}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <SearchableSelect
                  label="Fornecedor"
                  options={fornecedores.map(f => ({ value: f.id, label: f.nome }))}
                  value={formData.fornecedor_id}
                  onChange={(value) => setFormData({ ...formData, fornecedor_id: value })}
                  placeholder="Selecione um fornecedor..."
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">
                  Número do Documento
                </label>
                <input
                  type="text"
                  value={formData.numero_documento}
                  onChange={(e) => setFormData({ ...formData, numero_documento: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  placeholder="Ex: NF-001, Pedido-123"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">
                  Data da Compra *
                </label>
                <input
                  type="date"
                  value={formData.data_compra}
                  onChange={(e) => setFormData({ ...formData, data_compra: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  required
                />
              </div>

              <div>
                <SearchableSelect
                  label="Estoque de Destino"
                  options={estoques.map(e => ({ value: e.id, label: e.nome }))}
                  value={formData.estoque_destino_id}
                  onChange={(value) => setFormData({ ...formData, estoque_destino_id: value })}
                  placeholder="Selecione um estoque..."
                  required
                  className="w-full"
                />
              </div>

            </div>

            <div className="border-t border-gray-200 pt-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-white/80 mb-1">
                  Observações
                </label>
                <textarea
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  rows={2}
                  placeholder="Observações sobre a compra..."
                />
              </div>
            </div>

            {/* Itens da Compra */}
            <div className="border-t border-gray-200 pt-6">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-md font-medium text-white">Itens da Compra</h4>
                <button
                  onClick={adicionarItem}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 inline mr-1" />
                  Adicionar Item
                </button>
              </div>

              {formData.itens.length > 0 ? (
                <div className="space-y-3">
                  <div className="mb-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        placeholder="Pesquisar itens..."
                        value={searchItemTerm}
                        onChange={(e) => setSearchItemTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7D1F2C] focus:border-[#7D1F2C] text-sm"
                      />
                    </div>
                  </div>

                  {formData.itens.map((item, index) => {
                    const itensFilteredForSelect = searchItemTerm
                      ? itensEstoque.filter(i =>
                          i.nome.toLowerCase().includes(searchItemTerm.toLowerCase()) ||
                          i.codigo?.toLowerCase().includes(searchItemTerm.toLowerCase())
                        )
                      : itensEstoque;

                    return (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-6 gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="md:col-span-2">
                        <SearchableSelect
                          options={itensFilteredForSelect.map(itemEstoque => ({
                            value: itemEstoque.id,
                            label: itemEstoque.codigo ? `${itemEstoque.codigo} - ${itemEstoque.nome}` : itemEstoque.nome,
                            sublabel: `Unidade: ${itemEstoque.unidade_medida}`
                          }))}
                          value={item.item_id}
                          onChange={(value) => atualizarItem(index, 'item_id', value)}
                          placeholder="Selecione um item..."
                          required
                          className="w-full"
                        />
                      </div>

                      <div>
                        <input
                          type="number"
                          step="0.001"
                          min="0.001"
                          placeholder="Quantidade"
                          value={item.quantidade}
                          onChange={(e) => atualizarItem(index, 'quantidade', parseFloat(e.target.value) || 0)}
                          className="w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                          required
                        />
                      </div>

                      <div>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          placeholder="Custo Unit."
                          value={item.custo_unitario}
                          onChange={(e) => atualizarItem(index, 'custo_unitario', parseFloat(e.target.value) || 0)}
                          className="w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                          required
                        />
                      </div>

                      <div>
                        <input
                          type="date"
                          placeholder="Validade"
                          value={item.data_validade || ''}
                          onChange={(e) => atualizarItem(index, 'data_validade', e.target.value)}
                          className="w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="text-sm">
                          <span className="text-gray-600">Total:</span>
                          <div className="font-medium text-[#7D1F2C]">
                            {formatCurrency(item.quantidade * item.custo_unitario)}
                          </div>
                        </div>
                        <button
                          onClick={() => removerItem(index)}
                          className="text-red-600 hover:text-red-800"
                          title="Remover Item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    );
                  })}

                  <div className="flex justify-end pt-3 border-t border-gray-200">
                    <div className="text-right">
                      <span className="text-sm text-gray-600">Valor Total da Compra:</span>
                      <span className="ml-2 text-lg font-bold text-[#7D1F2C]">
                        {formatCurrency(calcularValorTotal())}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Nenhum item adicionado</p>
                  <button
                    onClick={adicionarItem}
                    className="mt-2 px-4 py-2 bg-[#7D1F2C] text-white rounded-lg hover:bg-[#6a1a25]"
                  >
                    Adicionar Primeiro Item
                  </button>
                </div>
              )}
            </div>

            {/* Resumo de Valores */}
            {formData.itens.length > 0 && (
              <div className="mt-6 border-t border-gray-200 pt-4">
                <div className="max-w-md ml-auto">
                  <div className="flex justify-between text-lg font-bold">
                    <span className="text-white">Valor Total:</span>
                    <span className="text-[#7D1F2C]">
                      {formatCurrency(calcularValorTotal())}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 text-right mt-1">
                    Encargos podem ser adicionados no recebimento
                  </p>
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-white/80 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={loading || !formData.estoque_destino_id || formData.itens.length === 0}
                className="px-4 py-2 bg-[#7D1F2C] text-white rounded-md hover:bg-[#6a1a25] disabled:opacity-50"
              >
                {loading ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Visualização de Itens */}
      {showItensModal && compraSelecionada && (
        <ModalVisualizacaoCompra
          compra={compraSelecionada}
          onClose={() => setShowItensModal(false)}
        />
      )}

      {/* Modal antigo removido - substituído pelo novo ModalVisualizacaoCompra */}
      {false && showItensModal && compraSelecionada && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-white">
                Itens da Compra - {compraSelecionada.fornecedor_nome}
              </h3>
              <button
                onClick={() => setShowItensModal(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Fechar
              </button>
            </div>

            {/* Informações da Compra */}
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Documento:</span>
                  <div className="font-medium">{compraSelecionada.numero_documento || '-'}</div>
                </div>
                <div>
                  <span className="text-gray-600">Data:</span>
                  <div className="font-medium">{dayjs(compraSelecionada.data_compra).format('DD/MM/YYYY')}</div>
                </div>
                <div>
                  <span className="text-gray-600">Estoque:</span>
                  <div className="font-medium">{compraSelecionada.estoque_destino_nome}</div>
                </div>
                <div>
                  <span className="text-gray-600">Status:</span>
                  <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(compraSelecionada.status)}`}>
                    {getStatusIcon(compraSelecionada.status)}
                    <span className="ml-1">{getStatusText(compraSelecionada.status)}</span>
                  </span>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7D1F2C]"></div>
              </div>
            ) : (
              <>
                {compraSelecionada.itens && compraSelecionada.itens.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left bg-gray-50 border-b">
                          <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Item
                          </th>
                          <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Código
                          </th>
                          <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Qtd Pedida
                          </th>
                          <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Qtd Recebida
                          </th>
                          <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Unidade
                          </th>
                          <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Custo Unit.
                          </th>
                          <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Custo Total
                          </th>
                          <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Validade
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {compraSelecionada.itens.map((item) => {
                          const quantidadePedida = item.quantidade_pedida || item.quantidade;
                          const quantidadeRecebida = item.quantidade_recebida ?? quantidadePedida;
                          const hasDivergencia = item.divergencia || (quantidadeRecebida !== quantidadePedida);

                          return (
                            <tr key={item.id} className={`hover:bg-gray-50 ${hasDivergencia ? 'bg-yellow-50' : ''}`}>
                              <td className="px-4 py-3">
                                <div className="font-medium text-white">{item.item_nome}</div>
                                {hasDivergencia && item.motivo_divergencia && (
                                  <div className="text-xs text-yellow-700 mt-1">
                                    <AlertTriangle className="w-3 h-3 inline mr-1" />
                                    {item.motivo_divergencia}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className="text-sm text-white">
                                  {item.item_codigo || '-'}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className="text-sm text-white">
                                  {quantidadePedida.toFixed(3)}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                {hasDivergencia ? (
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-yellow-700">
                                      {quantidadeRecebida.toFixed(3)}
                                    </span>
                                    <span className="text-xs text-yellow-600">
                                      ({quantidadeRecebida > quantidadePedida ? '+' : ''}{(quantidadeRecebida - quantidadePedida).toFixed(3)})
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-sm text-white">
                                    {quantidadeRecebida.toFixed(3)}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className="text-sm text-white">
                                  {item.unidade_medida}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className="text-sm text-white">
                                  {formatCurrency(item.custo_unitario)}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className="font-medium text-white">
                                  {formatCurrency(quantidadeRecebida * item.custo_unitario)}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className="text-sm text-white">
                                  {item.data_validade ? dayjs(item.data_validade).format('DD/MM/YYYY') : '-'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    {/* Total da Compra */}
                    <div className="mt-4 flex justify-end">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="text-sm text-gray-600 mb-1">Valor Total da Compra</div>
                        <div className="text-2xl font-bold text-[#7D1F2C]">
                          {formatCurrency(
                            compraSelecionada.itens.reduce((sum, item) => {
                              const quantidadeRecebida = item.quantidade_recebida ?? (item.quantidade_pedida || item.quantidade);
                              return sum + (quantidadeRecebida * item.custo_unitario);
                            }, 0)
                          )}
                        </div>
                        {compraSelecionada.itens.some(item => item.divergencia) && (
                          <div className="text-xs text-gray-500 mt-1">
                            * Baseado nas quantidades recebidas
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Nenhum item encontrado para esta compra</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal de Conferência de Recebimento */}
      {showRecebimentoModal && compraRecebimento && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    Conferência de Recebimento
                  </h3>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p><strong>Fornecedor:</strong> {compraRecebimento.fornecedor_nome || 'Não informado'}</p>
                    <p><strong>Documento:</strong> {compraRecebimento.numero_documento || 'N/A'}</p>
                    <p><strong>Data da Compra:</strong> {dayjs(compraRecebimento.data_compra).format('DD/MM/YYYY')}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowRecebimentoModal(false);
                    setCompraRecebimento(null);
                    setItensRecebimento([]);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Instruções:</strong> Confira a quantidade recebida de cada item.
                  Se houver divergência entre o pedido e o recebido, informe o motivo.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left bg-gray-50 border-b">
                      <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Item</th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-center">Unidade</th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-center">Qtd Pedida</th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-center">Qtd Recebida</th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-center">Custo Unit.</th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-center">Total</th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-center">Status</th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Motivo (se divergente)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itensRecebimento.map((item) => {
                      const quantidadePedida = item.quantidade_pedida || item.quantidade;
                      const hasDivergencia = item.quantidade_recebida !== quantidadePedida;

                      return (
                        <tr key={item.id} className={`border-b ${hasDivergencia ? 'bg-yellow-50' : ''}`}>
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium text-white">{item.item_nome}</p>
                              {item.item_codigo && (
                                <p className="text-sm text-gray-500">Cód: {item.item_codigo}</p>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-sm text-gray-600">{item.unidade_medida}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="font-medium text-white">{quantidadePedida}</span>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.quantidade_recebida || 0}
                              onChange={(e) => atualizarQuantidadeRecebida(item.id, parseFloat(e.target.value) || 0)}
                              className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7D1F2C] focus:border-[#7D1F2C] text-center"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.custo_unitario || 0}
                              onChange={(e) => atualizarCustoUnitarioRecebimento(item.id, parseFloat(e.target.value) || 0)}
                              className="w-28 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7D1F2C] focus:border-[#7D1F2C] text-center"
                            />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="font-medium text-white">
                              {formatCurrency((item.quantidade_recebida || 0) * (item.custo_unitario || 0))}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {hasDivergencia ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                Divergência
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                OK
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {hasDivergencia && (
                              <input
                                type="text"
                                placeholder="Informe o motivo..."
                                value={item.motivo_divergencia || ''}
                                onChange={(e) => atualizarMotivoDivergencia(item.id, e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7D1F2C] focus:border-[#7D1F2C]"
                              />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Resumo de Divergências */}
              {itensRecebimento.some(item => {
                const quantidadePedida = item.quantidade_pedida || item.quantidade;
                return item.quantidade_recebida !== quantidadePedida;
              }) && (
                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h4 className="font-medium text-yellow-900 mb-2 flex items-center">
                    <AlertTriangle className="w-5 h-5 mr-2" />
                    Atenção: Divergências Identificadas
                  </h4>
                  <ul className="text-sm text-yellow-800 space-y-1">
                    {itensRecebimento
                      .filter(item => {
                        const quantidadePedida = item.quantidade_pedida || item.quantidade;
                        return item.quantidade_recebida !== quantidadePedida;
                      })
                      .map(item => {
                        const quantidadePedida = item.quantidade_pedida || item.quantidade;
                        const diferenca = (item.quantidade_recebida || 0) - quantidadePedida;
                        return (
                          <li key={item.id}>
                            <strong>{item.item_nome}:</strong> Pedido {quantidadePedida},
                            Recebido {item.quantidade_recebida} ({diferenca > 0 ? '+' : ''}{diferenca})
                            {item.motivo_divergencia && ` - ${item.motivo_divergencia}`}
                          </li>
                        );
                      })}
                  </ul>
                </div>
              )}

              {/* Encargos Adicionais */}
              <div className="mt-6 p-6 bg-orange-50 border border-orange-200 rounded-lg">
                <h4 className="font-medium text-orange-900 mb-4 flex items-center">
                  <DollarSign className="w-5 h-5 mr-2" />
                  Encargos Adicionais (Taxa de entrega, juros, etc)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-1">
                      Valor dos Encargos (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={valorEncargosRecebimento}
                      onChange={(e) => {
                        const valor = parseFloat(e.target.value) || 0;
                        const valorProdutos = itensRecebimento.reduce((sum, item) => {
                          const qtd = item.quantidade_recebida ?? (item.quantidade_pedida || item.quantidade);
                          return sum + (qtd * item.custo_unitario);
                        }, 0);
                        const percentual = valorProdutos > 0 ? (valor * 100 / valorProdutos) : 0;
                        setValorEncargosRecebimento(valor);
                        setPercentualEncargosRecebimento(Math.round(percentual * 100) / 100);
                      }}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                      placeholder="0,00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-1">
                      Percentual (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={percentualEncargosRecebimento}
                      onChange={(e) => {
                        const percentual = parseFloat(e.target.value) || 0;
                        const valorProdutos = itensRecebimento.reduce((sum, item) => {
                          const qtd = item.quantidade_recebida ?? (item.quantidade_pedida || item.quantidade);
                          return sum + (qtd * item.custo_unitario);
                        }, 0);
                        const valor = (valorProdutos * percentual) / 100;
                        setPercentualEncargosRecebimento(percentual);
                        setValorEncargosRecebimento(Math.round(valor * 100) / 100);
                      }}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                      placeholder="0,00"
                    />
                    <p className="text-xs text-gray-500 mt-1">Calculado automaticamente</p>
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium text-white/80 mb-1">
                      Descrição dos Encargos
                    </label>
                    <input
                      type="text"
                      value={descricaoEncargosRecebimento}
                      onChange={(e) => setDescricaoEncargosRecebimento(e.target.value)}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                      placeholder="Ex: Entrega + 2% financeiro"
                    />
                  </div>
                </div>
              </div>

              {/* Desconto */}
              <div className="mt-6 p-6 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-medium text-green-900 mb-4 flex items-center">
                  <TrendingDown className="w-5 h-5 mr-2" />
                  Desconto Obtido (Negociação, avaria, etc)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-1">
                      Valor do Desconto (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={valorDescontoRecebimento}
                      onChange={(e) => {
                        const valor = parseFloat(e.target.value) || 0;
                        const valorProdutos = itensRecebimento.reduce((sum, item) => {
                          const qtd = item.quantidade_recebida ?? (item.quantidade_pedida || item.quantidade);
                          return sum + (qtd * item.custo_unitario);
                        }, 0);
                        const percentual = valorProdutos > 0 ? (valor * 100 / valorProdutos) : 0;
                        setValorDescontoRecebimento(valor);
                        setPercentualDescontoRecebimento(Math.round(percentual * 100) / 100);
                      }}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-green-600 focus:ring focus:ring-green-600 focus:ring-opacity-50"
                      placeholder="0,00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-1">
                      Percentual (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={percentualDescontoRecebimento}
                      onChange={(e) => {
                        const percentual = parseFloat(e.target.value) || 0;
                        const valorProdutos = itensRecebimento.reduce((sum, item) => {
                          const qtd = item.quantidade_recebida ?? (item.quantidade_pedida || item.quantidade);
                          return sum + (qtd * item.custo_unitario);
                        }, 0);
                        const valor = (valorProdutos * percentual) / 100;
                        setPercentualDescontoRecebimento(percentual);
                        setValorDescontoRecebimento(Math.round(valor * 100) / 100);
                      }}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-green-600 focus:ring focus:ring-green-600 focus:ring-opacity-50"
                      placeholder="0,00"
                    />
                    <p className="text-xs text-gray-500 mt-1">Calculado automaticamente</p>
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium text-white/80 mb-1">
                      Motivo do Desconto
                    </label>
                    <input
                      type="text"
                      value={motivoDescontoRecebimento}
                      onChange={(e) => setMotivoDescontoRecebimento(e.target.value)}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-green-600 focus:ring focus:ring-green-600 focus:ring-opacity-50"
                      placeholder="Ex: Negociação de pronto pagamento, produto com avaria"
                    />
                  </div>
                </div>
              </div>

              {/* Resumo de Valores */}
              <div className="mt-6 p-6 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-4 flex items-center">
                  <DollarSign className="w-5 h-5 mr-2" />
                  Resumo Financeiro
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/80">Valor dos Produtos:</span>
                    <span className="font-medium text-white">
                      {formatCurrency(itensRecebimento.reduce((sum, item) => {
                        const qtd = item.quantidade_recebida ?? (item.quantidade_pedida || item.quantidade);
                        return sum + (qtd * item.custo_unitario);
                      }, 0))}
                    </span>
                  </div>
                  {valorDescontoRecebimento > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-white/80">
                        Desconto ({percentualDescontoRecebimento.toFixed(2)}%):
                      </span>
                      <span className="font-medium text-green-600">
                        - {formatCurrency(valorDescontoRecebimento)}
                      </span>
                    </div>
                  )}
                  {valorEncargosRecebimento > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-white/80">
                        Encargos ({percentualEncargosRecebimento.toFixed(2)}%):
                      </span>
                      <span className="font-medium text-orange-600">
                        + {formatCurrency(valorEncargosRecebimento)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold pt-3 border-t-2 border-blue-300">
                    <span className="text-white">Valor Total Final:</span>
                    <span className="text-blue-900">
                      {formatCurrency(
                        itensRecebimento.reduce((sum, item) => {
                          const qtd = item.quantidade_recebida ?? (item.quantidade_pedida || item.quantidade);
                          return sum + (qtd * item.custo_unitario);
                        }, 0) + valorEncargosRecebimento - valorDescontoRecebimento
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowRecebimentoModal(false);
                  setCompraRecebimento(null);
                  setItensRecebimento([]);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-white/80 hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarRecebimento}
                disabled={loading || itensRecebimento.some(item => {
                  const quantidadePedida = item.quantidade_pedida || item.quantidade;
                  const hasDivergencia = item.quantidade_recebida !== quantidadePedida;
                  return hasDivergencia && !item.motivo_divergencia;
                })}
                className="px-4 py-2 bg-[#7D1F2C] text-white rounded-lg hover:bg-[#6a1a25] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirmar Recebimento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modais IA */}
      <ConsultaHistoricoIA
        isOpen={showConsultaHistoricoModal}
        onClose={() => setShowConsultaHistoricoModal(false)}
      />

      <ComprasIAModal
        isOpen={showIAModal}
        onClose={() => setShowIAModal(false)}
        onConfirm={handleIAExtraction}
        estoques={estoques}
      />

      <ConferenciaRecebimentoModal
        isOpen={showConferenciaModal}
        onClose={() => setShowConferenciaModal(false)}
        onConfirm={handleConfirmarConferencia}
        compra={compraConferencia}
        itens={itensRecebimento}
      />

      {/* Modal de Métricas e Análises */}
      {showMetricasModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-semibold text-white">Métricas e Análises de Compras</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Visão completa das compras com filtros e indicadores
                </p>
              </div>
              <button
                onClick={() => setShowMetricasModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <ListaComprasMetricas />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComprasEstoque;