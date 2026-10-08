// Função da Vercel para /api/db — mesma lógica do servidor local (lib/api.js).
import { tratarApi } from '../lib/api.js';
import { configurar } from '../lib/config.js';

const cfg = configurar();

export default function handler(req, res) {
  return tratarApi(req, res, cfg);
}
