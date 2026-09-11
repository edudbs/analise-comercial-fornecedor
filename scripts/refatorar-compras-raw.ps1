$ErrorActionPreference = 'Stop'

function Ensure-RegexReplacement {
  param(
    [string]$Path,
    [string]$OldPattern,
    [string]$NewPattern,
    [string]$Replacement
  )

  $content = Get-Content -Raw -Encoding UTF8 $Path
  $options = [System.Text.RegularExpressions.RegexOptions]::Singleline
  $oldRegex = [regex]::new($OldPattern, $options)
  $newRegex = [regex]::new($NewPattern, $options)

  $oldCount = $oldRegex.Matches($content).Count
  $newCount = $newRegex.Matches($content).Count

  if ($oldCount -eq 1 -and $newCount -eq 0) {
    $content = $oldRegex.Replace($content, $Replacement, 1)
    Set-Content -Path $Path -Value $content -Encoding UTF8 -NoNewline
    return
  }

  if ($oldCount -eq 0 -and $newCount -eq 1) {
    return
  }

  throw "Estado inesperado em ${Path}. Antigo=$oldCount Novo=$newCount.`nPadrao antigo: $OldPattern`nPadrao novo: $NewPattern"
}

$root = Split-Path -Parent $PSScriptRoot
$importar = Join-Path $root 'src\ImportarCompras.js'
$analises = Join-Path $root 'src\AtualizarAnalises.js'
$movimentos = Join-Path $root 'src\MovimentosEspeciais.js'
$tempMigracao = Join-Path $root 'src\temp_migrarQuantidadeOriginal.js'

# ImportarCompras.js - cabecalhos fisicos da COMPRAS_RAW no reprocessamento
Ensure-RegexReplacement $importar "cabecalhos\.indexOf\(\s*'unidade'\s*\)" "cabecalhos\.indexOf\(\s*'unidade_compra'\s*\)" "cabecalhos.indexOf('unidade_compra')"
Ensure-RegexReplacement $importar "cabecalhos\.indexOf\(\s*'qtd_unidade'\s*\)" "cabecalhos\.indexOf\(\s*'unidades_por_embalagem'\s*\)" "cabecalhos.indexOf('unidades_por_embalagem')"
Ensure-RegexReplacement $importar "cabecalhos\.indexOf\(\s*'qtd'\s*\)" "cabecalhos\.indexOf\(\s*'qtd_compra_convertida'\s*\)" "cabecalhos.indexOf('qtd_compra_convertida')"
Ensure-RegexReplacement $importar "cabecalhos\.indexOf\(\s*'qtd_original'\s*\)" "cabecalhos\.indexOf\(\s*'qtd_original_compra'\s*\)" "cabecalhos.indexOf('qtd_original_compra')"

# Fila de conversoes pendentes - leitura por objeto da COMPRAS_RAW
Ensure-RegexReplacement $importar "item\.unidade\s*\|\|" "item\.unidade_compra\s*\|\|" "item.unidade_compra ||"
Ensure-RegexReplacement $importar "item\.qtd_unidade\s*\|\|\s*0" "item\.unidades_por_embalagem\s*\|\|\s*0" "item.unidades_por_embalagem || 0"
Ensure-RegexReplacement $importar "item\.qtd_original\s*\|\|\s*item\.qtd\s*\|\|" "item\.qtd_original_compra\s*\|\|\s*item\.qtd_compra_convertida\s*\|\|" "item.qtd_original_compra ||`n        item.qtd_compra_convertida ||"

# Analises - quantidade normalizada da compra
Ensure-RegexReplacement $analises "qtd:\s*parseNumero\(item\.qtd\)" "qtd:\s*parseNumero\(item\.qtd_compra_convertida\)" "qtd: parseNumero(item.qtd_compra_convertida)"

# Movimentos especiais - quantidade normalizada da compra
Ensure-RegexReplacement $movimentos "parseNumero\(item\.qtd\)" "parseNumero\(item\.qtd_compra_convertida\)" "parseNumero(item.qtd_compra_convertida)"

# Utilitario temporario de migracao
Ensure-RegexReplacement $tempMigracao "cabecalhos\.indexOf\(\s*'unidade'\s*\)" "cabecalhos\.indexOf\(\s*'unidade_compra'\s*\)" "cabecalhos.indexOf('unidade_compra')"
Ensure-RegexReplacement $tempMigracao "cabecalhos\.indexOf\(\s*'qtd_unidade'\s*\)" "cabecalhos\.indexOf\(\s*'unidades_por_embalagem'\s*\)" "cabecalhos.indexOf('unidades_por_embalagem')"
Ensure-RegexReplacement $tempMigracao "cabecalhos\.indexOf\(\s*'qtd'\s*\)" "cabecalhos\.indexOf\(\s*'qtd_compra_convertida'\s*\)" "cabecalhos.indexOf('qtd_compra_convertida')"
Ensure-RegexReplacement $tempMigracao "cabecalhos\.indexOf\(\s*'qtd_original'\s*\)" "cabecalhos\.indexOf\(\s*'qtd_original_compra'\s*\)" "cabecalhos.indexOf('qtd_original_compra')"

Write-Host 'Refatoracao aplicada com sucesso.' -ForegroundColor Green
Write-Host 'O script e idempotente: pode ser executado novamente sem duplicar alteracoes.'
Write-Host ''
Write-Host 'Execute agora: git diff --check' -ForegroundColor Cyan
