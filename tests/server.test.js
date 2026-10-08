import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { criarServidor } from '../server.js';
import { criarArmazemArquivo } from '../lib/armazem-arquivo.js';
import { configurar } from '../lib/config.js';

function subir(cfg) {
  const servidor = criarServidor(cfg);
  return new Promise((resolve) => servidor.listen(0, '127.0.0.1', () => {
    const base = `http://127.0.0.1:${servidor.address().port}`;
    resolve({ base, fechar: () => new Promise((r) => { servidor.close(r); servidor.closeAllConnections(); }) });
  }));
}

function pastaTemp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'crm-teste-'));
}

const put = (base, corpo, cookie = '') => fetch(base + '/api/db', {
  method: 'PUT', headers: { 'Content-Type': 'application/json', cookie }, body: JSON.stringify(corpo),
});

test('arquivo local: grava, lê e recusa revisão desatualizada', async () => {
  const pasta = pastaTemp();
  const { base, fechar } = await subir({ armazem: criarArmazemArquivo(pasta) });
  try {
    let r = await (await fetch(base + '/api/db')).json();
    assert.equal(r.rev, 0);
    assert.equal(r.data, null);
    assert.equal(r.fonte.tipo, 'arquivo');
    assert.equal(r.protegido, false);

    r = await put(base, { baseRev: 0, data: { contatos: [{ id: '1' }] } });
    assert.equal(r.status, 200);
    assert.equal((await r.json()).rev, 1);

    r = await put(base, { baseRev: 0, data: { contatos: [] } });
    assert.equal(r.status, 409, 'outra aba com revisão antiga não sobrescreve');
    const conflito = await r.json();
    assert.equal(conflito.rev, 1);
    assert.equal(conflito.data.contatos.length, 1);

    r = await put(base, { baseRev: 1, data: { contatos: [{ id: '1' }, { id: '2' }] } });
    assert.equal(r.status, 200);
    const lido = await (await fetch(base + '/api/db')).json();
    assert.equal(lido.rev, 2);
    assert.equal(lido.data.contatos.length, 2);

    const backups = fs.readdirSync(path.join(pasta, 'backups'));
    assert.equal(backups.length, 1, 'uma cópia de segurança por dia');
  } finally {
    await fechar();
  }
});

test('rejeita formato inválido e bloqueia saída da pasta pública', async () => {
  const { base, fechar } = await subir({ armazem: criarArmazemArquivo(pastaTemp()) });
  try {
    assert.equal((await put(base, { baseRev: 0, data: { nada: 1 } })).status, 400);
    assert.equal((await fetch(base + '/..%2fserver.js')).status, 403);
    const pagina = await fetch(base + '/');
    assert.equal(pagina.status, 200);
    assert.match(pagina.headers.get('content-type'), /text\/html/);
  } finally {
    await fechar();
  }
});

test('com CRM_SENHA: dados só depois de entrar', async () => {
  const { base, fechar } = await subir({ armazem: criarArmazemArquivo(pastaTemp()), senha: 'segredo-forte' });
  try {
    assert.equal((await fetch(base + '/api/db')).status, 401);
    assert.equal((await put(base, { baseRev: 0, data: { contatos: [] } })).status, 401);
    assert.deepEqual(await (await fetch(base + '/api/sessao')).json(), { protegido: true, logado: false });

    const errada = await fetch(base + '/api/sessao', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"senha":"chute"}' });
    assert.equal(errada.status, 401);
    assert.equal(errada.headers.get('set-cookie'), null);

    const certa = await fetch(base + '/api/sessao', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"senha":"segredo-forte"}' });
    assert.equal(certa.status, 200);
    const setCookie = certa.headers.get('set-cookie');
    assert.match(setCookie, /HttpOnly/);
    assert.match(setCookie, /SameSite=Strict/);
    const cookie = setCookie.split(';')[0];

    const r = await fetch(base + '/api/db', { headers: { cookie } });
    assert.equal(r.status, 200);
    assert.equal((await r.json()).protegido, true);
    assert.equal((await fetch(base + '/api/db', { headers: { cookie: 'crm_sessao=forjado' } })).status, 401);

    const saida = await fetch(base + '/api/sessao', { method: 'DELETE', headers: { cookie } });
    assert.match(saida.headers.get('set-cookie'), /Max-Age=0/);
  } finally {
    await fechar();
  }
});

test('configuração: na Vercel exige planilha e senha', () => {
  let c = configurar({ VERCEL: '1' });
  assert.match(c.indisponivel, /GOOGLE_SHEETS_URL/);
  c = configurar({ VERCEL: '1', GOOGLE_SHEETS_URL: 'https://x/exec', GOOGLE_SHEETS_TOKEN: 't' });
  assert.match(c.indisponivel, /CRM_SENHA/, 'sem senha na Vercel os contatos ficariam públicos');
  c = configurar({ VERCEL: '1', GOOGLE_SHEETS_URL: 'https://x/exec', GOOGLE_SHEETS_TOKEN: 't', CRM_SENHA: 's' });
  assert.equal(c.indisponivel, '');
  assert.equal(c.seguro, true);
  c = configurar({ GOOGLE_SHEETS_URL: 'https://x/exec' });
  assert.match(c.indisponivel, /GOOGLE_SHEETS_TOKEN/);
  c = configurar({ CRM_DADOS: pastaTemp() });
  assert.equal(c.indisponivel, '');
  assert.equal(c.senha, '', 'no computador a senha é opcional');
});

test('Vercel sem configuração responde 503 explicando o que falta', async () => {
  const { base, fechar } = await subir(configurar({ VERCEL: '1' }));
  try {
    const r = await fetch(base + '/api/db');
    assert.equal(r.status, 503);
    assert.match((await r.json()).erro, /GOOGLE_SHEETS_URL/);
  } finally {
    await fechar();
  }
});
