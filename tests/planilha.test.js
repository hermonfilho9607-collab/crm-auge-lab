import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { paraAbas, deAbas, lerDataHora, lerDia } from '../lib/planilha.js';
import { criarArmazemPlanilha } from '../lib/armazem-planilha.js';
import { criarServidor } from '../server.js';
import { novoContato, mudarEstagio, registrarInteracao, bancoVazio, paraNumero } from '../public/js/core.js';

const D = (s) => new Date(s);

function bancoExemplo() {
  const db = bancoVazio();
  const a = novoContato({
    empresa: 'Clínica Sorriso', pessoa: 'Dra. Renata', telefone: '(19) 99999-0101', segmento: 'Odontologia', cidade: 'Campinas',
    temperatura: 'quente', valor: 4800.5, tags: ['indicação', 'vip'], situacaoSite: 'ruim', notas: 'linha 1\nlinha 2; com "aspas"',
    proximaAcao: { texto: 'Enviar proposta', data: '2026-10-10' },
  }, D('2026-09-01T10:00:00Z'));
  registrarInteracao(a, { tipo: 'whatsapp', em: D('2026-09-02T10:00:00Z'), texto: 'Primeira mensagem' }, D('2026-09-02T10:00:00Z'));
  mudarEstagio(a, 'contato', { agora: D('2026-09-02T10:05:00Z') });
  mudarEstagio(a, 'proposta', { agora: D('2026-09-05T10:00:00Z') });
  const b = novoContato({ empresa: '=SOMA(1;2)', demo: true }, D('2026-09-03T10:00:00Z'));
  mudarEstagio(b, 'perdido', { motivo: 'Sem orçamento', agora: D('2026-09-04T10:00:00Z') });
  db.contatos.push(a, b);
  db.ajustes.metaContatosSemana = 25;
  return db;
}

test('banco → planilha → banco preserva contatos, histórico e evolução', () => {
  const db = bancoExemplo();
  const abas = paraAbas(db);
  assert.deepEqual(Object.keys(abas), ['Contatos', 'Historico', 'Ajustes']);
  assert.equal(abas.Contatos[0][0], 'ID');
  assert.ok(abas.Contatos[0].includes('Estágio'));
  assert.ok(abas.Contatos[1].includes('Proposta enviada'), 'estágio legível na planilha');
  assert.ok(abas.Contatos[1].includes('Quente'));
  assert.ok(abas.Contatos[1].includes('4800,5'));
  assert.ok(abas.Historico.slice(1).some((l) => l.includes('Mudança de estágio') && l.includes('Primeiro contato')));
  for (const linha of [...abas.Contatos, ...abas.Historico]) for (const v of linha) assert.equal(typeof v, 'string');

  const volta = deAbas(abas);
  const [a, b] = volta.contatos;
  const [oa, ob] = db.contatos;
  for (const k of ['id', 'empresa', 'pessoa', 'telefone', 'segmento', 'cidade', 'temperatura', 'valor', 'situacaoSite', 'notas', 'estagio', 'criadoEm', 'estagioDesde', 'ultimoContato']) {
    assert.deepEqual(a[k], oa[k], k);
  }
  assert.deepEqual(a.tags, oa.tags);
  assert.deepEqual(a.proximaAcao, oa.proximaAcao);
  assert.equal(a.historico.length, oa.historico.length);
  assert.deepEqual(a.estagios.map((e) => e.estagio), ['novo', 'contato', 'proposta']);
  assert.equal(b.empresa, '=SOMA(1;2)');
  assert.equal(b.estagio, 'perdido');
  assert.equal(b.motivoPerda, 'Sem orçamento');
  assert.equal(b.demo, true);
  assert.equal(a.demo, undefined);
  assert.equal(volta.ajustes.metaContatosSemana, 25);
});

test('linhas digitadas à mão na planilha viram contatos', () => {
  const abas = {
    Contatos: [
      ['Empresa', 'Telefone', 'Estágio', 'Temperatura', 'Valor', 'Data do próximo passo', 'Próximo passo', 'Criado em'],
      ['Padaria Nova', '(11) 98888-0000', 'em conversa', 'fria', 'R$ 1.500,00', '15/10/2026', 'Ligar', '01/10/2026 14:30'],
      ['', '', '', '', '', '', '', ''],
      ['Sem estágio', '', '', '', '1.500', '', '', ''],
    ],
  };
  const db = deAbas(abas);
  assert.equal(db.contatos.length, 2);
  const [p, s] = db.contatos;
  assert.ok(p.id, 'recebe um ID');
  assert.equal(p.estagio, 'conversa');
  assert.equal(p.temperatura, 'fria');
  assert.equal(p.valor, 1500);
  assert.deepEqual(p.proximaAcao, { texto: 'Ligar', data: '2026-10-15' });
  assert.equal(p.criadoEm, new Date(2026, 9, 1, 14, 30).toISOString());
  assert.equal(p.historico[0].tipo, 'criado');
  assert.equal(s.estagio, 'novo');
  assert.equal(s.valor, 1500);
  assert.equal(db.ajustes.metaContatosSemana, 30, 'ajuste padrão quando a aba não existe');
});

test('planilha vazia vira banco vazio', () => {
  const db = deAbas({ Contatos: [], Historico: [], Ajustes: [] });
  assert.deepEqual(db.contatos, []);
});

