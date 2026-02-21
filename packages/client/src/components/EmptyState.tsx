import { Shield } from 'lucide-react';

export function EmptyState() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl glass neon-border-green mb-6 animate-neon-pulse">
          <Shield className="w-12 h-12 text-acid-green" />
        </div>
        <h2 className="text-3xl font-bold mb-2">
          <span className="text-white">Tele</span>
          <span className="text-acid-green neon-text-green">A</span>
          <span className="text-acid-pink neon-text-pink">I</span>
        </h2>
        <p className="text-gray-400 max-w-sm">
          Выберите чат из списка слева или создайте новый, чтобы начать общение
        </p>

        {/* Кислотная полоска */}
        <div className="flex mt-8 mx-auto w-32 rounded-full overflow-hidden h-1">
          <div className="flex-1 bg-acid-green shadow-neon-green" />
          <div className="flex-1 bg-acid-cyan shadow-neon-cyan" />
          <div className="flex-1 bg-acid-pink shadow-neon-pink" />
        </div>
      </div>
    </div>
  );
}
