// Função da Vercel para /api/sessao (entrar e sair com a senha do CRM).
import { tratarApi } from '../lib/api.js';
import { configurar } from '../lib/config.js';

const cfg = configurar();

export default function handler(req, res) {
  return tratarApi(req, res, cfg);
}
