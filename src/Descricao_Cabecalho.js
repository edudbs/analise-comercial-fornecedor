function aplicarNotasCabecalhoAnaliseFornecedorSku() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const aba = ss.getSheetByName('ANALISE_FORNECEDOR_SKU');

  if (!aba) {
    throw new Error('Aba ANALISE_FORNECEDOR_SKU não encontrada.');
  }

  const explicacoes = {
    fornecedor_cod:
      'Código do fornecedor no sistema.',

    fornecedor:
      'Nome do fornecedor responsável pelas compras atribuídas ao produto.',

    produto_cod:
      'Código do produto usado na análise.',

    produto:
      'Descrição do produto analisado.',

    qtd_compra:
      'Quantidade comprada normalmente no período, sem incluir bonificações.',

    valor_compra:
      'Valor total das compras do produto no período, usando o valor final do item da nota fiscal a ser pago ao fornecedor.',

    qtd_bonificacao:
      'Quantidade recebida como bonificação.',

    valor_bonificacao:
      'Valor informado nas operações de bonificação.',

    qtd_disponibilizada:
      'Quantidade disponível a partir das entradas do período: compra + bonificação.',

    qtd_venda:
      'Quantidade vendida atribuída a este fornecedor e produto no período.',

    valor_venda:
      'Faturamento atribuído às vendas deste fornecedor e produto.',

    qtd_devolucao:
      'Quantidade devolvida no período.',

    valor_devolucao:
      'Valor das devoluções registradas no período.',

    custo_medio:
      'Custo médio das unidades compradas: valor_compra dividido pela qtd_compra. Como o valor_compra já considera descontos e acréscimos de impostos, o custo_medio reflete o custo real da mercadoria sem considerar bonificações.',

    custo_efetivo:
      'Custo médio considerando também as unidades bonificadas.',

    custo_venda:
      'Custo estimado das unidades que foram vendidas (qtd_venda x custo_medio)',

    valor_venda_media_un:
      'Valor médio recebido por unidade vendida.',

    lucro:
      'Diferença entre o valor vendido e o custo das unidades vendidas.',

    margem:
      'Percentual do faturamento que permanece como lucro bruto estimado.',

    faturamento_dia:
      'Faturamento médio diário do produto no período.',

    classe_abc:
      'Classificação do produto conforme sua participação no faturamento.',

    saldo_movimentacao:
      'Diferença entre quantidade disponibilizada e quantidade vendida. Não representa necessariamente o estoque físico atual.',

    saldo_periodo_valor:
      'Valor estimado do saldo de movimentação do período.',

    qtd_venda_media_dia:
      'Quantidade média vendida por dia no período.',

    cobertura_dias:
      'Estimativa de quantos dias o saldo do período suportaria no ritmo médio de vendas.',

    indice_aproveitamento:
      'Percentual da quantidade disponibilizada que foi vendida.',

    giro:
      'Relação entre quantidade vendida e quantidade disponibilizada no período.',

    status:
      'Resumo geral da situação do produto na relação compra x venda.',

    status_operacional:
      'Classificação operacional baseada principalmente em saldo, vendas e cobertura.',

    status_financeiro:
      'Classificação da margem do produto.',

    acao_sugerida:
      'Recomendação automática de ação com base nos indicadores.'
  };

  const ultimaColuna = aba.getLastColumn();

  const cabecalhos = aba
    .getRange(1, 1, 1, ultimaColuna)
    .getValues()[0];

  cabecalhos.forEach((cabecalho, indice) => {
    const nome = String(cabecalho || '').trim();

    if (!nome) return;

    const texto = explicacoes[nome];

    if (!texto) return;

    aba
      .getRange(1, indice + 1)
      .setNote(texto);
  });
}