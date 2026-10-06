import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  FileSpreadsheet,
  Download,
  Filter,
  Users,
  Compass,
  FileText,
  ShieldCheck,
  Building,
  CheckCircle,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Obreiro } from '../types';

export const RelatoriosPage: React.FC = () => {
  const { hasRole } = useAuth();
  const canViewAuditoria = hasRole('ADMIN_HOST', 'ADMIN');

  const [activeReport, setActiveReport] = useState<
    'alunos' | 'viagens' | 'documentos' | 'geral' | 'auditoria'
  >('alunos');

  const [obreiros, setObreiros] = useState<Obreiro[]>([]);
  const [selectedObreiro, setSelectedObreiro] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedTipo, setSelectedTipo] = useState('');

  const [previewData, setPreviewData] = useState<any[]>([]);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Toast
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  useEffect(() => {
    api.get('/obreiros').then((res) => setObreiros(res.data)).catch(() => {});
  }, []);

  const loadPreview = async () => {
    setIsLoadingPreview(true);
    try {
      let endpoint = `/relatorios/${activeReport}`;
      if (activeReport === 'geral') endpoint = '/relatorios/alunos';

      const params: any = {};
      if (selectedObreiro) params.obreiroId = selectedObreiro;
      if (selectedStatus) params.status = selectedStatus;
      if (selectedTipo) params.tipo = selectedTipo;

      const res = await api.get(endpoint, { params });
      setPreviewData(res.data.items || res.data || []);
    } catch (err) {
      console.error('Erro ao carregar pré-visualização:', err);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  useEffect(() => {
    loadPreview();
  }, [activeReport, selectedObreiro, selectedStatus, selectedTipo]);

  const handleExportXLSX = async (reportType: string) => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      if (selectedObreiro) params.append('obreiroId', selectedObreiro);
      if (selectedStatus) params.append('status', selectedStatus);
      if (selectedTipo) params.append('tipo', selectedTipo);

      const url = `/api/relatorios/${reportType}/exportar?${params.toString()}`;
      
      // Use direct fetch with bearer token to download binary xlsx
      const token = localStorage.getItem('log_mms_token');
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Falha ao gerar arquivo XLSX.');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `LOG_MMS_Relatorio_${reportType}_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      showToast('success', 'Relatório XLSX baixado com sucesso!');
    } catch (err: any) {
      showToast('error', err.message || 'Erro ao exportar arquivo Excel.');
    } finally {
      setIsExporting(false);
    }
  };

  const reportsList = [
    {
      id: 'alunos',
      title: 'Relatório de Alunos',
      description: 'Nome, obreiro responsável e status de cada aluno cadastrado.',
      icon: Users,
      badge: 'Alunos',
    },
    {
      id: 'viagens',
      title: 'Relatório de Viagens e Rastreio',
      description: 'Aluno, obreiro, trechos de origem/destino, horários, empresa e status.',
      icon: Compass,
      badge: 'Viagens',
    },
    {
      id: 'documentos',
      title: 'Relatório de Documentos e Bilhetes',
      description: 'Título, aluno vinculado, viagem, tipo e status do documento.',
      icon: FileText,
      badge: 'Documentos',
    },
    {
      id: 'geral',
      title: 'Relatório Geral Completo',
      description: 'Planilha abrangente consolidada em 4 abas (Alunos, Viagens, Documentos, Auditoria).',
      icon: FileSpreadsheet,
      badge: 'Multi-Abas',
    },
    ...(canViewAuditoria
      ? [
          {
            id: 'auditoria',
            title: 'Relatório de Auditoria e Conformidade',
            description: 'Histórico detalhado de ações, horários, usuários, logins e alterações.',
            icon: ShieldCheck,
            badge: 'Auditoria',
          },
        ]
      : []),
  ];

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
            <BarChart3 className="w-6 h-6 text-emerald-700" />
            <span>Relatórios Oficiais</span>
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Geração real de planilhas eletrônicas profissionais em formato .xlsx.
          </p>
        </div>

        <button
          onClick={() => handleExportXLSX(activeReport)}
          disabled={isExporting}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-sm transition shadow-sm active:scale-95 disabled:opacity-50 flex-shrink-0"
        >
          {isExporting ? (
            <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          ) : (
            <Download className="w-4 h-4" />
          )}
          <span>Exportar Excel (.xlsx)</span>
        </button>
      </div>

      {/* Report Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {reportsList.map((rep) => {
          const Icon = rep.icon;
          const isSelected = activeReport === rep.id;

          return (
            <button
              key={rep.id}
              onClick={() => setActiveReport(rep.id as any)}
              className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between ${
                isSelected
                  ? 'bg-emerald-50/70 border-emerald-500 shadow-sm ring-2 ring-emerald-500/20'
                  : 'bg-white border-slate-200/80 hover:border-slate-300 shadow-xs'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      isSelected
                        ? 'bg-emerald-700 text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                      isSelected
                        ? 'bg-emerald-200 text-emerald-900 font-extrabold'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {rep.badge}
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 text-sm leading-snug">{rep.title}</h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                  {rep.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100/80 flex items-center justify-between text-xs font-semibold text-emerald-800">
                <span>{isSelected ? 'Selecionado' : 'Selecionar'}</span>
                <FileSpreadsheet className="w-4 h-4" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Filters Bar for Active Report */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
          <Filter className="w-4 h-4 text-emerald-600" />
          <span>Filtros do Relatório Ativo:</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Obreiro filter for Alunos */}
          {activeReport === 'alunos' && (
            <select
              value={selectedObreiro}
              onChange={(e) => setSelectedObreiro(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Todos os obreiros</option>
              {obreiros.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nome}
                </option>
              ))}
            </select>
          )}

          {/* Status filter */}
          {(activeReport === 'alunos' || activeReport === 'viagens') && (
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Todos os status</option>
              {activeReport === 'alunos' ? (
                <>
                  <option value="ATIVO">ATIVO</option>
                  <option value="INATIVO">INATIVO</option>
                  <option value="CONCLUÍDO">CONCLUÍDO</option>
                  <option value="SUSPENSO">SUSPENSO</option>
                </>
              ) : (
                <>
                  <option value="PLANEJADA">PLANEJADA</option>
                  <option value="EM_ANDAMENTO">EM ANDAMENTO</option>
                  <option value="CONCLUÍDA">CONCLUÍDA</option>
                  <option value="CANCELADA">CANCELADA</option>
                </>
              )}
            </select>
          )}

          {/* Tipo filter for Documentos */}
          {activeReport === 'documentos' && (
            <select
              value={selectedTipo}
              onChange={(e) => setSelectedTipo(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Todos os tipos</option>
              <option value="passagem/ticket">Passagem / Ticket</option>
              <option value="documento pessoal">Documento Pessoal</option>
              <option value="recibo">Recibo</option>
              <option value="declaração">Declaração</option>
              <option value="outro">Outro</option>
            </select>
          )}

          {(selectedObreiro || selectedStatus || selectedTipo) && (
            <button
              onClick={() => {
                setSelectedObreiro('');
                setSelectedStatus('');
                setSelectedTipo('');
              }}
              className="text-xs text-rose-600 font-bold hover:underline"
            >
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      {/* Preview Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-emerald-700" />
            <span className="font-bold text-sm text-slate-900">
              Pré-visualização dos Registros ({previewData.length})
            </span>
          </div>
          <span className="text-xs text-slate-400">
            Exportação gerada via motor de alta performance .xlsx
          </span>
        </div>

        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-left border-collapse text-sm">
            {activeReport === 'alunos' && (
              <>
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-6">Nome do Aluno</th>
                    <th className="py-3 px-6">Obreiro responsável</th>
                    <th className="py-3 px-6 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {previewData.map((a: any) => (
                    <tr key={a.id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-6 font-bold text-slate-900">{a.nome}</td>
                      <td className="py-3 px-6 text-slate-700">{a.obreiroNome}</td>
                      <td className="py-3 px-6 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {a.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </>
            )}

            {activeReport === 'viagens' && (
              <>
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-6">Aluno</th>
                    <th className="py-3 px-6">Obreiro</th>
                    <th className="py-3 px-6">Origem / Destino</th>
                    <th className="py-3 px-6 text-center">Saída</th>
                    <th className="py-3 px-6 text-center">Chegada</th>
                    <th className="py-3 px-6 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {previewData.map((v: any) => (
                    <tr key={v.id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-6 font-bold text-slate-900">{v.alunoNome}</td>
                      <td className="py-3 px-6 text-slate-700">{v.obreiroNome}</td>
                      <td className="py-3 px-6 text-xs text-slate-700">
                        {v.origem} → {v.destino}
                      </td>
                      <td className="py-3 px-6 text-center text-xs">{v.dataSaida} {v.horarioSaida}</td>
                      <td className="py-3 px-6 text-center text-xs">{v.dataChegada} {v.horarioChegada}</td>
                      <td className="py-3 px-6 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                          {v.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </>
            )}

            {activeReport === 'documentos' && (
              <>
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-6">Documento</th>
                    <th className="py-3 px-6">Aluno</th>
                    <th className="py-3 px-6">Tipo</th>
                    <th className="py-3 px-6">Data de Envio</th>
                    <th className="py-3 px-6 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {previewData.map((d: any) => (
                    <tr key={d.id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-6 font-bold text-slate-900">{d.titulo}</td>
                      <td className="py-3 px-6 text-slate-700">{d.alunoNome || 'Sem vínculo'}</td>
                      <td className="py-3 px-6 text-xs">{d.tipo}</td>
                      <td className="py-3 px-6 text-xs text-slate-500">
                        {new Date(d.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-3 px-6 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                          {d.analiseStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </>
            )}

            {activeReport === 'geral' && (
              <>
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-6">Aba da Planilha</th>
                    <th className="py-3 px-6">Conteúdo Incluído</th>
                    <th className="py-3 px-6 text-center">Status da Exportação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-3 px-6 font-bold text-slate-900">1. Alunos</td>
                    <td className="py-3 px-6 text-slate-600">Relação completa de todos os alunos e seus obreiros</td>
                    <td className="py-3 px-6 text-center text-emerald-700 font-bold text-xs">Pronto para exportar</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-6 font-bold text-slate-900">2. Viagens</td>
                    <td className="py-3 px-6 text-slate-600">Itinerários, saídas, chegadas e companhias</td>
                    <td className="py-3 px-6 text-center text-emerald-700 font-bold text-xs">Pronto para exportar</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-6 font-bold text-slate-900">3. Documentos</td>
                    <td className="py-3 px-6 text-slate-600">Passagens, bilhetes e status de validação</td>
                    <td className="py-3 px-6 text-center text-emerald-700 font-bold text-xs">Pronto para exportar</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-6 font-bold text-slate-900">4. Auditoria</td>
                    <td className="py-3 px-6 text-slate-600">Histórico de ações e segurança</td>
                    <td className="py-3 px-6 text-center text-emerald-700 font-bold text-xs">Pronto para exportar</td>
                  </tr>
                </tbody>
              </>
            )}

            {activeReport === 'auditoria' && (
              <>
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-6">Data/Hora</th>
                    <th className="py-3 px-6">Usuário</th>
                    <th className="py-3 px-6">Função</th>
                    <th className="py-3 px-6">Ação</th>
                    <th className="py-3 px-6">Detalhes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {previewData.map((l: any) => (
                    <tr key={l.id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-6 text-xs text-slate-500">
                        {new Date(l.timestamp).toLocaleString('pt-BR')}
                      </td>
                      <td className="py-3 px-6 font-bold text-slate-900">{l.userName}</td>
                      <td className="py-3 px-6 text-xs text-slate-600">{l.userRole}</td>
                      <td className="py-3 px-6 text-xs font-mono font-semibold text-emerald-800">{l.acao}</td>
                      <td className="py-3 px-6 text-xs text-slate-600 max-w-xs truncate">{l.detalhes}</td>
                    </tr>
                  ))}
                </tbody>
              </>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};
