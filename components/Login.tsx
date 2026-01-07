
import React, { useState } from 'react';
import { User, Lock, ArrowRight, Loader2, Sparkles } from 'lucide-react';

interface LoginProps {
  onLogin: (username: string) => Promise<void>;
  onRegister: (username: string) => Promise<void>;
}

export const Login: React.FC<LoginProps> = ({ onLogin, onRegister }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    setError('');
    setLoading(true);

    try {
      if (isRegistering) {
        await onRegister(username.trim());
      } else {
        await onLogin(username.trim());
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl mx-auto flex items-center justify-center shadow-2xl shadow-blue-900/20 mb-6">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Shape AI Chat</h1>
          <p className="text-neutral-400">Internal Multi-User Knowledge Base</p>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 shadow-xl">
          <div className="flex items-center gap-4 mb-8 border-b border-neutral-800 pb-2">
            <button
              onClick={() => setIsRegistering(false)}
              className={`pb-2 text-sm font-medium transition-colors relative ${
                !isRegistering ? 'text-blue-400' : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              Sign In
              {!isRegistering && <div className="absolute bottom-[-9px] left-0 right-0 h-0.5 bg-blue-500" />}
            </button>
            <button
              onClick={() => setIsRegistering(true)}
              className={`pb-2 text-sm font-medium transition-colors relative ${
                isRegistering ? 'text-blue-400' : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              Create Account
              {isRegistering && <div className="absolute bottom-[-9px] left-0 right-0 h-0.5 bg-blue-500" />}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1.5">Username</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="w-4 h-4 text-neutral-500" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 bg-neutral-950 border border-neutral-800 rounded-lg text-white placeholder-neutral-600 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                  placeholder="Enter your username"
                  autoFocus
                />
              </div>
            </div>

            {error && (
              <div className="text-red-400 text-xs bg-red-900/10 border border-red-900/20 p-3 rounded-lg flex items-center gap-2">
                <Lock className="w-3 h-3" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !username}
              className="w-full flex items-center justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-neutral-900 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-6"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {isRegistering ? 'Create Account' : 'Sign In'}
                  <ArrowRight className="ml-2 w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
        
        <p className="text-center text-xs text-neutral-600 mt-6">
          Powered by Google Gemini • IndexedDB Storage
        </p>
      </div>
    </div>
  );
};
