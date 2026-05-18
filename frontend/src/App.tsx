import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './components/Toast';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Teams from './pages/Teams';
import CreateTeam from './pages/CreateTeam';
import TeamDetail from './pages/TeamDetail';
import CreatePlayer from './pages/CreatePlayer';
import CreateGame from './pages/CreateGame';
import GameDetail from './pages/GameDetail';
import UploadPhoto from './pages/UploadPhoto';
import Explore from './pages/Explore';
import PublicTeamDetail from './pages/PublicTeamDetail';
import Tactica from './pages/Tactica';
import PublicFormationPage from './pages/PublicFormation';

function HomeRedirect() {
  const { isAuthenticated } = useAuth();
  return <Navigate to={isAuthenticated ? '/teams' : '/login'} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomeRedirect />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/formacoes/:shareToken" element={<PublicFormationPage />} />

            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="/teams" element={<Teams />} />
              <Route path="/teams/novo" element={<CreateTeam />} />
              <Route path="/teams/:teamId" element={<TeamDetail />} />
              <Route path="/teams/:teamId/jogadores/novo" element={<CreatePlayer />} />
              <Route path="/teams/:teamId/jogos/novo" element={<CreateGame />} />
              <Route path="/teams/:teamId/jogos/:gameId" element={<GameDetail />} />
              <Route path="/teams/:teamId/upload" element={<UploadPhoto />} />
              <Route path="/teams/:teamId/tatica" element={<Tactica />} />
              <Route path="/explorar" element={<Explore />} />
              <Route path="/explorar/:teamId" element={<PublicTeamDetail />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