test('datas e números no formato brasileiro', () => {
  assert.equal(lerDia('07/10/2026'), '2026-10-07');
  assert.equal(lerDia('2026-10-07'), '2026-10-07');
  assert.equal(lerDia(''), '');
  assert.equal(lerDataHora('2026-10-07T12:00:00.000Z'), '2026-10-07T12:00:00.000Z');
  assert.equal(lerDataHora('lixo'), '');
  assert.equal(paraNumero('1.500'), 1500);
  assert.equal(paraNumero('2.500.000'), 2500000);
  assert.equal(paraNumero('1500,50'), 1500.5);
  assert.equal(paraNumero('12.5'), 12.5);
});

// ---------- Apps Script falso, com o mesmo comportamento do Google ----------
// POST no /exec responde 302 para uma URL de "eco"; o cliente segue com GET e lê o JSON lá.
function appsScriptFalso(token) {
  const estado = { rev: 0, abas: { Contatos: [], Historico: [], Ajustes: [] }, chamadas: 0 };
  let pendente = null;
  const srv = http.createServer((req, res) => {
    const enviar = (obj) => { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
    if (req.method === 'POST' && req.url === '/exec') {
      let corpo = '';
      req.on('data', (c) => { corpo += c; });
      req.on('end', () => {
        estado.chamadas++;
        const p = JSON.parse(corpo);
        if (p.token !== token) pendente = { erro: 'Token inválido.' };
        else if (p.acao === 'ler') pendente = { rev: estado.rev, abas: estado.abas, planilhaUrl: 'https://docs.google.com/spreadsheets/d/x', planilhaNome: 'CRM Auge Lab' };
        else if (p.acao === 'gravar') {
          if (Number(p.baseRev) !== estado.rev) pendente = { conflito: true, rev: estado.rev, abas: estado.abas };
          else { estado.abas = p.abas; estado.rev++; pendente = { rev: estado.rev }; }
        }
        res.writeHead(302, { Location: '/echo' });
        res.end();
      });
      return;
    }
    if (req.method === 'GET' && req.url === '/echo') return enviar(pendente);
    if (req.url === '/html') { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end('<html>Faça login</html>'); }
    res.writeHead(404); res.end();
  });
  return new Promise((r) => srv.listen(0, '127.0.0.1', () => r({
    estado,
    url: `http://127.0.0.1:${srv.address().port}`,
    fechar: () => new Promise((f) => { srv.close(f); srv.closeAllConnections(); }),
  })));
}

test('armazém da planilha: lê, grava, detecta edição concorrente e erros', async () => {
  const g = await appsScriptFalso('tok');
  try {
    const armazem = criarArmazemPlanilha({ url: g.url + '/exec', token: 'tok' });
    let r = await armazem.ler();
    assert.equal(r.rev, 0);
    assert.deepEqual(r.data.contatos, []);
    assert.deepEqual(r.fonte, { tipo: 'planilha', url: 'https://docs.google.com/spreadsheets/d/x', nome: 'CRM Auge Lab' });

    const db = bancoExemplo();
    r = await armazem.gravar(0, db);
    assert.deepEqual(r, { conflito: false, rev: 1 });
    assert.equal(g.estado.abas.Contatos.length, 3, 'cabeçalho + 2 contatos');

    // alguém editou a planilha à mão (o onEdit sobe a revisão)
    g.estado.rev = 2;
    r = await armazem.gravar(1, db);
    assert.equal(r.conflito, true);
    assert.equal(r.rev, 2);
    assert.equal(r.data.contatos.length, 2);

    const lido = await armazem.ler();
    assert.equal(lido.data.contatos[0].empresa, 'Clínica Sorriso');

    await assert.rejects(criarArmazemPlanilha({ url: g.url + '/exec', token: 'errado' }).ler(), /Token inválido/);
    await assert.rejects(criarArmazemPlanilha({ url: g.url + '/html', token: 'tok' }).ler(), /não respondeu como esperado/);
    await assert.rejects(criarArmazemPlanilha({ url: 'http://127.0.0.1:1/exec', token: 'tok' }).ler(), /Não consegui falar/);
  } finally {
    await g.fechar();
  }
});

test('ponta a ponta: CRM ↔ servidor ↔ planilha (com senha)', async () => {
  const g = await appsScriptFalso('tok');
  const servidor = criarServidor({ armazem: criarArmazemPlanilha({ url: g.url + '/exec', token: 'tok' }), senha: 's3nha' });
  await new Promise((r) => servidor.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${servidor.address().port}`;
  try {
    const login = await fetch(base + '/api/sessao', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"senha":"s3nha"}' });
    const cookie = login.headers.get('set-cookie').split(';')[0];
    const db = bancoExemplo();
    const gravou = await fetch(base + '/api/db', { method: 'PUT', headers: { 'Content-Type': 'application/json', cookie }, body: JSON.stringify({ baseRev: 0, data: db }) });
    assert.equal(gravou.status, 200);
    const lido = await (await fetch(base + '/api/db', { headers: { cookie } })).json();
    assert.equal(lido.rev, 1);
    assert.equal(lido.fonte.tipo, 'planilha');
    assert.equal(lido.data.contatos.length, 2);
    assert.equal(lido.data.contatos[0].estagio, 'proposta');

    await g.fechar();
    const fora = await fetch(base + '/api/db', { headers: { cookie } });
    assert.equal(fora.status, 502, 'planilha fora do ar vira 502 com mensagem clara');
    assert.match((await fora.json()).erro, /planilha/i);
  } finally {
    servidor.close();
    servidor.closeAllConnections();
  }
});
