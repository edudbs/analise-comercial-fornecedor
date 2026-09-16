function importarComprasDoDrive() {
  const ui = SpreadsheetApp.getUi();

  try {
    const arquivos = listarArquivosCsvPendentes(
      PASTA_CSV_COMPRAS_ID
    );

    if (arquivos.length === 0) {
      registrarNenhumArquivo('COMPRAS');

      ui.alert(
        'Nenhum CSV de compras pendente encontrado.'
      );

      return;
    }

    let totalRegistros = 0;

    arquivos.forEach(arquivo => {
      const conteudo =
        lerConteudoArquivoCsv(arquivo);

      garantirColunaComprasRaw_(
        'qtd_embalagem_corrigida',
        'unidades_por_embalagem_corrigida'
      );

      const registros =
        processarCsvCompras(conteudo);

      if (registros.length > 0) {
        inserirComprasRaw(registros);
      }

      totalRegistros +=
        registros.length;

      registrarSucesso(
        'COMPRAS',
        arquivo.getName(),
        registros.length
      );

      moverArquivoParaProcessados(
        arquivo,
        PASTA_CSV_COMPRAS_ID
      );
    });

    atualizarConversoesPendentes_();

    ui.alert(
      `Importação de compras concluída.\n` +
      `Registros importados: ${totalRegistros}`
    );

  } catch (erro) {
    registrarErro(
      'IMPORTAR_COMPRAS',
      erro
    );

    ui.alert(
      'Erro ao importar compras: ' +
      erro.message
    );
  }
}


function processarCsvCompras(conteudoCsv) {
  const linhas = Utilities.parseCsv(
    conteudoCsv,
    ';'
  );

  if (!linhas || linhas.length <= 1) {
    return [];
  }

  const cabecalhos =
    linhas[0].map(
      h => normalizarTexto(h)
    );

  const idx = {
    dataEmissao:
      cabecalhos.indexOf(
        'DATA DE EMISSAO'
      ),

    dataEntrada:
      cabecalhos.indexOf(
        'DATA DE ENTRADA'
      ),

    nota:
      cabecalhos.indexOf(
        'NUMERO DO DOCUMENTO'
      ),

    fornecedorCod:
      cabecalhos.indexOf(
        'CODIGO DO FORNECEDOR'
      ),

    fornecedor:
      cabecalhos.indexOf(
        'NOME DO FORNECEDOR'
      ),

    produtoCod:
      cabecalhos.indexOf(
        'CODIGO DO PRODUTO'
      ),

    produto:
      cabecalhos.indexOf(
        'DESCRICAO PRODUTO'
      ),

    unidade:
      cabecalhos.indexOf(
        'UNIDADE DE MEDIDA'
      ),

    qtdUnidade:
      cabecalhos.indexOf(
        'QUANTIDADE DE ITENS NA UNIDADE'
      ),

    qtdItens:
      cabecalhos.indexOf(
        'QUANTIDADE DE ITENS'
      ),

    custoUnit:
      cabecalhos.indexOf(
        'VALOR UNITARIO'
      ),

    valorTotal:
      cabecalhos.indexOf(
        'VALOR TOTAL DO ITEM'
      ),

    operacao:
      cabecalhos.indexOf(
        'OPERACAO'
      )
  };

  validarIndicesCompras_(idx);

  const mapaConversao =
    carregarMapaConversaoUnidade_();

  return linhas
    .slice(1)

    .filter(
      linha =>
        linha.join('').trim() !== ''
    )

    .map(linha => {
      const produtoCod =
        limparCodigo_(
          linha[idx.produtoCod]
        );

      const produto =
        String(
          linha[idx.produto] || ''
        ).trim();

      const unidade =
        String(
          linha[idx.unidade] || ''
        )
          .trim()
          .toUpperCase();

      const qtdUnidade =
        parseNumero(
          linha[idx.qtdUnidade]
        );

      /*
       * qtdItens representa a quantidade
       * fiscal original do relatório.
       *
       * Ela será preservada em
       * qtd_original.
       */
      const qtdItens =
        parseNumero(
          linha[idx.qtdItens]
        );

      const conversao =
        resolverConversaoCompra_({
          produtoCod,
          produto,
          unidade,
          qtdUnidade,
          qtdItens,
          mapaConversao
        });

      const operacao =
        String(
          linha[idx.operacao] || ''
        )
          .trim()
          .toUpperCase();

      /*
       * COMPRAS_RAW
       *
       * Ordem das colunas:
       *
       * data_emissao
       * data_entrada
       * nota
       * fornecedor_cod
       * fornecedor
       * produto_cod
       * produto
       * unidade
       * qtd_unidade
       * qtd_embalagem_corrigida
       * qtd
       * custo_unit
       * valor_total
       * operacao
       * qtd_original
       * fator_conversao_aplicado
       */
      return [
        linha[idx.dataEmissao],
        linha[idx.dataEntrada],
        linha[idx.nota],

        limparCodigo_(
          linha[idx.fornecedorCod]
        ),

        linha[idx.fornecedor],

        produtoCod,
        produto,
        unidade,
        qtdUnidade,

        /*
         * Quantidade real de unidades comerciais
         * por embalagem apÃ³s validaÃ§Ã£o.
         * Fica vazia quando a conversÃ£o ainda
         * estiver pendente.
         */
        conversao.unidadesPorEmbalagemCorrigida,

        /*
         * Leitura operacional corrigida:
         * quantidade de embalagens
         * representada pela quantidade
         * convertida e pela embalagem
         * validada.
         */
        calcularQtdEmbalagemCorrigida_(
          conversao.qtdAnalise,
          conversao.unidadesPorEmbalagemCorrigida
        ),

        /*
         * Quantidade normalizada para
         * comparação com vendas.
         */
        conversao.qtdAnalise,

        parseNumero(
          linha[idx.custoUnit]
        ),

        parseNumero(
          linha[idx.valorTotal]
        ),

        operacao,

        /*
         * Quantidade original do CSV,
         * antes de qualquer conversão.
         */
        qtdItens,

        /*
         * Fator efetivamente aplicado.
         *
         * Para conversões pendentes,
         * gravamos 1 porque a qtd ainda
         * permanece igual à original.
         */
        conversao.fator &&
        conversao.fator > 0
          ? conversao.fator
          : 1
      ];
    });
}


