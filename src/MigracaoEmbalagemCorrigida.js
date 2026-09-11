function migrarEstruturaEmbalagemCorrigida() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const abaCompras = ss.getSheetByName('COMPRAS_RAW');
  const abaMapa = ss.getSheetByName('MAPA_CONVERSAO_UNIDADE');

  if (!abaCompras) {
    throw new Error('Aba COMPRAS_RAW não encontrada.');
  }

  if (!abaMapa) {
    throw new Error('Aba MAPA_CONVERSAO_UNIDADE não encontrada.');
  }

  const resultadoCompras = adicionarColunaEmbalagemCorrigidaCompras_(abaCompras);
  const resultadoMapa = adicionarColunaEmbalagemCorrigidaMapa_(abaMapa);

  ui.alert(
    'Migração concluída.\n\n' +
    `COMPRAS_RAW: ${resultadoCompras}\n` +
    `MAPA_CONVERSAO_UNIDADE: ${resultadoMapa}\n\n` +
    'Importante: revise regras em que o fator matemático de conversão não é igual ao número real de unidades por embalagem. ' +
    'Depois, execute reprocessarConversoesCompras().'
  );
}


function adicionarColunaEmbalagemCorrigidaCompras_(aba) {
  const cabecalhos = obterCabecalhosMigracaoEmbalagem_(aba);

  const nomeNovaColuna = 'unidades_por_embalagem_corrigida';

  if (cabecalhos.includes(nomeNovaColuna)) {
    return 'coluna já existente';
  }

  const idxOrigem = cabecalhos.indexOf('unidades_por_embalagem');

  if (idxOrigem === -1) {
    throw new Error(
      'COMPRAS_RAW não possui a coluna unidades_por_embalagem.'
    );
  }

  const colunaOrigem = idxOrigem + 1;
  aba.insertColumnAfter(colunaOrigem);
  aba.getRange(1, colunaOrigem + 1).setValue(nomeNovaColuna);

  return 'coluna criada';
}


function adicionarColunaEmbalagemCorrigidaMapa_(aba) {
  const cabecalhos = obterCabecalhosMigracaoEmbalagem_(aba);

  const nomeNovaColuna = 'unidades_por_embalagem_corrigida';

  if (cabecalhos.includes(nomeNovaColuna)) {
    return 'coluna já existente';
  }

  const idxUnidade = cabecalhos.indexOf('unidade_compra');
  const idxFator = cabecalhos.indexOf('fator_conversao');

  if (idxUnidade === -1) {
    throw new Error(
      'MAPA_CONVERSAO_UNIDADE não possui a coluna unidade_compra.'
    );
  }

  if (idxFator === -1) {
    throw new Error(
      'MAPA_CONVERSAO_UNIDADE não possui a coluna fator_conversao.'
    );
  }

  const ultimaLinha = aba.getLastRow();
  const fatoresExistentes =
    ultimaLinha > 1
      ? aba.getRange(2, idxFator + 1, ultimaLinha - 1, 1).getValues()
      : [];

  const colunaUnidade = idxUnidade + 1;
  aba.insertColumnAfter(colunaUnidade);
  aba.getRange(1, colunaUnidade + 1).setValue(nomeNovaColuna);

  if (fatoresExistentes.length > 0) {
    aba
      .getRange(2, colunaUnidade + 1, fatoresExistentes.length, 1)
      .setValues(fatoresExistentes);
  }

  return 'coluna criada e preenchida inicialmente com o fator já cadastrado';
}


function obterCabecalhosMigracaoEmbalagem_(aba) {
  const ultimaColuna = aba.getLastColumn();

  if (ultimaColuna === 0) {
    throw new Error(`${aba.getName()} não possui cabeçalho.`);
  }

  return aba
    .getRange(1, 1, 1, ultimaColuna)
    .getValues()[0]
    .map(valor => String(valor || '').trim().toLowerCase());
}
