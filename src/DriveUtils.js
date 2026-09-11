function obterPastaPorId(idPasta) {
  try {
    return DriveApp.getFolderById(idPasta);
  } catch (erro) {
    throw new Error('Não foi possível acessar a pasta do Drive: ' + idPasta);
  }
}

function obterOuCriarPastaProcessados(pastaOrigem) {
  const pastas = pastaOrigem.getFoldersByName(NOME_PASTA_PROCESSADOS);

  if (pastas.hasNext()) {
    return pastas.next();
  }

  return pastaOrigem.createFolder(NOME_PASTA_PROCESSADOS);
}

function listarArquivosCsvPendentes(idPasta) {
  const pasta = obterPastaPorId(idPasta);
  const arquivos = pasta.getFiles();
  const lista = [];

  while (arquivos.hasNext()) {
    const arquivo = arquivos.next();
    const nome = arquivo.getName();

    if (nome.toLowerCase().endsWith('.csv')) {
      lista.push(arquivo);
    }
  }

  return lista;
}

function lerConteudoArquivoCsv(arquivo) {
  return arquivo.getBlob().getDataAsString('UTF-8');
}

function moverArquivoParaProcessados(arquivo, idPastaOrigem) {
  const pastaOrigem = obterPastaPorId(idPastaOrigem);
  const pastaProcessados = obterOuCriarPastaProcessados(pastaOrigem);

  arquivo.moveTo(pastaProcessados);
}

function registrarNenhumArquivo(tipoArquivo) {
  registrarLogImportacao(
    tipoArquivo,
    '',
    0,
    'SEM_ARQUIVOS',
    'Nenhum CSV pendente encontrado.'
  );
}