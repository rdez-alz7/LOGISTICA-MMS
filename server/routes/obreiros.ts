import { Router, Request, Response } from 'express';
import { db } from '../db/database.js';
import { authenticateToken, requireRoles } from '../services/authService.js';
import { logAudit } from '../services/auditService.js';
import { Obreiro } from '../types/index.js';

export const obreirosRouter = Router();

// GET /api/obreiros
obreirosRouter.get('/obreiros', authenticateToken, async (_req: Request, res: Response) => {
  try {
    const obreiros = await db.obreiros.find();
    res.json(obreiros);
  } catch (error: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Erro ao buscar obreiros.' });
  }
});

// GET /api/obreiros/:id
obreirosRouter.get('/obreiros/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const obreiro = await db.obreiros.findById(req.params.id);
    if (!obreiro) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Obreiro não encontrado.' });
      return;
    }
    res.json(obreiro);
  } catch (error: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Erro ao buscar obreiro.' });
  }
});

// POST /api/obreiros
obreirosRouter.post(
  '/obreiros',
  authenticateToken,
  requireRoles('ADMIN_HOST', 'ADMIN', 'GESTOR'),
  async (req: Request, res: Response) => {
    try {
      const { nome, email, funcao, status } = req.body;

      if (!nome || !nome.trim()) {
        res.status(400).json({ error: 'BAD_REQUEST', message: 'O nome do obreiro é obrigatório.' });
        return;
      }

      const newObreiro: Obreiro = {
        id: `obr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        nome: nome.trim(),
        email: email?.trim() || '',
        funcao: funcao?.trim() || 'Obreiro',
        status: status === 'INATIVO' ? 'INATIVO' : 'ATIVO',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await db.obreiros.insertOne(newObreiro);

      await logAudit(req, {
        acao: 'CRIACAO_OBREIRO',
        entidade: 'Obreiro',
        entidadeId: newObreiro.id,
        detalhes: `Obreiro cadastrado: ${newObreiro.nome}`,
      });

      res.status(201).json(newObreiro);
    } catch (error: any) {
      res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Erro ao criar obreiro.' });
    }
  }
);

// PUT /api/obreiros/:id
obreirosRouter.put(
  '/obreiros/:id',
  authenticateToken,
  requireRoles('ADMIN_HOST', 'ADMIN', 'GESTOR'),
  async (req: Request, res: Response) => {
    try {
      const { nome, email, funcao, status } = req.body;
      const existing = await db.obreiros.findById(req.params.id);

      if (!existing) {
        res.status(404).json({ error: 'NOT_FOUND', message: 'Obreiro não encontrado.' });
        return;
      }

      const updates: Partial<Obreiro> = {};
      if (nome !== undefined) updates.nome = nome.trim();
      if (email !== undefined) updates.email = email.trim();
      if (funcao !== undefined) updates.funcao = funcao.trim();
      if (status !== undefined) updates.status = status;

      const updated = await db.obreiros.updateOne(req.params.id, updates);

      // If obreiro name changed, sync in alunos and viagens
      if (updates.nome && updates.nome !== existing.nome) {
        const alunos = await db.alunos.find({ obreiroId: existing.id });
        for (const a of alunos) {
          await db.alunos.updateOne(a.id, { obreiroNome: updates.nome });
        }
      }

      await logAudit(req, {
        acao: 'EDICAO_OBREIRO',
        entidade: 'Obreiro',
        entidadeId: existing.id,
        detalhes: `Obreiro atualizado: ${existing.nome}`,
      });

      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Erro ao atualizar obreiro.' });
    }
  }
);

// DELETE /api/obreiros/:id
obreirosRouter.delete(
  '/obreiros/:id',
  authenticateToken,
  requireRoles('ADMIN_HOST', 'ADMIN'),
  async (req: Request, res: Response) => {
    try {
      const existing = await db.obreiros.findById(req.params.id);
      if (!existing) {
        res.status(404).json({ error: 'NOT_FOUND', message: 'Obreiro não encontrado.' });
        return;
      }

      // Check if any aluno has this obreiro
      const alunosLinked = await db.alunos.find({ obreiroId: existing.id });
      if (alunosLinked.length > 0) {
        res.status(400).json({
          error: 'BAD_REQUEST',
          message: `Não é possível excluir este obreiro pois existem ${alunosLinked.length} aluno(s) vinculados a ele.`,
        });
        return;
      }

      await db.obreiros.deleteOne(req.params.id);

      await logAudit(req, {
        acao: 'EXCLUSAO_OBREIRO',
        entidade: 'Obreiro',
        entidadeId: existing.id,
        detalhes: `Obreiro excluído: ${existing.nome}`,
      });

      res.json({ message: 'Obreiro excluído com sucesso.' });
    } catch (error: any) {
      res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Erro ao excluir obreiro.' });
    }
  }
);
