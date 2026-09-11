$ErrorActionPreference = 'Stop'

function Replace-Exact {
  param(
    [string]$Path,
    [string]$Old,
    [string]$New,
    [int]$ExpectedCount = 1
  )

  $content = Get-Content -Raw -Encoding UTF8 $Path

  # Normaliza as quebras de linha para evitar diferencas entre LF e CRLF.
  $contentNormalizado = $content -replace "`r`n", "`n"
  $oldNormalizado = $Old -replace "`r`n", "`n"
  $newNormalizado = $New -replace "`r`n", "`n"

  $count = ([regex]::Matches(
    $contentNormalizado,
    [regex]::Escape($oldNormalizado)
  )).Count

  if ($count -ne $ExpectedCount) {
    throw "Falha em ${Path}: esperado $ExpectedCount ocorrencia(s), encontrado $count.`nTrecho: $oldNormalizado"
  }

  $contentNormalizado = $contentNormalizado.Replace(
    $oldNormalizado,
    $newNormalizado
  )

  # Salva em UTF-8 sem BOM.
  $utf8SemBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText(
    $Path,
    $contentNormalizado,
    $utf8SemBom
  )
}

$root = Split-Path -Parent $PSScriptRoot
$importar = Join-Path $root 'src\ImportarCompras.js'
$analises = Join-Path $root 'src\AtualizarAnalises.js'
$movimentos = Join-Path $root 'src\MovimentosEspeciais.js'
$tempMigracao = Join-Path $root 'src\temp_migrarQuantidadeOriginal.js'

# ImportarCompras.js - comentarios/documentacao da ordem da COMPRAS_RAW
Replace-Exact $importar @'
       * unidade
       * qtd_unidade
       * qtd
       * custo_unit
       * valor_total
       * operacao
       * qtd_original
'@ @'
       * unidade_compra
       * unidades_por_embalagem
       * qtd_compra_convertida
       * custo_unit
       * valor_total
       * operacao
       * qtd_original_compra
'@

Replace-Exact $importar '       * qtd_original.' '       * qtd_original_compra.' 1
Replace-Exact $importar '         * gravamos 1 porque a qtd ainda' '         * gravamos 1 porque a qtd_compra_convertida ainda' 1

# Reprocessamento - somente nomes fisicos dos cabecalhos; nomes internos permanecem estaveis.
Replace-Exact $importar "          'unidade'" "          'unidade_compra'" 1
Replace-Exact $importar "          'qtd_unidade'" "          'unidades_por_embalagem'" 1
Replace-Exact $importar "          'qtd'" "          'qtd_compra_convertida'" 1
Replace-Exact $importar "          'qtd_original'" "          'qtd_original_compra'" 1

Replace-Exact $importar ' * qtd_original = 1' ' * qtd_original_compra = 1' 1
Replace-Exact $importar '     * qtd' '     * qtd_compra_convertida' 1
Replace-Exact $importar '     * qtd_original nunca e alterada.' '     * qtd_original_compra nunca e alterada.' 1

# Fila de conversoes pendentes - leitura por objeto da COMPRAS_RAW.
Replace-Exact $importar '        item.unidade ||' '        item.unidade_compra ||' 1
Replace-Exact $importar '        item.qtd_unidade || 0' '        item.unidades_por_embalagem || 0' 1
Replace-Exact $importar @'
        item.qtd_original ||
        item.qtd ||
'@ @'
        item.qtd_original_compra ||
        item.qtd_compra_convertida ||
'@ 1
Replace-Exact $importar '     * Se qtd_unidade > 1,' '     * Se unidades_por_embalagem > 1,' 1
Replace-Exact $importar '     * portanto usamos qtd_original.' '     * portanto usamos qtd_original_compra.' 1

# Analises - quantidade normalizada da compra.
Replace-Exact $analises '        qtd: parseNumero(item.qtd),' '        qtd: parseNumero(item.qtd_compra_convertida),' 1

# Movimentos especiais - quantidade normalizada da compra.
Replace-Exact $movimentos '      parseNumero(item.qtd),' '      parseNumero(item.qtd_compra_convertida),' 1

# Utilitario temporario de migracao - mantem compatibilidade caso seja aberto apos a refatoracao.
Replace-Exact $tempMigracao "    cabecalhos.indexOf('unidade');" "    cabecalhos.indexOf('unidade_compra');" 1
Replace-Exact $tempMigracao "    cabecalhos.indexOf('qtd_unidade');" "    cabecalhos.indexOf('unidades_por_embalagem');" 1
Replace-Exact $tempMigracao "    cabecalhos.indexOf('qtd');" "    cabecalhos.indexOf('qtd_compra_convertida');" 1
Replace-Exact $tempMigracao "    cabecalhos.indexOf('qtd_original');" "    cabecalhos.indexOf('qtd_original_compra');" 1
Replace-Exact $tempMigracao '     * qtd_unidade = 6' '     * unidades_por_embalagem = 6' 1
Replace-Exact $tempMigracao '     * qtd_original = 70' '     * qtd_original_compra = 70' 1
Replace-Exact $tempMigracao '     * qtd_original = qtd atual' '     * qtd_original_compra = qtd atual' 1
Replace-Exact $tempMigracao "      'qtd_original e fator_conversao_aplicado foram preenchidos.'" "      'qtd_original_compra e fator_conversao_aplicado foram preenchidos.'" 1

Write-Host 'Refatoracao aplicada com sucesso.' -ForegroundColor Green
Write-Host 'Arquivos alterados:'
Write-Host ' - src/ImportarCompras.js'
Write-Host ' - src/AtualizarAnalises.js'
Write-Host ' - src/MovimentosEspeciais.js'
Write-Host ' - src/temp_migrarQuantidadeOriginal.js'
Write-Host ''
Write-Host 'Execute agora: git diff --check; git diff' -ForegroundColor Cyan
