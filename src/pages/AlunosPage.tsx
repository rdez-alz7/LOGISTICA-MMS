import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  UserPlus,
  Search,
  Filter,
  Eye,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle,
  X,
  Users,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Aluno, Obreiro, AlunoStatus } from '../types';
import { ConfirmModal } from '../components/ConfirmModal';

export const AlunosPage: React.FC = () => {
  const { hasRole } = useAuth();
  const canEdit = hasRole('ADMIN_HOST', 'ADMIN', 'GESTOR');
  const canDelete = hasRole('ADMIN_HOST', 'ADMIN');

  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [obreiros, setObreiros] = useState<Obreiro[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedObreiro, setSelectedObreiro] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAluno, setEditingAluno] = useState<Aluno | null>(null);
  const [formNome, setFormNome] = useState('');
  const [formObreiroId, setFormObreiroId] = useState('');
  const [formStatus, setFormStatus] = useState<AlunoStatus>('ATIVO');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete State
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingName, setDeletingName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Toast
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchObreiros = async () => {
    try {
      const res = await api.get('/obreiros');
      setObreiros(res.data);
    } catch (err) {
      console.error('Erro ao carregar obreiros:', err);
    }
  };

  const fetchAlunos = async () => {
    setIsLoading(true);
    try {
      const params: any = {};
      if (search.trim()) params.search = search.trim();
      if (selectedObreiro) params.obreiroId = selectedObreiro;
      if (selectedStatus) params.status = selectedStatus;

      const res = await api.get('/alunos', { params });
      setAlunos(res.data);
    } catch (err: any) {
      showToast('error', 'Falha ao buscar lista de alunos.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchObreiros();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAlunos();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, selectedObreiro, selectedStatus]);

  const handleOpenCreateModal = () => {
    setEditingAluno(null);
    setFormNome('');
    setFormObreiroId(obreiros.length > 0 ? obreiros[0].id : '');
    setFormStatus('ATIVO');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (aluno: Aluno) => {
    setEditingAluno(aluno);
    setFormNome(aluno.nome);
    setFormObreiroId(aluno.obreiroId);
    setFormStatus(aluno.status);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNome.trim()) {
      setFormError('Informe o nome do aluno.');
      return;
    }
    if (!formObreiroId) {
      setFormError('Selecione o obreiro responsável.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      if (editingAluno) {
        await api.put(`/alunos/${editingAluno.id}`, {
          nome: formNome.trim(),
          obreiroId: formObreiroId,
          status: formStatus,
        });
        showToast('success', 'Aluno atualizado com sucesso.');
      } else {
        await api.post('/alunos', {
          nome: formNome.trim(),
          obreiroId: formObreiroId,
          status: formStatus,
        });
        showToast('success', 'Aluno cadastrado com sucesso.');
      }
      setIsModalOpen(false);
      fetchAlunos();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Erro ao salvar aluno.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      await api.delete(`/alunos/${deletingId}`);
      showToast('success', 'Aluno excluído com sucesso.');
      setDeletingId(null);
      fetchAlunos();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Erro ao excluir aluno.');
    } finally {
      setIsDeleting(false);
    }
  };

  const statusColors: Record<AlunoStatus, string> = {
    ATIVO: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    INATIVO: 'bg-slate-100 text-slate-700 border-slate-300',
    CONCLUÍDO: 'bg-blue-100 text-blue-800 border-blue-300',
    SUSPENSO: 'bg-amber-100 text-amber-800 border-amber-300',
  };

  return (
    <div className="space-y-6">
      {/* Toast alert */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold transition ${
            toastMessage.type === 'success'
              ? 'bg-emerald-700 text-white'
              : 'bg-rose-700 text-white'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Users className="w-6 h-6 text-emerald-700" />
            <span>Alunos</span>
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Cadastro simples e rastreio de alunos sob responsabilidade de obreiros.
          </p>
        </div>

        {canEdit && (
          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-xl text-sm transition shadow-sm active:scale-95 flex-shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Novo aluno</span>
          </button>
        )}
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar aluno pelo nome..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
          />
        </div>

        {/* Filters Group */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Obreiro filter */}
          <select
            value={selectedObreiro}
            onChange={(e) => setSelectedObreiro(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
          >
            <option value="">Todos os obreiros</option>
            {obreiros.map((obr) => (
              <option key={obr.id} value={obr.id}>
                {obr.nome}
              </option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
          >
            <option value="">Todos os status</option>
            <option value="ATIVO">ATIVO</option>
            <option value="INATIVO">INATIVO</option>
            <option value="CONCLUÍDO">CONCLUÍDO</option>
            <option value="SUSPENSO">SUSPENSO</option>
          </select>

          {(search || selectedObreiro || selectedStatus) && (
            <button
              onClick={() => {
                setSearch('');
                setSelectedObreiro('');
                setSelectedStatus('');
              }}
              className="text-xs text-rose-600 hover:text-rose-800 font-semibold px-2 py-1.5"
            >
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      {/* Main Alunos Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-6">Nome</th>
                <th className="py-3.5 px-6">Obreiro responsável</th>
                <th className="py-3.5 px-6 text-center">Status</th>
                <th className="py-3.5 px-6 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {isLoading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-4 px-6"><div className="h-4 bg-slate-200 rounded-md w-40"></div></td>
                    <td className="py-4 px-6"><div className="h-4 bg-slate-200 rounded-md w-32"></div></td>
                    <td className="py-4 px-6"><div className="h-5 bg-slate-200 rounded-full w-16 mx-auto"></div></td>
                    <td className="py-4 px-6 text-right"><div className="h-8 bg-slate-200 rounded-lg w-20 ml-auto"></div></td>
                  </tr>
                ))
              ) : alunos.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400">
                    <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-700">Nenhum aluno encontrado</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {search || selectedObreiro || selectedStatus
                        ? 'Tente ajustar os filtros de busca.'
                        : 'Comece adicionando o primeiro aluno no botão acima.'}
                    </p>
                  </td>
                </tr>
              ) : (
                alunos.map((aluno) => (
                  <tr key={aluno.id} className="hover:bg-slate-50/60 transition">
                    {/* Nome */}
                    <td className="py-4 px-6">
                      <Link
                        to={`/alunos/${aluno.id}`}
                        className="font-bold text-slate-900 hover:text-emerald-700 hover:underline flex items-center gap-2"
                      >
                        <span>{aluno.nome}</span>
                      </Link>
                    </td>

                    {/* Obreiro Responsável (Highlighted clearly) */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-800 font-bold flex items-center justify-center text-xs flex-shrink-0">
                          {aluno.obreiroNome ? aluno.obreiroNome.charAt(0) : 'O'}
                        </div>
                        <span className="font-semibold text-slate-800">
                          {aluno.obreiroNome || <span className="text-slate-400 italic">Não vinculado</span>}
                        </span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-6 text-center">
                      <span
                        className={`inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full border tracking-wide uppercase ${
                          statusColors[aluno.status]
                        }`}
                      >
                        {aluno.status}
                      </span>
                    </td>

                    {/* Ações */}
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          to={`/alunos/${aluno.id}`}
                          title="Visualizar perfil e viagens"
                          className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>

                        {canEdit && (
                          <button
                            onClick={() => handleOpenEditModal(aluno)}
                            title="Editar aluno"
                            className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-slate-100 rounded-lg transition"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}

                        {canDelete && (
                          <button
                            onClick={() => {
                              setDeletingId(aluno.id);
                              setDeletingName(aluno.nome);
                            }}
                            title="Excluir aluno"
                            className="p-1.5 text-slate-500 hover:text-rose-700 hover:bg-slate-100 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Cadastro / Edição Simples de Aluno */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-emerald-800 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg">
                  {editingAluno ? 'Editar Aluno' : 'Novo Aluno'}
                </h3>
                <p className="text-xs text-emerald-100">
                  Preenchimento simplificado e direto
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-emerald-200 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

              {/* 1. Nome do aluno */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  1. Nome do aluno <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formNome}
                  onChange={(e) => setFormNome(e.target.value)}
                  placeholder="Nome completo do aluno"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                  autoFocus
                />
              </div>

              {/* 2. Obreiro responsável */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  2. Obreiro responsável <span className="text-rose-500">*</span>
                </label>
                {obreiros.length === 0 ? (
                  <p className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                    Nenhum obreiro cadastrado. Cadastre um obreiro nas configurações primeiro.
                  </p>
                ) : (
                  <select
                    required
                    value={formObreiroId}
                    onChange={(e) => setFormObreiroId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                  >
                    <option value="" disabled>
                      Selecione o obreiro responsável...
                    </option>
                    {obreiros.map((obr) => (
                      <option key={obr.id} value={obr.id}>
                        {obr.nome} ({obr.funcao})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Status (Only when editing) */}
              {editingAluno && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Status do aluno
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as AlunoStatus)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                  >
                    <option value="ATIVO">ATIVO</option>
                    <option value="INATIVO">INATIVO</option>
                    <option value="CONCLUÍDO">CONCLUÍDO</option>
                    <option value="SUSPENSO">SUSPENSO</option>
                  </select>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || obreiros.length === 0}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold rounded-xl transition shadow-sm disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting && (
                    <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                  )}
                  <span>{editingAluno ? 'Salvar Alterações' : 'Cadastrar Aluno'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deletingId}
        title="Excluir Aluno"
        message={`Tem certeza que deseja excluir o aluno "${deletingName}"? Esta ação removerá o aluno e suas referências permanentemente.`}
        confirmLabel="Sim, excluir aluno"
        isDestructive={true}
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
};
