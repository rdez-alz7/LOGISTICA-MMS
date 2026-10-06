import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Lock, CheckCircle, AlertCircle, Shield, User, ArrowRight } from 'lucide-react';
import { api } from '../lib/api';
import { Logo } from '../components/Logo';

export const ConvitePage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [inviteData, setInviteData] = useState<{ nome: string; email: string; role: string } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const verifyInvite = async () => {
      if (!token) {
        setLoadError('Token de convite não informado.');
        setIsLoading(false);
        return;
      }

      try {
        const res = await api.get(`/invitations/verify/${token}`);
        setInviteData(res.data);
      } catch (err: any) {
        setLoadError(err.response?.data?.message || 'Este convite é inválido ou já expirou.');
      } finally {
        setIsLoading(false);
      }
    };

    verifyInvite();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || password.length < 4) {
      setFormError('A senha deve ter pelo menos 4 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setFormError('As senhas informadas não coincidem.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      await api.post(`/invitations/accept/${token}`, {
        password,
        confirmPassword,
      });

      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 2500);
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Erro ao ativar conta.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-emerald-950 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-emerald-800 to-emerald-950 p-8 text-center text-white">
          <div className="flex justify-center mb-3">
            <Logo size="xl" variant="white" />
          </div>
          <p className="text-emerald-100 text-sm">Ativação de Convite</p>
        </div>

        <div className="p-8">
          {isLoading ? (
            <div className="py-12 text-center text-slate-500 space-y-3">
              <svg className="animate-spin h-8 w-8 text-emerald-600 mx-auto" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <p className="text-sm font-medium">Validando token de convite...</p>
            </div>
          ) : loadError ? (
            <div className="py-8 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Convite Indisponível</h3>
                <p className="text-sm text-slate-600 mt-1">{loadError}</p>
              </div>
              <Link
                to="/login"
                className="inline-block mt-4 px-5 py-2.5 bg-slate-900 text-white font-semibold text-xs rounded-xl"
              >
                Ir para Tela de Login
              </Link>
            </div>
          ) : success ? (
            <div className="py-8 text-center space-y-4 animate-in fade-in">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Conta Ativada com Sucesso!</h3>
                <p className="text-sm text-slate-600 mt-1">
                  Redirecionando para a tela de login em instantes...
                </p>
              </div>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-emerald-700 text-white font-semibold text-xs rounded-xl"
              >
                <span>Acessar Agora</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Invite info card */}
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Convidado
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 text-[10px] font-bold">
                    {inviteData?.role}
                  </span>
                </div>
                <p className="font-bold text-slate-900 text-base">{inviteData?.nome}</p>
                <p className="text-xs text-slate-600">{inviteData?.email}</p>
              </div>

              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Escolha sua senha <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    minLength={4}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 4 caracteres"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Confirme sua senha <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    minLength={4}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a senha digitada"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm rounded-xl transition shadow-md shadow-emerald-950/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Ativando conta...</span>
                  </>
                ) : (
                  <span>Criar Conta e Acessar</span>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
