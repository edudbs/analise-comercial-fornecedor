# Conversão de Unidades de Compra

## Problema

O relatório de compras pode registrar quantidades em embalagens fiscais (`CX`, `FD`, `DP` etc.), enquanto as vendas são registradas na unidade comercial vendida ao cliente.

Comparar diretamente essas quantidades gera falsos diagnósticos de giro, ruptura e excesso.

## Conceitos

Estrutura alvo da `COMPRAS_RAW`:

- `unidade_compra`: unidade informada no relatório de compra;
- `unidades_por_embalagem`: quantidade de unidades comerciais contidas na embalagem de compra;
- `qtd_original_compra`: quantidade original/fiscal antes de conversão;
- `fator_conversao_aplicado`: fator efetivamente utilizado;
- `qtd_compra_convertida`: quantidade normalizada para comparação com vendas.

Exemplo:

```text
unidade_compra = CX
unidades_por_embalagem = 12
qtd_original_compra = 5
fator_conversao_aplicado = 12
qtd_compra_convertida = 60
```

## Regra automática atual

### UN

Fator 1.

### KG

Preserva a regra especial já validada pelo projeto: quando `qtd_unidade > 1` e quantidade de itens > 1, a quantidade analítica é o produto entre ambas; caso contrário, mantém a quantidade de itens.

### Outras unidades

Quando a quantidade por embalagem informada pelo relatório é maior que 1, o fator pode ser aplicado automaticamente.

Quando é menor ou igual a 1, o sistema procura uma regra `VALIDADO` em `MAPA_CONVERSAO_UNIDADE`. Se não existir, o caso permanece pendente.

## MAPA_CONVERSAO_UNIDADE

```text
produto_cod | produto | unidade_compra | fator_conversao | origem | status | observacao
```

Chave: `produto_cod + unidade_compra`.

Somente regras confirmadas devem ser registradas como `VALIDADO`.

Fator 1 também pode ser uma regra válida quando a unidade `CX` é apenas uma classificação fiscal/cadastral e a quantidade do relatório já representa unidades comerciais.

## CONVERSOES_PENDENTES

Fila derivada para produtos que ainda precisam de validação.

A estimativa de fator é apenas apoio à investigação e nunca deve ser aplicada automaticamente.

O custo de venda usado para estimativa deve evitar valores claramente contaminados por custo de embalagem. A lógica atual utiliza mediana de custos unitários plausíveis, filtrando custos incompatíveis com o preço de venda.

## Reprocessamento idempotente

O reprocessamento deve sempre partir de `qtd_original_compra`, nunca de `qtd_compra_convertida`.

Se um fator mudar de 30 para 24:

```text
correto: 1 × 24 = 24
incorreto: 30 × 24 = 720
```

Assim, executar o reprocessamento várias vezes não deve acumular multiplicações.

## Fluxo operacional

1. Importar compras.
2. Gerar/atualizar `CONVERSOES_PENDENTES`.
3. Investigar produto e embalagem.
4. Confirmar fator.
5. Registrar regra em `MAPA_CONVERSAO_UNIDADE` como `VALIDADO`.
6. Executar `reprocessarConversoesCompras()`.
7. Regenerar análises.

## Exemplos conhecidos

- Papel higiênico em `FD`, com 6 unidades comerciais por fardo: fator 6.
- Produto em `DP`, com 10 unidades comerciais: fator 10.
- Isqueiro em `CX`, com 12 unidades comerciais: fator 12.
- Produto cadastrado como `CX`, mas cuja quantidade já corresponde à unidade comercial: fator validado 1.

Nunca inferir fator a partir de expressões como `C/12` presentes na descrição do produto.