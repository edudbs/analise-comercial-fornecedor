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

    atualizarAnaliseRitmoCompras();

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
        qtd: parseNumero(item.qtd_compra_convertida),
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
function onOpen() {
  const ui = SpreadsheetApp.getUi();

  ui
    .createMenu('Análise Comercial')

    .addItem('1. Importar Compras do Drive', 'importarComprasDoDrive')
    .addItem('2. Importar Vendas do Drive', 'importarVendasDoDrive')
    .addItem('3. Importar Tudo', 'importarTudoDoDrive')

    .addSeparator()

    .addItem('4. Atualizar Análises', 'atualizarAnalises')
    .addItem('5. Atualizar Auditoria', 'atualizarAuditoria')
    .addItem('6. Atualizar Dashboard', 'atualizarDashboard')
    .addItem('7. Atualizar Movimentos Especiais', 'atualizarMovimentosEspeciais')

    .addSeparator()
    
    .addItem('8. Reprocessar conversões de compras', 'reprocessarConversoesCompras')

    .addItem('9. Detalhar histórico de compras', 'abrirHistoricoComprasSidebar')
    
    .addSeparator()

    .addItem('10. Limpar Bases', 'limparBases')

    .addToUi();


  ui
    .createMenu('Instruções')

    .addItem(
      'Parâmetros dos Relatórios',
      'abrirInstrucoesRelatorios_'
    )

    .addToUi();
}


function importarTudoDoDrive() {
  importarComprasDoDrive();
  importarVendasDoDrive();
}


function limparBases() {
  const ui = SpreadsheetApp.getUi();

  const resposta = ui.alert(
    'Limpar bases',
    'Isso apagará os dados importados e as análises geradas, mantendo os cabeçalhos. Deseja continuar?',
    ui.ButtonSet.YES_NO
  );

  if (resposta !== ui.Button.YES) return;

  limparAbaMantendoCabecalho_('COMPRAS_RAW');
  limparAbaMantendoCabecalho_('VENDAS_RAW');

  limparAbaMantendoCabecalho_('ANALISE_SKU');
  limparAbaMantendoCabecalho_('ANALISE_SKU_CONSOLIDADA');
  limparAbaMantendoCabecalho_('ANALISE_FORNECEDOR');
  limparAbaMantendoCabecalho_('ANALISE_FORNECEDOR_SKU');

  const abaRitmo = SpreadsheetApp
    .getActiveSpreadsheet()
    .getSheetByName('ANALISE_RITMO_COMPRAS');

  if (abaRitmo) {
    limparAbaMantendoCabecalho_('ANALISE_RITMO_COMPRAS');
  }

  limparAbaMantendoCabecalho_('VENDAS_SEM_COMPRA');
  limparAbaMantendoCabecalho_('MOVIMENTOS_ESPECIAIS');

  limparAbaMantendoCabecalho_('AUDITORIA');
  limparAbaMantendoCabecalho_('DASHBOARD');

  ui.alert('Bases e análises limpas com sucesso.');
}


function limparAbaMantendoCabecalho_(nomeAba) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const aba = ss.getSheetByName(nomeAba);

  if (!aba) {
    throw new Error('Aba não encontrada: ' + nomeAba);
  }

  const ultimaLinha = aba.getLastRow();
  const ultimaColuna = aba.getLastColumn();

  if (ultimaLinha <= 1) return;

  aba
    .getRange(
      2,
      1,
      ultimaLinha - 1,
      ultimaColuna
    )
    .clearContent();
}