function resolverConversaoCompra_(dados) {
  const {
    produtoCod,
    unidade,
    qtdUnidade,
    qtdItens,
    mapaConversao
  } = dados;


  /*
   * UNIDADE
   *
   * Já está na unidade comercial
   * utilizada normalmente na venda.
   */
  if (unidade === 'UN') {
    return {
      qtdAnalise: qtdItens,
      fator: 1,
      unidadesPorEmbalagemCorrigida: 1,
      origem: 'NATIVO',
      status: 'VALIDADO'
    };
  }


  /*
   * KG
   *
   * Mantemos exatamente a regra
   * utilizada anteriormente.
   */
  if (unidade === 'KG') {
    const aplicarFator =
      qtdUnidade > 1 &&
      qtdItens > 1;

    const qtdAnalise =
      aplicarFator
        ? qtdUnidade * qtdItens
        : qtdItens;

    return {
      qtdAnalise,

      fator:
        aplicarFator
          ? qtdUnidade
          : 1,

      unidadesPorEmbalagemCorrigida:
        aplicarFator
          ? qtdUnidade
          : 1,

      origem: 'REGRA_KG',

      status: 'VALIDADO'
    };
  }


  /*
   * MAPA_CONVERSAO_UNIDADE
   *
   * Regras manuais validadas têm
   * prioridade sobre o fator vindo do
   * relatório. Isso permite corrigir
   * casos em que o Varejo Fácil informa
   * uma embalagem incorreta, por exemplo:
   *
   * relatório = 60 unidades/caixa
   * correto   = 15 unidades/caixa
   */
  const chave =
    criarChaveConversao_(
      produtoCod,
      unidade
    );

  const conversaoManual =
    mapaConversao[chave];

  if (
    conversaoManual &&
    conversaoManual.status ===
      'VALIDADO' &&
    conversaoManual.fator > 0 &&
    conversaoManual.unidadesPorEmbalagemCorrigida > 0
  ) {
    return {
      qtdAnalise:
        qtdItens *
        conversaoManual.fator,

      fator:
        conversaoManual.fator,

      unidadesPorEmbalagemCorrigida:
        conversaoManual.unidadesPorEmbalagemCorrigida,

      origem:
        conversaoManual.origem ||
        'MANUAL',

      status:
        'VALIDADO'
    };
  }


  /*
   * EMBALAGENS COM FATOR INFORMADO
   *
   * O próprio Varejo Fácil informou
   * mais de uma unidade dentro da
   * embalagem. Esta regra só é aplicada
   * quando não existe correção manual
   * validada no mapa.
   *
   * Exemplos:
   *
   * 70 FD × 6 = 420
   * 5 DP × 10 = 50
   * 1 CX × 12 = 12
   */
  if (qtdUnidade > 1) {
    return {
      qtdAnalise:
        qtdItens * qtdUnidade,

      fator:
        qtdUnidade,

      unidadesPorEmbalagemCorrigida:
        qtdUnidade,

      origem:
        'AUTOMATICO',

      status:
        'VALIDADO'
    };
  }


  /*
   * CONVERSÃO DESCONHECIDA
   *
   * Não inventamos fator.
   *
   * A quantidade permanece como
   * veio originalmente no relatório.
   */
  return {
    qtdAnalise: qtdItens,
    fator: 1,
    unidadesPorEmbalagemCorrigida: '',
    origem: '',
    status: 'PENDENTE'
  };
}


