import React, { useState, useEffect } from 'react';
import { Plus, FileText, Printer, Search, Filter, X, Trash2, CheckCircle, XCircle, Eye, Download, QrCode } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { gerarImpressaoTermicaRequisicao } from '../../utils/impressaoTermica';
import { SearchableSelect } from '../common/SearchableSelect';
import jsPDF from 'jspdf';

interface Estoque {
  id: string;
  nome: string;
  tipo: string;
}

interface ItemEstoque {
  id: string;
  nome: string;
  unidade_medida: string;
}

interface ItemRequisicao {
  id?: string;
  item_id: string;
  quantidade_solicitada: number;
  observacao?: string;
  itens_estoque?: ItemEstoque;
}

interface Requisicao {
  id: string;
  numero_requisicao: string;
  data_requisicao: string;
  funcionario_nome: string;
  setor: string;
  estoque_origem_id: string;
  estoque_destino_id: string;
  status: 'pendente' | 'aprovado' | 'rejeitado' | 'concluido';
  observacoes?: string;
  whatsapp?: string;
  criado_anonimamente?: boolean;
  estoque_origem?: { nome: string };
  estoque_destino?: { nome: string };
  itens?: ItemRequisicao[];
}

interface ItemDisponivel extends ItemEstoque {
  quantidade_disponivel: number;
}

