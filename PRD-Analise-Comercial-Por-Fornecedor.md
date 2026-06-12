# PRD — Análise Comercial por Fornecedor

## Visão Geral

### Objetivo

Construir um sistema de análise comercial capaz de relacionar compras e vendas por fornecedor e por SKU, permitindo identificar oportunidades de melhoria operacional, planejamento de compras, excesso de estoque, rupturas, margens e desempenho comercial.

O projeto será independente do projeto Hortifruti, embora possa aproveitar conceitos arquiteturais já validados.

---

# Objetivos de Negócio

O sistema deverá responder:

## Visão Fornecedor

* Quanto foi comprado de cada fornecedor.
* Quanto foi vendido dos produtos daquele fornecedor.
* Qual faturamento foi gerado.
* Qual margem foi gerada.
* Qual participação no faturamento da loja.
* Qual participação nas compras da loja.
* Quais fornecedores apresentam melhor desempenho.
* Quais fornecedores apresentam excesso ou ruptura.

## Visão Produto

* Quais produtos estão com compras acima do necessário.
* Quais produtos apresentam ruptura.
* Quais produtos possuem giro saudável.
* Quais produtos apresentam margem inadequada.
* Quais produtos apresentam indícios de perdas ou quebras.

## Planejamento

* Apoiar elaboração de orçamento de compras.
* Apoiar negociações com fornecedores.
* Apoiar decisões de reposição.
* Apoiar definição de metas por fornecedor.

---

# Premissas

## Fornecedor e SKU

Um mesmo SKU pode ser comprado de múltiplos fornecedores.

Exemplo:

| SKU          | Fornecedor   |
| ------------ | ------------ |
| Coca-Cola 2L | Fornecedor A |
| Coca-Cola 2L | Fornecedor B |

A análise deverá preservar essa informação.

Não haverá consolidação automática de fornecedores para um SKU.

A granularidade analítica será:

```text
Período + Fornecedor + SKU
```

---

# Arquitetura de Dados

## Camada 1 — Dados Brutos

### COMPRAS_RAW

Origem:

Exportação de compras/notas fiscais.

Campos mínimos:

| Campo             |
| ----------------- |
| data_compra       |
| numero_nota       |
| fornecedor_codigo |
| fornecedor_nome   |
| codigo_produto    |
| descricao_produto |
| quantidade        |
| valor_total       |
| custo_unitario    |

---

### VENDAS_RAW

Origem:

Exportação do ERP.

Campos mínimos:

| Campo             |
| ----------------- |
| data_venda        |
| codigo_produto    |
| descricao_produto |
| quantidade        |
| valor_venda       |

---

# Camada 2 — Cadastros

## PRODUTOS

Cadastro único de produtos.

| Campo             |
| ----------------- |
| codigo_produto    |
| descricao_produto |
| secao             |
| grupo             |
| subgrupo          |
| ativo             |

---

## FORNECEDORES

Cadastro único de fornecedores.

| Campo             |
| ----------------- |
| fornecedor_codigo |
| fornecedor_nome   |

---

# Camada 3 — Base Analítica

## BASE_FORNECEDOR_SKU

Granularidade:

```text
Período + Fornecedor + SKU
```

Campos:

| Campo                  |
| ---------------------- |
| periodo_inicio         |
| periodo_fim            |
| fornecedor_codigo      |
| fornecedor_nome        |
| codigo_produto         |
| descricao_produto      |
| secao                  |
| grupo                  |
| qtd_comprada           |
| valor_comprado         |
| custo_medio            |
| qtd_vendida            |
| valor_vendido          |
| custo_estimado_vendido |
| saldo_qtd              |
| giro_qtd               |
| lucro_bruto            |
| margem_pct             |

---

# Indicadores

## Quantidade Comprada

```text
Soma das quantidades compradas
```

---

## Quantidade Vendida

```text
Soma das quantidades vendidas
```

---

## Saldo Estimado

