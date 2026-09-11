function atualizarDashboard() {
  const ui = SpreadsheetApp.getUi();

  try {
    const analiseFornecedor = lerDados('ANALISE_FORNECEDOR');
    const analiseFornecedorSku = lerDados('ANALISE_FORNECEDOR_SKU');
    const auditoria = lerDados('AUDITORIA');

    const mapaAuditoria = {};

    auditoria.forEach(item => {
      mapaAuditoria[item.indicador] = parseNumero(item.valor);
    });

    const totalComprado = mapaAuditoria.COMPRAS_NORMAIS || 0;
    const totalBonificacoes = mapaAuditoria.BONIFICACOES || 0;
    const totalDevolucoes = mapaAuditoria.DEVOLUCOES || 0;
    const movimentosEspeciais = mapaAuditoria.MOVIMENTOS_ESPECIAIS || 0;

    const lucroTotal = somarCampo_(analiseFornecedor, 'lucro');

    const vendaVinculada = mapaAuditoria.VENDA_VINCULADA || 0;
    const vendaNaoVinculada = mapaAuditoria.VENDA_NAO_VINCULADA || 0;
    const totalVendidoGeral = mapaAuditoria.TOTAL_VENDAS_RAW || 0;

    const margemMedia =
      vendaVinculada > 0
        ? lucroTotal / vendaVinculada
        : 0;

    const qtdFornecedores = analiseFornecedor.filter(item =>
      item.fornecedor_cod !== 'SEM_FORNECEDOR'
    ).length;

    const qtdSkusAnalisados = analiseFornecedorSku.length;

    const linhas = [
      ['TOTAL_COMPRADO', arredondar_(totalComprado)],
      ['TOTAL_BONIFICACOES', arredondar_(totalBonificacoes)],
      ['TOTAL_DEVOLUCOES', arredondar_(totalDevolucoes)],
      ['MOVIMENTOS_ESPECIAIS', arredondar_(movimentosEspeciais)],

      ['TOTAL_VENDIDO_VINCULADO', arredondar_(vendaVinculada)],
      ['TOTAL_VENDIDO_GERAL', arredondar_(totalVendidoGeral)],
      ['VENDA_VINCULADA', arredondar_(vendaVinculada)],
      ['VENDA_NAO_VINCULADA', arredondar_(vendaNaoVinculada)],
      ['COBERTURA_VENDAS', arredondar_(mapaAuditoria.COBERTURA_VENDAS || 0)],

      ['LUCRO_TOTAL_VINCULADO', arredondar_(lucroTotal)],
      ['MARGEM_MEDIA_VINCULADA', arredondar_(margemMedia)],

      ['QTD_FORNECEDORES', qtdFornecedores],
      ['QTD_SKUS_ANALISADOS', qtdSkusAnalisados],
      ['SKUS_COMPRADOS', mapaAuditoria.SKUS_COMPRADOS || 0],
      ['SKUS_BONIFICADOS', mapaAuditoria.SKUS_BONIFICADOS || 0],
      ['SKUS_COM_DEVOLUCAO', mapaAuditoria.SKUS_COM_DEVOLUCAO || 0],
      ['SKUS_SEM_COMPRA_PERIODO', mapaAuditoria.SKUS_SEM_COMPRA_PERIODO || 0],

      ['ABC_A', contarCampo_(analiseFornecedorSku, 'classe_abc', 'A')],
      ['ABC_B', contarCampo_(analiseFornecedorSku, 'classe_abc', 'B')],
      ['ABC_C', contarCampo_(analiseFornecedorSku, 'classe_abc', 'C')],

      ['OPERACIONAL_RUPTURA', contarCampo_(analiseFornecedorSku, 'status_operacional', 'RUPTURA')],
      ['OPERACIONAL_ATENCAO', contarCampo_(analiseFornecedorSku, 'status_operacional', 'ATENCAO')],
      ['OPERACIONAL_SAUDAVEL', contarCampo_(analiseFornecedorSku, 'status_operacional', 'SAUDAVEL')],
      ['OPERACIONAL_EXCESSO', contarCampo_(analiseFornecedorSku, 'status_operacional', 'EXCESSO')],
      ['OPERACIONAL_SEM_GIRO', contarCampo_(analiseFornecedorSku, 'status_operacional', 'SEM_GIRO')],

      ['FINANCEIRO_MARGEM_MUITO_BAIXA', contarCampo_(analiseFornecedorSku, 'status_financeiro', 'MARGEM_MUITO_BAIXA')],
      ['FINANCEIRO_MARGEM_BAIXA', contarCampo_(analiseFornecedorSku, 'status_financeiro', 'MARGEM_BAIXA')],
      ['FINANCEIRO_MARGEM_NORMAL', contarCampo_(analiseFornecedorSku, 'status_financeiro', 'MARGEM_NORMAL')],
      ['FINANCEIRO_MARGEM_ALTA', contarCampo_(analiseFornecedorSku, 'status_financeiro', 'MARGEM_ALTA')],
      ['FINANCEIRO_SEM_VENDA', contarCampo_(analiseFornecedorSku, 'status_financeiro', 'SEM_VENDA')],

      ['ACAO_AUMENTAR_COMPRA_PRIORIDADE', contarCampo_(analiseFornecedorSku, 'acao_sugerida', 'AUMENTAR_COMPRA_PRIORIDADE')],
      ['ACAO_AVALIAR_REPOSICAO', contarCampo_(analiseFornecedorSku, 'acao_sugerida', 'AVALIAR_REPOSICAO')],
      ['ACAO_REDUZIR_COMPRA_URGENTE', contarCampo_(analiseFornecedorSku, 'acao_sugerida', 'REDUZIR_COMPRA_URGENTE')],
      ['ACAO_SEGURAR_COMPRA', contarCampo_(analiseFornecedorSku, 'acao_sugerida', 'SEGURAR_COMPRA')],
      ['ACAO_INVESTIGAR_PRODUTO_SEM_VENDA', contarCampo_(analiseFornecedorSku, 'acao_sugerida', 'INVESTIGAR_PRODUTO_SEM_VENDA')],
      ['ACAO_ACOMPANHAR_ESTOQUE', contarCampo_(analiseFornecedorSku, 'acao_sugerida', 'ACOMPANHAR_ESTOQUE')],
      ['ACAO_MANTER_E_PRIORIZAR', contarCampo_(analiseFornecedorSku, 'acao_sugerida', 'MANTER_E_PRIORIZAR')],
      ['ACAO_MANTER_COMPRA', contarCampo_(analiseFornecedorSku, 'acao_sugerida', 'MANTER_COMPRA')],
      ['ACAO_ANALISAR', contarCampo_(analiseFornecedorSku, 'acao_sugerida', 'ANALISAR')]
    ];

    escreverDashboard_(linhas);

    ui.alert('Dashboard atualizado com sucesso.');

  } catch (erro) {
    registrarErro('ATUALIZAR_DASHBOARD', erro);
    ui.alert('Erro ao atualizar dashboard: ' + erro.message);
  }
}

function contarCampo_(dados, campo, valorEsperado) {
  return dados.filter(item =>
    String(item[campo] || '').trim() === valorEsperado
  ).length;
}

function escreverDashboard_(linhas) {
  const aba = obterAba('DASHBOARD');

  const ultimaLinha = aba.getLastRow();

  if (ultimaLinha > 1) {
    aba.getRange(2, 1, ultimaLinha - 1, 2).clearContent();
  }

  if (!linhas || linhas.length === 0) return;

  aba
    .getRange(2, 1, linhas.length, 2)
    .setValues(linhas);
}