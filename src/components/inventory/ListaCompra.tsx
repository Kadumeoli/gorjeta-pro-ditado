import { useState, useEffect, useRef } from 'react';
import {
  ShoppingCart, RefreshCw, Download, CheckCircle2, Circle,
  Package, Truck, Store, Filter, ChevronDown, ChevronRight,
  AlertTriangle, Printer, ClipboardList, Search, X, Plus,
  BarChart2, Check
} from 'lucide-react';

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

type TipoCompra = 'todos' | 'rua' | 'fornecedor' | 'ambos';
type StatusLista = 'aberta' | 'em_andamento' | 'concluida' | 'cancelada';

interface ItemLista {
  id: string;
  lista_id: string;
  item_id: string;
  nome_item: string;
  categoria: string;
  unidade_medida: string;
  tipo_compra: TipoCompra;
  fornecedor_nome: string | null;
  fornecedor_tel: string | null;
  estoque_atual: number;
  estoque_minimo: number;
  ponto_reposicao: number;
  quantidade_sugerida: number;
  quantidade_comprar: number;
  custo_unitario: number;
  custo_estimado: number;
  comprado: boolean;
  comprado_em: string | null;
  observacao: string | null;
  ordem: number;
}

interface Lista {
  id: string;
  numero: string;
  titulo: string;
  tipo_compra: TipoCompra;
  status: StatusLista;
  gerado_por: string;
  observacoes: string | null;
  total_itens: number;
  itens_comprados: number;
  valor_estimado: number;
  criado_em: string;
  concluido_em: string | null;
}

const TIPO_LABEL: Record<string, string> = {
  rua: 'Compra na Rua',
  fornecedor: 'Pedido Fornecedor',
  ambos: 'Ambos',
  todos: 'Todos',
};

const TIPO_COLOR: Record<string, string> = {
  rua: 'bg-orange-100 text-orange-700 border-orange-200',
  fornecedor: 'bg-blue-100 text-blue-700 border-blue-200',
  ambos: 'bg-purple-100 text-purple-700 border-purple-200',
  todos: 'bg-gray-100 text-gray-600 border-gray-200',
};

const STATUS_COLOR: Record<StatusLista, string> = {
  aberta: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  em_andamento: 'bg-blue-50 text-blue-700 border-blue-200',
  concluida: 'bg-green-50 text-green-700 border-green-200',
  cancelada: 'bg-red-50 text-red-500 border-red-200',
};

function fmt(n: number, dec = 2) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
function fmtMoeda(n: number) {
  return 'R$ ' + fmt(n);
}

