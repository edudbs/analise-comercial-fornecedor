function atualizarMovimentosEspeciais() {
  const compras = lerDados('COMPRAS_RAW');

  const movimentos = compras
    .filter(item => {
      const operacao = String(item.operacao || '').trim().toUpperCase();

      return (
        operacao === 'BONIFICAÇÃO' ||
        operacao === 'BONIFICACAO' ||
        operacao === 'DEVOLUÇÃO MERCADORIA' ||
        operacao === 'DEVOLUCAO MERCADORIA'
      );
    })
    .map(item => ([
      item.data_entrada,
      item.nota,
      item.fornecedor_cod,
      item.fornecedor,
      item.produto_cod,
      item.produto,
      item.operacao,
      parseNumero(item.qtd),
      parseNumero(item.valor_total)
    ]));

  const aba = obterAba('MOVIMENTOS_ESPECIAIS');

  const ultimaLinha = aba.getLastRow();

  if (ultimaLinha > 1) {
    aba.getRange(2, 1, ultimaLinha - 1, 9).clearContent();
  }

  if (movimentos.length === 0) return;

  aba
    .getRange(2, 1, movimentos.length, 9)
    .setValues(movimentos);
}