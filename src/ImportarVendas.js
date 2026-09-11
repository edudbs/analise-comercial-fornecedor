function importarVendasDoDrive() {
  const ui = SpreadsheetApp.getUi();

  try {
    const arquivos = listarArquivosCsvPendentes(
      PASTA_CSV_VENDAS_ID
    );

    if (arquivos.length === 0) {
      registrarNenhumArquivo('VENDAS');

      ui.alert(
        'Nenhum CSV de vendas pendente encontrado.'
      );

      return;
    }

    let totalRegistros = 0;

    arquivos.forEach(arquivo => {
      const conteudo =
        lerConteudoArquivoCsv(arquivo);

      const registros =
        processarCsvVendas(conteudo);

      if (registros.length > 0) {
        inserirVendasRaw(registros);
      }

      totalRegistros +=
        registros.length;

      registrarSucesso(
        'VENDAS',
        arquivo.getName(),
        registros.length
      );

      moverArquivoParaProcessados(
        arquivo,
        PASTA_CSV_VENDAS_ID
      );
    });

    /*
     * CONVERSOES_PENDENTES depende
     * tanto de COMPRAS_RAW quanto
     * de VENDAS_RAW.
     *
     * Portanto, sempre que as vendas
     * forem atualizadas, recalculamos
     * a fila de conversões.
     */
    atualizarConversoesPendentes_();

    ui.alert(
      `Importação de vendas concluída.\n` +
      `Registros importados: ${totalRegistros}`
    );

  } catch (erro) {
    registrarErro(
      'IMPORTAR_VENDAS',
      erro
    );

    ui.alert(
      'Erro ao importar vendas: ' +
      erro.message
    );
  }
}


function processarCsvVendas(conteudoCsv) {
  const linhas = Utilities.parseCsv(
    conteudoCsv,
    ';'
  );

  if (
    !linhas ||
    linhas.length <= 1
  ) {
    return [];
  }

  const cabecalhos =
    linhas[0].map(
      h => normalizarTexto(h)
    );

  const idx = {
    dataVenda:
      cabecalhos.indexOf('QUEBRA'),

    produtoCod:
      cabecalhos.indexOf('CODIGO'),

    produto:
      cabecalhos.indexOf('DESCRICAO'),

    qtd:
      cabecalhos.indexOf('QUANTIDADE'),

    faturamento:
      cabecalhos.indexOf('FATURAMENTO'),

    precoMedio:
      cabecalhos.indexOf('PRECO MEDIO'),

    custoTotal:
      cabecalhos.indexOf('CUSTO TOTAL'),

    lucro:
      cabecalhos.indexOf('LUCRO'),

    margem:
      cabecalhos.indexOf('MARGEM')
  };

  validarIndicesVendas_(idx);

  return linhas
    .slice(1)

    .filter(
      linha =>
        linha.join('').trim() !== ''
    )

    .map(linha => ([
      linha[idx.dataVenda],

      limparCodigo_(
        linha[idx.produtoCod]
      ),

      linha[idx.produto],

      parseNumero(
        linha[idx.qtd]
      ),

      parseNumero(
        linha[idx.faturamento]
      ),

      parseNumero(
        linha[idx.precoMedio]
      ),

      parseNumero(
        linha[idx.custoTotal]
      ),

      parseNumero(
        linha[idx.lucro]
      ),

      parseNumero(
        linha[idx.margem]
      )
    ]));
}


function inserirVendasRaw(registros) {
  const aba =
    obterAba('VENDAS_RAW');

  const linhaInicial =
    aba.getLastRow() + 1;

  aba
    .getRange(
      linhaInicial,
      1,
      registros.length,
      registros[0].length
    )
    .setValues(registros);
}


function validarIndicesVendas_(idx) {
  const faltando = [];

  Object.keys(idx)
    .forEach(chave => {
      if (idx[chave] === -1) {
        faltando.push(chave);
      }
    });

  if (faltando.length > 0) {
    throw new Error(
      'Colunas não encontradas no CSV de vendas: ' +
      faltando.join(', ')
    );
  }
}