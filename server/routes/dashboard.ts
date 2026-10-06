import { Router, Request, Response } from 'express';
import { db, getDbStatus } from '../db/database.js';
import { authenticateToken } from '../services/authService.js';

export const dashboardRouter = Router();

dashboardRouter.get('/dashboard', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const canViewInvites = user.role === 'ADMIN_HOST' || user.role === 'ADMIN';

    const [
      totalAlunos,
      alunosAtivos,
      totalObreiros,
      totalViagens,
      totalDocumentos,
      convitesPendentes,
      obreirosList,
      alunosList,
      recentViagens,
      recentDocs,
    ] = await Promise.all([
      db.alunos.count(),
      db.alunos.count('ATIVO'),
      db.obreiros.count(),
      db.viagens.count(),
      db.documentos.count(),
      canViewInvites ? db.user_invitations.countPending() : Promise.resolve(0),
      db.obreiros.find(),
      db.alunos.find(),
      db.viagens.find(),
      db.documentos.find(),
    ]);

    // Calculate "Alunos por obreiro" with exact counts
    const alunosPorObreiro = obreirosList.map((obr) => {
      const count = alunosList.filter((a) => a.obreiroId === obr.id).length;
      return {
        obreiroId: obr.id,
        obreiroNome: obr.nome,
        funcao: obr.funcao,
        quantidadeAlunos: count,
      };
    }).sort((a, b) => b.quantidadeAlunos - a.quantidadeAlunos);

    // Recent 5 viagens
    const topViagens = recentViagens.slice(0, 5);

    // Recent 5 documents without heavy payloads
    const topDocs = recentDocs.slice(0, 5).map(({ dataBase64, ...rest }) => rest);

    res.json({
      cards: {
        totalAlunos,
        alunosAtivos,
        totalObreiros,
        totalViagens,
        totalDocumentos,
        convitesPendentes: canViewInvites ? convitesPendentes : undefined,
      },
      alunosPorObreiro,
      recentViagens: topViagens,
      recentDocumentos: topDocs,
      dbStatus: getDbStatus(),
    });
  } catch (error: any) {
    console.error('Erro ao carregar dashboard:', error);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Erro ao carregar métricas do dashboard.' });
  }
});
