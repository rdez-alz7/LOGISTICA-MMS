import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Compass,
  FileText,
  UserCheck,
  Mail,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Clock,
  ShieldCheck,
  Database,
  Building,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Viagem, Documento } from '../types';

interface DashboardData {
  cards: {
    totalAlunos: number;
    alunosAtivos: number;
    totalObreiros: number;
    totalViagens: number;
    totalDocumentos: number;
    convitesPendentes?: number;
  };
  alunosPorObreiro: Array<{
    obreiroId: string;
    obreiroNome: string;
    funcao: string;
    quantidadeAlunos: number;
  }>;
  recentViagens: Viagem[];
  recentDocumentos: Documento[];
  dbStatus: {
    engine: string;
    connected: boolean;
  };
}

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get('/dashboard');
      setData(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao carregar dados do dashboard.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded-lg w-48 mb-2"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-28 bg-white border border-slate-200 rounded-2xl p-4"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-72 bg-white border border-slate-200 rounded-2xl"></div>
          <div className="h-72 bg-white border border-slate-200 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 bg-white rounded-2xl border border-rose-200 text-center max-w-lg mx-auto mt-12 shadow-sm">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-800">Falha ao carregar métricas</h3>
        <p className="text-sm text-slate-600 mt-1">{error}</p>
        <button
          onClick={fetchDashboardData}
          className="mt-4 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-sm font-semibold transition"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  const { cards, alunosPorObreiro, recentViagens, recentDocumentos, dbStatus } = data;

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Painel Geral
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Visão consolidada de alunos, viagens, documentos e colaboradores em tempo real.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-700 shadow-2xs">
            <Database className="w-3.5 h-3.5 text-emerald-600" />
            <span>{dbStatus.engine}</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total Alunos */}
        <Link
          to="/alunos"
          className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:border-emerald-500/50 hover:shadow-md transition flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Alunos</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-900">{cards.totalAlunos}</span>
          </div>
        </Link>

        {/* Alunos Ativos */}
        <Link
          to="/alunos"
          className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:border-emerald-500/50 hover:shadow-md transition flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Ativos</span>
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center group-hover:bg-teal-600 group-hover:text-white transition">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-emerald-700">{cards.alunosAtivos}</span>
          </div>
        </Link>

        {/* Total Obreiros */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Obreiros</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <Building className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-900">{cards.totalObreiros}</span>
          </div>
        </div>

        {/* Total Viagens */}
        <Link
          to="/viagens"
          className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:border-emerald-500/50 hover:shadow-md transition flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Viagens</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition">
              <Compass className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-900">{cards.totalViagens}</span>
          </div>
        </Link>

        {/* Total Documentos */}
        <Link
          to="/documentos"
          className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:border-emerald-500/50 hover:shadow-md transition flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Documentos</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-900">{cards.totalDocumentos}</span>
          </div>
        </Link>

        {/* Convites Pendentes */}
        {cards.convitesPendentes !== undefined && (
          <Link
            to="/configuracoes"
            className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:border-emerald-500/50 hover:shadow-md transition flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Convites</span>
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition">
                <Mail className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-purple-700">{cards.convitesPendentes}</span>
            </div>
          </Link>
        )}
      </div>

      {/* Main Grid: Alunos por Obreiro + Viagens Recentes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Section: Alunos por Obreiro */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Alunos por Obreiro</h2>
                <p className="text-xs text-slate-500">Distribuição de alunos sob tutela</p>
              </div>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {alunosPorObreiro.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm">
                Nenhum obreiro ou aluno cadastrado.
              </div>
            ) : (
              alunosPorObreiro.map((item) => {
                const percentage =
                  cards.totalAlunos > 0
                    ? Math.round((item.quantidadeAlunos / cards.totalAlunos) * 100)
                    : 0;

                return (
                  <div
                    key={item.obreiroId}
                    className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 hover:bg-emerald-50/40 transition"
                  >
                    <div className="flex items-center justify-between text-sm">
                      <div>
                        <p className="font-semibold text-slate-800">{item.obreiroNome}</p>
                        <p className="text-[11px] text-slate-500">{item.funcao}</p>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-slate-900 text-base">
                          {item.quantidadeAlunos}
                        </span>
                        <span className="text-xs text-slate-500 ml-1">aluno(s)</span>
                      </div>
                    </div>

                    <div className="mt-2.5 w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-emerald-600 h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Section: Viagens Recentes */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-50 text-indigo-700">
                <Compass className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Viagens Recentes</h2>
                <p className="text-xs text-slate-500">Últimos itinerários e rastreios</p>
              </div>
            </div>
            <Link
              to="/viagens"
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 hover:underline"
            >
              <span>Ver todas</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="mt-5 space-y-3">
            {recentViagens.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm">
                Nenhuma viagem registrada ainda.
              </div>
            ) : (
              recentViagens.map((viagem) => {
                const statusStyles: Record<string, string> = {
                  PLANEJADA: 'bg-blue-100 text-blue-800 border-blue-200',
                  EM_ANDAMENTO: 'bg-emerald-100 text-emerald-800 border-emerald-300 animate-pulse',
                  CONCLUÍDA: 'bg-slate-100 text-slate-700 border-slate-200',
                  CANCELADA: 'bg-rose-100 text-rose-800 border-rose-200',
                };

                return (
                  <div
                    key={viagem.id}
                    className="p-4 rounded-xl border border-slate-200/80 hover:border-slate-300 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">
                          {viagem.alunoNome}
                        </span>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs font-medium text-slate-600">
                          Obr. {viagem.obreiroNome}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 flex items-center gap-1">
                        <span>{viagem.origem}</span>
                        <span className="text-slate-400 font-bold">→</span>
                        <span>{viagem.destino}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right text-xs">
                        <p className="font-semibold text-slate-800">{viagem.dataSaida}</p>
                        <p className="text-slate-500">{viagem.horarioSaida}</p>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wider ${
                          statusStyles[viagem.status] || 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {viagem.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Section: Documentos Recentes */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Documentos Recentes</h2>
              <p className="text-xs text-slate-500">Últimos documentos cadastrados no repositório</p>
            </div>
          </div>
          <Link
            to="/documentos"
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 hover:underline"
          >
            <span>Gerenciar documentos</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="mt-5 overflow-x-auto">
          {recentDocumentos.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-sm">
              Nenhum documento anexado.
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 text-[11px] uppercase tracking-wider font-semibold">
                  <th className="pb-3">Título</th>
                  <th className="pb-3">Tipo</th>
                  <th className="pb-3">Aluno Vinculado</th>
                  <th className="pb-3">Data de Envio</th>
                  <th className="pb-3">Status da Análise</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentDocumentos.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/70">
                    <td className="py-3 font-semibold text-slate-900">{doc.titulo}</td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-medium">
                        {doc.tipo}
                      </span>
                    </td>
                    <td className="py-3 text-slate-600">
                      {doc.alunoNome || <span className="text-slate-400 italic">Sem vínculo</span>}
                    </td>
                    <td className="py-3 text-slate-500 text-xs">
                      {new Date(doc.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          doc.analiseStatus === 'ANALISADO'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : doc.analiseStatus === 'ERRO'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {doc.analiseStatus === 'NAO_ANALISADO' ? 'Não analisado' : doc.analiseStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
