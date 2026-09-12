function migrarCabecalhoConversoesPendentes() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const aba = ss.getSheetByName('CONVERSOES_PENDENTES');

  if (!aba) {
    throw new Error('Aba CONVERSOES_PENDENTES não encontrada.');
  }

  const ultimaColuna = aba.getLastColumn();

  if (ultimaColuna === 0) {
    throw new Error('CONVERSOES_PENDENTES não possui cabeçalho.');
  }

  const intervaloCabecalho = aba.getRange(1, 1, 1, ultimaColuna);
  const cabecalhos = intervaloCabecalho.getValues()[0];

  const substituicoes = {
    qtd_unidade: 'unidades_por_embalagem',
    qtd_compra: 'qtd_original_compra'
  };

  let alterados = 0;

  const novosCabecalhos = cabecalhos.map(valor => {
    const nome = String(valor || '').trim();
    const chave = nome.toLowerCase();

    if (Object.prototype.hasOwnProperty.call(substituicoes, chave)) {
      alterados++;
      return substituicoes[chave];
    }

    return valor;
  });

  intervaloCabecalho.setValues([novosCabecalhos]);

  ui.alert(
    'Migração concluída.\n\n' +
    `Cabeçalhos alterados: ${alterados}\n\n` +
    'Novo padrão:\n' +
    'produto_cod | produto | unidade_compra | unidades_por_embalagem | qtd_original_compra | valor_compra | qtd_venda | custo_unitario_venda | fator_estimado | status'
  );
}
