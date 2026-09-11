# Regras de Negócio

## Período

Compras são analisadas principalmente pela data de entrada. Vendas utilizam `data_venda`.

Uma janela curta pode omitir compras anteriores que ainda sustentam vendas atuais. Por isso, indicadores de saldo/cobertura devem ser interpretados como movimento do período enquanto não houver estoque inicial integrado.

## Quantidade disponibilizada

```text
qtd_disponibilizada = qtd_compra + qtd_bonificacao - qtd_devolucao
```

Devoluções são mantidas separadas porque podem estar relacionadas a compras de períodos anteriores.

## Bonificação

Bonificação aumenta quantidade disponível sem compor o valor de compra normal. Seu efeito principal é reduzir o custo efetivo das unidades disponibilizadas.

## Custos

```text
custo_medio = valor_compra / qtd_compra
custo_efetivo = valor_compra / (qtd_compra + qtd_bonificacao)
custo_venda = qtd_venda × custo_efetivo
lucro = valor_venda - custo_venda
margem = lucro / valor_venda
```

Devem ser tratados divisores zero e situações sem compra normal.

## Valor financeiro da compra

`valor_total` deve ser importado do campo `Valor total do item` do Varejo Fácil e não recalculado simplesmente como quantidade convertida × custo unitário.

Esse valor pode refletir desconto, ICMS-ST, FECOP-ST e outros componentes aplicáveis e deve reconciliar com o valor do documento fiscal.

A conversão de embalagem altera a quantidade analítica, não o valor financeiro total do item.

## Conversão de embalagem

Descrições de produto não devem ser interpretadas automaticamente para determinar fator de embalagem. Exemplo: `C/12` no nome de um produto pode descrever o conteúdo da unidade comercial, e não a quantidade de unidades por fardo.

Conversões confirmadas ficam em `MAPA_CONVERSAO_UNIDADE`. Conversões incertas ficam pendentes.

## Produto econômico equivalente

`MAPA_PRODUTO_ANALISE` permite consolidar diferentes códigos físicos que representam o mesmo produto econômico para análise.

Exemplo conhecido: SKUs distintos de uma mesma bebida vendidos em condições diferentes podem ser consolidados sob um código de análise comum.

## SKU compartilhado

Quando um SKU é comprado de mais de um fornecedor e a venda não registra qual fornecedor originou a unidade vendida, não existe rastreabilidade perfeita.

Esses casos devem ser explicitamente identificados em `MAPA_SKU_ESPECIAL` e tratados por regra própria, sem fingir precisão inexistente.

Para SKU compartilhado, a regra corrente pode atribuir venda até o limite da quantidade disponibilizada e estimar o valor atribuído a partir do preço médio real de venda.

## Conversão pendente e status

Uma conversão não validada tem precedência sobre classificações operacionais como ruptura ou excesso. O produto deve aparecer como `CONVERSAO_PENDENTE`, com ação sugerida `VALIDAR_CONVERSAO`, até a unidade ser confirmada.

## Limpeza das bases

Rotinas de limpeza podem apagar dados importados e derivados, preservando cabeçalhos quando aplicável.

Nunca devem apagar as configurações permanentes:

- `MAPA_PRODUTO_ANALISE`;
- `MAPA_SKU_ESPECIAL`;
- `MAPA_CONVERSAO_UNIDADE`.