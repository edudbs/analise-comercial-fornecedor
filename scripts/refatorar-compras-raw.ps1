$ErrorActionPreference = 'Stop'

function Replace-RegexOne {
  param(
    [string]$Path,
    [string]$Pattern,
    [string]$Replacement
  )

  $content = Get-Content -Raw -Encoding UTF8 $Path
  $regex = [regex]::new($Pattern, [System.Text.RegularExpressions.RegexOptions]::Singleline)
  $count = $regex.Matches($content).Count

  if ($count -ne 1) {
    throw "Falha em ${Path}: esperado 1 ocorrencia(s), encontrado $count.`nPadrao: $Pattern"
  }

  $content = $regex.Replace($content, $Replacement, 1)
  Set-Content -Path $Path -Value $content -Encoding UTF8 -NoNewline
}

$root = Split-Path -Parent $PSScriptRoot
$importar = Join-Path $root 'src\ImportarCompras.js'
$analises = Join-Path $root 'src\AtualizarAnalises.js'
$movimentos = Join-Path $root 'src\MovimentosEspeciais.js'
$tempMigracao = Join-Path $root 'src\temp_migrarQuantidadeOriginal.js'

# IMPORTANTE: este script deve ser executado sobre os arquivos limpos da branch.

# ImportarCompras.js - cabecalhos fisicos da COMPRAS_RAW no reprocessamento
Replace-RegexOne $importar "cabecalhos\.indexOf\(\s*'unidade'\s*\)" "cabecalhos.indexOf('unidade_compra')"
Replace-RegexOne $importar "cabecalhos\.indexOf\(\s*'qtd_unidade'\s*\)" "cabecalhos.indexOf('unidades_por_embalagem')"
Replace-RegexOne $importar "cabecalhos\.indexOf\(\s*'qtd'\s*\)" "cabecalhos.indexOf('qtd_compra_convertida')"
Replace-RegexOne $importar "cabecalhos\.indexOf\(\s*'qtd_original'\s*\)" "cabecalhos.indexOf('qtd_original_compra')"

# Fila de conversoes pendentes - leitura por objeto da COMPRAS_RAW
Replace-RegexOne $importar "item\.unidade\s*\|\|" "item.unidade_compra ||"
Replace-RegexOne $importar "item\.qtd_unidade\s*\|\|\s*0" "item.unidades_por_embalagem || 0"
Replace-RegexOne $importar "item\.qtd_original\s*\|\|\s*item\.qtd\s*\|\|" "item.qtd_original_compra ||`n        item.qtd_compra_convertida ||"

# Analises - altera SOMENTE a quantidade lida de COMPRAS_RAW dentro de prepararComprasPeriodo_.
Replace-RegexOne $analises "(function prepararComprasPeriodo_\(periodo\)[\s\S]*?produto:\s*item\.produto,\s*)qtd:\s*parseNumero\(item\.qtd\)(,\s*valor_total:)" '$1qtd: parseNumero(item.qtd_compra_convertida)$2'

# Movimentos especiais - quantidade normalizada da compra
Replace-RegexOne $movimentos "parseNumero\(item\.qtd\)" "parseNumero(item.qtd_compra_convertida)"

# Utilitario temporario de migracao
Replace-RegexOne $tempMigracao "cabecalhos\.indexOf\(\s*'unidade'\s*\)" "cabecalhos.indexOf('unidade_compra')"
Replace-RegexOne $tempMigracao "cabecalhos\.indexOf\(\s*'qtd_unidade'\s*\)" "cabecalhos.indexOf('unidades_por_embalagem')"
Replace-RegexOne $tempMigracao "cabecalhos\.indexOf\(\s*'qtd'\s*\)" "cabecalhos.indexOf('qtd_compra_convertida')"
Replace-RegexOne $tempMigracao "cabecalhos\.indexOf\(\s*'qtd_original'\s*\)" "cabecalhos.indexOf('qtd_original_compra')"

Write-Host 'Refatoracao aplicada com sucesso.' -ForegroundColor Green
Write-Host 'Execute agora: git diff --check' -ForegroundColor Cyan
