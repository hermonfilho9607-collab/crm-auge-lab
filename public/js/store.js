// Estado em memória + gravação automática no servidor local (dados/crm.json).
import { migrar, bancoVazio } from './core.js';

let db = bancoVazio();
let rev = 0;
let timer = null;
let gravando = false;
let pendente = false;
const ouvintes = new Set();
const ouvintesStatus = new Set();
let status = { estado: 'carregando', msg: 'Carregando…' };

function setStatus(estado, msg) {
  status = { estado, msg };
  ouvintesStatus.forEach((f) => f(status));
}

export function obter() {
  return db;
}
export function statusAtual() {
  return status;
}
export function aoMudar(f) {
  ouvintes.add(f);
  return () => ouvintes.delete(f);
}
export function aoStatus(f) {
  ouvintesStatus.add(f);
  f(status);
  return () => ouvintesStatus.delete(f);
}

export async function carregar() {
  const r = await fetch('/api/db', { cache: 'no-store' });
  if (!r.ok) throw new Error('Servidor não respondeu');
  const corpo = await r.json();
  rev = corpo.rev;
  db = migrar(corpo.data);
  setStatus('ok', corpo.salvoEm ? 'Tudo salvo' : 'Pronto');
  return db;
}

/** Aplica uma mudança e agenda a gravação. */
export function alterar(fn) {
  fn(db);
  ouvintes.forEach((f) => f(db));
  agendar();
}

export function substituir(novo) {
  db = migrar(novo);
  ouvintes.forEach((f) => f(db));
  document.dispatchEvent(new CustomEvent('crm:substituido'));
  agendar(0);
}

function agendar(ms = 400) {
  pendente = true;
  setStatus('salvando', 'Salvando…');
  clearTimeout(timer);
  timer = setTimeout(gravar, ms);
}

async function gravar() {
  if (gravando) { timer = setTimeout(gravar, 200); return; }
  gravando = true;
  pendente = false;
  try {
    const r = await fetch('/api/db', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ baseRev: rev, data: db }),
      keepalive: true,
    });
    if (r.status === 409) {
      setStatus('conflito', 'Alterado em outra aba');
      document.dispatchEvent(new CustomEvent('crm:conflito'));
      return;
    }
    if (!r.ok) throw new Error('HTTP ' + r.status);
    rev = (await r.json()).rev;
    if (!pendente) setStatus('ok', 'Tudo salvo');
  } catch {
    pendente = true;
    setStatus('erro', 'Sem conexão com o servidor — tentando de novo');
    clearTimeout(timer);
    timer = setTimeout(gravar, 3000);
  } finally {
    gravando = false;
  }
}

export function temPendencia() {
  return pendente || gravando;
}

window.addEventListener('beforeunload', (e) => {
  if (temPendencia()) {
    clearTimeout(timer);
    gravar();
    e.preventDefault();
  }
});
