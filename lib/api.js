// Rotas /api/* — usadas pelo servidor local (server.js) e pelas funções da Vercel (api/*.js).
//   GET  /api/db       → { rev, data, fonte, protegido }
//   PUT  /api/db       ← { baseRev, data }  → { rev } | 409 { rev, data }
//   GET  /api/sessao   → { protegido, logado }
//   POST /api/sessao   ← { senha }  (define o cookie de sessão)
//   DELETE /api/sessao (sai)
import crypto from 'node:crypto';
import { ErroPlanilha } from './armazem-planilha.js';

const COOKIE = 'crm_sessao';
const TRINTA_DIAS = 60 * 60 * 24 * 30;

function json(res, status, corpo, cabecalhos = {}) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  for (const [k, v] of Object.entries(cabecalhos)) res.setHeader(k, v);
  res.end(JSON.stringify(corpo));
}

async function lerCorpo(req, limite = 25 * 1024 * 1024) {
  // Na Vercel o corpo pode já vir lido em req.body; no servidor local lemos o fluxo.
  if (req.body !== undefined) return typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body ?? {};
  const texto = await new Promise((resolve, reject) => {
    let tamanho = 0;
    const partes = [];
    req.on('data', (c) => {
      tamanho += c.length;
      if (tamanho > limite) { reject(new Error('Corpo grande demais')); req.destroy(); return; }
      partes.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(partes).toString('utf8')));
    req.on('error', reject);
  });
  return JSON.parse(texto || '{}');
}

export function tokenSessao(senha) {
  return crypto.createHmac('sha256', senha).update('crm-auge-lab/sessao/v1').digest('hex');
}

function iguais(a, b) {
  const x = crypto.createHash('sha256').update(String(a)).digest();
  const y = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(x, y);
}

function lerCookie(req, nome) {
  const bruto = req.headers.cookie || '';
  for (const parte of bruto.split(';')) {
    const [k, ...v] = parte.trim().split('=');
    if (k === nome) return decodeURIComponent(v.join('='));
  }
  return '';
}

function logado(req, senha) {
  if (!senha) return true;
  const valor = lerCookie(req, COOKIE);
  return !!valor && iguais(valor, tokenSessao(senha));
}

function cookie(valor, maxAge, seguro) {
  return `${COOKIE}=${valor}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${seguro ? '; Secure' : ''}`;
}

/**
 * @param {{ armazem?: object, senha?: string, indisponivel?: string, seguro?: boolean }} cfg
 */
export async function tratarApi(req, res, cfg) {
  const { pathname } = new URL(req.url, 'http://localhost');
  const seguro = cfg.seguro || req.headers['x-forwarded-proto'] === 'https';
  try {
    if (pathname === '/api/sessao') {
      if (req.method === 'GET') return json(res, 200, { protegido: !!cfg.senha, logado: logado(req, cfg.senha) });
      if (req.method === 'POST') {
        if (!cfg.senha) return json(res, 200, { ok: true });
        const { senha } = await lerCorpo(req);
        if (!senha || !iguais(senha, cfg.senha)) {
          await new Promise((r) => setTimeout(r, 600)); // freia tentativas em sequência
          return json(res, 401, { erro: 'Senha incorreta.' });
        }
        return json(res, 200, { ok: true }, { 'Set-Cookie': cookie(tokenSessao(cfg.senha), TRINTA_DIAS, seguro) });
      }
      if (req.method === 'DELETE') return json(res, 200, { ok: true }, { 'Set-Cookie': cookie('', 0, seguro) });
      return json(res, 405, { erro: 'Método não permitido' });
    }

    if (pathname === '/api/db') {
      if (cfg.indisponivel) return json(res, 503, { erro: cfg.indisponivel });
      if (!logado(req, cfg.senha)) return json(res, 401, { erro: 'Entre com a senha do CRM.' });
      if (req.method === 'GET') {
        const r = await cfg.armazem.ler();
        return json(res, 200, { ...r, protegido: !!cfg.senha });
      }
      if (req.method === 'PUT') {
        const { baseRev, data } = await lerCorpo(req);
        if (!data || typeof data !== 'object' || !Array.isArray(data.contatos)) return json(res, 400, { erro: 'Formato inválido' });
        const r = await cfg.armazem.gravar(baseRev, data);
        return r.conflito ? json(res, 409, { rev: r.rev, data: r.data }) : json(res, 200, { rev: r.rev });
      }
      return json(res, 405, { erro: 'Método não permitido' });
    }

    return json(res, 404, { erro: 'Não encontrado' });
  } catch (e) {
    if (e instanceof ErroPlanilha) return json(res, 502, { erro: e.message });
    return json(res, 500, { erro: e.message });
  }
}
