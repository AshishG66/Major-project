import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, Mail, Lock, User, Calendar, Ruler, Scale, Loader2, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';

const registerSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER'], {
    errorMap: () => ({ message: 'Please select a gender' }),
  }),
  height: z.preprocess((val) => Number(val), z.number().positive('Height must be a positive number')),
  weight: z.preprocess((val) => Number(val), z.number().positive('Weight must be a positive number')),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((state) => state.setAuth);
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      gender: 'MALE'
    }
  });

  const onSubmit = async (data: RegisterFormValues) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/auth/register', data);
      if (res.success) {
        localStorage.removeItem('demo_mode');
        setAuth(res.user, res.accessToken);
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-health-darker text-white flex flex-col justify-center items-center py-12 px-6 relative overflow-hidden">
      {/* Glow Backdrops */}
      <div className="absolute top-[10%] left-[10%] w-[50%] h-[50%] bg-health-blue/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[10%] right-[10%] w-[50%] h-[50%] bg-health-cyan/5 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 90 }}
        className="w-full max-w-2xl"
      >
        {/* Logo Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center space-x-2 mb-3">
            <Heart className="h-7 w-7 text-health-rose animate-pulse" />
            <span className="font-display font-bold text-2xl bg-gradient-to-r from-health-blue to-health-cyan bg-clip-text text-transparent">
              HridyaDarpan
            </span>
          </Link>
          <h2 className="text-xl font-display font-semibold tracking-tight text-white/90">Create Your Profile</h2>
          <p className="text-xs text-health-textMuted mt-1">Get started with personalized AI-powered cardiovascular monitoring</p>
        </div>

        {/* Card Form */}
        <div className="glass-panel-glow p-8 rounded-2xl border-white/10 relative">
          {error && (
            <div className="mb-6 p-4 rounded-lg bg-health-rose/10 border border-health-rose/30 text-health-rose text-xs flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* First Name */}
              <div>
                <label className="block text-xs font-medium text-health-textMuted mb-2">First Name</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-white/40">
                    <User className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    {...register('firstName')}
                    placeholder="John"
                    className="w-full pl-10 pr-4 py-3 text-sm glass-input placeholder-white/20"
                  />
                </div>
                {errors.firstName && (
                  <span className="text-[10px] text-health-rose mt-1 block font-medium">{errors.firstName.message}</span>
                )}
              </div>

              {/* Last Name */}
              <div>
                <label className="block text-xs font-medium text-health-textMuted mb-2">Last Name</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-white/40">
                    <User className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    {...register('lastName')}
                    placeholder="Doe"
                    className="w-full pl-10 pr-4 py-3 text-sm glass-input placeholder-white/20"
                  />
                </div>
                {errors.lastName && (
                  <span className="text-[10px] text-health-rose mt-1 block font-medium">{errors.lastName.message}</span>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-medium text-health-textMuted mb-2">Email Address</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-white/40">
                    <Mail className="h-4 w-4" />
                  </span>
                  <input
                    type="email"
                    {...register('email')}
                    placeholder="john.doe@example.com"
                    className="w-full pl-10 pr-4 py-3 text-sm glass-input placeholder-white/20"
                  />
                </div>
                {errors.email && (
                  <span className="text-[10px] text-health-rose mt-1 block font-medium">{errors.email.message}</span>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-medium text-health-textMuted mb-2">Password</label>
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

              {/* Date of Birth */}
              <div>
                <label className="block text-xs font-medium text-health-textMuted mb-2">Date of Birth</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-white/40">
                    <Calendar className="h-4 w-4" />
                  </span>
                  <input
                    type="date"
                    {...register('dateOfBirth')}
                    className="w-full pl-10 pr-4 py-3 text-sm glass-input text-white/80"
                  />
                </div>
                {errors.dateOfBirth && (
                  <span className="text-[10px] text-health-rose mt-1 block font-medium">{errors.dateOfBirth.message}</span>
                )}
              </div>

              {/* Gender */}
              <div>
                <label className="block text-xs font-medium text-health-textMuted mb-2">Gender</label>
                <select
                  {...register('gender')}
                  className="w-full px-4 py-3 text-sm glass-input text-white/80 bg-health-card"
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
                {errors.gender && (
                  <span className="text-[10px] text-health-rose mt-1 block font-medium">{errors.gender.message}</span>
                )}
              </div>

              {/* Height */}
              <div>
                <label className="block text-xs font-medium text-health-textMuted mb-2">Height (cm)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-white/40">
                    <Ruler className="h-4 w-4" />
                  </span>
                  <input
                    type="number"
                    step="0.1"
                    {...register('height')}
                    placeholder="175"
                    className="w-full pl-10 pr-4 py-3 text-sm glass-input placeholder-white/20"
                  />
                </div>
                {errors.height && (
                  <span className="text-[10px] text-health-rose mt-1 block font-medium">{errors.height.message}</span>
                )}
              </div>

              {/* Weight */}
              <div>
                <label className="block text-xs font-medium text-health-textMuted mb-2">Weight (kg)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-white/40">
                    <Scale className="h-4 w-4" />
                  </span>
                  <input
                    type="number"
                    step="0.1"
                    {...register('weight')}
                    placeholder="70"
                    className="w-full pl-10 pr-4 py-3 text-sm glass-input placeholder-white/20"
                  />
                </div>
                {errors.weight && (
                  <span className="text-[10px] text-health-rose mt-1 block font-medium">{errors.weight.message}</span>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 mt-4 text-sm font-semibold rounded-xl bg-gradient-to-r from-health-blue to-health-cyan hover:shadow-glow transition-all hover:scale-[1.01] flex items-center justify-center space-x-2 active:scale-[0.99] disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Registering Profile...</span>
                </>
              ) : (
                <span>Register & Create Account</span>
              )}
            </button>
          </form>

          <div className="mt-8 text-center text-xs text-health-textMuted border-t border-white/5 pt-6">
            <span>Already have an account? </span>
            <Link to="/login" className="text-health-cyan hover:underline font-semibold">
              Sign In Here
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
