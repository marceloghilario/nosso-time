import { Link, Outlet, useNavigate } from 'react-router-dom';
import { LogOut, Trophy } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Layout() {
  const { session, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/teams" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 leading-none">Nosso Time</h1>
              <p className="text-xs text-gray-500">Gestão de times amadores</p>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            {session && (
              <span className="hidden sm:inline text-sm text-gray-600">{session.email}</span>
            )}
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
