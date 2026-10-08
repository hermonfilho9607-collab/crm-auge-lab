// Contatos fictícios (marcados com demo: true) para explorar o CRM antes de usar de verdade.
import * as store from './store.js';
import { aviso, confirmar } from './ui.js';
import { novoContato, mudarEstagio, registrarInteracao, diaISO, somarDias } from './core.js';

function diasAtras(n, hora = 10) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hora, (n * 7) % 60, 0, 0);
  return d;
}

// [dias atrás, 'i' (interação) | 'e' (estágio), tipo|estágio, texto]
const ROTEIROS = [
  [{ empresa: 'Clínica Sorriso Pleno', pessoa: 'Dra. Renata Luz', cargo: 'Sócia', segmento: 'Odontologia', cidade: 'Campinas', telefone: '(19) 99999-0101', instagram: '@sorrisopleno.exemplo', origem: 'Indicação', temperatura: 'quente', valor: 4800, situacaoSite: 'ruim' }, 34,
    [[33, 'i', 'whatsapp', 'Apresentei a Auge Lab por indicação do Dr. Paulo.'], [33, 'e', 'contato'], [31, 'i', 'whatsapp', 'Respondeu, quer site novo com agendamento.'], [31, 'e', 'conversa'], [27, 'i', 'reuniao', 'Diagnóstico por vídeo: site lento, sem Google Meu Negócio.'], [27, 'e', 'reuniao'], [25, 'i', 'email', 'Proposta: site + GMN + 3 meses de gestão.'], [25, 'e', 'proposta'], [20, 'i', 'ligacao', 'Pediu parcelar em 3x.'], [20, 'e', 'negociacao'], [18, 'i', 'whatsapp', 'Aceitou em 3x. Contrato assinado.'], [18, 'e', 'ganho']], null],
  [{ empresa: 'Barbearia Navalha de Ouro', pessoa: 'Diego', segmento: 'Barbearia', cidade: 'São Paulo', telefone: '(11) 99999-0102', instagram: '@navalhadeouro.exemplo', origem: 'Instagram', temperatura: 'quente', valor: 2500, situacaoSite: 'nao' }, 16,
    [[15, 'i', 'instagram', 'Direct elogiando o trabalho e perguntando se usam agendamento online.'], [15, 'e', 'contato'], [12, 'i', 'instagram', 'Respondeu interessado, passou o WhatsApp.'], [12, 'e', 'conversa'], [8, 'i', 'reuniao', 'Visitei a barbearia. Querem site com agenda e vitrine de cortes.'], [8, 'e', 'reuniao'], [4, 'i', 'whatsapp', 'Enviei proposta em PDF.'], [4, 'e', 'proposta']], ['Cobrar retorno da proposta', 1]],
  [{ empresa: 'Ótica Visão Clara', pessoa: 'Sandra Moura', cargo: 'Gerente', segmento: 'Ótica', cidade: 'Jundiaí', telefone: '(11) 99999-0103', origem: 'Google Maps', temperatura: 'morna', valor: 1800, situacaoSite: 'ruim' }, 9,
    [[8, 'i', 'ligacao', 'Liguei na loja, falei com a gerente. Pediu para mandar exemplos.'], [8, 'e', 'contato'], [5, 'i', 'whatsapp', 'Mandei 3 cases de varejo. Ela gostou do da ótica de Sorocaba.'], [5, 'e', 'conversa']], ['Marcar visita para mostrar o protótipo', 0]],
  [{ empresa: 'Pet Shop Amigo Fiel', segmento: 'Pet shop', cidade: 'Campinas', telefone: '(19) 99999-0104', instagram: '@amigofiel.exemplo', origem: 'Google Maps', temperatura: 'morna', situacaoSite: 'nao' }, 7,
    [[6, 'i', 'whatsapp', 'Primeira mensagem com o diagnóstico do perfil no Google.'], [6, 'e', 'contato']], ['Mandar segunda mensagem (follow-up)', -2]],
  [{ empresa: 'Academia Movimento', pessoa: 'Carlos Brandão', cargo: 'Dono', segmento: 'Academia', cidade: 'Valinhos', telefone: '(19) 99999-0105', email: 'carlos@movimento.exemplo.com.br', origem: 'LinkedIn', temperatura: 'quente', valor: 3900, situacaoSite: 'ruim' }, 11,
    [[10, 'i', 'email', 'E-mail frio com análise do site atual.'], [10, 'e', 'contato'], [6, 'i', 'email', 'Respondeu: quer entender custo de landing page para matrículas.'], [6, 'e', 'conversa'], [2, 'i', 'ligacao', 'Agendamos reunião presencial.'], [2, 'e', 'reuniao']], ['Reunião de diagnóstico na academia', 2]],
  [{ empresa: 'Imobiliária Casa Nova', pessoa: 'Juliana Prado', cargo: 'Diretora comercial', segmento: 'Imobiliária', cidade: 'Campinas', telefone: '(19) 99999-0106', email: 'juliana@casanova.exemplo.com.br', site: 'casanova.exemplo.com.br', origem: 'Evento', temperatura: 'quente', valor: 7200, situacaoSite: 'ruim' }, 25,
    [[24, 'i', 'visita', 'Conheci no evento da ACIC, trocamos cartão.'], [24, 'e', 'contato'], [21, 'i', 'whatsapp', 'Pediu proposta de portal com busca de imóveis.'], [21, 'e', 'conversa'], [16, 'i', 'reuniao', 'Levantamento de requisitos com o time.'], [16, 'e', 'reuniao'], [10, 'i', 'email', 'Proposta enviada: portal + integração com o CRM deles.'], [10, 'e', 'proposta'], [3, 'i', 'ligacao', 'Querem reduzir escopo da fase 1 para caber no orçamento.'], [3, 'e', 'negociacao']], ['Enviar proposta revisada (fase 1 enxuta)', 1]],
  [{ empresa: 'Restaurante Sabor da Serra', segmento: 'Restaurante', cidade: 'Atibaia', telefone: '(11) 99999-0107', origem: 'Google Maps', temperatura: 'fria', valor: 1500, situacaoSite: 'nao' }, 30,
    [[29, 'i', 'whatsapp', 'Abordagem inicial.'], [29, 'e', 'contato'], [26, 'i', 'whatsapp', 'Respondeu, quer cardápio digital.'], [26, 'e', 'conversa'], [21, 'i', 'whatsapp', 'Achou caro, vai esperar a alta temporada.'], [21, 'e', 'perdido', 'Sem orçamento — retomar em dezembro']], null],
  [{ empresa: 'Estúdio Bella Pele', pessoa: 'Aline', segmento: 'Estética', cidade: 'São Paulo', instagram: '@bellapele.exemplo', origem: 'Instagram', temperatura: 'morna', situacaoSite: 'nao' }, 1, [], ['Primeira abordagem pelo Direct', 0]],
  [{ empresa: 'Auto Center Pista Livre', segmento: 'Oficina mecânica', cidade: 'Sumaré', telefone: '(19) 99999-0109', origem: 'Google Maps', temperatura: 'fria', situacaoSite: 'nao' }, 3, [], null],
  [{ empresa: 'Almeida Contabilidade', pessoa: 'Roberto Almeida', segmento: 'Contabilidade', cidade: 'Campinas', telefone: '(19) 99999-0110', email: 'roberto@almeida.exemplo.com.br', origem: 'Indicação', temperatura: 'morna', valor: 2800, situacaoSite: 'ruim' }, 28,
    [[27, 'i', 'ligacao', 'Indicação da Dra. Renata. Conversamos 10 min.'], [27, 'e', 'contato'], [22, 'i', 'email', 'Mandou lista do que quer no site novo.'], [22, 'e', 'conversa']], ['Enviar rascunho da estrutura do site', -12]],
  [{ empresa: 'Doceria Açúcar Mascavo', pessoa: 'Fernanda', segmento: 'Confeitaria', cidade: 'Indaiatuba', telefone: '(19) 99999-0111', instagram: '@acucarmascavo.exemplo', origem: 'Instagram', temperatura: 'morna', valor: 1200, situacaoSite: 'nao' }, 4,
    [[3, 'i', 'instagram', 'Comentei nos stories e mandei Direct sobre encomendas online.'], [3, 'e', 'contato']], ['Follow-up se não responder', 5]],
  [{ empresa: 'Fisio Ativa', pessoa: 'Dr. Marcelo Tanaka', segmento: 'Fisioterapia', cidade: 'Campinas', telefone: '(19) 99999-0112', origem: 'Site / formulário', temperatura: 'quente', valor: 3500, situacaoSite: 'ruim' }, 50,
    [[49, 'i', 'email', 'Chegou pelo formulário do site da Auge Lab.'], [49, 'e', 'conversa'], [45, 'i', 'reuniao', 'Reunião de escopo.'], [45, 'e', 'reuniao'], [43, 'i', 'email', 'Proposta enviada.'], [43, 'e', 'proposta'], [40, 'i', 'whatsapp', 'Fechado!'], [40, 'e', 'ganho']], null],
  [{ empresa: 'Floricultura Jardim Secreto', segmento: 'Floricultura', cidade: 'Valinhos', telefone: '(19) 99999-0113', origem: 'Google Maps', temperatura: 'fria', situacaoSite: 'nao' }, 40,
    [[39, 'i', 'whatsapp', 'Abordagem inicial.'], [39, 'e', 'contato'], [32, 'i', 'whatsapp', 'Follow-up 1.'], [24, 'i', 'ligacao', 'Não atendeu.'], [23, 'e', 'perdido', 'Nunca respondeu']], null],
  [{ empresa: 'Colégio Aprender Mais', pessoa: 'Patrícia Souza', cargo: 'Coordenadora', segmento: 'Educação', cidade: 'Hortolândia', telefone: '(19) 99999-0114', email: 'patricia@aprendermais.exemplo.com.br', origem: 'Indicação', temperatura: 'quente', valor: 9500, situacaoSite: 'ruim' }, 20,
    [[19, 'i', 'ligacao', 'Indicação de um pai de aluno.'], [19, 'e', 'contato'], [17, 'i', 'whatsapp', 'Querem site novo para a campanha de matrículas 2027.'], [17, 'e', 'conversa'], [13, 'i', 'reuniao', 'Reunião com a direção.'], [13, 'e', 'reuniao'], [8, 'i', 'email', 'Proposta com site + landing de matrículas + tráfego.'], [8, 'e', 'proposta']], ['Ligar para saber da decisão da direção', -1]],
];

