import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Package,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Download,
  FileText,
  Calculator,
  ChefHat,
  Users,
  Clock,
  Target,
  Activity,
  Printer
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { exportToExcel, ReportGenerator } from '../../utils/reportGenerator';
import dayjs from 'dayjs';

interface FichaTecnica {
  id: string;
  nome: string;
  porcoes?: number;
  custo_total?: number;
  ativo: boolean;
  criado_em: string;
  tipo_consumo?: 'producao' | 'venda_direta';
  modo_preparo?: string;
  observacoes_preparo?: string;
  rendimento?: number;
  unidade_rendimento?: string;
}

interface Ingrediente {
  id: string;
  ficha_id: string;
  item_estoque_id?: string;
  ficha_tecnica_ingrediente_id?: string;
  quantidade: number;
  ordem?: number;
  observacoes?: string;
  // Dados do item ou ficha
  item_nome: string;
  item_codigo?: string;
  unidade_medida: string;
  custo_medio: number;
  tipo: 'item' | 'ficha';
}

interface ItemEstoque {
  id: string;
  codigo?: string;
  nome: string;
  unidade_medida: string;
  custo_medio: number;
  tipo_item: string;
  status: string;
}

interface FormDataFicha {
  nome: string;
  porcoes: number;
  ativo: boolean;
  tipo_consumo: 'producao' | 'venda_direta';
  modo_preparo: string;
  observacoes_preparo: string;
  rendimento: number;
  unidade_rendimento: string;
  ingredientes: IngredienteForm[];
}

interface IngredienteForm {
  tipo: 'item' | 'ficha';
  item_estoque_id?: string;
  ficha_tecnica_ingrediente_id?: string;
  quantidade: number;
  ordem: number;
  observacoes?: string;
}

interface IndicadoresFichas {
  total_fichas: number;
  fichas_ativas: number;
  fichas_inativas: number;
  custo_medio_ficha: number;
  fichas_sem_custo: number;
  total_ingredientes: number;
}

