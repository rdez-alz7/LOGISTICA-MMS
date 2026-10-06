import { Router, Request, Response } from 'express';
import { db } from '../db/database.js';
import { authenticateToken, requireRoles } from '../services/authService.js';
import { logAudit } from '../services/auditService.js';
import { Viagem, ViagemStatus } from '../types/index.js';

export const viagensRouter = Router();

// GET /api/viagens
viagensRouter.get('/viagens', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { alunoId, status, search, page = '1', limit = '50', sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    const filter = {
      alunoId: typeof alunoId === 'string' && alunoId ? alunoId : undefined,
      status: typeof status === 'string' && status ? status : undefined,
      search: typeof search === 'string' ? search : undefined,
    };

    let viagens = await db.viagens.find(filter);

    // Sorting
    viagens.sort((a: any, b: any) => {
      const fieldA = a[sortBy as string] || '';
      const fieldB = b[sortBy as string] || '';
      if (sortOrder === 'asc') {
        return fieldA.localeCompare ? fieldA.localeCompare(fieldB) : fieldA > fieldB ? 1 : -1;
      }
      return fieldB.localeCompare ? fieldB.localeCompare(fieldA) : fieldB > fieldA ? 1 : -1;
    });

    // Pagination
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit as string, 10) || 50));
    const total = viagens.length;
    const startIndex = (pageNum - 1) * limitNum;
    const paginated = viagens.slice(startIndex, startIndex + limitNum);

    res.json({
      items: paginated,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Erro ao buscar viagens.' });
  }
});

// GET /api/viagens/:id
viagensRouter.get('/viagens/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const viagem = await db.viagens.findById(req.params.id);
    if (!viagem) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Viagem não encontrada.' });
      return;
    }
    res.json(viagem);
  } catch (error: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Erro ao buscar detalhes da viagem.' });
  }
});

