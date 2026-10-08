import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { criarArmazem, criarServidor } from '../server.js';

function preparar() {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'crm-teste-'));
  const armazem = criarArmazem(pasta);
  const servidor = criarServidor(armazem);
  return new Promise((resolve) => servidor.listen(0, '127.0.0.1', () => {
    const base = `http://127.0.0.1:${servidor.address().port}`;
    resolve({ pasta, base, fechar: () => new Promise((r) => { servidor.close(r); servidor.closeAllConnections(); }) });
  }));
}

const put = (base, corpo) => fetch(base + '/api/db', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) });

test('grava, lê e recusa revisão desatualizada', async () => {
  const { pasta, base, fechar } = await preparar();
  try {
    let r = await (await fetch(base + '/api/db')).json();
    assert.deepEqual(r, { rev: 0, data: null });

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
    assert.equal(JSON.parse(fs.readFileSync(path.join(pasta, 'backups', backups[0]), 'utf8')).rev, 1);
  } finally {
    await fechar();
  }
});

test('rejeita formato inválido e bloqueia saída da pasta pública', async () => {
  const { base, fechar } = await preparar();
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
