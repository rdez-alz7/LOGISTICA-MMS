import { Router, Request, Response } from 'express';
import { db } from '../db/database.js';
import { authenticateToken, requireRoles } from '../services/authService.js';
import { logAudit } from '../services/auditService.js';
import { Aluno, AlunoStatus } from '../types/index.js';

export const alunosRouter = Router();

// GET /api/alunos
alunosRouter.get('/alunos', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { search, obreiroId, status } = req.query;
    const filter = {
      search: typeof search === 'string' ? search : undefined,
      obreiroId: typeof obreiroId === 'string' && obreiroId ? obreiroId : undefined,
      status: typeof status === 'string' && status ? status : undefined,
    };

    const alunos = await db.alunos.find(filter);
    res.json(alunos);
  } catch (error: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Erro ao listar alunos.' });
  }
});

// GET /api/alunos/:id
alunosRouter.get('/alunos/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const aluno = await db.alunos.findById(req.params.id);
    if (!aluno) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Aluno não encontrado.' });
      return;
    }
    res.json(aluno);
  } catch (error: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Erro ao buscar aluno.' });
  }
});

// POST /api/alunos
alunosRouter.post(
  '/alunos',
  authenticateToken,
  requireRoles('ADMIN_HOST', 'ADMIN', 'GESTOR'),
  async (req: Request, res: Response) => {
    try {
      const { nome, obreiroId, status } = req.body;

      // Strict validation: Nome is required
      if (!nome || !nome.trim()) {
        res.status(400).json({ error: 'BAD_REQUEST', message: 'O nome do aluno é obrigatório.' });
        return;
      }

      // Obreiro responsável must be valid
      if (!obreiroId) {
        res.status(400).json({ error: 'BAD_REQUEST', message: 'Selecione o obreiro responsável.' });
        return;
      }

      const obreiro = await db.obreiros.findById(obreiroId);
      if (!obreiro) {
        res.status(400).json({ error: 'BAD_REQUEST', message: 'Obreiro responsável não encontrado no sistema.' });
        return;
      }

      const validStatus: AlunoStatus[] = ['ATIVO', 'INATIVO', 'CONCLUÍDO', 'SUSPENSO'];
      const alunoStatus: AlunoStatus = validStatus.includes(status) ? status : 'ATIVO';

      const newAluno: Aluno = {
        id: `aln_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        nome: nome.trim(),
        obreiroId: obreiro.id,
        obreiroNome: obreiro.nome,
        status: alunoStatus,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await db.alunos.insertOne(newAluno);

      await logAudit(req, {
        acao: 'CRIACAO_ALUNO',
        entidade: 'Aluno',
        entidadeId: newAluno.id,
        detalhes: `Aluno cadastrado: ${newAluno.nome} com obreiro ${obreiro.nome}`,
      });

      res.status(201).json(newAluno);
    } catch (error: any) {
      res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Erro ao cadastrar aluno.' });
    }
  }
);

// PUT /api/alunos/:id
alunosRouter.put(
  '/alunos/:id',
  authenticateToken,
  requireRoles('ADMIN_HOST', 'ADMIN', 'GESTOR'),
  async (req: Request, res: Response) => {
    try {
      const existing = await db.alunos.findById(req.params.id);
      if (!existing) {
        res.status(404).json({ error: 'NOT_FOUND', message: 'Aluno não encontrado.' });
        return;
      }

      const { nome, obreiroId, status } = req.body;
      const updates: Partial<Aluno> = {};

      if (nome !== undefined) {
        if (!nome.trim()) {
          res.status(400).json({ error: 'BAD_REQUEST', message: 'O nome do aluno não pode ser vazio.' });
          return;
        }
        updates.nome = nome.trim();
      }

      if (obreiroId !== undefined) {
        const obreiro = await db.obreiros.findById(obreiroId);
        if (!obreiro) {
          res.status(400).json({ error: 'BAD_REQUEST', message: 'Obreiro selecionado inválido.' });
          return;
        }
        updates.obreiroId = obreiro.id;
        updates.obreiroNome = obreiro.nome;
      }

      if (status !== undefined) {
        const validStatus: AlunoStatus[] = ['ATIVO', 'INATIVO', 'CONCLUÍDO', 'SUSPENSO'];
        if (validStatus.includes(status)) {
          updates.status = status;
        }
      }

      const updated = await db.alunos.updateOne(req.params.id, updates);

      // Also sync student name and obreiro in related viagens and documentos if changed
      if (updates.nome || updates.obreiroNome) {
        const viagens = await db.viagens.find({ alunoId: existing.id });
        for (const v of viagens) {
          await db.viagens.updateOne(v.id, {
            alunoNome: updates.nome || v.alunoNome,
            obreiroNome: updates.obreiroNome || v.obreiroNome,
          });
        }
        const docs = await db.documentos.find({ alunoId: existing.id });
        for (const d of docs) {
          await db.documentos.updateOne(d.id, {
            alunoNome: updates.nome || d.alunoNome,
          });
        }
      }

      await logAudit(req, {
        acao: 'EDICAO_ALUNO',
        entidade: 'Aluno',
        entidadeId: existing.id,
        detalhes: `Aluno atualizado: ${existing.nome}`,
      });

      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Erro ao atualizar aluno.' });
    }
  }
);

// DELETE /api/alunos/:id
alunosRouter.delete(
  '/alunos/:id',
  authenticateToken,
  requireRoles('ADMIN_HOST', 'ADMIN'),
  async (req: Request, res: Response) => {
    try {
      const existing = await db.alunos.findById(req.params.id);
      if (!existing) {
        res.status(404).json({ error: 'NOT_FOUND', message: 'Aluno não encontrado.' });
        return;
      }

      await db.alunos.deleteOne(req.params.id);

      await logAudit(req, {
        acao: 'EXCLUSAO_ALUNO',
        entidade: 'Aluno',
        entidadeId: existing.id,
        detalhes: `Aluno excluído: ${existing.nome}`,
      });

      res.json({ message: 'Aluno excluído com sucesso.' });
    } catch (error: any) {
      res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Erro ao excluir aluno.' });
    }
  }
);