// ─── Componente de impressão ────────────────────────────────────────────────
function PrintView({ lista, itens }: { lista: Lista; itens: ItemLista[] }) {
  const categorias = [...new Set(itens.map(i => i.categoria))].sort();
  const total = itens.reduce((s, i) => s + i.custo_estimado, 0);

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '12px', color: '#111' }}>
      {/* Cabeçalho */}
      <div style={{ borderBottom: '2px solid #333', paddingBottom: '12px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>📋 LISTA DE COMPRAS</h1>
            <p style={{ margin: '4px 0 0', color: '#555' }}>{lista.numero} — {lista.titulo}</p>
          </div>
          <div style={{ textAlign: 'right', fontSize: '11px', color: '#555' }}>
            <p style={{ margin: 0 }}>Data: {new Date(lista.criado_em).toLocaleDateString('pt-BR')}</p>
            <p style={{ margin: 0 }}>Total de itens: {lista.total_itens}</p>
            <p style={{ margin: 0 }}>Valor estimado: {fmtMoeda(lista.valor_estimado)}</p>
          </div>
        </div>
        {lista.observacoes && (
          <p style={{ margin: '8px 0 0', fontSize: '11px', color: '#666', fontStyle: 'italic' }}>
            Obs: {lista.observacoes}
          </p>
        )}
      </div>

      {/* Itens por categoria */}
      {categorias.map(cat => {
        const itensCat = itens.filter(i => i.categoria === cat);
        return (
          <div key={cat} style={{ marginBottom: '16px', breakInside: 'avoid' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 'bold', margin: '0 0 6px', padding: '4px 8px', background: '#f0f0f0', borderLeft: '3px solid #333' }}>
              {cat} ({itensCat.length} {itensCat.length === 1 ? 'item' : 'itens'})
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#fafafa', fontSize: '10px', color: '#666' }}>
                  <th style={{ width: '20px', padding: '4px', textAlign: 'center', border: '1px solid #ddd' }}>✓</th>
                  <th style={{ padding: '4px 8px', textAlign: 'left', border: '1px solid #ddd' }}>Item</th>
                  <th style={{ width: '60px', padding: '4px', textAlign: 'center', border: '1px solid #ddd' }}>Tipo</th>
                  <th style={{ width: '70px', padding: '4px', textAlign: 'center', border: '1px solid #ddd' }}>Em estoque</th>
                  <th style={{ width: '60px', padding: '4px', textAlign: 'center', border: '1px solid #ddd' }}>Mínimo</th>
                  <th style={{ width: '80px', padding: '4px', textAlign: 'center', border: '1px solid #ddd' }}>Qtd comprar</th>
                  <th style={{ width: '70px', padding: '4px', textAlign: 'center', border: '1px solid #ddd' }}>Vlr. Unit.</th>
                  <th style={{ width: '80px', padding: '4px', textAlign: 'center', border: '1px solid #ddd' }}>Total Est.</th>
                  <th style={{ padding: '4px 8px', textAlign: 'left', border: '1px solid #ddd' }}>Fornecedor</th>
                </tr>
              </thead>
              <tbody>
                {itensCat.map((item, idx) => (
                  <tr key={item.id} style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <td style={{ padding: '6px 4px', textAlign: 'center', border: '1px solid #ddd' }}>
                      <div style={{ width: '14px', height: '14px', border: '1.5px solid #999', borderRadius: '3px', margin: '0 auto' }} />
                    </td>
                    <td style={{ padding: '6px 8px', border: '1px solid #ddd', fontWeight: '500' }}>
                      {item.nome_item}
                      {item.observacao && <span style={{ fontSize: '10px', color: '#888', display: 'block' }}>{item.observacao}</span>}
                    </td>
                    <td style={{ padding: '6px 4px', textAlign: 'center', border: '1px solid #ddd', fontSize: '10px' }}>
                      {item.tipo_compra === 'rua' ? '🛒 Rua' : item.tipo_compra === 'fornecedor' ? '🚚 Forn.' : '🔀 Ambos'}
                    </td>
                    <td style={{ padding: '6px 4px', textAlign: 'center', border: '1px solid #ddd', color: '#e55' }}>
                      {fmt(item.estoque_atual, 3)} {item.unidade_medida}
                    </td>
                    <td style={{ padding: '6px 4px', textAlign: 'center', border: '1px solid #ddd', color: '#888' }}>
                      {fmt(item.estoque_minimo, 0)}
                    </td>
                    <td style={{ padding: '6px 4px', textAlign: 'center', border: '1px solid #ddd', fontWeight: 'bold', fontSize: '13px' }}>
                      {fmt(item.quantidade_comprar, item.quantidade_comprar % 1 === 0 ? 0 : 2)} {item.unidade_medida}
                    </td>
                    <td style={{ padding: '6px 4px', textAlign: 'center', border: '1px solid #ddd', color: '#555', fontSize: '10px' }}>
                      {item.custo_unitario > 0 ? fmtMoeda(item.custo_unitario) : '—'}
                    </td>
                    <td style={{ padding: '6px 4px', textAlign: 'center', border: '1px solid #ddd', color: '#333' }}>
                      {item.custo_estimado > 0 ? fmtMoeda(item.custo_estimado) : '—'}
                    </td>
                    <td style={{ padding: '6px 8px', border: '1px solid #ddd', fontSize: '10px', color: '#555' }}>
                      {item.fornecedor_nome || '—'}
                      {item.fornecedor_tel && <span style={{ display: 'block', color: '#888' }}>{item.fornecedor_tel}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}

      {/* Rodapé */}
      <div style={{ borderTop: '2px solid #333', marginTop: '20px', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
        <div>
          <strong>Total de itens:</strong> {itens.length} &nbsp;|&nbsp;
          <strong>Valor estimado total:</strong> {fmtMoeda(total)}
        </div>
        <div style={{ color: '#888' }}>
          Gerado por: {lista.gerado_por} &nbsp;|&nbsp; {new Date(lista.criado_em).toLocaleString('pt-BR')}
        </div>
      </div>
    </div>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────
export default function ListaCompras() {
  const [aba, setAba] = useState<'nova' | 'historico'>('nova');

  // Geração
  const [tipoFiltro, setTipoFiltro] = useState<TipoCompra>('todos');
  const [titulo, setTitulo] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [gerando, setGerando] = useState(false);
  const [erroGerar, setErroGerar] = useState('');
  const [resumoGerado, setResumoGerado] = useState<any>(null);

  // Lista aberta
  const [listaAtiva, setListaAtiva] = useState<Lista | null>(null);
  const [itens, setItens] = useState<ItemLista[]>([]);
  const [carregandoItens, setCarregandoItens] = useState(false);
  const [busca, setBusca] = useState('');
  const [expandidas, setExpandidas] = useState<Set<string>>(new Set());
  const [salvando, setSalvando] = useState<string | null>(null);
  const [exibindoPrint, setExibindoPrint] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Histórico
  const [listas, setListas] = useState<Lista[]>([]);
  const [carregandoListas, setCarregandoListas] = useState(false);

  const headers = { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}`, 'Content-Type': 'application/json' };

  const carregarListas = async () => {
    setCarregandoListas(true);
    const r = await fetch(`${SUPABASE_URL}/rest/v1/listas_compra?select=*&order=criado_em.desc&limit=30`, { headers });
    const d = await r.json();
    if (Array.isArray(d)) setListas(d);
    setCarregandoListas(false);
  };

  const carregarItens = async (listaId: string) => {
    setCarregandoItens(true);
    const r = await fetch(`${SUPABASE_URL}/rest/v1/listas_compra_itens?lista_id=eq.${listaId}&order=categoria,nome_item`, { headers });
    const d = await r.json();
    if (Array.isArray(d)) setItens(d);
    setCarregandoItens(false);
    // Expande todas as categorias por padrão
    const cats = new Set(d.map((i: ItemLista) => i.categoria));
    setExpandidas(cats as Set<string>);
  };

  useEffect(() => {
    if (aba === 'historico') carregarListas();
  }, [aba]);

  const gerarLista = async () => {
    setGerando(true);
    setErroGerar('');
    setResumoGerado(null);
    try {
      const r = await fetch(`${SUPABASE_URL}/functions/v1/gerar-lista-compra`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo_compra: tipoFiltro, titulo: titulo || undefined, observacoes: observacoes || undefined, gerado_por: 'Usuário' }),
      });
      const d = await r.json();
      if (!d.ok) { setErroGerar(d.error || d.message || 'Erro ao gerar'); return; }
      if (d.total === 0) { setErroGerar('✅ Todos os itens estão acima do estoque mínimo. Nenhuma compra necessária!'); return; }
      setResumoGerado(d);
      // Abre lista gerada
      await abrirLista(d.lista.id);
      setAba('nova');
    } catch (e: any) {
      setErroGerar(e.message);
    } finally {
      setGerando(false);
    }
  };

  const abrirLista = async (id: string) => {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/listas_compra?id=eq.${id}&select=*`, { headers });
    const d = await r.json();
    if (d[0]) { setListaAtiva(d[0]); await carregarItens(d[0].id); }
  };

  const toggleComprado = async (item: ItemLista) => {
    const novo = !item.comprado;
    setSalvando(item.id);
    // Atualiza local imediatamente
    setItens(prev => prev.map(i => i.id === item.id ? { ...i, comprado: novo, comprado_em: novo ? new Date().toISOString() : null } : i));
    await fetch(`${SUPABASE_URL}/rest/v1/listas_compra_itens?id=eq.${item.id}`, {
      method: 'PATCH',
      headers: { ...headers, Prefer: 'return=minimal' },
      body: JSON.stringify({ comprado: novo, comprado_em: novo ? new Date().toISOString() : null }),
    });
    // Atualiza a lista com contadores
    if (listaAtiva) {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/listas_compra?id=eq.${listaAtiva.id}&select=*`, { headers });
      const d = await r.json();
      if (d[0]) setListaAtiva(d[0]);
    }
    setSalvando(null);
  };

  const atualizarQtd = async (item: ItemLista, qtd: number) => {
    const novaQtd = Math.max(0, qtd);
    const novoCusto = Number((item.custo_unitario * novaQtd).toFixed(2));
    setItens(prev => prev.map(i => i.id === item.id ? { ...i, quantidade_comprar: novaQtd, custo_estimado: novoCusto } : i));
    await fetch(`${SUPABASE_URL}/rest/v1/listas_compra_itens?id=eq.${item.id}`, {
      method: 'PATCH',
      headers: { ...headers, Prefer: 'return=minimal' },
      body: JSON.stringify({ quantidade_comprar: novaQtd, custo_estimado: novoCusto }),
    });
  };

  const concluirLista = async () => {
    if (!listaAtiva) return;
    await fetch(`${SUPABASE_URL}/rest/v1/listas_compra?id=eq.${listaAtiva.id}`, {
      method: 'PATCH',
      headers: { ...headers, Prefer: 'return=minimal' },
      body: JSON.stringify({ status: 'concluida', concluido_em: new Date().toISOString() }),
    });
    setListaAtiva(prev => prev ? { ...prev, status: 'concluida' } : null);
  };

  const imprimir = () => {
    setExibindoPrint(true);
    setTimeout(() => {
      window.print();
      setExibindoPrint(false);
    }, 300);
  };

  // Itens filtrados por busca
  const itensFiltrados = busca
    ? itens.filter(i => i.nome_item.toLowerCase().includes(busca.toLowerCase()) || i.categoria.toLowerCase().includes(busca.toLowerCase()) || (i.fornecedor_nome || '').toLowerCase().includes(busca.toLowerCase()))
    : itens;

  const categorias = [...new Set(itensFiltrados.map(i => i.categoria))].sort();
  const totalItens = itens.length;
  const totalComprados = itens.filter(i => i.comprado).length;
  const pct = totalItens > 0 ? Math.round((totalComprados / totalItens) * 100) : 0;
  const valorTotal = itens.reduce((s, i) => s + i.custo_estimado, 0);

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Print overlay */}
      {exibindoPrint && listaAtiva && (
        <div ref={printRef} className="fixed inset-0 bg-white z-50 p-8 overflow-auto print:block">
          <PrintView lista={listaAtiva} itens={itens} />
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#7D1F2C] rounded-xl flex items-center justify-center">
              <ShoppingCart size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Lista de Compras</h1>
              <p className="text-sm text-gray-500">Geração automática por estoque mínimo</p>
            </div>
          </div>
          <div className="flex gap-2">
            {(['nova', 'historico'] as const).map(a => (
              <button key={a} onClick={() => setAba(a)}
                className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${aba === a ? 'bg-[#7D1F2C] text-white border-[#7D1F2C]' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}>
                {a === 'nova' ? '+ Nova Lista' : '📋 Histórico'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex">

        {/* ─── ABA NOVA LISTA ─── */}
        {aba === 'nova' && !listaAtiva && (
          <div className="flex-1 p-6 max-w-2xl mx-auto w-full">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
              <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                <BarChart2 size={16} className="text-[#7D1F2C]" /> Gerar nova lista
              </h2>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Tipo de compra</label>
                <div className="grid grid-cols-4 gap-2">
                  {([
                    { v: 'todos', label: 'Todos', icon: <Filter size={14}/> },
                    { v: 'rua', label: 'Compra na rua', icon: <Store size={14}/> },
                    { v: 'fornecedor', label: 'Fornecedor', icon: <Truck size={14}/> },
                    { v: 'ambos', label: 'Ambos', icon: <Package size={14}/> },
                  ] as {v: TipoCompra; label: string; icon: any}[]).map(op => (
                    <button key={op.v} onClick={() => setTipoFiltro(op.v)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-medium transition-all ${tipoFiltro === op.v ? 'bg-[#7D1F2C] text-white border-[#7D1F2C]' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}>
                      {op.icon}
                      <span className="text-center leading-tight">{op.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Título (opcional)</label>
                <input type="text" value={titulo} onChange={e => setTitulo(e.target.value)}
                  placeholder={`Lista ${TIPO_LABEL[tipoFiltro]} - ${new Date().toLocaleDateString('pt-BR')}`}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7D1F2C]/30" />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Observações (opcional)</label>
                <textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} rows={2}
                  placeholder="Ex: Priorizar compras no atacado..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7D1F2C]/30 resize-none" />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700">
                <p className="font-semibold mb-1">ℹ️ Como funciona</p>
                <p>O sistema analisa todos os itens ativos com estoque mínimo definido e gera uma lista com o que está abaixo do mínimo, sugerindo a quantidade para atingir o ponto de reposição.</p>
              </div>

              {erroGerar && (
                <div className={`rounded-xl p-3 text-sm border ${erroGerar.startsWith('✅') ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-600'}`}>
                  {erroGerar}
                </div>
              )}

              <button onClick={gerarLista} disabled={gerando}
                className="w-full flex items-center justify-center gap-2 bg-[#7D1F2C] hover:bg-[#6a1a25] disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors">
                <ShoppingCart size={18} className={gerando ? 'animate-pulse' : ''} />
                {gerando ? 'Analisando estoque...' : 'Gerar Lista de Compras'}
              </button>
            </div>
          </div>
        )}

        {/* ─── LISTA ATIVA ─── */}
        {aba === 'nova' && listaAtiva && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Barra de progresso e ações */}
            <div className="bg-white border-b border-gray-100 px-6 py-3 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <button onClick={() => { setListaAtiva(null); setItens([]); setResumoGerado(null); setErroGerar(''); }}
                    className="text-gray-400 hover:text-gray-700 text-sm">← Nova lista</button>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">{listaAtiva.numero}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs border ${STATUS_COLOR[listaAtiva.status]}`}>{listaAtiva.status.replace('_', ' ')}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs border ${TIPO_COLOR[listaAtiva.tipo_compra]}`}>{TIPO_LABEL[listaAtiva.tipo_compra]}</span>
                    </div>
                    <p className="text-xs text-gray-400">{listaAtiva.titulo}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right text-xs text-gray-500 mr-2">
                    <p className="font-semibold text-gray-800">{totalComprados}/{totalItens} itens</p>
                    <p>{fmtMoeda(valorTotal)} est.</p>
                  </div>
                  <button onClick={imprimir}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">
                    <Printer size={15}/> Imprimir
                  </button>
                  {listaAtiva.status !== 'concluida' && (
                    <button onClick={concluirLista}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-600 text-white text-sm font-medium hover:bg-green-700">
                      <Check size={15}/> Concluir
                    </button>
                  )}
                </div>
              </div>
              {/* Barra de progresso */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs font-semibold text-gray-600 min-w-[36px]">{pct}%</span>
              </div>
            </div>

            {/* Busca */}
            <div className="px-6 py-3 bg-gray-50 border-b border-gray-100">
              <div className="relative max-w-sm">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar item..."
                  className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#7D1F2C]/30" />
                {busca && <button onClick={() => setBusca('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={14}/></button>}
              </div>
            </div>

            {/* Lista de itens */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {carregandoItens ? (
                <div className="text-center py-16 text-gray-400">
                  <RefreshCw size={24} className="animate-spin mx-auto mb-3" />
                  <p>Carregando itens...</p>
                </div>
              ) : categorias.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <Package size={32} className="mx-auto mb-3 opacity-40" />
                  <p>Nenhum item encontrado</p>
                </div>
              ) : categorias.map(cat => {
                const itensCat = itensFiltrados.filter(i => i.categoria === cat);
                const comprados = itensCat.filter(i => i.comprado).length;
                const isExp = expandidas.has(cat);
                return (
                  <div key={cat} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    {/* Header categoria */}
                    <button onClick={() => setExpandidas(prev => { const s = new Set(prev); if (s.has(cat)) s.delete(cat); else s.add(cat); return s; })}
                      className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        {isExp ? <ChevronDown size={16} className="text-gray-400"/> : <ChevronRight size={16} className="text-gray-400"/>}
                        <span className="font-semibold text-gray-800">{cat}</span>
                        <span className="text-xs text-gray-400">{itensCat.length} {itensCat.length === 1 ? 'item' : 'itens'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {comprados > 0 && (
                          <span className="text-xs text-green-600 font-medium">{comprados}/{itensCat.length} ✓</span>
                        )}
                      </div>
                    </button>

                    {/* Itens */}
                    {isExp && (
                      <div className="divide-y divide-gray-50">
                        {itensCat.map(item => (
                          <div key={item.id} className={`flex items-start gap-3 px-5 py-3 transition-colors ${item.comprado ? 'bg-green-50/50' : ''} ${salvando === item.id ? 'opacity-60' : ''}`}>
                            {/* Checkbox */}
                            <button onClick={() => toggleComprado(item)} className="mt-0.5 flex-shrink-0">
                              {item.comprado
                                ? <CheckCircle2 size={22} className="text-green-500" />
                                : <Circle size={22} className="text-gray-300 hover:text-[#7D1F2C]" />}
                            </button>

                            {/* Info principal */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <p className={`text-sm font-medium ${item.comprado ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                                  {item.nome_item}
                                </p>
                                <span className={`flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded-md border ${TIPO_COLOR[item.tipo_compra] || 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                                  {item.tipo_compra === 'rua' ? '🛒 Rua' : item.tipo_compra === 'fornecedor' ? '🚚 Forn.' : '🔀'}
                                </span>
                              </div>

                              <div className="flex items-center gap-3 mt-1 flex-wrap">
                                {/* Estoque atual */}
                                <span className="text-xs text-red-500">
                                  Estoque: <strong>{fmt(item.estoque_atual, item.estoque_atual % 1 === 0 ? 0 : 2)} {item.unidade_medida}</strong>
                                </span>
                                <span className="text-xs text-gray-400">
                                  Mín: {fmt(item.estoque_minimo, 0)}
                                </span>
                                {/* Fornecedor */}
                                {item.fornecedor_nome && (
                                  <span className="text-xs text-blue-600">
                                    📦 {item.fornecedor_nome}
                                    {item.fornecedor_tel && ` · ${item.fornecedor_tel}`}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Quantidade e custo */}
                            <div className="flex-shrink-0 flex flex-col items-end gap-1">
                              <div className="flex items-center gap-1">
                                <button onClick={() => atualizarQtd(item, item.quantidade_comprar - 1)} className="w-6 h-6 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-bold flex items-center justify-center">−</button>
                                <input type="number" value={item.quantidade_comprar} min={0} step={0.5}
                                  onChange={e => atualizarQtd(item, parseFloat(e.target.value) || 0)}
                                  className="w-16 text-center text-sm font-bold border border-gray-200 rounded-lg py-0.5 focus:outline-none focus:ring-2 focus:ring-[#7D1F2C]/30" />
                                <button onClick={() => atualizarQtd(item, item.quantidade_comprar + 1)} className="w-6 h-6 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-bold flex items-center justify-center">+</button>
                                <span className="text-xs text-gray-400 ml-1">{item.unidade_medida}</span>
                              </div>
                              {item.custo_estimado > 0 && (
                                <span className="text-xs text-gray-500">{fmtMoeda(item.custo_estimado)}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── HISTÓRICO ─── */}
        {aba === 'historico' && (
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-800">Listas geradas</h2>
              <button onClick={carregarListas} className="p-2 rounded-xl hover:bg-gray-100 text-gray-500">
                <RefreshCw size={15} className={carregandoListas ? 'animate-spin' : ''} />
              </button>
            </div>
            {carregandoListas ? (
              <div className="text-center py-16 text-gray-400">
                <RefreshCw size={24} className="animate-spin mx-auto mb-3" />
              </div>
            ) : listas.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <ClipboardList size={32} className="mx-auto mb-3 opacity-40" />
                <p>Nenhuma lista gerada ainda</p>
              </div>
            ) : (
              <div className="space-y-3">
                {listas.map(lista => {
                  const pctLista = lista.total_itens > 0 ? Math.round((lista.itens_comprados / lista.total_itens) * 100) : 0;
                  return (
                    <div key={lista.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-all">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-bold text-gray-800">{lista.numero}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs border ${STATUS_COLOR[lista.status]}`}>{lista.status.replace('_', ' ')}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs border ${TIPO_COLOR[lista.tipo_compra]}`}>{TIPO_LABEL[lista.tipo_compra]}</span>
                          </div>
                          <p className="text-sm text-gray-600 truncate">{lista.titulo}</p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                            <span>{lista.total_itens} itens</span>
                            <span>{fmtMoeda(lista.valor_estimado)} est.</span>
                            <span>{new Date(lista.criado_em).toLocaleDateString('pt-BR')}</span>
                          </div>
                          {lista.total_itens > 0 && (
                            <div className="flex items-center gap-2 mt-2">
                              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full bg-green-500 rounded-full" style={{ width: `${pctLista}%` }} />
                              </div>
                              <span className="text-xs text-gray-500">{lista.itens_comprados}/{lista.total_itens}</span>
                            </div>
                          )}
                        </div>
                        <button onClick={() => { abrirLista(lista.id); setAba('nova'); }}
                          className="flex-shrink-0 px-3 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-[#7D1F2C] hover:text-white hover:border-[#7D1F2C] transition-all">
                          Abrir
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* CSS para print */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          .fixed.inset-0 { display: block !important; position: static !important; }
        }
      `}</style>
    </div>
  );
}
