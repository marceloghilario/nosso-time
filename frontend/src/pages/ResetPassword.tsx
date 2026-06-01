import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, KeyRound } from 'lucide-react';
import { api, ApiError } from '../services/api';
import { useToast } from '../components/Toast';
import LoadingSpinner from '../components/LoadingSpinner';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showError, showSuccess } = useToast();

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const emailFromUrl = searchParams.get('email');
    const codeFromUrl = searchParams.get('code');
    if (emailFromUrl) setEmail(emailFromUrl.trim().toLowerCase());
    if (codeFromUrl) setCode(codeFromUrl.trim());
  }, [searchParams]);

  const passwordsMatch =
    password.length === 0 || confirmPassword.length === 0
      ? true
      : password === confirmPassword;

  const passwordIsLongEnough = password.length === 0 || password.length >= 8;

  const canSubmit =
    !!email.trim() &&
    !!code.trim() &&
    password.length >= 8 &&
    password === confirmPassword &&
    !submitting;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await api.resetPassword({
        email: email.trim().toLowerCase(),
        code: code.trim(),
        newPassword: password,
      });
      setDone(true);
      showSuccess('Senha redefinida. Faça login com a nova senha.');
      setTimeout(() => navigate('/login', { replace: true }), 1500);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : 'Não foi possível redefinir a senha.';
      showError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-b from-slate-100 to-slate-200/70">
      <div className="w-full max-w-md bg-slate-50 rounded-2xl shadow-lg border border-slate-200 p-8">
        <div className="flex flex-col items-center text-center mb-6">
          <img
            src="/logo-512.png"
            alt="Nosso Time"
            width={120}
            height={120}
            className="h-24 w-24 object-contain"
          />
          <h1 className="mt-3 text-xl font-bold text-slate-900">
            Redefinir senha
          </h1>
          <p className="text-sm text-slate-500">
            Escolha uma nova senha para a sua conta.
          </p>
        </div>

        {done ? (
          <div className="flex items-start gap-3 rounded-xl bg-emerald-50 ring-1 ring-emerald-200 p-4">
            <CheckCircle2 className="w-5 h-5 mt-0.5 text-emerald-600 shrink-0" />
            <div className="text-sm text-emerald-900">
              <p className="font-semibold">Senha redefinida.</p>
              <p className="mt-1 text-emerald-800">
                Redirecionando para o login…
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">E-mail</span>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Código</span>
              <input
                type="text"
                inputMode="numeric"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Cole o código recebido por e-mail"
                className="mt-1 w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono tabular-nums"
              />
              <p className="mt-1 text-xs text-slate-500">
                Se você abriu pelo link do e-mail, este campo já vem preenchido.
              </p>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">
                Nova senha
              </span>
              <input
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              {!passwordIsLongEnough && (
                <p className="mt-1 text-xs text-rose-600">
                  Mínimo de 8 caracteres.
                </p>
              )}
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">
                Confirmar nova senha
              </span>
              <input
                type="password"
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              {!passwordsMatch && (
                <p className="mt-1 text-xs text-rose-600">
                  As senhas não coincidem.
                </p>
              )}
            </label>
            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {submitting ? (
                <LoadingSpinner className="text-white" />
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  Redefinir senha
                </>
              )}
            </button>
          </form>
        )}

        <p className="mt-6 text-sm text-center text-slate-500">
          <Link
            to="/login"
            className="inline-flex items-center gap-1 text-primary-700 font-medium hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para login
          </Link>
        </p>
      </div>
    </div>
  );
}
