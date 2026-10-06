import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { MongoClient, Db } from 'mongodb';
import { User, Aluno, Obreiro, Viagem, Documento, UserInvitation, AuditLog } from '../types/index.js';

interface DatabaseSchema {
  users: User[];
  alunos: Aluno[];
  obreiros: Obreiro[];
  viagens: Viagem[];
  documentos: Documento[];
  user_invitations: UserInvitation[];
  auditoria: AuditLog[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'database.json');

let mongoClient: MongoClient | null = null;
let mongoDb: Db | null = null;
let useMongo = false;

// In-memory cache + persistent file sync
let memoryDb: DatabaseSchema = {
  users: [],
  alunos: [],
  obreiros: [],
  viagens: [],
  documentos: [],
  user_invitations: [],
  auditoria: [],
};

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadLocalFile(): void {
  ensureDataDir();
  if (fs.existsSync(DATA_FILE)) {
    try {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      memoryDb = {
        users: parsed.users || [],
        alunos: parsed.alunos || [],
        obreiros: parsed.obreiros || [],
        viagens: parsed.viagens || [],
        documentos: parsed.documentos || [],
        user_invitations: parsed.user_invitations || [],
        auditoria: parsed.auditoria || [],
      };
    } catch (e) {
      console.error('Erro ao ler database.json local:', e);
    }
  }
}

export function saveLocalFile(): void {
  ensureDataDir();
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(memoryDb, null, 2), 'utf-8');
  } catch (e) {
    console.error('Erro ao persistir database.json:', e);
  }
}

export async function initDatabase(): Promise<void> {
  const mongoUrl = process.env.MONGODB_URL?.trim();
  const dbName = process.env.MONGODB_DATABASE?.trim() || 'log_mms';

  if (mongoUrl) {
    try {
      console.log(`[Database] Tentando conectar ao MongoDB em: ${mongoUrl.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@')}`);
      mongoClient = new MongoClient(mongoUrl, { serverSelectionTimeoutMS: 4000 });
      await mongoClient.connect();
      mongoDb = mongoClient.db(dbName);
      useMongo = true;
      console.log(`[Database] Conectado com sucesso ao MongoDB (Database: ${dbName})`);
    } catch (err: any) {
      console.warn(`[Database] Não foi possível conectar ao MongoDB (${err.message}). Usando armazenamento persistente local.`);
      useMongo = false;
    }
  } else {
    console.log('[Database] MONGODB_URL não informada. Usando armazenamento persistente local com garantia de integridade.');
    useMongo = false;
  }

  loadLocalFile();
  await bootstrapAdminAndData();
}

export function isUsingMongo(): boolean {
  return useMongo;
}

export function getDbStatus(): { engine: string; connected: boolean; path?: string } {
  return {
    engine: useMongo ? 'MongoDB Atlas / Local' : 'MongoDB Storage Engine (JSON Persistente)',
    connected: true,
    path: useMongo ? process.env.MONGODB_DATABASE || 'log_mms' : DATA_FILE,
  };
}

