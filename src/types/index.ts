export type UserRole = 'ADMIN_HOST' | 'ADMIN' | 'GESTOR' | 'VISUALIZADOR';

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  role: UserRole;
  status: 'ATIVO' | 'INATIVO';
}

export type AlunoStatus = 'ATIVO' | 'INATIVO' | 'CONCLUÍDO' | 'SUSPENSO';

export interface Aluno {
  id: string;
  nome: string;
  obreiroId: string;
  obreiroNome: string;
  status: AlunoStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Obreiro {
  id: string;
  nome: string;
  email: string;
  funcao: string;
  status: 'ATIVO' | 'INATIVO';
  createdAt: string;
}

export type ViagemStatus = 'PLANEJADA' | 'EM_ANDAMENTO' | 'CONCLUÍDA' | 'CANCELADA';

export interface Viagem {
  id: string;
  alunoId: string;
  alunoNome: string;
  obreiroNome: string;
  origem: string;
  destino: string;
  dataSaida: string;
  horarioSaida: string;
  dataChegada: string;
  horarioChegada: string;
  empresa: string;
  numeroLocalizador: string;
  localEmbarque: string;
  localDesembarque: string;
  status: ViagemStatus;
  observacoes?: string;
  createdAt: string;
}

export type DocumentoTipo = 'passagem/ticket' | 'documento pessoal' | 'recibo' | 'declaração' | 'outro';

export interface ExtractedDocumentData {
  nome?: string;
  cpf?: string;
  matricula?: string;
  rg?: string;
  origem?: string;
  destino?: string;
  data?: string;
  horario?: string;
  empresa?: string;
  numeroLocalizador?: string;
  outrosDados?: Record<string, string>;
}

export interface CandidateMatch {
  alunoId: string;
  alunoNome: string;
  score: number;
  nivelConfianca: 'alta' | 'media' | 'baixa';
  criterio: string;
}

export interface Documento {
  id: string;
  titulo: string;
  tipo: DocumentoTipo;
  alunoId?: string;
  alunoNome?: string;
  viagemId?: string;
  filename: string;
  mimeType: string;
  fileSize: number;
  dataBase64?: string;
  analiseStatus: 'NAO_ANALISADO' | 'ANALISADO' | 'ERRO';
  analiseMensagem?: string;
  analiseDados?: ExtractedDocumentData;
  candidatos?: CandidateMatch[];
  createdAt: string;
}

export type InvitationStatus = 'PENDENTE' | 'ACEITO' | 'EXPIRADO' | 'CANCELADO';

export interface UserInvitation {
  id: string;
  nome: string;
  email: string;
  role: 'ADMIN' | 'GESTOR' | 'VISUALIZADOR';
  token: string;
  status: InvitationStatus;
  expiresAt: string;
  createdAt: string;
  usedAt?: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  acao: string;
  entidade: string;
  entidadeId?: string;
  detalhes?: string;
  timestamp: string;
  ip?: string;
}