// POST /api/viagens
viagensRouter.post(
  '/viagens',
  authenticateToken,
  requireRoles('ADMIN_HOST', 'ADMIN', 'GESTOR'),
  async (req: Request, res: Response) => {
    try {
      const {
        alunoId,
        origem,
        destino,
        dataSaida,
        horarioSaida,
        dataChegada,
        horarioChegada,
        empresa,
        numeroLocalizador,
        localEmbarque,
        localDesembarque,
        status,
        observacoes,
      } = req.body;

      if (!alunoId) {
        res.status(400).json({ error: 'BAD_REQUEST', message: 'Selecione o aluno da viagem.' });
        return;
      }

      if (!origem || !destino) {
        res.status(400).json({ error: 'BAD_REQUEST', message: 'Origem e destino são obrigatórios.' });
        return;
      }

      const aluno = await db.alunos.findById(alunoId);
      if (!aluno) {
        res.status(400).json({ error: 'BAD_REQUEST', message: 'Aluno selecionado não foi encontrado.' });
        return;
      }

      const validStatus: ViagemStatus[] = ['PLANEJADA', 'EM_ANDAMENTO', 'CONCLUÍDA', 'CANCELADA'];
      const vStatus: ViagemStatus = validStatus.includes(status) ? status : 'PLANEJADA';

      const newViagem: Viagem = {
        id: `vgm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        alunoId: aluno.id,
        alunoNome: aluno.nome,
        obreiroNome: aluno.obreiroNome,
        origem: origem.trim(),
        destino: destino.trim(),
        dataSaida: dataSaida || new Date().toISOString().split('T')[0],
        horarioSaida: horarioSaida || '00:00',
        dataChegada: dataChegada || dataSaida || new Date().toISOString().split('T')[0],
        horarioChegada: horarioChegada || '00:00',
        empresa: empresa?.trim() || '',
        numeroLocalizador: numeroLocalizador?.trim() || '',
        localEmbarque: localEmbarque?.trim() || '',
        localDesembarque: localDesembarque?.trim() || '',
        status: vStatus,
        observacoes: observacoes?.trim() || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await db.viagens.insertOne(newViagem);

      await logAudit(req, {
        acao: 'CRIACAO_VIAGEM',
        entidade: 'Viagem',
        entidadeId: newViagem.id,
        detalhes: `Viagem cadastrada para o aluno ${aluno.nome}: ${newViagem.origem} -> ${newViagem.destino}`,
      });

      res.status(201).json(newViagem);
    } catch (error: any) {
      res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Erro ao cadastrar viagem.' });
    }
  }
);

// PUT /api/viagens/:id
viagensRouter.put(
  '/viagens/:id',
  authenticateToken,
  requireRoles('ADMIN_HOST', 'ADMIN', 'GESTOR'),
  async (req: Request, res: Response) => {
    try {
      const existing = await db.viagens.findById(req.params.id);
      if (!existing) {
        res.status(404).json({ error: 'NOT_FOUND', message: 'Viagem não encontrada.' });
        return;
      }

      const updates: Partial<Viagem> = {};
      const {
        alunoId,
        origem,
        destino,
        dataSaida,
        horarioSaida,
        dataChegada,
        horarioChegada,
        empresa,
        numeroLocalizador,
        localEmbarque,
        localDesembarque,
        status,
        observacoes,
      } = req.body;

      if (alunoId && alunoId !== existing.alunoId) {
        const aluno = await db.alunos.findById(alunoId);
        if (aluno) {
          updates.alunoId = aluno.id;
          updates.alunoNome = aluno.nome;
          updates.obreiroNome = aluno.obreiroNome;
        }
      }

      if (origem !== undefined) updates.origem = origem.trim();
      if (destino !== undefined) updates.destino = destino.trim();
      if (dataSaida !== undefined) updates.dataSaida = dataSaida;
      if (horarioSaida !== undefined) updates.horarioSaida = horarioSaida;
      if (dataChegada !== undefined) updates.dataChegada = dataChegada;
      if (horarioChegada !== undefined) updates.horarioChegada = horarioChegada;
      if (empresa !== undefined) updates.empresa = empresa.trim();
      if (numeroLocalizador !== undefined) updates.numeroLocalizador = numeroLocalizador.trim();
      if (localEmbarque !== undefined) updates.localEmbarque = localEmbarque.trim();
      if (localDesembarque !== undefined) updates.localDesembarque = localDesembarque.trim();
      if (observacoes !== undefined) updates.observacoes = observacoes.trim();

      const validStatus: ViagemStatus[] = ['PLANEJADA', 'EM_ANDAMENTO', 'CONCLUÍDA', 'CANCELADA'];
      if (status && validStatus.includes(status)) {
        updates.status = status;
      }

      const updated = await db.viagens.updateOne(req.params.id, updates);

      await logAudit(req, {
        acao: 'EDICAO_VIAGEM',
        entidade: 'Viagem',
        entidadeId: existing.id,
        detalhes: `Viagem atualizada: ${existing.alunoNome} (${updates.origem || existing.origem} -> ${updates.destino || existing.destino})`,
      });

      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Erro ao atualizar viagem.' });
    }
  }
);

// DELETE /api/viagens/:id
viagensRouter.delete(
  '/viagens/:id',
  authenticateToken,
  requireRoles('ADMIN_HOST', 'ADMIN'),
  async (req: Request, res: Response) => {
    try {
      const existing = await db.viagens.findById(req.params.id);
      if (!existing) {
        res.status(404).json({ error: 'NOT_FOUND', message: 'Viagem não encontrada.' });
        return;
      }

      await db.viagens.deleteOne(req.params.id);

      await logAudit(req, {
        acao: 'EXCLUSAO_VIAGEM',
        entidade: 'Viagem',
        entidadeId: existing.id,
        detalhes: `Viagem excluída: ${existing.alunoNome} (${existing.origem} -> ${existing.destino})`,
      });

      res.json({ message: 'Viagem excluída com sucesso.' });
    } catch (error: any) {
      res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Erro ao excluir viagem.' });
    }
  }
);