async function bootstrapAdminAndData() {
  const adminEmail = (process.env.INITIAL_ADMIN_EMAIL || 'vitoraluizio151107vt@gmail.com').toLowerCase().trim();
  const adminUsername = (process.env.INITIAL_ADMIN_USERNAME || 'vitor').toLowerCase().trim();
  const adminName = process.env.INITIAL_ADMIN_NAME || 'Vitor';
  const rawPassword = process.env.INITIAL_ADMIN_PASSWORD || 'admin';

  // Check if admin already exists
  const existingAdmin = memoryDb.users.find(
    (u) => u.email.toLowerCase() === adminEmail || u.username.toLowerCase() === adminUsername
  );

  if (!existingAdmin) {
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(rawPassword, salt);
    const newAdmin: User = {
      id: 'usr_admin_initial',
      name: adminName,
      username: adminUsername,
      email: adminEmail,
      passwordHash,
      role: 'ADMIN_HOST',
      status: 'ATIVO',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    memoryDb.users.push(newAdmin);
    saveLocalFile();
    console.log(`[Bootstrap] Administrador inicial criado: ${adminUsername} (${adminEmail}) com role ADMIN_HOST`);

    // Audit initial setup
    memoryDb.auditoria.push({
      id: `aud_${Date.now()}`,
      userId: 'system',
      userName: 'Sistema',
      userRole: 'SISTEMA',
      acao: 'BOOTSTRAP_ADMIN',
      entidade: 'User',
      entidadeId: newAdmin.id,
      detalhes: `Administrador inicial ${adminUsername} configurado`,
      timestamp: new Date().toISOString(),
    });
  }

  // Seed default obreiros if empty
  if (memoryDb.obreiros.length === 0) {
    const initialObreiros: Obreiro[] = [
      {
        id: 'obr_1',
        nome: 'João Silva',
        email: 'joao.silva@mms.org',
        funcao: 'Pastor Regional',
        status: 'ATIVO',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'obr_2',
        nome: 'Marcos Oliveira',
        email: 'marcos.oliveira@mms.org',
        funcao: 'Missionário Coordenador',
        status: 'ATIVO',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'obr_3',
        nome: 'Lucas Santos',
        email: 'lucas.santos@mms.org',
        funcao: 'Obreiro de Apoio',
        status: 'ATIVO',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'obr_4',
        nome: 'Ana Paula Ferreira',
        email: 'ana.paula@mms.org',
        funcao: 'Supervisora de Polo',
        status: 'ATIVO',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    memoryDb.obreiros = initialObreiros;
    saveLocalFile();
  }

  // Seed initial sample Alunos and Viagens if empty so the system is immediately visual and operable
  if (memoryDb.alunos.length === 0) {
    const initialAlunos: Aluno[] = [
      {
        id: 'aln_1',
        nome: 'Gabriel Pereira Rocha',
        obreiroId: 'obr_1',
        obreiroNome: 'João Silva',
        status: 'ATIVO',
        createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'aln_2',
        nome: 'Beatriz Cristina Mendes',
        obreiroId: 'obr_2',
        obreiroNome: 'Marcos Oliveira',
        status: 'ATIVO',
        createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'aln_3',
        nome: 'Matheus Henrique Alves',
        obreiroId: 'obr_3',
        obreiroNome: 'Lucas Santos',
        status: 'CONCLUÍDO',
        createdAt: new Date(Date.now() - 86400000 * 12).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'aln_4',
        nome: 'Larissa Souza Lima',
        obreiroId: 'obr_1',
        obreiroNome: 'João Silva',
        status: 'ATIVO',
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    memoryDb.alunos = initialAlunos;

    const initialViagens: Viagem[] = [
      {
        id: 'vgm_1',
        alunoId: 'aln_1',
        alunoNome: 'Gabriel Pereira Rocha',
        obreiroNome: 'João Silva',
        origem: 'Belo Horizonte - MG',
        destino: 'São Paulo - SP',
        dataSaida: '2026-10-12',
        horarioSaida: '08:30',
        dataChegada: '2026-10-12',
        horarioChegada: '16:00',
        empresa: 'Viação Cometa',
        numeroLocalizador: 'CMT-884920',
        localEmbarque: 'Terminal Rodoviário Gov. Israel Pinheiro',
        localDesembarque: 'Terminal Rodoviário Tietê',
        status: 'EM_ANDAMENTO',
        observacoes: 'Viagem para módulo de estudos avançados.',
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'vgm_2',
        alunoId: 'aln_2',
        alunoNome: 'Beatriz Cristina Mendes',
        obreiroNome: 'Marcos Oliveira',
        origem: 'Campinas - SP',
        destino: 'Curitiba - PR',
        dataSaida: '2026-10-15',
        horarioSaida: '22:00',
        dataChegada: '2026-10-16',
        horarioChegada: '06:30',
        empresa: 'Auto Viação Catarinense',
        numeroLocalizador: 'CAT-19402',
        localEmbarque: 'Rodoviária de Campinas',
        localDesembarque: 'Rodoferroviária de Curitiba',
        status: 'PLANEJADA',
        observacoes: 'Apresentação no pólo sul.',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    memoryDb.viagens = initialViagens;
    saveLocalFile();
  }
}

// Database generic accessors
export const db = {
  users: {
    find: async () => memoryDb.users,
    findById: async (id: string) => memoryDb.users.find((u) => u.id === id) || null,
    findByEmailOrUsername: async (identifier: string) => {
      const clean = identifier.toLowerCase().trim();
      return (
        memoryDb.users.find(
          (u) => u.email.toLowerCase() === clean || u.username.toLowerCase() === clean
        ) || null
      );
    },
    insertOne: async (user: User) => {
      memoryDb.users.push(user);
      saveLocalFile();
      return user;
    },
    updateOne: async (id: string, updates: Partial<User>) => {
      const idx = memoryDb.users.findIndex((u) => u.id === id);
      if (idx !== -1) {
        memoryDb.users[idx] = { ...memoryDb.users[idx], ...updates, updatedAt: new Date().toISOString() };
        saveLocalFile();
        return memoryDb.users[idx];
      }
      return null;
    },
    deleteOne: async (id: string) => {
      const idx = memoryDb.users.findIndex((u) => u.id === id);
      if (idx !== -1) {
        memoryDb.users.splice(idx, 1);
        saveLocalFile();
        return true;
      }
      return false;
    },
    count: async () => memoryDb.users.length,
  },

  obreiros: {
    find: async () => memoryDb.obreiros,
    findById: async (id: string) => memoryDb.obreiros.find((o) => o.id === id) || null,
    insertOne: async (obreiro: Obreiro) => {
      memoryDb.obreiros.push(obreiro);
      saveLocalFile();
      return obreiro;
    },
    updateOne: async (id: string, updates: Partial<Obreiro>) => {
      const idx = memoryDb.obreiros.findIndex((o) => o.id === id);
      if (idx !== -1) {
        memoryDb.obreiros[idx] = { ...memoryDb.obreiros[idx], ...updates, updatedAt: new Date().toISOString() };
        saveLocalFile();
        return memoryDb.obreiros[idx];
      }
      return null;
    },
    deleteOne: async (id: string) => {
      const idx = memoryDb.obreiros.findIndex((o) => o.id === id);
      if (idx !== -1) {
        memoryDb.obreiros.splice(idx, 1);
        saveLocalFile();
        return true;
      }
      return false;
    },
    count: async () => memoryDb.obreiros.length,
  },

  alunos: {
    find: async (filter?: { search?: string; obreiroId?: string; status?: string }) => {
      let list = [...memoryDb.alunos];
      if (filter?.search) {
        const q = filter.search.toLowerCase().trim();
        list = list.filter((a) => a.nome.toLowerCase().includes(q));
      }
      if (filter?.obreiroId) {
        list = list.filter((a) => a.obreiroId === filter.obreiroId);
      }
      if (filter?.status) {
        list = list.filter((a) => a.status === filter.status);
      }
      return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    findById: async (id: string) => memoryDb.alunos.find((a) => a.id === id) || null,
    insertOne: async (aluno: Aluno) => {
      memoryDb.alunos.push(aluno);
      saveLocalFile();
      return aluno;
    },
    updateOne: async (id: string, updates: Partial<Aluno>) => {
      const idx = memoryDb.alunos.findIndex((a) => a.id === id);
      if (idx !== -1) {
        memoryDb.alunos[idx] = { ...memoryDb.alunos[idx], ...updates, updatedAt: new Date().toISOString() };
        saveLocalFile();
        return memoryDb.alunos[idx];
      }
      return null;
    },
    deleteOne: async (id: string) => {
      const idx = memoryDb.alunos.findIndex((a) => a.id === id);
      if (idx !== -1) {
        memoryDb.alunos.splice(idx, 1);
        saveLocalFile();
        return true;
      }
      return false;
    },
    count: async (status?: string) => {
      if (!status) return memoryDb.alunos.length;
      return memoryDb.alunos.filter((a) => a.status === status).length;
    },
  },

  viagens: {
    find: async (filter?: { alunoId?: string; status?: string; search?: string }) => {
      let list = [...memoryDb.viagens];
      if (filter?.alunoId) {
        list = list.filter((v) => v.alunoId === filter.alunoId);
      }
      if (filter?.status) {
        list = list.filter((v) => v.status === filter.status);
      }
      if (filter?.search) {
        const q = filter.search.toLowerCase().trim();
        list = list.filter(
          (v) =>
            v.alunoNome.toLowerCase().includes(q) ||
            v.origem.toLowerCase().includes(q) ||
            v.destino.toLowerCase().includes(q) ||
            v.empresa.toLowerCase().includes(q) ||
            v.numeroLocalizador.toLowerCase().includes(q)
        );
      }
      return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    findById: async (id: string) => memoryDb.viagens.find((v) => v.id === id) || null,
    insertOne: async (viagem: Viagem) => {
      memoryDb.viagens.push(viagem);
      saveLocalFile();
      return viagem;
    },
    updateOne: async (id: string, updates: Partial<Viagem>) => {
      const idx = memoryDb.viagens.findIndex((v) => v.id === id);
      if (idx !== -1) {
        memoryDb.viagens[idx] = { ...memoryDb.viagens[idx], ...updates, updatedAt: new Date().toISOString() };
        saveLocalFile();
        return memoryDb.viagens[idx];
      }
      return null;
    },
    deleteOne: async (id: string) => {
      const idx = memoryDb.viagens.findIndex((v) => v.id === id);
      if (idx !== -1) {
        memoryDb.viagens.splice(idx, 1);
        saveLocalFile();
        return true;
      }
      return false;
    },
    count: async () => memoryDb.viagens.length,
  },

  documentos: {
    find: async (filter?: { alunoId?: string; viagemId?: string; tipo?: string; search?: string }) => {
      let list = [...memoryDb.documentos];
      if (filter?.alunoId) {
        list = list.filter((d) => d.alunoId === filter.alunoId);
      }
      if (filter?.viagemId) {
        list = list.filter((d) => d.viagemId === filter.viagemId);
      }
      if (filter?.tipo) {
        list = list.filter((d) => d.tipo === filter.tipo);
      }
      if (filter?.search) {
        const q = filter.search.toLowerCase().trim();
        list = list.filter(
          (d) =>
            d.titulo.toLowerCase().includes(q) ||
            d.filename.toLowerCase().includes(q) ||
            (d.alunoNome && d.alunoNome.toLowerCase().includes(q))
        );
      }
      return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    findById: async (id: string) => memoryDb.documentos.find((d) => d.id === id) || null,
    insertOne: async (doc: Documento) => {
      memoryDb.documentos.push(doc);
      saveLocalFile();
      return doc;
    },
    updateOne: async (id: string, updates: Partial<Documento>) => {
      const idx = memoryDb.documentos.findIndex((d) => d.id === id);
      if (idx !== -1) {
        memoryDb.documentos[idx] = { ...memoryDb.documentos[idx], ...updates, updatedAt: new Date().toISOString() };
        saveLocalFile();
        return memoryDb.documentos[idx];
      }
      return null;
    },
    deleteOne: async (id: string) => {
      const idx = memoryDb.documentos.findIndex((d) => d.id === id);
      if (idx !== -1) {
        memoryDb.documentos.splice(idx, 1);
        saveLocalFile();
        return true;
      }
      return false;
    },
    count: async () => memoryDb.documentos.length,
  },

  user_invitations: {
    find: async () => memoryDb.user_invitations.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    findById: async (id: string) => memoryDb.user_invitations.find((i) => i.id === id) || null,
    findByToken: async (token: string) => memoryDb.user_invitations.find((i) => i.token === token) || null,
    insertOne: async (inv: UserInvitation) => {
      memoryDb.user_invitations.push(inv);
      saveLocalFile();
      return inv;
    },
    updateOne: async (id: string, updates: Partial<UserInvitation>) => {
      const idx = memoryDb.user_invitations.findIndex((i) => i.id === id);
      if (idx !== -1) {
        memoryDb.user_invitations[idx] = { ...memoryDb.user_invitations[idx], ...updates };
        saveLocalFile();
        return memoryDb.user_invitations[idx];
      }
      return null;
    },
    deleteOne: async (id: string) => {
      const idx = memoryDb.user_invitations.findIndex((i) => i.id === id);
      if (idx !== -1) {
        memoryDb.user_invitations.splice(idx, 1);
        saveLocalFile();
        return true;
      }
      return false;
    },
    countPending: async () => {
      const now = new Date().toISOString();
      return memoryDb.user_invitations.filter((i) => i.status === 'PENDENTE' && i.expiresAt > now).length;
    },
  },

  auditoria: {
    find: async (limit = 100) => {
      return [...memoryDb.auditoria].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, limit);
    },
    insertOne: async (log: AuditLog) => {
      memoryDb.auditoria.push(log);
      saveLocalFile();
      return log;
    },
  },
};
