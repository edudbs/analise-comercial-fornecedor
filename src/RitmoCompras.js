const CABECALHOS_RITMO_COMPRAS_ = [
  'fornecedor_cod',
  'fornecedor',
  'produto_cod',
  'produto',
  'primeira_compra',
  'ultima_compra',
  'dias_sem_comprar',
  'eventos_compra',
  'intervalo_medio_dias',
  'qtd_media_por_compra',
  'qtd_ultima_compra',
  'valor_ultima_compra',
  'cobertura_dias',
  'cobertura_intervalo',
  'status_ritmo'
];


function atualizarAnaliseRitmoCompras() {
  const periodo = obterPeriodoAnalise();
  const mapaProdutoAnalise = carregarMapaProdutoAnalise_();
  const compras = aplicarMapaProdutoAnalise_(
    prepararComprasRitmoPeriodo_(periodo),
    mapaProdutoAnalise
  );
  const coberturaPorChave = carregarCoberturaFornecedorSku_();
  const eventosPorChave = agruparEventosCompraPorDia_(compras);

  const resultado = Object.keys(eventosPorChave)
    .map(chave => montarResumoRitmoCompra_(
      eventosPorChave[chave],
      coberturaPorChave[chave],
      periodo
    ))
    .sort((a, b) => {
      const fornecedor = a.fornecedor.localeCompare(b.fornecedor);
      return fornecedor || a.produto.localeCompare(b.produto);
    });

  escreverAnaliseRitmoCompras_(resultado);
  return resultado;
}


function prepararComprasRitmoPeriodo_(periodo) {
  return lerDados('COMPRAS_RAW')
    .map(item => ({
      data: parseData(item.data_entrada || item.data_emissao),
      nota: String(item.nota || '').trim(),
      fornecedor_cod: limparCodigo_(item.fornecedor_cod),
      fornecedor: String(item.fornecedor || '').trim(),
      produto_cod: limparCodigo_(item.produto_cod),
      produto: String(item.produto || '').trim(),
      qtd: parseNumero(item.qtd_compra_convertida),
      valor_total: parseNumero(item.valor_total),
      operacao: String(item.operacao || '').trim()
    }))
    .filter(item =>
      dataDentroDoPeriodo(item.data, periodo) &&
      item.fornecedor_cod &&
      item.produto_cod
    );
}


function carregarCoberturaFornecedorSku_() {
  const mapa = {};

  lerDados('ANALISE_FORNECEDOR_SKU').forEach(item => {
    const chave = criarChaveFornecedorSku_(
      item.fornecedor_cod,
      item.produto_cod
    );

    mapa[chave] = {
      cobertura_dias: parseNumero(item.cobertura_dias),
      status_operacional: String(item.status_operacional || '').trim()
    };
  });

  return mapa;
}


function agruparEventosCompraPorDia_(compras) {
  const mapa = {};

  compras.forEach(item => {
    if (classificarOperacaoCompra_(item.operacao) !== 'COMPRA') return;

    const chave = criarChaveFornecedorSku_(
      item.fornecedor_cod,
      item.produto_cod
    );

    if (!mapa[chave]) {
      mapa[chave] = {
        fornecedor_cod: item.fornecedor_cod,
        fornecedor: item.fornecedor,
        produto_cod: item.produto_cod,
        produto: item.produto,
        eventos: {}
      };
    }

    const dataChave = formatarDataChave_(item.data);

    if (!mapa[chave].eventos[dataChave]) {
      mapa[chave].eventos[dataChave] = {
        data: new Date(item.data),
        qtd: 0,
        valor: 0,
        notas: {}
      };
    }

    const evento = mapa[chave].eventos[dataChave];
    evento.qtd += item.qtd;
    evento.valor += item.valor_total;
    if (item.nota) evento.notas[item.nota] = true;
  });

  return mapa;
}


