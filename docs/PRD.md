# PRD — Análise Comercial Compra x Venda

## 1. Visão geral

Construir um sistema de análise comercial capaz de relacionar compras e vendas por fornecedor e por produto (SKU), permitindo avaliar se as quantidades compradas são coerentes com as vendas, se o faturamento e o lucro justificam o capital empregado e quais itens exigem reposição, redução de compra ou investigação.

O sistema deve apoiar decisões de compra por fornecedor, seção e produto e criar uma base confiável para orçamento de compras.

## 2. Objetivos de negócio

O sistema deve responder, entre outras, às seguintes perguntas:

### Fornecedor

- Quanto foi comprado?
- Quanto foi disponibilizado considerando bonificações e devoluções?
- Quanto os produtos vinculados ao fornecedor venderam?
- Qual faturamento, lucro e margem foram gerados?
- Qual a participação do fornecedor nas compras e vendas?
- Quais SKUs do fornecedor estão saudáveis, em excesso, em atenção ou com risco de ruptura?

### Produto / SKU

- A quantidade comprada está coerente com a quantidade vendida?
- O produto está girando?
- Há excesso de capital empregado?
- Há risco de ruptura?
- Qual o custo médio e o custo efetivo após bonificações?
- Qual lucro e margem são gerados?
- Há devoluções relevantes?
- A unidade de compra está corretamente convertida para a unidade comercial de venda?

### Planejamento

- Quanto deve ser comprado do fornecedor?
- Quais produtos devem ser priorizados, reduzidos ou suspensos?
- Quanto de capital está comprometido em itens de baixo giro?
- Como construir orçamento por fornecedor, seção e produto?

## 3. Plataforma

MVP e operação atual:

- Google Sheets;
- Google Apps Script;
- CSVs exportados do Varejo Fácil;
- Google Drive para arquivos de importação;
- GitHub para versionamento de código e documentação.

## 4. Fontes de dados

### Compras

Relatório: Varejo Fácil > Compra > Nota Fiscal Entrada.

Data analítica principal: data de entrada, com data de emissão preservada.

A importação deve preservar fornecedor, produto, unidade de compra, quantidade fiscal/original, quantidade convertida, custo unitário, valor total do item e operação.

Operações relevantes:

- compra normal;
- bonificação;
- devolução de mercadoria.

### Vendas

Relatório: Varejo Fácil > Venda > ABC Venda.

Campos analíticos principais: data, produto, quantidade, faturamento, preço médio, custo informado pelo ERP, lucro e margem informados pelo ERP.

Os custos do arquivo de vendas podem ser utilizados para diagnóstico, mas o custo analítico principal do projeto é reconstruído a partir das compras vinculadas.

## 5. Chaves e granularidade

A chave física principal é o código numérico do produto.

A descrição é usada para exibição e apoio à auditoria, não como chave principal.

Granularidades principais:

- fornecedor + SKU + período;
- fornecedor + período;
- produto econômico consolidado + período.

## 6. Normalização de unidades

Compras podem ocorrer em `CX`, `FD`, `DP`, `UN`, `KG` e outras unidades enquanto as vendas podem ocorrer em unidades comerciais diferentes.

A análise só pode comparar compra e venda depois de normalizar a quantidade comprada para a unidade comercial equivalente à venda.

Conversões automáticas e manuais são controladas por regras documentadas em `MAPA_CONVERSAO_UNIDADE`. Casos não confirmados ficam em `CONVERSOES_PENDENTES` e devem ser marcados como `CONVERSAO_PENDENTE` nas análises, evitando diagnóstico operacional enganoso.

## 7. Operações especiais

### Bonificação

Bonificações aumentam a quantidade disponibilizada sem aumentar o valor de compra normal, reduzindo o custo efetivo das unidades disponíveis.

### Devolução

Devoluções são preservadas separadamente porque podem se referir a compras realizadas antes da janela de análise.

### SKU compartilhado

Um SKU pode ser comprado de múltiplos fornecedores sem rastreabilidade do fornecedor no momento da venda. Esses casos podem exigir regra específica de atribuição e são cadastrados em `MAPA_SKU_ESPECIAL`.

### Produto econômico equivalente

SKUs físicos diferentes podem representar o mesmo produto econômico para análise. O agrupamento é controlado por `MAPA_PRODUTO_ANALISE`.

## 8. Métricas financeiras

Conceitos principais:

- `qtd_disponibilizada = qtd_compra + qtd_bonificacao - qtd_devolucao`;
- `custo_medio = valor_compra / qtd_compra`;
- `custo_efetivo = valor_compra / (qtd_compra + qtd_bonificacao)`, observadas as regras aplicáveis;
- `custo_venda = qtd_venda × custo_efetivo`;
- `lucro = valor_venda - custo_venda`;
- `margem = lucro / valor_venda`.

O `valor_total` da compra deve permanecer o `Valor total do item` importado do relatório, pois representa o valor financeiro alocado ao item e reconcilia com o valor do documento, incluindo efeitos aplicáveis como descontos, ICMS-ST e FECOP-ST.

## 9. Visões analíticas

### ANALISE_FORNECEDOR_SKU

Principal visão operacional. Reúne compra, venda, bonificação, devolução, custos, lucro, margem, cobertura, ABC, status operacional, status financeiro e ação sugerida.

### ANALISE_FORNECEDOR

Consolidação por fornecedor, com compras, vendas, lucro, margem, giro, participações e rankings.

### ANALISE_SKU

Análise por fornecedor + SKU, usada também como base intermediária para outras consolidações.

### ANALISE_SKU_CONSOLIDADA

Consolidação do produto econômico, inclusive quando há múltiplos fornecedores ou equivalências de SKU.

### AUDITORIA e DASHBOARD

Auditoria verifica cobertura e coerência dos dados. Dashboard apresenta os principais indicadores gerenciais.

## 10. Classificações

### ABC

Classificação por participação acumulada no faturamento:

- A: primeiros 80%;
- B: 80% a 95%;
- C: 95% a 100%.

### Status operacional

Referência atual por cobertura:

- até 7 dias: `RUPTURA`;
- 8 a 15 dias: `ATENCAO`;
- 16 a 30 dias: `SAUDAVEL`;
- acima de 30 dias: `EXCESSO`;
- sem venda: `SEM_GIRO`.

Casos com conversão não validada recebem prioridade de diagnóstico `CONVERSAO_PENDENTE`.

### Status financeiro

Referência atual por margem:

- até 10%: `MARGEM_MUITO_BAIXA`;
- 11% a 19%: `MARGEM_BAIXA`;
- 20% a 35%: `MARGEM_NORMAL`;
- acima de 35%: `MARGEM_ALTA`.

## 11. Limitações atuais

O sistema ainda não possui estoque inicial/físico confiável integrado à análise. Portanto, saldo de movimentação, cobertura, ruptura e excesso descrevem principalmente a relação dos movimentos dentro da janela analisada e não devem ser interpretados isoladamente como estoque físico atual.

Uma compra anterior ao início da janela pode sustentar vendas do período e não aparecer nas compras filtradas. A evolução do projeto deve tratar estoque inicial ou uma janela histórica adequada.

## 12. Roadmap

### Estabilização atual

- concluir normalização das unidades de compra;
- consolidar documentação e versionamento do Apps Script no GitHub;
- validar indicadores e tratamentos especiais;
- manter auditoria das importações e análises.

### Próximas etapas

- incorporar estoque inicial/físico;
- melhorar orçamento e sugestão de compra;
- análises mensais e tendências;
- orçamento por fornecedor, seção e produto;
- previsão de ruptura/excesso;
- metas e acompanhamento de fornecedores.