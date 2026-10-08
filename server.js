// CRM Auge Lab — servidor local, sem dependências (Node 20+).
// Serve a interface em public/ e a API em /api/*. Os dados vão para a planilha Google configurada no .env
// (GOOGLE_SHEETS_URL e GOOGLE_SHEETS_TOKEN) ou, sem planilha, para dados/crm.json.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { exec } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tratarApi } from './lib/api.js';
import { configurar } from './lib/config.js';

const RAIZ = path.dirname(fileURLToPath(import.meta.url));
const PUBLICO = path.join(RAIZ, 'public');

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

function json(res, status, corpo) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(corpo));
}

export function criarServidor(cfg) {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    try {
      if (url.pathname.startsWith('/api/')) return await tratarApi(req, res, cfg);
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
  const arquivoEnv = path.join(RAIZ, '.env');
  if (fs.existsSync(arquivoEnv)) process.loadEnvFile(arquivoEnv);
  const PORTA = Number(process.env.PORTA || 5182);
  const cfg = configurar(process.env, { raiz: RAIZ });
  const servidor = criarServidor(cfg);
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
    if (cfg.indisponivel) console.log(`ATENÇÃO: ${cfg.indisponivel}`);
    else console.log(`Dados: ${process.env.GOOGLE_SHEETS_URL ? 'planilha Google (configurada no .env)' : cfg.armazem.fonte.arquivo}`);
    if (cfg.senha) console.log('Protegido por senha (CRM_SENHA).');
    console.log('Deixe esta janela aberta enquanto usa o CRM. Para encerrar: Ctrl+C ou feche a janela.');
    if (!process.argv.includes('--sem-navegador')) abrir(endereco);
  });
}

function abrir(url) {
  const cmd = process.platform === 'win32' ? `start "" "${url}"` : process.platform === 'darwin' ? `open "${url}"` : `xdg-open "${url}"`;
  exec(cmd);
}
