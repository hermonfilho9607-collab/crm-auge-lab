import test from 'node:test';
import assert from 'node:assert/strict';
import {
  novoContato, mudarEstagio, registrarInteracao, removerInteracao, situacaoFollowUp, parado, metricas, funil,
  atividadePorSemana, filtrar, ordenar, combina, parseCSV, importarLinhas, exportarCSV, linkWhatsApp, linkInstagram,
  paraNumero, migrar, diaISO, somarDias, diasEntre, formatarRelativo,
} from '../public/js/core.js';

const D = (s) => new Date(s);

test('novo contato começa como Novo lead com histórico de criação', () => {
  const c = novoContato({ empresa: 'Padaria X' }, D('2026-09-01T10:00:00'));
  assert.equal(c.estagio, 'novo');
  assert.equal(c.historico.length, 1);
  assert.equal(c.historico[0].tipo, 'criado');
  assert.deepEqual(c.estagios.map((e) => e.estagio), ['novo']);
});

test('mudar estágio registra na linha do tempo e limpa próximo passo ao encerrar', () => {
  const c = novoContato({ empresa: 'A', proximaAcao: { texto: 'ligar', data: '2026-09-10' } });
  assert.equal(mudarEstagio(c, 'contato'), true);
  assert.equal(mudarEstagio(c, 'contato'), false, 'mesmo estágio não gera evento');
  mudarEstagio(c, 'perdido', { motivo: 'Sem orçamento' });
  assert.equal(c.motivoPerda, 'Sem orçamento');
  assert.deepEqual(c.proximaAcao, { texto: '', data: '' });
  const ev = c.historico.filter((h) => h.tipo === 'estagio');
  assert.deepEqual(ev.map((e) => [e.de, e.para]), [['novo', 'contato'], ['contato', 'perdido']]);
  mudarEstagio(c, 'conversa');
  assert.equal(c.motivoPerda, '', 'reabrir limpa o motivo');
});

test('interações atualizam último contato; anotações não', () => {
  const c = novoContato({ empresa: 'A' });
  registrarInteracao(c, { tipo: 'nota', texto: 'pensar' });
  assert.equal(c.ultimoContato, '');
  const a = registrarInteracao(c, { tipo: 'whatsapp', em: D('2026-09-05T10:00:00'), texto: 'oi' });
  registrarInteracao(c, { tipo: 'ligacao', em: D('2026-09-03T10:00:00') });
  assert.equal(c.ultimoContato, D('2026-09-05T10:00:00').toISOString());
  removerInteracao(c, a.id);
  assert.equal(c.ultimoContato, D('2026-09-03T10:00:00').toISOString());
  assert.equal(removerInteracao(c, c.historico[0].id), false, 'o registro de criação não pode ser apagado');
});

test('situação do follow-up', () => {
  const hoje = '2026-09-28';
  const c = (data, estagio = 'contato') => ({ estagio, proximaAcao: { texto: '', data } });
  assert.equal(situacaoFollowUp(c('2026-09-27'), hoje), 'atrasado');
  assert.equal(situacaoFollowUp(c('2026-09-28'), hoje), 'hoje');
  assert.equal(situacaoFollowUp(c('2026-10-05'), hoje), 'semana');
  assert.equal(situacaoFollowUp(c('2026-10-06'), hoje), 'depois');
  assert.equal(situacaoFollowUp(c(''), hoje), 'sem');
  assert.equal(situacaoFollowUp(c('2026-09-01', 'ganho'), hoje), 'encerrado');
});

test('parado: ativo, já abordado e sem contato há 14+ dias', () => {
  const agora = D('2026-09-28T12:00:00');
  const c = novoContato({ empresa: 'A' }, D('2026-09-01T10:00:00'));
  assert.equal(parado(c, agora), false, 'novo lead não conta como parado');
  mudarEstagio(c, 'contato', { agora: D('2026-09-02T10:00:00') });
  registrarInteracao(c, { tipo: 'whatsapp', em: D('2026-09-14T10:00:00') });
  assert.equal(parado(c, agora), true);
  registrarInteracao(c, { tipo: 'whatsapp', em: D('2026-09-20T10:00:00') });
  assert.equal(parado(c, agora), false);
});

