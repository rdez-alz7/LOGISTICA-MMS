import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Users,
  Compass,
  FileText,
  Plus,
  Eye,
  Calendar,
  Clock,
  Building,
  CheckCircle,
  AlertCircle,
  File,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Aluno, Viagem, Documento } from '../types';

export const AlunoDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const canEdit = hasRole('ADMIN_HOST', 'ADMIN', 'GESTOR');

  const [aluno, setAluno] = useState<Aluno | null>(null);
  const [viagens, setViagens] = useState<Viagem[]>([]);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [activeTab, setActiveTab] = useState<'viagens' | 'documentos'>('viagens');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAlunoData = async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const [alunoRes, viagensRes, docsRes] = await Promise.all([
        api.get(`/alunos/${id}`),
        api.get('/viagens', { params: { alunoId: id } }),
        api.get('/documentos', { params: { alunoId: id } }),
      ]);
      setAluno(alunoRes.data);
      setViagens(viagensRes.data.items || viagensRes.data);
      setDocumentos(docsRes.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Aluno não encontrado.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAlunoData();
  }, [id]);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-6 bg-slate-200 rounded w-24"></div>
        <div className="h-32 bg-white rounded-2xl border border-slate-200"></div>
        <div className="h-64 bg-white rounded-2xl border border-slate-200"></div>
      </div>
    );
  }

  if (error || !aluno) {
    return (
      <div className="p-8 bg-white rounded-2xl border border-rose-200 text-center max-w-md mx-auto mt-12">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-2" />
        <h3 className="text-lg font-bold text-slate-800">Aluno não encontrado</h3>
        <p className="text-sm text-slate-600 mt-1">{error}</p>
        <button
          onClick={() => navigate('/alunos')}
          className="mt-4 px-4 py-2 bg-emerald-700 text-white rounded-xl text-sm font-semibold"
        >
          Voltar para lista de alunos
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Link
          to="/alunos"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-emerald-700 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para Alunos</span>
        </Link>
      </div>

      {/* Student Profile Card */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-800 text-white font-black text-2xl flex items-center justify-center shadow-md shadow-emerald-900/10">
            {aluno.nome.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-slate-900">{aluno.nome}</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                {aluno.status}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
              <span className="font-semibold text-slate-700">Obreiro responsável:</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-900 font-bold border border-emerald-200 text-xs">
                <Building className="w-3.5 h-3.5 text-emerald-600" />
                {aluno.obreiroNome}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400">
            Cadastrado em: {new Date(aluno.createdAt).toLocaleDateString('pt-BR')}
          </span>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('viagens')}
          className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm border-b-2 transition ${
            activeTab === 'viagens'
              ? 'border-emerald-700 text-emerald-800 bg-emerald-50/40 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Compass className="w-4 h-4" />
          <span>Viagens ({viagens.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('documentos')}
          className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm border-b-2 transition ${
            activeTab === 'documentos'
              ? 'border-emerald-700 text-emerald-800 bg-emerald-50/40 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Documentos e Bilhetes ({documentos.length})</span>
        </button>
      </div>

      {/* Tab: Viagens */}
      {activeTab === 'viagens' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">
              Viagens registradas para {aluno.nome}
            </h2>
            {canEdit && (
              <Link
                to="/viagens"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-xs rounded-xl shadow-xs transition"
              >
                <Plus className="w-4 h-4" />
                <span>Nova Viagem</span>
              </Link>
            )}
          </div>

          {viagens.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400">
              <Compass className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="font-semibold text-slate-700">Nenhuma viagem cadastrada para este aluno.</p>
              <p className="text-xs text-slate-500 mt-1">
                Todas as viagens deste aluno serão listadas e rastreadas aqui.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {viagens.map((viagem) => (
                <div
                  key={viagem.id}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-500/40 transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500">
                        {viagem.empresa || 'Transporte'}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                        {viagem.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-sm">
                      <div className="flex-1">
                        <p className="font-bold text-slate-900">{viagem.origem}</p>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3" /> {viagem.dataSaida} • {viagem.horarioSaida}
                        </p>
                      </div>
                      <div className="px-3 text-slate-300 font-bold">→</div>
                      <div className="flex-1 text-right">
                        <p className="font-bold text-slate-900">{viagem.destino}</p>
                        <p className="text-xs text-slate-500 flex items-center justify-end gap-1 mt-0.5">
                          <Clock className="w-3 h-3" /> {viagem.dataChegada} • {viagem.horarioChegada}
                        </p>
                      </div>
                    </div>

                    {viagem.numeroLocalizador && (
                      <div className="mt-3 p-2 bg-slate-50 rounded-lg text-xs font-mono text-slate-700 border border-slate-200">
                        Localizador: <strong>{viagem.numeroLocalizador}</strong>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Documentos */}
      {activeTab === 'documentos' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">
              Documentos vinculados a {aluno.nome}
            </h2>
            {canEdit && (
              <Link
                to="/documentos"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-xs rounded-xl shadow-xs transition"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar Documento</span>
              </Link>
            )}
          </div>

          {documentos.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400">
              <FileText className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="font-semibold text-slate-700">Nenhum documento anexado para este aluno.</p>
              <p className="text-xs text-slate-500 mt-1">
                Passagens, bilhetes, autorizações e recibos deste aluno aparecerão aqui.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {documentos.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700 flex-shrink-0">
                      <File className="w-5 h-5 text-emerald-700" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-900 text-sm truncate">{doc.titulo}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-semibold rounded-md">
                        {doc.tipo}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span>{new Date(doc.createdAt).toLocaleDateString('pt-BR')}</span>
                    <a
                      href={`/api/documentos/${doc.id}/download`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-700 font-bold hover:underline"
                    >
                      Baixar
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
