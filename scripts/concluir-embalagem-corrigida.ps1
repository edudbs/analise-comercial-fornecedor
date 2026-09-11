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

# A execução anterior parou exatamente antes desta etapa.
# Insere a gravação de unidades_por_embalagem_corrigida sem depender dos comentários do arquivo.
Replace-LiteralOne $importar @'
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
'@ @'
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
        novasQuantidades.length,
        1
      )
      .setValues(
        novasQuantidades
      );
'@

# Uma regra manual só deixa de ser pendente quando possui tanto o fator matemático
# quanto a quantidade real por embalagem validados.
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

Write-Host 'Etapa final da refatoracao aplicada com sucesso.' -ForegroundColor Green
Write-Host 'Execute agora:' -ForegroundColor Cyan
Write-Host '  node --check src\ImportarCompras.js'
Write-Host '  node --check src\MigracaoEmbalagemCorrigida.js'
Write-Host '  git diff --check'
