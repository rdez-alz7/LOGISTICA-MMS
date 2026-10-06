import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

import { initDatabase } from './server/db/database.js';
import { authRouter } from './server/routes/auth.js';
import { obreirosRouter } from './server/routes/obreiros.js';
import { alunosRouter } from './server/routes/alunos.js';
import { viagensRouter } from './server/routes/viagens.js';
import { documentosRouter } from './server/routes/documentos.js';
import { invitationsRouter } from './server/routes/invitations.js';
import { reportsRouter } from './server/routes/reports.js';
import { usersRouter } from './server/routes/users.js';
import { dashboardRouter } from './server/routes/dashboard.js';
import { auditoriaRouter } from './server/routes/auditoria.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = parseInt(process.env.PORT || '3000', 10);
const isProduction = process.env.NODE_ENV === 'production';

async function startServer() {
  const app = express();

  // Initialize Database (MongoDB with automatic fallback to persistent JSON storage & admin bootstrap)
  await initDatabase();

  // CORS Configuration
  app.use(
    cors({
      origin: true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // Body Parsers with high limit for document uploads (images/PDFs)
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // Mount API Routers
  app.use('/api', authRouter);
  app.use('/api', obreirosRouter);
  app.use('/api', alunosRouter);
  app.use('/api', viagensRouter);
  app.use('/api', documentosRouter);
  app.use('/api', invitationsRouter);
  app.use('/api', reportsRouter);
  app.use('/api', usersRouter);
  app.use('/api', dashboardRouter);
  app.use('/api', auditoriaRouter);

  // Central error handler
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[API Error]', err);
    res.status(err.status || 500).json({
      error: err.code || 'INTERNAL_ERROR',
      message: err.message || 'Ocorreu um erro no servidor.',
    });
  });

  // Frontend integration (Vite dev middleware or Static files)
  if (!isProduction) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[LOG MMS] Servidor rodando na porta ${PORT} (0.0.0.0:${PORT})`);
  });
}

startServer().catch((err) => {
  console.error('[LOG MMS] Falha fatal ao iniciar servidor:', err);
  process.exit(1);
});