test('métricas, funil e conversão', () => {
  const agora = D('2026-09-28T12:00:00');
  const a = novoContato({ empresa: 'A', valor: 1000 }, D('2026-09-02T10:00:00'));
  const b = novoContato({ empresa: 'B', valor: 3000 }, D('2026-09-02T10:00:00'));
  const c = novoContato({ empresa: 'C', valor: 500, proximaAcao: { texto: 'x', data: '2026-09-20' } }, D('2026-08-02T10:00:00'));
  mudarEstagio(a, 'contato', { agora: D('2026-09-03T10:00:00') });
  mudarEstagio(a, 'proposta', { agora: D('2026-09-10T10:00:00') });
  mudarEstagio(b, 'contato', { agora: D('2026-09-03T10:00:00') });
  mudarEstagio(b, 'ganho', { agora: D('2026-09-15T10:00:00') });
  mudarEstagio(c, 'perdido', { motivo: 'Sem interesse', agora: D('2026-08-15T10:00:00') });
  const m = metricas([a, b, c], agora);
  assert.equal(m.ativos, 1);
  assert.equal(m.pipeline, 1000);
  assert.equal(m.emProposta, 1);
  assert.equal(m.ganhosMes, 1);
  assert.equal(m.receitaMes, 3000);
  assert.equal(m.conversao, 0.5);
  assert.equal(m.novosMes, 2);
  const f = Object.fromEntries(funil([a, b, c]).map((e) => [e.id, e.chegaram]));
  assert.equal(f.novo, 3);
  assert.equal(f.contato, 2);
  assert.equal(f.proposta, 2, 'fechado passa por proposta no caminho');
  assert.equal(f.ganho, 1);
});

test('atividade por semana conta interações reais nas semanas certas', () => {
  const agora = D('2026-09-30T12:00:00'); // quarta
  const c = novoContato({ empresa: 'A' });
  registrarInteracao(c, { tipo: 'whatsapp', em: D('2026-09-28T09:00:00') }); // segunda desta semana
  registrarInteracao(c, { tipo: 'ligacao', em: D('2026-09-27T09:00:00') }); // domingo anterior
  registrarInteracao(c, { tipo: 'nota', em: D('2026-09-29T09:00:00') });
  registrarInteracao(c, { tipo: 'email', em: D('2026-06-01T09:00:00') }); // fora da janela
  const s = atividadePorSemana([c], agora, 4);
  assert.equal(s.length, 4);
  assert.equal(s[3].inicio, '2026-09-28');
  assert.equal(s[3].total, 1);
  assert.equal(s[2].total, 1);
  assert.equal(s[0].total + s[1].total, 0);
});

test('busca ignora acentos e acha por telefone', () => {
  const c = novoContato({ empresa: 'Ótica Visão', cidade: 'Jundiaí', telefone: '(11) 98888-1234' });
  assert.ok(combina(c, 'otica jundiai'));
  assert.ok(combina(c, '98888'));
  assert.ok(!combina(c, 'padaria'));
});

test('filtrar e ordenar', () => {
  const a = novoContato({ empresa: 'Beta', temperatura: 'fria', proximaAcao: { texto: '', data: '2026-10-01' } });
  const b = novoContato({ empresa: 'alfa', temperatura: 'quente', proximaAcao: { texto: '', data: '2026-09-01' } });
  const c = novoContato({ empresa: 'Gama' });
  mudarEstagio(c, 'ganho');
  assert.deepEqual(filtrar([a, b, c], { estagio: 'ativos' }).map((x) => x.empresa), ['Beta', 'alfa']);
  assert.deepEqual(filtrar([a, b, c], { temperatura: 'quente' }).map((x) => x.empresa), ['alfa']);
  assert.deepEqual(ordenar([a, b, c], 'proximaAcao').map((x) => x.empresa), ['alfa', 'Beta', 'Gama']);
  assert.deepEqual(ordenar([a, b, c], 'empresa').map((x) => x.empresa), ['alfa', 'Beta', 'Gama']);
});

