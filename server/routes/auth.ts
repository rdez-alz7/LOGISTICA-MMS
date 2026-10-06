import { Router, Request, Response } from 'express';
import { db } from '../db/database.js';
import {
  generateToken,
  comparePassword,
  hashPassword,
  authenticateToken,
} from '../services/authService.js';
import { logAudit } from '../services/auditService.js';

export const authRouter = Router();

// GET /api/health - Public health check
authRouter.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// POST /api/auth/login
authRouter.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;
    const identifier = username || email;

    if (!identifier || !password) {
      res.status(400).json({
        error: 'BAD_REQUEST',
        message: 'Informe o e-mail ou usuário e a senha.',
      });
      return;
    }

    const user = await db.users.findByEmailOrUsername(identifier);
    if (!user) {
      res.status(401).json({
        error: 'INVALID_CREDENTIALS',
        message: 'Usuário ou senha inválidos.',
      });
      return;
    }

    if (user.status !== 'ATIVO') {
      res.status(403).json({
        error: 'ACCOUNT_INACTIVE',
        message: 'Conta inativa. Entre em contato com o administrador.',
      });
      return;
    }

    const isValid = comparePassword(password, user.passwordHash);
    if (!isValid) {
      res.status(401).json({
        error: 'INVALID_CREDENTIALS',
        message: 'Usuário ou senha inválidos.',
      });
      return;
    }

    const token = generateToken(user);

    await logAudit(req, {
      acao: 'LOGIN',
      entidade: 'User',
      entidadeId: user.id,
      detalhes: `Login efetuado com sucesso por ${user.username}`,
      userOverride: { id: user.id, name: user.name, role: user.role },
    });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error: any) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Erro interno ao processar login.' });
  }
});

// GET /api/auth/me
authRouter.get('/auth/me', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userReq = (req as any).user;
    const user = await db.users.findById(userReq.id);

    if (!user) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Usuário não encontrado.' });
      return;
    }

    res.json({
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Erro ao obter dados do usuário.' });
  }
});

// POST /api/auth/logout
authRouter.post('/auth/logout', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    await logAudit(req, {
      acao: 'LOGOUT',
      entidade: 'User',
      entidadeId: user.id,
      detalhes: `Logout efetuado por ${user.name}`,
    });
    res.json({ message: 'Desconectado com sucesso.' });
  } catch (error: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Erro ao efetuar logout.' });
  }
});

// POST /api/auth/change-password
authRouter.post('/auth/change-password', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userReq = (req as any).user;

    if (!newPassword || newPassword.length < 4) {
      res.status(400).json({
        error: 'BAD_REQUEST',
        message: 'A nova senha deve possuir pelo menos 4 caracteres.',
      });
      return;
    }

    const user = await db.users.findById(userReq.id);
    if (!user) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Usuário não encontrado.' });
      return;
    }

    if (!comparePassword(currentPassword, user.passwordHash)) {
      res.status(400).json({ error: 'BAD_REQUEST', message: 'Senha atual incorreta.' });
      return;
    }

    const passwordHash = hashPassword(newPassword);
    await db.users.updateOne(user.id, { passwordHash });

    await logAudit(req, {
      acao: 'ALTERACAO_SENHA',
      entidade: 'User',
      entidadeId: user.id,
      detalhes: 'Senha alterada pelo próprio usuário',
    });

    res.json({ message: 'Senha alterada com sucesso.' });
  } catch (error: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Erro ao alterar senha.' });
  }
});
