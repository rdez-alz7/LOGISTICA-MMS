import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { db } from '../db/database.js';
import { authenticateToken, requireRoles, hashPassword } from '../services/authService.js';
import { logAudit } from '../services/auditService.js';
import { User, UserInvitation } from '../types/index.js';

export const invitationsRouter = Router();

const INVITATION_EXPIRATION_HOURS = 48;

// GET /api/invitations (Protected)
invitationsRouter.get(
  '/invitations',
  authenticateToken,
  requireRoles('ADMIN_HOST', 'ADMIN'),
  async (_req: Request, res: Response) => {
    try {
      const list = await db.user_invitations.find();
      // Check for expired status on fetch
      const now = new Date().toISOString();
      const updatedList = list.map((inv) => {
        if (inv.status === 'PENDENTE' && inv.expiresAt < now) {
          return { ...inv, status: 'EXPIRADO' as const };
        }
        return inv;
      });
      res.json(updatedList);
    } catch (error: any) {
      res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Erro ao listar convites.' });
    }
  }
);

// POST /api/invitations (ADMIN_HOST only)
invitationsRouter.post(
  '/invitations',
  authenticateToken,
  requireRoles('ADMIN_HOST'),
  async (req: Request, res: Response) => {
    try {
      const { nome, email, role } = req.body;

      if (!nome || !email) {
        res.status(400).json({ error: 'BAD_REQUEST', message: 'Nome e e-mail são obrigatórios.' });
        return;
      }

      const validRoles = ['ADMIN', 'GESTOR', 'VISUALIZADOR'];
      if (!validRoles.includes(role)) {
        res.status(400).json({
          error: 'BAD_REQUEST',
          message: 'Função inválida. Selecione ADMIN, GESTOR ou VISUALIZADOR.',
        });
        return;
      }

      const cleanEmail = email.toLowerCase().trim();

      // Check if user already exists
      const existingUser = await db.users.findByEmailOrUsername(cleanEmail);
      if (existingUser) {
        res.status(400).json({
          error: 'USER_EXISTS',
          message: 'Já existe um usuário cadastrado com este e-mail no sistema.',
        });
        return;
      }

      // Generate 32-byte secure hex token
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + INVITATION_EXPIRATION_HOURS * 3600 * 1000).toISOString();

      const newInvitation: UserInvitation = {
        id: `inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        nome: nome.trim(),
        email: cleanEmail,
        role,
        token,
        status: 'PENDENTE',
        expiresAt,
        createdAt: new Date().toISOString(),
      };

      await db.user_invitations.insertOne(newInvitation);

      await logAudit(req, {
        acao: 'CRIACAO_CONVITE',
        entidade: 'UserInvitation',
        entidadeId: newInvitation.id,
        detalhes: `Convite gerado para ${newInvitation.nome} (${newInvitation.email}) com função ${newInvitation.role}`,
      });

      res.status(201).json({
        message: 'Convite criado.',
        invitation: newInvitation,
        inviteUrl: `/convite/${token}`,
      });
    } catch (error: any) {
      res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Erro ao gerar convite.' });
    }
  }
);

// DELETE /api/invitations/:id (Cancel invite)
invitationsRouter.delete(
  '/invitations/:id',
  authenticateToken,
  requireRoles('ADMIN_HOST'),
  async (req: Request, res: Response) => {
    try {
      const invite = await db.user_invitations.findById(req.params.id);
      if (!invite) {
        res.status(404).json({ error: 'NOT_FOUND', message: 'Convite não encontrado.' });
        return;
      }

      await db.user_invitations.updateOne(invite.id, { status: 'CANCELADO' });

      await logAudit(req, {
        acao: 'CANCELAMENTO_CONVITE',
        entidade: 'UserInvitation',
        entidadeId: invite.id,
        detalhes: `Convite para ${invite.email} cancelado`,
      });

      res.json({ message: 'Convite cancelado com sucesso.' });
    } catch (error: any) {
      res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Erro ao cancelar convite.' });
    }
  }
);

// POST /api/invitations/:id/resend (Generate new token / reset expiration)
invitationsRouter.post(
  '/invitations/:id/resend',
  authenticateToken,
  requireRoles('ADMIN_HOST'),
  async (req: Request, res: Response) => {
    try {
      const invite = await db.user_invitations.findById(req.params.id);
      if (!invite) {
        res.status(404).json({ error: 'NOT_FOUND', message: 'Convite não encontrado.' });
        return;
      }

      const newToken = crypto.randomBytes(32).toString('hex');
      const newExpiresAt = new Date(Date.now() + INVITATION_EXPIRATION_HOURS * 3600 * 1000).toISOString();

      const updated = await db.user_invitations.updateOne(invite.id, {
        token: newToken,
        expiresAt: newExpiresAt,
        status: 'PENDENTE',
      });

      await logAudit(req, {
        acao: 'REENVIO_CONVITE',
        entidade: 'UserInvitation',
        entidadeId: invite.id,
        detalhes: `Novo token gerado para convite de ${invite.email}`,
      });

      res.json({
        message: 'Convite renovado com sucesso.',
        invitation: updated,
        inviteUrl: `/convite/${newToken}`,
      });
    } catch (error: any) {
      res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Erro ao renovar convite.' });
    }
  }
);

// GET /api/invitations/verify/:token (PUBLIC)
invitationsRouter.get('/invitations/verify/:token', async (req: Request, res: Response) => {
  try {
    const invite = await db.user_invitations.findByToken(req.params.token);

    if (!invite) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Convite não encontrado ou inválido.' });
      return;
    }

    if (invite.status === 'ACEITO') {
      res.status(400).json({ error: 'ALREADY_USED', message: 'Este convite já foi utilizado.' });
      return;
    }

    if (invite.status === 'CANCELADO') {
      res.status(400).json({ error: 'CANCELLED', message: 'Este convite foi cancelado pelo administrador.' });
      return;
    }

    const now = new Date().toISOString();
    if (invite.expiresAt < now) {
      await db.user_invitations.updateOne(invite.id, { status: 'EXPIRADO' });
      res.status(400).json({ error: 'EXPIRED', message: 'Este convite expirou (validade de 48 horas excedida).' });
      return;
    }

    res.json({
      valid: true,
      nome: invite.nome,
      email: invite.email,
      role: invite.role,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Erro ao verificar convite.' });
  }
});

// POST /api/invitations/accept/:token (PUBLIC)
invitationsRouter.post('/invitations/accept/:token', async (req: Request, res: Response) => {
  try {
    const { password, confirmPassword } = req.body;
    const invite = await db.user_invitations.findByToken(req.params.token);

    if (!invite) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Convite não encontrado.' });
      return;
    }

    if (invite.status !== 'PENDENTE') {
      res.status(400).json({
        error: 'INVALID_STATUS',
        message: `Este convite não está mais pendente (Status: ${invite.status}).`,
      });
      return;
    }

    const now = new Date().toISOString();
    if (invite.expiresAt < now) {
      await db.user_invitations.updateOne(invite.id, { status: 'EXPIRADO' });
      res.status(400).json({ error: 'EXPIRED', message: 'Este convite expirou.' });
      return;
    }

    if (!password || password.length < 4) {
      res.status(400).json({
        error: 'BAD_REQUEST',
        message: 'A senha deve conter no mínimo 4 caracteres.',
      });
      return;
    }

    if (password !== confirmPassword) {
      res.status(400).json({
        error: 'BAD_REQUEST',
        message: 'As senhas informadas não coincidem.',
      });
      return;
    }

    // Create user account
    const baseUsername = invite.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    let finalUsername = baseUsername;
    let count = 1;
    while (await db.users.findByEmailOrUsername(finalUsername)) {
      finalUsername = `${baseUsername}${count++}`;
    }

    const newUser: User = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: invite.nome,
      username: finalUsername,
      email: invite.email,
      passwordHash: hashPassword(password),
      role: invite.role,
      status: 'ATIVO',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.users.insertOne(newUser);

    // Invalidate token
    await db.user_invitations.updateOne(invite.id, {
      status: 'ACEITO',
      usedAt: new Date().toISOString(),
    });

    await logAudit(req, {
      acao: 'ACEITE_CONVITE',
      entidade: 'UserInvitation',
      entidadeId: invite.id,
      detalhes: `Convite aceito por ${invite.email}. Usuário criado: ${newUser.username} (${newUser.role})`,
      userOverride: { id: newUser.id, name: newUser.name, role: newUser.role },
    });

    res.json({
      message: 'Conta ativada com sucesso! Você já pode entrar no sistema.',
      username: newUser.username,
    });
  } catch (error: any) {
    console.error('Erro ao aceitar convite:', error);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Erro ao aceitar convite.' });
  }
});
