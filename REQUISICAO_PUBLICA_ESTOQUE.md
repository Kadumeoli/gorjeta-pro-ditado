# Sistema de Requisição Pública de Estoque

## Visão Geral

Sistema que permite colaboradores solicitarem materiais do estoque através de um link público, sem necessidade de login, facilitando e agilizando o processo de requisição interna.

## Como Funciona

### Para o Colaborador

1. **Acesse o link público**: `https://seu-dominio.com/requisicao-estoque`

2. **Preencha seus dados**:
   - Nome completo
   - WhatsApp para contato
   - Setor onde trabalha

3. **Selecione os estoques**:
   - De qual estoque deseja retirar os itens
   - Para qual estoque/setor os itens serão entregues

4. **Adicione os itens necessários**:
   - Selecione o item da lista
   - Informe a quantidade
   - Adicione observações se necessário
   - Clique em "Adicionar"

5. **Envie a requisição**:
   - Clique em "Enviar Requisição"
   - Anote o número da requisição gerado
   - Aguarde contato do estoquista via WhatsApp

### Para o Estoquista

1. **Visualize as requisições**:
   - Acesse: Menu Estoque → Requisições Internas
   - Requisições públicas aparecem com badge "Público"

2. **Veja os detalhes**:
   - Clique no ícone de olho para ver detalhes
   - WhatsApp do solicitante aparece como link clicável
   - Lista de todos os itens solicitados

3. **Entre em contato**:
   - Clique no WhatsApp para abrir conversa
   - Confirme disponibilidade dos itens
   - Combine horário de entrega

4. **Conclua a transferência**:
   - Clique no ícone de check verde
   - Confirme a conclusão
   - Sistema automaticamente move os itens entre estoques

## Vantagens

### Para o Colaborador
- Não precisa parar o trabalho para ir até o estoque
- Não precisa fazer login no sistema
- Pode solicitar a qualquer momento
- Recebe confirmação imediata via WhatsApp

### Para o Estoquista
- Recebe solicitações organizadas
- Pode preparar os itens com antecedência
- Tem o WhatsApp direto para contato
- Sistema registra tudo automaticamente

### Para a Empresa
- Processo mais ágil e eficiente
- Reduz tempo de espera dos colaboradores
- Mantém histórico de todas as requisições
- Controle de estoque automatizado

## Link de Acesso

**URL Pública**: `/requisicao-estoque`

Exemplo completo: `https://seu-dominio.com/requisicao-estoque`

## Dicas de Uso

1. **Salve o link nos favoritos** do celular para acesso rápido

2. **Compartilhe o link** com toda a equipe via WhatsApp ou mural

3. **Oriente os colaboradores** a sempre informar o WhatsApp correto

4. **Estoquista deve** verificar requisições regularmente (filtro "Pendente")

## Fluxo Completo

```
Colaborador → Acessa link → Preenche formulário → Envia requisição
                                                          ↓
Estoquista ← Recebe notificação ← Sistema registra ← Número gerado
     ↓
Visualiza detalhes → Entra em contato via WhatsApp → Separa itens
     ↓
Confirma entrega → Sistema movimenta estoque automaticamente
```

## Segurança

- Usuários anônimos podem apenas **criar** requisições
- Usuários anônimos **não podem** editar ou excluir
- Apenas estoquistas autenticados podem processar requisições
- Todas as movimentações ficam registradas no sistema

## Suporte

Para dúvidas ou problemas, contate o administrador do sistema.
