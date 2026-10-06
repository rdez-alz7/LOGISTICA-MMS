import React, { useState, useEffect } from 'react';
import {
  Compass,
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  MapPin,
  Building,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Viagem, Aluno, ViagemStatus } from '../types';
import { ConfirmModal } from '../components/ConfirmModal';

export const ViagensPage: React.FC = () => {
  const { hasRole } = useAuth();
  const canEdit = hasRole('ADMIN_HOST', 'ADMIN', 'GESTOR');
  const canDelete = hasRole('ADMIN_HOST', 'ADMIN');

  const [viagens, setViagens] = useState<Viagem[]>([]);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedAluno, setSelectedAluno] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingViagem, setEditingViagem] = useState<Viagem | null>(null);

  // Form State
  const [formAlunoId, setFormAlunoId] = useState('');
  const [formOrigem, setFormOrigem] = useState('');
  const [formDestino, setFormDestino] = useState('');
  const [formDataSaida, setFormDataSaida] = useState('');
  const [formHorarioSaida, setFormHorarioSaida] = useState('08:00');
  const [formDataChegada, setFormDataChegada] = useState('');
  const [formHorarioChegada, setFormHorarioChegada] = useState('16:00');
  const [formEmpresa, setFormEmpresa] = useState('');
  const [formNumeroLocalizador, setFormNumeroLocalizador] = useState('');
  const [formLocalEmbarque, setFormLocalEmbarque] = useState('');
  const [formLocalDesembarque, setFormLocalDesembarque] = useState('');
  const [formStatus, setFormStatus] = useState<ViagemStatus>('PLANEJADA');
  const [formObservacoes, setFormObservacoes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete State
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingTitle, setDeletingTitle] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Toast
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchAlunos = async () => {
    try {
      const res = await api.get('/alunos');
      setAlunos(res.data);
    } catch (err) {
      console.error('Erro ao carregar alunos:', err);
    }
  };

  const fetchViagens = async () => {
    setIsLoading(true);
    try {
      const params: any = {
        page,
        limit: 15,
      };
      if (search.trim()) params.search = search.trim();
      if (selectedStatus) params.status = selectedStatus;
      if (selectedAluno) params.alunoId = selectedAluno;

      const res = await api.get('/viagens', { params });
      setViagens(res.data.items || res.data);
      setTotalPages(res.data.totalPages || 1);
      setTotalItems(res.data.total || 0);
    } catch (err) {
      showToast('error', 'Falha ao buscar viagens.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAlunos();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchViagens();
    }, 200);
    return () => clearTimeout(timer);
  }, [search, selectedStatus, selectedAluno, page]);

  const handleOpenCreateModal = () => {
    setEditingViagem(null);
    setFormAlunoId(alunos.length > 0 ? alunos[0].id : '');
    setFormOrigem('');
    setFormDestino('');
    const today = new Date().toISOString().split('T')[0];
    setFormDataSaida(today);
    setFormHorarioSaida('08:00');
    setFormDataChegada(today);
    setFormHorarioChegada('16:00');
    setFormEmpresa('');
    setFormNumeroLocalizador('');
    setFormLocalEmbarque('');
    setFormLocalDesembarque('');
    setFormStatus('PLANEJADA');
    setFormObservacoes('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (v: Viagem) => {
    setEditingViagem(v);
    setFormAlunoId(v.alunoId);
    setFormOrigem(v.origem);
    setFormDestino(v.destino);
    setFormDataSaida(v.dataSaida);
    setFormHorarioSaida(v.horarioSaida);
    setFormDataChegada(v.dataChegada);
    setFormHorarioChegada(v.horarioChegada);
    setFormEmpresa(v.empresa || '');
    setFormNumeroLocalizador(v.numeroLocalizador || '');
    setFormLocalEmbarque(v.localEmbarque || '');
    setFormLocalDesembarque(v.localDesembarque || '');
    setFormStatus(v.status);
    setFormObservacoes(v.observacoes || '');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAlunoId) {
      setFormError('Selecione o aluno.');
      return;
    }
    if (!formOrigem.trim() || !formDestino.trim()) {
      setFormError('Informe a origem e o destino da viagem.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    const payload = {
      alunoId: formAlunoId,
      origem: formOrigem.trim(),
      destino: formDestino.trim(),
      dataSaida: formDataSaida,
      horarioSaida: formHorarioSaida,
      dataChegada: formDataChegada,
      horarioChegada: formHorarioChegada,
      empresa: formEmpresa.trim(),
      numeroLocalizador: formNumeroLocalizador.trim(),
      localEmbarque: formLocalEmbarque.trim(),
      localDesembarque: formLocalDesembarque.trim(),
      status: formStatus,
      observacoes: formObservacoes.trim(),
    };

    try {
      if (editingViagem) {
        await api.put(`/viagens/${editingViagem.id}`, payload);
        showToast('success', 'Viagem atualizada com sucesso.');
      } else {
        await api.post('/viagens', payload);
        showToast('success', 'Viagem cadastrada com sucesso.');
      }
      setIsModalOpen(false);
      fetchViagens();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Erro ao salvar viagem.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      await api.delete(`/viagens/${deletingId}`);
      showToast('success', 'Viagem excluída com sucesso.');
      setDeletingId(null);
      fetchViagens();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Erro ao excluir viagem.');
    } finally {
      setIsDeleting(false);
    }
  };

  const statusStyles: Record<ViagemStatus, { label: string; badge: string }> = {
    PLANEJADA: { label: 'Planejada', badge: 'bg-blue-100 text-blue-800 border-blue-300' },
    EM_ANDAMENTO: { label: 'Em Andamento', badge: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold' },
    CONCLUÍDA: { label: 'Concluída', badge: 'bg-slate-100 text-slate-700 border-slate-300' },
    CANCELADA: { label: 'Cancelada', badge: 'bg-rose-100 text-rose-800 border-rose-300' },
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Compass className="w-6 h-6 text-emerald-700" />
            <span>Viagens</span>
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Rastreio completo de itinerários, datas, horários e companhias de transporte.
          </p>
        </div>

        {canEdit && (
          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-xl text-sm transition shadow-sm active:scale-95 flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nova viagem</span>
          </button>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Pesquisar por aluno, origem, destino, empresa ou localizador..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedAluno}
            onChange={(e) => {
              setSelectedAluno(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
          >
            <option value="">Todos os alunos</option>
            {alunos.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nome}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
          >
            <option value="">Todos os status</option>
            <option value="PLANEJADA">PLANEJADA</option>
            <option value="EM_ANDAMENTO">EM ANDAMENTO</option>
            <option value="CONCLUÍDA">CONCLUÍDA</option>
            <option value="CANCELADA">CANCELADA</option>
          </select>

          {(search || selectedStatus || selectedAluno) && (
            <button
              onClick={() => {
                setSearch('');
                setSelectedStatus('');
                setSelectedAluno('');
                setPage(1);
              }}
              className="text-xs text-rose-600 hover:text-rose-800 font-semibold px-2 py-1.5"
            >
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* Main Table View */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-6">Aluno</th>
                <th className="py-3.5 px-6">Obreiro responsável</th>
                <th className="py-3.5 px-6">Origem / Destino</th>
                <th className="py-3.5 px-6 text-center">Saída</th>
                <th className="py-3.5 px-6 text-center">Chegada</th>
                <th className="py-3.5 px-6 text-center">Status</th>
                <th className="py-3.5 px-6 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {isLoading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-4 px-6"><div className="h-4 bg-slate-200 rounded w-36"></div></td>
                    <td className="py-4 px-6"><div className="h-4 bg-slate-200 rounded w-28"></div></td>
                    <td className="py-4 px-6"><div className="h-4 bg-slate-200 rounded w-44"></div></td>
                    <td className="py-4 px-6 text-center"><div className="h-4 bg-slate-200 rounded w-20 mx-auto"></div></td>
                    <td className="py-4 px-6 text-center"><div className="h-4 bg-slate-200 rounded w-20 mx-auto"></div></td>
                    <td className="py-4 px-6 text-center"><div className="h-5 bg-slate-200 rounded-full w-20 mx-auto"></div></td>
                    <td className="py-4 px-6 text-right"><div className="h-6 bg-slate-200 rounded w-16 ml-auto"></div></td>
                  </tr>
                ))
              ) : viagens.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Compass className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-700">Nenhuma viagem encontrada</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {search || selectedStatus || selectedAluno
                        ? 'Verifique os filtros aplicados.'
                        : 'Cadastre a primeira viagem para começar o rastreio.'}
                    </p>
                  </td>
                </tr>
              ) : (
                viagens.map((viagem) => {
                  const s = statusStyles[viagem.status] || { label: viagem.status, badge: 'bg-slate-100 text-slate-700' };

                  return (
                    <tr key={viagem.id} className="hover:bg-slate-50/60 transition">
                      {/* Aluno */}
                      <td className="py-4 px-6">
                        <span className="font-bold text-slate-900 block">{viagem.alunoNome}</span>
                        {viagem.empresa && (
                          <span className="text-[11px] text-slate-500 font-medium block">
                            {viagem.empresa} {viagem.numeroLocalizador ? `• Loc: ${viagem.numeroLocalizador}` : ''}
                          </span>
                        )}
                      </td>

                      {/* Obreiro Responsável */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                          <Building className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                          <span>{viagem.obreiroNome || 'Não informado'}</span>
                        </div>
                      </td>

                      {/* Origem e Destino */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="font-semibold text-slate-800">{viagem.origem}</span>
                          <span className="text-slate-400 font-black">→</span>
                          <span className="font-semibold text-slate-800">{viagem.destino}</span>
                        </div>
                        {(viagem.localEmbarque || viagem.localDesembarque) && (
                          <p className="text-[11px] text-slate-400 mt-0.5 truncate max-w-xs">
                            Embarque: {viagem.localEmbarque || '-'}
                          </p>
                        )}
                      </td>

                      {/* Saída */}
                      <td className="py-4 px-6 text-center text-xs">
                        <span className="font-semibold text-slate-800 block">{viagem.dataSaida}</span>
                        <span className="text-slate-500 block">{viagem.horarioSaida}</span>
                      </td>

                      {/* Chegada */}
                      <td className="py-4 px-6 text-center text-xs">
                        <span className="font-semibold text-slate-800 block">{viagem.dataChegada}</span>
                        <span className="text-slate-500 block">{viagem.horarioChegada}</span>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-6 text-center">
                        <span
                          className={`inline-block text-[11px] px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${s.badge}`}
                        >
                          {s.label}
                        </span>
                      </td>

                      {/* Ações */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {canEdit && (
                            <button
                              onClick={() => handleOpenEditModal(viagem)}
                              title="Editar viagem"
                              className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-slate-100 rounded-lg transition"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => {
                                setDeletingId(viagem.id);
                                setDeletingTitle(`${viagem.alunoNome} (${viagem.origem} -> ${viagem.destino})`);
                              }}
                              title="Excluir viagem"
                              className="p-1.5 text-slate-500 hover:text-rose-700 hover:bg-slate-100 rounded-lg transition"
                            >
                              <Trash2 className="w-4 h-4" />
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

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <span>
              Total de <strong>{totalItems}</strong> viagem(ns) • Página <strong>{page}</strong> de <strong>{totalPages}</strong>
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Nova / Editar Viagem */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150 overflow-y-auto">
          <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="px-6 py-4 bg-emerald-800 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg">
                  {editingViagem ? 'Editar Viagem' : 'Cadastrar Nova Viagem'}
                </h3>
                <p className="text-xs text-emerald-100">
                  Preencha as informações do itinerário e rastreio
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-emerald-200 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Aluno Selecionado */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Aluno <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={formAlunoId}
                  onChange={(e) => setFormAlunoId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                >
                  <option value="" disabled>Selecione o aluno...</option>
                  {alunos.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nome} (Obr. {a.obreiroNome})
                    </option>
                  ))}
                </select>
              </div>

              {/* Origem e Destino */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Origem <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formOrigem}
                    onChange={(e) => setFormOrigem(e.target.value)}
                    placeholder="Cidade - UF de partida"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Destino <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formDestino}
                    onChange={(e) => setFormDestino(e.target.value)}
                    placeholder="Cidade - UF de chegada"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                  />
                </div>
              </div>

              {/* Saída (Data e Horário) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Data de saída
                  </label>
                  <input
                    type="date"
                    required
                    value={formDataSaida}
                    onChange={(e) => setFormDataSaida(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Horário de saída
                  </label>
                  <input
                    type="time"
                    required
                    value={formHorarioSaida}
                    onChange={(e) => setFormHorarioSaida(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                  />
                </div>
              </div>

              {/* Chegada (Data e Horário) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Data de chegada
                  </label>
                  <input
                    type="date"
                    required
                    value={formDataChegada}
                    onChange={(e) => setFormDataChegada(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Horário de chegada
                  </label>
                  <input
                    type="time"
                    required
                    value={formHorarioChegada}
                    onChange={(e) => setFormHorarioChegada(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                  />
                </div>
              </div>

              {/* Empresa e Localizador */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Empresa transportadora
                  </label>
                  <input
                    type="text"
                    value={formEmpresa}
                    onChange={(e) => setFormEmpresa(e.target.value)}
                    placeholder="Ex: Viação Cometa, GOL, etc"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Número / Localizador
                  </label>
                  <input
                    type="text"
                    value={formNumeroLocalizador}
                    onChange={(e) => setFormNumeroLocalizador(e.target.value)}
                    placeholder="Código ou localizador do bilhete"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white transition font-mono"
                  />
                </div>
              </div>

              {/* Locais de Embarque e Desembarque */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Local de embarque
                  </label>
                  <input
                    type="text"
                    value={formLocalEmbarque}
                    onChange={(e) => setFormLocalEmbarque(e.target.value)}
                    placeholder="Terminal, rodoviária, aeroporto"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Local de desembarque
                  </label>
                  <input
                    type="text"
                    value={formLocalDesembarque}
                    onChange={(e) => setFormLocalDesembarque(e.target.value)}
                    placeholder="Ponto de chegada"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Status da viagem
                </label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as ViagemStatus)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                >
                  <option value="PLANEJADA">PLANEJADA</option>
                  <option value="EM_ANDAMENTO">EM ANDAMENTO</option>
                  <option value="CONCLUÍDA">CONCLUÍDA</option>
                  <option value="CANCELADA">CANCELADA</option>
                </select>
              </div>

              {/* Observações */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Observações adicionais
                </label>
                <textarea
                  rows={2}
                  value={formObservacoes}
                  onChange={(e) => setFormObservacoes(e.target.value)}
                  placeholder="Informações relevantes, orientações ou contatos"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                />
              </div>

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
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold rounded-xl transition shadow-sm disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting && (
                    <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                  )}
                  <span>{editingViagem ? 'Salvar Viagem' : 'Cadastrar Viagem'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deletingId}
        title="Excluir Viagem"
        message={`Confirma a exclusão da viagem de "${deletingTitle}"? Esta ação é irreversível.`}
        confirmLabel="Sim, excluir"
        isDestructive={true}
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
};
