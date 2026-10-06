import { Router, Request, Response } from 'express';
import { db } from '../db/database.js';
import { authenticateToken, requireRoles } from '../services/authService.js';
import { logAudit } from '../services/auditService.js';
import { analyzeDocumentWithAI } from '../services/documentAnalysisService.js';
import { matchCandidatesForDocument } from '../services/matchingService.js';
import { Documento, DocumentoTipo } from '../types/index.js';

export const documentosRouter = Router();

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

// GET /api/documentos
documentosRouter.get('/documentos', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { alunoId, viagemId, tipo, search } = req.query;
    const filter = {
      alunoId: typeof alunoId === 'string' && alunoId ? alunoId : undefined,
      viagemId: typeof viagemId === 'string' && viagemId ? viagemId : undefined,
      tipo: typeof tipo === 'string' && tipo ? tipo : undefined,
      search: typeof search === 'string' ? search : undefined,
    };

    const docs = await db.documentos.find(filter);
    // Don't send heavy base64 strings in list view
    const list = docs.map(({ dataBase64, ...rest }) => rest);
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Erro ao buscar documentos.' });
  }
});

// GET /api/documentos/:id
documentosRouter.get('/documentos/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const doc = await db.documentos.findById(req.params.id);
    if (!doc) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Documento não encontrado.' });
      return;
    }
    res.json(doc);
  } catch (error: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Erro ao buscar documento.' });
  }
});

// GET /api/documentos/:id/download
documentosRouter.get('/documentos/:id/download', authenticateToken, async (req: Request, res: Response) => {
  try {
    const doc = await db.documentos.findById(req.params.id);
    if (!doc) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Documento não encontrado.' });
      return;
    }

    if (!doc.dataBase64) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Arquivo físico não disponível.' });
      return;
    }

    const cleanBase64 = doc.dataBase64.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');

    res.setHeader('Content-Type', doc.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(doc.filename)}"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (error: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Erro ao baixar arquivo.' });
  }
});