function carregarMapaConversaoUnidade_() {
  const ss =
    SpreadsheetApp.getActiveSpreadsheet();

  const aba =
    ss.getSheetByName(
      'MAPA_CONVERSAO_UNIDADE'
    );

  if (!aba) {
    return {};
  }

  const ultimaLinha =
    aba.getLastRow();

  const ultimaColuna =
    aba.getLastColumn();

  if (
    ultimaLinha <= 1 ||
    ultimaColuna === 0
  ) {
    return {};
  }

  const valores =
    aba
      .getRange(
        1,
        1,
        ultimaLinha,
        ultimaColuna
      )
      .getValues();

  /*
   * Aqui usamos os nomes EXATOS
   * definidos para a aba:
   *
   * produto_cod
   * produto
   * unidade_compra
   * fator_conversao
   * origem
   * status
   * observacao
   */
  const cabecalhos =
    valores[0].map(
      h =>
        String(h || '')
          .trim()
          .toLowerCase()
    );

  const idx = {
    produtoCod:
      cabecalhos.indexOf(
        'produto_cod'
      ),

    unidadeCompra:
      cabecalhos.indexOf(
        'unidade_compra'
      ),

    unidadesPorEmbalagemCorrigida:
      cabecalhos.indexOf(
        'unidades_por_embalagem_corrigida'
      ),

    fatorConversao:
      cabecalhos.indexOf(
        'fator_conversao'
      ),

    origem:
      cabecalhos.indexOf(
        'origem'
      ),

    status:
      cabecalhos.indexOf(
        'status'
      )
  };

  if (
    idx.produtoCod === -1 ||
    idx.unidadeCompra === -1 ||
    idx.unidadesPorEmbalagemCorrigida === -1 ||
    idx.fatorConversao === -1 ||
    idx.status === -1
  ) {
    throw new Error(
      'Cabeçalho inválido na aba MAPA_CONVERSAO_UNIDADE.\n\n' +
      'Esperado:\n' +
      'produto_cod | produto | unidade_compra | unidades_por_embalagem_corrigida | fator_conversao | origem | status | observacao'
    );
  }

  const mapa = {};

  valores
    .slice(1)
    .forEach(linha => {
      const produtoCod =
        limparCodigo_(
          linha[idx.produtoCod]
        );

      const unidade =
        String(
          linha[idx.unidadeCompra] || ''
        )
          .trim()
          .toUpperCase();

      const unidadesPorEmbalagemCorrigida =
        parseNumero(
          linha[idx.unidadesPorEmbalagemCorrigida]
        );

      const fator =
        parseNumero(
          linha[idx.fatorConversao]
        );

      const status =
        String(
          linha[idx.status] || ''
        )
          .trim()
          .toUpperCase();

      const origem =
        idx.origem !== -1
          ? String(
              linha[idx.origem] || ''
            )
              .trim()
              .toUpperCase()
          : 'MANUAL';

      if (
        !produtoCod ||
        !unidade ||
        unidadesPorEmbalagemCorrigida <= 0 ||
        fator <= 0
      ) {
        return;
      }

      const chave =
        criarChaveConversao_(
          produtoCod,
          unidade
        );

      mapa[chave] = {
        fator,
        unidadesPorEmbalagemCorrigida,
        origem:
          origem || 'MANUAL',
        status
      };
    });

  return mapa;
}

