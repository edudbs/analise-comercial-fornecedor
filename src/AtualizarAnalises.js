function atualizarAnalises() {
  const ui = SpreadsheetApp.getUi();

  try {
    const periodo = obterPeriodoAnalise();

    const comprasBrutas = prepararComprasPeriodo_(periodo);
    const vendasBrutas = prepararVendasPeriodo_(periodo);

    // Aplica o mapa de consolidação econômica dos produtos
    const mapaProdutoAnalise = carregarMapaProdutoAnalise_();

    // Converte as pendências dos SKUs físicos para a mesma chave
    // econômica usada nas análises.
    const skusConversaoPendente =
      carregarSkusConversaoPendente_(mapaProdutoAnalise);

    const compras = aplicarMapaProdutoAnalise_(
      comprasBrutas,
      mapaProdutoAnalise
    );

    const vendas = aplicarMapaProdutoAnalise_(
      vendasBrutas,
      mapaProdutoAnalise
    );

    const analiseSku = gerarAnaliseSku_(
      compras,
      vendas,
      skusConversaoPendente
    );
    escreverAnaliseSku_(analiseSku);

    const analiseSkuConsolidada =
      gerarAnaliseSkuConsolidada_(
        compras,
        vendas,
        skusConversaoPendente
      );

    escreverAnaliseSkuConsolidada_(
      analiseSkuConsolidada
);

const analiseFornecedor = gerarAnaliseFornecedor_(analiseSku);
    escreverAnaliseFornecedor_(analiseFornecedor);

    atualizarVendasSemCompra();

    atualizarAnaliseFornecedorSku();

    ui.alert(
      'Análises atualizadas com sucesso.\n' +
      `SKUs analisados: ${analiseSku.length}\n` +
      `Fornecedores analisados: ${analiseFornecedor.length}`
    );

  } catch (erro) {
    registrarErro('ATUALIZAR_ANALISES', erro);
    ui.alert('Erro ao atualizar análises: ' + erro.message);
  }
}


