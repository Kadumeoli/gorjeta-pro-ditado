import { supabase } from '../../../lib/supabase';
import type { Contagem, ContagemItem, Estoque } from './types';

export async function loadEstoques(): Promise<Estoque[]> {
  const { data, error } = await supabase
    .from('estoques').select('id, nome').eq('status', true).order('nome');
  if (error) throw error;
  return data || [];
}

export async function loadContagensAtivas(): Promise<Contagem[]> {
  const { data, error } = await supabase
    .from('contagens_estoque')
    .select('*, estoques(nome)')
    .in('status', ['em_andamento', 'finalizada'])
    .order('criado_em', { ascending: false });
  if (error) throw error;
  return (data || []).map((c: any) => ({ ...c, estoque_nome: c.estoques?.nome || 'N/A' }));
}

export async function loadHistorico(filters?: {
  estoqueId?: string;
  responsavel?: string;
  dataInicio?: string;
  dataFim?: string;
}): Promise<Contagem[]> {
  let query = supabase
    .from('contagens_estoque')
    .select('*, estoques(nome)')
    .eq('status', 'processada')
    .order('processado_em', { ascending: false })
    .limit(100);
  if (filters?.estoqueId)   query = query.eq('estoque_id', filters.estoqueId);
  if (filters?.responsavel) query = query.ilike('responsavel', `%${filters.responsavel}%`);
  if (filters?.dataInicio)  query = query.gte('data_contagem', filters.dataInicio);
  if (filters?.dataFim)     query = query.lte('data_contagem', filters.dataFim + 'T23:59:59');
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map((c: any) => ({ ...c, estoque_nome: c.estoques?.nome || 'N/A' }));
}

export async function criarContagem(params: {
  estoque_id: string;
  responsavel: string;
  observacoes?: string;
  criado_por?: string;
  incluir_sem_saldo?: boolean;
}): Promise<Contagem> {
  const insertData: any = {
    estoque_id:  params.estoque_id,
    responsavel: params.responsavel,
    observacoes: params.observacoes || null,
  };
  if (params.criado_por && params.criado_por !== 'temp-master') {
    insertData.criado_por = params.criado_por;
  }
  const { data, error } = await supabase
    .from('contagens_estoque')
    .insert(insertData)
    .select('*, estoques(nome)')
    .single();
  if (error) throw error;

  const result = await supabase.rpc('bulk_import_contagem_itens', {
    p_contagem_id:       data.id,
    p_estoque_id:        params.estoque_id,
    p_incluir_sem_saldo: params.incluir_sem_saldo ?? false,
  });
  if (result.error) throw result.error;

  return { ...data, estoque_nome: data.estoques?.nome || 'N/A' };
}

export async function gerarTokenContagem(contagemId: string): Promise<string> {
  const { data, error } = await supabase.rpc('gerar_token_contagem', {
    p_contagem_id: contagemId,
  });
  if (error) throw error;
  return data as string;
}

export async function loadItensContagem(contagemId: string): Promise<ContagemItem[]> {
  const { data, error } = await supabase
    .from('contagens_estoque_itens')
    .select('*, itens_estoque(nome, codigo, unidade_medida, grupo_contagem, ignorar_contagem)')
    .eq('contagem_id', contagemId)
    .order('item_estoque_id');
  if (error) throw error;

  return (data || []).map((item: any) => ({
    id:                        item.id,
    item_estoque_id:           item.item_estoque_id,
    item_nome:                 item.itens_estoque?.nome || '',
    item_codigo:               item.itens_estoque?.codigo || '',
    unidade_medida:            item.itens_estoque?.unidade_medida || 'UN',
    grupo_contagem:            item.itens_estoque?.grupo_contagem || 'outros',
    ignorar_contagem_cadastro: item.itens_estoque?.ignorar_contagem ?? false,
    ignorar_override:          item.ignorar_override ?? null,
    quantidade_sistema:        Number(item.quantidade_sistema),
    quantidade_contada:        item.quantidade_contada !== null ? Number(item.quantidade_contada) : null,
    valor_unitario:            Number(item.valor_unitario),
    diferenca:                 item.diferenca !== null ? Number(item.diferenca) : null,
    valor_diferenca:           item.valor_diferenca !== null ? Number(item.valor_diferenca) : null,
    observacao:                item.observacao,
  }));
}

