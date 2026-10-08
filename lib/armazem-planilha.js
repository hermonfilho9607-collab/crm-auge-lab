// Armazém em planilha Google: conversa com o Apps Script publicado como "App da Web" na própria planilha
// (código em google-apps-script/Codigo.gs). O token fica só no servidor; o navegador nunca o vê.
import { paraAbas, deAbas } from './planilha.js';

export class ErroPlanilha extends Error {}

export function criarArmazemPlanilha({ url, token, fetch: buscar = globalThis.fetch, tempoLimite = 25000 }) {
  async function chamar(corpo) {
    let resposta;
    try {
      resposta = await buscar(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ token, ...corpo }),
        redirect: 'follow',
        signal: AbortSignal.timeout(tempoLimite),
      });
    } catch (e) {
      throw new ErroPlanilha(`Não consegui falar com a planilha Google (${e.name === 'TimeoutError' ? 'demorou demais' : 'sem conexão'}).`);
    }
    const texto = await resposta.text();
    let j;
    try {
      j = JSON.parse(texto);
    } catch {
      throw new ErroPlanilha('A planilha não respondeu como esperado. Confira o endereço do Apps Script (GOOGLE_SHEETS_URL) e se a implantação está como "App da Web" com acesso "Qualquer pessoa".');
    }
    if (j && j.erro) throw new ErroPlanilha(`Planilha: ${j.erro}`);
    return j;
  }

  const fonteDe = (j) => ({ tipo: 'planilha', url: j.planilhaUrl || '', nome: j.planilhaNome || '' });

  return {
    async ler() {
      const j = await chamar({ acao: 'ler' });
      return { rev: Number(j.rev) || 0, data: deAbas(j.abas), fonte: fonteDe(j) };
    },
    async gravar(baseRev, data) {
      const j = await chamar({ acao: 'gravar', baseRev, abas: paraAbas(data) });
      if (j.conflito) return { conflito: true, rev: Number(j.rev) || 0, data: deAbas(j.abas) };
      return { conflito: false, rev: Number(j.rev) || 0 };
    },
  };
}
