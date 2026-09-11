function obterAba(nomeAba) {
  const aba = SpreadsheetApp
    .getActiveSpreadsheet()
    .getSheetByName(nomeAba);

  if (!aba) {
    throw new Error(`Aba não encontrada: ${nomeAba}`);
  }

  return aba;
}

function parseNumero(valor) {
  if (valor === null || valor === undefined || valor === '') {
    return 0;
  }

  if (typeof valor === 'number') {
    return valor;
  }

  return Number(
    String(valor)
      .trim()
      .replace(/\./g, '')
      .replace(',', '.')
  ) || 0;
}

function parseData(valor) {
  if (!valor) return null;

  if (valor instanceof Date) {
    return valor;
  }

  const texto = String(valor).trim();

  const partes = texto.split('/');

  if (partes.length === 3) {
    const dia = Number(partes[0]);
    const mes = Number(partes[1]) - 1;
    const ano = Number(partes[2]);

    return new Date(ano, mes, dia);
  }

  return new Date(texto);
}

function formatarData(data) {
  if (!data) return '';

  return Utilities.formatDate(
    data,
    Session.getScriptTimeZone(),
    'dd/MM/yyyy'
  );
}

function normalizarTexto(texto) {
  if (!texto) return '';

  return String(texto)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();
}

function limparAba(nomeAba) {
  const aba = obterAba(nomeAba);

  const ultimaLinha = aba.getLastRow();
  const ultimaColuna = aba.getLastColumn();

  if (ultimaLinha <= 1) return;

  aba
    .getRange(2, 1, ultimaLinha - 1, ultimaColuna)
    .clearContent();
}

function lerDados(nomeAba) {
  const aba = obterAba(nomeAba);

  const dados = aba.getDataRange().getValues();

  if (dados.length <= 1) {
    return [];
  }

  const cabecalhos = dados[0];

  return dados.slice(1).map(linha => {
    const obj = {};

    cabecalhos.forEach((cabecalho, indice) => {
      obj[cabecalho] = linha[indice];
    });

    return obj;
  });
}

function escreverTabela(nomeAba, dados) {
  const aba = obterAba(nomeAba);

  if (!dados || dados.length === 0) {
    return;
  }

  const cabecalhos = Object.keys(dados[0]);

  limparAba(nomeAba);

  aba
    .getRange(2, 1, dados.length, cabecalhos.length)
    .setValues(
      dados.map(item =>
        cabecalhos.map(coluna => item[coluna])
      )
    );
}

function hoje() {
  return new Date();
}

function agoraFormatado() {
  return Utilities.formatDate(
    new Date(),
    Session.getScriptTimeZone(),
    'dd/MM/yyyy HH:mm:ss'
  );
}