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
      email: '',
      password: '',
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
      } else {
        setError(res.message || 'Login failed. Please verify credentials.');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify your credentials and network connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = () => {
    localStorage.setItem('demo_mode', 'true');
    setAuth({
      id: 'demo-patient-amit',
      email: 'demo@hridayadarpana.org',
      role: 'USER',
      firstName: 'Demo',
      lastName: 'User'
    }, 'demo-token-123');
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30] flex flex-col justify-center items-center px-6 relative overflow-hidden font-sans medical-grid">
      {/* Soft Glow Backdrops */}
      <div className="absolute top-[20%] left-[30%] w-[40%] h-[40%] bg-gradient-radial from-[#3ee5fe]/10 to-transparent rounded-full blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 90 }}
        className="w-full max-w-md"
      >
        {/* Logo Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center justify-center mb-4">
            <img
              src="/hridayadarpana-logo.png"
              alt="HridayaDarpana"
              className="h-12 w-auto object-contain"
            />
          </Link>
          <h2 className="text-xl font-geist font-bold tracking-tight text-[#0b1c30]">Welcome Back</h2>
          <p className="text-xs font-inter text-[#737688] mt-1">Access your personalized cardiovascular insights console</p>
        </div>

        {/* Card Form */}
        <div className="bg-white p-8 rounded-2xl border border-[#c3c5d9] relative shadow-stitch">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-[#ffdad6]/60 border border-[#ba1a1a]/30 text-[#93000a] text-xs flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
              <button
                type="button"
                onClick={handleQuickDemoLogin}
                className="text-[10px] underline font-bold text-[#0052ff] ml-2 shrink-0"
              >
                Use Demo Mode
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-xs font-geist font-semibold text-[#0b1c30] mb-2">Email Address</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[#737688]">
                  <Mail className="h-4 w-4" />
                </span>
                <input
                  type="email"
                  {...register('email')}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-4 py-3 text-sm bg-white border border-[#c3c5d9] rounded-xl text-[#0b1c30] placeholder-[#737688] focus:outline-none focus:border-[#0052ff] focus:ring-1 focus:ring-[#0052ff] transition-all"
                />
              </div>
              {errors.email && (
                <span className="text-[10px] text-[#ba1a1a] mt-1 block font-medium">{errors.email.message}</span>
              )}
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-geist font-semibold text-[#0b1c30]">Password</label>
                <Link to="/forgot-password" className="text-[10px] font-semibold text-[#0052ff] hover:underline">
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[#737688]">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  type="password"
                  {...register('password')}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 text-sm bg-white border border-[#c3c5d9] rounded-xl text-[#0b1c30] placeholder-[#737688] focus:outline-none focus:border-[#0052ff] focus:ring-1 focus:ring-[#0052ff] transition-all"
                />
              </div>
              {errors.password && (
                <span className="text-[10px] text-[#ba1a1a] mt-1 block font-medium">{errors.password.message}</span>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 mt-4 text-sm font-geist font-bold text-white rounded-xl bg-[#0052ff] hover:bg-[#003ec7] shadow-md hover:-translate-y-0.5 transition-all flex items-center justify-center space-x-2 active:scale-[0.99] disabled:opacity-50"
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
          <div className="mt-4 pt-4 border-t border-[#e5eeff] flex flex-col items-center">
            <button
              type="button"
              onClick={handleQuickDemoLogin}
              className="w-full py-2.5 px-4 text-xs font-geist font-semibold rounded-xl bg-[#eff4ff] border border-[#0052ff]/30 text-[#003ec7] hover:bg-[#0052ff] hover:text-white transition-all flex items-center justify-center space-x-2"
            >
              <span>⚡ Instant Demo Login</span>
            </button>
          </div>

          <div className="mt-6 text-center text-xs text-[#737688] border-t border-[#e5eeff] pt-4">
            <span>Don't have an account? </span>
            <Link to="/register" className="text-[#0052ff] hover:underline font-bold">
              Register Here
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
