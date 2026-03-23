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
  baixa_estoque?: boolean; // Adicionado para o Toggle
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
  baixa_estoque?: boolean; // Adicionado para o Toggle
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
        .from('itens_esto