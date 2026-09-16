const DIAS_JANELA_TENDENCIA_ = 14;

const CABECALHOS_TENDENCIA_VENDAS_ = [
  'fornecedor_cod',
  'fornecedor',
  'produto_cod',
  'produto',
  'inicio_periodo_analise',
  'fim_periodo_analise',
  'inicio_periodo_efetivo_vendas',
  'fim_periodo_efetivo_vendas',
  'dias_periodo_efetivo_vendas',
  'media_dia_periodo',
  'inicio_janela_anterior',
  'fim_janela_anterior',
  'qtd_venda_anterior',
  'media_dia_anterior',
  'inicio_janela_recente',
  'fim_janela_recente',
  'qtd_venda_recente',
  'media_dia_recente',
  'variacao_vs_anterior',
  'variacao_vs_periodo',
  'tendencia_venda',
  'saldo_movimentacao',
  'cobertura_dias_periodo',
  'cobertura_dias_recente',
  'status_dados'
];


function atualizarAnaliseTendenciaVendas() {
  const periodo = obterPeriodoAnalise();
  const vendasRaw = lerVendasTendencia_();
  const periodoEfetivo = obterPeriodoEfetivoVendas_(
    periodo,
    vendasRaw
  );
  const janelas = criarJanelasTendencia_(
    periodoEfetivo.dataFinal
  );
  const mapaProdutoAnalise = carregarMapaProdutoAnalise_();
  const vendasMapeadas = aplicarMapaProdutoAnalise_(
    vendasRaw,
    mapaProdutoAnalise
  );
  const vendasPorSku = agruparVendasJanelas_(
    vendasMapeadas,
    janelas,
    periodoEfetivo
  );
  const itensBase = lerDados('ANALISE_FORNECEDOR_SKU');
  const participacoes = calcularParticipacoesFornecedorTendencia_(itensBase);

  const resultado = itensBase
    .map(item => montarLinhaTendenciaVendas_(
      item,
      vendasPorSku,
      participacoes,
      periodo,
      janelas,
      periodoEfetivo
    ))
    .sort((a, b) => {
      const fornecedor = a.fornecedor.localeCompare(b.fornecedor);
      return fornecedor || a.produto.localeCompare(b.produto);
    });

  escreverAnaliseTendenciaVendas_(resultado);
  return resultado;
}


function lerVendasTendencia_() {
  return lerDados('VENDAS_RAW')
    .map(item => ({
      data: parseData(item.data_venda),
      produto_cod: limparCodigo_(item.produto_cod),
      produto: String(item.produto || '').trim(),
      qtd: parseNumero(item.qtd),
      valor_venda: parseNumero(item.faturamento)
    }))
    .filter(item =>
      dataValidaTendencia_(item.data) && item.produto_cod
    );
}


function criarJanelasTendencia_(dataFinalPeriodo) {
  const fimRecente = inicioDoDiaTendencia_(dataFinalPeriodo);
  const inicioRecente = adicionarDiasTendencia_(
    fimRecente,
    -(DIAS_JANELA_TENDENCIA_ - 1)
  );
  const fimAnterior = adicionarDiasTendencia_(inicioRecente, -1);
  const inicioAnterior = adicionarDiasTendencia_(
    fimAnterior,
    -(DIAS_JANELA_TENDENCIA_ - 1)
  );

  return {
    inicioAnterior,
    fimAnterior,
    inicioRecente,
    fimRecente
  };
}


function agruparVendasJanelas_(vendas, janelas, periodoEfetivo) {
  const mapa = {};

  vendas.forEach(item => {
    const data = inicioDoDiaTendencia_(item.data);
    const naAnterior = data >= janelas.inicioAnterior &&
      data <= janelas.fimAnterior;
    const naRecente = data >= janelas.inicioRecente &&
      data <= janelas.fimRecente;
    const noPeriodoEfetivo = periodoEfetivo.temDados &&
      data >= periodoEfetivo.dataInicial &&
      data <= periodoEfetivo.dataFinal;

    if (!naAnterior && !naRecente && !noPeriodoEfetivo) return;

    if (!mapa[item.produto_cod]) {
      mapa[item.produto_cod] = {
        qtd_anterior: 0,
        qtd_recente: 0,
        qtd_periodo: 0
      };
    }

    if (naAnterior) mapa[item.produto_cod].qtd_anterior += item.qtd;
    if (naRecente) mapa[item.produto_cod].qtd_recente += item.qtd;
    if (noPeriodoEfetivo) mapa[item.produto_cod].qtd_periodo += item.qtd;
  });

  return mapa;
}


