import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, Mail, Lock, Loader2, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((state) => state.setAuth);
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: 'Ashishgdevadiga15@gmail.com',
      password: 'ashish15',
    }
  });

  const onSubmit = async (data: LoginFormValues) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/auth/login', data);
      if (res.success) {
        localStorage.removeItem('demo_mode');
        setAuth(res.user, res.accessToken, res.refreshToken);
        navigate('/dashboard');
      }
    } catch (err: any) {
      // Automatic demo fallback if server connection fails
      if (!err.isApiError || err.message?.includes('fetch') || err.message?.includes('JSON')) {
        handleQuickDemoLogin();
        return;
      }
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = () => {
    localStorage.setItem('demo_mode', 'true');
    setAuth({
      id: 'demo-user-001',
      email: 'Ashishgdevadiga15@gmail.com',
      role: 'USER',
      firstName: 'Ashish',
      lastName: 'G'
    }, 'demo-access-token-jwt');
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-center items-center px-6 relative overflow-hidden">
      {/* Soft Glow Backdrops */}
      <div className="absolute top-[20%] left-[30%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[30%] w-[40%] h-[40%] bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 90 }}
        className="w-full max-w-md"
      >
        {/* Logo Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center space-x-2 mb-3">
            <Heart className="h-7 w-7 text-blue-600 animate-pulse" />
            <span className="font-display font-bold text-2xl bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              HridayaDarpana
            </span>
          </Link>
          <h2 className="text-xl font-display font-semibold tracking-tight text-slate-900">Welcome Back</h2>
          <p className="text-xs text-slate-500 mt-1">Access your personalized cardiovascular insights console</p>
        </div>

        {/* Card Form */}
        <div className="glass-panel-glow p-8 rounded-2xl border border-slate-200/80 relative shadow-saas-lg">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
              <button
                type="button"
                onClick={handleQuickDemoLogin}
                className="text-[10px] underline font-bold text-blue-600 ml-2 shrink-0"
              >
                Use Demo Mode
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-2">Email Address</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <Mail className="h-4 w-4" />
                </span>
                <input
                  type="email"
                  {...register('email')}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-4 py-3 text-sm glass-input placeholder-slate-400"
                />
              </div>
              {errors.email && (
                <span className="text-[10px] text-rose-600 mt-1 block font-medium">{errors.email.message}</span>
              )}
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-medium text-slate-700">Password</label>
                <Link to="/forgot-password" className="text-[10px] text-blue-600 hover:underline">
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  type="password"
                  {...register('password')}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 text-sm glass-input placeholder-slate-400"
                />
              </div>
              {errors.password && (
                <span className="text-[10px] text-rose-600 mt-1 block font-medium">{errors.password.message}</span>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 mt-4 text-sm font-semibold text-white rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 shadow-sm shadow-blue-500/20 hover:-translate-y-0.5 transition-all flex items-center justify-center space-x-2 active:scale-[0.99] disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </form>

          {/* Quick Demo Sign In Action */}
          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col items-center">
            <button
              type="button"
              onClick={handleQuickDemoLogin}
              className="w-full py-2.5 px-4 text-xs font-medium rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-blue-600 shadow-xs hover:-translate-y-0.5 transition-all flex items-center justify-center space-x-2"
            >
              <span>⚡ One-Click Instant Demo Login</span>
            </button>
          </div>

          <div className="mt-6 text-center text-xs text-slate-500 border-t border-slate-100 pt-4">
            <span>Don't have an account? </span>
            <Link to="/register" className="text-blue-600 hover:underline font-semibold">
              Register Here
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
