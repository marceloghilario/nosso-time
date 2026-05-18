import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Compass, LogOut, Trophy, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Layout() {
  const { session, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
      isActive
        ? 'bg-primary-50 text-primary-700 font-medium'
        : 'text-gray-600 hover:bg-gray-100'
    }`;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link to="/teams" className="flex items-center gap-2 shrink-0">
            <img
              src="/logo-192.png"
              alt="Nosso Time"
              width={40}
              height={40}
              className="h-10 w-10 object-contain"
            />
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-gray-900 leading-none">
                Nosso Time
              </h1>
              <p className="text-xs text-gray-500">
                Seu time, sua história, sempre juntos
              </p>
            </div>
          </Link>
          <nav className="flex items-center gap-1">
            <NavLink to="/teams" className={navItemClass} end>
              <Users className="w-4 h-4" />
              <span>Meus times</span>
            </NavLink>
            <NavLink to="/campeonatos" className={navItemClass}>
              <Trophy className="w-4 h-4" />
              <span className="hidden sm:inline">Campeonatos</span>
            </NavLink>
            <NavLink to="/explorar" className={navItemClass}>
              <Compass className="w-4 h-4" />
              <span className="hidden sm:inline">Explorar</span>
            </NavLink>
          </nav>
          <div className="flex items-center gap-3">
            {session && (
              <span className="hidden md:inline text-sm text-gray-600">{session.email}</span>
            )}
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sair</span>
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
