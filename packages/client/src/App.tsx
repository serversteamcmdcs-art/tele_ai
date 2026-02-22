import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { AuthPage } from './pages/AuthPage';
import { ChatPage } from './pages/ChatPage';

export default function App() {
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center acid-bg">
        <div className="text-center relative z-10">
          <div className="text-5xl font-bold mb-3">
            <span className="text-white">Tele</span>
            <span className="text-acid-green neon-text-green">A</span>
            <span className="text-acid-pink neon-text-pink">I</span>
          </div>
          <div className="text-acid-cyan/60 text-sm tracking-widest uppercase">
            \u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430...
          </div>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/auth"
        element={isAuthenticated ? <Navigate to="/" /> : <AuthPage />}
      />
      <Route
        path="/*"
        element={isAuthenticated ? <ChatPage /> : <Navigate to="/auth" />}
      />
    </Routes>
  );
}
