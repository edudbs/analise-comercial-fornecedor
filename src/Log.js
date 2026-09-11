function registrarLogImportacao(
  tipoArquivo,
  nomeArquivo,
  registros,
  status,
  obs = ''
) {
  const aba = obterAba('LOG_IMPORTACAO');

  aba.appendRow([
    agoraFormatado(),
    tipoArquivo,
    nomeArquivo,
    registros,
    status,
    obs
  ]);
}

function registrarErro(origem, erro) {
  const mensagem =
    erro instanceof Error
      ? erro.message
      : String(erro);

  registrarLogImportacao(
    'ERRO',
    origem,
    0,
    'ERRO',
    mensagem
  );
}

function registrarSucesso(
  tipoArquivo,
  nomeArquivo,
  registros
) {
  registrarLogImportacao(
    tipoArquivo,
    nomeArquivo,
    registros,
    'SUCESSO',
    ''
  );
}