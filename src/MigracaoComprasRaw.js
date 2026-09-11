function migrarCabecalhosComprasRaw() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const aba = ss.getSheetByName('COMPRAS_RAW');

  if (!aba) {
    throw new Error('Aba COMPRAS_RAW não encontrada.');
  }

  const ultimaColuna = aba.getLastColumn();

  if (ultimaColuna === 0) {
    throw new Error('COMPRAS_RAW não possui cabeçalho.');
  }

  const cabecalhos = aba
    .getRange(1, 1, 1, ultimaColuna)
    .getValues()[0]
    .map(valor => String(valor || '').trim());

  const renomeacoes = {
    unidade: 'unidade_compra',
    qtd_unidade: 'unidades_por_embalagem',
    qtd: 'qtd_compra_convertida',
    qtd_original: 'qtd_original_compra'
  };

  const novosCabecalhos = [...cabecalhos];
  const alterados = [];

  Object.entries(renomeacoes).forEach(([antigo, novo]) => {
    const idxAntigo = cabecalhos.indexOf(antigo);
    const idxNovo = cabecalhos.indexOf(novo);

    if (idxAntigo !== -1 && idxNovo !== -1) {
      throw new Error(
        `COMPRAS_RAW contém simultaneamente "${antigo}" e "${novo}". ` +
        'Migração interrompida para evitar ambiguidade.'
      );
    }

    if (idxAntigo !== -1) {
      novosCabecalhos[idxAntigo] = novo;
      alterados.push(`${antigo} → ${novo}`);
      return;
    }

    if (idxNovo === -1) {
      throw new Error(
        `Não foi encontrada a coluna "${antigo}" nem a coluna já migrada "${novo}" em COMPRAS_RAW.`
      );
    }
  });

  const obrigatorios = [
    'data_emissao',
    'data_entrada',
    'nota',
    'fornecedor_cod',
    'fornecedor',
    'produto_cod',
    'produto',
    'unidade_compra',
    'unidades_por_embalagem',
    'qtd_compra_convertida',
    'custo_unit',
    'valor_total',
    'operacao',
    'qtd_original_compra',
    'fator_conversao_aplicado'
  ];

  obrigatorios.forEach(cabecalho => {
    if (!novosCabecalhos.includes(cabecalho)) {
      throw new Error(
        `Após a migração, a coluna obrigatória "${cabecalho}" não estaria presente em COMPRAS_RAW.`
      );
    }
  });

  if (alterados.length === 0) {
    ui.alert(
      'COMPRAS_RAW já utiliza os novos nomes de cabeçalho. Nenhuma alteração foi necessária.'
    );
    return;
  }

  aba
    .getRange(1, 1, 1, novosCabecalhos.length)
    .setValues([novosCabecalhos]);

  ui.alert(
    'Cabeçalhos da COMPRAS_RAW migrados com sucesso.\n\n' +
    alterados.join('\n') +
    '\n\nNenhum dado das linhas foi alterado.'
  );
}