function calcularParticipacoesFornecedorTendencia_(itensBase) {
  const totais = {};
  const participacoes = {};

  itensBase.forEach(item => {
    const produtoCod = String(item.produto_cod || '').trim();
    const qtdVenda = Math.max(0, parseNumero(item.qtd_venda));
    const qtdDisponibilizada = Math.max(
      0,
      parseNumero(item.qtd_disponibilizada)
    );

    if (!totais[produtoCod]) {
      totais[produtoCod] = {
        qtd_venda: 0,
        qtd_disponibilizada: 0,
        quantidade_linhas: 0
      };
    }

    totais[produtoCod].qtd_venda += qtdVenda;
    totais[produtoCod].qtd_disponibilizada += qtdDisponibilizada;
    totais[produtoCod].quantidade_linhas += 1;
  });

  itensBase.forEach(item => {
    const produtoCod = String(item.produto_cod || '').trim();
    const fornecedorCod = limparCodigo_(item.fornecedor_cod);
    const total = totais[produtoCod];
    const qtdVenda = Math.max(0, parseNumero(item.qtd_venda));
    const qtdDisponibilizada = Math.max(
      0,
      parseNumero(item.qtd_disponibilizada)
    );
    let participacao = 0;

    if (total.qtd_venda > 0) {
      participacao = qtdVenda / total.qtd_venda;
    } else if (total.qtd_disponibilizada > 0) {
      participacao = qtdDisponibilizada / total.qtd_disponibilizada;
    } else {
      participacao = 1 / total.quantidade_linhas;
    }

    participacoes[criarChaveFornecedorSku_(fornecedorCod, produtoCod)] =
      numeroFinitoTendencia_(participacao);
  });

  return participacoes;
}


