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
    resolver: zodResolver(loginSchema)
  });

  const onSubmit = async (data: LoginFormValues) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/auth/login', data);
      if (res.success) {
        localStorage.removeItem('demo_mode');
        setAuth(res.user, res.accessToken);
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-health-darker text-white flex flex-col justify-center items-center px-6 relative overflow-hidden">
      {/* Glow Backdrops */}
      <div className="absolute top-[20%] left-[30%] w-[40%] h-[40%] bg-health-blue/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[30%] w-[40%] h-[40%] bg-health-cyan/10 rounded-full blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 90 }}
        className="w-full max-w-md"
      >
        {/* Logo Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center space-x-2 mb-3">
            <Heart className="h-7 w-7 text-health-rose animate-pulse" />
            <span className="font-display font-bold text-2xl bg-gradient-to-r from-health-blue to-health-cyan bg-clip-text text-transparent">
              HridyaDarpan
            </span>
          </Link>
          <h2 className="text-xl font-display font-semibold tracking-tight text-white/90">Welcome Back</h2>
          <p className="text-xs text-health-textMuted mt-1">Access your personalized cardiovascular insights console</p>
        </div>

        {/* Card Form */}
        <div className="glass-panel-glow p-8 rounded-2xl border-white/10 relative">
          {error && (
            <div className="mb-6 p-4 rounded-lg bg-health-rose/10 border border-health-rose/30 text-health-rose text-xs flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-health-textMuted mb-2">Email Address</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-white/40">
                  <Mail className="h-4 w-4" />
                </span>
                <input
                  type="email"
                  {...register('email')}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-4 py-3 text-sm glass-input placeholder-white/20"
                />
              </div>
              {errors.email && (
                <span className="text-[10px] text-health-rose mt-1 block font-medium">{errors.email.message}</span>
              )}
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-medium text-health-textMuted">Password</label>
                <Link to="/forgot-password" className="text-[10px] text-health-cyan hover:underline">
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-white/40">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  type="password"
                  {...register('password')}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 text-sm glass-input placeholder-white/20"
                />
              </div>
              {errors.password && (
                <span className="text-[10px] text-health-rose mt-1 block font-medium">{errors.password.message}</span>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 mt-4 text-sm font-semibold rounded-xl bg-gradient-to-r from-health-blue to-health-cyan hover:shadow-glow transition-all hover:scale-[1.01] flex items-center justify-center space-x-2 active:scale-[0.99] disabled:opacity-50"
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

          <div className="mt-8 text-center text-xs text-health-textMuted border-t border-white/5 pt-6">
            <span>Don't have an account? </span>
            <Link to="/register" className="text-health-cyan hover:underline font-semibold">
              Register Here
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