function gerarAnaliseSkuConsolidada_(
  compras,
  vendas,
  skusConversaoPendente
) {
  const comprasAgrupadas = {};
  const vendasAgrupadas = agruparVendasSku_(vendas);

  compras.forEach(item => {
    const produtoCod = item.produto_cod;

    if (!comprasAgrupadas[produtoCod]) {
      comprasAgrupadas[produtoCod] = {
        produto_cod: produtoCod,
        produto: item.produto,

        qtd_compra: 0,
        valor_compra: 0,

        qtd_bonificacao: 0,
        valor_bonificacao: 0,

        qtd_devolucao: 0,
        valor_devolucao: 0,

        qtd_disponibilizada: 0,

        fornecedores: {}
      };
    }

    const registro = comprasAgrupadas[produtoCod];

    const tipoOperacao =
      classificarOperacaoCompra_(item.operacao);

    const fornecedorCod =
      String(item.fornecedor_cod || '').trim();

    const fornecedor =
      String(item.fornecedor || '').trim();

    if (!registro.fornecedores[fornecedorCod]) {
      registro.fornecedores[fornecedorCod] = {
        fornecedor_cod: fornecedorCod,
        fornecedor,
        qtd_compra: 0,
        valor_compra: 0,
        qtd_bonificacao: 0,
        valor_bonificacao: 0
      };
    }

    const fornecedorRegistro =
      registro.fornecedores[fornecedorCod];

    if (tipoOperacao === 'BONIFICACAO') {
      registro.qtd_bonificacao += item.qtd;
      registro.valor_bonificacao += item.valor_total;

      fornecedorRegistro.qtd_bonificacao += item.qtd;
      fornecedorRegistro.valor_bonificacao += item.valor_total;

      return;
    }

    if (tipoOperacao === 'DEVOLUCAO') {
      registro.qtd_devolucao += item.qtd;
      registro.valor_devolucao += item.valor_total;

      return;
    }

    registro.qtd_compra += item.qtd;
    registro.valor_compra += item.valor_total;

    fornecedorRegistro.qtd_compra += item.qtd;
    fornecedorRegistro.valor_compra += item.valor_total;
  });


  const produtos = new Set([
    ...Object.keys(comprasAgrupadas),
    ...Object.keys(vendasAgrupadas)
  ]);

  const resultado = [];


  produtos.forEach(produtoCod => {
    const compra =
      comprasAgrupadas[produtoCod] || {
        produto_cod: produtoCod,
        produto:
          vendasAgrupadas[produtoCod]?.produto || '',

        qtd_compra: 0,
        valor_compra: 0,

        qtd_bonificacao: 0,
        valor_bonificacao: 0,

        qtd_devolucao: 0,
        valor_devolucao: 0,

        fornecedores: {}
      };

    const venda =
      vendasAgrupadas[produtoCod] || {
        produto_cod: produtoCod,
        produto: compra.produto,

        qtd_venda: 0,
        valor_venda: 0
      };


    const qtdDisponibilizada =
      compra.qtd_compra +
      compra.qtd_bonificacao;


    const custoMedio =
      compra.qtd_compra > 0
        ? compra.valor_compra /
          compra.qtd_compra
        : 0;


    const custoEfetivo =
      qtdDisponibilizada > 0
        ? compra.valor_compra /
          qtdDisponibilizada
        : 0;


    const custoVenda =
      venda.qtd_venda *
      custoEfetivo;


    const lucro =
      venda.valor_venda -
      custoVenda;


    const margem =
      venda.valor_venda > 0
        ? lucro / venda.valor_venda
        : 0;


    const saldoMovimentacao =
      qtdDisponibilizada -
      venda.qtd_venda;


    const indiceAproveitamento =
      qtdDisponibilizada > 0
        ? venda.qtd_venda /
          qtdDisponibilizada
        : 0;


    const giro =
      indiceAproveitamento;


    const fornecedores =
      Object.values(
        compra.fornecedores || {}
      );


    const fornecedoresComCompra =
      fornecedores.filter(item =>
        item.qtd_compra > 0 ||
        item.qtd_bonificacao > 0
      );


    const qtdFornecedores =
      fornecedoresComCompra.length;


    let fornecedorPrincipal = '';
    let partFornecedorPrincipal = 0;


    if (fornecedoresComCompra.length > 0) {
      const ordenados = [
        ...fornecedoresComCompra
      ].sort((a, b) => {
        const qtdA =
          a.qtd_compra +
          a.qtd_bonificacao;

        const qtdB =
          b.qtd_compra +
          b.qtd_bonificacao;

        return qtdB - qtdA;
      });


      const principal =
        ordenados[0];


      const qtdPrincipal =
        principal.qtd_compra +
        principal.qtd_bonificacao;


      fornecedorPrincipal =
        principal.fornecedor;


      partFornecedorPrincipal =
        qtdDisponibilizada > 0
          ? qtdPrincipal /
            qtdDisponibilizada
          : 0;
    }


    let status = '';

    const conversaoPendente =
      !!skusConversaoPendente[produtoCod];

    if (conversaoPendente && qtdDisponibilizada > 0) {
      status = 'CONVERSAO_PENDENTE';

    } else if (
      qtdDisponibilizada <= 0 &&
      venda.qtd_venda > 0
    ) {
      status = 'VENDA_SEM_COMPRA_NO_PERIODO';

    } else {
      status =
        classificarStatusSku_(
          saldoMovimentacao,
          giro,
          margem,
          venda.qtd_venda
        );
    }


    resultado.push({
      produto_cod:
        compra.produto_cod ||
        venda.produto_cod,

      produto:
        compra.produto ||
        venda.produto,

      qtd_fornecedores:
        qtdFornecedores,

      qtd_compra:
        arredondar_(
          compra.qtd_compra
        ),

      valor_compra:
        arredondar_(
          compra.valor_compra
        ),

      qtd_bonificacao:
        arredondar_(
          compra.qtd_bonificacao
        ),

      valor_bonificacao:
        arredondar_(
          compra.valor_bonificacao
        ),

      qtd_disponibilizada:
        arredondar_(
          qtdDisponibilizada
        ),

      qtd_venda:
        arredondar_(
          venda.qtd_venda
        ),

      valor_venda:
        arredondar_(
          venda.valor_venda
        ),

      qtd_devolucao:
        arredondar_(
          compra.qtd_devolucao
        ),

      valor_devolucao:
        arredondar_(
          compra.valor_devolucao
        ),

      custo_medio:
        arredondar_(
          custoMedio
        ),

      custo_efetivo:
        arredondar_(
          custoEfetivo
        ),

      custo_venda:
        arredondar_(
          custoVenda
        ),

      lucro:
        arredondar_(
          lucro
        ),

      margem:
        arredondar_(
          margem
        ),

      saldo_movimentacao:
        arredondar_(
          saldoMovimentacao
        ),

      indice_aproveitamento:
        arredondar_(
          indiceAproveitamento
        ),

      giro:
        arredondar_(
          giro
        ),

      fornecedor_principal:
        fornecedorPrincipal,

      part_fornecedor_principal:
        arredondar_(
          partFornecedorPrincipal
        ),

      status
    });
  });


  return resultado.sort((a, b) => {
    if (a.produto < b.produto) return -1;
    if (a.produto > b.produto) return 1;
    return 0;
  });
}


function escreverAnaliseSkuConsolidada_(dados) {
  const aba =
    obterAba('ANALISE_SKU_CONSOLIDADA');

  limparAba('ANALISE_SKU_CONSOLIDADA');

  if (dados.length === 0) return;


  const linhas =
    dados.map(item => ([
      item.produto_cod,
      item.produto,

      item.qtd_fornecedores,

      item.qtd_compra,
      item.valor_compra,

      item.qtd_bonificacao,
      item.valor_bonificacao,

      item.qtd_disponibilizada,

      item.qtd_venda,
      item.valor_venda,

      item.qtd_devolucao,
      item.valor_devolucao,

      item.custo_medio,
      item.custo_efetivo,
      item.custo_venda,

      item.lucro,
      item.margem,

      item.saldo_movimentacao,
      item.indice_aproveitamento,
      item.giro,

      item.fornecedor_principal,
      item.part_fornecedor_principal,

      item.status
    ]));


  aba
    .getRange(
      2,
      1,
      linhas.length,
      23
    )
    .setValues(linhas);
}


