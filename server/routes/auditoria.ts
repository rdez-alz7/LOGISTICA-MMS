import { Router, Request, Response } from 'express';
import { db } from '../db/database.js';
import { authenticateToken, requireRoles } from '../services/authService.js';

export const auditoriaRouter = Router();

auditoriaRouter.get(
  '/auditoria',
  authenticateToken,
  requireRoles('ADMIN_HOST', 'ADMIN'),
  async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string, 10) || 100;
      const logs = await db.auditoria.find(limit);
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Erro ao carregar registros de auditoria.' });
    }
  }
);