function montarResumoRitmoCompra_(grupo, cobertura, periodo) {
  const eventos = Object.values(grupo.eventos)
    .sort((a, b) => a.data - b.data);
  const intervalos = [];

  for (let indice = 1; indice < eventos.length; indice += 1) {
    intervalos.push(diferencaDias_(
      eventos[indice - 1].data,
      eventos[indice].data
    ));
  }

  const intervaloMedio = intervalos.length
    ? media_(intervalos)
    : 0;
  const primeiraCompra = eventos[0];
  const ultimaCompra = eventos[eventos.length - 1];
  const qtdTotal = eventos.reduce((soma, evento) => soma + evento.qtd, 0);
  const coberturaDias = cobertura ? cobertura.cobertura_dias : 0;
  const coberturaIntervalo = intervaloMedio > 0
    ? coberturaDias / intervaloMedio
    : 0;

  return {
    fornecedor_cod: grupo.fornecedor_cod,
    fornecedor: grupo.fornecedor,
    produto_cod: grupo.produto_cod,
    produto: grupo.produto,
    primeira_compra: primeiraCompra.data,
    ultima_compra: ultimaCompra.data,
    dias_sem_comprar: diferencaDias_(ultimaCompra.data, periodo.dataFinal),
    eventos_compra: eventos.length,
    intervalo_medio_dias: arredondar_(intervaloMedio),
    qtd_media_por_compra: arredondar_(qtdTotal / eventos.length),
    qtd_ultima_compra: arredondar_(ultimaCompra.qtd),
    valor_ultima_compra: arredondar_(ultimaCompra.valor),
    cobertura_dias: arredondar_(coberturaDias),
    cobertura_intervalo: arredondar_(coberturaIntervalo),
    status_ritmo: classificarStatusRitmoCompra_(
      eventos,
      intervalos,
      coberturaDias,
      cobertura ? cobertura.status_operacional : ''
    )
  };
}


function classificarStatusRitmoCompra_(
  eventos,
  intervalos,
  coberturaDias,
  statusOperacional
) {
  if (statusOperacional === 'SEM_GIRO') return 'SEM_GIRO';
  if (eventos.length === 1) return 'APENAS_UMA_COMPRA';

  const intervaloMedio = media_(intervalos);

  if (coberturaDias < intervaloMedio) {
    return 'RISCO_ANTES_PROXIMA_COMPRA';
  }

  if (coberturaDias > intervaloMedio * 2) {
    return 'POSSIVEL_EXCESSO';
  }

  if (
    intervalos.length >= 2 &&
    Math.max.apply(null, intervalos) >
      Math.max(1, Math.min.apply(null, intervalos)) * 2
  ) {
    return 'COMPRA_IRREGULAR';
  }

  return 'COBERTURA_ADEQUADA';
}


function escreverAnaliseRitmoCompras_(dados) {
  const aba = obterOuCriarAbaRitmoCompras_();
  const ultimaLinha = aba.getLastRow();

  if (ultimaLinha > 1) {
    aba.getRange(2, 1, ultimaLinha - 1, CABECALHOS_RITMO_COMPRAS_.length)
      .clearContent();
  }

  if (!dados.length) return;

  const linhas = dados.map(item =>
    CABECALHOS_RITMO_COMPRAS_.map(cabecalho => item[cabecalho])
  );

  aba.getRange(2, 1, linhas.length, CABECALHOS_RITMO_COMPRAS_.length)
    .setValues(linhas);
  aba.getRange(2, 5, linhas.length, 2).setNumberFormat('dd/MM/yyyy');
  aba.getRange(2, 12, linhas.length, 1).setNumberFormat('R$ #,##0.00');
  aba.setFrozenRows(1);

  const filtroAtual = aba.getFilter();
  if (filtroAtual) filtroAtual.remove();

  aba.getRange(1, 1, Math.max(2, aba.getLastRow()), aba.getLastColumn())
    .createFilter();
}


function obterOuCriarAbaRitmoCompras_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let aba = ss.getSheetByName('ANALISE_RITMO_COMPRAS');

  if (!aba) aba = ss.insertSheet('ANALISE_RITMO_COMPRAS');

  aba.getRange(1, 1, 1, CABECALHOS_RITMO_COMPRAS_.length)
    .setValues([CABECALHOS_RITMO_COMPRAS_]);

  return aba;
}


function abrirHistoricoComprasSidebar() {
  const html = HtmlService
    .createHtmlOutputFromFile('HistoricoComprasSidebar')
    .setTitle('Histórico de compras');

  SpreadsheetApp.getUi().showSidebar(html);
}


function obterContextoHistoricoComprasSelecionado() {
  const selecao = obterSkuSelecionado_();
  const periodo = obterPeriodoAnalise();

  return {
    fornecedor_cod: selecao.fornecedor_cod,
    fornecedor: selecao.fornecedor,
    produto_cod: selecao.produto_cod,
    produto: selecao.produto,
    data_inicial: formatarData(periodo.dataInicial),
    data_final: formatarData(periodo.dataFinal)
  };
}


