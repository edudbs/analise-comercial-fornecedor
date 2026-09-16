function abrirPainelTendenciaVendas() {
  SpreadsheetApp.getUi().showModalDialog(
    HtmlService.createHtmlOutputFromFile('PainelTendencia')
      .setWidth(1150).setHeight(740),
    'Tendência de vendas'
  );
}

// Somente leitura: não recalcula nem altera as análises.
function obterDadosPainelTendencia() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const aba = ss.getSheetByName('ANALISE_TENDENCIA_VENDAS');
  if (!aba) throw new Error('Execute Análise Comercial → Atualizar Análises primeiro.');
  const valores = aba.getDataRange().getValues();
  const cabecalhos = valores.shift().map(String);
  const faltantes = CABECALHOS_TENDENCIA_VENDAS_.filter(c => !cabecalhos.includes(c));
  if (faltantes.length) throw new Error('Cabeçalhos incompatíveis. Execute Atualizar Análises.');
  return valores.filter(linha => String(linha[cabecalhos.indexOf('produto_cod')]).trim())
    .map(linha => {
      const item = {};
      CABECALHOS_TENDENCIA_VENDAS_.forEach(c => {
        const valor = linha[cabecalhos.indexOf(c)];
        item[c] = valor instanceof Date
          ? Utilities.formatDate(valor, ss.getSpreadsheetTimeZone(), 'dd/MM/yyyy')
          : valor;
      });
      return item;
    });
}