export async function atualizarItem(
  itemId: string,
  updates: {
    quantidade_contada?: number | null;
    observacao?: string;
    ignorar_override?: boolean | null;
  }
): Promise<void> {
  const { error } = await supabase
    .from('contagens_estoque_itens')
    .update(updates)
    .eq('id', itemId);
  if (error) throw error;
}

/** Retorna true se o item deve ser ignorado nesta contagem */
export function itemEstaIgnorado(item: ContagemItem): boolean {
  if (item.ignorar_override !== null && item.ignorar_override !== undefined) {
    return item.ignorar_override;
  }
  return item.ignorar_contagem_cadastro ?? false;
}

export async function finalizarContagem(contagemId: string): Promise<any> {
  const { data, error } = await supabase.rpc('finalizar_contagem_estoque', {
    p_contagem_id: contagemId,
  });
  if (error) throw error;
  return data;
}

export async function processarContagem(contagemId: string, usuarioId?: string): Promise<any> {
  const { data, error } = await supabase.rpc('processar_contagem_estoque', {
    p_contagem_id: contagemId,
    p_usuario_id:  usuarioId === 'temp-master' ? null : (usuarioId || null),
  });
  if (error) throw error;
  return data;
}

export async function reabrirContagem(contagemId: string): Promise<any> {
  const { data, error } = await supabase.rpc('reabrir_contagem_estoque', {
    p_contagem_id: contagemId,
  });
  if (error) throw error;
  return data;
}

export async function cancelarContagem(contagemId: string): Promise<any> {
  const { data, error } = await supabase.rpc('cancelar_contagem_estoque', {
    p_contagem_id: contagemId,
  });
  if (error) throw error;
  return data;
}

export async function loadItensEstoqueComSaldo(estoqueId: string): Promise<{
  id: string; nome: string; codigo: string;
  unidade_medida: string; saldo: number;
  valor_unitario: number; valor_total: number;
}[]> {
  const { data, error } = await supabase
    .from('saldos_estoque')
    .select('item_estoque_id, quantidade, itens_estoque(id, nome, codigo, unidade_medida, valor_unitario)')
    .eq('estoque_id', estoqueId)
    .gt('quantidade', 0);
  if (error) throw error;
  return (data || []).map((s: any) => ({
    id:             s.itens_estoque?.id || s.item_estoque_id,
    nome:           s.itens_estoque?.nome || '',
    codigo:         s.itens_estoque?.codigo || '',
    unidade_medida: s.itens_estoque?.unidade_medida || 'UN',
    saldo:          Number(s.quantidade),
    valor_unitario: Number(s.itens_estoque?.valor_unitario || 0),
    valor_total:    Number(s.quantidade) * Number(s.itens_estoque?.valor_unitario || 0),
  }));
}

export async function criarContagemAmostragem(params: {
  estoque_id: string; responsavel: string; observacoes?: string;
  criado_por?: string; item_ids: string[];
}): Promise<string> {
  const insertData: any = {
    estoque_id:  params.estoque_id,
    responsavel: params.responsavel,
    observacoes: params.observacoes || null,
  };
  if (params.criado_por && params.criado_por !== 'temp-master') {
    insertData.criado_por = params.criado_por;
  }
  const { data: contagem, error: cErr } = await supabase
    .from('contagens_estoque').insert(insertData).select('id').single();
  if (cErr) throw cErr;

  const { data: saldos, error: sErr } = await supabase
    .from('saldos_estoque')
    .select('item_estoque_id, quantidade, itens_estoque(valor_unitario)')
    .eq('estoque_id', params.estoque_id)
    .in('item_estoque_id', params.item_ids);
  if (sErr) throw sErr;

  const itensInsert = (saldos || []).map((s: any) => ({
    contagem_id:        contagem.id,
    item_estoque_id:    s.item_estoque_id,
    quantidade_sistema: Number(s.quantidade),
    valor_unitario:     Number(s.itens_estoque?.valor_unitario || 0),
  }));
  if (itensInsert.length > 0) {
    const { error: iErr } = await supabase
      .from('contagens_estoque_itens').insert(itensInsert);
    if (iErr) throw iErr;
  }
  return contagem.id;
}

export async function loadContagemCompleta(contagemId: string): Promise<{
  contagem: Contagem; itens: ContagemItem[];
}> {
  const { data: contagem, error: cErr } = await supabase
    .from('contagens_estoque').select('*, estoques(nome)').eq('id', contagemId).single();
  if (cErr) throw cErr;
  const itens = await loadItensContagem(contagemId);
  return {
    contagem: { ...contagem, estoque_nome: contagem?.estoques?.nome || '' },
    itens,
  };
}