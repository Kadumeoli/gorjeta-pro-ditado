import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Download,
  Filter,
  TrendingUp,
  TrendingDown,
  BarChart3,
  FileText,
  ChevronDown,
  Tag,
  X
} from 'lucide-react';
import { Menu } from '@headlessui/react';
import { supabase } from '../../lib/supabase';
import dayjs from 'dayjs';
import { ReportGenerator, exportToExcel } from '../../utils/reportGenerator';
import CategorizarLancamentos from '../financeiro/CategorizarLancamentos';
import RecategorizarLancamentos from '../financeiro/RecategorizarLancamentos';

interface DREData {
  categoria_raiz_id: string;
  categoria_raiz_nome: string;
  categoria_id: string;
  categoria_nome: string;
  tipo: 'receita' | 'despesa';
  nivel: number;
  centro_custo_id?: string;
  ano: number;
  mes: number;
  valor_total: number;
  quantidade_lancamentos: number;
}

interface DREGroup {
  categoria_raiz_id: string;
  categoria_raiz_nome: string;
  tipo: 'receita' | 'despesa';
  total: number;
  subcategorias: DREData[];
}

const DREReport: React.FC = () => {
  const [dreData, setDreData] = useState<DREData[]>([]);
  const [groupedData, setGroupedData] = useState<DREGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | 'all'>('all');
  const [selectedCostCenter, setSelectedCostCenter] = useState<string | 'all'>('all');
  const [costCenters, setCostCenters] = useState<any[]>([]);
  const [showCategorizarModal, setShowCategorizarModal] = useState(false);
  const [showRecategorizarModal, setShowRecategorizarModal] = useState(false);

  useEffect(() => {
    fetchCostCenters();
  }, []);

  useEffect(() => {
    fetchDREData();
  }, [selectedYear, selectedMonth, selectedCostCenter]);

  useEffect(() => {
    if (dreData.length > 0) {
      groupDREData();
    } else {
      setGroupedData([]);
    }
  }, [dreData]);

  const fetchCostCenters = async () => {
    try {
      const { data, error } = await supabase
        .from('centros_custo')
        .select('id, nome')
        .eq('status', 'ativo')
        .order('nome');

      if (error) throw error;
      setCostCenters(data || []);
    } catch (err) {
      console.error('Error fetching cost centers:', err);
      setCostCenters([]);
    }
  };

  const fetchDREData = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase.from('vw_dre_consolidado').select('*');

      // Apply year filter
      query = query.eq('ano', selectedYear);

      // Apply month filter
      if (selectedMonth !== 'all') {
        query = query.eq('mes', selectedMonth);
      }

      // Apply cost center filter
      if (selectedCostCenter !== 'all') {
        query = query.eq('centro_custo_id', selectedCostCenter);
      }

      const { data, error } = await query
        .order('categoria_raiz_nome, categoria_nome')
        .limit(10000); // Garantir que todas as categorias sejam retornadas

      if (error) throw error;

      // Transform data to match our interface
      const transformedData: DREData[] = (data || []).map(item => ({
        categoria_raiz_id: item.categoria_raiz_id,
        categoria_raiz_nome: item.categoria_raiz_nome,
        categoria_id: item.categoria_id,
        categoria_nome: item.categoria_nome,
        tipo: item.tipo,
        nivel: item.nivel,
        centro_custo_id: item.centro_custo_id,
        ano: item.ano,
        mes: item.mes,
        valor_total: item.valor_total,
        quantidade_lancamentos: item.quantidade_lancamentos
      }));

      setDreData(transformedData);
    } catch (err) {
      console.error('Error fetching DRE data:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados do DRE');
      setDreData([]);
    } finally {
      setLoading(false);
    }
  };

  const groupDREData = () => {
    const groups: { [key: string]: DREGroup } = {};

    dreData.forEach(item => {
      const key = `${item.categoria_raiz_id}_${item.tipo}`;

      if (!groups[key]) {
        groups[key] = {
          categoria_raiz_id: item.categoria_raiz_id,
          categoria_raiz_nome: item.categoria_raiz_nome,
          tipo: item.tipo,
          total: 0,
          subcategorias: []
        };
      }

      // Somar TODOS os valores - a view não duplica mais
      groups[key].total += item.valor_total;

      // Adicionar subcategorias para exibição detalhada
      if (item.nivel > 0) {
        groups[key].subcategorias.push(item);
      }
    });

    // Ordenar: RECEITAS primeiro, depois DESPESAS
    const sortedGroups = Object.values(groups).sort((a, b) => {
      if (a.tipo === 'receita' && b.tipo === 'despesa') return -1;
      if (a.tipo === 'despesa' && b.tipo === 'receita') return 1;
      return a.categoria_raiz_nome.localeCompare(b.categoria_raiz_nome);
    });

    setGroupedData(sortedGroups);
  };

  // Função auxiliar para consolidar subcategorias
  // A view já consolida por categoria (sem separar centro de custo)
  const consolidarSubcategorias = (subcategorias: DREData[]) => {
    const consolidadas = new Map<string, DREData>();

    subcategorias.forEach(sub => {
      // Para "Outros" e "Lançamentos Não Classificados", usar o nome como chave
      // porque a view gera UUIDs aleatórios para essas categorias virtuais
      const isVirtualCategory = sub.categoria_nome === 'Outros' ||
                                sub.categoria_nome === 'Lançamentos Não Classificados';

      // Chave única por categoria (ignorando centro de custo)
      const key = isVirtualCategory
        ? `${sub.categoria_raiz_id}_${sub.categoria_nome}`
        : sub.categoria_id;

      if (consolidadas.has(key)) {
        const existing = consolidadas.get(key)!;
        existing.valor_total += sub.valor_total;
        existing.quantidade_lancamentos += sub.quantidade_lancamentos;
      } else {
        consolidadas.set(key, { ...sub });
      }
    });

    // Ordenar por nome de categoria
    const resultado = Array.from(consolidadas.values())
      .sort((a, b) => a.categoria_nome.localeCompare(b.categoria_nome));

    // Log detalhado da consolidação
    if (resultado.length > 0) {
      console.log('Subcategorias consolidadas:', resultado.map(r => ({
        nome: r.categoria_nome,
        id: r.categoria_id.substring(0, 8),
        valor: r.valor_total.toFixed(2),
        qtd: r.quantidade_lancamentos
      })));
    }

    return resultado;
  };

  const getTotalReceitas = () => {
    return groupedData
      .filter(group => group.tipo === 'receita')
      .reduce((sum, group) => sum + group.total, 0);
  };

  const getTotalDespesas = () => {
    return groupedData
      .filter(group => group.tipo === 'despesa')
      .reduce((sum, group) => sum + Math.abs(group.total), 0);
  };

  const getLucroLiquido = () => {
    // CORREÇÃO: Como despesas vêm negativas do banco, somamos para obter receitas + (-despesas)
    return groupedData.reduce((sum, group) => {
      return sum + group.total; // receitas positivas + despesas negativas = lucro correto
    }, 0);
  };

  const getMargemLiquida = () => {
    const receitas = getTotalReceitas();
    return receitas > 0 ? (getLucroLiquido() / receitas) * 100 : 0;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getMonthName = (month: number) => {
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return months[month - 1];
  };

  const exportLancamentosNaoClassificados = async () => {
    try {
      const lancamentos = await fetchLancamentosDetalhados();
      const naoClassificados = lancamentos.filter(l => !l.categoria_id);

      if (naoClassificados.length === 0) {
        alert('Não há lançamentos não classificados no período selecionado');
        return;
      }

      console.log('Exportando lançamentos não classificados:', naoClassificados.length);

      const headers = [
        'Data',
        'Tipo',
        'Descrição',
        'Centro de Custo',
        'Valor',
        'Origem',
        'ID'
      ];

      const data = naoClassificados.map(l => [
        dayjs(l.data).format('DD/MM/YYYY'),
        l.tipo === 'entrada' ? 'RECEITA' : 'DESPESA',
        l.descricao || '',
        l.centro_custo || 'Sem Centro de Custo',
        l.valor,
        l.origem || '',
        l.id
      ]);

      // Adicionar totais
      const totalReceitas = naoClassificados
        .filter(l => l.tipo === 'entrada')
        .reduce((sum, l) => sum + (l.valor || 0), 0);

      const totalDespesas = naoClassificados
        .filter(l => l.tipo === 'saida')
        .reduce((sum, l) => sum + Math.abs(l.valor || 0), 0);

      data.push([]);
      data.push(['RESUMO', '', '', '', '', '', '']);
      data.push(['Total Receitas Não Classificadas', '', '', '', totalReceitas, '', '']);
      data.push(['Total Despesas Não Classificadas', '', '', '', totalDespesas, '', '']);
      data.push(['Quantidade Total', '', '', '', naoClassificados.length, '', '']);

      exportToExcel(
        data,
        `lancamentos-nao-classificados-${selectedYear}${selectedMonth !== 'all' ? `-${String(selectedMonth).padStart(2, '0')}` : ''}`,
        headers
      );

      alert(`Exportados ${naoClassificados.length} lançamentos não classificados`);
    } catch (err) {
      console.error('Error exporting unclassified transactions:', err);
      alert('Erro ao exportar lançamentos não classificados');
    }
  };

  const exportDRE = () => {
    if (groupedData.length === 0) {
      alert('Não há dados para exportar');
      return;
    }

    const headers = [
      'Tipo',
      'Categoria Principal',
      'Subcategoria',
      'Qtd Lançamentos',
      'Valor',
      'Percentual'
    ];

    const data: any[] = [];

    // Adicionar receitas
    groupedData.filter(group => group.tipo === 'receita').forEach(group => {
      data.push([
        'RECEITA',
        group.categoria_raiz_nome,
        '',
        '',
        group.total,
        getTotalReceitas() > 0 ? ((group.total / getTotalReceitas()) * 100).toFixed(1) + '%' : '0%'
      ]);

      const subcategoriasConsolidadas = consolidarSubcategorias(group.subcategorias);
      subcategoriasConsolidadas.forEach(sub => {
        data.push([
          '',
          '',
          sub.categoria_nome,
          sub.quantidade_lancamentos,
          sub.valor_total,
          getTotalReceitas() > 0 ? ((sub.valor_total / getTotalReceitas()) * 100).toFixed(1) + '%' : '0%'
        ]);
      });
    });

    // Adicionar despesas
    groupedData.filter(group => group.tipo === 'despesa').forEach(group => {
      data.push([
        'DESPESA',
        group.categoria_raiz_nome,
        '',
        '',
        Math.abs(group.total),
        getTotalDespesas() > 0 ? ((Math.abs(group.total) / getTotalDespesas()) * 100).toFixed(1) + '%' : '0%'
      ]);

      const subcategoriasConsolidadas = consolidarSubcategorias(group.subcategorias);
      subcategoriasConsolidadas.forEach(sub => {
        data.push([
          '',
          '',
          sub.categoria_nome,
          sub.quantidade_lancamentos,
          Math.abs(sub.valor_total),
          getTotalDespesas() > 0 ? ((Math.abs(sub.valor_total) / getTotalDespesas()) * 100).toFixed(1) + '%' : '0%'
        ]);
      });
    });

    // Adicionar totais
    data.push(['', '', '', '', '', '']);
    data.push(['TOTAL RECEITAS', '', '', '', getTotalReceitas(), '100%']);
    data.push(['TOTAL DESPESAS', '', '', '', getTotalDespesas(), '100%']);
    data.push(['LUCRO LÍQUIDO', '', '', '', getLucroLiquido(), formatPercentage(getMargemLiquida())]);

    const fileName = `dre-${selectedYear}${selectedMonth !== 'all' ? `-${String(selectedMonth).padStart(2, '0')}` : ''}-${dayjs().format('YYYY-MM-DD')}`;
    exportToExcel(data, headers, fileName);
  };

  const fetchLancamentosDetalhados = async () => {
    try {
      const startDate = `${selectedYear}-01-01`;
      const endDate = `${selectedYear}-12-31`;

      // BUSCAR TODOS OS LANÇAMENTOS, incluindo os sem categoria
      let query = supabase
        .from('fluxo_caixa')
        .select('*')
        .neq('origem', 'transferencia')
        .gte('data', startDate)
        .lte('data', endDate);

      if (selectedMonth !== 'all') {
        const monthStr = String(selectedMonth).padStart(2, '0');
        const monthStart = `${selectedYear}-${monthStr}-01`;
        // selectedMonth é 1-12 (janeiro=1, fevereiro=2, etc)
        // new Date(year, month, 0) retorna último dia do mês anterior
        // Então new Date(2026, 2, 0) = último dia de fevereiro (28 ou 29)
        const lastDay = new Date(Number(selectedYear), Number(selectedMonth), 0).getDate();
        const monthEnd = `${selectedYear}-${monthStr}-${String(lastDay).padStart(2, '0')}`;

        query = query
          .gte('data', monthStart)
          .lte('data', monthEnd);
      }

      if (selectedCostCenter !== 'all') {
        query = query.eq('centro_custo_id', selectedCostCenter);
      }

      const { data: lancamentos, error } = await query
        .order('data', { ascending: true })
        .limit(50000); // Aumentar limite para garantir que todos os lançamentos sejam retornados

      if (error) {
        console.error('Error fetching transactions:', error);
        throw error;
      }

      // Buscar categorias e centros de custo separadamente
      const { data: categorias } = await supabase
        .from('categorias_financeiras')
        .select('id, nome, tipo, categoria_pai_id');

      const { data: centrosCusto } = await supabase
        .from('centros_custo')
        .select('id, nome');

      // Criar mapas para lookup rápido
      const categoriasMap = new Map((categorias || []).map(c => [c.id, c]));
      const centrosCustoMap = new Map((centrosCusto || []).map(cc => [cc.id, cc]));

      // Transformar dados para facilitar acesso
      const lancamentosTransformados = (lancamentos || []).map(l => {
        const categoria = l.categoria_id ? categoriasMap.get(l.categoria_id) : null;
        const centroCusto = l.centro_custo_id ? centrosCustoMap.get(l.centro_custo_id) : null;

        return {
          ...l,
          categoria_nome: categoria?.nome || null,
          categoria_pai_id: categoria?.categoria_pai_id || null,
          centro_custo: centroCusto?.nome || null
        };
      });

      console.log('Lançamentos detalhados:', lancamentosTransformados.length);
      console.log('  - Com categoria:', lancamentosTransformados.filter(l => l.categoria_id).length);
      console.log('  - SEM categoria:', lancamentosTransformados.filter(l => !l.categoria_id).length);

      // Log específico para Receita Venda de Salão
      const vendasSalao = lancamentosTransformados.filter(l => l.categoria_nome === 'Receita Venda de Salão');
      console.log('🔍 Receita Venda de Salão:', {
        total: vendasSalao.length,
        soma: vendasSalao.reduce((s, l) => s + Math.abs(l.valor), 0).toFixed(2),
        maiores: vendasSalao.filter(l => Math.abs(l.valor) > 60000).map(l => ({
          data: l.data,
          valor: l.valor,
          descricao: l.descricao?.substring(0, 30)
        }))
      });

      // Log de lançamentos grandes para debug
      const lancamentosGrandesTotal = lancamentosTransformados.filter(l => Math.abs(l.valor) > 60000);
      if (lancamentosGrandesTotal.length > 0) {
        console.log('💰 Total de lançamentos > 60.000:', lancamentosGrandesTotal.length);
        lancamentosGrandesTotal.forEach(l => {
          console.log(`  ${l.data} - ${l.descricao?.substring(0, 40)} = R$ ${l.valor} [${l.categoria_nome}]`);
        });
      }

      return lancamentosTransformados;
    } catch (err) {
      console.error('Error fetching detailed transactions:', err);
      alert('Erro ao buscar lançamentos detalhados: ' + err);
      return [];
    }
  };

  // DRE Sintético - Apenas categorias raiz
  const generateDRESintetico = () => {
    if (groupedData.length === 0) {
      alert('Não há dados para gerar relatório');
      return;
    }

    const reportGenerator = new ReportGenerator();

    let currentY = reportGenerator.addHeader(
      'DRE SINTÉTICO',
      `Ano: ${selectedYear}${selectedMonth !== 'all' ? ` - ${getMonthName(selectedMonth as number)}` : ''}`
    );

    // Resumo Executivo
    const resumo = [
      ['Total de Receitas', formatCurrency(getTotalReceitas())],
      ['Total de Despesas', formatCurrency(getTotalDespesas())],
      ['Lucro Líquido', formatCurrency(getLucroLiquido())],
      ['Margem Líquida', formatPercentage(getMargemLiquida())]
    ];

    currentY = reportGenerator.addSection('Resumo Executivo', [], currentY);
    currentY = reportGenerator.addTable(['Indicador', 'Valor'], resumo, currentY);

    // DRE Sintético
    const headers = ['Categoria', 'Valor', '%'];
    const data: any[] = [];

    // Receitas
    data.push(['RECEITAS', '', '']);
    groupedData.filter(group => group.tipo === 'receita').forEach(group => {
      data.push([
        group.categoria_raiz_nome,
        formatCurrency(group.total),
        getTotalReceitas() > 0 ? ((group.total / getTotalReceitas()) * 100).toFixed(1) + '%' : '0%'
      ]);
    });
    data.push(['TOTAL RECEITAS', formatCurrency(getTotalReceitas()), '100%']);
    data.push(['', '', '']);

    // Despesas
    data.push(['DESPESAS', '', '']);
    groupedData.filter(group => group.tipo === 'despesa').forEach(group => {
      data.push([
        group.categoria_raiz_nome,
        formatCurrency(Math.abs(group.total)),
        getTotalDespesas() > 0 ? ((Math.abs(group.total) / getTotalDespesas()) * 100).toFixed(1) + '%' : '0%'
      ]);
    });
    data.push(['TOTAL DESPESAS', formatCurrency(getTotalDespesas()), '100%']);
    data.push(['', '', '']);

    // Resultado
    data.push(['RESULTADO', '', '']);
    data.push(['LUCRO LÍQUIDO', formatCurrency(getLucroLiquido()), formatPercentage(getMargemLiquida())]);

    currentY = reportGenerator.addSection('Demonstrativo', [], currentY + 10);
    reportGenerator.addTable(headers, data, currentY);

    reportGenerator.save(`dre-sintetico-${selectedYear}${selectedMonth !== 'all' ? `-${String(selectedMonth).padStart(2, '0')}` : ''}.pdf`);
  };

  // DRE Analítico - Categorias e subcategorias
  const generateDREAnalitico = () => {
    if (groupedData.length === 0) {
      alert('Não há dados para gerar relatório');
      return;
    }

    const reportGenerator = new ReportGenerator();

    let currentY = reportGenerator.addHeader(
      'DRE ANALÍTICO',
      `Ano: ${selectedYear}${selectedMonth !== 'all' ? ` - ${getMonthName(selectedMonth as number)}` : ''}`
    );

    // Resumo Executivo
    const resumo = [
      ['Total de Receitas', formatCurrency(getTotalReceitas())],
      ['Total de Despesas', formatCurrency(getTotalDespesas())],
      ['Lucro Líquido', formatCurrency(getLucroLiquido())],
      ['Margem Líquida', formatPercentage(getMargemLiquida())]
    ];

    currentY = reportGenerator.addSection('Resumo Executivo', [], currentY);
    currentY = reportGenerator.addTable(['Indicador', 'Valor'], resumo, currentY);

    // DRE Analítico com subcategorias
    const headers = ['Categoria / Subcategoria', 'Qtd', 'Valor', '%'];
    const data: any[] = [];

    // Receitas
    data.push(['=== RECEITAS ===', '', '', '']);
    groupedData.filter(group => group.tipo === 'receita').forEach(group => {
      data.push([
        group.categoria_raiz_nome.toUpperCase(),
        '',
        formatCurrency(group.total),
        getTotalReceitas() > 0 ? ((group.total / getTotalReceitas()) * 100).toFixed(1) + '%' : '0%'
      ]);

      const subcategoriasConsolidadas = consolidarSubcategorias(group.subcategorias);
      subcategoriasConsolidadas.forEach(sub => {
        data.push([
          '  ↳ ' + sub.categoria_nome,
          sub.quantidade_lancamentos.toString(),
          formatCurrency(sub.valor_total),
          getTotalReceitas() > 0 ? ((sub.valor_total / getTotalReceitas()) * 100).toFixed(1) + '%' : '0%'
        ]);
      });
    });
    data.push(['TOTAL RECEITAS', '', formatCurrency(getTotalReceitas()), '100%']);
    data.push(['', '', '', '']);

    // Despesas
    data.push(['=== DESPESAS ===', '', '', '']);
    groupedData.filter(group => group.tipo === 'despesa').forEach(group => {
      data.push([
        group.categoria_raiz_nome.toUpperCase(),
        '',
        formatCurrency(Math.abs(group.total)),
        getTotalDespesas() > 0 ? ((Math.abs(group.total) / getTotalDespesas()) * 100).toFixed(1) + '%' : '0%'
      ]);

      const subcategoriasConsolidadas = consolidarSubcategorias(group.subcategorias);
      subcategoriasConsolidadas.forEach(sub => {
        data.push([
          '  ↳ ' + sub.categoria_nome,
          sub.quantidade_lancamentos.toString(),
          formatCurrency(Math.abs(sub.valor_total)),
          getTotalDespesas() > 0 ? ((Math.abs(sub.valor_total) / getTotalDespesas()) * 100).toFixed(1) + '%' : '0%'
        ]);
      });
    });
    data.push(['TOTAL DESPESAS', '', formatCurrency(getTotalDespesas()), '100%']);
    data.push(['', '', '', '']);

    // Resultado
    data.push(['=== RESULTADO ===', '', '', '']);
    data.push(['LUCRO LÍQUIDO', '', formatCurrency(getLucroLiquido()), formatPercentage(getMargemLiquida())]);

    currentY = reportGenerator.addSection('Demonstrativo Analítico', [], currentY + 10);
    reportGenerator.addTable(headers, data, currentY);

    reportGenerator.save(`dre-analitico-${selectedYear}${selectedMonth !== 'all' ? `-${String(selectedMonth).padStart(2, '0')}` : ''}.pdf`);
  };

  // DRE Detalhado - Com lançamentos
  const generateDREDetalhado = async () => {
    if (groupedData.length === 0) {
      alert('Não há dados para gerar relatório');
      return;
    }

    console.log('Iniciando geração do DRE Detalhado...');

    const lancamentos = await fetchLancamentosDetalhados();
    console.log('Total de lançamentos:', lancamentos.length);

    if (lancamentos.length === 0) {
      alert('Não há lançamentos para gerar o relatório detalhado');
      return;
    }

    const reportGenerator = new ReportGenerator();

    let currentY = reportGenerator.addHeader(
      'DRE DETALHADO',
      `Ano: ${selectedYear}${selectedMonth !== 'all' ? ` - ${getMonthName(selectedMonth as number)}` : ''}`
    );

    // Resumo Executivo
    const resumo = [
      ['Total de Receitas', formatCurrency(getTotalReceitas())],
      ['Total de Despesas', formatCurrency(getTotalDespesas())],
      ['Lucro Líquido', formatCurrency(getLucroLiquido())],
      ['Margem Líquida', formatPercentage(getMargemLiquida())]
    ];

    currentY = reportGenerator.addSection('Resumo Executivo', [], currentY);
    currentY = reportGenerator.addTable(['Indicador', 'Valor'], resumo, currentY);

    // Processar cada categoria raiz
    groupedData.forEach((group, index) => {
      // Nova página para cada categoria (exceto a primeira)
      if (index > 0) {
        reportGenerator.pdf.addPage();
        currentY = 20;
      }

      // Cabeçalho da categoria raiz
      currentY = reportGenerator.addSection(
        `${group.tipo === 'receita' ? 'RECEITA' : 'DESPESA'}: ${group.categoria_raiz_nome}`,
        [`Total: ${formatCurrency(Math.abs(group.total))}`],
        currentY + 10
      );

      // Consolidar subcategorias por categoria_id para evitar duplicações
      const subcategoriasConsolidadas = consolidarSubcategorias(group.subcategorias);

      console.log(`Categoria ${group.categoria_raiz_nome}: ${subcategoriasConsolidadas.length} subcategorias consolidadas`);

      // Se não há subcategorias, pode ser uma categoria raiz com lançamentos diretos
      if (subcategoriasConsolidadas.length === 0) {
        // Buscar lançamentos diretos na categoria raiz
        const lancamentosRaiz = lancamentos.filter(l => {
          // Precisamos buscar pela categoria raiz através dos dados do DRE
          const categoriaInfo = dreData.find(d =>
            d.categoria_raiz_id === group.categoria_raiz_id &&
            d.nivel === 0 &&
            d.categoria_id === l.categoria_id
          );
          return categoriaInfo !== undefined;
        });

        if (lancamentosRaiz.length > 0) {
          const pageHeight = reportGenerator.pdf.internal.pageSize.getHeight();
          const estimatedHeight = 10 + (lancamentosRaiz.length * 8);

          if (currentY + estimatedHeight > pageHeight - 30) {
            reportGenerator.pdf.addPage();
            currentY = 20;
          }

          const totalRaiz = lancamentosRaiz.reduce((sum, l) => sum + Math.abs(l.valor || 0), 0);

          currentY = reportGenerator.addSection(
            'Lançamentos Diretos',
            [`Subtotal: ${formatCurrency(totalRaiz)} | ${lancamentosRaiz.length} lançamento(s)`],
            currentY + 8
          );

          const lancamentosData = lancamentosRaiz.map(l => [
            dayjs(l.data).format('DD/MM/YYYY'),
            (l.descricao || '').substring(0, 50),
            l.centro_custo || '-',
            formatCurrency(Math.abs(l.valor || 0))
          ]);

          currentY = reportGenerator.addTable(
            ['Data', 'Descrição', 'Centro Custo', 'Valor'],
            lancamentosData,
            currentY
          );
        }
      }

      // Processar cada subcategoria consolidada
      subcategoriasConsolidadas.forEach((subConsolidada) => {
        let lancamentosCategoria: any[] = [];

        // Verificar se é categoria de não classificados
        if (subConsolidada.categoria_nome === 'Lançamentos Não Classificados') {
          // Para não classificados, buscar lançamentos sem categoria do tipo correto
          console.log(`\n🔍 Buscando lançamentos NÃO CLASSIFICADOS (${group.tipo})...`);
          console.log(`Total de lançamentos disponíveis: ${lancamentos.length}`);
          console.log(`Lançamentos sem categoria_id: ${lancamentos.filter(l => !l.categoria_id).length}`);

          lancamentosCategoria = lancamentos.filter(l => {
            // Deve não ter categoria
            if (l.categoria_id !== null && l.categoria_id !== undefined) return false;

            // Verificar o tipo correto
            const tipoLancamento = l.tipo === 'entrada' ? 'receita' : 'despesa';
            const match = tipoLancamento === group.tipo;

            if (match) {
              console.log(`  ✓ ${l.data} - ${l.descricao?.substring(0, 40)} - R$ ${l.valor}`);
            }

            return match;
          });

          console.log(`✅ Total encontrado: ${lancamentosCategoria.length} lançamentos não classificados`);
          console.log(`Soma: R$ ${lancamentosCategoria.reduce((sum, l) => sum + Math.abs(l.valor || 0), 0).toFixed(2)}`);
        } else if (subConsolidada.categoria_nome === 'Outros') {
          // Para "Outros", buscar lançamentos diretos na categoria raiz
          console.log(`\n🔍 Buscando lançamentos "OUTROS" da raiz ${group.categoria_raiz_nome}...`);
          console.log(`  categoria_raiz_id: ${group.categoria_raiz_id}`);

          lancamentosCategoria = lancamentos.filter(l => {
            if (!l.categoria_id) return false;
            if (l.categoria_pai_id !== null) return false;
            const match = l.categoria_id === group.categoria_raiz_id;
            if (match) {
              console.log(`  ✓ ${l.data} - ${l.descricao?.substring(0, 40)} - R$ ${l.valor}`);
            }
            return match;
          });

          console.log(`✅ Total encontrado: ${lancamentosCategoria.length} lançamentos diretos na raiz`);
          console.log(`Soma: R$ ${lancamentosCategoria.reduce((sum, l) => sum + Math.abs(l.valor || 0), 0).toFixed(2)}`);
        } else {
          // Para categorias normais, buscar por categoria_id (todos os centros de custo)
          lancamentosCategoria = lancamentos.filter(l => {
            return l.categoria_id === subConsolidada.categoria_id;
          });

          // Log para debug de lançamentos grandes
          const lancamentosGrandes = lancamentosCategoria.filter(l => Math.abs(l.valor) > 60000);
          if (lancamentosGrandes.length > 0) {
            console.log(`💰 Lançamentos grandes em ${subConsolidada.categoria_nome}:`, lancamentosGrandes.map(l => ({
              data: l.data,
              valor: l.valor,
              descricao: l.descricao?.substring(0, 50)
            })));
          }
        }

        // Calcular soma aplicando o sinal correto baseado no tipo
        // Para receitas: valores positivos
        // Para despesas: valores negativos (como a view retorna)
        const somaLancamentos = lancamentosCategoria.reduce((sum, l) => {
          if (group.tipo === 'receita') {
            return sum + Math.abs(l.valor || 0);
          } else {
            return sum + Math.abs(l.valor || 0);
          }
        }, 0);

        // A view retorna valores negativos para despesas, então comparamos valores absolutos
        const diferenca = Math.abs(somaLancamentos - Math.abs(subConsolidada.valor_total));

        console.log(`\n==== ${subConsolidada.categoria_nome} ====`);
        console.log(`  Valor esperado (view): R$ ${Math.abs(subConsolidada.valor_total).toFixed(2)}`);
        console.log(`  Soma lançamentos: R$ ${somaLancamentos.toFixed(2)}`);
        console.log(`  Diferença: R$ ${diferenca.toFixed(2)} ${diferenca > 1 ? '⚠️' : '✓'}`);
        console.log(`  Qtd esperada: ${subConsolidada.quantidade_lancamentos} | Qtd encontrada: ${lancamentosCategoria.length}`);

        if (lancamentosCategoria.length > 0) {
          // Verificar se precisa de nova página
          const pageHeight = reportGenerator.pdf.internal.pageSize.getHeight();
          const estimatedHeight = 10 + (lancamentosCategoria.length * 8);

          if (currentY + estimatedHeight > pageHeight - 30) {
            reportGenerator.pdf.addPage();
            currentY = 20;
          }

          // Título da seção
          const nomeSeccao = subConsolidada.categoria_nome;

          // Subtítulo simples sem avisos de diferença
          const subtitulo = `Subtotal: ${formatCurrency(Math.abs(subConsolidada.valor_total))} | ${subConsolidada.quantidade_lancamentos} lançamento(s)`;

          currentY = reportGenerator.addSection(
            nomeSeccao,
            [subtitulo],
            currentY + 8
          );

          // Ordenar por data para facilitar verificação
          const lancamentosOrdenados = [...lancamentosCategoria].sort((a, b) =>
            new Date(a.data).getTime() - new Date(b.data).getTime()
          );

          const lancamentosData = lancamentosOrdenados.map(l => [
            dayjs(l.data).format('DD/MM/YYYY'),
            (l.descricao || '').substring(0, 50),
            l.centro_custo || '-',
            formatCurrency(Math.abs(l.valor || 0))
          ]);

          console.log(`📄 Adicionando ${lancamentosData.length} lançamentos ao PDF`);

          currentY = reportGenerator.addTable(
            ['Data', 'Descrição', 'Centro Custo', 'Valor'],
            lancamentosData,
            currentY
          );

          // Adicionar nota se houver discrepância (removido - não é mais necessário)
        } else if (Math.abs(subConsolidada.valor_total) > 1) {
          // Se não há lançamentos mas há valor na view, mostrar aviso
          console.warn(`⚠️ ${subConsolidada.categoria_nome}: R$ ${Math.abs(subConsolidada.valor_total).toFixed(2)} na view mas ZERO lançamentos encontrados!`);

          const pageHeight = reportGenerator.pdf.internal.pageSize.getHeight();
          if (currentY + 20 > pageHeight - 30) {
            reportGenerator.pdf.addPage();
            currentY = 20;
          }

          currentY = reportGenerator.addSection(
            subConsolidada.categoria_nome,
            [`⚠️ Subtotal: ${formatCurrency(Math.abs(subConsolidada.valor_total))} | ${subConsolidada.quantidade_lancamentos} lançamento(s) - LANÇAMENTOS NÃO ENCONTRADOS`],
            currentY + 8
          );

          reportGenerator.pdf.setFontSize(8);
          reportGenerator.pdf.setTextColor(180, 0, 0);
          reportGenerator.pdf.text(
            'Esta categoria tem valor no resumo mas os lançamentos não foram encontrados. Possíveis causas:',
            15,
            currentY + 10
          );
          reportGenerator.pdf.text('- Lançamentos em período ou centro de custo diferente do filtro aplicado', 15, currentY + 15);
          reportGenerator.pdf.text('- Categoria deletada/inativa com lançamentos órfãos', 15, currentY + 20);
          reportGenerator.pdf.setTextColor(0, 0, 0);
          reportGenerator.pdf.setFontSize(10);
          currentY += 30;
        }
      });
    });

    // Adicionar rodapés em todas as páginas
    const totalPages = reportGenerator.pdf.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      reportGenerator.pdf.setPage(i);
      reportGenerator.addFooter();
    }

    console.log('Salvando PDF...');
    reportGenerator.save(`dre-detalhado-${selectedYear}${selectedMonth !== 'all' ? `-${String(selectedMonth).padStart(2, '0')}` : ''}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-white">
          Demonstrativo de Resultado do Exercício (DRE)
        </h3>
        <div className="flex space-x-2">
          <button
            onClick={exportDRE}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-white/80 hover:bg-gray-50 flex items-center transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            Excel Completo
          </button>

          <button
            onClick={exportLancamentosNaoClassificados}
            className="px-4 py-2 bg-amber-50 border border-amber-300 rounded-lg text-amber-700 hover:bg-amber-100 flex items-center transition-colors"
            title="Exportar apenas lançamentos sem categoria"
          >
            <Download className="w-4 h-4 mr-2" />
            Não Classificados
          </button>

          <button
            onClick={() => setShowCategorizarModal(true)}
            className="px-4 py-2 bg-green-50 border border-green-300 rounded-lg text-green-700 hover:bg-green-100 flex items-center transition-colors"
            title="Classificar lançamentos sem categoria"
          >
            <Tag className="w-4 h-4 mr-2" />
            Classificar
          </button>

          <button
            onClick={() => setShowRecategorizarModal(true)}
            className="px-4 py-2 bg-orange-50 border border-orange-300 rounded-lg text-orange-700 hover:bg-orange-100 flex items-center transition-colors"
            title="Corrigir lançamentos em categorias PAI"
          >
            <Tag className="w-4 h-4 mr-2" />
            Corrigir Categorias
          </button>

          <Menu as="div" className="relative inline-block text-left">
            <Menu.Button className="px-4 py-2 bg-[#7D1F2C] text-white rounded-lg hover:bg-[#6a1a25] flex items-center transition-all hover:shadow-md">
              <FileText className="w-4 h-4 mr-2" />
              Gerar PDF
              <ChevronDown className="w-4 h-4 ml-2" />
            </Menu.Button>

            <Menu.Items className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-xl border border-gray-200 z-50 divide-y divide-gray-100 overflow-hidden">
              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={generateDRESintetico}
                    className={`w-full text-left px-4 py-3 flex items-start transition-colors ${
                      active ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex-shrink-0 mr-3 mt-0.5">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <FileText className="w-4 h-4 text-blue-600" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-white">DRE Sintético</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        Visão resumida com apenas categorias principais
                      </div>
                    </div>
                  </button>
                )}
              </Menu.Item>

              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={generateDREAnalitico}
                    className={`w-full text-left px-4 py-3 flex items-start transition-colors ${
                      active ? 'bg-green-50' : ''
                    }`}
                  >
                    <div className="flex-shrink-0 mr-3 mt-0.5">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <FileText className="w-4 h-4 text-green-600" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-white">DRE Analítico</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        Categorias com subcategorias e totalizações
                      </div>
                    </div>
                  </button>
                )}
              </Menu.Item>

              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={generateDREDetalhado}
                    className={`w-full text-left px-4 py-3 flex items-start transition-colors ${
                      active ? 'bg-red-50' : ''
                    }`}
                  >
                    <div className="flex-shrink-0 mr-3 mt-0.5">
                      <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                        <FileText className="w-4 h-4 text-red-600" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-white">DRE Detalhado</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        Relatório completo com todos os lançamentos por categoria
                      </div>
                    </div>
                  </button>
                )}
              </Menu.Item>
            </Menu.Items>
          </Menu>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">
              Ano
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">
              Mês
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
            >
              <option value="all">Todos os meses</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                <option key={month} value={month}>
                  {getMonthName(month)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">
              Centro de Custo
            </label>
            <select
              value={selectedCostCenter}
              onChange={(e) => setSelectedCostCenter(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#7D1F2C] focus:ring focus:ring-[#7D1F2C] focus:ring-opacity-50"
            >
              <option value="all">Todos os centros</option>
              {costCenters.map(center => (
                <option key={center.id} value={center.id}>
                  {center.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={fetchDREData}
              className="w-full px-4 py-2 bg-[#7D1F2C] text-white rounded-md hover:bg-[#6a1a25]"
            >
              <Filter className="w-4 h-4 inline mr-2" />
              Filtrar
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <TrendingUp className="w-8 h-8 text-green-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-500">Total Receitas</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(getTotalReceitas())}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <TrendingDown className="w-8 h-8 text-red-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-500">Total Despesas</p>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(getTotalDespesas())}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <BarChart3 className={`w-8 h-8 mr-3 ${getLucroLiquido() >= 0 ? 'text-green-600' : 'text-red-600'}`} />
            <div>
              <p className="text-sm font-medium text-gray-500">Lucro Líquido</p>
              <p className={`text-2xl font-bold ${getLucroLiquido() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(getLucroLiquido())}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <FileText className={`w-8 h-8 mr-3 ${getMargemLiquida() >= 0 ? 'text-green-600' : 'text-red-600'}`} />
            <div>
              <p className="text-sm font-medium text-gray-500">Margem Líquida</p>
              <p className={`text-2xl font-bold ${getMargemLiquida() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatPercentage(getMargemLiquida())}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* DRE Table */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#7D1F2C]"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6">
            <h4 className="text-lg font-medium text-white mb-4">
              Demonstrativo Detalhado
            </h4>
            
            {groupedData.length > 0 ? (
              <div className="space-y-6">
                {/* Receitas */}
                <div>
                  <h5 className="text-md font-medium text-green-700 mb-3 flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2" />
                    RECEITAS
                  </h5>
                  {groupedData
                    .filter(group => group.tipo === 'receita')
                    .map(group => {
                      const subcategoriasConsolidadas = consolidarSubcategorias(group.subcategorias);
                      return (
                        <div key={group.categoria_raiz_id} className="mb-4">
                          <div className="flex justify-between items-center py-2 px-4 bg-green-50 border-l-4 border-green-500">
                            <span className="font-bold text-white uppercase text-sm">
                              {group.categoria_raiz_nome}
                            </span>
                            <span className="font-bold text-green-700 text-lg">
                              {formatCurrency(group.total)}
                            </span>
                          </div>
                          {subcategoriasConsolidadas.length > 0 && (
                            <div className="ml-4 mt-1">
                              {subcategoriasConsolidadas.map(sub => (
                                <div key={sub.categoria_id} className="flex justify-between items-center py-1.5 px-4 border-l-2 border-gray-200 hover:bg-gray-50">
                                  <span className="text-white/80 text-sm">
                                    ↳ {sub.categoria_nome}
                                  </span>
                                  <div className="flex items-center gap-4">
                                    <span className="text-xs text-gray-500">
                                      {sub.quantidade_lancamentos} lançamento{sub.quantidade_lancamentos !== 1 ? 's' : ''}
                                    </span>
                                    <span className="text-green-600 font-medium">
                                      {formatCurrency(sub.valor_total)}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  <div className="flex justify-between items-center py-3 mt-2 border-t-2 border-green-200 font-bold text-green-700">
                    <span>TOTAL DE RECEITAS</span>
                    <span className="text-xl">{formatCurrency(getTotalReceitas())}</span>
                  </div>
                </div>

                {/* Despesas */}
                <div>
                  <h5 className="text-md font-medium text-red-700 mb-3 flex items-center">
                    <TrendingDown className="w-5 h-5 mr-2" />
                    DESPESAS
                  </h5>
                  {groupedData
                    .filter(group => group.tipo === 'despesa')
                    .map(group => {
                      const subcategoriasConsolidadas = consolidarSubcategorias(group.subcategorias);
                      return (
                        <div key={group.categoria_raiz_id} className="mb-4">
                          <div className="flex justify-between items-center py-2 px-4 bg-red-50 border-l-4 border-red-500">
                            <span className="font-bold text-white uppercase text-sm">
                              {group.categoria_raiz_nome}
                            </span>
                            <span className="font-bold text-red-700 text-lg">
                              {formatCurrency(Math.abs(group.total))}
                            </span>
                          </div>
                          {subcategoriasConsolidadas.length > 0 && (
                            <div className="ml-4 mt-1">
                              {subcategoriasConsolidadas.map(sub => (
                                <div key={sub.categoria_id} className="flex justify-between items-center py-1.5 px-4 border-l-2 border-gray-200 hover:bg-gray-50">
                                  <span className="text-white/80 text-sm">
                                    ↳ {sub.categoria_nome}
                                  </span>
                                  <div className="flex items-center gap-4">
                                    <span className="text-xs text-gray-500">
                                      {sub.quantidade_lancamentos} lançamento{sub.quantidade_lancamentos !== 1 ? 's' : ''}
                                    </span>
                                    <span className="text-red-600 font-medium">
                                      {formatCurrency(Math.abs(sub.valor_total))}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  <div className="flex justify-between items-center py-3 mt-2 border-t-2 border-red-200 font-bold text-red-700">
                    <span>TOTAL DE DESPESAS</span>
                    <span className="text-xl">({formatCurrency(getTotalDespesas())})</span>
                  </div>
                </div>

                {/* Resultado */}
                <div className="border-t-4 border-gray-300 pt-4">
                  <div className={`flex justify-between items-center py-3 font-bold text-lg ${
                    getLucroLiquido() >= 0 ? 'text-green-700' : 'text-red-700'
                  }`}>
                    <span>RESULTADO LÍQUIDO</span>
                    <span>{formatCurrency(getLucroLiquido())}</span>
                  </div>
                  <div className="text-sm text-gray-600 text-right">
                    Margem: {formatPercentage(getMargemLiquida())}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">Nenhum dado encontrado</h3>
                <p className="text-gray-500">
                  Não há dados financeiros para o período selecionado.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Categorização */}
      {showCategorizarModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <div>
                <h3 className="text-xl font-bold text-white">Classificar Lançamentos</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Classifique os lançamentos sem categoria para corrigir o DRE
                </p>
              </div>
              <button
                onClick={() => {
                  setShowCategorizarModal(false);
                  fetchDREData();
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <CategorizarLancamentos />
            </div>
          </div>
        </div>
      )}

      {/* Modal de Recategorização */}
      {showRecategorizarModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <div>
                <h3 className="text-xl font-bold text-white">Corrigir Categorias PAI</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Mova lançamentos de categorias PAI para subcategorias corretas
                </p>
              </div>
              <button
                onClick={() => {
                  setShowRecategorizarModal(false);
                  fetchDREData();
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <RecategorizarLancamentos />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DREReport;