function prepararComprasPeriodo_(periodo) {
  const dados = lerDados('COMPRAS_RAW');

  return dados
    .map(item => {
      const dataRef = item.data_entrada || item.data_emissao;

      return {
        data: parseData(dataRef),
        fornecedor_cod: limparCodigo_(item.fornecedor_cod),
        fornecedor: item.fornecedor,
        produto_cod: limparCodigo_(item.produto_cod),
        produto: item.produto,
        qtd: parseNumero(item.qtd),
        valor_total: parseNumero(item.valor_total),
        operacao: String(item.operacao || '').trim()
      };
    })
    .filter(item =>
      dataDentroDoPeriodo(item.data, periodo) &&
      item.fornecedor_cod &&
      item.produto_cod
    );
}


function prepararVendasPeriodo_(periodo) {
  const dados = lerDados('VENDAS_RAW');

  return dados
    .map(item => ({
      data: parseData(item.data_venda),
      produto_cod: limparCodigo_(item.produto_cod),
      produto: item.produto,
      qtd: parseNumero(item.qtd),
      valor_venda: parseNumero(item.faturamento),
      custo_venda: parseNumero(item.custo_total),
      lucro: parseNumero(item.lucro),
      margem: parseNumero(item.margem)
    }))
    .filter(item =>
      dataDentroDoPeriodo(item.data, periodo) &&
      item.produto_cod
    );
}


/**
 * Carrega o mapa que consolida diferentes SKUs físicos
 * em um mesmo produto econômico de análise.
 *
 * Cabeçalho:
 * produto_cod | produto | produto_analise_cod | produto_analise
 */
function carregarMapaProdutoAnalise_() {
  const dados = lerDados('MAPA_PRODUTO_ANALISE');
  const mapa = {};

  dados.forEach(item => {
    const produtoCod = limparCodigo_(item.produto_cod);
    const produtoAnaliseCod = String(
      item.produto_analise_cod || ''
    ).trim();

    if (!produtoCod || !produtoAnaliseCod) return;

    mapa[produtoCod] = {
      produto_analise_cod: produtoAnaliseCod,
      produto_analise:
        String(item.produto_analise || '').trim() ||
        String(item.produto || '').trim()
    };
  });

  return mapa;
}


/**
 * Substitui o SKU original pela chave econômica de análise.
 *
 * Exemplo:
 * 880 - SHOWKINHO GELADO -> SHOWK
 * 906 - SHOWKINHO QUENTE -> SHOWK
 *
 * Os dados RAW não são alterados.
 */
function aplicarMapaProdutoAnalise_(dados, mapaProdutoAnalise) {
  return dados.map(item => {
    const produtoOriginalCod = limparCodigo_(item.produto_cod);
    const produtoOriginal = item.produto;

    const mapeamento = mapaProdutoAnalise[produtoOriginalCod];

    if (!mapeamento) {
      return {
        ...item,
        produto_cod: produtoOriginalCod,
        produto: produtoOriginal
      };
    }

    return {
      ...item,

      produto_cod: mapeamento.produto_analise_cod,
      produto: mapeamento.produto_analise,

      produto_cod_original: produtoOriginalCod,
      produto_original: produtoOriginal
    };
  });
}


/**
 * Carrega os SKUs cuja conversão de unidade ainda está pendente
 * e converte a chave física para a mesma chave econômica usada
 * por MAPA_PRODUTO_ANALISE.
 *
 * Assim, se um SKU físico pendente for consolidado com outro SKU,
 * o produto econômico inteiro fica sinalizado como pendente.
 */
function carregarSkusConversaoPendente_(mapaProdutoAnalise) {
  const dados = lerDados('CONVERSOES_PENDENTES');
  const mapa = {};

  dados.forEach(item => {
    const produtoCodOriginal =
      limparCodigo_(item.produto_cod);

    const status =
      String(item.status || '')
        .trim()
        .toUpperCase();

    if (
      !produtoCodOriginal ||
      status !== 'PENDENTE'
    ) {
      return;
    }

    const mapeamento =
      mapaProdutoAnalise[produtoCodOriginal];

    const produtoAnaliseCod =
      mapeamento
        ? mapeamento.produto_analise_cod
        : produtoCodOriginal;

    mapa[produtoAnaliseCod] = true;
  });

  return mapa;
}


function carregarMapaSkuEspecial_() {
  const dados = lerDados('MAPA_SKU_ESPECIAL');
  const mapa = {};

  dados.forEach(item => {
    const produtoCod = limparCodigo_(item.produto_cod);
    if (!produtoCod) return;

    mapa[produtoCod] = {
      produto_cod: produtoCod,
      produto: item.produto,
      tipo_sku: normalizarTexto_(item.tipo_sku || 'NORMAL'),
      observacao: item.observacao || ''
    };
  });

  return mapa;
}


function obterTipoSku_(produtoCod, mapaSkuEspecial) {
  const chave = limparCodigo_(produtoCod);
  const item = mapaSkuEspecial[chave];

  if (!item) return 'NORMAL';

  return item.tipo_sku || 'NORMAL';
}


