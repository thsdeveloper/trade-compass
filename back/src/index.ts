import 'dotenv/config';
import { buildServer } from './api/server.js';

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;
const HOST = process.env.HOST ?? '0.0.0.0';

async function main() {
  const server = await buildServer();

  try {
    await server.listen({ port: PORT, host: HOST });
    console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   MoneyCompass Backend API                            ║
║   Servidor rodando em http://localhost:${PORT}          ║
║                                                       ║
║   Endpoints:                                          ║
║   GET /health                - Status da API          ║
║   GET /assets                - Lista de ativos        ║
║   GET /assets/:ticker/summary - Resumo do ativo       ║
║   GET /assets/:ticker/analysis - Analise completa     ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
    `);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

main();
