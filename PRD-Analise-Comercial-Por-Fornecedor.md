PRD — ANÁLISE COMERCIAL POR FORNECEDOR

1. Visão Geral

Objetivo

Construir um sistema de análise comercial capaz de relacionar compras e vendas por fornecedor e por produto (SKU), permitindo avaliar:

- desempenho de fornecedores;
- desempenho de produtos;
- excesso de estoque;
- ruptura;
- margem;
- giro;
- planejamento de compras;
- orçamento por fornecedor;
- auditoria operacional.

O sistema deverá funcionar inicialmente em Google Sheets + Apps Script.

---

2. Objetivos de Negócio

O sistema deve responder:

Fornecedor

- Quanto foi comprado de cada fornecedor.
- Quanto foi vendido dos produtos daquele fornecedor.
- Qual faturamento foi gerado.
- Qual lucro foi gerado.
- Qual margem foi gerada.
- Qual participação no faturamento da loja.
- Qual participação nas compras da loja.
- Quais fornecedores apresentam melhor desempenho.

Produto

- Estou comprando demais?
- Estou comprando de menos?
- Existe ruptura?
- Existe excesso?
- Existe estoque parado?
- Qual o giro do produto?
- Qual margem o produto gera?

Planejamento

- Quanto devo comprar do fornecedor?
- Quais produtos precisam de reposição?
- Quais fornecedores estão crescendo?
- Quais fornecedores estão perdendo participação?

---

3. Fontes de Dados

Compras

Arquivo:

Relatório Analítico de Notas Fiscais de Compra

Campos disponíveis:

- Data de Emissão
- Data de Entrada
- Número da Nota
- Código do Fornecedor
- Nome do Fornecedor
- Código do Produto
- Descrição do Produto
- Quantidade
- Valor Unitário
- Valor Total

---

Vendas

Arquivo:

Relatório ABC de Venda

Campos disponíveis:

- Quebra (data da venda)
- Código do Produto
- Descrição
- Quantidade
- Faturamento
- Preço Médio
- Custo Total
- Lucro
- Margem

---

4. Chave Oficial

A chave principal do sistema será:

codigo_produto

A descrição do produto será utilizada apenas para exibição.

---

5. Regra de Período

Toda análise deverá ser realizada dentro de um período definido pelo usuário.

Modo Mensal

Exemplo:

- Junho/2026

Sistema converte para:

- Data Inicial: 01/06/2026
- Data Final: 30/06/2026

Modo Personalizado

Exemplo:

- 10/06/2026
- 25/06/2026

O sistema deverá considerar apenas registros dentro desse intervalo.

---

6. Regra de Datas

Compras

Data utilizada:

Data de Entrada

Fallback:

Data de Emissão

Vendas

A coluna:

Quebra

será tratada como:

data_venda

---

7. Regra de Fornecedor

O fornecedor será obtido diretamente dos arquivos de compras.

Cada compra mantém sua origem original.

Não haverá consolidação automática de fornecedores.

---

8. Múltiplos Fornecedores para o Mesmo SKU

É permitido que um mesmo SKU seja comprado de múltiplos fornecedores.

Exemplo:

SKU| Fornecedor
Coca-Cola 2L| Fornecedor A
Coca-Cola 2L| Fornecedor B

A análise deverá preservar essa informação.

Granularidade:

Fornecedor + SKU + Período

---

9. Estrutura Analítica

ANALISE_SKU

Granularidade:

Fornecedor + SKU + Período

Campos:

- fornecedor_codigo
- fornecedor_nome
- codigo_produto
- descricao_produto
- secao
- grupo
- qtd_comprada
- valor_comprado
- custo_medio
- qtd_vendida
- valor_vendido
- custo_total_vendido
- lucro
- margem
- saldo_qtd
- giro
- status

---

ANALISE_FORNECEDOR

Granularidade:

Fornecedor + Período

Campos:

- fornecedor_codigo
- fornecedor_nome
- valor_comprado
- qtd_comprada
- valor_vendido
- qtd_vendida
- lucro_total
- margem_media
- qtd_skus
- participacao_compras
- participacao_vendas
- ranking_vendas
- ranking_lucro

---

10. Indicadores

Saldo

saldo_qtd = comprado - vendido

---

Giro

giro = vendido / comprado

---

Lucro

Utilizar valor já calculado no arquivo de vendas.

---

Margem

Utilizar margem já calculada no arquivo de vendas.

---

11. Classificação Operacional

Saudável

- Giro adequado
- Saldo adequado

Excesso

- Saldo elevado
- Baixo giro

Ruptura

- Venda superior à compra

Atenção

- Margem abaixo da meta

---

12. Dashboard

Indicadores principais:

- Compras
- Vendas
- Lucro
- Margem
- Giro
- Ranking de fornecedores
- Ranking de produtos
- Alertas de excesso
- Alertas de ruptura

---

13. Roadmap

MVP

- Importação de compras CSV
- Importação de vendas CSV
- Configuração de período
- Geração da ANALISE_SKU
- Geração da ANALISE_FORNECEDOR
- Dashboard básico

Fase 2

- Alertas automáticos
- Ranking avançado
- Comparação mensal

Fase 3

- Sugestão de compras
- Planejamento de orçamento
- Previsão de ruptura
- Metas por fornecedor
