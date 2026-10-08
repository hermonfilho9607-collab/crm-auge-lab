// Ficha do contato (gaveta lateral), cadastro rápido e ações compartilhadas (mover estágio, excluir).
import { h, icone, limpar, aviso, dialogo, confirmar, campo, opcoes } from './ui.js';
import * as store from './store.js';
import {
  ESTAGIO, ESTAGIOS, CAMINHO, TIPOS_INTERACAO, TIPO_INTERACAO, TEMPERATURAS, ORIGENS, MOTIVOS_PERDA, SITUACAO_SITE,
  novoContato, mudarEstagio, registrarInteracao, removerInteracao, historicoOrdenado, chaveDuplicidade,
  nomeExibicao, diaISO, somarDias, diasEntre, formatarDataHora, formatarData, formatarRelativo, paraNumero,
  valoresUnicos, ativo,
} from './core.js';
import { chipEstagio, linksRapidos, seloFollowUp } from './componentes.js';
import { abrirContato, fecharContato } from './nav.js';

const acharContato = (id) => store.obter().contatos.find((c) => c.id === id);
const copia = () => structuredClone(store.obter());

// ---------- ações compartilhadas ----------
export async function pedirMotivo(nome) {
  return dialogo({
    titulo: 'Marcar como perdido',
    descricao: `Por que ${nome} não avançou? Isso ajuda a entender onde a prospecção trava.`,
    classe: 'dlg-pequeno',
    corpo: (fechar) => {
      const sel = h('select', { required: true }, opcoes(MOTIVOS_PERDA, '', 'Escolha um motivo'));
      const det = h('input', { type: 'text', placeholder: 'Opcional' });
      const erro = h('p', { class: 'campo-erro', id: 'motivo-erro', role: 'alert' });
      return h('form', {
        class: 'form',
        onsubmit: (e) => {
          e.preventDefault();
          if (!sel.value) {
            erro.textContent = 'Escolha um motivo para continuar.';
            sel.setAttribute('aria-invalid', 'true');
            sel.setAttribute('aria-describedby', 'motivo-erro');
            sel.focus();
            return;
          }
          fechar([sel.value, det.value.trim()].filter(Boolean).join(' — '));
        },
      },
        campo('Motivo', sel), erro,
        campo('Detalhe', det),
        h('div', { class: 'dlg-acoes' },
          h('button', { class: 'btn', type: 'button', onclick: () => fechar(undefined) }, 'Cancelar'),
          h('button', { class: 'btn btn-perigo', type: 'submit' }, 'Marcar como perdido'),
        ),
      );
    },
  });
}

/** Move um contato de estágio (pede motivo se for "perdido") e oferece desfazer. */
export async function moverEstagio(id, para) {
  const c = acharContato(id);
  if (!c || c.estagio === para) return false;
  let motivo = '';
  if (para === 'perdido') {
    motivo = await pedirMotivo(nomeExibicao(c));
    if (motivo === undefined) return false;
  }
  const antes = copia();
  store.alterar((db) => mudarEstagio(db.contatos.find((x) => x.id === id), para, { motivo }));
  aviso(`${nomeExibicao(c)} → ${ESTAGIO[para].nome}`, { acao: 'Desfazer', aoAgir: () => store.substituir(antes) });
  document.dispatchEvent(new CustomEvent('crm:contato', { detail: id }));
  return true;
}

export async function excluirContato(id) {
  const c = acharContato(id);
  if (!c) return;
  const ok = await confirmar({
    titulo: `Excluir ${nomeExibicao(c)}?`,
    descricao: 'O contato e toda a linha do tempo dele saem do CRM. Você poderá desfazer logo em seguida.',
    ok: 'Excluir contato',
    perigo: true,
  });
  if (!ok) return;
  const antes = copia();
  fecharContato();
  store.alterar((db) => { db.contatos = db.contatos.filter((x) => x.id !== id); });
  aviso(`${nomeExibicao(c)} excluído`, { acao: 'Desfazer', aoAgir: () => store.substituir(antes), tempo: 8000 });
}

// ---------- gaveta ----------
const ROTULO_HIST = { criado: 'Contato cadastrado', estagio: 'Mudança de estágio' };