function criarChaveConversao_(
  produtoCod,
  unidade
) {
  return (
    limparCodigo_(produtoCod) +
    '||' +
    String(unidade || '')
      .trim()
      .toUpperCase()
  );
}


/*
 * =========================================================
 * REPROCESSAR CONVERSÕES DE COMPRAS
 * =========================================================
 *
 * Esta função pode ser executada manualmente.
 *
 * Ela NÃO usa a quantidade convertida atual
 * como ponto de partida.
 *
 * Sempre recalcula tudo a partir de:
 *
 * qtd_original
 *
 * Isso evita dupla conversão.
 *
 * Exemplo:
 *
 * qtd_original = 1
 *
 * mapa antigo = 30
 * qtd atual    = 30
 *
 * mapa alterado para 24
 *
 * resultado:
 *
 * 1 × 24 = 24
 *
 * e nunca:
 *
 * 30 × 24
 */
function reprocessarConversoesCompras() {
  const ui =
    SpreadsheetApp.getUi();

  try {
    const ss =
      SpreadsheetApp.getActiveSpreadsheet();

    const aba =
      ss.getSheetByName(
        'COMPRAS_RAW'
      );

    if (!aba) {
      throw new Error(
        'Aba COMPRAS_RAW não encontrada.'
      );
    }

    if (aba.getLastRow() <= 1) {
      ui.alert(
        'COMPRAS_RAW não possui registros para reprocessar.'
      );

      return;
    }

    garantirColunaComprasRaw_(
      'qtd_embalagem_corrigida',
      'unidades_por_embalagem_corrigida'
    );

    const ultimaLinha =
      aba.getLastRow();

    const ultimaColuna =
      aba.getLastColumn();

    const dados =
      aba
        .getRange(
          1,
          1,
          ultimaLinha,
          ultimaColuna
        )
        .getValues();

    const cabecalhos =
      dados[0].map(
        h =>
          String(h || '')
            .trim()
            .toLowerCase()
      );

    const idx = {
      produtoCod:
        cabecalhos.indexOf(
          'produto_cod'
        ),

      produto:
        cabecalhos.indexOf(
          'produto'
        ),

      unidade:
        cabecalhos.indexOf('unidade_compra'),

      qtdUnidade:
        cabecalhos.indexOf('unidades_por_embalagem'),

      qtdUnidadeCorrigida:
        cabecalhos.indexOf('unidades_por_embalagem_corrigida'),

      qtdEmbalagemCorrigida:
        cabecalhos.indexOf('qtd_embalagem_corrigida'),

      qtd:
        cabecalhos.indexOf('qtd_compra_convertida'),

      qtdOriginal:
        cabecalhos.indexOf('qtd_original_compra'),

      fatorAplicado:
        cabecalhos.indexOf(
          'fator_conversao_aplicado'
        )
    };

    Object.keys(idx)
      .forEach(chave => {
        if (idx[chave] === -1) {
          throw new Error(
            'Coluna não encontrada em COMPRAS_RAW: ' +
            chave
          );
        }
      });

    const mapaConversao =
      carregarMapaConversaoUnidade_();

    let totalRegistros = 0;
    let totalAlterados = 0;
    let totalPendentes = 0;

    const novasUnidadesCorrigidas = [];
    const novasQtdEmbalagemCorrigida = [];
    const novasQuantidades = [];
    const novosFatores = [];

    for (
      let i = 1;
      i < dados.length;
      i++
    ) {
      const linha = dados[i];

      /*
       * Ignora linha completamente vazia.
       */
      const linhaVazia =
        linha.every(
          valor =>
            String(valor || '')
              .trim() === ''
        );

      if (linhaVazia) {
        novasUnidadesCorrigidas.push([
          linha[idx.qtdUnidadeCorrigida]
        ]);

        novasQtdEmbalagemCorrigida.push([
          linha[idx.qtdEmbalagemCorrigida]
        ]);

        novasQuantidades.push([
          linha[idx.qtd]
        ]);

        novosFatores.push([
          linha[idx.fatorAplicado]
        ]);

        continue;
      }

      totalRegistros++;

      const produtoCod =
        limparCodigo_(
          linha[idx.produtoCod]
        );

      const produto =
        String(
          linha[idx.produto] || ''
        ).trim();

      const unidade =
        String(
          linha[idx.unidade] || ''
        )
          .trim()
          .toUpperCase();

      const qtdUnidade =
        Number(
          linha[idx.qtdUnidade] || 0
        );

      const qtdOriginal =
        Number(
          linha[idx.qtdOriginal] || 0
        );

      const unidadeCorrigidaAtual =
        linha[idx.qtdUnidadeCorrigida] === ''
          ? ''
          : Number(linha[idx.qtdUnidadeCorrigida]);

      const qtdEmbalagemCorrigidaAtual =
        linha[idx.qtdEmbalagemCorrigida] === ''
          ? ''
          : Number(linha[idx.qtdEmbalagemCorrigida]);

      const qtdAtual =
        Number(
          linha[idx.qtd] || 0
        );

      const fatorAtual =
        Number(
          linha[idx.fatorAplicado] || 1
        );

      /*
       * O reprocessamento reaproveita
       * exatamente a mesma função usada
       * na importação.
       */
      const conversao =
        resolverConversaoCompra_({
          produtoCod,
          produto,
          unidade,
          qtdUnidade,
          qtdItens: qtdOriginal,
          mapaConversao
        });

      const novaQtd =
        conversao.qtdAnalise;

      const novoFator =
        conversao.fator &&
        conversao.fator > 0
          ? conversao.fator
          : 1;

      const novaUnidadeCorrigida =
        conversao.unidadesPorEmbalagemCorrigida === ''
          ? ''
          : Number(conversao.unidadesPorEmbalagemCorrigida);

      const novaQtdEmbalagemCorrigida =
        calcularQtdEmbalagemCorrigida_(
          novaQtd,
          novaUnidadeCorrigida
        );

      if (
        Number(novaQtd) !==
          Number(qtdAtual) ||
        Number(novoFator) !==
          Number(fatorAtual) ||
        String(novaUnidadeCorrigida) !==
          String(unidadeCorrigidaAtual) ||
        String(novaQtdEmbalagemCorrigida) !==
          String(qtdEmbalagemCorrigidaAtual)
      ) {
        totalAlterados++;
      }

      if (
        conversao.status ===
        'PENDENTE'
      ) {
        totalPendentes++;
      }

      novasUnidadesCorrigidas.push([
        novaUnidadeCorrigida
      ]);

      novasQtdEmbalagemCorrigida.push([
        novaQtdEmbalagemCorrigida
      ]);

      novasQuantidades.push([
        novaQtd
      ]);

      novosFatores.push([
        novoFator
      ]);
    }


    /*
     * Atualiza SOMENTE:
     *
     * unidades_por_embalagem_corrigida
     * qtd_embalagem_corrigida
     * qtd_compra_convertida
     * fator_conversao_aplicado
     *
     * qtd_original nunca é alterada.
     */
    aba
      .getRange(
        2,
        idx.qtdUnidadeCorrigida + 1,
        novasUnidadesCorrigidas.length,
        1
      )
      .setValues(
        novasUnidadesCorrigidas
      );

    aba
      .getRange(
        2,
        idx.qtdEmbalagemCorrigida + 1,
        novasQtdEmbalagemCorrigida.length,
        1
      )
      .setValues(
        novasQtdEmbalagemCorrigida
      );

    aba
      .getRange(
        2,
        idx.qtd + 1,
        novasQuantidades.length,
        1
      )
      .setValues(
        novasQuantidades
      );

    aba
      .getRange(
        2,
        idx.fatorAplicado + 1,
        novosFatores.length,
        1
      )
      .setValues(
        novosFatores
      );


    /*
     * Recria a lista de pendências
     * após aplicar as novas regras.
     */
    atualizarConversoesPendentes_();


    ui.alert(
      'Reprocessamento concluído.\n\n' +
      `Registros analisados: ${totalRegistros}\n` +
      `Registros alterados: ${totalAlterados}\n` +
      `Registros ainda pendentes: ${totalPendentes}`
    );

  } catch (erro) {
    registrarErro(
      'REPROCESSAR_CONVERSOES_COMPRAS',
      erro
    );

    ui.alert(
      'Erro ao reprocessar conversões: ' +
      erro.message
    );
  }
}


