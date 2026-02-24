import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { Shield, LogIn, UserPlus } from 'lucide-react';

export function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  const { login, register, error, isLoading, clearError } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLogin) {
      await login(username, password);
    } else {
      await register(username, password, displayName);
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    clearError();
  };

  return (
    <div className="h-full flex items-center justify-center acid-bg">
      {/* Форма */}
      <div className="relative w-full max-w-md mx-4 z-10">
        {/* Логотип */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl glass neon-border-green mb-4">
            <Shield className="w-10 h-10 text-acid-green" />
          </div>
          <h1 className="text-4xl font-bold">
            <span className="text-white">Tele</span>
            <span className="text-acid-green neon-text-green">A</span>
            <span className="text-acid-pink neon-text-pink">I</span>
          </h1>
          <p className="text-gray-400 mt-2 text-sm">Безопасный мессенджер</p>
        </div>

        {/* Форма — стекло */}
        <div className="glass-strong rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-center mb-6 text-white">
            {isLogin ? 'Вход' : 'Регистрация'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Имя</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Ваше имя"
                  className="acid-input w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white placeholder-gray-500 transition-colors"
                  required={!isLogin}
                />
              </div>
            )}

            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Логин</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Введите логин"
                className="acid-input w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white placeholder-gray-500 transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Пароль</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Введите пароль"
                className="acid-input w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white placeholder-gray-500 transition-colors"
                required
              />
            </div>

            {error && (
              <div className="bg-acid-pink/10 border border-acid-pink/30 text-acid-pink rounded-xl px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="acid-btn w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-30"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : isLogin ? (
                <>
                  <LogIn className="w-5 h-5" />
                  Войти
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  Зарегистрироваться
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={switchMode}
              className="text-sm text-gray-400 hover:text-acid-green transition-colors"
            >
              {isLogin ? 'Нет аккаунта? Зарегистрироваться' : 'Есть аккаунт? Войти'}
            </button>
          </div>
        </div>

        {/* Кислотная полоска */}
        <div className="flex mt-6 rounded-full overflow-hidden h-1">
          <div className="flex-1 bg-acid-green shadow-neon-green" />
          <div className="flex-1 bg-acid-cyan shadow-neon-cyan" />
          <div className="flex-1 bg-acid-pink shadow-neon-pink" />
        </div>
      </div>
    </div>
  );
}
