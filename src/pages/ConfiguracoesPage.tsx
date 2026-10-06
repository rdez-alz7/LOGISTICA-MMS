import React, { useState, useEffect } from 'react';
import {
  Settings,
  Mail,
  Users,
  ShieldAlert,
  Key,
  Database,
  Plus,
  Copy,
  Check,
  X,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Building,
  Edit2,
  Lock,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { UserInvitation, User, Obreiro, AuditLog } from '../types';
import { ConfirmModal } from '../components/ConfirmModal';

export const ConfiguracoesPage: React.FC = () => {
  const { user, hasRole } = useAuth();
  const isAdminHost = hasRole('ADMIN_HOST');
  const isAdmin = hasRole('ADMIN_HOST', 'ADMIN');

  const [activeTab, setActiveTab] = useState<'convites' | 'obreiros' | 'auditoria' | 'senha' | 'banco'>('convites');

  // Convites State
  const [invitations, setInvitations] = useState<UserInvitation[]>([]);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteNome, setInviteNome] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'GESTOR' | 'VISUALIZADOR'>('GESTOR');
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);
  const [createdInviteUrl, setCreatedInviteUrl] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Obreiros State
  const [obreiros, setObreiros] = useState<Obreiro[]>([]);
  const [isObreiroModalOpen, setIsObreiroModalOpen] = useState(false);
  const [editingObreiro, setEditingObreiro] = useState<Obreiro | null>(null);
  const [obrNome, setObrNome] = useState('');
  const [obrEmail, setObrEmail] = useState('');
  const [obrFuncao, setObrFuncao] = useState('Obreiro');
  const [obrStatus, setObrStatus] = useState<'ATIVO' | 'INATIVO'>('ATIVO');

  // Users State
  const [systemUsers, setSystemUsers] = useState<User[]>([]);

  // Auditoria State
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Senha State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // DB Status
  const [dbStatus, setDbStatus] = useState<{ engine: string; connected: boolean; path?: string } | null>(null);

  // Toast
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchInvitations = async () => {
    if (!isAdmin) return;
    try {
      const res = await api.get('/invitations');
      setInvitations(res.data);
    } catch {}
  };

  const fetchObreiros = async () => {
    try {
      const res = await api.get('/obreiros');
      setObreiros(res.data);
    } catch {}
  };

  const fetchUsers = async () => {
    if (!isAdmin) return;
    try {
      const res = await api.get('/users');
      setSystemUsers(res.data);
    } catch {}
  };

  const fetchAuditoria = async () => {
    if (!isAdmin) return;
    try {
      const res = await api.get('/auditoria');
      setAuditLogs(res.data);
    } catch {}
  };

  const fetchDbStatus = async () => {
    try {
      const res = await api.get('/dashboard');
      setDbStatus(res.data.dbStatus);
    } catch {}
  };

  useEffect(() => {
    fetchInvitations();
    fetchObreiros();
    fetchUsers();
    fetchAuditoria();
    fetchDbStatus();
  }, []);

  // Handle Create Invite
  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingInvite(true);
    try {
      const res = await api.post('/invitations', {
        nome: inviteNome.trim(),
        email: inviteEmail.trim(),
        role: inviteRole,
      });

      const fullUrl = `${window.location.origin}${res.data.inviteUrl}`;
      setCreatedInviteUrl(fullUrl);
      showToast('success', 'Convite criado com sucesso.');
      fetchInvitations();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Erro ao gerar convite.');
    } finally {
      setIsCreatingInvite(false);
    }
  };

  // Handle Cancel Invite
  const handleCancelInvite = async (id: string) => {
    try {
      await api.delete(`/invitations/${id}`);
      showToast('success', 'Convite cancelado.');
      fetchInvitations();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Erro ao cancelar convite.');
    }
  };

  // Handle Resend Invite
  const handleResendInvite = async (id: string) => {
    try {
      const res = await api.post(`/invitations/${id}/resend`);
      const fullUrl = `${window.location.origin}${res.data.inviteUrl}`;
      navigator.clipboard.writeText(fullUrl);
      showToast('success', 'Convite renovado! Link copiado para a área de transferência.');
      fetchInvitations();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Erro ao renovar convite.');
    }
  };

  // Handle Save Obreiro
  const handleSaveObreiro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!obrNome.trim()) return;

    try {
      if (editingObreiro) {
        await api.put(`/obreiros/${editingObreiro.id}`, {
          nome: obrNome.trim(),
          email: obrEmail.trim(),
          funcao: obrFuncao.trim(),
          status: obrStatus,
        });
        showToast('success', 'Obreiro atualizado com sucesso.');
      } else {
        await api.post('/obreiros', {
          nome: obrNome.trim(),
          email: obrEmail.trim(),
          funcao: obrFuncao.trim(),
          status: obrStatus,
        });
        showToast('success', 'Obreiro cadastrado com sucesso.');
      }
      setIsObreiroModalOpen(false);
      fetchObreiros();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Erro ao salvar obreiro.');
    }
  };

  // Handle Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast('error', 'A nova senha e a confirmação não conferem.');
      return;
    }

    setIsChangingPassword(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      showToast('success', 'Sua senha foi alterada com sucesso.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Erro ao alterar senha.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold transition ${
            toastMessage.type === 'success' ? 'bg-emerald-700 text-white' : 'bg-rose-700 text-white'
          }`}
        >
          {toastMessage.type === 'success' ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
          <Settings className="w-6 h-6 text-emerald-700" />
          <span>Configurações do Sistema</span>
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Gestão de usuários, convites, obreiros, auditoria e segurança.
        </p>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab('convites')}
          className={`flex items-center gap-2 px-5 py-3 font-semibold text-sm border-b-2 whitespace-nowrap transition ${
            activeTab === 'convites'
              ? 'border-emerald-700 text-emerald-800 bg-emerald-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Mail className="w-4 h-4" />
          <span>Usuários e Convites</span>
        </button>

        <button
          onClick={() => setActiveTab('obreiros')}
          className={`flex items-center gap-2 px-5 py-3 font-semibold text-sm border-b-2 whitespace-nowrap transition ${
            activeTab === 'obreiros'
              ? 'border-emerald-700 text-emerald-800 bg-emerald-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Obreiros / Colaboradores</span>
        </button>

        {isAdmin && (
          <button
            onClick={() => setActiveTab('auditoria')}
            className={`flex items-center gap-2 px-5 py-3 font-semibold text-sm border-b-2 whitespace-nowrap transition ${
              activeTab === 'auditoria'
                ? 'border-emerald-700 text-emerald-800 bg-emerald-50/50 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Auditoria</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('senha')}
          className={`flex items-center gap-2 px-5 py-3 font-semibold text-sm border-b-2 whitespace-nowrap transition ${
            activeTab === 'senha'
              ? 'border-emerald-700 text-emerald-800 bg-emerald-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Key className="w-4 h-4" />
          <span>Minha Senha</span>
        </button>

        <button
          onClick={() => setActiveTab('banco')}
          className={`flex items-center gap-2 px-5 py-3 font-semibold text-sm border-b-2 whitespace-nowrap transition ${
            activeTab === 'banco'
              ? 'border-emerald-700 text-emerald-800 bg-emerald-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Status do Banco</span>
        </button>
      </div>

      {/* Tab: Usuários e Convites */}
      {activeTab === 'convites' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Convites para Colaboradores</h2>
              <p className="text-xs text-slate-500">
                O ADMIN_HOST pode convidar pessoas para ajudar. Validade: 48 horas (uso único).
              </p>
            </div>

            {isAdminHost && (
              <button
                onClick={() => {
                  setInviteNome('');
                  setInviteEmail('');
                  setInviteRole('GESTOR');
                  setCreatedInviteUrl(null);
                  setIsInviteModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs rounded-xl shadow-xs transition"
              >
                <Plus className="w-4 h-4" />
                <span>+ Convidar Nova Pessoa</span>
              </button>
            )}
          </div>

          {/* Table: Convites */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-6">Convidado</th>
                    <th className="py-3 px-6">Função Atribuída</th>
                    <th className="py-3 px-6">Status</th>
                    <th className="py-3 px-6">Validade</th>
                    <th className="py-3 px-6 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invitations.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                        Nenhum convite pendente ou registrado.
                      </td>
                    </tr>
                  ) : (
                    invitations.map((inv) => {
                      const statusBadges: Record<string, string> = {
                        PENDENTE: 'bg-amber-100 text-amber-800 border-amber-300',
                        ACEITO: 'bg-emerald-100 text-emerald-800 border-emerald-300',
                        EXPIRADO: 'bg-slate-100 text-slate-600 border-slate-300',
                        CANCELADO: 'bg-rose-100 text-rose-800 border-rose-300',
                      };

                      const fullLink = `${window.location.origin}/convite/${inv.token}`;

                      return (
                        <tr key={inv.id} className="hover:bg-slate-50/60">
                          <td className="py-3.5 px-6">
                            <span className="font-bold text-slate-900 block">{inv.nome}</span>
                            <span className="text-xs text-slate-500 block">{inv.email}</span>
                          </td>
                          <td className="py-3.5 px-6">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-semibold">
                              {inv.role}
                            </span>
                          </td>
                          <td className="py-3.5 px-6">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                                statusBadges[inv.status]
                              }`}
                            >
                              {inv.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-6 text-xs text-slate-500">
                            {new Date(inv.expiresAt).toLocaleString('pt-BR')}
                          </td>
                          <td className="py-3.5 px-6 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {inv.status === 'PENDENTE' && (
                                <button
                                  onClick={() => copyToClipboard(fullLink)}
                                  title="Copiar link do convite"
                                  className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition"
                                >
                                  <Copy className="w-4 h-4" />
                                </button>
                              )}
                              {isAdminHost && inv.status === 'PENDENTE' && (
                                <button
                                  onClick={() => handleCancelInvite(inv.id)}
                                  title="Cancelar convite"
                                  className="p-1.5 text-slate-500 hover:text-rose-700 hover:bg-slate-100 rounded-lg transition"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                              {isAdminHost && (inv.status === 'EXPIRADO' || inv.status === 'CANCELADO') && (
                                <button
                                  onClick={() => handleResendInvite(inv.id)}
                                  title="Reenviar / Gerar novo convite"
                                  className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-slate-100 rounded-lg transition"
                                >
                                  <RefreshCw className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Table: Usuários Ativos no Sistema */}
          <div className="mt-8 space-y-4">
            <h3 className="font-bold text-base text-slate-900">Usuários Ativos do Sistema</h3>
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-6">Nome / Usuário</th>
                    <th className="py-3 px-6">E-mail</th>
                    <th className="py-3 px-6">Função</th>
                    <th className="py-3 px-6 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {systemUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-6">
                        <span className="font-bold text-slate-900 block">{u.name}</span>
                        <span className="text-xs text-slate-400 block font-mono">@{u.username}</span>
                      </td>
                      <td className="py-3 px-6 text-slate-600 text-xs">{u.email}</td>
                      <td className="py-3 px-6">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 px-6 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {u.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Obreiros */}
      {activeTab === 'obreiros' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Cadastro de Obreiros e Colaboradores</h2>
              <p className="text-xs text-slate-500">
                Estes são os nomes que aparecem na seleção de "Obreiro responsável" no cadastro de alunos.
              </p>
            </div>

            {isAdmin && (
              <button
                onClick={() => {
                  setEditingObreiro(null);
                  setObrNome('');
                  setObrEmail('');
                  setObrFuncao('Obreiro');
                  setObrStatus('ATIVO');
                  setIsObreiroModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs rounded-xl shadow-xs transition"
              >
                <Plus className="w-4 h-4" />
                <span>+ Novo Obreiro</span>
              </button>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-6">Nome do Obreiro</th>
                  <th className="py-3 px-6">Função</th>
                  <th className="py-3 px-6">E-mail</th>
                  <th className="py-3 px-6 text-center">Status</th>
                  {isAdmin && <th className="py-3 px-6 text-right">Ações</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {obreiros.map((obr) => (
                  <tr key={obr.id} className="hover:bg-slate-50/60">
                    <td className="py-3.5 px-6 font-bold text-slate-900">{obr.nome}</td>
                    <td className="py-3.5 px-6 text-slate-700 text-xs font-semibold">{obr.funcao}</td>
                    <td className="py-3.5 px-6 text-slate-500 text-xs">{obr.email || '-'}</td>
                    <td className="py-3.5 px-6 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {obr.status}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="py-3.5 px-6 text-right">
                        <button
                          onClick={() => {
                            setEditingObreiro(obr);
                            setObrNome(obr.nome);
                            setObrEmail(obr.email);
                            setObrFuncao(obr.funcao);
                            setObrStatus(obr.status);
                            setIsObreiroModalOpen(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-slate-100 rounded-lg transition"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Auditoria */}
      {activeTab === 'auditoria' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Trilha de Auditoria (Audit Logs)</h2>
            <p className="text-xs text-slate-500">
              Registros imutáveis de ações realizadas no sistema para segurança e conformidade.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-6">Data/Hora</th>
                    <th className="py-3 px-6">Usuário</th>
                    <th className="py-3 px-6">Função</th>
                    <th className="py-3 px-6">Ação</th>
                    <th className="py-3 px-6">Entidade</th>
                    <th className="py-3 px-6">Detalhes</th>
                    <th className="py-3 px-6">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/60">
                      <td className="py-2.5 px-6 text-slate-500 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString('pt-BR')}
                      </td>
                      <td className="py-2.5 px-6 font-bold text-slate-800">{log.userName}</td>
                      <td className="py-2.5 px-6 text-slate-600">{log.userRole}</td>
                      <td className="py-2.5 px-6 font-mono font-semibold text-emerald-800">{log.acao}</td>
                      <td className="py-2.5 px-6 text-slate-700">{log.entidade}</td>
                      <td className="py-2.5 px-6 text-slate-600 max-w-sm truncate">{log.detalhes}</td>
                      <td className="py-2.5 px-6 text-slate-400 font-mono">{log.ip || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Minha Senha */}
      {activeTab === 'senha' && (
        <div className="max-w-md bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Alteração de Senha</h2>
            <p className="text-xs text-slate-500">
              Mantenha sua conta protegida com uma senha forte.
            </p>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Senha atual
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Nova senha (mínimo 4 caracteres)
              </label>
              <input
                type="password"
                required
                minLength={4}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Confirme a nova senha
              </label>
              <input
                type="password"
                required
                minLength={4}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={isChangingPassword}
              className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm rounded-xl transition shadow-xs disabled:opacity-50"
            >
              {isChangingPassword ? 'Atualizando senha...' : 'Salvar Nova Senha'}
            </button>
          </form>
        </div>
      )}

      {/* Tab: Status do Banco */}
      {activeTab === 'banco' && (
        <div className="max-w-xl bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Database className="w-5 h-5 text-emerald-700" />
              <span>Conexão do Banco de Dados</span>
            </h2>
            <p className="text-xs text-slate-500">
              Status do armazenamento e conformidade com MongoDB.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                Mecanismo Ativo
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-700 text-white text-[11px] font-bold">
                Online &amp; Seguro
              </span>
            </div>
            <p className="text-sm font-semibold text-emerald-950">
              {dbStatus?.engine || 'MongoDB Storage Engine'}
            </p>
            <p className="text-xs text-slate-600">
              Para alternar para um cluster remoto MongoDB Atlas, basta definir a variável{' '}
              <code className="bg-emerald-100 px-1 py-0.5 rounded text-emerald-900 font-mono">MONGODB_URL</code> no arquivo <code className="font-mono">.env</code>. O sistema realiza a conexão e migração automática mantendo idempotência total.
            </p>
          </div>
        </div>
      )}

      {/* Modal: Convidar Nova Pessoa */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-emerald-800 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg">Convidar Colaborador</h3>
                <p className="text-xs text-emerald-100">Acesso seguro com link de uso único</p>
              </div>
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="p-1 text-emerald-200 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {createdInviteUrl ? (
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200">
                    <p className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                      Convite criado com sucesso!
                    </p>
                    <p className="text-xs text-slate-600 mt-1">
                      Envie o link seguro abaixo para o colaborador ativar a conta e definir a senha:
                    </p>
                    <div className="mt-3 p-2.5 bg-white border border-emerald-300 rounded-xl text-xs font-mono text-slate-800 break-all select-all">
                      {createdInviteUrl}
                    </div>
                  </div>

                  <button
                    onClick={() => copyToClipboard(createdInviteUrl)}
                    className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2"
                  >
                    {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedLink ? 'Link Copiado!' : 'Copiar link do convite'}</span>
                  </button>

                  <button
                    onClick={() => setIsInviteModalOpen(false)}
                    className="w-full py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                  >
                    Fechar
                  </button>
                </div>
              ) : (
                <form onSubmit={handleCreateInvite} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Nome completo
                    </label>
                    <input
                      type="text"
                      required
                      value={inviteNome}
                      onChange={(e) => setInviteNome(e.target.value)}
                      placeholder="Ex: Carlos Eduardo"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      E-mail do colaborador
                    </label>
                    <input
                      type="email"
                      required
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="colaborador@email.com"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Função no LOG MMS
                    </label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="GESTOR">GESTOR (Alunos, Viagens, Documentos, Relatórios)</option>
                      <option value="ADMIN">ADMIN (Operação completa e gestão de usuários)</option>
                      <option value="VISUALIZADOR">VISUALIZADOR (Somente leitura)</option>
                    </select>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setIsInviteModalOpen(false)}
                      className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isCreatingInvite}
                      className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl transition shadow-xs disabled:opacity-50"
                    >
                      {isCreatingInvite ? 'Gerando link...' : 'Criar Convite'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Obreiro */}
      {isObreiroModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-emerald-800 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg">{editingObreiro ? 'Editar Obreiro' : 'Novo Obreiro'}</h3>
                <p className="text-xs text-emerald-100">Responsável pelo acompanhamento de alunos</p>
              </div>
              <button
                onClick={() => setIsObreiroModalOpen(false)}
                className="p-1 text-emerald-200 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveObreiro} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nome do obreiro
                </label>
                <input
                  type="text"
                  required
                  value={obrNome}
                  onChange={(e) => setObrNome(e.target.value)}
                  placeholder="Ex: João da Silva"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Função / Ministério
                </label>
                <input
                  type="text"
                  required
                  value={obrFuncao}
                  onChange={(e) => setObrFuncao(e.target.value)}
                  placeholder="Ex: Pastor, Missionário, Diácono"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  E-mail de contato (opcional)
                </label>
                <input
                  type="email"
                  value={obrEmail}
                  onChange={(e) => setObrEmail(e.target.value)}
                  placeholder="obreiro@email.com"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Status
                </label>
                <select
                  value={obrStatus}
                  onChange={(e) => setObrStatus(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="ATIVO">ATIVO</option>
                  <option value="INATIVO">INATIVO</option>
                </select>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsObreiroModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
