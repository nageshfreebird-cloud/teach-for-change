import React, { useState } from 'react';
import { Phone, ArrowRight } from 'lucide-react';
import { Teacher } from '../types';
import Logo from './Logo';

interface LoginScreenProps {
  onLoginSuccess: (teacher: Teacher, token: string) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.length < 10) {
      setError('Please enter a valid 10-digit phone number.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      });

      const data = await res.json();
      setLoading(false);

      if (res.ok && data.success && data.teacher && data.token) {
        onLoginSuccess(data.teacher, data.token);
      } else {
        setError(data.error || 'Authentication failed. Is this phone number registered?');
      }
    } catch (err) {
      setLoading(false);
      setError('Network connection error. Please try again.');
    }
  };

  return (
    <div className="min-h-screen mesh-bg flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      
      {/* Decorative blurred circles for extra depth */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-indigo-400/30 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-fuchsia-400/30 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-pulse" style={{ animationDelay: '2s' }}></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 animate-fade-in">
        {/* Brand Logo */}
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-white/40 backdrop-blur-md rounded-3xl shadow-xl border border-white/50">
            <Logo className="w-24 h-24" />
          </div>
        </div>
        
        <h2 className="mt-2 text-center text-3xl font-extrabold text-indigo-950 tracking-tight">
          Teach For Change
        </h2>
        <p className="mt-2 text-center text-xs font-bold text-indigo-800/70 uppercase tracking-widest">
          English Assessment System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 animate-slide-up">
        <div className="glass-card py-8 px-4 sm:px-10 rounded-3xl">
          
          <form onSubmit={handlePhoneSubmit} className="space-y-6" id="form-login-phone">
            <div>
              <label htmlFor="phone-input" className="block text-sm font-bold text-indigo-900 mb-2">
                Teacher Registered Phone Number
              </label>
              <div className="relative rounded-2xl shadow-sm group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-indigo-600 text-indigo-400">
                  <Phone className="h-5 w-5" />
                </div>
                <input
                  type="tel"
                  name="phone"
                  id="phone-input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="98765 43210"
                  required
                  className="block w-full pl-12 pr-4 py-3.5 bg-white/60 hover:bg-white/80 focus:bg-white border-2 border-white/50 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 rounded-2xl transition-all font-bold text-indigo-950 placeholder:text-indigo-300 focus:outline-none"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-2xl bg-rose-50/90 border border-rose-200 p-4 text-sm text-rose-700 font-bold leading-relaxed shadow-sm animate-fade-in backdrop-blur-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              id="btn-login-submit"
              disabled={loading}
              className="w-full flex justify-center items-center space-x-2 py-4 px-4 border border-transparent rounded-2xl shadow-lg text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/30 active:scale-[0.98] transition-all disabled:opacity-70 disabled:scale-100 cursor-pointer overflow-hidden relative"
            >
              <span className="relative z-10">{loading ? 'Authenticating...' : 'Secure Log In'}</span>
              {!loading && <ArrowRight className="w-5 h-5 relative z-10" />}
              {loading && (
                <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
              )}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}
