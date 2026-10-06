import { Router, Request, Response } from 'express';
import { authenticateToken, requireRoles } from '../services/authService.js';
import { db } from '../db/database.js';
import {
  generateAlunosWorkbook,
  generateViagensWorkbook,
  generateDocumentosWorkbook,
  generateAuditoriaWorkbook,
  generateGeralWorkbook,
} from '../services/reportService.js';

export const reportsRouter = Router();

// Data endpoints for preview in UI
reportsRouter.get('/relatorios/alunos', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { obreiroId, status } = req.query;
    const filter = {
      obreiroId: typeof obreiroId === 'string' && obreiroId ? obreiroId : undefined,
      status: typeof status === 'string' && status ? status : undefined,
    };
    const alunos = await db.alunos.find(filter);
    res.json(alunos);
  } catch (error: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Erro ao obter dados do relatório.' });
  }
});

reportsRouter.get('/relatorios/viagens', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { alunoId, status } = req.query;
    const filter = {
      alunoId: typeof alunoId === 'string' && alunoId ? alunoId : undefined,
      status: typeof status === 'string' && status ? status : undefined,
    };
    const viagens = await db.viagens.find(filter);
    res.json(viagens);
  } catch (error: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Erro ao obter dados do relatório.' });
  }
});

reportsRouter.get('/relatorios/documentos', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { tipo, alunoId } = req.query;
    const filter = {
      tipo: typeof tipo === 'string' && tipo ? tipo : undefined,
      alunoId: typeof alunoId === 'string' && alunoId ? alunoId : undefined,
    };
    const docs = await db.documentos.find(filter);
    const safeDocs = docs.map(({ dataBase64, ...rest }) => rest);
    res.json(safeDocs);
  } catch (error: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Erro ao obter dados do relatório.' });
  }
});

reportsRouter.get('/relatorios/auditoria', authenticateToken, requireRoles('ADMIN_HOST', 'ADMIN'), async (req: Request, res: Response) => {
  try {
    const logs = await db.auditoria.find(200);
    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Erro ao obter auditoria.' });
  }
});

// Real XLSX Export endpoints
reportsRouter.get('/relatorios/alunos/exportar', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { obreiroId, status } = req.query;
    const filter = {
      obreiroId: typeof obreiroId === 'string' && obreiroId ? obreiroId : undefined,
      status: typeof status === 'string' && status ? status : undefined,
    };
    const workbook = await generateAlunosWorkbook(filter);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="LOG_MMS_Relatorio_Alunos.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error: any) {
    res.status(500).json({ error: 'EXPORT_ERROR', message: 'Erro ao exportar planilha de alunos.' });
  }
});

reportsRouter.get('/relatorios/viagens/exportar', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { status, alunoId } = req.query;
    const filter = {
      status: typeof status === 'string' && status ? status : undefined,
      alunoId: typeof alunoId === 'string' && alunoId ? alunoId : undefined,
    };
    const workbook = await generateViagensWorkbook(filter);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="LOG_MMS_Relatorio_Viagens.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error: any) {
    res.status(500).json({ error: 'EXPORT_ERROR', message: 'Erro ao exportar planilha de viagens.' });
  }
});

reportsRouter.get('/relatorios/documentos/exportar', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { tipo, alunoId } = req.query;
    const filter = {
      tipo: typeof tipo === 'string' && tipo ? tipo : undefined,
      alunoId: typeof alunoId === 'string' && alunoId ? alunoId : undefined,
    };
    const workbook = await generateDocumentosWorkbook(filter);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="LOG_MMS_Relatorio_Documentos.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error: any) {
    res.status(500).json({ error: 'EXPORT_ERROR', message: 'Erro ao exportar planilha de documentos.' });
  }
});

reportsRouter.get('/relatorios/geral/exportar', authenticateToken, async (_req: Request, res: Response) => {
  try {
    const workbook = await generateGeralWorkbook();

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="LOG_MMS_Relatorio_Geral_Completo.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error: any) {
    res.status(500).json({ error: 'EXPORT_ERROR', message: 'Erro ao exportar planilha geral.' });
  }
});

reportsRouter.get('/relatorios/auditoria/exportar', authenticateToken, requireRoles('ADMIN_HOST', 'ADMIN'), async (_req: Request, res: Response) => {
  try {
    const workbook = await generateAuditoriaWorkbook();

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="LOG_MMS_Relatorio_Auditoria.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error: any) {
    res.status(500).json({ error: 'EXPORT_ERROR', message: 'Erro ao exportar planilha de auditoria.' });
  }
});