function gerarAnaliseSku_(
  compras,
  vendas,
  skusConversaoPendente
) {
  const mapaSkuEspecial = carregarMapaSkuEspecial_();

  const comprasAgrupadas = agruparComprasFornecedorSku_(compras);
  const vendasAgrupadas = agruparVendasSku_(vendas);
  const totalDisponibilizadoPorSku =
    calcularTotalDisponibilizadoPorSku_(comprasAgrupadas);

  const resultado = [];
  const skusComMovimentoFornecedor = {};

  Object.keys(comprasAgrupadas).forEach(chave => {
    const compra = comprasAgrupadas[chave];

    skusComMovimentoFornecedor[compra.produto_cod] = true;

    const vendaSku =
      vendasAgrupadas[compra.produto_cod] ||
      criarVendaVazia_(compra);

    const totalDisponibilizadoSku =
      totalDisponibilizadoPorSku[compra.produto_cod] || 0;

    const tipoSku = obterTipoSku_(
      compra.produto_cod,
      mapaSkuEspecial
    );

    let qtdVendaAtribuida = 0;
    let valorVendaAtribuido = 0;

    if (tipoSku === 'COMPARTILHADO') {
      qtdVendaAtribuida = Math.min(
        compra.qtd_disponibilizada,
        vendaSku.qtd_venda
      );

      const precoMedioVendaSku =
        vendaSku.qtd_venda > 0
          ? vendaSku.valor_venda / vendaSku.qtd_venda
          : 0;

      valorVendaAtribuido =
        qtdVendaAtribuida * precoMedioVendaSku;

    } else {
      const participacaoFornecedor =
        totalDisponibilizadoSku > 0
          ? compra.qtd_disponibilizada /
            totalDisponibilizadoSku
          : 0;

      qtdVendaAtribuida =
        vendaSku.qtd_venda * participacaoFornecedor;

      valorVendaAtribuido =
        vendaSku.valor_venda * participacaoFornecedor;
    }

    const custoVendaCalculado =
      qtdVendaAtribuida * compra.custo_efetivo;

    const lucroCalculado =
      valorVendaAtribuido - custoVendaCalculado;

    const margem =
      valorVendaAtribuido > 0
        ? lucroCalculado / valorVendaAtribuido
        : 0;

    const saldoMovimentacao =
      compra.qtd_disponibilizada - qtdVendaAtribuida;

    const indiceAproveitamento =
      compra.qtd_disponibilizada > 0
        ? qtdVendaAtribuida / compra.qtd_disponibilizada
        : 0;

    const giro = indiceAproveitamento;

    resultado.push({
      fornecedor_cod: compra.fornecedor_cod,
      fornecedor: compra.fornecedor,
      produto_cod: compra.produto_cod,
      produto: compra.produto || vendaSku.produto,
      secao: '',
      grupo: '',

      qtd_compra: arredondar_(compra.qtd_compra),
      valor_compra: arredondar_(compra.valor_compra),

      qtd_bonificacao: arredondar_(
        compra.qtd_bonificacao
      ),

      valor_bonificacao: arredondar_(
        compra.valor_bonificacao
      ),

      qtd_disponibilizada: arredondar_(
        compra.qtd_disponibilizada
      ),

      qtd_venda: arredondar_(qtdVendaAtribuida),
      valor_venda: arredondar_(valorVendaAtribuido),

      qtd_devolucao: arredondar_(
        compra.qtd_devolucao
      ),

      valor_devolucao: arredondar_(
        compra.valor_devolucao
      ),

      custo_medio: arredondar_(compra.custo_medio),
      custo_efetivo: arredondar_(compra.custo_efetivo),

      custo_venda: arredondar_(
        custoVendaCalculado
      ),

      lucro: arredondar_(lucroCalculado),
      margem: arredondar_(margem),

      saldo_movimentacao: arredondar_(
        saldoMovimentacao
      ),

      indice_aproveitamento: arredondar_(
        indiceAproveitamento
      ),

      giro: arredondar_(giro),

      status:
        skusConversaoPendente[compra.produto_cod]
          ? 'CONVERSAO_PENDENTE'
          : classificarStatusSku_(
              saldoMovimentacao,
              giro,
              margem,
              qtdVendaAtribuida
            )
    });
  });


  Object.keys(vendasAgrupadas).forEach(produtoCod => {
    if (skusComMovimentoFornecedor[produtoCod]) return;

    const vendaSku = vendasAgrupadas[produtoCod];

    resultado.push({
      fornecedor_cod: 'SEM_FORNECEDOR',
      fornecedor: 'SEM_FORNECEDOR_NO_PERIODO',

      produto_cod: vendaSku.produto_cod,
      produto: vendaSku.produto,

      secao: '',
      grupo: '',

      qtd_compra: 0,
      valor_compra: 0,

      qtd_bonificacao: 0,
      valor_bonificacao: 0,

      qtd_disponibilizada: 0,

      qtd_venda: arredondar_(vendaSku.qtd_venda),
      valor_venda: arredondar_(vendaSku.valor_venda),

      qtd_devolucao: 0,
      valor_devolucao: 0,

      custo_medio: 0,
      custo_efetivo: 0,
      custo_venda: 0,

      lucro: 0,
      margem: 0,

      saldo_movimentacao: arredondar_(
        0 - vendaSku.qtd_venda
      ),

      indice_aproveitamento: 0,
      giro: 0,

      status: 'VENDA_SEM_COMPRA_NO_PERIODO'
    });
  });


  return resultado.sort((a, b) => {
    if (a.fornecedor < b.fornecedor) return -1;
    if (a.fornecedor > b.fornecedor) return 1;

    if (a.produto < b.produto) return -1;
    if (a.produto > b.produto) return 1;

    return 0;
  });
}


