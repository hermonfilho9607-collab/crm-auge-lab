// Armazém em arquivo JSON (modo local sem planilha), com backup diário.
import fs from 'node:fs';
import path from 'node:path';

const MANTER_BACKUPS = 30;

export function criarArmazemArquivo(pastaDados) {
  const arquivo = path.join(pastaDados, 'crm.json');
  const pastaBackups = path.join(pastaDados, 'backups');
  const fonte = { tipo: 'arquivo', arquivo, backups: pastaBackups };

  function lerArquivo() {
    if (!fs.existsSync(arquivo)) return { rev: 0, data: null };
    return JSON.parse(fs.readFileSync(arquivo, 'utf8'));
  }

  function backupDoDia() {
    if (!fs.existsSync(arquivo)) return;
    fs.mkdirSync(pastaBackups, { recursive: true });
    const d = new Date();
    const dia = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const destino = path.join(pastaBackups, `crm-${dia}.json`);
    if (!fs.existsSync(destino)) fs.copyFileSync(arquivo, destino);
    const antigos = fs.readdirSync(pastaBackups).filter((f) => /^crm-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
    for (const f of antigos.slice(0, Math.max(0, antigos.length - MANTER_BACKUPS))) {
      fs.unlinkSync(path.join(pastaBackups, f));
    }
  }

  return {
    fonte,
    async ler() {
      const { rev, data } = lerArquivo();
      return { rev, data, fonte };
    },
    async gravar(baseRev, data) {
      const atual = lerArquivo();
      if (baseRev !== atual.rev) return { conflito: true, rev: atual.rev, data: atual.data };
      fs.mkdirSync(pastaDados, { recursive: true });
      backupDoDia();
      const novo = { rev: atual.rev + 1, salvoEm: new Date().toISOString(), data };
      const tmp = arquivo + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(novo));
      fs.renameSync(tmp, arquivo);
      return { conflito: false, rev: novo.rev };
    },
  };
}
