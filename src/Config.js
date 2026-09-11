function lerConfig() {
  const dados = lerDados('CONFIG');
  const config = {};

  dados.forEach(item => {
    const parametro = String(item.parametro || '').trim();
    const valor = item.valor;

    if (parametro) {
      config[parametro] = valor;
    }
  });

  return config;
}

function obterPeriodoAnalise() {
  const config = lerConfig();

  const dataInicial = parseData(config.DATA_INICIAL);
  const dataFinal = parseData(config.DATA_FINAL);

  if (!dataInicial || !dataFinal) {
    throw new Error('Informe DATA_INICIAL e DATA_FINAL na aba CONFIG.');
  }

  dataInicial.setHours(0, 0, 0, 0);
  dataFinal.setHours(23, 59, 59, 999);

  if (dataInicial > dataFinal) {
    throw new Error('DATA_INICIAL não pode ser maior que DATA_FINAL.');
  }

  return {
    dataInicial,
    dataFinal,
    modoAnalise: String(config.MODO_ANALISE || 'PERSONALIZADO').trim()
  };
}

function dataDentroDoPeriodo(data, periodo) {
  if (!data) return false;

  const d = parseData(data);

  if (!d) return false;

  return d >= periodo.dataInicial && d <= periodo.dataFinal;
}