function montarLinhaTendenciaVendas_(
  item,
  vendasPorSku,
  participacoes,
  periodo,
  janelas,
  periodoEfetivo
) {
  const produtoCod = String(item.produto_cod || '').trim();
  const chave = criarChaveFornecedorSku_(
    item.fornecedor_cod,
    produtoCod
  );
  const participacao = numeroFinitoTendencia_(participacoes[chave]);
  const vendasSku = vendasPorSku[produtoCod] || {
    qtd_anterior: 0,
    qtd_recente: 0,
    qtd_periodo: 0
  };
  const qtdAnterior = vendasSku.qtd_anterior * participacao;
  const qtdRecente = vendasSku.qtd_recente * participacao;
  const mediaAnterior = qtdAnterior / DIAS_JANELA_TENDENCIA_;
  const mediaRecente = qtdRecente / DIAS_JANELA_TENDENCIA_;
  const qtdPeriodo = vendasSku.qtd_periodo * participacao;
  const diasPeriodoEfetivo = numeroFinitoTendencia_(periodoEfetivo.dias);
  const mediaPeriodo = diasPeriodoEfetivo > 0
    ? qtdPeriodo / diasPeriodoEfetivo
    : 0;
  const saldoMovimentacao = parseNumero(item.saldo_movimentacao);
  const variacaoAnterior = calcularVariacaoTendencia_(
    mediaRecente,
    mediaAnterior
  );
  const variacaoPeriodo = calcularVariacaoTendencia_(
    mediaRecente,
    mediaPeriodo
  );

  return {
    fornecedor_cod: limparCodigo_(item.fornecedor_cod),
    fornecedor: String(item.fornecedor || '').trim(),
    produto_cod: produtoCod,
    produto: String(item.produto || '').trim(),
    inicio_periodo_analise: formatarData(periodo.dataInicial),
    fim_periodo_analise: formatarData(periodo.dataFinal),
    inicio_periodo_efetivo_vendas: periodoEfetivo.temDados
      ? formatarData(periodoEfetivo.dataInicial)
      : '',
    fim_periodo_efetivo_vendas: periodoEfetivo.temDados
      ? formatarData(periodoEfetivo.dataFinal)
      : '',
    dias_periodo_efetivo_vendas: diasPeriodoEfetivo,
    media_dia_periodo: arredondar_(mediaPeriodo),
    inicio_janela_anterior: formatarData(janelas.inicioAnterior),
    fim_janela_anterior: formatarData(janelas.fimAnterior),
    qtd_venda_anterior: arredondar_(qtdAnterior),
    media_dia_anterior: arredondar_(mediaAnterior),
    inicio_janela_recente: formatarData(janelas.inicioRecente),
    fim_janela_recente: formatarData(janelas.fimRecente),
    qtd_venda_recente: arredondar_(qtdRecente),
    media_dia_recente: arredondar_(mediaRecente),
    variacao_vs_anterior: variacaoAnterior,
    variacao_vs_periodo: variacaoPeriodo,
    tendencia_venda: classificarTendenciaVendas_(
      mediaAnterior,
      mediaRecente,
      periodoEfetivo.temHistoricoParaComparacao
    ),
    saldo_movimentacao: arredondar_(saldoMovimentacao),
    cobertura_dias_periodo: arredondar_(
      parseNumero(item.cobertura_dias)
    ),
    cobertura_dias_recente: mediaRecente > 0
      ? arredondar_(saldoMovimentacao / mediaRecente)
      : '',
    status_dados: periodoEfetivo.statusDados
  };
}


function calcularVariacaoTendencia_(valorAtual, valorBase) {
  if (valorBase > 0) {
    return arredondar_((valorAtual - valorBase) / valorBase);
  }

  return valorAtual > 0 ? '' : 0;
}


function classificarTendenciaVendas_(
  mediaAnterior,
  mediaRecente,
  temHistoricoParaComparacao
) {
  if (!temHistoricoParaComparacao) return 'DADOS_INCOMPLETOS';
  if (mediaAnterior === 0 && mediaRecente === 0) return 'SEM_MOVIMENTO';
  if (mediaAnterior === 0 && mediaRecente > 0) return 'ACELERANDO';
  if (mediaAnterior > 0 && mediaRecente === 0) return 'DESACELERANDO';

  const variacao = (mediaRecente - mediaAnterior) / mediaAnterior;

  if (variacao >= 0.20) return 'ACELERANDO';
  if (variacao <= -0.20) return 'DESACELERANDO';
  return 'ESTAVEL';
}


function obterPeriodoEfetivoVendas_(periodo, vendas) {
  const inicioConfigurado = inicioDoDiaTendencia_(periodo.dataInicial);
  const fimConfigurado = inicioDoDiaTendencia_(periodo.dataFinal);
  const datas = vendas
    .map(item => inicioDoDiaTendencia_(item.data))
    .sort((a, b) => a - b);

  const datasNoPeriodo = datas.filter(data =>
    data >= inicioConfigurado && data <= fimConfigurado
  );

  if (!datasNoPeriodo.length) {
    return {
      dataInicial: inicioConfigurado,
      dataFinal: fimConfigurado,
      dias: 0,
      temDados: false,
      temHistoricoParaComparacao: false,
      statusDados: 'SEM_DADOS_NO_PERIODO'
    };
  }

  const primeiraDisponivel = datas[0];
  const ultimaDisponivel = datas[datas.length - 1];
  const dataInicial = datasNoPeriodo[0];
  const dataFinal = datasNoPeriodo[datasNoPeriodo.length - 1];
  const janelas = criarJanelasTendencia_(dataFinal);
  const inicioEfetivo = dataInicial > inicioConfigurado
    ? dataInicial
    : inicioConfigurado;
  const fimEfetivo = dataFinal < fimConfigurado
    ? dataFinal
    : fimConfigurado;
  const inicioFaltante = inicioEfetivo > inicioConfigurado;
  const fimFaltante = fimEfetivo < fimConfigurado;
  let statusDados = 'DADOS_ATUALIZADOS';

  if (inicioFaltante && fimFaltante) {
    statusDados = 'DADOS_DE_' + formatarData(inicioEfetivo) +
      '_ATE_' + formatarData(fimEfetivo);
  } else if (inicioFaltante) {
    statusDados = 'DADOS_DESDE_' + formatarData(inicioEfetivo);
  } else if (fimFaltante) {
    statusDados = 'DADOS_ATE_' + formatarData(fimEfetivo);
  }

  return {
    dataInicial: inicioEfetivo,
    dataFinal: fimEfetivo,
    dias: calcularDiasInclusivosTendencia_(
      inicioEfetivo,
      fimEfetivo
    ),
    temDados: true,
    temHistoricoParaComparacao:
      primeiraDisponivel <= janelas.inicioAnterior &&
      ultimaDisponivel >= janelas.fimRecente,
    statusDados
  };
}


