$ErrorActionPreference = 'Stop'

function Replace-LiteralOne {
  param(
    [string]$Path,
    [string]$Old,
    [string]$New
  )

  $content = Get-Content -Raw -Encoding UTF8 $Path
  $count = [regex]::Matches($content, [regex]::Escape($Old)).Count

  if ($count -ne 1) {
    throw "Falha em ${Path}: esperado 1 ocorrencia(s), encontrado $count.`nTrecho:`n$Old"
  }

  $content = $content.Replace($Old, $New)

  $utf8SemBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $content, $utf8SemBom)
}

$root = Split-Path -Parent $PSScriptRoot
$importar = Join-Path $root 'src\ImportarCompras.js'

if (-not (Test-Path $importar)) {
  throw "Arquivo não encontrado: $importar"
}

Replace-LiteralOne $importar @'
        produtoCod,
        produto,
        unidade,
        qtdUnidade,

        /*
         * Quantidade normalizada para
'@ @'
        produtoCod,
        produto,
        unidade,
        qtdUnidade,

        /*
         * Quantidade real de unidades comerciais
         * por embalagem após validação.
         * Fica vazia quando a conversão ainda
         * estiver pendente.
         */
        conversao.unidadesPorEmbalagemCorrigida,

        /*
         * Quantidade normalizada para
'@

Replace-LiteralOne $importar @'
    return {
      qtdAnalise: qtdItens,
      fator: 1,
      origem: 'NATIVO',
      status: 'VALIDADO'
    };
'@ @'
    return {
      qtdAnalise: qtdItens,
      fator: 1,
      unidadesPorEmbalagemCorrigida: 1,
      origem: 'NATIVO',
      status: 'VALIDADO'
    };
'@

Replace-LiteralOne $importar @'
      fator:
        aplicarFator
          ? qtdUnidade
          : 1,

      origem: 'REGRA_KG',
'@ @'
      fator:
        aplicarFator
          ? qtdUnidade
          : 1,

      unidadesPorEmbalagemCorrigida:
        aplicarFator
          ? qtdUnidade
          : 1,

      origem: 'REGRA_KG',
'@

Replace-LiteralOne $importar @'
      fator:
        qtdUnidade,

      origem:
        'AUTOMATICO',
'@ @'
      fator:
        qtdUnidade,

      unidadesPorEmbalagemCorrigida:
        qtdUnidade,

      origem:
        'AUTOMATICO',
'@

Replace-LiteralOne $importar @'
    conversaoManual &&
    conversaoManual.status ===
      'VALIDADO' &&
    conversaoManual.fator > 0
'@ @'
    conversaoManual &&
    conversaoManual.status ===
      'VALIDADO' &&
    conversaoManual.fator > 0 &&
    conversaoManual.unidadesPorEmbalagemCorrigida > 0
'@

Replace-LiteralOne $importar @'
      fator:
        conversaoManual.fator,

      origem:
'@ @'
      fator:
        conversaoManual.fator,

      unidadesPorEmbalagemCorrigida:
        conversaoManual.unidadesPorEmbalagemCorrigida,

      origem:
'@

Replace-LiteralOne $importar @'
  return {
    qtdAnalise: qtdItens,
    fator: 1,
    origem: '',
    status: 'PENDENTE'
  };
'@ @'
  return {
    qtdAnalise: qtdItens,
    fator: 1,
    unidadesPorEmbalagemCorrigida: '',
    origem: '',
    status: 'PENDENTE'
  };
'@

Replace-LiteralOne $importar @'
    unidadeCompra:
      cabecalhos.indexOf(
        'unidade_compra'
      ),

    fatorConversao:
'@ @'
    unidadeCompra:
      cabecalhos.indexOf(
        'unidade_compra'
      ),

    unidadesPorEmbalagemCorrigida:
      cabecalhos.indexOf(
        'unidades_por_embalagem_corrigida'
      ),

    fatorConversao:
'@

Replace-LiteralOne $importar @'
    idx.produtoCod === -1 ||
    idx.unidadeCompra === -1 ||
    idx.fatorConversao === -1 ||
    idx.status === -1
'@ @'
    idx.produtoCod === -1 ||
    idx.unidadeCompra === -1 ||
    idx.unidadesPorEmbalagemCorrigida === -1 ||
    idx.fatorConversao === -1 ||
    idx.status === -1
'@

Replace-LiteralOne $importar @'
      'produto_cod | produto | unidade_compra | fator_conversao | origem | status | observacao'
'@ @'
      'produto_cod | produto | unidade_compra | unidades_por_embalagem_corrigida | fator_conversao | origem | status | observacao'
'@

Replace-LiteralOne $importar @'
      const fator =
        parseNumero(
          linha[idx.fatorConversao]
        );

      const status =
'@ @'
      const unidadesPorEmbalagemCorrigida =
        parseNumero(
          linha[idx.unidadesPorEmbalagemCorrigida]
        );

      const fator =
        parseNumero(
          linha[idx.fatorConversao]
        );

      const status =
'@

Replace-LiteralOne $importar @'
        !produtoCod ||
        !unidade ||
        fator <= 0
'@ @'
        !produtoCod ||
        !unidade ||
        unidadesPorEmbalagemCorrigida <= 0 ||
        fator <= 0
'@

Replace-LiteralOne $importar @'
      mapa[chave] = {
        fator,
        origem:
'@ @'
      mapa[chave] = {
        fator,
        unidadesPorEmbalagemCorrigida,
        origem:
'@

Replace-LiteralOne $importar @'
      qtdUnidade:
        cabecalhos.indexOf('unidades_por_embalagem'),

      qtd:
'@ @'
      qtdUnidade:
        cabecalhos.indexOf('unidades_por_embalagem'),

      qtdUnidadeCorrigida:
        cabecalhos.indexOf('unidades_por_embalagem_corrigida'),

      qtd:
'@

Replace-LiteralOne $importar @'
    const novasQuantidades = [];
    const novosFatores = [];
'@ @'
    const novasUnidadesCorrigidas = [];
    const novasQuantidades = [];
    const novosFatores = [];
'@

Replace-LiteralOne $importar @'
      if (linhaVazia) {
        novasQuantidades.push([
          linha[idx.qtd]
        ]);

        novosFatores.push([
'@ @'
      if (linhaVazia) {
        novasUnidadesCorrigidas.push([
          linha[idx.qtdUnidadeCorrigida]
        ]);

        novasQuantidades.push([
          linha[idx.qtd]
        ]);

        novosFatores.push([
'@

Replace-LiteralOne $importar @'
      const qtdAtual =
        Number(
          linha[idx.qtd] || 0
        );

      const fatorAtual =
'@ @'
      const unidadeCorrigidaAtual =
        linha[idx.qtdUnidadeCorrigida] === ''
          ? ''
          : Number(linha[idx.qtdUnidadeCorrigida]);

      const qtdAtual =
        Number(
          linha[idx.qtd] || 0
        );

      const fatorAtual =
'@

Replace-LiteralOne $importar @'
      const novoFator =
        conversao.fator &&
        conversao.fator > 0
          ? conversao.fator
          : 1;

      if (
        Number(novaQtd) !==
          Number(qtdAtual) ||
        Number(novoFator) !==
          Number(fatorAtual)
      ) {
'@ @'
      const novoFator =
        conversao.fator &&
        conversao.fator > 0
          ? conversao.fator
          : 1;

      const novaUnidadeCorrigida =
        conversao.unidadesPorEmbalagemCorrigida === ''
          ? ''
          : Number(conversao.unidadesPorEmbalagemCorrigida);

      if (
        Number(novaQtd) !==
          Number(qtdAtual) ||
        Number(novoFator) !==
          Number(fatorAtual) ||
        String(novaUnidadeCorrigida) !==
          String(unidadeCorrigidaAtual)
      ) {
'@

Replace-LiteralOne $importar @'
      novasQuantidades.push([
        novaQtd
      ]);

      novosFatores.push([
'@ @'
      novasUnidadesCorrigidas.push([
        novaUnidadeCorrigida
      ]);

      novasQuantidades.push([
        novaQtd
      ]);

      novosFatores.push([
'@

Replace-LiteralOne $importar @'
    /*
     * Atualiza SOMENTE:
     *
     * qtd
     * fator_conversao_aplicado
     *
     * qtd_original nunca é alterada.
     */
    aba
      .getRange(
        2,
        idx.qtd + 1,
'@ @'
    /*
     * Atualiza SOMENTE os campos derivados da conversão.
     * Os dados brutos de origem nunca são alterados.
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
        idx.qtd + 1,
'@

Replace-LiteralOne $importar @'
      manual &&
      manual.status ===
        'VALIDADO' &&
      manual.fator > 0
'@ @'
      manual &&
      manual.status ===
        'VALIDADO' &&
      manual.fator > 0 &&
      manual.unidadesPorEmbalagemCorrigida > 0
'@

Write-Host 'Refatoração de embalagem corrigida aplicada com sucesso.' -ForegroundColor Green
Write-Host 'Execute agora:' -ForegroundColor Cyan
Write-Host '  node --check src\ImportarCompras.js'
Write-Host '  node --check src\MigracaoEmbalagemCorrigida.js'
Write-Host '  git diff --check'