const FichasTecnicas: React.FC = () => {
  const [fichas, setFichas] = useState<FichaTecnica[]>([]);
  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([]);
  const [printMenuOpen, setPrintMenuOpen] = useState<string | null>(null);
  const [itensEstoque, setItensEstoque] = useState<ItemEstoque[]>([]);
  const [indicadores, setIndicadores] = useState<IndicadoresFichas | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingFicha, setEditingFicha] = useState<FichaTecnica | null>(null);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ativo' | 'inativo'>('all');
  const [custoFilter, setCustoFilter] = useState<'all' | 'sem_custo' | 'com_custo'>('all');
  
  const [formData, setFormData] = useState<FormDataFicha>({
    nome: '',
    porcoes: 1,
    ativo: true,
    tipo_consumo: 'producao',
    modo_preparo: '',
    observacoes_preparo: '',
    rendimento: 1,
    unidade_rendimento: 'porções',
    ingredientes: []
  });

  const [fichasDisponiveis, setFichasDisponiveis] = useState<FichaTecnica[]>([]);

  useEffect(() => {
    fetchData();
    fetchIndicadores();
  }, []);

  useEffect(() => {
    fetchData();
  }, [statusFilter, custoFilter]);

  useEffect(() => {
    if (showForm) {
      fetchItensEstoque();
      fetchFichasDisponiveis();
    }
  }, [showForm]);

  const fetchFichasDisponiveis = async () => {
    try {
      const { data, error } = await supabase
        .from('fichas_tecnicas')
        .select('id, nome, custo_total, porcoes, ativo')
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      setFichasDisponiveis(data || []);
    } catch (err) {
      console.error('Error fetching fichas:', err);
      setFichasDisponiveis([]);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase.from('fichas_tecnicas').select('*');

      // Aplicar filtros
      if (statusFilter !== 'all') {
        query = query.eq('ativo', statusFilter === 'ativo');
      }

      if (custoFilter === 'sem_custo') {
        query = query.eq('custo_total', 0);
      } else if (custoFilter === 'com_custo') {
        query = query.gt('custo_total', 0);
      }

      const { data, error } = await query.order('nome');

      if (error) throw error;
      setFichas(data || []);
    } catch (err) {
      console.error('Error fetching technical sheets:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar fichas técnicas');
    } finally {
      setLoading(false);
    }
  };

  const fetchItensEstoque = async () => {
    try {
      console.log('Buscando itens do estoque...');
      
      const { data, error } = await supabase
        .from('itens_estoque')
        .select('id, codigo, nome, unidade_medida, custo_medio, tipo_item, status')
        .eq('status', 'ativo')
        .eq('tipo_item', 'insumo')
        .order('nome');

      if (error) {
        console.error('Erro ao buscar itens:', error);
        throw error;
      }

      console.log('Itens encontrados:', data?.length || 0);
      console.log('Itens:', data);
      
      setItensEstoque(data || []);
    } catch (err) {
      console.error('Error fetching stock items:', err);
      setItensEstoque([]);
    }
  };

  const fetchIngredientes = async (fichaId: string) => {
    try {
      const { data, error } = await supabase
        .from('ficha_ingredientes')
        .select(`
          *,
          itens_estoque(
            nome,
            codigo,
            unidade_medida,
            custo_medio
          ),
          ficha_tecnica_ingrediente:fichas_tecnicas!ficha_ingredientes_ficha_tecnica_ingrediente_id_fkey(
            nome,
            custo_total,
            porcoes
          )
        `)
        .eq('ficha_id', fichaId)
        .order('ordem');

      if (error) throw error;

      const ingredientesProcessados = (data || []).map(ing => {
        const ehFicha = ing.ficha_tecnica_ingrediente_id !== null;
        const itemData = ehFicha ? ing.ficha_tecnica_ingrediente : ing.itens_estoque;

        return {
          id: ing.id,
          ficha_id: ing.ficha_id,
          item_estoque_id: ing.item_estoque_id || undefined,
          ficha_tecnica_ingrediente_id: ing.ficha_tecnica_ingrediente_id || undefined,
          quantidade: ing.quantidade,
          ordem: ing.ordem || 0,
          observacoes: ing.observacoes,
          item_nome: itemData?.nome || 'Item não encontrado',
          item_codigo: ehFicha ? undefined : itemData?.codigo,
          unidade_medida: ehFicha ? 'porções' : (itemData?.unidade_medida || 'un'),
          custo_medio: ehFicha ? (itemData?.custo_total || 0) / (itemData?.porcoes || 1) : (itemData?.custo_medio || 0),
          tipo: ehFicha ? 'ficha' as const : 'item' as const
        };
      });

      return ingredientesProcessados;
    } catch (err) {
      console.error('Error fetching ingredients:', err);
      return [];
    }
  };

  const fetchIndicadores = async () => {
    try {
      const { data, error } = await supabase
        .from('fichas_tecnicas')
        .select('*');

      if (error) throw error;

      const totalFichas = (data || []).length;
      const fichasAtivas = (data || []).filter(f => f.ativo).length;
      const fichasInativas = totalFichas - fichasAtivas;
      const custoMedioFicha = totalFichas > 0 
        ? (data || []).reduce((sum, f) => sum + (f.custo_total || 0), 0) / totalFichas
        : 0;
      const fichasSemCusto = (data || []).filter(f => (f.custo_total || 0) === 0).length;

      // Buscar total de ingredientes
      const { data: ingredientesData, error: ingredientesError } = await supabase
        .from('ficha_ingredientes')
        .select('id');

      if (ingredientesError) throw ingredientesError;

      setIndicadores({
        total_fichas: totalFichas,
        fichas_ativas: fichasAtivas,
        fichas_inativas: fichasInativas,
        custo_medio_ficha: custoMedioFicha,
        fichas_sem_custo: fichasSemCusto,
        total_ingredientes: (ingredientesData || []).length
      });
    } catch (err) {
      console.error('Error fetching indicators:', err);
    }
  };

  const calcularCustoTotal = () => {
    return formData.ingredientes.reduce((total, ing) => {
      if (ing.tipo === 'item' && ing.item_estoque_id) {
        const item = itensEstoque.find(i => i.id === ing.item_estoque_id);
        return total + (item ? item.custo_medio * ing.quantidade : 0);
      } else if (ing.tipo === 'ficha' && ing.ficha_tecnica_ingrediente_id) {
        const ficha = fichasDisponiveis.find(f => f.id === ing.ficha_tecnica_ingrediente_id);
        if (ficha && ficha.porcoes) {
          const custoPorPorcao = ficha.custo_total! / ficha.porcoes;
          return total + (custoPorPorcao * ing.quantidade);
        }
      }
      return total;
    }, 0);
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);

      // Validações
      if (!formData.nome || formData.ingredientes.length === 0) {
        throw new Error('Preencha o nome e adicione pelo menos um ingrediente');
      }

      const custoTotal = calcularCustoTotal();

      const fichaData = {
        nome: formData.nome,
        porcoes: formData.porcoes,
        custo_total: custoTotal,
        ativo: formData.ativo,
        tipo_consumo: formData.tipo_consumo,
        modo_preparo: formData.modo_preparo || null,
        observacoes_preparo: formData.observacoes_preparo || null,
        rendimento: formData.rendimento || null,
        unidade_rendimento: formData.unidade_rendimento || null
      };

      let fichaId: string;

      if (editingFicha) {
        const { error } = await supabase
          .from('fichas_tecnicas')
          .update(fichaData)
          .eq('id', editingFicha.id);

        if (error) throw error;

        // Remover ingredientes antigos
        const { error: deleteError } = await supabase
          .from('ficha_ingredientes')
          .delete()
          .eq('ficha_id', editingFicha.id);

        if (deleteError) throw deleteError;

        fichaId = editingFicha.id;
      } else {
        const { data: novaFicha, error } = await supabase
          .from('fichas_tecnicas')
          .insert([fichaData])
          .select()
          .single();

        if (error) throw error;
        fichaId = novaFicha.id;
      }

      // Inserir ingredientes
      if (formData.ingredientes.length > 0) {
        const ingredientesParaInserir = formData.ingredientes.map((ing, index) => ({
          ficha_id: fichaId,
          item_estoque_id: ing.tipo === 'item' ? ing.item_estoque_id : null,
          ficha_tecnica_ingrediente_id: ing.tipo === 'ficha' ? ing.ficha_tecnica_ingrediente_id : null,
          quantidade: ing.quantidade,
          ordem: index + 1,
          observacoes: ing.observacoes || null
        }));

        const { error: ingredientesError } = await supabase
          .from('ficha_ingredientes')
          .insert(ingredientesParaInserir);

        if (ingredientesError) throw ingredientesError;
      }

      setShowForm(false);
      setEditingFicha(null);
      resetForm();
      fetchData();
      fetchIndicadores();
    } catch (err) {
      console.error('Error saving technical sheet:', err);
      setError(err instanceof Error ? err.message : 'Erro ao salvar ficha técnica');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta ficha técnica?')) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('fichas_tecnicas')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchData();
      fetchIndicadores();
    } catch (err) {
      console.error('Error deleting technical sheet:', err);
      setError(err instanceof Error ? err.message : 'Erro ao excluir ficha técnica');
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (ficha: FichaTecnica) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('fichas_tecnicas')
        .update({ ativo: !ficha.ativo })
        .eq('id', ficha.id);

      if (error) throw error;
      fetchData();
      fetchIndicadores();
    } catch (err) {
      console.error('Error updating status:', err);
      setError(err instanceof Error ? err.message : 'Erro ao atualizar status');
    } finally {
      setLoading(false);
    }
  };

  const imprimirFichaTecnicaCompleta = async (ficha: FichaTecnica) => {
    try {
      const ingredientesFicha = await fetchIngredientes(ficha.id);

      const reportGenerator = new ReportGenerator({
        title: 'Ficha Técnica Completa',
        subtitle: ficha.nome,
        filename: `ficha-tecnica-completa-${ficha.nome.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`,
        orientation: 'portrait'
      });

      let currentY = reportGenerator.addHeader('FICHA TÉCNICA COMPLETA', ficha.nome);

      // Seção de Informações Gerais
      const informacoesGerais = [
        ['Nome da Ficha', ficha.nome],
        ['Porções', `${ficha.porcoes || 1} porção(ões)`],
        ['Status', ficha.ativo ? 'ATIVA' : 'INATIVA'],
        ['Tipo de Consumo', ficha.tipo_consumo === 'producao' ? 'Produção Prévia' : 'Venda Direta'],
        ['Custo Total', formatCurrency(ficha.custo_total || 0)],
        ['Custo por Porção', formatCurrency((ficha.custo_total || 0) / (ficha.porcoes || 1))],
        ['Data de Criação', dayjs(ficha.criado_em).format('DD/MM/YYYY HH:mm')]
      ];

      if (ficha.rendimento) {
        informacoesGerais.push(['Rendimento', `${ficha.rendimento} ${ficha.unidade_rendimento || 'un'}`]);
      }

      currentY = reportGenerator.addSection('INFORMAÇÕES GERAIS', [], currentY);
      currentY = reportGenerator.addTable(['Campo', 'Valor'], informacoesGerais, currentY);

      // Seção de Ingredientes
      currentY = reportGenerator.addSection('INGREDIENTES', [], currentY + 10);

      const ingredientesData = ingredientesFicha.map((ing, index) => {
        const custoUnitario = ing.custo_medio || 0;
        const custoTotal = custoUnitario * ing.quantidade;
        return [
          `${index + 1}`,
          ing.item_codigo ? `[${ing.item_codigo}] ${ing.item_nome}` : ing.item_nome,
          `${ing.quantidade.toFixed(3)} ${ing.unidade_medida}`,
          formatCurrency(custoUnitario),
          formatCurrency(custoTotal),
          ing.tipo === 'ficha' ? 'Ficha' : 'Item'
        ];
      });

      if (ingredientesData.length > 0) {
        currentY = reportGenerator.addTable(
          ['#', 'Ingrediente', 'Quantidade', 'Custo Unit.', 'Custo Total', 'Tipo'],
          ingredientesData,
          currentY
        );
      } else {
        reportGenerator.addText('Nenhum ingrediente cadastrado', 25, currentY);
        currentY += 15;
      }

      // Resumo de Custos
      const totalIngredientes = ingredientesFicha.reduce((sum, ing) =>
        sum + ((ing.custo_medio || 0) * ing.quantidade), 0
      );
      const custosPorPorcao = totalIngredientes / (ficha.porcoes || 1);

      const resumoCustos = [
        ['Total de Ingredientes', ingredientesFicha.length.toString()],
        ['Custo Total dos Ingredientes', formatCurrency(totalIngredientes)],
        ['Porções', `${ficha.porcoes || 1}`],
        ['Custo por Porção', formatCurrency(custosPorPorcao)]
      ];

      currentY = reportGenerator.addSection('RESUMO DE CUSTOS', [], currentY + 10);
      currentY = reportGenerator.addTable(['Descrição', 'Valor'], resumoCustos, currentY);

      // Modo de Preparo
      if (ficha.modo_preparo) {
        currentY = reportGenerator.addSection('MODO DE PREPARO', [], currentY + 10);
        reportGenerator.addText(ficha.modo_preparo, 25, currentY);
        currentY += 30;
      }

      // Observações de Preparo
      if (ficha.observacoes_preparo) {
        currentY = reportGenerator.addSection('OBSERVAÇÕES DE PREPARO', [], currentY + 5);
        reportGenerator.addText(ficha.observacoes_preparo, 25, currentY);
        currentY += 30;
      }

      // Tipo de Consumo - Explicação
      const tipoConsumoInfo = ficha.tipo_consumo === 'producao'
        ? 'PRODUÇÃO PRÉVIA: Esta ficha requer ordem de produção. Os insumos são baixados do estoque durante a produção e o produto final é baixado na venda.'
        : 'VENDA DIRETA: Esta ficha não requer ordem de produção. Os insumos são baixados automaticamente do estoque a cada venda.';

      currentY = reportGenerator.addSection('TIPO DE CONSUMO', [], currentY + 5);
      reportGenerator.addText(tipoConsumoInfo, 25, currentY);
      currentY += 25;

      // Orientações
      const orientacoes = [
        '• Esta ficha técnica deve ser seguida rigorosamente para garantir a padronização',
        '• Qualquer alteração deve ser registrada no sistema',
        '• Manter atenção às quantidades e medidas especificadas',
        '• Verificar disponibilidade de ingredientes antes de iniciar o preparo',
        '• Registrar eventuais problemas ou dificuldades encontradas'
      ];

      currentY = reportGenerator.addSection('ORIENTAÇÕES', orientacoes, currentY + 5);

      // Área para controle de qualidade
      reportGenerator.addText('___________________________________________', 25, currentY + 30);
      reportGenerator.addText('Responsável pelo Preparo', 25, currentY + 35);
      reportGenerator.addText(`Data: ___/___/______     Hora: ___:___`, 25, currentY + 45);

      reportGenerator.save(`ficha-tecnica-completa-${ficha.nome.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF da ficha técnica. Tente novamente.');
    }
  };

  const imprimirFichaTecnicaSimplificada = async (ficha: FichaTecnica) => {
    try {
      const ingredientesFicha = await fetchIngredientes(ficha.id);

      const reportGenerator = new ReportGenerator({
        title: 'Receita',
        subtitle: ficha.nome,
        filename: `receita-${ficha.nome.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`,
        orientation: 'portrait'
      });

      let currentY = reportGenerator.addHeader('RECEITA', ficha.nome);

      // Informações Básicas
      const informacoesBasicas = [
        ['Porções', `${ficha.porcoes || 1} porção(ões)`]
      ];

      if (ficha.rendimento) {
        informacoesBasicas.push(['Rendimento', `${ficha.rendimento} ${ficha.unidade_rendimento || 'un'}`]);
      }

      currentY = reportGenerator.addSection('INFORMAÇÕES', [], currentY);
      currentY = reportGenerator.addTable(['Campo', 'Valor'], informacoesBasicas, currentY);

      // Lista de Ingredientes (sem custos)
      currentY = reportGenerator.addSection('INGREDIENTES', [], currentY + 10);

      const ingredientesData = ingredientesFicha.map((ing, index) => {
        return [
          `${index + 1}`,
          ing.item_codigo ? `[${ing.item_codigo}] ${ing.item_nome}` : ing.item_nome,
          `${ing.quantidade.toFixed(3)} ${ing.unidade_medida}`,
          ing.observacoes || '-'
        ];
      });

      if (ingredientesData.length > 0) {
        currentY = reportGenerator.addTable(
          ['#', 'Ingrediente', 'Quantidade', 'Observações'],
          ingredientesData,
          currentY
        );
      } else {
        reportGenerator.addText('Nenhum ingrediente cadastrado', 25, currentY);
        currentY += 15;
      }

      // Modo de Preparo
      if (ficha.modo_preparo) {
        currentY = reportGenerator.addSection('MODO DE PREPARO', [], currentY + 10);

        // Dividir o texto em linhas para melhor formatação
        const linhas = ficha.modo_preparo.split('\n');
        linhas.forEach(linha => {
          if (linha.trim()) {
            reportGenerator.addText(linha, 25, currentY);
            currentY += 15;
          } else {
            currentY += 5;
          }
        });
        currentY += 10;
      }

      // Observações de Preparo
      if (ficha.observacoes_preparo) {
        currentY = reportGenerator.addSection('OBSERVAÇÕES', [], currentY + 5);
        const linhas = ficha.observacoes_preparo.split('\n');
        linhas.forEach(linha => {
          if (linha.trim()) {
            reportGenerator.addText(linha, 25, currentY);
            currentY += 15;
          } else {
            currentY += 5;
          }
        });
        currentY += 10;
      }

      // Orientações de Preparo
      const orientacoes = [
        '• Seguir a receita rigorosamente para garantir a padronização',
        '• Manter atenção às quantidades e medidas especificadas',
        '• Verificar disponibilidade de ingredientes antes de iniciar',
        '• Higienizar as mãos e utensílios antes de começar',
        '• Reportar qualquer problema ao supervisor'
      ];

      currentY = reportGenerator.addSection('ORIENTAÇÕES', orientacoes, currentY + 5);

      // Área para assinatura
      reportGenerator.addText('___________________________________________', 25, currentY + 30);
      reportGenerator.addText('Responsável pelo Preparo', 25, currentY + 35);
      reportGenerator.addText(`Data: ___/___/______     Hora Início: ___:___     Hora Fim: ___:___`, 25, currentY + 45);

      reportGenerator.save(`receita-${ficha.nome.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF da receita. Tente novamente.');
    }
  };

  const openForm = async (ficha?: FichaTecnica) => {
    if (ficha) {
      setEditingFicha(ficha);
      
      // Buscar ingredientes da ficha
      const ingredientesFicha = await fetchIngredientes(ficha.id);
      
      setFormData({
        nome: ficha.nome,
        porcoes: ficha.porcoes || 1,
        ativo: ficha.ativo,
        tipo_consumo: ficha.tipo_consumo || 'producao',
        modo_preparo: ficha.modo_preparo || '',
        observacoes_preparo: ficha.observacoes_preparo || '',
        rendimento: ficha.rendimento || 1,
        unidade_rendimento: ficha.unidade_rendimento || 'porções',
        ingredientes: ingredientesFicha.map((ing, index) => ({
          tipo: ing.tipo,
          item_estoque_id: ing.item_estoque_id,
          ficha_tecnica_ingrediente_id: ing.ficha_tecnica_ingrediente_id,
          quantidade: ing.quantidade,
          ordem: ing.ordem || index + 1,
          observacoes: ing.observacoes
        }))
      });
    } else {
      setEditingFicha(null);
      resetForm();
    }
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      porcoes: 1,
      ativo: true,
      tipo_consumo: 'producao',
      modo_preparo: '',
      observacoes_preparo: '',
      rendimento: 1,
      unidade_rendimento: 'porções',
      ingredientes: []
    });
  };

  const adicionarIngrediente = () => {
    setFormData({
      ...formData,
      ingredientes: [
        ...formData.ingredientes,
        {
          tipo: 'item',
          item_estoque_id: '',
          ficha_tecnica_ingrediente_id: '',
          quantidade: 0,
          ordem: formData.ingredientes.length + 1,
          observacoes: ''
        }
      ]
    });
  };

  const removerIngrediente = (index: number) => {
    const novosIngredientes = formData.ingredientes.filter((_, i) => i !== index);
    setFormData({ ...formData, ingredientes: novosIngredientes });
  };

  const atualizarIngrediente = (index: number, campo: keyof IngredienteForm, valor: any) => {
    const novosIngredientes = [...formData.ingredientes];
    novosIngredientes[index] = { ...novosIngredientes[index], [campo]: valor };

    // Se mudou o tipo, limpar o campo oposto
    if (campo === 'tipo') {
      if (valor === 'item') {
        novosIngredientes[index].ficha_tecnica_ingrediente_id = '';
      } else {
        novosIngredientes[index].item_estoque_id = '';
      }
    }

    setFormData({ ...formData, ingredientes: novosIngredientes });
  };

  const filteredFichas = fichas.filter(ficha => {
    const matchesSearch = ficha.nome.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const exportData = () => {
    if (filteredFichas.length === 0) {
      alert('Não há dados para exportar');
      return;
    }

    const headers = [
      'Nome',
      'Porções',
      'Custo Total',
      'Custo por Porção',
      'Status',
      'Criado em'
    ];

    const data = filteredFichas.map(ficha => [
      ficha.nome,
      ficha.porcoes || 1,
      ficha.custo_total || 0,
      ficha.porcoes && ficha.porcoes > 0 ? (ficha.custo_total || 0) / ficha.porcoes : 0,
      ficha.ativo ? 'Ativo' : 'Inativo',
      dayjs(ficha.criado_em).format('DD/MM/YYYY')
    ]);

    const fileName = `fichas-tecnicas-${dayjs().format('YYYY-MM-DD')}`;
    exportToExcel(data, fileName, headers);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Fichas Técnicas</h3>
        <div className="flex gap-2">
          <button
            onClick={exportData}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            <Download className="w-4 h-4 inline mr-2" />
            Exportar Excel
          </button>
          <button
            onClick={() => openForm()}
            className="px-4 py-2 bg-[#7D1F2C] text-white rounded-lg hover:bg-[#6a1a25]"
          >
            <Plus className="w-4 h-4 inline mr-2" />
            Nova Ficha
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
              <FileText className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-500">Total Fichas</p>
                <p className="text-2xl font-bold text-blue-600">
                  {indicadores.total_fichas}
                </p>
                <p className="text-sm text-gray-600">Cadastradas</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <CheckCircle className="w-8 h-8 text-green-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-500">Fichas Ativas</p>
                <p className="text-2xl font-bold text-green-600">
                  {indicadores.fichas_ativas}
                </p>
                <p className="text-sm text-gray-600">Em uso</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <EyeOff className="w-8 h-8 text-gray-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-500">Fichas Inativas</p>
                <p className="text-2xl font-bold text-gray-600">
                  {indicadores.fichas_inativas}
                </p>
                <p className="text-sm text-gray-600">Desabilitadas</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <DollarSign className="w-8 h-8 text-purple-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-500">Custo Médio</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatCurrency(indicadores.custo_medio_ficha)}
                </p>
                <p className="text-sm text-gray-600">Por ficha</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <AlertTriangle className="w-8 h-8 text-orange-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-500">Sem Custo</p>
                <p className="text-2xl font-bold text-orange-600">
                  {indicadores.fichas_sem_custo}
                </p>
                <p className="text-sm text-gray-600">Precisam revisão</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <Package className="w-8 h-8 text-teal-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-500">Ingredientes</p>
                <p className="text-2xl font-bold text-teal-600">
                  {indicadores.total_ingredientes}
                </p>
                <p className="text-sm text-gray-600">Total cadastrados</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar fichas..."
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
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>
          </div>

          <div>
            <select
              value={custoFilter}
              onChange={(e) => setCustoFilter(e.target.value as any)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#7D1F2C] focus:border-[#7D1F2C]"
            >
              <option value="all">Todos os Custos</option>
              <option value="com_custo">Com Custo</option>
              <option value="sem_custo">Sem Custo</option>
            </select>
          </div>

          <div>
            <button
              onClick={fetchData}
              className="w-full px-4 py-2 bg-[#7D1F2C] text-white rounded-md hover:bg-[#6a1a25]"
            >
              <Filter className="w-4 h-4 inline mr-2" />
              Filtrar
            </button>
          </div>
        </div>
      </div>

      {/* Lista de Fichas */}
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
                    Nome
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Porções
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Custo Total
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Custo por Porção
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Criado em
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredFichas.map((ficha) => (
                  <tr key={ficha.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{ficha.nome}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Users className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">
                          {ficha.porcoes || 1}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`font-medium ${
                        (ficha.custo_total || 0) > 0 ? 'text-gray-900' : 'text-orange-600'
                      }`}>
                        {formatCurrency(ficha.custo_total || 0)}
                      </div>
                      {(ficha.custo_total || 0) === 0 && (
                        <div className="text-xs text-orange-600 flex items-center">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Sem custo
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {ficha.porcoes && ficha.porcoes > 0 
                          ? formatCurrency((ficha.custo_total || 0) / ficha.porcoes)
                          : formatCurrency(0)
                        }
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        ficha.ativo ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100'
                      }`}>
                        {ficha.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">
                        {dayjs(ficha.criado_em).format('DD/MM/YYYY')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-2">
                        <div className="relative">
                          <button
                            onClick={() => setPrintMenuOpen(printMenuOpen === ficha.id ? null : ficha.id)}
                            className="text-gray-600 hover:text-gray-800"
                            title="Opções de Impressão"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {printMenuOpen === ficha.id && (
                            <>
                              <div
                                className="fixed inset-0 z-10"
                                onClick={() => setPrintMenuOpen(null)}
                              />
                              <div className="absolute left-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-20 py-1">
                                <button
                                  onClick={() => {
                                    imprimirFichaTecnicaCompleta(ficha);
                                    setPrintMenuOpen(null);
                                  }}
                                  className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center text-sm text-gray-700"
                                >
                                  <FileText className="w-4 h-4 mr-3 text-gray-500" />
                                  <div>
                                    <div className="font-medium">Ficha Completa</div>
                                    <div className="text-xs text-gray-500">Com custos e informações detalhadas</div>
                                  </div>
                                </button>
                                <button
                                  onClick={() => {
                                    imprimirFichaTecnicaSimplificada(ficha);
                                    setPrintMenuOpen(null);
                                  }}
                                  className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center text-sm text-gray-700"
                                >
                                  <ChefHat className="w-4 h-4 mr-3 text-[#7D1F2C]" />
                                  <div>
                                    <div className="font-medium">Receita para Cozinha</div>
                                    <div className="text-xs text-gray-500">Apenas ingredientes e preparo</div>
                                  </div>
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                        <button
                          onClick={() => openForm(ficha)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => toggleStatus(ficha)}
                          className={`${ficha.ativo ? 'text-green-600' : 'text-gray-400'} hover:opacity-75`}
                          title={ficha.ativo ? 'Desativar' : 'Ativar'}
                        >
                          {ficha.ativo ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleDelete(ficha.id)}
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

          {filteredFichas.length === 0 && (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma ficha encontrada</h3>
              <p className="text-gray-500">
                {searchTerm || statusFilter !== 'all' || custoFilter !== 'all'
                  ? 'Nenhuma ficha corresponde aos filtros aplicados.'
                  : 'Nenhuma ficha técnica cadastrada.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Modal do Formulário */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {editingFicha ? 'Editar Ficha Técnica' : 'Nova Ficha Técnica'}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome da Ficha *
                </label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  required
                  placeholder="Ex: Hambúrguer Artesanal, Caipirinha de Limão"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Porções *
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.porcoes}
                  onChange={(e) => setFormData({ ...formData, porcoes: parseInt(e.target.value) || 1 })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  required
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="ativo"
                  checked={formData.ativo}
                  onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                  className="rounded border-gray-300 text-[#7D1F2C] focus:ring-[#7D1F2C]"
                />
                <label htmlFor="ativo" className="ml-2 text-sm text-gray-700">
                  Ficha ativa
                </label>
              </div>
            </div>

            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <label className="block text-sm font-medium text-gray-900 mb-3">
                Tipo de Consumo *
              </label>
              <div className="space-y-3">
                <label className="flex items-start cursor-pointer">
                  <input
                    type="radio"
                    name="tipo_consumo"
                    value="producao"
                    checked={formData.tipo_consumo === 'producao'}
                    onChange={(e) => setFormData({ ...formData, tipo_consumo: e.target.value as 'producao' })}
                    className="mt-1 text-[#7D1F2C] focus:ring-[#7D1F2C]"
                  />
                  <div className="ml-3">
                    <span className="font-medium text-gray-900">Produção Prévia</span>
                    <p className="text-sm text-gray-600">
                      Requer ordem de produção. Insumos são baixados na produção, produto final baixado na venda.
                      <br />
                      <span className="text-xs text-gray-500">Ex: Picanha 400g, Hambúrguer, Torta</span>
                    </p>
                  </div>
                </label>
                <label className="flex items-start cursor-pointer">
                  <input
                    type="radio"
                    name="tipo_consumo"
                    value="venda_direta"
                    checked={formData.tipo_consumo === 'venda_direta'}
                    onChange={(e) => setFormData({ ...formData, tipo_consumo: e.target.value as 'venda_direta' })}
                    className="mt-1 text-[#7D1F2C] focus:ring-[#7D1F2C]"
                  />
                  <div className="ml-3">
                    <span className="font-medium text-gray-900">Venda Direta</span>
                    <p className="text-sm text-gray-600">
                      Sem ordem de produção. Insumos são baixados automaticamente a cada venda.
                      <br />
                      <span className="text-xs text-gray-500">Ex: Drinks, Caipirinhas, Porções preparadas no bar</span>
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Modo de Preparo */}
            <div className="mb-6 border-t border-gray-200 pt-6">
              <h4 className="text-md font-medium text-gray-900 mb-4">Modo de Preparo (Opcional)</h4>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Passo a Passo da Receita
                </label>
                <textarea
                  value={formData.modo_preparo}
                  onChange={(e) => setFormData({ ...formData, modo_preparo: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  rows={6}
                  placeholder="Descreva o passo a passo do preparo da receita..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Instruções detalhadas para padronizar o preparo
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observações de Preparo
                </label>
                <textarea
                  value={formData.observacoes_preparo}
                  onChange={(e) => setFormData({ ...formData, observacoes_preparo: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                  rows={3}
                  placeholder="Dicas, cuidados especiais, tempo de preparo..."
                />
              </div>
            </div>

            {/* Ingredientes */}
            <div className="border-t border-gray-200 pt-6">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-md font-medium text-gray-900">Ingredientes</h4>
                <button
                  onClick={adicionarIngrediente}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 inline mr-1" />
                  Adicionar Ingrediente
                </button>
              </div>

              {formData.ingredientes.length > 0 ? (
                <div className="space-y-3">
                  {formData.ingredientes.map((ingrediente, index) => (
                    <div key={index} className="grid grid-cols-1 gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                        <div className="md:col-span-1">
                          <label className="block text-xs font-medium text-gray-700 mb-1">Tipo</label>
                          <select
                            value={ingrediente.tipo}
                            onChange={(e) => atualizarIngrediente(index, 'tipo', e.target.value)}
                            className="w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                          >
                            <option value="item">Item de Estoque</option>
                            <option value="ficha">Ficha Técnica</option>
                          </select>
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            {ingrediente.tipo === 'item' ? 'Item' : 'Ficha Técnica'}
                          </label>
                          {ingrediente.tipo === 'item' ? (
                            <select
                              value={ingrediente.item_estoque_id || ''}
                              onChange={(e) => atualizarIngrediente(index, 'item_estoque_id', e.target.value)}
                              className="w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                              required
                            >
                              <option value="">Selecione um item...</option>
                              {itensEstoque.map((item) => (
                                <option key={item.id} value={item.id}>
                                  {item.codigo ? `${item.codigo} - ${item.nome}` : item.nome} ({item.unidade_medida})
                                </option>
                              ))}
                            </select>
                          ) : (
                            <select
                              value={ingrediente.ficha_tecnica_ingrediente_id || ''}
                              onChange={(e) => atualizarIngrediente(index, 'ficha_tecnica_ingrediente_id', e.target.value)}
                              className="w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                              required
                            >
                              <option value="">Selecione uma ficha...</option>
                              {fichasDisponiveis
                                .filter(f => !editingFicha || f.id !== editingFicha.id)
                                .map((ficha) => (
                                  <option key={ficha.id} value={ficha.id}>
                                    {ficha.nome} - {formatCurrency((ficha.custo_total || 0) / (ficha.porcoes || 1))} por porção
                                  </option>
                                ))}
                            </select>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Quantidade</label>
                          <input
                            type="number"
                            step={ingrediente.tipo === 'ficha' ? "1" : "0.001"}
                            min={ingrediente.tipo === 'ficha' ? "1" : "0.001"}
                            placeholder="Qtd"
                            value={ingrediente.quantidade}
                            onChange={(e) => atualizarIngrediente(index, 'quantidade', parseFloat(e.target.value) || 0)}
                            className="w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                            required
                          />
                          {ingrediente.tipo === 'item' && ingrediente.item_estoque_id && (
                            <p className="text-xs text-gray-500 mt-1">
                              {itensEstoque.find(i => i.id === ingrediente.item_estoque_id)?.unidade_medida}
                            </p>
                          )}
                          {ingrediente.tipo === 'ficha' && (
                            <p className="text-xs text-gray-500 mt-1">porções</p>
                          )}
                        </div>

                        <div className="flex flex-col justify-between">
                          <div className="text-sm">
                            {ingrediente.tipo === 'item' && ingrediente.item_estoque_id && ingrediente.quantidade > 0 && (
                              <div>
                                <span className="text-xs text-gray-600">Custo:</span>
                                <div className="font-medium text-[#7D1F2C] text-sm">
                                  {formatCurrency(
                                    (itensEstoque.find(i => i.id === ingrediente.item_estoque_id)?.custo_medio || 0) * ingrediente.quantidade
                                  )}
                                </div>
                              </div>
                            )}
                            {ingrediente.tipo === 'ficha' && ingrediente.ficha_tecnica_ingrediente_id && ingrediente.quantidade > 0 && (
                              <div>
                                <span className="text-xs text-gray-600">Custo:</span>
                                <div className="font-medium text-[#7D1F2C] text-sm">
                                  {(() => {
                                    const ficha = fichasDisponiveis.find(f => f.id === ingrediente.ficha_tecnica_ingrediente_id);
                                    if (ficha && ficha.porcoes) {
                                      return formatCurrency(((ficha.custo_total || 0) / ficha.porcoes) * ingrediente.quantidade);
                                    }
                                    return formatCurrency(0);
                                  })()}
                                </div>
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => removerIngrediente(index)}
                            className="text-red-600 hover:text-red-800 mt-2"
                            title="Remover Ingrediente"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Observações (opcional)</label>
                        <input
                          type="text"
                          value={ingrediente.observacoes || ''}
                          onChange={(e) => atualizarIngrediente(index, 'observacoes', e.target.value)}
                          className="w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
                          placeholder="Ex: picado, ralado, sem pele..."
                        />
                      </div>
                    </div>
                  ))}

                  <div className="flex justify-end pt-3 border-t border-gray-200">
                    <div className="text-right">
                      <span className="text-sm text-gray-600">Custo Total da Ficha:</span>
                      <span className="ml-2 text-lg font-bold text-[#7D1F2C]">
                        {formatCurrency(calcularCustoTotal())}
                      </span>
                      {formData.porcoes > 0 && (
                        <div className="text-sm text-gray-600">
                          Custo por porção: {formatCurrency(calcularCustoTotal() / formData.porcoes)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Nenhum ingrediente adicionado</p>
                  <button
                    onClick={adicionarIngrediente}
                    className="mt-2 px-4 py-2 bg-[#7D1F2C] text-white rounded-lg hover:bg-[#6a1a25]"
                  >
                    Adicionar Primeiro Ingrediente
                  </button>
                </div>
              )}
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={loading || !formData.nome || formData.ingredientes.length === 0}
                className="px-4 py-2 bg-[#7D1F2C] text-white rounded-md hover:bg-[#6a1a25] disabled:opacity-50"
              >
                {loading ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FichasTecnicas;