```text
Quantidade Comprada - Quantidade Vendida
```

---

## Valor Comprado

```text
Soma dos valores de compra
```

---

## Valor Vendido

```text
Soma dos valores de venda
```

---

## Lucro Bruto

```text
Valor Vendido - Custo Estimado Vendido
```

---

## Margem Bruta

```text
Lucro Bruto ÷ Valor Vendido
```

---

## Giro Quantitativo

```text
Quantidade Vendida ÷ Quantidade Comprada
```

---

# Classificação Operacional

Cada SKU deverá receber uma classificação automática.

## Saudável

Condições:

* Giro adequado.
* Margem adequada.
* Saldo adequado.

---

## Excesso

Condições:

* Saldo elevado.
* Baixo giro.

---

## Ruptura

Condições:

* Venda superior à compra no período.

---

## Atenção

Condições:

* Margem abaixo da meta.
* Giro abaixo da meta.

---

# Visão Analítica por Fornecedor

## ANALISE_FORNECEDOR

Granularidade:

```text
Período + Fornecedor
```

Campos:

| Campo                |
| -------------------- |
| fornecedor_codigo    |
| fornecedor_nome      |
| valor_comprado       |
| valor_vendido        |
| lucro_bruto          |
| margem_pct           |
| qtd_skus             |
| participacao_compras |
| participacao_vendas  |
| ranking_vendas       |
| ranking_lucro        |

---

# Visão Analítica por SKU

## ANALISE_FORNECEDOR_SKU

Granularidade:

```text
Período + Fornecedor + SKU
```

Campos:

| Campo             |
| ----------------- |
| fornecedor        |
| codigo_produto    |
| descricao_produto |
| comprado          |
| vendido           |
| saldo             |
| giro              |
| lucro             |
| margem            |
| status            |

---

# Filtros Obrigatórios

O sistema deverá permitir filtros por:

* Data inicial.
* Data final.
* Fornecedor.
* Seção.
* Grupo.
* Produto.

---

# Alertas

## Excesso de Estoque

Exibir:

* Quantidade de produtos em excesso.
* Valor estimado imobilizado.

---

## Ruptura

Exibir:

* Quantidade de produtos com ruptura.
* Impacto estimado.

---

## Margem Baixa

Exibir:

* Produtos abaixo da margem mínima.

---

# Dashboard Executivo

Indicadores principais:

## Compras

Valor total comprado.

## Vendas

Valor total vendido.

## Lucro Bruto

Lucro estimado gerado.

## Margem Média

Margem média do período.

## Giro Médio

Giro médio dos produtos.

## Top Fornecedores

Ranking por vendas.

## Top Margens

Ranking por lucro.

## Alertas

* Excessos.
* Rupturas.
* Margens críticas.

---

# Roadmap

## Fase 1 — MVP

Objetivo:

Criar análise básica de compras x vendas.

Entregas:

* Importação de compras.
* Importação de vendas.
* Cadastro de fornecedores.
* Cadastro de produtos.
* BASE_FORNECEDOR_SKU.
* ANALISE_FORNECEDOR.
* ANALISE_FORNECEDOR_SKU.
* Filtros por período.

---

## Fase 2

Entregas:

* Classificação automática.
* Alertas.
* Ranking de fornecedores.
* Comparação mensal.

---

## Fase 3

Entregas:

* Sugestão de compras.
* Planejamento de orçamento.
* Projeção de reposição.
* Metas por fornecedor.
* Previsão de ruptura.

---

# Critérios de Sucesso

O projeto será considerado bem-sucedido quando permitir:

1. Identificar rapidamente excessos e rupturas.
2. Avaliar desempenho comercial dos fornecedores.
3. Avaliar desempenho individual dos SKUs.
4. Apoiar decisões de compra.
5. Apoiar negociações comerciais.
6. Reduzir capital imobilizado em estoque.
7. Melhorar o giro dos produtos.