export function renderGaveta(corpo, id, foco) {
  const c = acharContato(id);
  if (!c) {
    limpar(corpo, h('div', { class: 'gaveta-cab' },
      h('h2', { class: 'gaveta-titulo', id: 'gaveta-titulo' }, 'Contato não encontrado'),
      h('button', { class: 'btn-icone', type: 'button', 'aria-label': 'Fechar ficha', onclick: fecharContato }, icone('fechar')),
    ), h('p', { class: 'pad' }, 'Ele pode ter sido excluído.'));
    return;
  }
  const alterarC = (fn) => store.alterar((db) => fn(db.contatos.find((x) => x.id === id)));
  const rerender = (novoFoco) => renderGaveta(corpo, id, novoFoco);
  const hoje = diaISO();

  // cabeçalho
  const titulo = h('h2', { class: 'gaveta-titulo', id: 'gaveta-titulo' }, nomeExibicao(c));
  const sub = h('p', { class: 'gaveta-sub' }, [c.pessoa && c.empresa ? c.pessoa + (c.cargo ? ` (${c.cargo})` : '') : c.cargo, c.segmento, c.cidade].filter(Boolean).join(' · ') || 'Complete os dados abaixo');
  const cab = h('header', { class: 'gaveta-cab' },
    h('div', { class: 'gaveta-cab-texto' }, titulo, sub),
    h('button', { class: 'btn-icone', type: 'button', 'aria-label': 'Fechar ficha', onclick: fecharContato }, icone('fechar')),
  );

  // evolução no funil
  const idxAtual = CAMINHO.indexOf(c.estagio);
  const maxAlcancado = Math.max(...c.estagios.map((e) => CAMINHO.indexOf(e.estagio)));
  const passos = h('ol', { class: 'passos', 'aria-label': 'Estágio no funil' },
    CAMINHO.map((eid, i) => {
      const estado = c.estagio === eid ? 'atual' : c.estagio === 'perdido' ? (i <= maxAlcancado ? 'feito-perdido' : '') : i < idxAtual ? 'feito' : '';
      return h('li', { class: 'passo ' + estado, dataset: { estagio: eid } },
        h('button', {
          type: 'button',
          'aria-current': c.estagio === eid ? 'step' : null,
          title: ESTAGIO[eid].ajuda,
          onclick: () => moverEstagio(id, eid),
        }, h('span', { class: 'passo-marca', 'aria-hidden': 'true' }, estado.startsWith('feito') ? icone('check') : null), h('span', { class: 'passo-nome' }, ESTAGIO[eid].curto)),
      );
    }),
  );
  const desde = diasEntre(c.estagioDesde, new Date());
  const linhaEstado = c.estagio === 'perdido'
    ? h('div', { class: 'evolucao-rodape perdido' },
      h('p', {}, h('strong', {}, 'Perdido'), c.motivoPerda ? ` — ${c.motivoPerda}` : '', h('span', { class: 'mudo' }, ` · ${formatarRelativo(c.estagioDesde)}`)),
      h('button', { class: 'btn btn-suave', type: 'button', onclick: () => moverEstagio(id, 'conversa') }, 'Reabrir'))
    : h('div', { class: 'evolucao-rodape' },
      h('p', { class: 'mudo' }, `${ESTAGIO[c.estagio].nome} ${desde === 0 ? 'desde hoje' : `há ${desde} ${desde === 1 ? 'dia' : 'dias'}`} · no CRM desde ${formatarData(c.criadoEm, { day: '2-digit', month: 'short', year: 'numeric' })}`),
      c.estagio !== 'ganho' && h('button', { class: 'btn btn-suave btn-perigo-texto', type: 'button', onclick: () => moverEstagio(id, 'perdido') }, 'Marcar como perdido'));

  const evolucao = h('section', { class: 'bloco', 'aria-labelledby': 'sec-evolucao' },
    h('h3', { class: 'bloco-titulo', id: 'sec-evolucao' }, 'Evolução'), passos, linhaEstado, linksRapidos(c));

  // próximo passo
  let proximo = null;
  if (ativo(c)) {
    const txt = h('input', { type: 'text', value: c.proximaAcao.texto, placeholder: 'Ex.: Enviar proposta de site + Google Meu Negócio' });
    const data = h('input', { type: 'date', value: c.proximaAcao.data });
    const salvar = () => alterarC((x) => { x.proximaAcao = { texto: txt.value.trim(), data: data.value }; x.atualizadoEm = new Date().toISOString(); });
    txt.addEventListener('change', salvar);
    data.addEventListener('change', () => { salvar(); rerender(); });
    const atalho = (rotulo, dias) => h('button', { class: 'chip', type: 'button', onclick: () => { data.value = dias === null ? '' : somarDias(hoje, dias); salvar(); rerender(); } }, rotulo);
    proximo = h('section', { class: 'bloco bloco-destaque' + (foco === 'proximo' ? ' pedir-atencao' : ''), 'aria-labelledby': 'sec-proximo' },
      h('div', { class: 'bloco-linha' }, h('h3', { class: 'bloco-titulo', id: 'sec-proximo' }, 'Próximo passo'), seloFollowUp(c, hoje)),
      foco === 'proximo' && h('p', { class: 'dica' }, 'Interação registrada. Qual é o próximo passo com este contato?'),
      h('div', { class: 'grade-2 proximo-grade' },
        campo('O que fazer', txt, { largura: 'largo' }),
        campo('Quando', data),
      ),
      h('div', { class: 'chips' }, atalho('Amanhã', 1), atalho('Em 3 dias', 3), atalho('Em 1 semana', 7), atalho('Em 2 semanas', 14), atalho('Sem data', null)),
    );
    if (foco === 'proximo') requestAnimationFrame(() => txt.focus());
  }

  // registrar interação
  let tipoEscolhido = 'whatsapp';
  try { tipoEscolhido = localStorage.getItem('crm.ultimoTipo') || 'whatsapp'; } catch { /* sem storage */ }
  const tipos = h('div', { class: 'segmentado', role: 'radiogroup', 'aria-label': 'Tipo de interação' },
    TIPOS_INTERACAO.map((t) => h('label', { class: 'seg' },
      h('input', { type: 'radio', name: 'tipo-' + id, value: t.id, checked: t.id === tipoEscolhido }),
      h('span', {}, icone(t.id), t.nome),
    )),
  );
  const texto = h('textarea', { rows: 3, placeholder: 'O que aconteceu? Ex.: Mandei o portfólio; pediu orçamento para site institucional.' });
  const agoraLocal = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };
  const quando = h('input', { type: 'datetime-local', value: agoraLocal() });
  const mover = h('select', {},
    h('option', { value: '' }, `Manter em "${ESTAGIO[c.estagio].nome}"`),
    ESTAGIOS.filter((e) => e.id !== c.estagio).map((e) => h('option', { value: e.id }, e.nome)));
  // sugestão: se ainda é "Novo lead", a primeira interação normalmente é a abordagem
  if (c.estagio === 'novo') mover.value = 'contato';
  const erroReg = h('p', { class: 'campo-erro', role: 'alert' });
  const registrar = h('section', { class: 'bloco', 'aria-labelledby': 'sec-registrar' },
    h('h3', { class: 'bloco-titulo', id: 'sec-registrar' }, 'Registrar interação'),
    h('form', {
      class: 'form',
      onsubmit: async (e) => {
        e.preventDefault();
        const tipo = tipos.querySelector('input:checked')?.value || 'nota';
        if (!texto.value.trim() && tipo === 'nota') {
          erroReg.textContent = 'Escreva a anotação antes de salvar.';
          texto.focus();
          return;
        }
        let motivo = '';
        if (mover.value === 'perdido') {
          motivo = await pedirMotivo(nomeExibicao(c));
          if (motivo === undefined) return;
        }
        try { localStorage.setItem('crm.ultimoTipo', tipo); } catch { /* sem storage */ }
        const para = mover.value;
        store.alterar((db) => {
          const x = db.contatos.find((y) => y.id === id);
          registrarInteracao(x, { tipo, em: quando.value ? new Date(quando.value) : new Date(), texto: texto.value });
          if (para) mudarEstagio(x, para, { motivo });
        });
        aviso(para ? `Interação registrada · ${ESTAGIO[para].nome}` : 'Interação registrada', { tipo: 'sucesso' });
        const ficaAtivo = !para || (para !== 'ganho' && para !== 'perdido');
        rerender(ficaAtivo ? 'proximo' : null);
      },
    },
      tipos,
      campo('Descrição', texto),
      erroReg,
      h('div', { class: 'grade-2' }, campo('Quando', quando), campo('Estágio depois disso', mover)),
      h('div', { class: 'form-acoes' }, h('button', { class: 'btn btn-primario', type: 'submit' }, icone('check'), 'Registrar')),
    ),
  );

  // linha do tempo
  const itens = historicoOrdenado(c);
  const linha = h('ol', { class: 'timeline' },
    itens.map((it) => {
      const ehInteracao = !!TIPO_INTERACAO[it.tipo];
      const tituloItem = it.tipo === 'estagio'
        ? h('span', {}, ESTAGIO[it.de]?.nome || '—', ' ', icone('seta', 'ic-inline'), ' ', h('strong', {}, ESTAGIO[it.para]?.nome))
        : h('strong', {}, TIPO_INTERACAO[it.tipo]?.nome || ROTULO_HIST[it.tipo] || it.tipo);
      return h('li', { class: 'tl-item', dataset: { tipo: it.tipo, para: it.para || '' } },
        h('span', { class: 'tl-ic' }, icone(TIPO_INTERACAO[it.tipo] ? it.tipo : it.tipo === 'estagio' ? 'estagio' : 'criado')),
        h('div', { class: 'tl-corpo' },
          h('div', { class: 'tl-topo' }, tituloItem, h('time', { datetime: it.em, class: 'mudo' }, formatarDataHora(it.em))),
          it.texto && h('p', { class: 'tl-texto' }, it.texto),
        ),
        ehInteracao && h('button', {
          class: 'btn-icone tl-apagar', type: 'button', 'aria-label': 'Apagar esta interação',
          onclick: () => {
            const antes = copia();
            alterarC((x) => removerInteracao(x, it.id));
            rerender();
            aviso('Interação apagada', { acao: 'Desfazer', aoAgir: () => { store.substituir(antes); rerender(); } });
          },
        }, icone('lixo')),
      );
    }),
  );
  const tempo = h('section', { class: 'bloco', 'aria-labelledby': 'sec-tempo' },
    h('h3', { class: 'bloco-titulo', id: 'sec-tempo' }, 'Linha do tempo'), linha);

  // dados cadastrais
  const db = store.obter();
  const listaSeg = h('datalist', { id: 'dl-seg' }, valoresUnicos(db.contatos, 'segmento').map((v) => h('option', { value: v })));
  const listaCid = h('datalist', { id: 'dl-cid' }, valoresUnicos(db.contatos, 'cidade').map((v) => h('option', { value: v })));
  const listaOri = h('datalist', { id: 'dl-ori' }, [...new Set([...ORIGENS, ...valoresUnicos(db.contatos, 'origem')])].map((v) => h('option', { value: v })));
  const inp = (chave, attrs = {}) => {
    const el = h('input', { type: 'text', value: c[chave] ?? '', ...attrs });
    el.addEventListener('change', () => {
      alterarC((x) => { x[chave] = el.value.trim(); x.atualizadoEm = new Date().toISOString(); });
      if (['empresa', 'pessoa', 'cargo', 'segmento', 'cidade'].includes(chave)) {
        const y = acharContato(id);
        titulo.textContent = nomeExibicao(y);
        sub.textContent = [y.pessoa && y.empresa ? y.pessoa + (y.cargo ? ` (${y.cargo})` : '') : y.cargo, y.segmento, y.cidade].filter(Boolean).join(' · ');
      }
    });
    return el;
  };
  const valor = h('input', { type: 'text', inputmode: 'decimal', value: c.valor ? String(c.valor).replace('.', ',') : '', placeholder: '0' });
  valor.addEventListener('change', () => alterarC((x) => { x.valor = paraNumero(valor.value); }));
  const temp = h('select', {}, opcoes(TEMPERATURAS, c.temperatura));
  temp.addEventListener('change', () => alterarC((x) => { x.temperatura = temp.value; }));
  const situ = h('select', {}, opcoes(SITUACAO_SITE, c.situacaoSite));
  situ.addEventListener('change', () => alterarC((x) => { x.situacaoSite = situ.value; }));
  const tags = h('input', { type: 'text', value: (c.tags || []).join(', '), placeholder: 'separe por vírgula' });
  tags.addEventListener('change', () => alterarC((x) => { x.tags = tags.value.split(',').map((t) => t.trim()).filter(Boolean); }));
  const notas = h('textarea', { rows: 4, placeholder: 'Contexto do negócio, dores, quem decide, concorrentes…' });
  notas.value = c.notas || '';
  notas.addEventListener('change', () => alterarC((x) => { x.notas = notas.value; }));
  const refazerLinks = () => { const novo = linksRapidos(acharContato(id)); const velho = evolucao.querySelector('.links-rapidos'); if (velho) velho.replaceWith(novo || ''); else if (novo) evolucao.append(novo); };
  const tel = inp('telefone', { type: 'tel', autocomplete: 'off', placeholder: '(11) 91234-5678' });
  const mail = inp('email', { type: 'email', autocomplete: 'off' });
  const ig = inp('instagram', { placeholder: '@perfil' });
  const site = inp('site', { placeholder: 'www.exemplo.com.br' });
  [tel, mail, ig, site].forEach((el) => el.addEventListener('change', refazerLinks));

  const dados = h('section', { class: 'bloco', 'aria-labelledby': 'sec-dados' },
    h('h3', { class: 'bloco-titulo', id: 'sec-dados' }, 'Dados do contato'),
    listaSeg, listaCid, listaOri,
    h('div', { class: 'grade-2' },
      campo('Empresa', inp('empresa')),
      campo('Pessoa de contato', inp('pessoa')),
      campo('Cargo', inp('cargo', { placeholder: 'Ex.: Dono(a), Gerente' })),
      campo('Telefone / WhatsApp', tel),
      campo('E-mail', mail),
      campo('Instagram', ig),
      campo('Site', site),
      campo('Situação do site', situ),
      campo('Segmento', inp('segmento', { list: 'dl-seg' })),
      campo('Cidade', inp('cidade', { list: 'dl-cid' })),
      campo('Origem', inp('origem', { list: 'dl-ori' })),
      campo('Temperatura', temp),
      campo('Valor estimado (R$)', valor),
      campo('Tags', tags),
    ),
    campo('Notas', notas),
  );

  const rodape = h('footer', { class: 'gaveta-rodape' },
    h('button', { class: 'btn btn-suave btn-perigo-texto', type: 'button', onclick: () => excluirContato(id) }, icone('lixo'), 'Excluir contato'));

  limpar(corpo, cab, h('div', { class: 'gaveta-rolagem' }, evolucao, proximo, registrar, tempo, dados, rodape));
}

