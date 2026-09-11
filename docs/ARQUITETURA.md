# Arquitetura

## Visão geral

O projeto utiliza Google Sheets como base operacional e Apps Script como camada de processamento.

Fluxo:

`Varejo Fácil → CSV → Google Drive → Apps Script → RAW → normalização → análises → auditoria/dashboard`

## Camadas

### 1. Origem

Relatórios CSV de compras e vendas exportados do Varejo Fácil.

### 2. Dados brutos

- `COMPRAS_RAW`
- `VENDAS_RAW`

A camada RAW deve preservar os dados necessários para auditoria e reprocessamento. Em compras, a quantidade fiscal/original não deve ser perdida quando houver conversão de embalagem.

### 3. Configuração permanente

- `MAPA_PRODUTO_ANALISE`
- `MAPA_SKU_ESPECIAL`
- `MAPA_CONVERSAO_UNIDADE`

Essas abas representam regras de negócio e não devem ser apagadas por rotinas de limpeza das bases.

### 4. Tratamento e exceções

- `MOVIMENTOS_ESPECIAIS`
- `CONVERSOES_PENDENTES`
- `VENDAS_SEM_COMPRA`

### 5. Camada analítica

- `ANALISE_SKU`
- `ANALISE_SKU_CONSOLIDADA`
- `ANALISE_FORNECEDOR_SKU`
- `ANALISE_FORNECEDOR`

### 6. Controle gerencial

- `AUDITORIA`
- `DASHBOARD`

## Princípios

### Idempotência das conversões

Reprocessar uma conversão nunca deve multiplicar uma quantidade já convertida. A quantidade convertida é sempre recalculada a partir da quantidade original preservada.

### Separação entre dado e regra

Dados importados ficam nas abas RAW. Regras confirmadas ficam em mapas permanentes. Casos incertos ficam em filas de pendência e não devem ser transformados silenciosamente em regra.

### Rastreabilidade financeira

O valor total do item importado deve ser preservado para permitir reconciliação com a nota/documento de compra.

### Código de produto como chave

O código numérico do produto é a chave física principal. Descrições servem para exibição e auditoria.

## Versionamento

O GitHub deve se tornar a fonte oficial do código Apps Script e da documentação. O diretório `src/` será usado para armazenar os arquivos `.gs` sincronizados com a versão operacional.