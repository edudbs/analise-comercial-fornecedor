$ErrorActionPreference = 'Stop'

function Replace-RegexExact {
  param(
    [string]$Path,
    [string]$Pattern,
    [string]$Replacement,
    [int]$ExpectedCount = 1
  )

  $content = Get-Content -Raw -Encoding UTF8 $Path
  $regex = [regex]::new($Pattern, [System.Text.RegularExpressions.RegexOptions]::Singleline)
  $count = $regex.Matches($content).Count

  if ($count -ne $ExpectedCount) {
    throw "Falha em ${Path}: esperado $ExpectedCount ocorrencia(s), encontrado $count.`nPadrao: $Pattern"
  }

  $content = $regex.Replace($content, $Replacement)
  Set-Content -Path $Path -Value $content -Encoding UTF8 -NoNewline
}

$root = Split-Path -Parent $PSScriptRoot
$importar = Join-Path $root 'src\ImportarCompras.js'
$analises = Join-Path $root 'src\AtualizarAnalises.js'
$movimentos = Join-Path $root 'src\MovimentosEspeciais.js'
$tempMigracao = Join-Path $root 'src\temp_migrarQuantidadeOriginal.js'

# ImportarCompras.js - cabecalhos fisicos da COMPRAS_RAW no reprocessamento
Replace-RegexExact $importar "cabecalhos\.indexOf\(\s*'unidade'\s*\)" "cabecalhos.indexOf('unidade_compra')"
Replace-RegexExact $importar "cabecalhos\.indexOf\(\s*'qtd_unidade'\s*\)" "cabecalhos.indexOf('unidades_por_embalagem')"
Replace-RegexExact $importar "cabecalhos\.indexOf\(\s*'qtd'\s*\)" "cabecalhos.indexOf('qtd_compra_convertida')"
Replace-RegexExact $importar "cabecalhos\.indexOf\(\s*'qtd_original'\s*\)" "cabecalhos.indexOf('qtd_original_compra')"

# Fila de conversoes pendentes - leitura por objeto da COMPRAS_RAW
Replace-RegexExact $importar "item\.unidade\s*\|\|" "item.unidade_compra ||"
Replace-RegexExact $importar "item\.qtd_unidade\s*\|\|\s*0" "item.unidades_por_embalagem || 0"
Replace-RegexExact $importar "item\.qtd_original\s*\|\|\s*item\.qtd\s*\|\|" "item.qtd_original_compra ||`n        item.qtd_compra_convertida ||"

# Analises - quantidade normalizada da compra
Replace-RegexExact $analises "qtd:\s*parseNumero\(item\.qtd\)" "qtd: parseNumero(item.qtd_compra_convertida)"

# Movimentos especiais - quantidade normalizada da compra
Replace-RegexExact $movimentos "parseNumero\(item\.qtd\)" "parseNumero(item.qtd_compra_convertida)"

# Utilitario temporario de migracao
Replace-RegexExact $tempMigracao "cabecalhos\.indexOf\('unidade'\)" "cabecalhos.indexOf('unidade_compra')"
Replace-RegexExact $tempMigracao "cabecalhos\.indexOf\('qtd_unidade'\)" "cabecalhos.indexOf('unidades_por_embalagem')"
Replace-RegexExact $tempMigracao "cabecalhos\.indexOf\('qtd'\)" "cabecalhos.indexOf('qtd_compra_convertida')"
Replace-RegexExact $tempMigracao "cabecalhos\.indexOf\('qtd_original'\)" "cabecalhos.indexOf('qtd_original_compra')"

Write-Host 'Refatoracao aplicada com sucesso.' -ForegroundColor Green
Write-Host 'Arquivos alterados:'
Write-Host ' - src/ImportarCompras.js'
Write-Host ' - src/AtualizarAnalises.js'
Write-Host ' - src/MovimentosEspeciais.js'
Write-Host ' - src/temp_migrarQuantidadeOriginal.js'
Write-Host ''
Write-Host 'Execute agora: git diff --check' -ForegroundColor Cyan
