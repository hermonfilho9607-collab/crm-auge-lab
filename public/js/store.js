// Estado em memória + gravação automática no servidor (planilha Google ou dados/crm.json).
import { migrar, bancoVazio } from './core.js';

let db = bancoVazio();
let rev = 0;
let fonte = null;
let protegido = false;
let timer = null;
let gravando = false;
let pendente = false;
let parado = false; // sessão expirada: espera o login para tentar de novo
const ouvintes = new Set();
const ouvintesStatus = new Set();
let status = { estado: 'carregando', msg: 'Carregando…' };

/** Erro de acesso: tipo = 'login' | 'config' | 'planilha' | 'servidor'. */
export class ErroAcesso extends Error {
  constructor(tipo, mensagem = '') {
    super(mensagem);
    this.tipo = tipo;
  }
}

function setStatus(estado, msg) {
  status = { estado, msg };
  ouvintesStatus.forEach((f) => f(status));
}

export function obter() {
  return db;
}
export function fonteDados() {
  return fonte;
}
export function exigeSenha() {
  return protegido;
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

async function corpoErro(r) {
  try { return (await r.json()).erro || ''; } catch { return ''; }
}

export async function carregar() {
  let r;
  try {
    r = await fetch('/api/db', { cache: 'no-store' });
  } catch {
    throw new ErroAcesso('servidor');
  }
  if (r.status === 401) throw new ErroAcesso('login');
  if (r.status === 503) throw new ErroAcesso('config', await corpoErro(r));
  if (r.status === 502) throw new ErroAcesso('planilha', await corpoErro(r));
  if (!r.ok) throw new ErroAcesso('servidor', await corpoErro(r));
  const corpo = await r.json();
  rev = corpo.rev;
  fonte = corpo.fonte || null;
  protegido = !!corpo.protegido;
  db = migrar(corpo.data);
  setStatus('ok', fonte?.tipo === 'planilha' ? 'Sincronizado com a planilha' : 'Tudo salvo');
  return db;
}

export async function entrar(senha) {
  const r = await fetch('/api/sessao', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ senha }),
  });
  if (r.ok) return { ok: true };
  return { ok: false, erro: (await corpoErro(r)) || 'Não foi possível entrar.' };
}

export async function sair() {
  await fetch('/api/sessao', { method: 'DELETE' });
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

/** Depois de entrar de novo com a senha, grava o que ficou pendente. */
export function retomar() {
  parado = false;
  if (pendente) agendar(0);
  else setStatus('ok', 'Tudo salvo');
}

function agendar(ms = 400) {
  pendente = true;
  if (parado) return;
  setStatus('salvando', 'Salvando…');
  clearTimeout(timer);
  timer = setTimeout(gravar, ms);
}

async function gravar() {
  if (parado) return;
  if (gravando) { timer = setTimeout(gravar, 200); return; }
  gravando = true;
  pendente = false;
  try {
    const corpo = JSON.stringify({ baseRev: rev, data: db });
    const r = await fetch('/api/db', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: corpo,
      // keepalive deixa terminar a gravação ao fechar a aba, mas só aceita corpos de até 64 KB
      keepalive: corpo.length < 60000,
    });
    if (r.status === 409) {
      setStatus('conflito', 'Alterado em outro lugar');
      document.dispatchEvent(new CustomEvent('crm:conflito'));
      return;
    }
    if (r.status === 401) {
      pendente = true;
      parado = true;
      setStatus('erro', 'Sessão expirada — entre de novo');
      document.dispatchEvent(new CustomEvent('crm:login'));
      return;
    }
    if (!r.ok) {
      const msg = await corpoErro(r);
      throw new Error(msg);
    }
    rev = (await r.json()).rev;
    if (!pendente) setStatus('ok', fonte?.tipo === 'planilha' ? 'Sincronizado com a planilha' : 'Tudo salvo');
  } catch (e) {
    pendente = true;
    setStatus('erro', e.message ? `Não salvou: ${e.message} Tentando de novo…` : 'Sem conexão com o servidor — tentando de novo');
    clearTimeout(timer);
    timer = setTimeout(gravar, 5000);
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