function atualizarConversoesPendentes_() {
  const ss =
    SpreadsheetApp.getActiveSpreadsheet();

  const abaCompras =
    ss.getSheetByName(
      'COMPRAS_RAW'
    );

  const abaPendentes =
    ss.getSheetByName(
      'CONVERSOES_PENDENTES'
    );

  if (!abaCompras) {
    throw new Error(
      'Aba COMPRAS_RAW não encontrada.'
    );
  }

  if (!abaPendentes) {
    throw new Error(
      'Aba CONVERSOES_PENDENTES não encontrada.'
    );
  }

  const mapaConversao =
    carregarMapaConversaoUnidade_();

  const dadosCompras =
    lerAbaComoObjetosConversao_(
      abaCompras
    );

  const mapaVendas =
    carregarResumoVendasConversao_();

  const pendentes = {};


  dadosCompras.forEach(item => {
    const produtoCod =
      limparCodigo_(
        item.produto_cod
      );

    const produto =
      String(
        item.produto || ''
      ).trim();

    const unidade =
      String(
        item.unidade_compra || ''
      )
        .trim()
        .toUpperCase();

    const qtdUnidade =
      Number(
        item.unidades_por_embalagem || 0
      );

    /*
     * Para a fila de pendências,
     * usamos a quantidade original.
     *
     * Isso evita que uma quantidade
     * já convertida seja interpretada
     * como número de embalagens.
     */
    const qtdOriginal =
      Number(
        item.qtd_original_compra ||
        item.qtd_compra_convertida ||
        0
      );

    const valorCompra =
      Number(
        item.valor_total || 0
      );

    const operacao =
      normalizarTexto(
        item.operacao || ''
      );


    /*
     * UN e KG não entram na fila.
     */
    if (
      !produtoCod ||
      unidade === 'UN' ||
      unidade === 'KG'
    ) {
      return;
    }


    /*
     * Se qtd_unidade > 1,
     * a conversão já foi resolvida
     * automaticamente.
     */
    if (qtdUnidade > 1) {
      return;
    }


    const chave =
      criarChaveConversao_(
        produtoCod,
        unidade
      );

    const manual =
      mapaConversao[chave];


    /*
     * Regra manual validada:
     * não é mais pendência.
     */
    if (
      manual &&
      manual.status ===
        'VALIDADO' &&
      manual.fator > 0 &&
      manual.unidadesPorEmbalagemCorrigida > 0
    ) {
      return;
    }


    /*
     * Para qtd_compra da fila,
     * usamos apenas compras normais.
     */
    if (
      operacao.includes(
        'BONIFICACAO'
      ) ||
      operacao.includes(
        'DEVOLUCAO'
      )
    ) {
      return;
    }


    if (!pendentes[chave]) {
      pendentes[chave] = {
        produtoCod,
        produto,
        unidade,
        qtdUnidade,
        qtdCompra: 0,
        valorCompra: 0
      };
    }


    /*
     * Aqui qtdCompra representa
     * quantidade fiscal de embalagens,
     * portanto usamos qtd_original.
     */
    pendentes[chave].qtdCompra +=
      qtdOriginal;

    pendentes[chave].valorCompra +=
      valorCompra;
  });


  const linhas =
    Object.values(
      pendentes
    ).map(item => {
      const venda =
        mapaVendas[
          item.produtoCod
        ] || {
          qtdVenda: 0,
          custoUnitarioMediano: 0
        };


      const custoUnitarioVenda =
        Number(
          venda
            .custoUnitarioMediano ||
          0
        );


      const custoEmbalagem =
        item.qtdCompra > 0
          ? item.valorCompra /
            item.qtdCompra
          : 0;


      /*
       * Apenas estimativa.
       *
       * Nunca aplicada
       * automaticamente.
       */
      const fatorEstimado =
        custoUnitarioVenda > 0
          ? custoEmbalagem /
            custoUnitarioVenda
          : '';


      return [
        item.produtoCod,
        item.produto,
        item.unidade,
        item.qtdUnidade,

        arredondarConversao_(
          item.qtdCompra,
          3
        ),

        arredondarConversao_(
          item.valorCompra,
          2
        ),

        arredondarConversao_(
          venda.qtdVenda,
          3
        ),

        custoUnitarioVenda
          ? arredondarConversao_(
              custoUnitarioVenda,
              4
            )
          : '',

        fatorEstimado !== ''
          ? arredondarConversao_(
              fatorEstimado,
              2
            )
          : '',

        'PENDENTE'
      ];
    });


  /*
   * Limpa somente os dados.
   * Mantém o cabeçalho.
   */
  const ultimaLinha =
    abaPendentes.getLastRow();

  const ultimaColuna =
    abaPendentes.getLastColumn();

  if (ultimaLinha > 1) {
    abaPendentes
      .getRange(
        2,
        1,
        ultimaLinha - 1,
        ultimaColuna
      )
      .clearContent();
  }


  if (linhas.length > 0) {
    abaPendentes
      .getRange(
        2,
        1,
        linhas.length,
        linhas[0].length
      )
      .setValues(linhas);
  }
}


