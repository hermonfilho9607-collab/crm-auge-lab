// Rotas por hash: #/hoje, #/funil, #/contatos, #/dados — com ?c=<id> abrindo a ficha do contato.
export const ROTAS = ['hoje', 'funil', 'contatos', 'dados'];

export function rotaAtual() {
  const [caminho, busca = ''] = location.hash.replace(/^#\/?/, '').split('?');
  const rota = ROTAS.includes(caminho) ? caminho : 'hoje';
  const params = new URLSearchParams(busca);
  return { rota, contato: params.get('c') || null, foco: params.get('foco') || null };
}

function montar(rota, contato, foco) {
  const p = new URLSearchParams();
  if (contato) p.set('c', contato);
  if (foco) p.set('foco', foco);
  const q = p.toString();
  return `#/${rota}${q ? '?' + q : ''}`;
}

export function irPara(rota) {
  location.hash = montar(rota, null);
}

export function abrirContato(id, foco) {
  location.hash = montar(rotaAtual().rota, id, foco);
}

export function fecharContato() {
  const { rota } = rotaAtual();
  // substitui em vez de empilhar, para o "voltar" do navegador não reabrir a ficha
  history.replaceState(null, '', montar(rota, null));
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}