function abrirInstrucoesRelatorios_() {
  const html = HtmlService.createHtmlOutput(`
    <!DOCTYPE html>
    <html>
      <head>
        <base target="_top">

        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
            color: #1f2937;
            line-height: 1.5;
          }

          h2 {
            margin-top: 0;
            color: #111827;
          }

          h3 {
            margin-top: 24px;
            margin-bottom: 8px;
            color: #1f2937;
          }

          .caminho {
            background: #f3f4f6;
            padding: 10px 12px;
            border-radius: 6px;
            margin-bottom: 12px;
            font-weight: bold;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }

          th,
          td {
            padding: 8px 10px;
            border-bottom: 1px solid #e5e7eb;
            text-align: left;
            vertical-align: top;
          }

          th {
            background: #f9fafb;
          }

          .alerta {
            margin-top: 20px;
            padding: 12px;
            background: #fff7ed;
            border-left: 4px solid #f97316;
          }

          .acoes {
            text-align: right;
            margin-top: 20px;
          }

          button {
            padding: 8px 16px;
            cursor: pointer;
          }
        </style>
      </head>

      <body>

        <h2>Parâmetros dos Relatórios — Varejo Fácil</h2>

        <h3>1. Compras</h3>

        <div class="caminho">
          Varejo Fácil &gt; Compra &gt; Nota Fiscal Entrada
        </div>

        <table>
          <tr>
            <th>Parâmetro</th>
            <th>Configuração</th>
          </tr>

          <tr>
            <td>Fornecedor</td>
            <td>Fornecedor da análise</td>
          </tr>

          <tr>
            <td>Data</td>
            <td><strong>Entrada</strong></td>
          </tr>

          <tr>
            <td>Formato</td>
            <td>☑ Analítico</td>
          </tr>

          <tr>
            <td>Situações</td>
            <td>☑ Efetivada (EFT)</td>
          </tr>

          <tr>
            <td>Exibição</td>
            <td><strong>CSV</strong></td>
          </tr>
        </table>


        <h3>2. Vendas</h3>

        <div class="caminho">
          Varejo Fácil &gt; Venda &gt; ABC Venda
        </div>

        <table>
          <tr>
            <th>Parâmetro</th>
            <th>Configuração</th>
          </tr>

          <tr>
            <td>Período</td>
            <td>Período Inicial / Período Final</td>
          </tr>

          <tr>
            <td>Fornecedor</td>
            <td>Fornecedor da análise</td>
          </tr>

          <tr>
            <td>Quebra (nível 1)</td>
            <td><strong>Data</strong></td>
          </tr>

          <tr>
            <td>Opções</td>
            <td>
              ☑ Classifica ABC<br>
              ☑ Considerar fornecedor secundário
            </td>
          </tr>

          <tr>
            <td>Exibição</td>
            <td><strong>CSV</strong></td>
          </tr>
        </table>


        <h3>3. Salvamento dos arquivos</h3>

        <div class="caminho">
          Google Drive &gt; Importados
        </div>

        <table>
          <tr>
            <th>Relatório</th>
            <th>Salvar em</th>
          </tr>

          <tr>
            <td>Compras</td>
            <td><strong>Importados &gt; Compras</strong></td>
          </tr>

          <tr>
            <td>Vendas</td>
            <td><strong>Importados &gt; Vendas</strong></td>
          </tr>
        </table>

        <div class="alerta">
          <strong>Importante:</strong>
          os arquivos CSV devem ser salvos diretamente na raiz das
          respectivas pastas Compras ou Vendas. Não colocar os arquivos
          em subpastas.
        </div>

        <div class="alerta">
          <strong>Atenção:</strong>
          confira se os relatórios de Compras e Vendas correspondem
          ao fornecedor e período que serão analisados antes da importação.
        </div>

        <div class="acoes">
          <button onclick="google.script.host.close()">
            Fechar
          </button>
        </div>

      </body>
    </html>
  `)
    .setWidth(650)
    .setHeight(650);

  SpreadsheetApp
    .getUi()
    .showModalDialog(
      html,
      'Instruções — Relatórios Varejo Fácil'
    );
}
# Indicadores

A principal visão operacional atual é `ANALISE_FORNECEDOR_SKU`.

`ANALISE_RITMO_COMPRAS` complementa essa visão com datas, frequência e
tamanho dos eventos de compra. Bonificações e devoluções não contam como
eventos de compra. Compras normais do mesmo fornecedor e produto na mesma
data de entrada formam um único evento.

## Quantidades e movimentos

### qtd_compra
Quantidade comprada em operações normais, já normalizada para a unidade comercial de análise.

### qtd_bonificacao
Quantidade recebida sem compor a compra normal.

### qtd_devolucao
Quantidade devolvida. É apresentada separadamente porque a devolução pode se referir a compras anteriores ao período.

### qtd_disponibilizada
Relação líquida dos movimentos de entrada considerados na janela:

```text
qtd_compra + qtd_bonificacao - qtd_devolucao
```

### qtd_venda
Quantidade vendida vinculada ao SKU/fornecedor conforme as regras de atribuição do projeto.

## Valores

### valor_compra
Valor financeiro das compras normais, baseado no `Valor total do item` importado.

### valor_bonificacao
Valor informativo das bonificações.

### valor_devolucao
Valor das devoluções.

### valor_venda
Faturamento atribuído ao SKU/fornecedor.