function agruparComprasFornecedorSku_(compras) {
  const mapa = {};

  compras.forEach(item => {
    const chave =
      `${item.fornecedor_cod}||${item.produto_cod}`;

    if (!mapa[chave]) {
      mapa[chave] = {
        fornecedor_cod: item.fornecedor_cod,
        fornecedor: item.fornecedor,

        produto_cod: item.produto_cod,
        produto: item.produto,

        qtd_compra: 0,
        valor_compra: 0,

        qtd_bonificacao: 0,
        valor_bonificacao: 0,

        qtd_devolucao: 0,
        valor_devolucao: 0,

        qtd_disponibilizada: 0,

        custo_medio: 0,
        custo_efetivo: 0
      };
    }

    const tipoOperacao =
      classificarOperacaoCompra_(item.operacao);

    if (tipoOperacao === 'BONIFICACAO') {
      mapa[chave].qtd_bonificacao += item.qtd;
      mapa[chave].valor_bonificacao += item.valor_total;
      return;
    }

    if (tipoOperacao === 'DEVOLUCAO') {
      mapa[chave].qtd_devolucao += item.qtd;
      mapa[chave].valor_devolucao += item.valor_total;
      return;
    }

    mapa[chave].qtd_compra += item.qtd;
    mapa[chave].valor_compra += item.valor_total;
  });


  Object.keys(mapa).forEach(chave => {
    const item = mapa[chave];

    item.qtd_disponibilizada =
      item.qtd_compra +
      item.qtd_bonificacao;

    item.custo_medio =
      item.qtd_compra > 0
        ? item.valor_compra / item.qtd_compra
        : 0;

    item.custo_efetivo =
      item.qtd_disponibilizada > 0
        ? item.valor_compra / item.qtd_disponibilizada
        : 0;
  });

  return mapa;
}


function classificarOperacaoCompra_(operacao) {
  const texto = normalizarTexto_(operacao);

  if (texto.includes('BONIFIC')) {
    return 'BONIFICACAO';
  }

  if (texto.includes('DEVOLU')) {
    return 'DEVOLUCAO';
  }

  return 'COMPRA';
}


