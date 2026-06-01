import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { signup } = useAuth();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (password !== confirm) {
      showError('As senhas não conferem');
      return;
    }
    setSubmitting(true);
    try {
      await signup(email, password);
      showSuccess('Conta criada com sucesso! Faça login.');
      navigate('/login', { replace: true });
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Erro ao cadastrar');
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
            width={140}
            height={140}
            className="h-32 w-32 sm:h-36 sm:w-36 object-contain"
          />
          <h1 className="mt-3 text-xl font-bold text-gray-900">Nosso Time</h1>
          <p className="text-sm text-gray-500">Crie sua conta</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">E-mail</span>
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
            <span className="text-sm font-medium text-gray-700">Senha</span>
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <span className="block mt-1 text-xs text-gray-500">
              Mínimo 8 caracteres com letras maiúsculas, minúsculas e números.
            </span>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Confirme a senha</span>
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="mt-1 w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </label>
          <button
            type="submit"
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {submitting ? (
              <LoadingSpinner className="text-white" />
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                Criar conta
              </>
            )}
          </button>
        </form>

        <p className="mt-6 text-sm text-center text-gray-500">
          Já tem conta?{' '}
          <Link to="/login" className="text-primary-700 font-medium hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