### valor_venda_media_un
Valor médio de venda por unidade.

## Custos e resultado

### custo_medio
Custo médio das unidades compradas normalmente.

### custo_efetivo
Custo ajustado pelo efeito das bonificações. Quando há bonificação, o mesmo valor de compra é distribuído por uma quantidade maior de unidades disponíveis.

### custo_venda
Custo estimado das unidades efetivamente vendidas com base no custo efetivo.

### lucro

```text
valor_venda - custo_venda
```

### margem

```text
lucro / valor_venda
```

## Ritmo e capital

### faturamento_dia
Faturamento médio por dia no período.

### qtd_venda_media_dia
Quantidade média vendida por dia.

### saldo_movimentacao
Diferença entre quantidade disponibilizada e quantidade vendida dentro da janela analisada.

Não representa necessariamente estoque físico atual.

### saldo_periodo_valor
Estimativa do valor associado ao saldo de movimentação do período.

### cobertura_dias
Quantidade de dias que o saldo de movimentação representaria no ritmo médio de venda do período.

Como ainda não há estoque inicial/físico integrado, deve ser interpretada como indicador operacional da janela, não como cobertura física exata.

### indice_aproveitamento
Percentual da quantidade disponibilizada que foi vendida no período.

### giro
Indicador da relação entre vendas e quantidade disponibilizada conforme a regra implementada no projeto.

## ABC

`classe_abc` classifica o SKU pela participação acumulada no faturamento:

- A: primeiros 80%;
- B: próximos 15%;
- C: últimos 5%.

## Status operacional

Referência atual:

- `RUPTURA`: cobertura até 7 dias;
- `ATENCAO`: 8 a 15 dias;
- `SAUDAVEL`: 16 a 30 dias;
- `EXCESSO`: acima de 30 dias;
- `SEM_GIRO`: ausência de venda.

`CONVERSAO_PENDENTE` tem precedência quando a unidade de compra ainda não foi validada.

## Status financeiro

Referência atual:

- `MARGEM_MUITO_BAIXA`: até 10%;
- `MARGEM_BAIXA`: 11% a 19%;
- `MARGEM_NORMAL`: 20% a 35%;
- `MARGEM_ALTA`: acima de 35%.

## Ação sugerida

`acao_sugerida` transforma os diagnósticos em orientação operacional. Para conversão não validada, a ação deve ser `VALIDAR_CONVERSAO` antes de qualquer decisão de compra baseada no giro/cobertura.

## Regra de interpretação

Nenhum indicador deve ser interpretado isoladamente. Compra, venda, margem, cobertura, bonificações, devoluções, conversão de embalagem e existência de estoque anterior precisam ser considerados em conjunto.
# Modelo de Dados

Este documento registra a estrutura lógica conhecida das principais abas. Cabeçalhos devem ser mantidos sincronizados com o código Apps Script.

## COMPRAS_RAW

Estrutura alvo aprovada para a próxima migração:

```text
data_emissao
data_entrada
nota
fornecedor_cod
fornecedor
produto_cod
produto
unidade_compra
unidades_por_embalagem
qtd_compra_convertida
custo_unit
valor_total
operacao
qtd_original_compra
fator_conversao_aplicado
```

Observação: esta nomenclatura é a estrutura alvo. A migração do código e da planilha deve ocorrer de forma controlada para não quebrar rotinas que ainda leem os nomes anteriores.

## VENDAS_RAW

```text
data_venda
produto_cod
produto
qtd
faturamento
preco_medio
custo_total
lucro
margem
```

## MOVIMENTOS_ESPECIAIS

```text
data_entrada
nota
fornecedor_cod
fornecedor
produto_cod
produto
operacao
qtd
valor_total
```

## MAPA_CONVERSAO_UNIDADE

```text
produto_cod
produto
unidade_compra
fator_conversao
origem
status
observacao
```

Chave lógica: `produto_cod + unidade_compra`.

## CONVERSOES_PENDENTES

```text
produto_cod
produto
unidade_compra
qtd_unidade
qtd_compra
valor_compra
qtd_venda
custo_unitario_venda
fator_estimado
status
```

Esta é uma fila derivada e pode ser regenerada.

## MAPA_PRODUTO_ANALISE

```text
produto_cod
produto
produto_analise_cod
produto_analise
```

Permite consolidar SKUs físicos distintos no mesmo produto econômico.

## MAPA_SKU_ESPECIAL