test('parseCSV: ponto e vírgula, aspas, quebras de linha e BOM', () => {
  const t = '﻿Empresa;Notas\r\n"Padaria; Pão";"linha 1\nlinha ""2"""\r\nOutra;\r\n\r\n';
  assert.deepEqual(parseCSV(t), [['Empresa', 'Notas'], ['Padaria; Pão', 'linha 1\nlinha "2"'], ['Outra', '']]);
  assert.deepEqual(parseCSV('a,b\n1,2'), [['a', 'b'], ['1', '2']]);
});

test('importar: mapeia cabeçalhos em português e pula duplicados', () => {
  const existente = novoContato({ empresa: 'Já Tenho', telefone: '(19) 99999-0000' });
  const linhas = parseCSV([
    'Nome da empresa;Responsável;WhatsApp;Cidade;Categoria;Coluna estranha',
    'Pet Feliz;Ana;(19) 98888-7777;Campinas;Pet shop;x',
    'Outro Nome;;19999990000;Campinas;;', // mesmo telefone do existente
    'Pet Feliz;;;Campinas;;', // mesmo nome+cidade da linha 1
    ';;;;;',
    ';;;Valinhos;;',
  ].join('\n'));
  const r = importarLinhas(linhas, [existente], { origem: 'Google Maps' });
  assert.equal(r.novos.length, 1);
  assert.equal(r.duplicados, 2);
  assert.equal(r.semNome, 1);
  const [n] = r.novos;
  assert.equal(n.empresa, 'Pet Feliz');
  assert.equal(n.pessoa, 'Ana');
  assert.equal(n.segmento, 'Pet shop');
  assert.equal(n.origem, 'Google Maps');
  assert.equal(r.colunas.find((c) => c.cabecalho === 'Coluna estranha').campo, null);
});

test('exportar CSV com BOM, ponto e vírgula e aspas', () => {
  const c = novoContato({ empresa: 'A; B', notas: 'diz "oi"', valor: 1500.5 });
  const csv = exportarCSV([c]);
  assert.ok(csv.startsWith('﻿Empresa;'));
  assert.ok(csv.includes('"A; B"'));
  assert.ok(csv.includes('"diz ""oi"""'));
  assert.ok(csv.includes(';1500,50;'));
  // ida e volta
  const r = importarLinhas(parseCSV(csv), []);
  assert.equal(r.novos[0].empresa, 'A; B');
});

test('links rápidos', () => {
  assert.equal(linkWhatsApp('(19) 99999-0101'), 'https://wa.me/5519999990101');
  assert.equal(linkWhatsApp('+55 19 99999-0101'), 'https://wa.me/5519999990101');
  assert.equal(linkWhatsApp(''), '');
  assert.equal(linkInstagram('@loja.x'), 'https://instagram.com/loja.x');
  assert.equal(linkInstagram('https://www.instagram.com/loja.x/'), 'https://instagram.com/loja.x');
});

test('números em formato brasileiro', () => {
  assert.equal(paraNumero('R$ 1.500,50'), 1500.5);
  assert.equal(paraNumero('2500'), 2500);
  assert.equal(paraNumero('abc'), 0);
});

test('migrar completa campos faltantes sem perder dados', () => {
  const db = migrar({ contatos: [{ id: 'x', empresa: 'Velha', estagio: 'inexistente', criadoEm: '2026-01-01T00:00:00.000Z' }] });
  const [c] = db.contatos;
  assert.equal(c.id, 'x');
  assert.equal(c.empresa, 'Velha');
  assert.equal(c.estagio, 'novo');
  assert.deepEqual(c.proximaAcao, { texto: '', data: '' });
  assert.ok(Array.isArray(c.historico) && Array.isArray(c.estagios));
  assert.equal(db.ajustes.metaContatosSemana, 30);
});

test('datas locais', () => {
  assert.equal(somarDias('2026-02-27', 2), '2026-03-01');
  assert.equal(diasEntre(D('2026-09-01T23:00:00'), D('2026-09-02T01:00:00')), 1);
  assert.equal(diaISO(D('2026-09-28T23:59:00')), '2026-09-28');
  const agora = D('2026-09-28T12:00:00');
  assert.equal(formatarRelativo('2026-09-28', agora), 'hoje');
  assert.equal(formatarRelativo('2026-09-29', agora), 'amanhã');
  assert.equal(formatarRelativo('2026-09-25', agora), 'há 3 dias');
});
