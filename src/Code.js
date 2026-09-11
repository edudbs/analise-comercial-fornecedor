function onOpen() {
  const ui = SpreadsheetApp.getUi();

  ui
    .createMenu('Análise Comercial')

    .addItem('1. Importar Compras do Drive', 'importarComprasDoDrive')
    .addItem('2. Importar Vendas do Drive', 'importarVendasDoDrive')
    .addItem('3. Importar Tudo', 'importarTudoDoDrive')

    .addSeparator()

    .addItem('4. Atualizar Análises', 'atualizarAnalises')
    .addItem('5. Atualizar Auditoria', 'atualizarAuditoria')
    .addItem('6. Atualizar Dashboard', 'atualizarDashboard')
    .addItem('7. Atualizar Movimentos Especiais', 'atualizarMovimentosEspeciais')

    .addSeparator()
    
    .addItem('8. Reprocessar conversões de compras', 'reprocessarConversoesCompras')
    
    .addSeparator()

    .addItem('9. Limpar Bases', 'limparBases')

    .addToUi();


  ui
    .createMenu('Instruções')

    .addItem(
      'Parâmetros dos Relatórios',
      'abrirInstrucoesRelatorios_'
    )

    .addToUi();
}


function importarTudoDoDrive() {
  importarComprasDoDrive();
  importarVendasDoDrive();
}


function limparBases() {
  const ui = SpreadsheetApp.getUi();

  const resposta = ui.alert(
    'Limpar bases',
    'Isso apagará os dados importados e as análises geradas, mantendo os cabeçalhos. Deseja continuar?',
    ui.ButtonSet.YES_NO
  );

  if (resposta !== ui.Button.YES) return;

  limparAbaMantendoCabecalho_('COMPRAS_RAW');
  limparAbaMantendoCabecalho_('VENDAS_RAW');

  limparAbaMantendoCabecalho_('ANALISE_SKU');
  limparAbaMantendoCabecalho_('ANALISE_SKU_CONSOLIDADA');
  limparAbaMantendoCabecalho_('ANALISE_FORNECEDOR');
  limparAbaMantendoCabecalho_('ANALISE_FORNECEDOR_SKU');

  limparAbaMantendoCabecalho_('VENDAS_SEM_COMPRA');
  limparAbaMantendoCabecalho_('MOVIMENTOS_ESPECIAIS');

  limparAbaMantendoCabecalho_('AUDITORIA');
  limparAbaMantendoCabecalho_('DASHBOARD');

  ui.alert('Bases e análises limpas com sucesso.');
}


function limparAbaMantendoCabecalho_(nomeAba) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const aba = ss.getSheetByName(nomeAba);

  if (!aba) {
    throw new Error('Aba não encontrada: ' + nomeAba);
  }

  const ultimaLinha = aba.getLastRow();
  const ultimaColuna = aba.getLastColumn();

  if (ultimaLinha <= 1) return;

  aba
    .getRange(
      2,
      1,
      ultimaLinha - 1,
      ultimaColuna
    )
    .clearContent();
}


function abrirInstrucoesRelatorios_() {
  const html = HtmlService.createHtmlOutput(`
    <!DOCTYPE html>
    <html>
      <head>
        <base target="_top">

        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
            color: #1f2937;
            line-height: 1.5;
          }

          h2 {
            margin-top: 0;
            color: #111827;
          }

          h3 {
            margin-top: 24px;
            margin-bottom: 8px;
            color: #1f2937;
          }

          .caminho {
            background: #f3f4f6;
            padding: 10px 12px;
            border-radius: 6px;
            margin-bottom: 12px;
            font-weight: bold;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }

          th,
          td {
            padding: 8px 10px;
            border-bottom: 1px solid #e5e7eb;
            text-align: left;
            vertical-align: top;
          }

          th {
            background: #f9fafb;
          }

          .alerta {
            margin-top: 20px;
            padding: 12px;
            background: #fff7ed;
            border-left: 4px solid #f97316;
          }

          .acoes {
            text-align: right;
            margin-top: 20px;
          }

          button {
            padding: 8px 16px;
            cursor: pointer;
          }
        </style>
      </head>

      <body>

        <h2>Parâmetros dos Relatórios — Varejo Fácil</h2>

        <h3>1. Compras</h3>

        <div class="caminho">
          Varejo Fácil &gt; Compra &gt; Nota Fiscal Entrada
        </div>

        <table>
          <tr>
            <th>Parâmetro</th>
            <th>Configuração</th>
          </tr>

          <tr>
            <td>Fornecedor</td>
            <td>Fornecedor da análise</td>
          </tr>

          <tr>
            <td>Data</td>
            <td><strong>Entrada</strong></td>
          </tr>

          <tr>
            <td>Formato</td>
            <td>☑ Analítico</td>
          </tr>

          <tr>
            <td>Situações</td>
            <td>☑ Efetivada (EFT)</td>
          </tr>

          <tr>
            <td>Exibição</td>
            <td><strong>CSV</strong></td>
          </tr>
        </table>


        <h3>2. Vendas</h3>

        <div class="caminho">
          Varejo Fácil &gt; Venda &gt; ABC Venda
        </div>

        <table>
          <tr>
            <th>Parâmetro</th>
            <th>Configuração</th>
          </tr>

          <tr>
            <td>Período</td>
            <td>Período Inicial / Período Final</td>
          </tr>

          <tr>
            <td>Fornecedor</td>
            <td>Fornecedor da análise</td>
          </tr>

          <tr>
            <td>Quebra (nível 1)</td>
            <td><strong>Data</strong></td>
          </tr>

          <tr>
            <td>Opções</td>
            <td>
              ☑ Classifica ABC<br>
              ☑ Considerar fornecedor secundário
            </td>
          </tr>

          <tr>
            <td>Exibição</td>
            <td><strong>CSV</strong></td>
          </tr>
        </table>


        <h3>3. Salvamento dos arquivos</h3>

        <div class="caminho">
          Google Drive &gt; Importados
        </div>

        <table>
          <tr>
            <th>Relatório</th>
            <th>Salvar em</th>
          </tr>

          <tr>
            <td>Compras</td>
            <td><strong>Importados &gt; Compras</strong></td>
          </tr>

          <tr>
            <td>Vendas</td>
            <td><strong>Importados &gt; Vendas</strong></td>
          </tr>
        </table>

        <div class="alerta">
          <strong>Importante:</strong>
          os arquivos CSV devem ser salvos diretamente na raiz das
          respectivas pastas Compras ou Vendas. Não colocar os arquivos
          em subpastas.
        </div>

        <div class="alerta">
          <strong>Atenção:</strong>
          confira se os relatórios de Compras e Vendas correspondem
          ao fornecedor e período que serão analisados antes da importação.
        </div>

        <div class="acoes">
          <button onclick="google.script.host.close()">
            Fechar
          </button>
        </div>

      </body>
    </html>
  `)
    .setWidth(650)
    .setHeight(650);

  SpreadsheetApp
    .getUi()
    .showModalDialog(
      html,
      'Instruções — Relatórios Varejo Fácil'
    );
}