```text
produto_cod
produto
tipo_sku
observacao
```

Usado para regras especiais, incluindo SKU compartilhado entre fornecedores.

## ANALISE_SKU

```text
fornecedor_cod
fornecedor
produto_cod
produto
secao
grupo
qtd_compra
valor_compra
qtd_bonificacao
valor_bonificacao
qtd_disponibilizada
qtd_venda
valor_venda
qtd_devolucao
valor_devolucao
custo_medio
custo_efetivo
custo_venda
lucro
margem
saldo_movimentacao
indice_aproveitamento
giro
status
```

## ANALISE_FORNECEDOR_SKU

```text
fornecedor_cod
fornecedor
produto_cod
produto
qtd_compra
valor_compra
qtd_bonificacao
valor_bonificacao
qtd_disponibilizada
qtd_venda
valor_venda
qtd_devolucao
valor_devolucao
custo_medio
custo_efetivo
custo_venda
valor_venda_media_un
lucro
margem
faturamento_dia
classe_abc
saldo_movimentacao
saldo_periodo_valor
qtd_venda_media_dia
cobertura_dias
indice_aproveitamento
giro
status
status_operacional
status_financeiro
acao_sugerida
```

## ANALISE_FORNECEDOR

```text
fornecedor_cod
fornecedor
qtd_skus
qtd_compra
valor_compra
qtd_bonificacao
valor_bonificacao
qtd_disponibilizada
qtd_venda
valor_venda
qtd_devolucao
valor_devolucao
custo_venda
lucro
margem
giro
part_compra
part_venda
rank_venda
rank_lucro
```

## ANALISE_RITMO_COMPRAS

Visão temporal por fornecedor e produto econômico. Cada evento de compra
corresponde às compras normais do mesmo fornecedor e produto recebidas na
mesma `data_entrada`.

```text
fornecedor_cod
fornecedor
produto_cod
produto
primeira_compra
ultima_compra
dias_sem_comprar
eventos_compra
intervalo_medio_dias
qtd_media_por_compra
qtd_ultima_compra
valor_ultima_compra
cobertura_dias
cobertura_intervalo
status_ritmo
```

## ANALISE_SKU_CONSOLIDADA

```text
produto_cod
produto
qtd_fornecedores
qtd_compra
valor_compra
qtd_bonificacao
valor_bonificacao
qtd_disponibilizada
qtd_venda
valor_venda
qtd_devolucao
valor_devolucao
custo_medio
custo_efetivo
custo_venda
lucro
margem
saldo_movimentacao
indice_aproveitamento
giro
fornecedor_principal
part_fornecedor_principal
status
```

## Abas permanentes versus regeneráveis

Permanentes/configuração:

- `MAPA_PRODUTO_ANALISE`
- `MAPA_SKU_ESPECIAL`
- `MAPA_CONVERSAO_UNIDADE`

Regeneráveis/importadas:

