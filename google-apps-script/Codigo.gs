/**
 * CRM Auge Lab — ponte entre o CRM e esta planilha.
 *
 * Como instalar (uma vez só):
 *  1. Na planilha: Extensões → Apps Script. Apague o que estiver lá e cole este arquivo inteiro.
 *  2. Troque o TOKEN abaixo pelo mesmo valor de GOOGLE_SHEETS_TOKEN do seu .env
 *     (ou cole o arquivo Codigo-pronto.gs, que já vem com o seu token).
 *  3. Salve, clique em Implantar → Nova implantação → engrenagem → App da Web.
 *     Executar como: Eu. Quem pode acessar: Qualquer pessoa. Implantar e autorizar.
 *  4. Copie a URL do App da Web (termina em /exec) para GOOGLE_SHEETS_URL.
 *
 * O CRM reescreve as abas Contatos, Historico e Ajustes a cada alteração. Pode editar células à mão:
 * o CRM percebe a edição e pede para recarregar antes de gravar por cima.
 * Para voltar no tempo, use Arquivo → Histórico de versões da própria planilha.
 */
const TOKEN = 'COLE_AQUI_O_TOKEN';
const ABAS = ['Contatos', 'Historico', 'Ajustes'];

function doPost(e) {
  let saida;
  try {
    if (!TOKEN || TOKEN === 'COLE_AQUI_O_TOKEN') throw new Error('Defina o TOKEN no topo do Apps Script.');
    const corpo = JSON.parse(e.postData.contents);
    if (corpo.token !== TOKEN) throw new Error('Token inválido.');
    if (corpo.acao === 'ler') saida = ler_();
    else if (corpo.acao === 'gravar') saida = gravar_(corpo.baseRev, corpo.abas || {});
    else throw new Error('Ação desconhecida.');
  } catch (err) {
    saida = { erro: String((err && err.message) || err) };
  }
  return ContentService.createTextOutput(JSON.stringify(saida)).setMimeType(ContentService.MimeType.JSON);
}

// Abrir a URL no navegador só confirma que está no ar (não mostra dados).
function doGet() {
  return ContentService.createTextOutput(JSON.stringify({ ok: true, app: 'crm-auge-lab' })).setMimeType(ContentService.MimeType.JSON);
}

// Edição manual na planilha: muda a revisão para o CRM não gravar por cima sem recarregar.
function onEdit() {
  const props = PropertiesService.getDocumentProperties();
  props.setProperty('rev', String(Number(props.getProperty('rev') || 0) + 1));
}

function rev_() {
  return Number(PropertiesService.getDocumentProperties().getProperty('rev') || 0);
}

function ler_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const abas = {};
  ABAS.forEach(function (nome) {
    const aba = ss.getSheetByName(nome);
    abas[nome] = aba && aba.getLastRow() > 0 ? aba.getDataRange().getDisplayValues() : [];
  });
  return { rev: rev_(), abas: abas, planilhaUrl: ss.getUrl(), planilhaNome: ss.getName() };
}

function gravar_(baseRev, abas) {
  const trava = LockService.getDocumentLock();
  trava.waitLock(20000);
  try {
    const atual = rev_();
    if (Number(baseRev) !== atual) {
      const r = ler_();
      r.conflito = true;
      return r;
    }
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    ABAS.forEach(function (nome) { escrever_(ss, nome, abas[nome] || []); });
    const novo = atual + 1;
    PropertiesService.getDocumentProperties().setProperty('rev', String(novo));
    SpreadsheetApp.flush();
    return { rev: novo };
  } finally {
    trava.releaseLock();
  }
}

function escrever_(ss, nome, linhas) {
  const aba = ss.getSheetByName(nome) || ss.insertSheet(nome);
  aba.clearContents();
  if (!linhas.length) return;
  const largura = Math.max.apply(null, linhas.map(function (l) { return l.length; }));
  const dados = linhas.map(function (l) {
    const x = l.map(function (v) { return v === null || v === undefined ? '' : String(v); });
    while (x.length < largura) x.push('');
    return x;
  });
  if (aba.getMaxColumns() < largura) aba.insertColumnsAfter(aba.getMaxColumns(), largura - aba.getMaxColumns());
  const faixa = aba.getRange(1, 1, dados.length, largura);
  faixa.setNumberFormat('@'); // texto puro: telefones, datas e valores ficam exatamente como o CRM gravou
  faixa.setValues(dados);
  aba.getRange(1, 1, 1, largura).setFontWeight('bold');
  aba.setFrozenRows(1);
}