function normalizarTexto_(valor) {
  return String(valor || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}


function agruparVendasSku_(vendas) {
  const mapa = {};

  vendas.forEach(item => {
    const chave = item.produto_cod;

    if (!mapa[chave]) {
      mapa[chave] = {
        produto_cod: item.produto_cod,
        produto: item.produto,

        qtd_venda: 0,
        valor_venda: 0,
        custo_venda: 0,
        lucro: 0
      };
    }

    mapa[chave].qtd_venda += item.qtd;
    mapa[chave].valor_venda += item.valor_venda;
    mapa[chave].custo_venda += item.custo_venda;
    mapa[chave].lucro += item.lucro;
  });

  return mapa;
}


function calcularTotalDisponibilizadoPorSku_(
  comprasAgrupadas
) {
  const mapa = {};

  Object.values(comprasAgrupadas).forEach(item => {
    if (!mapa[item.produto_cod]) {
      mapa[item.produto_cod] = 0;
    }

    mapa[item.produto_cod] +=
      item.qtd_disponibilizada;
  });

  return mapa;
}


function criarVendaVazia_(compra) {
  return {
    produto_cod: compra.produto_cod,
    produto: compra.produto,

    qtd_venda: 0,
    valor_venda: 0,
    custo_venda: 0,
    lucro: 0
  };
}


function gerarAnaliseFornecedor_(analiseSku) {
  const mapa = {};

  analiseSku.forEach(item => {
    const chave = item.fornecedor_cod;

    if (!mapa[chave]) {
      mapa[chave] = {
        fornecedor_cod: item.fornecedor_cod,
        fornecedor: item.fornecedor,

        qtd_skus: 0,

        qtd_compra: 0,
        valor_compra: 0,

        qtd_bonificacao: 0,
        valor_bonificacao: 0,

        qtd_disponibilizada: 0,

        qtd_venda: 0,
        valor_venda: 0,

        qtd_devolucao: 0,
        valor_devolucao: 0,

        custo_venda: 0,
        lucro: 0,
        margem: 0,
        giro: 0,

        part_compra: 0,
        part_venda: 0,

        rank_venda: '',
        rank_lucro: '',

        _skus: {}
      };
    }

    mapa[chave]._skus[item.produto_cod] = true;

    mapa[chave].qtd_compra +=
      parseNumero(item.qtd_compra);

    mapa[chave].valor_compra +=
      parseNumero(item.valor_compra);

    mapa[chave].qtd_bonificacao +=
      parseNumero(item.qtd_bonificacao);

    mapa[chave].valor_bonificacao +=
      parseNumero(item.valor_bonificacao);

    mapa[chave].qtd_disponibilizada +=
      parseNumero(item.qtd_disponibilizada);

    mapa[chave].qtd_venda +=
      parseNumero(item.qtd_venda);

    mapa[chave].valor_venda +=
      parseNumero(item.valor_venda);

    mapa[chave].qtd_devolucao +=
      parseNumero(item.qtd_devolucao);

    mapa[chave].valor_devolucao +=
      parseNumero(item.valor_devolucao);

    mapa[chave].custo_venda +=
      parseNumero(item.custo_venda);

    mapa[chave].lucro +=
      parseNumero(item.lucro);
  });


  const fornecedores = Object.values(mapa);

  const totalCompra = fornecedores.reduce(
    (soma, item) => soma + item.valor_compra,
    0
  );

  const totalVenda = fornecedores.reduce(
    (soma, item) => soma + item.valor_venda,
    0
  );


  fornecedores.forEach(item => {
    item.qtd_skus =
      Object.keys(item._skus).length;

    item.margem =
      item.valor_venda > 0
        ? item.lucro / item.valor_venda
        : 0;

    item.giro =
      item.qtd_disponibilizada > 0
        ? item.qtd_venda / item.qtd_disponibilizada
        : 0;

    item.part_compra =
      totalCompra > 0
        ? item.valor_compra / totalCompra
        : 0;

    item.part_venda =
      totalVenda > 0
        ? item.valor_venda / totalVenda
        : 0;

    delete item._skus;
  });

  aplicarRankingsFornecedor_(fornecedores);

  return fornecedores.sort(
    (a, b) => b.valor_venda - a.valor_venda
  );
}


function aplicarRankingsFornecedor_(fornecedores) {
  const porVenda =
    [...fornecedores].sort(
      (a, b) => b.valor_venda - a.valor_venda
    );

  const porLucro =
    [...fornecedores].sort(
      (a, b) => b.lucro - a.lucro
    );

  porVenda.forEach((item, indice) => {
    item.rank_venda = indice + 1;
  });

  porLucro.forEach((item, indice) => {
    item.rank_lucro = indice + 1;
  });
}


function escreverAnaliseSku_(dados) {
  limparAba('ANALISE_SKU');

  if (dados.length === 0) return;

  const linhas = dados.map(item => ([
    item.fornecedor_cod,
    item.fornecedor,
    item.produto_cod,
    item.produto,

    item.secao,
    item.grupo,

    item.qtd_compra,
    item.valor_compra,

    item.qtd_bonificacao,
    item.valor_bonificacao,

    item.qtd_disponibilizada,

    item.qtd_venda,
    item.valor_venda,

    item.qtd_devolucao,
    item.valor_devolucao,

    item.custo_medio,
    item.custo_efetivo,
    item.custo_venda,

    item.lucro,
    item.margem,

    item.saldo_movimentacao,
    item.indice_aproveitamento,
    item.giro,
    item.status
  ]));

  obterAba('ANALISE_SKU')
    .getRange(
      2,
      1,
      linhas.length,
      linhas[0].length
    )
    .setValues(linhas);
}


function escreverAnaliseFornecedor_(dados) {
  limparAba('ANALISE_FORNECEDOR');

  if (dados.length === 0) return;

  const linhas = dados.map(item => ([
    item.fornecedor_cod,
    item.fornecedor,
    item.qtd_skus,

    arredondar_(item.qtd_compra),
    arredondar_(item.valor_compra),

    arredondar_(item.qtd_bonificacao),
    arredondar_(item.valor_bonificacao),

    arredondar_(item.qtd_disponibilizada),

    arredondar_(item.qtd_venda),
    arredondar_(item.valor_venda),

    arredondar_(item.qtd_devolucao),
    arredondar_(item.valor_devolucao),

    arredondar_(item.custo_venda),
    arredondar_(item.lucro),
    arredondar_(item.margem),
    arredondar_(item.giro),

    arredondar_(item.part_compra),
    arredondar_(item.part_venda),

    item.rank_venda,
    item.rank_lucro
  ]));

  obterAba('ANALISE_FORNECEDOR')
    .getRange(
      2,
      1,
      linhas.length,
      linhas[0].length
    )
    .setValues(linhas);
}


function classificarStatusSku_(
  saldo,
  giro,
  margem,
  qtdVenda
) {
  if (qtdVenda <= 0) {
    return 'SEM_GIRO';
  }

  if (saldo < 0 || giro > 1.15) {
    return 'VENDA_ACIMA_DISPONIBILIZADO';
  }

  if (giro < 0.50 && saldo > 0) {
    return 'EXCESSO';
  }

  if (margem < 0.10 && giro > 0) {
    return 'MARGEM_BAIXA';
  }

  if (giro >= 0.70 && giro <= 1.15) {
    return 'SAUDAVEL';
  }

  return 'ATENCAO';
}


function arredondar_(valor) {
  return Math.round(
    (Number(valor) || 0) * 10000
  ) / 10000;
}


function atualizarVendasSemCompra() {
  const analiseSku = lerDados('ANALISE_SKU');

  const vendasSemCompra = analiseSku
    .filter(item =>
      item.status ===
      'VENDA_SEM_COMPRA_NO_PERIODO'
    )
    .map(item => ([
      item.produto_cod,
      item.produto,

      parseNumero(item.qtd_venda),
      parseNumero(item.valor_venda),
      parseNumero(item.custo_venda),
      parseNumero(item.lucro),
      parseNumero(item.margem),

      item.status
    ]));

  const aba = obterAba('VENDAS_SEM_COMPRA');

  limparAba('VENDAS_SEM_COMPRA');

  if (vendasSemCompra.length === 0) return;

  aba
    .getRange(
      2,
      1,
      vendasSemCompra.length,
      8
    )
    .setValues(vendasSemCompra);
}


function atualizarAnaliseFornecedorSku() {
  const analiseSku =
    lerDados('ANALISE_SKU');

  const periodo =
    obterPeriodoAnalise();

  const dataInicial =
    new Date(periodo.dataInicial);

  const dataFinal =
    new Date(periodo.dataFinal);

  dataInicial.setHours(0, 0, 0, 0);
  dataFinal.setHours(0, 0, 0, 0);

  const diasPeriodo =
    Math.floor(
      (dataFinal - dataInicial) /
      (1000 * 60 * 60 * 24)
    ) + 1;


  const itensBase =
    analiseSku.map(item => {

      const qtdCompra =
        parseNumero(item.qtd_compra);

      const valorCompra =
        parseNumero(item.valor_compra);

      const qtdBonificacao =
        parseNumero(item.qtd_bonificacao);

      const valorBonificacao =
        parseNumero(item.valor_bonificacao);

      const qtdDisponibilizada =
        parseNumero(item.qtd_disponibilizada);

      const qtdVenda =
        parseNumero(item.qtd_venda);

      const valorVenda =
        parseNumero(item.valor_venda);

      const qtdDevolucao =
        parseNumero(item.qtd_devolucao);

      const valorDevolucao =
        parseNumero(item.valor_devolucao);

      const custoMedio =
        parseNumero(item.custo_medio);

      const custoEfetivo =
        parseNumero(item.custo_efetivo);

      const custoVenda =
        parseNumero(item.custo_venda);


      const vendaMediaUn =
        qtdVenda > 0
          ? valorVenda / qtdVenda
          : 0;

      const lucro =
        parseNumero(item.lucro);

      const margem =
        parseNumero(item.margem);

      const faturamentoDia =
        diasPeriodo > 0
          ? valorVenda / diasPeriodo
          : 0;

      const saldoMovimentacao =
        parseNumero(item.saldo_movimentacao);

      const saldoPeriodoValor =
        saldoMovimentacao *
        custoEfetivo;

      const vendaMediaDia =
        diasPeriodo > 0
          ? qtdVenda / diasPeriodo
          : 0;

      const coberturaDias =
        vendaMediaDia > 0
          ? saldoMovimentacao /
            vendaMediaDia
          : 0;

      const indiceAproveitamento =
        parseNumero(item.indice_aproveitamento);

      const giro =
        parseNumero(item.giro);


      const conversaoPendente =
        String(item.status || '')
          .trim()
          .toUpperCase() ===
        'CONVERSAO_PENDENTE';

      let statusOperacional;
      let statusFinanceiro;
      let acaoSugerida;

      if (conversaoPendente) {
        statusOperacional =
          'CONVERSAO_PENDENTE';

        statusFinanceiro =
          'CONVERSAO_PENDENTE';

        acaoSugerida =
          'VALIDAR_CONVERSAO';

      } else {
        statusOperacional =
          classificarStatusOperacional_(
            qtdVenda,
            coberturaDias,
            saldoMovimentacao
          );

        // Regra especial para item que teve
        // 100% da disponibilidade aproveitada.
        if (
          String(item.status || '').trim() ===
            'SAUDAVEL' &&
          qtdVenda > 0 &&
          saldoMovimentacao === 0 &&
          giro >= 0.99
        ) {
          statusOperacional = 'SAUDAVEL';
        }

        statusFinanceiro =
          classificarStatusFinanceiro_(
            margem,
            qtdVenda
          );

        acaoSugerida =
          definirAcaoSugerida_(
            statusOperacional,
            statusFinanceiro
          );
      }


      return {
        fornecedor_cod: item.fornecedor_cod,
        fornecedor: item.fornecedor,

        produto_cod: item.produto_cod,
        produto: item.produto,

        qtd_compra: qtdCompra,
        valor_compra: valorCompra,

        qtd_bonificacao: qtdBonificacao,
        valor_bonificacao: valorBonificacao,

        qtd_disponibilizada: qtdDisponibilizada,

        qtd_venda: qtdVenda,
        valor_venda: valorVenda,

        qtd_devolucao: qtdDevolucao,
        valor_devolucao: valorDevolucao,

        custo_medio: custoMedio,
        custo_efetivo: custoEfetivo,
        custo_venda: custoVenda,

        venda_media_un: vendaMediaUn,

        lucro,
        margem,

        faturamento_dia: faturamentoDia,
        classe_abc: '',

        saldo_movimentacao: saldoMovimentacao,
        saldo_periodo_valor: saldoPeriodoValor,

        venda_media_dia: vendaMediaDia,
        cobertura_dias: coberturaDias,

        indice_aproveitamento: indiceAproveitamento,
        giro,

        status: item.status,
        status_operacional: statusOperacional,
        status_financeiro: statusFinanceiro,
        acao_sugerida: acaoSugerida
      };
    });


  aplicarClasseAbcPorFaturamento_(itensBase);


  const linhas = itensBase.map(item => ([
    item.fornecedor_cod,
    item.fornecedor,

    item.produto_cod,
    item.produto,

    arredondar_(item.qtd_compra),
    arredondar_(item.valor_compra),

    arredondar_(item.qtd_bonificacao),
    arredondar_(item.valor_bonificacao),

    arredondar_(item.qtd_disponibilizada),

    arredondar_(item.qtd_venda),
    arredondar_(item.valor_venda),

    arredondar_(item.qtd_devolucao),
    arredondar_(item.valor_devolucao),

    arredondar_(item.custo_medio),
    arredondar_(item.custo_efetivo),
    arredondar_(item.custo_venda),

    arredondar_(item.venda_media_un),

    arredondar_(item.lucro),
    arredondar_(item.margem),

    arredondar_(item.faturamento_dia),
    item.classe_abc,

    arredondar_(item.saldo_movimentacao),
    arredondar_(item.saldo_periodo_valor),

    arredondar_(item.venda_media_dia),
    arredondar_(item.cobertura_dias),

    arredondar_(item.indice_aproveitamento),
    arredondar_(item.giro),

    item.status,
    item.status_operacional,
    item.status_financeiro,
    item.acao_sugerida
  ]));


  const aba =
    obterAba('ANALISE_FORNECEDOR_SKU');

  const ultimaLinha =
    aba.getLastRow();

  if (ultimaLinha > 1) {
    aba
      .getRange(
        2,
        1,
        ultimaLinha - 1,
        31
      )
      .clearContent();
  }

  if (linhas.length === 0) return;

  aba
    .getRange(
      2,
      1,
      linhas.length,
      31
    )
    .setValues(linhas);
}


function aplicarClasseAbcPorFaturamento_(itens) {
  const totalFaturamento =
    itens.reduce(
      (soma, item) =>
        soma + parseNumero(item.valor_venda),
      0
    );

  if (totalFaturamento <= 0) {
    itens.forEach(item => {
      item.classe_abc = 'C';
    });

    return;
  }


  const ordenados =
    [...itens].sort(
      (a, b) =>
        parseNumero(b.valor_venda) -
        parseNumero(a.valor_venda)
    );

  let acumulado = 0;

  ordenados.forEach(item => {
    acumulado +=
      parseNumero(item.valor_venda);

    const participacaoAcumulada =
      acumulado / totalFaturamento;

    if (participacaoAcumulada <= 0.80) {
      item.classe_abc = 'A';

    } else if (participacaoAcumulada <= 0.95) {
      item.classe_abc = 'B';

    } else {
      item.classe_abc = 'C';
    }
  });
}


function classificarStatusOperacional_(
  qtdVenda,
  coberturaDias,
  saldoMovimentacao
) {
  if (qtdVenda <= 0) {
    return 'SEM_GIRO';
  }

  if (saldoMovimentacao <= 0) {
    return 'RUPTURA';
  }

  if (coberturaDias <= 7) {
    return 'RUPTURA';
  }

  if (coberturaDias <= 15) {
    return 'ATENCAO';
  }

  if (coberturaDias <= 30) {
    return 'SAUDAVEL';
  }

  return 'EXCESSO';
}


function classificarStatusFinanceiro_(
  margem,
  qtdVenda
) {
  if (qtdVenda <= 0) {
    return 'SEM_VENDA';
  }

  if (margem <= 0.10) {
    return 'MARGEM_MUITO_BAIXA';
  }

  if (margem < 0.20) {
    return 'MARGEM_BAIXA';
  }

  if (margem <= 0.35) {
    return 'MARGEM_NORMAL';
  }

  return 'MARGEM_ALTA';
}


function definirAcaoSugerida_(
  statusOperacional,
  statusFinanceiro
) {
  if (
    statusOperacional === 'RUPTURA' &&
    statusFinanceiro === 'MARGEM_ALTA'
  ) {
    return 'AUMENTAR_COMPRA_PRIORIDADE';
  }

  if (statusOperacional === 'RUPTURA') {
    return 'AVALIAR_REPOSICAO';
  }

  if (
    statusOperacional === 'EXCESSO' &&
    (
      statusFinanceiro ===
        'MARGEM_MUITO_BAIXA' ||
      statusFinanceiro ===
        'MARGEM_BAIXA'
    )
  ) {
    return 'REDUZIR_COMPRA_URGENTE';
  }

  if (statusOperacional === 'EXCESSO') {
    return 'SEGURAR_COMPRA';
  }

  if (statusOperacional === 'SEM_GIRO') {
    return 'INVESTIGAR_PRODUTO_SEM_VENDA';
  }

  if (statusOperacional === 'ATENCAO') {
    return 'ACOMPANHAR_ESTOQUE';
  }

  if (
    statusOperacional === 'SAUDAVEL' &&
    statusFinanceiro === 'MARGEM_ALTA'
  ) {
    return 'MANTER_E_PRIORIZAR';
  }

  if (statusOperacional === 'SAUDAVEL') {
    return 'MANTER_COMPRA';
  }

  return 'ANALISAR';
}