function carregarResumoVendasConversao_() {
  const ss =
    SpreadsheetApp.getActiveSpreadsheet();

  const aba =
    ss.getSheetByName(
      'VENDAS_RAW'
    );

  if (
    !aba ||
    aba.getLastRow() <= 1
  ) {
    return {};
  }

  const dados =
    lerAbaComoObjetosConversao_(
      aba
    );

  const mapa = {};


  dados.forEach(item => {
    const produtoCod =
      limparCodigo_(
        item.produto_cod
      );

    const qtd =
      Number(
        item.qtd || 0
      );

    const faturamento =
      Number(
        item.faturamento || 0
      );

    const custoTotal =
      Number(
        item.custo_total || 0
      );

    if (
      !produtoCod ||
      qtd <= 0
    ) {
      return;
    }


    if (!mapa[produtoCod]) {
      mapa[produtoCod] = {
        qtdVenda: 0,
        custosUnitariosValidos: [],
        qtdLinhasVenda: 0,
        qtdLinhasCustoValido: 0,
        qtdLinhasCustoDescartado: 0
      };
    }


    const resumo =
      mapa[produtoCod];

    resumo.qtdVenda +=
      qtd;

    resumo.qtdLinhasVenda +=
      1;


    /*
     * Custo zero ou negativo não
     * serve como referência.
     */
    if (custoTotal <= 0) {
      resumo
        .qtdLinhasCustoDescartado +=
        1;

      return;
    }


    const custoUnitario =
      custoTotal / qtd;


    let precoUnitario = 0;

    if (faturamento > 0) {
      precoUnitario =
        faturamento / qtd;
    } else {
      precoUnitario =
        Number(
          item.preco_medio || 0
        );
    }


    /*
     * FILTRO DE PLAUSIBILIDADE
     *
     * O objetivo é encontrar um
     * custo unitário histórico
     * plausível para estimar a
     * conversão da embalagem.
     */
    const custoPlausivel =
      precoUnitario <= 0 ||
      custoUnitario <=
        precoUnitario * 2;


    if (!custoPlausivel) {
      resumo
        .qtdLinhasCustoDescartado +=
        1;

      return;
    }


    resumo
      .custosUnitariosValidos
      .push(
        custoUnitario
      );

    resumo
      .qtdLinhasCustoValido +=
      1;
  });


  Object.keys(mapa)
    .forEach(produtoCod => {
      const resumo =
        mapa[produtoCod];

      resumo.custoUnitarioMediano =
        calcularMediana_(
          resumo
            .custosUnitariosValidos
        );

      resumo.temCustoReferencia =
        resumo
          .custoUnitarioMediano >
        0;
    });


  return mapa;
}


