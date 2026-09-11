# Modelo de Dados

Este documento registra a estrutura lógica conhecida das principais abas. Cabeçalhos devem ser mantidos sincronizados com o código Apps Script.

## COMPRAS_RAW

Estrutura alvo aprovada para a próxima migração:

```text
data_emissao
data_entrada
nota
fornecedor_cod
fornecedor
produto_cod
produto
unidade_compra
unidades_por_embalagem
qtd_compra_convertida
custo_unit
valor_total
operacao
qtd_original_compra
fator_conversao_aplicado
```

Observação: esta nomenclatura é a estrutura alvo. A migração do código e da planilha deve ocorrer de forma controlada para não quebrar rotinas que ainda leem os nomes anteriores.

## VENDAS_RAW

```text
data_venda
produto_cod
produto
qtd
faturamento
preco_medio
custo_total
lucro
margem
```

## MOVIMENTOS_ESPECIAIS

```text
data_entrada
nota
fornecedor_cod
fornecedor
produto_cod
produto
operacao
qtd
valor_total
```

## MAPA_CONVERSAO_UNIDADE

```text
produto_cod
produto
unidade_compra
fator_conversao
origem
status
observacao
```

Chave lógica: `produto_cod + unidade_compra`.

## CONVERSOES_PENDENTES

```text
produto_cod
produto
unidade_compra
qtd_unidade
qtd_compra
valor_compra
qtd_venda
custo_unitario_venda
fator_estimado
status
```

Esta é uma fila derivada e pode ser regenerada.

## MAPA_PRODUTO_ANALISE

```text
produto_cod
produto
produto_analise_cod
produto_analise
```

Permite consolidar SKUs físicos distintos no mesmo produto econômico.

## MAPA_SKU_ESPECIAL

```text
produto_cod
produto
tipo_sku
observacao
```

Usado para regras especiais, incluindo SKU compartilhado entre fornecedores.

## ANALISE_SKU

```text
fornecedor_cod
fornecedor
produto_cod
produto
secao
grupo
qtd_compra
valor_compra
qtd_bonificacao
valor_bonificacao
qtd_disponibilizada
qtd_venda
valor_venda
qtd_devolucao
valor_devolucao
custo_medio
custo_efetivo
custo_venda
lucro
margem
saldo_movimentacao
indice_aproveitamento
giro
status
```

## ANALISE_FORNECEDOR_SKU

```text
fornecedor_cod
fornecedor
produto_cod
produto
qtd_compra
valor_compra
qtd_bonificacao
valor_bonificacao
qtd_disponibilizada
qtd_venda
valor_venda
qtd_devolucao
valor_devolucao
custo_medio
custo_efetivo
custo_venda
valor_venda_media_un
lucro
margem
faturamento_dia
classe_abc
saldo_movimentacao
saldo_periodo_valor
qtd_venda_media_dia
cobertura_dias
indice_aproveitamento
giro
status
status_operacional
status_financeiro
acao_sugerida
```

## ANALISE_FORNECEDOR

```text
fornecedor_cod
fornecedor
qtd_skus
qtd_compra
valor_compra
qtd_bonificacao
valor_bonificacao
qtd_disponibilizada
qtd_venda
valor_venda
qtd_devolucao
valor_devolucao
custo_venda
lucro
margem
giro
part_compra
part_venda
rank_venda
rank_lucro
```

## ANALISE_SKU_CONSOLIDADA

```text
produto_cod
produto
qtd_fornecedores
qtd_compra
valor_compra
qtd_bonificacao
valor_bonificacao
qtd_disponibilizada
qtd_venda
valor_venda
qtd_devolucao
valor_devolucao
custo_medio
custo_efetivo
custo_venda
lucro
margem
saldo_movimentacao
indice_aproveitamento
giro
fornecedor_principal
part_fornecedor_principal
status
```

## Abas permanentes versus regeneráveis

Permanentes/configuração:

- `MAPA_PRODUTO_ANALISE`
- `MAPA_SKU_ESPECIAL`
- `MAPA_CONVERSAO_UNIDADE`

Regeneráveis/importadas:

- `COMPRAS_RAW`
- `VENDAS_RAW`
- `MOVIMENTOS_ESPECIAIS`
- `CONVERSOES_PENDENTES`
- `VENDAS_SEM_COMPRA`
- abas `ANALISE_*`
- `AUDITORIA`
- `DASHBOARD`.