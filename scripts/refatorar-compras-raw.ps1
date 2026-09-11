$ErrorActionPreference = 'Stop'

function Replace-Exact {
  param(
    [string]$Path,
    [string]$Old,
    [string]$New,
    [int]$ExpectedCount = 1
  )

  $content = Get-Content -Raw -Encoding UTF8 $Path
  $count = ([regex]::Matches($content, [regex]::Escape($Old))).Count

  if ($count -ne $ExpectedCount) {
    throw "Falha em ${Path}: esperado $ExpectedCount ocorrencia(s), encontrado $count.`nTrecho: $Old"
  }

  $content = $content.Replace($Old, $New)
  $utf8SemBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $content, $utf8SemBom)
}

$root = Split-Path -Parent $PSScriptRoot
$importar = Join-Path $root 'src\ImportarCompras.js'
$analises = Join-Path $root 'src\AtualizarAnalises.js'
$movimentos = Join-Path $root 'src\MovimentosEspeciais.js'
$tempMigracao = Join-Path $root 'src\temp_migrarQuantidadeOriginal.js'

# ImportarCompras.js - nomes fisicos dos cabecalhos de COMPRAS_RAW no reprocessamento.
Replace-Exact $importar "          'unidade'" "          'unidade_compra'" 1
Replace-Exact $importar "          'qtd_unidade'" "          'unidades_por_embalagem'" 1
Replace-Exact $importar "          'qtd'" "          'qtd_compra_convertida'" 1
Replace-Exact $importar "          'qtd_original'" "          'qtd_original_compra'" 1

# ImportarCompras.js - leitura da COMPRAS_RAW para a fila de conversoes pendentes.
Replace-Exact $importar '        item.unidade ||' '        item.unidade_compra ||' 1
Replace-Exact $importar '        item.qtd_unidade || 0' '        item.unidades_por_embalagem || 0' 1
Replace-Exact $importar '        item.qtd_original ||' '        item.qtd_original_compra ||' 1
Replace-Exact $importar '        item.qtd ||' '        item.qtd_compra_convertida ||' 1

# AtualizarAnalises.js - quantidade normalizada da compra.
Replace-Exact $analises '        qtd: parseNumero(item.qtd),' '        qtd: parseNumero(item.qtd_compra_convertida),' 1

# MovimentosEspeciais.js - quantidade normalizada da compra.
Replace-Exact $movimentos '      parseNumero(item.qtd),' '      parseNumero(item.qtd_compra_convertida),' 1

# Utilitario temporario de migracao.
Replace-Exact $tempMigracao "    cabecalhos.indexOf('unidade');" "    cabecalhos.indexOf('unidade_compra');" 1
Replace-Exact $tempMigracao "    cabecalhos.indexOf('qtd_unidade');" "    cabecalhos.indexOf('unidades_por_embalagem');" 1
Replace-Exact $tempMigracao "    cabecalhos.indexOf('qtd');" "    cabecalhos.indexOf('qtd_compra_convertida');" 1
Replace-Exact $tempMigracao "    cabecalhos.indexOf('qtd_original');" "    cabecalhos.indexOf('qtd_original_compra');" 1

Write-Host 'Refatoracao aplicada com sucesso.' -ForegroundColor Green
Write-Host 'Arquivos alterados:'
Write-Host ' - src/ImportarCompras.js'
Write-Host ' - src/AtualizarAnalises.js'
Write-Host ' - src/MovimentosEspeciais.js'
Write-Host ' - src/temp_migrarQuantidadeOriginal.js'
Write-Host ''
Write-Host 'Agora execute: git diff --check' -ForegroundColor Cyan