function escreverAnaliseTendenciaVendas_(dados) {
  const aba = obterOuCriarAbaTendenciaVendas_();
  const ultimaLinha = aba.getLastRow();

  if (ultimaLinha > 1) {
    aba.getRange(
      2,
      1,
      ultimaLinha - 1,
      CABECALHOS_TENDENCIA_VENDAS_.length
    ).clearContent();
  }

  if (!dados.length) return;

  const linhas = dados.map(item =>
    CABECALHOS_TENDENCIA_VENDAS_.map(cabecalho => item[cabecalho])
  );

  aba.getRange(2, 1, linhas.length, CABECALHOS_TENDENCIA_VENDAS_.length)
    .setValues(linhas);
  aba.getRange(2, 5, linhas.length, 2).setNumberFormat('dd/MM/yyyy');
  aba.getRange(2, 7, linhas.length, 2).setNumberFormat('dd/MM/yyyy');
  aba.getRange(2, 11, linhas.length, 2).setNumberFormat('dd/MM/yyyy');
  aba.getRange(2, 15, linhas.length, 2).setNumberFormat('dd/MM/yyyy');
  aba.getRange(2, 19, linhas.length, 2).setNumberFormat('0.00%');
  aba.setFrozenRows(1);

  const filtroAtual = aba.getFilter();
  if (filtroAtual) filtroAtual.remove();

  aba.getRange(1, 1, Math.max(2, aba.getLastRow()), aba.getLastColumn())
    .createFilter();
}


function obterOuCriarAbaTendenciaVendas_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let aba = ss.getSheetByName('ANALISE_TENDENCIA_VENDAS');

  if (!aba) aba = ss.insertSheet('ANALISE_TENDENCIA_VENDAS');

  aba.getRange(1, 1, 1, CABECALHOS_TENDENCIA_VENDAS_.length)
    .setValues([CABECALHOS_TENDENCIA_VENDAS_]);

  return aba;
}


function inicioDoDiaTendencia_(data) {
  const resultado = new Date(data);
  resultado.setHours(0, 0, 0, 0);
  return resultado;
}


function dataValidaTendencia_(data) {
  return data instanceof Date && !isNaN(data.getTime());
}


function calcularDiasInclusivosTendencia_(dataInicial, dataFinal) {
  const inicio = inicioDoDiaTendencia_(dataInicial).getTime();
  const fim = inicioDoDiaTendencia_(dataFinal).getTime();
  return Math.max(0, Math.round((fim - inicio) / 86400000) + 1);
}


function numeroFinitoTendencia_(valor) {
  const numero = Number(valor);
  return isFinite(numero) ? numero : 0;
}


function adicionarDiasTendencia_(data, dias) {
  const resultado = inicioDoDiaTendencia_(data);
  resultado.setDate(resultado.getDate() + dias);
  return resultado;
}
