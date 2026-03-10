export interface Estoque {
  id: string;
  nome: string;
}

export interface ContagemItem {
  id: string;
  item_estoque_id: string;
  item_nome: string;
  item_codigo: string;
  unidade_medida: string;
  quantidade_sistema: number;
  quantidade_contada: number | null;
  valor_unitario: number;
  diferenca: number | null;
  valor_diferenca: number | null;
  observacao: string | null;
}

export interface Contagem {
  id: string;
  estoque_id: string;
  estoque_nome: string;
  data_contagem: string;
  responsavel: string;
  status: 'em_andamento' | 'finalizada' | 'processada' | 'cancelada';
  total_itens_contados: number;
  total_diferencas: number;
  valor_total_diferencas: number;
  observacoes: string | null;
  criado_em: string;
  finalizado_em: string | null;
  processado_em: string | null;
}

export interface ContagemResultado {
  contagem: Contagem;
  itens: ContagemItem[];
}

export type ContagemView = 'list' | 'new' | 'counting' | 'result' | 'history';

export type FilterMode = 'todos' | 'pendentes' | 'contados' | 'divergentes' | 'sobras' | 'perdas';

export interface ContagemStats {
  totalItens: number;
  contados: number;
  pendentes: number;
  comDiferenca: number;
  sobras: number;
  perdas: number;
  valorSobras: number;
  valorPerdas: number;
}
