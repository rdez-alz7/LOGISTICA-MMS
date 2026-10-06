import { Router, Request, Response } from 'express';
import { db } from '../db/database.js';
import { authenticateToken, requireRoles, hashPassword } from '../services/authService.js';
import { logAudit } from '../services/auditService.js';
import { User, UserRole } from '../types/index.js';

export const usersRouter = Router();

// GET /api/users
usersRouter.get(
  '/users',
  authenticateToken,
  requireRoles('ADMIN_HOST', 'ADMIN'),
  async (_req: Request, res: Response) => {
    try {
      const users = await db.users.find();
      const safe = users.map(({ passwordHash, ...rest }) => rest);
      res.json(safe);
    } catch (error: any) {
      res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Erro ao listar usuários.' });
    }
  }
);

// POST /api/users (Direct user creation by admin)
usersRouter.post(
  '/users',
  authenticateToken,
  requireRoles('ADMIN_HOST'),
  async (req: Request, res: Response) => {
    try {
      const { name, username, email, password, role } = req.body;

      if (!name || !username || !email || !password) {
        res.status(400).json({ error: 'BAD_REQUEST', message: 'Preencha todos os campos obrigatórios.' });
        return;
      }

      const existing = await db.users.findByEmailOrUsername(email);
      if (existing) {
        res.status(400).json({ error: 'USER_EXISTS', message: 'E-mail ou nome de usuário já em uso.' });
        return;
      }

      const validRoles: UserRole[] = ['ADMIN_HOST', 'ADMIN', 'GESTOR', 'VISUALIZADOR'];
      const userRole: UserRole = validRoles.includes(role) ? role : 'GESTOR';

      const newUser: User = {
        id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: name.trim(),
        username: username.toLowerCase().trim(),
        email: email.toLowerCase().trim(),
        passwordHash: hashPassword(password),
        role: userRole,
        status: 'ATIVO',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await db.users.insertOne(newUser);

      await logAudit(req, {
        acao: 'CRIACAO_USUARIO',
        entidade: 'User',
        entidadeId: newUser.id,
        detalhes: `Usuário ${newUser.username} criado com função ${newUser.role}`,
      });

      const { passwordHash, ...rest } = newUser;
      res.status(201).json(rest);
    } catch (error: any) {
      res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Erro ao criar usuário.' });
    }
  }
);

// PUT /api/users/:id (Update role or status)
usersRouter.put(
  '/users/:id',
  authenticateToken,
  requireRoles('ADMIN_HOST'),
  async (req: Request, res: Response) => {
    try {
      const { role, status } = req.body;
      const user = await db.users.findById(req.params.id);

      if (!user) {
        res.status(404).json({ error: 'NOT_FOUND', message: 'Usuário não encontrado.' });
        return;
      }

      const updates: Partial<User> = {};
      if (role) {
        const validRoles: UserRole[] = ['ADMIN_HOST', 'ADMIN', 'GESTOR', 'VISUALIZADOR'];
        if (validRoles.includes(role)) updates.role = role;
      }
      if (status && (status === 'ATIVO' || status === 'INATIVO')) {
        updates.status = status;
      }

      const updated = await db.users.updateOne(user.id, updates);

      await logAudit(req, {
        acao: 'EDICAO_USUARIO',
        entidade: 'User',
        entidadeId: user.id,
        detalhes: `Usuário ${user.username} atualizado (Role: ${updates.role || user.role}, Status: ${updates.status || user.status})`,
      });

      const { passwordHash, ...rest } = updated!;
      res.json(rest);
    } catch (error: any) {
      res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Erro ao atualizar usuário.' });
    }
  }
);

// PUT /api/users/:id/reset-password (Secure admin reset password)
usersRouter.put(
  '/users/:id/reset-password',
  authenticateToken,
  requireRoles('ADMIN_HOST'),
  async (req: Request, res: Response) => {
    try {
      const { newPassword } = req.body;
      if (!newPassword || newPassword.length < 4) {
        res.status(400).json({ error: 'BAD_REQUEST', message: 'A nova senha deve ter no mínimo 4 caracteres.' });
        return;
      }

      const user = await db.users.findById(req.params.id);
      if (!user) {
        res.status(404).json({ error: 'NOT_FOUND', message: 'Usuário não encontrado.' });
        return;
      }

      const passwordHash = hashPassword(newPassword);
      await db.users.updateOne(user.id, { passwordHash });

      await logAudit(req, {
        acao: 'REDEFINICAO_SENHA_ADMIN',
        entidade: 'User',
        entidadeId: user.id,
        detalhes: `Senha do usuário ${user.username} redefinida pelo administrador`,
      });

      res.json({ message: 'Senha redefinida com sucesso.' });
    } catch (error: any) {
      res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Erro ao redefinir senha.' });
    }
  }
);