function calcularMediana_(valores) {
  if (
    !valores ||
    valores.length === 0
  ) {
    return 0;
  }

  const ordenados =
    valores
      .filter(
        valor =>
          Number.isFinite(
            Number(valor)
          )
      )
      .map(Number)
      .sort(
        (a, b) =>
          a - b
      );


  if (
    ordenados.length === 0
  ) {
    return 0;
  }


  const meio =
    Math.floor(
      ordenados.length / 2
    );


  if (
    ordenados.length % 2 === 0
  ) {
    return (
      ordenados[meio - 1] +
      ordenados[meio]
    ) / 2;
  }


  return ordenados[meio];
}


function lerAbaComoObjetosConversao_(
  aba
) {
  const valores =
    aba
      .getDataRange()
      .getValues();


  if (valores.length <= 1) {
    return [];
  }


  const cabecalhos =
    valores[0].map(
      h =>
        String(h || '')
          .trim()
          .toLowerCase()
    );


  return valores
    .slice(1)

    .filter(
      linha =>
        linha.some(
          valor =>
            String(
              valor || ''
            ).trim() !== ''
        )
    )

    .map(linha => {
      const objeto = {};

      cabecalhos.forEach(
        (
          cabecalho,
          indice
        ) => {
          objeto[cabecalho] =
            linha[indice];
        }
      );

      return objeto;
    });
}