- `COMPRAS_RAW`
- `VENDAS_RAW`
- `MOVIMENTOS_ESPECIAIS`
- `CONVERSOES_PENDENTES`
- `VENDAS_SEM_COMPRA`
- abas `ANALISE_*`
- `AUDITORIA`
- `DASHBOARD`.
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
<!DOCTYPE html>
<html>
  <head>
    <base target="_top">
    <style>
      body { font-family: Arial, sans-serif; color: #1f2937; padding: 12px; }
      h2 { font-size: 18px; margin: 0 0 4px; }
      .subtitulo { color: #6b7280; font-size: 12px; margin-bottom: 16px; }
      .filtros { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
      label { display: block; font-size: 11px; color: #6b7280; margin-bottom: 3px; }
      input[type="text"] { box-sizing: border-box; width: 100%; padding: 7px; border: 1px solid #d1d5db; border-radius: 5px; }
      .check { margin: 10px 0; font-size: 12px; }
      button { width: 100%; padding: 9px; border: 0; border-radius: 5px; background: #2563eb; color: white; cursor: pointer; }
      .erro { color: #b91c1c; font-size: 12px; margin-top: 10px; }
      .cards { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; margin: 14px 0; }
      .card { background: #f3f4f6; border-radius: 6px; padding: 8px; }
      .card span { display: block; color: #6b7280; font-size: 10px; }
      .card strong { display: block; font-size: 13px; margin-top: 3px; }
      .status { grid-column: 1 / -1; }
      table { width: 100%; border-collapse: collapse; font-size: 11px; }
      th, td { border-bottom: 1px solid #e5e7eb; padding: 6px 3px; text-align: left; }
      th { position: sticky; top: 0; background: white; }
      .numero { text-align: right; }
      .vazio { color: #6b7280; font-size: 12px; padding: 12px 0; }
    </style>
  </head>
  <body>
    <h2 id="produto">Carregando...</h2>
    <div class="subtitulo" id="fornecedor"></div>

    <div class="filtros">
      <div><label>Data inicial</label><input id="dataInicial" type="text" placeholder="dd/mm/aaaa"></div>
      <div><label>Data final</label><input id="dataFinal" type="text" placeholder="dd/mm/aaaa"></div>
    </div>
    <div class="check">
      <label><input id="incluirMovimentos" type="checkbox"> Incluir bonificações e devoluções</label>
    </div>
    <button onclick="consultar()">Atualizar visualização</button>
    <div class="erro" id="erro"></div>
    <div id="resultado"></div>

    <script>
      let contexto = null;

      google.script.run
        .withSuccessHandler(inicializar)
        .withFailureHandler(exibirErro)
        .obterContextoHistoricoComprasSelecionado();

      function inicializar(dados) {
        contexto = dados;
        document.getElementById('produto').textContent = dados.produto_cod + ' — ' + dados.produto;
        document.getElementById('fornecedor').textContent = dados.fornecedor_cod + ' — ' + dados.fornecedor;
        document.getElementById('dataInicial').value = dados.data_inicial;
        document.getElementById('dataFinal').value = dados.data_final;
        consultar();
      }

      function consultar() {
        if (!contexto) return;
        document.getElementById('erro').textContent = '';
        document.getElementById('resultado').innerHTML = '<div class="vazio">Consultando...</div>';

        google.script.run
          .withSuccessHandler(renderizar)
          .withFailureHandler(exibirErro)
          .consultarHistoricoCompras({
            fornecedor_cod: contexto.fornecedor_cod,
            produto_cod: contexto.produto_cod,
            data_inicial: document.getElementById('dataInicial').value,
            data_final: document.getElementById('dataFinal').value,
            incluir_movimentos: document.getElementById('incluirMovimentos').checked
          });
      }

      function renderizar(dados) {
        if (!dados.resumo) {
          document.getElementById('resultado').innerHTML = '<div class="vazio">Nenhuma compra normal encontrada no período.</div>';
          return;
        }

        const r = dados.resumo;
        const cards = [
          ['Primeira compra', r.primeira_compra],
          ['Última compra', r.ultima_compra],
          ['Dias sem comprar', r.dias_sem_comprar],
          ['Eventos de compra', r.eventos_compra],
          ['Intervalo médio', formatarNumero(r.intervalo_medio_dias) + ' dias'],
          ['Qtd. média/evento', formatarNumero(r.qtd_media_por_compra)],
          ['Cobertura estimada', formatarNumero(r.cobertura_dias) + ' dias'],
          ['Cobertura ÷ intervalo', formatarNumero(r.cobertura_intervalo)],
          ['Status do ritmo', r.status_ritmo, 'status']
        ];

        let html = '<div class="cards">' + cards.map(card =>
          '<div class="card ' + (card[2] || '') + '"><span>' + card[0] + '</span><strong>' + card[1] + '</strong></div>'
        ).join('') + '</div>';

        html += '<table><thead><tr><th>Data</th><th>Nota</th><th>Operação</th><th class="numero">Qtd.</th><th class="numero">Valor</th></tr></thead><tbody>';
        html += dados.movimentos.map(item =>
          '<tr><td>' + item.data + '</td><td>' + escapar(item.nota) + '</td><td>' + escapar(item.operacao) + '</td><td class="numero">' + formatarNumero(item.qtd) + '</td><td class="numero">' + formatarMoeda(item.valor) + '</td></tr>'
        ).join('');
        html += '</tbody></table>';
        document.getElementById('resultado').innerHTML = html;
      }

      function exibirErro(erro) {
        document.getElementById('resultado').innerHTML = '';
        document.getElementById('erro').textContent = erro.message || String(erro);
      }

      function formatarNumero(valor) {
        return Number(valor || 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
      }

      function formatarMoeda(valor) {
        return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      }

      function escapar(valor) {
        const div = document.createElement('div');
        div.textContent = valor == null ? '' : String(valor);
        return div.innerHTML;
      }
    </script>
  </body>
</html>