export default function RequisicoesInternas() {
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [requisicoes, setRequisicoes] = useState<Requisicao[]>([]);
  const [estoques, setEstoques] = useState<Estoque[]>([]);
  const [itensEstoque, setItensEstoque] = useState<ItemEstoque[]>([]);
  const [itensDisponiveis, setItensDisponiveis] = useState<ItemDisponivel[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingImpressao, setLoadingImpressao] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [busca, setBusca] = useState('');
  const [requisicaoDetalhes, setRequisicaoDetalhes] = useState<Requisicao | null>(null);
  const [mostrarDetalhes, setMostrarDetalhes] = useState(false);

  // Form state
  const [funcionarioNome, setFuncionarioNome] = useState('');
  const [setor, setSetor] = useState('');
  const [estoqueOrigemId, setEstoqueOrigemId] = useState('');
  const [estoqueDestinoId, setEstoqueDestinoId] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [itens, setItens] = useState<ItemRequisicao[]>([]);

  // Item atual sendo adicionado
  const [itemSelecionado, setItemSelecionado] = useState('');
  const [quantidadeItem, setQuantidadeItem] = useState('');
  const [observacaoItem, setObservacaoItem] = useState('');

  useEffect(() => {
    carregarDados();
  }, [filtroStatus]);

  useEffect(() => {
    if (estoqueOrigemId) {
      carregarItensDisponiveis();
    } else {
      setItensDisponiveis([]);
    }
  }, [estoqueOrigemId]);

  async function carregarDados() {
    setLoading(true);
    try {
      // Carregar estoques
      const { data: estoquesData } = await supabase
        .from('estoques')
        .select('id, nome, tipo')
        .eq('status', true)
        .order('nome');

      if (estoquesData) setEstoques(estoquesData);

      // Carregar itens de estoque
      const { data: itensData } = await supabase
        .from('itens_estoque')
        .select('id, nome, unidade_medida')
        .eq('status', 'ativo')
        .order('nome');

      if (itensData) setItensEstoque(itensData);

      // Carregar requisições
      let query = supabase
        .from('requisicoes_internas')
        .select(`
          *,
          estoque_origem:estoques!requisicoes_internas_estoque_origem_id_fkey(nome),
          estoque_destino:estoques!requisicoes_internas_estoque_destino_id_fkey(nome)
        `)
        .order('data_requisicao', { ascending: false });

      if (filtroStatus !== 'todos') {
        query = query.eq('status', filtroStatus);
      }

      const { data: requisicoesData } = await query;

      if (requisicoesData) {
        // Carregar itens de cada requisição
        const requisicoesComItens = await Promise.all(
          requisicoesData.map(async (req) => {
            const { data: itensReq } = await supabase
              .from('requisicoes_internas_itens')
              .select(`
                *,
                itens_estoque(id, nome, unidade_medida)
              `)
              .eq('requisicao_id', req.id);

            return {
              ...req,
              itens: itensReq || []
            };
          })
        );

        setRequisicoes(requisicoesComItens);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      alert('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }

  async function carregarItensDisponiveis() {
    if (!estoqueOrigemId) return;

    try {
      // Buscar saldos do estoque de origem
      const { data: saldos, error } = await supabase
        .from('saldos_estoque')
        .select(`
          item_id,
          quantidade_atual,
          itens_estoque!inner(
            id,
            codigo,
            nome,
            unidade_medida,
            custo_medio,
            status
          ),
          estoques!inner(
            id,
            nome
          )
        `)
        .eq('estoque_id', estoqueOrigemId)
        .gt('quantidade_atual', 0);

      if (error) {
        console.error('Erro ao carregar itens disponíveis:', error);
        return;
      }

      if (saldos) {
        const itensComSaldo = saldos.map(saldo => ({
          id: saldo.itens_estoque.id,
          nome: saldo.itens_estoque.nome,
          unidade_medida: saldo.itens_estoque.unidade_medida,
          quantidade_disponivel: saldo.quantidade_atual
        }));

        setItensDisponiveis(itensComSaldo);
      }
    } catch (error) {
      console.error('Erro ao carregar itens disponíveis:', error);
    }
  }

  function adicionarItem() {
    if (!itemSelecionado || !quantidadeItem || parseFloat(quantidadeItem) <= 0) {
      alert('Selecione um item e informe a quantidade');
      return;
    }

    const itemInfo = itensDisponiveis.find(i => i.id === itemSelecionado);
    if (!itemInfo) return;

    const qtdSolicitada = parseFloat(quantidadeItem);

    // Validar se tem quantidade disponível
    if (qtdSolicitada > itemInfo.quantidade_disponivel) {
      alert(`Quantidade indisponível! Disponível: ${itemInfo.quantidade_disponivel} ${itemInfo.unidade_medida}`);
      return;
    }

    const novoItem: ItemRequisicao = {
      item_id: itemSelecionado,
      quantidade_solicitada: qtdSolicitada,
      observacao: observacaoItem || undefined,
      itens_estoque: itemInfo
    };

    setItens([...itens, novoItem]);
    setItemSelecionado('');
    setQuantidadeItem('');
    setObservacaoItem('');
  }

  function removerItem(index: number) {
    setItens(itens.filter((_, i) => i !== index));
  }

  async function salvarRequisicao() {
    if (!funcionarioNome || !setor || !estoqueOrigemId || !estoqueDestinoId || itens.length === 0) {
      alert('Preencha todos os campos obrigatórios e adicione pelo menos um item');
      return;
    }

    setLoading(true);
    try {
      // Criar requisição
      const { data: requisicao, error: reqError } = await supabase
        .from('requisicoes_internas')
        .insert({
          numero_requisicao: '', // Será gerado pelo trigger
          funcionario_nome: funcionarioNome,
          setor: setor,
          estoque_origem_id: estoqueOrigemId,
          estoque_destino_id: estoqueDestinoId,
          observacoes: observacoes || null,
          status: 'pendente'
        })
        .select()
        .single();

      if (reqError) throw reqError;

      // Inserir itens
      const itensParaInserir = itens.map(item => ({
        requisicao_id: requisicao.id,
        item_id: item.item_id,
        quantidade_solicitada: item.quantidade_solicitada,
        observacao: item.observacao || null
      }));

      const { error: itensError } = await supabase
        .from('requisicoes_internas_itens')
        .insert(itensParaInserir);

      if (itensError) throw itensError;

      alert('Requisição criada com sucesso!');
      limparFormulario();
      setMostrarFormulario(false);
      carregarDados();

      // Perguntar se deseja imprimir
      if (confirm('Deseja imprimir a requisição?')) {
        imprimirRequisicao(requisicao.id);
      }
    } catch (error) {
      console.error('Erro ao salvar requisição:', error);
      alert('Erro ao salvar requisição');
    } finally {
      setLoading(false);
    }
  }

  async function visualizarDetalhes(id: string) {
    setLoading(true);
    try {
      const { data: requisicao, error: errorReq } = await supabase
        .from('requisicoes_internas')
        .select(`
          *,
          estoque_origem:estoques!requisicoes_internas_estoque_origem_id_fkey(nome),
          estoque_destino:estoques!requisicoes_internas_estoque_destino_id_fkey(nome)
        `)
        .eq('id', id)
        .maybeSingle();

      if (errorReq || !requisicao) {
        alert('Erro ao buscar requisição');
        return;
      }

      const { data: itensReq, error: errorItens } = await supabase
        .from('requisicoes_internas_itens')
        .select(`
          *,
          itens_estoque(id, nome, unidade_medida)
        `)
        .eq('requisicao_id', id);

      if (errorItens) {
        alert('Erro ao buscar itens da requisição');
        return;
      }

      setRequisicaoDetalhes({
        ...requisicao,
        itens: itensReq || []
      });
      setMostrarDetalhes(true);
    } catch (error) {
      console.error('Erro ao carregar detalhes:', error);
      alert('Erro ao carregar detalhes da requisição');
    } finally {
      setLoading(false);
    }
  }

  async function gerarPDFRequisicao(requisicao: Requisicao) {
    try {
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      let yPos = 20;

      // Cabeçalho
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Ditado Popular - Sistema de Gestão', pageWidth / 2, yPos, { align: 'center' });

      yPos += 10;
      pdf.setFontSize(14);
      pdf.text('Requisição Interna', pageWidth / 2, yPos, { align: 'center' });

      // Linha separadora
      yPos += 5;
      pdf.setLineWidth(0.5);
      pdf.line(20, yPos, pageWidth - 20, yPos);

      // Dados da requisição
      yPos += 10;
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Número: ${requisicao.numero_requisicao}`, 20, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Data: ${new Date(requisicao.data_requisicao).toLocaleDateString('pt-BR')}`, pageWidth - 70, yPos);

      yPos += 7;
      pdf.setFont('helvetica', 'bold');
      pdf.text('Funcionário:', 20, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.text(requisicao.funcionario_nome, 50, yPos);

      yPos += 7;
      pdf.setFont('helvetica', 'bold');
      pdf.text('Setor:', 20, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.text(requisicao.setor, 50, yPos);

      yPos += 7;
      pdf.setFont('helvetica', 'bold');
      pdf.text('De:', 20, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.text(requisicao.estoque_origem?.nome || '-', 50, yPos);

      yPos += 7;
      pdf.setFont('helvetica', 'bold');
      pdf.text('Para:', 20, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.text(requisicao.estoque_destino?.nome || '-', 50, yPos);

      yPos += 7;
      pdf.setFont('helvetica', 'bold');
      pdf.text('Status:', 20, yPos);
      pdf.setFont('helvetica', 'normal');
      const statusLabels: Record<string, string> = {
        pendente: 'Pendente',
        aprovado: 'Aprovado',
        rejeitado: 'Rejeitado',
        concluido: 'Concluído'
      };
      pdf.text(statusLabels[requisicao.status] || requisicao.status, 50, yPos);

      // Tabela de itens
      yPos += 15;
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.text('Itens Requisitados', 20, yPos);

      yPos += 7;
      pdf.setFontSize(9);

      // Cabeçalho da tabela
      pdf.setFillColor(240, 240, 240);
      pdf.rect(20, yPos - 4, pageWidth - 40, 7, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.text('Item', 22, yPos);
      pdf.text('Unidade', 120, yPos);
      pdf.text('Quantidade', 155, yPos);

      yPos += 7;
      pdf.setFont('helvetica', 'normal');

      // Linhas dos itens
      if (requisicao.itens && requisicao.itens.length > 0) {
        requisicao.itens.forEach((item, index) => {
          if (yPos > 270) {
            pdf.addPage();
            yPos = 20;
          }

          // Zebrar linhas
          if (index % 2 === 0) {
            pdf.setFillColor(250, 250, 250);
            pdf.rect(20, yPos - 4, pageWidth - 40, 7, 'F');
          }

          const nomeItem = item.itens_estoque?.nome || 'Item não identificado';
          const nomeFormatado = nomeItem.length > 50 ? nomeItem.substring(0, 47) + '...' : nomeItem;

          pdf.text(nomeFormatado, 22, yPos);
          pdf.text(item.itens_estoque?.unidade_medida || '-', 120, yPos);
          pdf.text(item.quantidade_solicitada.toString(), 155, yPos);

          if (item.observacao) {
            yPos += 5;
            pdf.setFontSize(8);
            pdf.setTextColor(100, 100, 100);
            pdf.text(`Obs: ${item.observacao}`, 22, yPos);
            pdf.setTextColor(0, 0, 0);
            pdf.setFontSize(9);
          }

          yPos += 7;
        });
      } else {
        pdf.text('Nenhum item encontrado', 22, yPos);
        yPos += 7;
      }

      // Observações gerais
      if (requisicao.observacoes) {
        yPos += 10;
        if (yPos > 250) {
          pdf.addPage();
          yPos = 20;
        }

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.text('Observações:', 20, yPos);
        yPos += 7;

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        const obsLines = pdf.splitTextToSize(requisicao.observacoes, pageWidth - 40);
        obsLines.forEach((line: string) => {
          if (yPos > 270) {
            pdf.addPage();
            yPos = 20;
          }
          pdf.text(line, 20, yPos);
          yPos += 5;
        });
      }

      // Rodapé
      const totalPages = (pdf as any).internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text(
          `Gerado em ${new Date().toLocaleString('pt-BR')} - Página ${i} de ${totalPages}`,
          pageWidth / 2,
          pdf.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }

      // Salvar PDF
      pdf.save(`Requisicao_${requisicao.numero_requisicao}.pdf`);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF');
    }
  }

  async function imprimirRequisicao(id: string) {
    setLoadingImpressao(true);
    try {
      const { data: requisicao, error: errorReq } = await supabase
        .from('requisicoes_internas')
        .select(`
          *,
          estoque_origem:estoques!requisicoes_internas_estoque_origem_id_fkey(nome),
          estoque_destino:estoques!requisicoes_internas_estoque_destino_id_fkey(nome)
        `)
        .eq('id', id)
        .maybeSingle();

      if (errorReq) {
        console.error('Erro ao buscar requisição:', errorReq);
        alert('Erro ao buscar requisição');
        return;
      }

      if (!requisicao) {
        alert('Requisição não encontrada');
        return;
      }

      const { data: itensReq, error: errorItens } = await supabase
        .from('requisicoes_internas_itens')
        .select(`
          *,
          itens_estoque(id, nome, unidade_medida)
        `)
        .eq('requisicao_id', id);

      if (errorItens) {
        console.error('Erro ao buscar itens:', errorItens);
        alert('Erro ao buscar itens da requisição');
        return;
      }

      if (!itensReq || itensReq.length === 0) {
        alert('Nenhum item encontrado na requisição');
        return;
      }

      // Aguardar um pouco antes de abrir a janela
      await new Promise(resolve => setTimeout(resolve, 300));

      gerarImpressaoTermicaRequisicao({
        ...requisicao,
        itens: itensReq
      });
    } catch (error) {
      console.error('Erro ao imprimir:', error);
      alert('Erro ao imprimir requisição');
    } finally {
      setLoadingImpressao(false);
    }
  }

  async function concluirTransferencia(id: string) {
    if (!confirm('Confirma a conclusão desta transferência? Isso irá movimentar os itens entre os estoques.')) {
      return;
    }

    setLoading(true);
    try {
      // Buscar requisição
      const { data: requisicao, error: reqError } = await supabase
        .from('requisicoes_internas')
        .select('id, status, numero_requisicao')
        .eq('id', id)
        .maybeSingle();

      if (reqError || !requisicao) {
        alert('Erro ao buscar requisição');
        return;
      }

      if (requisicao.status === 'concluido') {
        alert('Esta requisição já foi concluída');
        return;
      }

      // Apenas atualizar o status para 'concluido'
      // O trigger processar_requisicao_interna cria as movimentações automaticamente
      const { error: updateError } = await supabase
        .from('requisicoes_internas')
        .update({
          status: 'concluido',
          data_conclusao: new Date().toISOString()
        })
        .eq('id', id);

      if (updateError) throw updateError;

      alert('Transferência concluída com sucesso!');
      carregarDados();
    } catch (error) {
      console.error('Erro ao concluir transferência:', error);
      alert('Erro ao concluir transferência');
    } finally {
      setLoading(false);
    }
  }

  function limparFormulario() {
    setFuncionarioNome('');
    setSetor('');
    setEstoqueOrigemId('');
    setEstoqueDestinoId('');
    setObservacoes('');
    setItens([]);
    setItensDisponiveis([]);
    setItemSelecionado('');
    setQuantidadeItem('');
    setObservacaoItem('');
  }

  function getStatusBadge(status: string) {
    const badges = {
      pendente: 'bg-yellow-100 text-yellow-800',
      aprovado: 'bg-green-100 text-green-800',
      rejeitado: 'bg-red-100 text-red-800',
      concluido: 'bg-blue-100 text-blue-800'
    };
    const labels = {
      pendente: 'Pendente',
      aprovado: 'Aprovado',
      rejeitado: 'Rejeitado',
      concluido: 'Concluído'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badges[status as keyof typeof badges]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  }

  const requisicoesFiltradas = requisicoes.filter(req =>
    req.numero_requisicao.toLowerCase().includes(busca.toLowerCase()) ||
    req.funcionario_nome.toLowerCase().includes(busca.toLowerCase()) ||
    req.setor.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Requisições Internas</h2>
          <p className="text-sm text-gray-600 mt-1">Gerencie requisições de transferência entre estoques</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => window.open('/cartaz-requisicao', '_blank')}
            className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
            title="Gerar cartaz com link público para requisições"
          >
            <QrCode className="h-5 w-5" />
            Gerar Cartaz
          </button>
          <button
            onClick={() => setMostrarFormulario(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-5 w-5" />
            Nova Requisição
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por número, funcionário ou setor..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <SearchableSelect
              options={[
                { value: 'todos', label: 'Todos os Status' },
                { value: 'pendente', label: 'Pendente' },
                { value: 'aprovado', label: 'Aprovado' },
                { value: 'rejeitado', label: 'Rejeitado' },
                { value: 'concluido', label: 'Concluído' }
              ]}
              value={filtroStatus}
              onChange={setFiltroStatus}
              placeholder="Todos os Status"
              className="flex-1"
            />
          </div>
        </div>
      </div>

      {/* Lista de Requisições */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Carregando...</div>
        ) : requisicoesFiltradas.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Nenhuma requisição encontrada</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Número</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Funcionário</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Setor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">De → Para</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Itens</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {requisicoesFiltradas.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                      <div className="flex items-center gap-2">
                        {req.numero_requisicao}
                        {req.criado_anonimamente && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full" title="Requisição Pública">
                            Público
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(req.data_requisicao).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      {req.funcionario_nome}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {req.setor}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex flex-col">
                        <span className="text-xs text-gray-400">De: {req.estoque_origem?.nome}</span>
                        <span className="text-xs text-gray-400">Para: {req.estoque_destino?.nome}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {req.itens?.length || 0} itens
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(req.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => visualizarDetalhes(req.id)}
                          disabled={loading}
                          className="text-gray-600 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Ver Detalhes"
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => imprimirRequisicao(req.id)}
                          disabled={loadingImpressao}
                          className="text-blue-600 hover:text-blue-900 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Imprimir"
                        >
                          <Printer className={`h-5 w-5 ${loadingImpressao ? 'animate-pulse' : ''}`} />
                        </button>
                        {req.status === 'pendente' && (
                          <button
                            onClick={() => concluirTransferencia(req.id)}
                            disabled={loading}
                            className="text-green-600 hover:text-green-900 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Concluir Transferência"
                          >
                            <CheckCircle className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Detalhes da Requisição */}
      {mostrarDetalhes && requisicaoDetalhes && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="text-xl font-bold text-white">
                Detalhes da Requisição {requisicaoDetalhes.numero_requisicao}
              </h3>
              <button
                onClick={() => {
                  setMostrarDetalhes(false);
                  setRequisicaoDetalhes(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Informações Gerais */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Data da Requisição</label>
                  <p className="text-white">
                    {new Date(requisicaoDetalhes.data_requisicao).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Status</label>
                  <div>{getStatusBadge(requisicaoDetalhes.status)}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Funcionário</label>
                  <p className="text-white">{requisicaoDetalhes.funcionario_nome}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Setor</label>
                  <p className="text-white">{requisicaoDetalhes.setor}</p>
                </div>
                {requisicaoDetalhes.whatsapp && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">WhatsApp</label>
                    <a
                      href={`https://wa.me/55${requisicaoDetalhes.whatsapp.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-600 hover:text-green-800 font-medium"
                    >
                      {requisicaoDetalhes.whatsapp}
                    </a>
                  </div>
                )}
                {requisicaoDetalhes.criado_anonimamente && (
                  <div className="md:col-span-2">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm text-blue-800">
                        <strong>Requisição Pública:</strong> Esta requisição foi criada via formulário público pelo colaborador.
                      </p>
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Estoque de Origem</label>
                  <p className="text-white">{requisicaoDetalhes.estoque_origem?.nome || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Estoque de Destino</label>
                  <p className="text-white">{requisicaoDetalhes.estoque_destino?.nome || '-'}</p>
                </div>
              </div>

              {/* Observações */}
              {requisicaoDetalhes.observacoes && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Observações</label>
                  <p className="text-white/80 bg-gray-50 p-3 rounded-lg">{requisicaoDetalhes.observacoes}</p>
                </div>
              )}

              {/* Itens Requisitados */}
              <div>
                <h4 className="text-lg font-semibold text-white mb-3">
                  Itens Requisitados ({requisicaoDetalhes.itens?.length || 0})
                </h4>
                {requisicaoDetalhes.itens && requisicaoDetalhes.itens.length > 0 ? (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unidade</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantidade</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Observação</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {requisicaoDetalhes.itens.map((item, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-white">
                              {item.itens_estoque?.nome || 'Item não identificado'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {item.itens_estoque?.unidade_medida || '-'}
                            </td>
                            <td className="px-4 py-3 text-sm font-medium text-white">
                              {item.quantidade_solicitada}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {item.observacao || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">Nenhum item encontrado</p>
                )}
              </div>
            </div>

            {/* Footer com ações */}
            <div className="p-6 border-t border-gray-200 flex justify-between items-center sticky bottom-0 bg-white">
              <button
                onClick={() => {
                  setMostrarDetalhes(false);
                  setRequisicaoDetalhes(null);
                }}
                className="px-4 py-2 border border-gray-300 text-white/80 rounded-lg hover:bg-gray-50"
              >
                Fechar
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => imprimirRequisicao(requisicaoDetalhes.id)}
                  disabled={loadingImpressao}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Printer className={`h-4 w-4 ${loadingImpressao ? 'animate-pulse' : ''}`} />
                  Imprimir
                </button>
                <button
                  onClick={() => gerarPDFRequisicao(requisicaoDetalhes)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <Download className="h-4 w-4" />
                  Baixar PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Nova Requisição */}
      {mostrarFormulario && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
              <h3 className="text-xl font-bold text-white">Nova Requisição Interna</h3>
              <button
                onClick={() => {
                  setMostrarFormulario(false);
                  limparFormulario();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Dados do Solicitante */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">
                    Nome do Funcionário *
                  </label>
                  <input
                    type="text"
                    value={funcionarioNome}
                    onChange={(e) => setFuncionarioNome(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Digite o nome"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">
                    Setor *
                  </label>
                  <input
                    type="text"
                    value={setor}
                    onChange={(e) => setSetor(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Digite o setor"
                  />
                </div>
              </div>

              {/* Estoques */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <SearchableSelect
                    label="Estoque de Origem"
                    options={estoques.map(est => ({ value: est.id, label: est.nome }))}
                    value={estoqueOrigemId}
                    onChange={setEstoqueOrigemId}
                    placeholder="Selecione..."
                    required
                    className="w-full"
                  />
                </div>
                <div>
                  <SearchableSelect
                    label="Estoque de Destino"
                    options={estoques.map(est => ({ value: est.id, label: est.nome }))}
                    value={estoqueDestinoId}
                    onChange={setEstoqueDestinoId}
                    placeholder="Selecione..."
                    required
                    className="w-full"
                  />
                </div>
              </div>

              {/* Adicionar Item */}
              <div className="border-t border-gray-200 pt-4">
                <h4 className="font-medium text-white mb-3">Adicionar Itens</h4>
                {!estoqueOrigemId && (
                  <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                    Selecione o estoque de origem para ver os itens disponíveis
                  </div>
                )}
                {estoqueOrigemId && itensDisponiveis.length > 0 && (
                  <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                    <strong>Importante:</strong> As quantidades exibidas são apenas do estoque de origem selecionado ({estoques.find(e => e.id === estoqueOrigemId)?.nome}). Outros estoques podem ter quantidades diferentes.
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  <div className="md:col-span-5">
                    <SearchableSelect
                      options={itensDisponiveis.map(item => ({
                        value: item.id,
                        label: item.nome,
                        sublabel: `Disponível: ${item.quantidade_disponivel} ${item.unidade_medida}`
                      }))}
                      value={itemSelecionado}
                      onChange={setItemSelecionado}
                      disabled={!estoqueOrigemId || itensDisponiveis.length === 0}
                      placeholder={!estoqueOrigemId
                        ? 'Selecione o estoque de origem primeiro...'
                        : itensDisponiveis.length === 0
                        ? 'Nenhum item disponível neste estoque'
                        : 'Selecione o item...'}
                      emptyMessage="Nenhum item disponível neste estoque"
                      className="w-full"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={quantidadeItem}
                      onChange={(e) => setQuantidadeItem(e.target.value)}
                      placeholder="Qtd"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <input
                      type="text"
                      value={observacaoItem}
                      onChange={(e) => setObservacaoItem(e.target.value)}
                      placeholder="Observação (opcional)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <button
                      onClick={adicionarItem}
                      className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Adicionar
                    </button>
                  </div>
                </div>
              </div>

              {/* Lista de Itens */}
              {itens.length > 0 && (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unidade</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Quantidade</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Observação</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {itens.map((item, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2 text-sm text-white">{item.itens_estoque?.nome}</td>
                          <td className="px-4 py-2 text-sm text-gray-500">{item.itens_estoque?.unidade_medida}</td>
                          <td className="px-4 py-2 text-sm text-white">{item.quantidade_solicitada}</td>
                          <td className="px-4 py-2 text-sm text-gray-500">{item.observacao || '-'}</td>
                          <td className="px-4 py-2">
                            <button
                              onClick={() => removerItem(index)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Observações */}
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">
                  Observações Gerais
                </label>
                <textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Observações adicionais..."
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3 sticky bottom-0 bg-white">
              <button
                onClick={() => {
                  setMostrarFormulario(false);
                  limparFormulario();
                }}
                className="px-4 py-2 border border-gray-300 text-white/80 rounded-lg hover:bg-gray-50"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                onClick={salvarRequisicao}
                disabled={loading || itens.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                {loading ? 'Salvando...' : 'Criar Requisição'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}