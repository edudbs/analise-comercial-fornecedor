# Importação — Varejo Fácil

## Compras

Caminho:

`Varejo Fácil > Compra > Nota Fiscal Entrada`

Parâmetros operacionais conhecidos:

- Fornecedor: conforme escopo da análise;
- Data: entrada;
- Tipo: Analítico;
- Situação: Efetivada (EFT);
- Formato: CSV.

O arquivo deve ser salvo diretamente na pasta de importação de compras no Google Drive, sem subpastas intermediárias.

A importação deve separar compras normais de bonificações e devoluções e preservar os campos necessários para conversão de unidade e reconciliação financeira.

## Vendas

Caminho:

`Varejo Fácil > Venda > ABC Venda`

Parâmetros operacionais conhecidos:

- Período Inicial;
- Período Final;
- Fornecedor, conforme escopo;
- Quebra nível 1: Data;
- Classifica ABC;
- Considerar fornecedor secundário;
- Formato: CSV.

O arquivo deve ser salvo diretamente na pasta de importação de vendas no Google Drive.

## Cuidados

- Não alterar manualmente códigos de produto.
- Conferir o período antes da exportação.
- Não deduzir embalagem a partir da descrição do produto.
- Após importar vendas, atualizar a fila de conversões pendentes para que estimativas possam usar o histórico de vendas disponível.
- Auditoria deve ser executada após importação e geração das análises.