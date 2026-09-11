function migrarQuantidadeOriginalCompras() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const aba = ss.getSheetByName('COMPRAS_RAW');

  if (!aba) {
    throw new Error('Aba COMPRAS_RAW não encontrada.');
  }

  const ultimaLinha = aba.getLastRow();
  const ultimaColuna = aba.getLastColumn();

  if (ultimaLinha <= 1) {
    SpreadsheetApp.getUi().alert(
      'COMPRAS_RAW não possui registros para migrar.'
    );
    return;
  }

  const dados = aba
    .getRange(1, 1, ultimaLinha, ultimaColuna)
    .getValues();

  const cabecalhos = dados[0]
    .map(cabecalho =>
      String(cabecalho || '')
        .trim()
        .toLowerCase()
    );

  const idxUnidade =
    cabecalhos.indexOf('unidade');

  const idxQtdUnidade =
    cabecalhos.indexOf('qtd_unidade');

  const idxQtd =
    cabecalhos.indexOf('qtd');

  const idxQtdOriginal =
    cabecalhos.indexOf('qtd_original');

  const idxFator =
    cabecalhos.indexOf(
      'fator_conversao_aplicado'
    );

  if (
    idxUnidade === -1 ||
    idxQtdUnidade === -1 ||
    idxQtd === -1 ||
    idxQtdOriginal === -1 ||
    idxFator === -1
  ) {
    throw new Error(
      'Não foi possível localizar todas as colunas necessárias em COMPRAS_RAW.'
    );
  }

  const saidaQtdOriginal = [];
  const saidaFator = [];

  for (let i = 1; i < dados.length; i++) {
    const linha = dados[i];

    const unidade =
      String(linha[idxUnidade] || '')
        .trim()
        .toUpperCase();

    const qtdUnidade =
      Number(linha[idxQtdUnidade] || 0);

    const qtdAtual =
      Number(linha[idxQtd] || 0);

    let qtdOriginal = qtdAtual;
    let fatorAplicado = 1;

    /*
     * Para registros já convertidos
     * automaticamente, recuperamos
     * a quantidade fiscal original.
     *
     * Exemplo:
     *
     * qtd atual = 420
     * qtd_unidade = 6
     *
     * qtd_original = 70
     */
    if (
      unidade !== 'UN' &&
      qtdUnidade > 1
    ) {
      qtdOriginal =
        qtdAtual / qtdUnidade;

      fatorAplicado =
        qtdUnidade;
    }

    /*
     * Para UN e casos ainda não
     * convertidos:
     *
     * qtd_original = qtd atual
     * fator = 1
     */
    saidaQtdOriginal.push([
      qtdOriginal
    ]);

    saidaFator.push([
      fatorAplicado
    ]);
  }

  aba
    .getRange(
      2,
      idxQtdOriginal + 1,
      saidaQtdOriginal.length,
      1
    )
    .setValues(
      saidaQtdOriginal
    );

  aba
    .getRange(
      2,
      idxFator + 1,
      saidaFator.length,
      1
    )
    .setValues(
      saidaFator
    );

  SpreadsheetApp
    .getUi()
    .alert(
      'Migração concluída.\n\n' +
      'qtd_original e fator_conversao_aplicado foram preenchidos.'
    );
}