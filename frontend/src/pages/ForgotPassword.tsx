import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, MailCheck, Send } from 'lucide-react';
import { api, ApiError } from '../services/api';
import { useToast } from '../components/Toast';
import LoadingSpinner from '../components/LoadingSpinner';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const { showError } = useToast();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      await api.forgotPassword({ email: email.trim().toLowerCase() });
      setSent(true);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : 'Não foi possível enviar o link agora. Tente novamente.';
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
            Esqueci minha senha
          </h1>
          <p className="text-sm text-slate-500">
            Vamos enviar um link de redefinição para o seu e-mail.
          </p>
        </div>

        {sent ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl bg-emerald-50 ring-1 ring-emerald-200 p-4">
              <MailCheck className="w-5 h-5 mt-0.5 text-emerald-600 shrink-0" />
              <div className="text-sm text-emerald-900">
                <p className="font-semibold">Confira sua caixa de entrada.</p>
                <p className="mt-1 text-emerald-800">
                  Se houver uma conta com o e-mail informado, enviamos um link
                  para redefinir a senha. O link expira em 1 hora.
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Não recebeu? Verifique a pasta de spam ou{' '}
              <button
                type="button"
                onClick={() => setSent(false)}
                className="text-primary-700 font-medium hover:underline"
              >
                tente novamente
              </button>
              .
            </p>
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
            <button
              type="submit"
              disabled={submitting || !email.trim()}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {submitting ? (
                <LoadingSpinner className="text-white" />
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Enviar link
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