function calcularQtdEmbalagemCorrigida_(
  qtdConvertida,
  unidadesPorEmbalagemCorrigida
) {
  const quantidade =
    Number(qtdConvertida || 0);

  const unidades =
    Number(unidadesPorEmbalagemCorrigida || 0);

  if (
    !Number.isFinite(quantidade) ||
    !Number.isFinite(unidades) ||
    quantidade <= 0 ||
    unidades <= 0
  ) {
    return '';
  }

  return arredondarConversao_(
    quantidade / unidades,
    3
  );
}


function garantirColunaComprasRaw_(
  nomeColuna,
  colunaReferencia
) {
  const aba =
    obterAba(
      'COMPRAS_RAW'
    );

  const ultimaColuna =
    aba.getLastColumn();

  if (ultimaColuna === 0) {
    throw new Error(
      'COMPRAS_RAW não possui cabeçalho.'
    );
  }

  const cabecalhos =
    aba
      .getRange(
        1,
        1,
        1,
        ultimaColuna
      )
      .getValues()[0]
      .map(valor =>
        String(valor || '')
          .trim()
          .toLowerCase()
      );

  if (cabecalhos.includes(nomeColuna)) {
    return;
  }

  const idxReferencia =
    cabecalhos.indexOf(colunaReferencia);

  if (idxReferencia === -1) {
    throw new Error(
      'COMPRAS_RAW não possui a coluna ' +
      colunaReferencia +
      '.'
    );
  }

  const colunaReferenciaNumero =
    idxReferencia + 1;

  aba.insertColumnAfter(
    colunaReferenciaNumero
  );

  aba
    .getRange(
      1,
      colunaReferenciaNumero + 1
    )
    .setValue(nomeColuna);
}


function inserirComprasRaw(
  registros
) {
  const aba =
    obterAba(
      'COMPRAS_RAW'
    );

  garantirColunaComprasRaw_(
    'qtd_embalagem_corrigida',
    'unidades_por_embalagem_corrigida'
  );

  const linhaInicial =
    aba.getLastRow() + 1;

  aba
    .getRange(
      linhaInicial,
      1,
      registros.length,
      registros[0].length
    )
    .setValues(
      registros
    );
}


function validarIndicesCompras_(
  idx
) {
  const faltando = [];

  Object.keys(idx)
    .forEach(chave => {
      if (idx[chave] === -1) {
        faltando.push(
          chave
        );
      }
    });


  if (faltando.length > 0) {
    throw new Error(
      'Colunas não encontradas no CSV de compras: ' +
      faltando.join(', ')
    );
  }
}


function limparCodigo_(valor) {
  if (
    valor === null ||
    valor === undefined
  ) {
    return '';
  }


  const texto =
    String(valor)
      .trim();


  if (/^\d+$/.test(texto)) {
    return (
      texto.replace(
        /^0+/,
        ''
      ) ||
      '0'
    );
  }


  return texto;
}


function arredondarConversao_(
  valor,
  casas
) {
  const fator =
    Math.pow(
      10,
      casas
    );


  return (
    Math.round(
      (
        Number(valor) +
        Number.EPSILON
      ) *
      fator
    ) /
    fator
  );
}