export function gerarExemplos() {
  return ROTEIROS.map(([campos, criadoHa, eventos, proximo]) => {
    const c = novoContato({ ...campos, demo: true, tags: ['exemplo'] }, diasAtras(criadoHa, 9));
    for (const [n, tipo, valor, texto] of eventos) {
      if (tipo === 'i') registrarInteracao(c, { tipo: valor, em: diasAtras(n), texto }, diasAtras(n));
      else mudarEstagio(c, valor, { motivo: texto || '', agora: diasAtras(n, 11) });
    }
    if (proximo) c.proximaAcao = { texto: proximo[0], data: somarDias(diaISO(), proximo[1]) };
    return c;
  });
}

export function carregarExemplos() {
  const novos = gerarExemplos();
  store.alterar((db) => db.contatos.push(...novos));
  aviso(`${novos.length} contatos de exemplo carregados. Remova em Dados quando quiser.`, { tipo: 'sucesso', tempo: 7000 });
}

export async function removerExemplos() {
  const n = store.obter().contatos.filter((c) => c.demo).length;
  const ok = await confirmar({ titulo: `Remover ${n} contatos de exemplo?`, descricao: 'Os contatos que você cadastrou continuam no CRM.', ok: 'Remover exemplos', perigo: true });
  if (!ok) return;
  store.alterar((db) => { db.contatos = db.contatos.filter((c) => !c.demo); });
  aviso('Exemplos removidos');
}
