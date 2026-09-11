# Indicadores

A principal visão operacional atual é `ANALISE_FORNECEDOR_SKU`.

## Quantidades e movimentos

### qtd_compra
Quantidade comprada em operações normais, já normalizada para a unidade comercial de análise.

### qtd_bonificacao
Quantidade recebida sem compor a compra normal.

### qtd_devolucao
Quantidade devolvida. É apresentada separadamente porque a devolução pode se referir a compras anteriores ao período.

### qtd_disponibilizada
Relação líquida dos movimentos de entrada considerados na janela:

```text
qtd_compra + qtd_bonificacao - qtd_devolucao
```

### qtd_venda
Quantidade vendida vinculada ao SKU/fornecedor conforme as regras de atribuição do projeto.

## Valores

### valor_compra
Valor financeiro das compras normais, baseado no `Valor total do item` importado.

### valor_bonificacao
Valor informativo das bonificações.

### valor_devolucao
Valor das devoluções.

### valor_venda
Faturamento atribuído ao SKU/fornecedor.

### valor_venda_media_un
Valor médio de venda por unidade.

## Custos e resultado

### custo_medio
Custo médio das unidades compradas normalmente.

### custo_efetivo
Custo ajustado pelo efeito das bonificações. Quando há bonificação, o mesmo valor de compra é distribuído por uma quantidade maior de unidades disponíveis.

### custo_venda
Custo estimado das unidades efetivamente vendidas com base no custo efetivo.

### lucro

```text
valor_venda - custo_venda
```

### margem

```text
lucro / valor_venda
```

## Ritmo e capital

### faturamento_dia
Faturamento médio por dia no período.

### qtd_venda_media_dia
Quantidade média vendida por dia.

### saldo_movimentacao
Diferença entre quantidade disponibilizada e quantidade vendida dentro da janela analisada.

Não representa necessariamente estoque físico atual.

### saldo_periodo_valor
Estimativa do valor associado ao saldo de movimentação do período.

### cobertura_dias
Quantidade de dias que o saldo de movimentação representaria no ritmo médio de venda do período.

Como ainda não há estoque inicial/físico integrado, deve ser interpretada como indicador operacional da janela, não como cobertura física exata.

### indice_aproveitamento
Percentual da quantidade disponibilizada que foi vendida no período.

### giro
Indicador da relação entre vendas e quantidade disponibilizada conforme a regra implementada no projeto.

## ABC

`classe_abc` classifica o SKU pela participação acumulada no faturamento:

- A: primeiros 80%;
- B: próximos 15%;
- C: últimos 5%.

## Status operacional

Referência atual:

- `RUPTURA`: cobertura até 7 dias;
- `ATENCAO`: 8 a 15 dias;
- `SAUDAVEL`: 16 a 30 dias;
- `EXCESSO`: acima de 30 dias;
- `SEM_GIRO`: ausência de venda.

`CONVERSAO_PENDENTE` tem precedência quando a unidade de compra ainda não foi validada.

## Status financeiro

Referência atual:

- `MARGEM_MUITO_BAIXA`: até 10%;
- `MARGEM_BAIXA`: 11% a 19%;
- `MARGEM_NORMAL`: 20% a 35%;
- `MARGEM_ALTA`: acima de 35%.

## Ação sugerida

`acao_sugerida` transforma os diagnósticos em orientação operacional. Para conversão não validada, a ação deve ser `VALIDAR_CONVERSAO` antes de qualquer decisão de compra baseada no giro/cobertura.

## Regra de interpretação

Nenhum indicador deve ser interpretado isoladamente. Compra, venda, margem, cobertura, bonificações, devoluções, conversão de embalagem e existência de estoque anterior precisam ser considerados em conjunto.