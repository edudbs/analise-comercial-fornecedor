function atualizarAuditoria() {
  const periodo = obterPeriodoAnalise();

  const compras = lerDados('COMPRAS_RAW');
  const vendas = lerDados('VENDAS_RAW');
  const analiseSku = lerDados('ANALISE_SKU');

  const comprasPeriodo = compras.filter(item =>
    dataDentroDoPeriodo(item.data_entrada || item.data_emissao, periodo)
  );

  const vendasPeriodo = vendas.filter(item =>
    dataDentroDoPeriodo(item.data_venda, periodo)
  );

  const comprasNormais = comprasPeriodo.filter(item => {
    const operacao = normalizarTexto_(item.operacao);
    return !operacao.includes('BONIFIC') && !operacao.includes('DEVOLU');
  });

  const bonificacoes = comprasPeriodo.filter(item =>
    normalizarTexto_(item.operacao).includes('BONIFIC')
  );

  const devolucoes = comprasPeriodo.filter(item =>
    normalizarTexto_(item.operacao).includes('DEVOLU')
  );

  const totalComprasRaw = somarCampo_(comprasPeriodo, 'valor_total');
  const totalComprasNormais = somarCampo_(comprasNormais, 'valor_total');
  const totalBonificacoes = somarCampo_(bonificacoes, 'valor_total');
  const totalDevolucoes = somarCampo_(devolucoes, 'valor_total');
  const totalMovimentosEspeciais = totalBonificacoes + totalDevolucoes;

  const totalComprasAnalise = somarCampo_(analiseSku, 'valor_compra');

  const totalVendasRaw = somarCampo_(vendasPeriodo, 'faturamento');
  const totalVendasAnalise = somarCampo_(analiseSku, 'valor_venda');

  const vendaNaoVinculada = analiseSku
    .filter(item => item.status === 'VENDA_SEM_COMPRA_NO_PERIODO')
    .reduce((soma, item) => soma + parseNumero(item.valor_venda), 0);

  const vendaVinculada = totalVendasAnalise - vendaNaoVinculada;

  const cobertura =
    totalVendasRaw > 0
      ? vendaVinculada / totalVendasRaw
      : 0;

  const skusComprados = new Set(
    comprasNormais.map(item => limparCodigo_(item.produto_cod)).filter(Boolean)
  ).size;

  const skusBonificados = new Set(
    bonificacoes.map(item => limparCodigo_(item.produto_cod)).filter(Boolean)
  ).size;

  const skusComDevolucao = new Set(
    devolucoes.map(item => limparCodigo_(item.produto_cod)).filter(Boolean)
  ).size;

  const skusVendidos = new Set(
    vendasPeriodo.map(item => limparCodigo_(item.produto_cod)).filter(Boolean)
  ).size;

  const skusAnalisados = analiseSku.length;

  const skusSemCompra = analiseSku.filter(item =>
    item.status === 'VENDA_SEM_COMPRA_NO_PERIODO'
  ).length;

  const indicadores = [
    ['TOTAL_COMPRAS_RAW', arredondar_(totalComprasRaw)],
    ['COMPRAS_NORMAIS', arredondar_(totalComprasNormais)],
    ['BONIFICACOES', arredondar_(totalBonificacoes)],
    ['DEVOLUCOES', arredondar_(totalDevolucoes)],
    ['MOVIMENTOS_ESPECIAIS', arredondar_(totalMovimentosEspeciais)],
    ['TOTAL_COMPRAS_ANALISE', arredondar_(totalComprasAnalise)],
    ['DIFERENCA_COMPRAS', arredondar_(totalComprasRaw - totalComprasAnalise)],

    ['TOTAL_VENDAS_RAW', arredondar_(totalVendasRaw)],
    ['TOTAL_VENDAS_ANALISE', arredondar_(totalVendasAnalise)],
    ['DIFERENCA_VENDAS', arredondar_(totalVendasRaw - totalVendasAnalise)],

    ['VENDA_VINCULADA', arredondar_(vendaVinculada)],
    ['VENDA_NAO_VINCULADA', arredondar_(vendaNaoVinculada)],
    ['COBERTURA_VENDAS', arredondar_(cobertura)],

    ['SKUS_COMPRADOS', skusComprados],
    ['SKUS_BONIFICADOS', skusBonificados],
    ['SKUS_COM_DEVOLUCAO', skusComDevolucao],
    ['SKUS_VENDIDOS', skusVendidos],
    ['SKUS_ANALISADOS', skusAnalisados],
    ['SKUS_SEM_COMPRA_PERIODO', skusSemCompra]
  ];

  escreverAuditoria_(indicadores);
}


function escreverAuditoria_(dados) {
  const aba = obterAba('AUDITORIA');

  limparAba('AUDITORIA');

  aba
    .getRange(2, 1, dados.length, 2)
    .setValues(dados);
}

function somarCampo_(dados, campo) {
  return dados.reduce(
    (soma, item) => soma + parseNumero(item[campo]),
    0
  );
}