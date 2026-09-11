# Análise Comercial — Compra x Venda

Sistema de análise comercial para relacionar compras e vendas do supermercado por fornecedor e por produto (SKU), com foco em qualidade da compra, giro, margem, excesso, ruptura, bonificações, devoluções e planejamento de compras.

## Estado atual

O projeto está em desenvolvimento e utiliza inicialmente:

- Google Sheets como base operacional e camada de visualização;
- Google Apps Script para importação, tratamento e geração das análises;
- arquivos CSV exportados do Varejo Fácil como fontes de compras e vendas;
- GitHub como repositório de código e documentação.

A principal visão operacional é `ANALISE_FORNECEDOR_SKU`, complementada por análises consolidadas por fornecedor e por produto.

## Fluxo geral

1. Exportar os relatórios de compras e vendas do Varejo Fácil.
2. Importar os CSVs para `COMPRAS_RAW` e `VENDAS_RAW`.
3. Normalizar unidades de compra para unidades comerciais comparáveis às vendas.
4. Separar bonificações e devoluções.
5. Aplicar equivalências e regras de SKUs especiais.
6. Gerar as análises por fornecedor/SKU, fornecedor e produto consolidado.
7. Atualizar auditoria e dashboard.

## Documentação

- [PRD](docs/PRD.md)
- [Arquitetura](docs/ARQUITETURA.md)
- [Modelo de dados](docs/MODELO-DE-DADOS.md)
- [Regras de negócio](docs/REGRAS-DE-NEGOCIO.md)
- [Indicadores](docs/INDICADORES.md)
- [Importação do Varejo Fácil](docs/IMPORTACAO-VAREJO-FACIL.md)
- [Conversão de unidades](docs/CONVERSAO-DE-UNIDADES.md)

## Código

O código Apps Script atual ainda será sincronizado com este repositório. A estrutura prevista é `src/`, com os arquivos `.gs` que hoje estão no projeto Apps Script.

## Observação importante

Os indicadores de saldo, cobertura, ruptura e excesso são atualmente calculados a partir dos movimentos dentro da janela analisada. Enquanto o projeto não incorporar estoque inicial/físico confiável, esses indicadores não devem ser interpretados como fotografia exata do estoque disponível.