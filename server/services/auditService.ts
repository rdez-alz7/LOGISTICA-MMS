import { Request } from 'express';
import { db } from '../db/database.js';
import { AuditLog } from '../types/index.js';

export async function logAudit(
  req: Request | null,
  data: {
    acao: string;
    entidade: string;
    entidadeId?: string;
    detalhes?: string;
    userOverride?: { id: string; name: string; role: string };
  }
): Promise<AuditLog> {
  const user = data.userOverride || (req as any)?.user || {
    id: 'anonymous',
    name: 'Anônimo / Visitante',
    role: 'PUBLIC',
  };

  const ip = req
    ? (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || '127.0.0.1'
    : '127.0.0.1';

  const entry: AuditLog = {
    id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    acao: data.acao,
    entidade: data.entidade,
    entidadeId: data.entidadeId,
    detalhes: data.detalhes,
    timestamp: new Date().toISOString(),
    ip,
  };

  await db.auditoria.insertOne(entry);
  return entry;
}
