import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from '../db/database.js';
import { User, UserRole } from '../types/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'log_mms_jwt_secret_token_secure_2026';
const TOKEN_EXPIRY = '7d';

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  name: string;
  username: string;
}

export function generateToken(user: User): string {
  const payload: TokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
    username: user.username,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (err) {
    return null;
  }
}

export function hashPassword(password: string): string {
  const salt = bcrypt.genSaltSync(10);
  return bcrypt.hashSync(password, salt);
}

export function comparePassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

// Express Auth Middleware
export async function authenticateToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Sessão não autenticada. Por favor faça login.',
    });
    return;
  }

  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({
      error: 'INVALID_TOKEN',
      message: 'Token de autenticação expirado ou inválido.',
    });
    return;
  }

  const user = await db.users.findById(payload.userId);
  if (!user || user.status !== 'ATIVO') {
    res.status(401).json({
      error: 'USER_INACTIVE',
      message: 'Usuário inativo ou inexistente.',
    });
    return;
  }

  (req as any).user = {
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    role: user.role,
  };

  next();
}

// Role checking middleware
export function requireRoles(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ error: 'UNAUTHORIZED', message: 'Sessão necessária.' });
      return;
    }

    if (!allowedRoles.includes(user.role)) {
      res.status(403).json({
        error: 'FORBIDDEN',
        message: 'Acesso negado. Sua função não possui permissão para esta operação.',
      });
      return;
    }

    next();
  };
}
