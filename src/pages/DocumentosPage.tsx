import React, { useState, useEffect } from 'react';
import {
  FileText,
  Upload,
  Search,
  Download,
  Trash2,
  Sparkles,
  Link as LinkIcon,
  Unlink,
  CheckCircle,
  AlertCircle,
  X,
  File,
  RefreshCw,
  UserCheck,
  ShieldCheck,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Documento, Aluno, Viagem, DocumentoTipo, CandidateMatch } from '../types';
import { ConfirmModal } from '../components/ConfirmModal';

export const DocumentosPage: React.FC = () => {
  const { hasRole } = useAuth();
  const canEdit = hasRole('ADMIN_HOST', 'ADMIN', 'GESTOR');
  const canDelete = hasRole('ADMIN_HOST', 'ADMIN');

  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [viagens, setViagens] = useState<Viagem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedTipo, setSelectedTipo] = useState('');
  const [selectedAluno, setSelectedAluno] = useState('');

  // Upload Modal State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [formTitulo, setFormTitulo] = useState('');
  const [formTipo, setFormTipo] = useState<DocumentoTipo>('passagem/ticket');
  const [formAlunoId, setFormAlunoId] = useState('');
  const [formViagemId, setFormViagemId] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Detail / Analysis Modal State
  const [viewingDoc, setViewingDoc] = useState<Documento | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

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

  const fetchAuxData = async () => {
    try {
      const [alunosRes, viagensRes] = await Promise.all([
        api.get('/alunos'),
        api.get('/viagens', { params: { limit: 100 } }),
      ]);
      setAlunos(alunosRes.data);
      setViagens(viagensRes.data.items || viagensRes.data);
    } catch (err) {
      console.error('Erro ao carregar dados auxiliares:', err);
    }
  };

  const fetchDocumentos = async () => {
    setIsLoading(true);
    try {
      const params: any = {};
      if (search.trim()) params.search = search.trim();
      if (selectedTipo) params.tipo = selectedTipo;
      if (selectedAluno) params.alunoId = selectedAluno;

      const res = await api.get('/documentos', { params });
      setDocumentos(res.data);
    } catch (err) {
      showToast('error', 'Falha ao buscar documentos.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAuxData();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDocumentos();
    }, 200);
    return () => clearTimeout(timer);
  }, [search, selectedTipo, selectedAluno]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (15MB)
    if (file.size > 15 * 1024 * 1024) {
      setUploadError('O arquivo selecionado excede o limite máximo de 15MB.');
      return;
    }

    // Validate extension
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      setUploadError('Formato inválido. Selecione uma imagem (JPG, PNG, WEBP) ou PDF.');
      return;
    }

    setSelectedFile(file);
    setUploadError(null);
    if (!formTitulo) {
      setFormTitulo(file.name.replace(/\.[^/.]+$/, ''));
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFileBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitulo.trim()) {
      setUploadError('Informe o título do documento.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      await api.post('/documentos', {
        titulo: formTitulo.trim(),
        tipo: formTipo,
        alunoId: formAlunoId || undefined,
        viagemId: formViagemId || undefined,
        filename: selectedFile?.name || 'documento.pdf',
        mimeType: selectedFile?.type || 'application/pdf',
        fileSize: selectedFile?.size || 0,
        fileBase64: fileBase64 || undefined,
      });

      showToast('success', 'Documento cadastrado com sucesso.');
      setIsUploadModalOpen(false);
      setSelectedFile(null);
      setFileBase64('');
      fetchDocumentos();
    } catch (err: any) {
      setUploadError(err.response?.data?.message || 'Erro ao enviar documento.');
    } finally {
      setIsUploading(false);
    }
  };

  // Trigger manual analysis on button click only!
  const handleAnalyze = async (docId: string) => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    try {
      const res = await api.post(`/documentos/${docId}/analisar`);
      setViewingDoc(res.data);
      showToast('success', 'Análise de documento executada com sucesso.');
      fetchDocumentos();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Falha ao analisar documento.';
      setAnalysisError(msg);
      showToast('error', msg);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Link document to aluno
  const handleLinkAluno = async (docId: string, alunoId: string) => {
    try {
      const res = await api.post(`/documentos/${docId}/vincular`, { alunoId });
      setViewingDoc(res.data);
      showToast('success', 'Documento vinculado ao aluno com sucesso.');
      fetchDocumentos();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Erro ao vincular documento.');
    }
  };

  // Unlink document
  const handleUnlink = async (docId: string) => {
    try {
      const res = await api.post(`/documentos/${docId}/desvincular`);
      setViewingDoc(res.data);
      showToast('success', 'Documento desvinculado com sucesso.');
      fetchDocumentos();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Erro ao desvincular.');
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      await api.delete(`/documentos/${deletingId}`);
      showToast('success', 'Documento excluído com sucesso.');
      setDeletingId(null);
      if (viewingDoc?.id === deletingId) setViewingDoc(null);
      fetchDocumentos();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Erro ao excluir.');
    } finally {
      setIsDeleting(false);
    }
  };

  const openDocDetails = async (doc: Documento) => {
    try {
      const res = await api.get(`/documentos/${doc.id}`);
      setViewingDoc(res.data);
      setAnalysisError(null);
    } catch {
      setViewingDoc(doc);
    }
  };

  const tipoBadges: Record<DocumentoTipo, string> = {
    'passagem/ticket': 'bg-emerald-100 text-emerald-800 border-emerald-300',
    'documento pessoal': 'bg-blue-100 text-blue-800 border-blue-300',
    recibo: 'bg-amber-100 text-amber-800 border-amber-300',
    declaração: 'bg-purple-100 text-purple-800 border-purple-300',
    outro: 'bg-slate-100 text-slate-700 border-slate-300',
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
            <FileText className="w-6 h-6 text-emerald-700" />
            <span>Documentos &amp; Bilhetes</span>
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Repositório central de passagens, bilhetes de viagem, termos, recibos e documentos pessoais.
          </p>
        </div>

        {canEdit && (
          <button
            onClick={() => {
              setFormTitulo('');
              setFormTipo('passagem/ticket');
              setFormAlunoId('');
              setFormViagemId('');
              setSelectedFile(null);
              setFileBase64('');
              setUploadError(null);
              setIsUploadModalOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-xl text-sm transition shadow-sm active:scale-95 flex-shrink-0"
          >
            <Upload className="w-4 h-4" />
            <span>+ Enviar Documento</span>
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar por título, arquivo ou aluno..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedTipo}
            onChange={(e) => setSelectedTipo(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
          >
            <option value="">Todos os tipos</option>
            <option value="passagem/ticket">Passagem / Ticket</option>
            <option value="documento pessoal">Documento Pessoal</option>
            <option value="recibo">Recibo</option>
            <option value="declaração">Declaração</option>
            <option value="outro">Outro</option>
          </select>

          <select
            value={selectedAluno}
            onChange={(e) => setSelectedAluno(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
          >
            <option value="">Todos os alunos</option>
            {alunos.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nome}
              </option>
            ))}
          </select>

          {(search || selectedTipo || selectedAluno) && (
            <button
              onClick={() => {
                setSearch('');
                setSelectedTipo('');
                setSelectedAluno('');
              }}
              className="text-xs text-rose-600 hover:text-rose-800 font-semibold px-2 py-1.5"
            >
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* Document Grid / Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-6">Documento</th>
                <th className="py-3.5 px-6">Tipo</th>
                <th className="py-3.5 px-6">Aluno Vinculado</th>
                <th className="py-3.5 px-6">Data de Envio</th>
                <th className="py-3.5 px-6 text-center">Análise OCR</th>
                <th className="py-3.5 px-6 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {isLoading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-4 px-6"><div className="h-4 bg-slate-200 rounded w-44"></div></td>
                    <td className="py-4 px-6"><div className="h-4 bg-slate-200 rounded w-24"></div></td>
                    <td className="py-4 px-6"><div className="h-4 bg-slate-200 rounded w-32"></div></td>
                    <td className="py-4 px-6"><div className="h-4 bg-slate-200 rounded w-20"></div></td>
                    <td className="py-4 px-6 text-center"><div className="h-5 bg-slate-200 rounded-full w-20 mx-auto"></div></td>
                    <td className="py-4 px-6 text-right"><div className="h-6 bg-slate-200 rounded w-20 ml-auto"></div></td>
                  </tr>
                ))
              ) : documentos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <FileText className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-700">Nenhum documento encontrado</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {search || selectedTipo || selectedAluno
                        ? 'Tente remover os filtros.'
                        : 'Envie passagens ou documentos pelo botão acima.'}
                    </p>
                  </td>
                </tr>
              ) : (
                documentos.map((doc) => {
                  const badgeClass = tipoBadges[doc.tipo] || 'bg-slate-100 text-slate-700';

                  return (
                    <tr key={doc.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center flex-shrink-0">
                            <File className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block">{doc.titulo}</span>
                            <span className="text-[11px] text-slate-400 block">{doc.filename}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md border ${badgeClass}`}>
                          {doc.tipo}
                        </span>
                      </td>

                      <td className="py-4 px-6">
                        {doc.alunoNome ? (
                          <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                            <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{doc.alunoNome}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            Sem vínculo
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-6 text-slate-500 text-xs">
                        {new Date(doc.createdAt).toLocaleDateString('pt-BR')}
                      </td>

                      <td className="py-4 px-6 text-center">
                        <span
                          className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            doc.analiseStatus === 'ANALISADO'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                              : doc.analiseStatus === 'ERRO'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {doc.analiseStatus === 'ANALISADO'
                            ? 'Analisado'
                            : doc.analiseStatus === 'ERRO'
                            ? 'Falha OCR'
                            : 'Pendente'}
                        </span>
                      </td>

                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openDocDetails(doc)}
                            className="px-2.5 py-1 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition border border-emerald-200 flex items-center gap-1"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Detalhes / OCR</span>
                          </button>

                          <a
                            href={`/api/documentos/${doc.id}/download`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Baixar arquivo"
                            className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition"
                          >
                            <Download className="w-4 h-4" />
                          </a>

                          {canDelete && (
                            <button
                              onClick={() => {
                                setDeletingId(doc.id);
                                setDeletingTitle(doc.titulo);
                              }}
                              title="Excluir documento"
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
      </div>

      {/* Modal: Upload de Documento */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-emerald-800 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg">Enviar Documento / Bilhete</h3>
                <p className="text-xs text-emerald-100">
                  Adicione passagens, recibos ou certidões no formato JPG, PNG ou PDF
                </p>
              </div>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="p-1 text-emerald-200 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="p-6 space-y-4">
              {uploadError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Arquivo */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Arquivo do documento (máx 15MB)
                </label>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,.pdf"
                  onChange={handleFileChange}
                  className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-800 hover:file:bg-emerald-100 cursor-pointer"
                />
              </div>

              {/* Título */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Título do documento <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formTitulo}
                  onChange={(e) => setFormTitulo(e.target.value)}
                  placeholder="Ex: Passagem de Ônibus Belo Horizonte - São Paulo"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                />
              </div>

              {/* Tipo */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Tipo de documento
                </label>
                <select
                  value={formTipo}
                  onChange={(e) => setFormTipo(e.target.value as DocumentoTipo)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                >
                  <option value="passagem/ticket">Passagem / Ticket</option>
                  <option value="documento pessoal">Documento Pessoal</option>
                  <option value="recibo">Recibo</option>
                  <option value="declaração">Declaração</option>
                  <option value="outro">Outro</option>
                </select>
              </div>

              {/* Vínculo opcional com Aluno */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Vincular a um aluno (Opcional)
                </label>
                <select
                  value={formAlunoId}
                  onChange={(e) => setFormAlunoId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                >
                  <option value="">Sem vínculo imediato (Pode ser vinculado depois)</option>
                  {alunos.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nome}
                    </option>
                  ))}
                </select>
              </div>

              {/* Vínculo opcional com Viagem */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Vincular a uma viagem (Opcional)
                </label>
                <select
                  value={formViagemId}
                  onChange={(e) => setFormViagemId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                >
                  <option value="">Nenhuma viagem específica</option>
                  {viagens.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.alunoNome}: {v.origem} → {v.destino} ({v.dataSaida})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold rounded-xl transition shadow-sm disabled:opacity-50 flex items-center gap-2"
                >
                  {isUploading && (
                    <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                  )}
                  <span>Salvar Documento</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Detalhes, Análise Manual e Matching */}
      {viewingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150 overflow-y-auto">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6">
            <div className="px-6 py-4 bg-emerald-800 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg">{viewingDoc.titulo}</h3>
                <span className="text-xs text-emerald-100">Tipo: {viewingDoc.tipo}</span>
              </div>
              <button
                onClick={() => setViewingDoc(null)}
                className="p-1 text-emerald-200 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              {/* Vínculo Atual */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Vínculo do Aluno
                  </span>
                  <div className="mt-1 flex items-center gap-2">
                    {viewingDoc.alunoNome ? (
                      <span className="font-bold text-slate-900 text-base">{viewingDoc.alunoNome}</span>
                    ) : (
                      <span className="text-sm text-amber-700 italic font-medium">Nenhum aluno vinculado</span>
                    )}
                  </div>
                </div>

                {viewingDoc.alunoId && canEdit && (
                  <button
                    onClick={() => handleUnlink(viewingDoc.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-200 transition"
                  >
                    <Unlink className="w-3.5 h-3.5" />
                    <span>Desvincular</span>
                  </button>
                )}
              </div>

              {/* Seção de Análise Manual */}
              <div className="p-5 rounded-2xl bg-emerald-50/50 border border-emerald-200/70">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-700" />
                      <span>Extração de Dados e OCR</span>
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Executa a leitura dos dados do documento e busca candidatos para vínculo.
                    </p>
                  </div>

                  {canEdit && (
                    <button
                      onClick={() => handleAnalyze(viewingDoc.id)}
                      disabled={isAnalyzing}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl transition shadow-xs disabled:opacity-50 flex-shrink-0"
                    >
                      {isAnalyzing ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Processando OCR...</span>
                        </>
                      ) : viewingDoc.analiseStatus === 'ANALISADO' ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Reanalisar</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Analisar documento</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Status or Analysis Error */}
                {analysisError && (
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-700" />
                    <span>{analysisError}</span>
                  </div>
                )}

                {/* Analysis Results Display */}
                {viewingDoc.analiseStatus === 'ANALISADO' && viewingDoc.analiseDados && (
                  <div className="mt-4 p-4 rounded-xl bg-white border border-emerald-200 text-xs space-y-2">
                    <span className="font-bold text-emerald-900 uppercase tracking-wider block mb-2">
                      Dados Identificados no Documento:
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {viewingDoc.analiseDados.nome && (
                        <div>
                          <span className="text-slate-400 block font-semibold">Nome:</span>
                          <span className="font-bold text-slate-800">{viewingDoc.analiseDados.nome}</span>
                        </div>
                      )}
                      {viewingDoc.analiseDados.cpf && (
                        <div>
                          <span className="text-slate-400 block font-semibold">CPF:</span>
                          <span className="font-mono font-bold text-slate-800">{viewingDoc.analiseDados.cpf}</span>
                        </div>
                      )}
                      {viewingDoc.analiseDados.origem && (
                        <div>
                          <span className="text-slate-400 block font-semibold">Origem:</span>
                          <span className="font-bold text-slate-800">{viewingDoc.analiseDados.origem}</span>
                        </div>
                      )}
                      {viewingDoc.analiseDados.destino && (
                        <div>
                          <span className="text-slate-400 block font-semibold">Destino:</span>
                          <span className="font-bold text-slate-800">{viewingDoc.analiseDados.destino}</span>
                        </div>
                      )}
                      {viewingDoc.analiseDados.data && (
                        <div>
                          <span className="text-slate-400 block font-semibold">Data:</span>
                          <span className="font-bold text-slate-800">{viewingDoc.analiseDados.data}</span>
                        </div>
                      )}
                      {viewingDoc.analiseDados.numeroLocalizador && (
                        <div>
                          <span className="text-slate-400 block font-semibold">Localizador:</span>
                          <span className="font-mono font-bold text-slate-800">{viewingDoc.analiseDados.numeroLocalizador}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Seção Matching de Candidatos com Prioridade e Nível de Confiança */}
              {viewingDoc.candidatos && viewingDoc.candidatos.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center justify-between">
                    <span>Candidatos Sugeridos para Vínculo</span>
                    <span className="text-xs font-normal text-slate-500">
                      Ranqueados por similaridade
                    </span>
                  </h4>

                  <div className="space-y-2">
                    {viewingDoc.candidatos.map((cand) => {
                      const confidenceBadges: Record<string, string> = {
                        alta: 'bg-emerald-100 text-emerald-800 border-emerald-300',
                        media: 'bg-amber-100 text-amber-800 border-amber-300',
                        baixa: 'bg-slate-100 text-slate-600 border-slate-300',
                      };

                      const isCurrentlyLinked = viewingDoc.alunoId === cand.alunoId;

                      return (
                        <div
                          key={cand.alunoId}
                          className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-emerald-300 transition flex items-center justify-between gap-3"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-sm">{cand.alunoNome}</span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                                  confidenceBadges[cand.nivelConfianca]
                                }`}
                              >
                                Confiança: {cand.nivelConfianca} ({Math.round(cand.score * 100)}%)
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">{cand.criterio}</p>
                          </div>

                          {canEdit && (
                            <div>
                              {isCurrentlyLinked ? (
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  <span>Vinculado</span>
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleLinkAluno(viewingDoc.id, cand.alunoId)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition"
                                >
                                  <LinkIcon className="w-3 h-3" />
                                  <span>{viewingDoc.alunoId ? 'Trocar vínculo' : 'Vincular'}</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <a
                href={`/api/documentos/${viewingDoc.id}/download`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-xl border border-emerald-200 transition"
              >
                <Download className="w-4 h-4" />
                <span>Baixar Documento</span>
              </a>

              <button
                onClick={() => setViewingDoc(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-xl transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deletingId}
        title="Excluir Documento"
        message={`Confirma a exclusão do documento "${deletingTitle}"? O arquivo físico será removido do sistema.`}
        confirmLabel="Sim, excluir documento"
        isDestructive={true}
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
};