// ---------- cadastro rápido ----------
export function novoContatoDialogo(preset = {}) {
  const db = store.obter();
  return dialogo({
    titulo: 'Novo contato',
    descricao: 'Informe a empresa ou a pessoa; o resto dá para completar depois.',
    classe: 'dlg-medio',
    corpo: (fechar) => {
      const f = {
        empresa: h('input', { type: 'text', autofocus: true, autocomplete: 'off', placeholder: 'Ex.: Padaria Pão Dourado' }),
        pessoa: h('input', { type: 'text', autocomplete: 'off', placeholder: 'Quem você vai abordar' }),
        telefone: h('input', { type: 'tel', autocomplete: 'off', placeholder: '(11) 91234-5678' }),
        instagram: h('input', { type: 'text', autocomplete: 'off', placeholder: '@perfil' }),
        segmento: h('input', { type: 'text', list: 'dl-n-seg', value: preset.segmento || '' }),
        cidade: h('input', { type: 'text', list: 'dl-n-cid', value: preset.cidade || '' }),
        origem: h('input', { type: 'text', list: 'dl-n-ori', value: preset.origem || '' }),
        temperatura: h('select', {}, opcoes(TEMPERATURAS, preset.temperatura || 'morna')),
        situacaoSite: h('select', {}, opcoes(SITUACAO_SITE, '')),
        valor: h('input', { type: 'text', inputmode: 'decimal', placeholder: '0' }),
        proxTexto: h('input', { type: 'text', value: 'Fazer a primeira abordagem' }),
        proxData: h('input', { type: 'date', value: diaISO() }),
      };
      const erroNome = h('p', { class: 'campo-erro', id: 'erro-nome', role: 'alert' });
      const dup = h('div', { class: 'aviso-inline', hidden: true, role: 'alert' });
      let ignorarDuplicado = false;
      [f.empresa, f.pessoa, f.telefone, f.instagram].forEach((el) => el.addEventListener('input', () => { ignorarDuplicado = false; dup.hidden = true; }));

      const coletar = () => ({
        empresa: f.empresa.value.trim(), pessoa: f.pessoa.value.trim(), telefone: f.telefone.value.trim(),
        instagram: f.instagram.value.trim(), segmento: f.segmento.value.trim(), cidade: f.cidade.value.trim(),
        origem: f.origem.value.trim(), temperatura: f.temperatura.value, situacaoSite: f.situacaoSite.value,
        valor: paraNumero(f.valor.value), proximaAcao: { texto: f.proxTexto.value.trim(), data: f.proxData.value },
      });

      const salvar = (depois) => {
        const campos = coletar();
        if (!campos.empresa && !campos.pessoa) {
          erroNome.textContent = 'Informe o nome da empresa ou da pessoa.';
          f.empresa.setAttribute('aria-invalid', 'true');
          f.empresa.setAttribute('aria-describedby', 'erro-nome');
          f.empresa.focus();
          return;
        }
        if (!ignorarDuplicado) {
          const chaves = new Set(chaveDuplicidade(campos));
          const existente = store.obter().contatos.find((c) => chaveDuplicidade(c).some((k) => chaves.has(k)));
          if (existente) {
            ignorarDuplicado = true;
            limpar(dup,
              icone('alerta'),
              h('div', {},
                h('p', {}, h('strong', {}, `Parece que ${nomeExibicao(existente)} já está no CRM`), ` (${ESTAGIO[existente.estagio].nome}).`),
                h('div', { class: 'aviso-inline-acoes' },
                  h('button', { class: 'btn btn-suave', type: 'button', onclick: () => { fechar(undefined); abrirContato(existente.id); } }, 'Abrir o existente'),
                  h('span', { class: 'mudo' }, 'ou salve de novo para cadastrar mesmo assim.'),
                ),
              ),
            );
            dup.hidden = false;
            return;
          }
        }
        const c = novoContato(campos);
        store.alterar((d) => d.contatos.push(c));
        if (depois === 'novo') {
          aviso(`${nomeExibicao(c)} adicionado`, { tipo: 'sucesso', acao: 'Abrir', aoAgir: () => abrirContato(c.id) });
          fechar(undefined);
          novoContatoDialogo({ segmento: campos.segmento, cidade: campos.cidade, origem: campos.origem, temperatura: campos.temperatura });
        } else {
          fechar(c.id);
          abrirContato(c.id);
        }
      };

      return h('form', { class: 'form', onsubmit: (e) => { e.preventDefault(); salvar(e.submitter?.value); } },
        h('datalist', { id: 'dl-n-seg' }, valoresUnicos(db.contatos, 'segmento').map((v) => h('option', { value: v }))),
        h('datalist', { id: 'dl-n-cid' }, valoresUnicos(db.contatos, 'cidade').map((v) => h('option', { value: v }))),
        h('datalist', { id: 'dl-n-ori' }, [...new Set([...ORIGENS, ...valoresUnicos(db.contatos, 'origem')])].map((v) => h('option', { value: v }))),
        h('div', { class: 'grade-2' },
          h('div', {}, campo('Empresa', f.empresa), erroNome),
          campo('Pessoa de contato', f.pessoa),
          campo('Telefone / WhatsApp', f.telefone),
          campo('Instagram', f.instagram),
          campo('Segmento', f.segmento),
          campo('Cidade', f.cidade),
          campo('Origem', f.origem, { ajuda: 'Onde você encontrou: Google Maps, Instagram, indicação…' }),
          campo('Situação do site', f.situacaoSite),
          campo('Temperatura', f.temperatura),
          campo('Valor estimado (R$)', f.valor),
          campo('Próximo passo', f.proxTexto),
          campo('Quando', f.proxData),
        ),
        dup,
        h('div', { class: 'dlg-acoes' },
          h('button', { class: 'btn', type: 'button', onclick: () => fechar(undefined) }, 'Cancelar'),
          h('button', { class: 'btn', type: 'submit', value: 'novo', title: 'Salva e já abre outro cadastro com segmento, cidade e origem preenchidos' }, 'Salvar e adicionar outro'),
          h('button', { class: 'btn btn-primario', type: 'submit', value: 'abrir' }, 'Salvar'),
        ),
      );
    },
  });
}
