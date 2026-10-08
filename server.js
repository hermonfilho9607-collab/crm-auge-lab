// CRM Auge Lab — servidor local, sem dependências (Node 20+).
// Serve a interface em public/ e guarda os dados em dados/crm.json, com backup diário em dados/backups/.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { exec } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const RAIZ = path.dirname(fileURLToPath(import.meta.url));
const PUBLICO = path.join(RAIZ, 'public');
const PORTA = Number(process.env.PORTA || 5182);
const MANTER_BACKUPS = 30;

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
};

export function criarArmazem(pastaDados) {
  const arquivo = path.join(pastaDados, 'crm.json');
  const pastaBackups = path.join(pastaDados, 'backups');
  fs.mkdirSync(pastaBackups, { recursive: true });

  function ler() {
    if (!fs.existsSync(arquivo)) return { rev: 0, data: null };
    return JSON.parse(fs.readFileSync(arquivo, 'utf8'));
  }

  function backupDoDia() {
    if (!fs.existsSync(arquivo)) return;
    const d = new Date();
    const dia = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const destino = path.join(pastaBackups, `crm-${dia}.json`);
    if (!fs.existsSync(destino)) fs.copyFileSync(arquivo, destino);
    const antigos = fs.readdirSync(pastaBackups).filter((f) => /^crm-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
    for (const f of antigos.slice(0, Math.max(0, antigos.length - MANTER_BACKUPS))) {
      fs.unlinkSync(path.join(pastaBackups, f));
    }
  }

  function gravar(baseRev, data) {
    const atual = ler();
    if (baseRev !== atual.rev) return { conflito: true, ...atual };
    backupDoDia();
    const novo = { rev: atual.rev + 1, salvoEm: new Date().toISOString(), data };
    const tmp = arquivo + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(novo));
    fs.renameSync(tmp, arquivo);
    return { conflito: false, rev: novo.rev };
  }

  return { ler, gravar, arquivo, pastaBackups };
}

function lerCorpo(req, limite = 25 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
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
}

function json(res, status, corpo) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(corpo));
}

export function criarServidor(armazem) {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    try {
      if (url.pathname === '/api/db') {
        if (req.method === 'GET') return json(res, 200, armazem.ler());
        if (req.method === 'PUT') {
          const { baseRev, data } = JSON.parse(await lerCorpo(req));
          if (!data || typeof data !== 'object' || !Array.isArray(data.contatos)) {
            return json(res, 400, { erro: 'Formato inválido' });
          }
          const r = armazem.gravar(baseRev, data);
          return r.conflito ? json(res, 409, { rev: r.rev, data: r.data }) : json(res, 200, { rev: r.rev });
        }
        return json(res, 405, { erro: 'Método não permitido' });
      }
      if (url.pathname === '/api/info') {
        return json(res, 200, { arquivo: armazem.arquivo, backups: armazem.pastaBackups });
      }
      if (req.method !== 'GET' && req.method !== 'HEAD') return json(res, 405, { erro: 'Método não permitido' });

      const relativo = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
      const alvo = path.normalize(path.join(PUBLICO, relativo));
      if (!alvo.startsWith(PUBLICO + path.sep)) return json(res, 403, { erro: 'Proibido' });
      if (!fs.existsSync(alvo) || !fs.statSync(alvo).isFile()) return json(res, 404, { erro: 'Não encontrado' });
      res.writeHead(200, {
        'Content-Type': TIPOS[path.extname(alvo)] || 'application/octet-stream',
        'Cache-Control': 'no-cache',
      });
      fs.createReadStream(alvo).pipe(res);
    } catch (e) {
      json(res, 500, { erro: e.message });
    }
  });
}

const executadoDireto = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (executadoDireto) {
  const armazem = criarArmazem(process.env.CRM_DADOS || path.join(RAIZ, 'dados'));
  const servidor = criarServidor(armazem);
  servidor.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
      console.log(`O CRM já está aberto em http://localhost:${PORTA} — abrindo no navegador.`);
      if (!process.argv.includes('--sem-navegador')) abrir(`http://localhost:${PORTA}`);
      setTimeout(() => process.exit(0), 500);
    } else throw e;
  });
  servidor.listen(PORTA, '127.0.0.1', () => {
    const endereco = `http://localhost:${PORTA}`;
    console.log(`CRM Auge Lab rodando em ${endereco}`);
    console.log(`Dados: ${armazem.arquivo}`);
    console.log('Deixe esta janela aberta enquanto usa o CRM. Para encerrar: Ctrl+C ou feche a janela.');
    if (!process.argv.includes('--sem-navegador')) abrir(endereco);
  });
}

function abrir(url) {
  const cmd = process.platform === 'win32' ? `start "" "${url}"` : process.platform === 'darwin' ? `open "${url}"` : `xdg-open "${url}"`;
  exec(cmd);
}