function consultarHistoricoCompras(filtros) {
  const dataInicial = parseData(filtros.data_inicial);
  const dataFinal = parseData(filtros.data_final);

  if (!dataInicial || !dataFinal || dataInicial > dataFinal) {
    throw new Error('Informe um período válido.');
  }

  dataInicial.setHours(0, 0, 0, 0);
  dataFinal.setHours(23, 59, 59, 999);

  const mapaProdutoAnalise = carregarMapaProdutoAnalise_();
  const compras = aplicarMapaProdutoAnalise_(
    prepararComprasRitmoPeriodo_({ dataInicial, dataFinal }),
    mapaProdutoAnalise
  ).filter(item =>
    item.fornecedor_cod === limparCodigo_(filtros.fornecedor_cod) &&
    item.produto_cod === String(filtros.produto_cod || '').trim() &&
    (
      filtros.incluir_movimentos ||
      classificarOperacaoCompra_(item.operacao) === 'COMPRA'
    )
  );

  const movimentos = compras
    .sort((a, b) => b.data - a.data)
    .map(item => ({
      data: formatarData(item.data),
      nota: item.nota,
      operacao: item.operacao || 'COMPRA',
      qtd: arredondar_(item.qtd),
      valor: arredondar_(item.valor_total)
    }));

  const comprasNormais = compras.filter(item =>
    classificarOperacaoCompra_(item.operacao) === 'COMPRA'
  );
  const eventosAgrupados = agruparEventosCompraPorDia_(comprasNormais);
  const chave = criarChaveFornecedorSku_(
    filtros.fornecedor_cod,
    filtros.produto_cod
  );
  const grupo = eventosAgrupados[chave];
  let resumo = null;

  if (grupo) {
    const cobertura = carregarCoberturaFornecedorSku_()[chave];
    resumo = montarResumoRitmoCompra_(
      grupo,
      cobertura,
      { dataInicial, dataFinal }
    );
    resumo.primeira_compra = formatarData(resumo.primeira_compra);
    resumo.ultima_compra = formatarData(resumo.ultima_compra);
  }

  return { resumo, movimentos };
}


function obterSkuSelecionado_() {
  const aba = SpreadsheetApp.getActiveSheet();
  const nomesPermitidos = [
    'ANALISE_FORNECEDOR_SKU',
    'ANALISE_RITMO_COMPRAS'
  ];

  if (!nomesPermitidos.includes(aba.getName())) {
    throw new Error(
      'Selecione uma linha em ANALISE_FORNECEDOR_SKU ou ANALISE_RITMO_COMPRAS.'
    );
  }

  const linha = aba.getActiveCell().getRow();
  if (linha < 2) throw new Error('Selecione uma linha de produto.');

  const cabecalhos = aba.getRange(1, 1, 1, aba.getLastColumn())
    .getValues()[0];
  const valores = aba.getRange(linha, 1, 1, aba.getLastColumn())
    .getValues()[0];
  const item = {};

  cabecalhos.forEach((cabecalho, indice) => {
    item[String(cabecalho || '').trim()] = valores[indice];
  });

  if (!item.fornecedor_cod || !item.produto_cod) {
    throw new Error('A linha selecionada não contém fornecedor e produto.');
  }

  return {
    fornecedor_cod: limparCodigo_(item.fornecedor_cod),
    fornecedor: String(item.fornecedor || '').trim(),
    produto_cod: String(item.produto_cod || '').trim(),
    produto: String(item.produto || '').trim()
  };
}


function criarChaveFornecedorSku_(fornecedorCod, produtoCod) {
  return `${limparCodigo_(fornecedorCod)}||${String(produtoCod || '').trim()}`;
}


function formatarDataChave_(data) {
  return Utilities.formatDate(
    data,
    Session.getScriptTimeZone(),
    'yyyy-MM-dd'
  );
}


function diferencaDias_(dataInicial, dataFinal) {
  const inicio = new Date(dataInicial);
  const fim = new Date(dataFinal);
  inicio.setHours(0, 0, 0, 0);
  fim.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((fim - inicio) / 86400000));
}


function media_(valores) {
  if (!valores.length) return 0;
  return valores.reduce((soma, valor) => soma + valor, 0) / valores.length;
}