// POST /api/documentos
documentosRouter.post(
  '/documentos',
  authenticateToken,
  requireRoles('ADMIN_HOST', 'ADMIN', 'GESTOR'),
  async (req: Request, res: Response) => {
    try {
      const { titulo, tipo, alunoId, viagemId, filename, mimeType, fileSize, fileBase64 } = req.body;

      if (!titulo || !titulo.trim()) {
        res.status(400).json({ error: 'BAD_REQUEST', message: 'O título do documento é obrigatório.' });
        return;
      }

      const validTipos: DocumentoTipo[] = ['passagem/ticket', 'documento pessoal', 'recibo', 'declaração', 'outro'];
      const docTipo: DocumentoTipo = validTipos.includes(tipo) ? tipo : 'outro';

      // Validation for uploaded file
      let safeFilename = filename?.replace(/[^a-zA-Z0-9._-]/g, '_') || 'documento.pdf';
      let safeMime = mimeType || 'application/pdf';
      let safeSize = typeof fileSize === 'number' ? fileSize : 0;

      if (fileBase64) {
        // Validate MIME type
        if (!ALLOWED_MIME_TYPES.includes(safeMime)) {
          res.status(400).json({
            error: 'BAD_REQUEST',
            message: 'Tipo de arquivo não permitido. Formatos aceitos: JPG, PNG, WEBP, PDF.',
          });
          return;
        }

        // Validate extension
        const ext = safeFilename.slice(safeFilename.lastIndexOf('.')).toLowerCase();
        if (!ALLOWED_EXTENSIONS.includes(ext)) {
          res.status(400).json({
            error: 'BAD_REQUEST',
            message: `Extensão '${ext}' não permitida. Envie arquivos JPG, PNG, WEBP ou PDF.`,
          });
          return;
        }

        if (safeSize > MAX_FILE_SIZE) {
          res.status(400).json({
            error: 'BAD_REQUEST',
            message: 'Arquivo excede o limite máximo permitido de 15MB.',
          });
          return;
        }
      }

      let alunoNome = undefined;
      if (alunoId) {
        const aluno = await db.alunos.findById(alunoId);
        if (aluno) {
          alunoNome = aluno.nome;
        }
      }

      const newDoc: Documento = {
        id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        titulo: titulo.trim(),
        tipo: docTipo,
        alunoId: alunoId || undefined,
        alunoNome,
        viagemId: viagemId || undefined,
        filename: safeFilename,
        mimeType: safeMime,
        fileSize: safeSize,
        dataBase64: fileBase64 || undefined,
        analiseStatus: 'NAO_ANALISADO',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await db.documentos.insertOne(newDoc);

      await logAudit(req, {
        acao: 'UPLOAD_DOCUMENTO',
        entidade: 'Documento',
        entidadeId: newDoc.id,
        detalhes: `Documento adicionado: "${newDoc.titulo}" (${newDoc.tipo})${alunoNome ? ` vinculado ao aluno ${alunoNome}` : ''}`,
      });

      const { dataBase64, ...rest } = newDoc;
      res.status(201).json(rest);
    } catch (error: any) {
      console.error('Erro ao salvar documento:', error);
      res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Erro ao processar documento.' });
    }
  }
);

// POST /api/documentos/:id/analisar (Manual analysis only!)
documentosRouter.post(
  '/documentos/:id/analisar',
  authenticateToken,
  requireRoles('ADMIN_HOST', 'ADMIN', 'GESTOR'),
  async (req: Request, res: Response) => {
    try {
      const doc = await db.documentos.findById(req.params.id);
      if (!doc) {
        res.status(404).json({ error: 'NOT_FOUND', message: 'Documento não encontrado.' });
        return;
      }

      const result = await analyzeDocumentWithAI(doc.titulo, doc.tipo, doc.dataBase64, doc.mimeType);

      if (!result.success) {
        await db.documentos.updateOne(doc.id, {
          analiseStatus: 'ERRO',
          analiseMensagem: result.message,
        });

        await logAudit(req, {
          acao: 'ANALISE_DOCUMENTO_FALHA',
          entidade: 'Documento',
          entidadeId: doc.id,
          detalhes: `Tentativa de análise de "${doc.titulo}": ${result.message}`,
        });

        res.status(422).json({
          error: 'ANALYSIS_UNAVAILABLE',
          message: result.message,
          analiseStatus: 'ERRO',
        });
        return;
      }

      // Find matching candidates based on priority
      const candidates = await matchCandidatesForDocument(result.data);

      const updated = await db.documentos.updateOne(doc.id, {
        analiseStatus: 'ANALISADO',
        analiseMensagem: 'Análise concluída com sucesso.',
        analiseDados: result.data,
        candidatos: candidates,
      });

      await logAudit(req, {
        acao: 'ANALISE_DOCUMENTO_SUCESSO',
        entidade: 'Documento',
        entidadeId: doc.id,
        detalhes: `Análise realizada para "${doc.titulo}". ${candidates.length} candidato(s) sugerido(s).`,
      });

      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Erro ao executar análise do documento.' });
    }
  }
);

// POST /api/documentos/:id/vincular
documentosRouter.post(
  '/documentos/:id/vincular',
  authenticateToken,
  requireRoles('ADMIN_HOST', 'ADMIN', 'GESTOR'),
  async (req: Request, res: Response) => {
    try {
      const { alunoId, viagemId } = req.body;
      const doc = await db.documentos.findById(req.params.id);
      if (!doc) {
        res.status(404).json({ error: 'NOT_FOUND', message: 'Documento não encontrado.' });
        return;
      }

      let alunoNome = doc.alunoNome;
      if (alunoId) {
        const aluno = await db.alunos.findById(alunoId);
        if (!aluno) {
          res.status(400).json({ error: 'BAD_REQUEST', message: 'Aluno não encontrado.' });
          return;
        }
        alunoNome = aluno.nome;
      }

      const updated = await db.documentos.updateOne(doc.id, {
        alunoId: alunoId || doc.alunoId,
        alunoNome,
        viagemId: viagemId !== undefined ? viagemId : doc.viagemId,
      });

      await logAudit(req, {
        acao: 'VINCULO_DOCUMENTO',
        entidade: 'Documento',
        entidadeId: doc.id,
        detalhes: `Documento "${doc.titulo}" vinculado ao aluno ${alunoNome}`,
      });

      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Erro ao vincular documento.' });
    }
  }
);

// POST /api/documentos/:id/desvincular
documentosRouter.post(
  '/documentos/:id/desvincular',
  authenticateToken,
  requireRoles('ADMIN_HOST', 'ADMIN', 'GESTOR'),
  async (req: Request, res: Response) => {
    try {
      const doc = await db.documentos.findById(req.params.id);
      if (!doc) {
        res.status(404).json({ error: 'NOT_FOUND', message: 'Documento não encontrado.' });
        return;
      }

      const prevAluno = doc.alunoNome || 'Sem vínculo anterior';
      const updated = await db.documentos.updateOne(doc.id, {
        alunoId: undefined,
        alunoNome: undefined,
        viagemId: undefined,
      });

      await logAudit(req, {
        acao: 'DESVINCULO_DOCUMENTO',
        entidade: 'Documento',
        entidadeId: doc.id,
        detalhes: `Documento "${doc.titulo}" desvinculado de ${prevAluno}`,
      });

      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Erro ao desvincular documento.' });
    }
  }
);

// DELETE /api/documentos/:id
documentosRouter.delete(
  '/documentos/:id',
  authenticateToken,
  requireRoles('ADMIN_HOST', 'ADMIN'),
  async (req: Request, res: Response) => {
    try {
      const doc = await db.documentos.findById(req.params.id);
      if (!doc) {
        res.status(404).json({ error: 'NOT_FOUND', message: 'Documento não encontrado.' });
        return;
      }

      await db.documentos.deleteOne(req.params.id);

      await logAudit(req, {
        acao: 'EXCLUSAO_DOCUMENTO',
        entidade: 'Documento',
        entidadeId: doc.id,
        detalhes: `Documento excluído: "${doc.titulo}"`,
      });

      res.json({ message: 'Documento excluído com sucesso.' });
    } catch (error: any) {
      res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Erro ao excluir documento.' });
    }
  }
);
