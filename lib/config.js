// Escolhe onde os dados ficam, a partir das variáveis de ambiente:
//   GOOGLE_SHEETS_URL + GOOGLE_SHEETS_TOKEN → planilha Google (local ou na Vercel)
//   sem planilha, no computador               → dados/crm.json (ou CRM_DADOS)
//   CRM_SENHA                                 → exige senha (obrigatória na Vercel)
import path from 'node:path';
import { criarArmazemArquivo } from './armazem-arquivo.js';
import { criarArmazemPlanilha } from './armazem-planilha.js';

export function configurar(env = process.env, { raiz = process.cwd() } = {}) {
  const senha = env.CRM_SENHA || '';
  const naVercel = !!env.VERCEL;
  let armazem = null;
  const faltando = [];

  if (env.GOOGLE_SHEETS_URL) {
    if (!env.GOOGLE_SHEETS_TOKEN) faltando.push('GOOGLE_SHEETS_TOKEN (o mesmo token colado no Apps Script da planilha)');
    else armazem = criarArmazemPlanilha({ url: env.GOOGLE_SHEETS_URL, token: env.GOOGLE_SHEETS_TOKEN });
  } else if (naVercel) {
    faltando.push('GOOGLE_SHEETS_URL e GOOGLE_SHEETS_TOKEN (a planilha onde os contatos ficam)');
  } else {
    armazem = criarArmazemArquivo(env.CRM_DADOS || path.join(raiz, 'dados'));
  }
  if (naVercel && !senha) faltando.push('CRM_SENHA (sem senha, qualquer pessoa com o endereço leria seus contatos)');

  const indisponivel = !faltando.length ? ''
    : `Falta configurar: ${faltando.join('; ')}.${naVercel ? ' Na Vercel: Settings → Environment Variables, depois faça um novo deploy.' : ' Ajuste o arquivo .env e abra o CRM de novo.'}`;
  return { armazem: faltando.length ? null : armazem, senha, indisponivel, seguro: naVercel };
}
