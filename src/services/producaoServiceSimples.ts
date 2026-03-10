import { supabase } from '../lib/supabase';

export interface VerificacaoEstoque {
  item_id: string;
  item_nome: string;
  quantidade_necessaria: number;
  quantidade_disponivel: number;
  tem_estoque_suficiente: boolean;
  estoque_id: string;
  estoque_nome: string;
}

export const producaoServiceSimples = {
  /**
   * Verifica se há insumos disponíveis no estoque de produção
   */
  async verificarDisponibilidadeInsumos(
    fichaId: string,
    quantidade: number
  ): Promise<{ disponivel: boolean; detalhes: VerificacaoEstoque[] }> {
    try {
      // 1. Buscar estoque de produção
      const { data: estoqueProducao } = await supabase
        .from('estoques')
        .select('id, nome')
        .eq('tipo', 'producao')
        .eq('status', true)
        .maybeSingle();

      if (!estoqueProducao) {
        throw new Error('Estoque de produção não encontrado');
      }

      // 2. Buscar ingredientes da ficha
      const { data: ingredientes } = await supabase
        .from('ficha_ingredientes')
        .select('item_estoque_id, quantidade, itens_estoque(id, nome)')
        .eq('ficha_id', fichaId);

      if (!ingredientes || ingredientes.length === 0) {
        return { disponivel: true, detalhes: [] };
      }

      // 3. Verificar cada ingrediente
      const verificacoes: VerificacaoEstoque[] = [];
      let todosDisponiveis = true;

      for (const ing of ingredientes) {
        const qtdNecessaria = ing.quantidade * quantidade;

        const { data: saldo } = await supabase
          .from('saldos_estoque')
          .select('quantidade_atual')
          .eq('estoque_id', estoqueProducao.id)
          .eq('item_id', ing.item_estoque_id)
          .maybeSingle();

        const qtdDisponivel = saldo?.quantidade_atual || 0;
        const suficiente = qtdDisponivel >= qtdNecessaria;

        if (!suficiente) todosDisponiveis = false;

        verificacoes.push({
          item_id: ing.item_estoque_id,
          item_nome: ing.itens_estoque?.nome || 'Desconhecido',
          quantidade_necessaria: qtdNecessaria,
          quantidade_disponivel: qtdDisponivel,
          tem_estoque_suficiente: suficiente,
          estoque_id: estoqueProducao.id,
          estoque_nome: estoqueProducao.nome
        });
      }

      return { disponivel: todosDisponiveis, detalhes: verificacoes };
    } catch (error) {
      console.error('Erro ao verificar insumos:', error);
      throw error;
    }
  },

  /**
   * Reserva insumos para uma produção
   */
  async reservarInsumos(producaoId: string, detalhes: VerificacaoEstoque[]): Promise<void> {
    try {
      const reservas = detalhes.map(d => ({
        producao_id: producaoId,
        item_id: d.item_id,
        quantidade_reservada: d.quantidade_necessaria,
        estoque_origem_id: d.estoque_id,
        status_reserva: 'reservado'
      }));

      if (reservas.length > 0) {
        await supabase.from('producao_reserva_insumos').insert(reservas);
      }
    } catch (error) {
      console.error('Erro ao reservar insumos:', error);
    }
  },

  /**
   * Inicia uma produção
   */
  async iniciarProducao(producaoId: string, usuarioId?: string): Promise<void> {
    try {
      // Verificar se é um UUID válido
      const isValidUuid = usuarioId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(usuarioId);

      const { error } = await supabase
        .from('producoes')
        .update({
          status: 'em_andamento',
          hora_inicio: new Date().toISOString(),
          usuario_inicio: isValidUuid ? usuarioId : null
        })
        .eq('id', producaoId);

      if (error) {
        console.error('Erro no update:', error);
        throw error;
      }

      console.log('Produção iniciada com sucesso');
    } catch (error) {
      console.error('Erro ao iniciar produção:', error);
      throw error;
    }
  },

  /**
   * Conclui uma produção e faz toda a movimentação de estoque
   */
  async concluirProducao(
    producaoId: string,
    quantidadeProduzida: number,
    quantidadeAprovada: number,
    observacoes?: string,
    usuarioId?: string
  ): Promise<void> {
    try {
      // Verificar se é um UUID válido
      const isValidUuid = usuarioId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(usuarioId);

      // 1. Atualizar a produção
      const { error } = await supabase
        .from('producoes')
        .update({
          status: 'concluido',
          hora_fim: new Date().toISOString(),
          usuario_conclusao: isValidUuid ? usuarioId : null,
          quantidade_produzida: quantidadeProduzida,
          quantidade_aprovada: quantidadeAprovada,
          quantidade_rejeitada: quantidadeProduzida - quantidadeAprovada,
          observacoes: observacoes || null
        })
        .eq('id', producaoId);

      if (error) {
        console.error('Erro no update:', error);
        throw error;
      }

      // 2. Baixar insumos
      await this.baixarInsumos(producaoId);

      // 3. Dar entrada no produto final
      if (quantidadeAprovada > 0) {
        await this.entradaProdutoFinal(producaoId, quantidadeAprovada);
      }

      console.log('Produção concluída com sucesso');
    } catch (error) {
      console.error('Erro ao concluir produção:', error);
      throw error;
    }
  },

  /**
   * Baixa os insumos reservados do estoque
   */
  async baixarInsumos(producaoId: string): Promise<void> {
    try {
      const { data: reservas } = await supabase
        .from('producao_reserva_insumos')
        .select('*')
        .eq('producao_id', producaoId)
        .eq('status_reserva', 'reservado');

      if (!reservas || reservas.length === 0) return;

      for (const reserva of reservas) {
        // Buscar saldo atual
        const { data: saldo } = await supabase
          .from('saldos_estoque')
          .select('quantidade_atual')
          .eq('estoque_id', reserva.estoque_origem_id)
          .eq('item_id', reserva.item_id)
          .maybeSingle();

        const qtdAtual = saldo?.quantidade_atual || 0;
        const novaQtd = Math.max(0, qtdAtual - reserva.quantidade_reservada);

        // Atualizar saldo
        await supabase
          .from('saldos_estoque')
          .update({ quantidade_atual: novaQtd })
          .eq('estoque_id', reserva.estoque_origem_id)
          .eq('item_id', reserva.item_id);

        // Registrar movimentação
        await supabase.from('movimentacoes_estoque').insert({
          estoque_id: reserva.estoque_origem_id,
          item_id: reserva.item_id,
          tipo_movimentacao: 'saida',
          quantidade: reserva.quantidade_reservada,
          motivo: 'Consumo em produção',
          referencia_tipo: 'producao',
          referencia_id: producaoId
        });

        // Marcar reserva como utilizada
        await supabase
          .from('producao_reserva_insumos')
          .update({
            status_reserva: 'utilizado',
            quantidade_utilizada: reserva.quantidade_reservada,
            data_utilizacao: new Date().toISOString()
          })
          .eq('id', reserva.id);
      }
    } catch (error) {
      console.error('Erro ao baixar insumos:', error);
    }
  },

  /**
   * Dá entrada do produto final no estoque de destino
   */
  async entradaProdutoFinal(producaoId: string, quantidade: number): Promise<void> {
    try {
      // 1. Buscar dados da produção
      const { data: producao } = await supabase
        .from('producoes')
        .select('ficha_id, estoque_destino_id, lote_producao')
        .eq('id', producaoId)
        .single();

      if (!producao || !producao.estoque_destino_id) {
        console.warn('Estoque de destino não definido');
        return;
      }

      // 2. Buscar nome da ficha
      const { data: ficha } = await supabase
        .from('fichas_tecnicas')
        .select('nome')
        .eq('id', producao.ficha_id)
        .single();

      if (!ficha) {
        console.warn('Ficha técnica não encontrada');
        return;
      }

      // 3. Buscar item produto (busca flexível)
      const { data: item } = await supabase
        .from('itens_estoque')
        .select('id')
        .ilike('nome', ficha.nome)
        .maybeSingle();

      if (!item) {
        console.warn(`Produto "${ficha.nome}" não encontrado no estoque`);
        return;
      }

      // 4. Verificar se já existe saldo
      const { data: saldoExistente } = await supabase
        .from('saldos_estoque')
        .select('quantidade_atual')
        .eq('estoque_id', producao.estoque_destino_id)
        .eq('item_id', item.id)
        .maybeSingle();

      if (saldoExistente) {
        // Atualizar saldo existente
        const novaQtd = (saldoExistente.quantidade_atual || 0) + quantidade;
        await supabase
          .from('saldos_estoque')
          .update({ quantidade_atual: novaQtd })
          .eq('estoque_id', producao.estoque_destino_id)
          .eq('item_id', item.id);
      } else {
        // Criar novo saldo
        await supabase.from('saldos_estoque').insert({
          estoque_id: producao.estoque_destino_id,
          item_id: item.id,
          quantidade_atual: quantidade
        });
      }

      // 5. Registrar movimentação de entrada
      await supabase.from('movimentacoes_estoque').insert({
        estoque_id: producao.estoque_destino_id,
        item_id: item.id,
        tipo_movimentacao: 'entrada',
        quantidade: quantidade,
        motivo: `Produção concluída - ${producao.lote_producao}`,
        referencia_tipo: 'producao',
        referencia_id: producaoId
      });

      console.log(`✅ Entrada de ${quantidade} unidades de "${ficha.nome}" realizada`);
    } catch (error) {
      console.error('Erro ao dar entrada no produto:', error);
    }
  },

  /**
   * Cancela uma produção e suas reservas
   */
  async cancelarProducao(producaoId: string): Promise<void> {
    try {
      // Atualizar status das reservas
      const { error: errorReservas } = await supabase
        .from('producao_reserva_insumos')
        .update({ status_reserva: 'cancelado' })
        .eq('producao_id', producaoId)
        .eq('status_reserva', 'reservado');

      if (errorReservas) {
        console.warn('Erro ao cancelar reservas:', errorReservas);
      }

      // Deletar a produção
      const { error: errorDelete } = await supabase
        .from('producoes')
        .delete()
        .eq('id', producaoId);

      if (errorDelete) {
        console.error('Erro no delete:', errorDelete);
        throw errorDelete;
      }

      console.log('Produção deletada com sucesso');
    } catch (error) {
      console.error('Erro ao cancelar produção:', error);
      throw error;
    }
  }
};
