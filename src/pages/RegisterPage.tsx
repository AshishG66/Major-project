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

  const onSubmit = async (data: RegisterFormValues) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/auth/register', data);
      if (res.success) {
        localStorage.removeItem('demo_mode');
        setAuth(res.user, res.accessToken, res.refreshToken);
        navigate('/dashboard');
      } else {
        setError(res.message || 'Registration failed. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please check your information and network connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30] flex flex-col justify-center items-center py-12 px-6 relative overflow-hidden font-sans medical-grid">
      {/* Soft Glow Backdrops */}
      <div className="absolute top-[10%] left-[10%] w-[50%] h-[50%] bg-gradient-radial from-[#3ee5fe]/10 to-transparent rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 90 }}
        className="w-full max-w-2xl"
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
          <h2 className="text-xl font-geist font-bold tracking-tight text-[#0b1c30]">Create Your Profile</h2>
          <p className="text-xs font-inter text-[#737688] mt-1">Get started with personalized AI-powered cardiovascular monitoring</p>
        </div>

        {/* Card Form */}
        <div className="bg-white p-8 rounded-2xl border border-[#c3c5d9] relative shadow-stitch">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-[#ffdad6]/60 border border-[#ba1a1a]/30 text-[#93000a] text-xs flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* First Name */}
              <div>
                <label className="block text-xs font-geist font-semibold text-[#0b1c30] mb-2">First Name</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[#737688]">
                    <User className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    {...register('firstName')}
                    placeholder="John"
                    className="w-full pl-10 pr-4 py-3 text-sm bg-white border border-[#c3c5d9] rounded-xl text-[#0b1c30] placeholder-[#737688] focus:outline-none focus:border-[#0052ff] focus:ring-1 focus:ring-[#0052ff] transition-all"
                  />
                </div>
                {errors.firstName && (
                  <span className="text-[10px] text-[#ba1a1a] mt-1 block font-medium">{errors.firstName.message}</span>
                )}
              </div>

              {/* Last Name */}
              <div>
                <label className="block text-xs font-geist font-semibold text-[#0b1c30] mb-2">Last Name</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[#737688]">
                    <User className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    {...register('lastName')}
                    placeholder="Doe"
                    className="w-full pl-10 pr-4 py-3 text-sm bg-white border border-[#c3c5d9] rounded-xl text-[#0b1c30] placeholder-[#737688] focus:outline-none focus:border-[#0052ff] focus:ring-1 focus:ring-[#0052ff] transition-all"
                  />
                </div>
                {errors.lastName && (
                  <span className="text-[10px] text-[#ba1a1a] mt-1 block font-medium">{errors.lastName.message}</span>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-geist font-semibold text-[#0b1c30] mb-2">Email Address</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[#737688]">
                    <Mail className="h-4 w-4" />
                  </span>
                  <input
                    type="email"
                    {...register('email')}
                    placeholder="john.doe@example.com"
                    className="w-full pl-10 pr-4 py-3 text-sm bg-white border border-[#c3c5d9] rounded-xl text-[#0b1c30] placeholder-[#737688] focus:outline-none focus:border-[#0052ff] focus:ring-1 focus:ring-[#0052ff] transition-all"
                  />
                </div>
                {errors.email && (
                  <span className="text-[10px] text-[#ba1a1a] mt-1 block font-medium">{errors.email.message}</span>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-geist font-semibold text-[#0b1c30] mb-2">Password</label>
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

              {/* Date of Birth */}
              <div>
                <label className="block text-xs font-geist font-semibold text-[#0b1c30] mb-2">Date of Birth</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[#737688]">
                    <Calendar className="h-4 w-4" />
                  </span>
                  <input
                    type="date"
                    {...register('dateOfBirth')}
                    className="w-full pl-10 pr-4 py-3 text-sm bg-white border border-[#c3c5d9] rounded-xl text-[#0b1c30] focus:outline-none focus:border-[#0052ff] focus:ring-1 focus:ring-[#0052ff] transition-all"
                  />
                </div>
                {errors.dateOfBirth && (
                  <span className="text-[10px] text-[#ba1a1a] mt-1 block font-medium">{errors.dateOfBirth.message}</span>
                )}
              </div>

              {/* Gender */}
              <div>
                <label className="block text-xs font-geist font-semibold text-[#0b1c30] mb-2">Gender</label>
                <select
                  {...register('gender')}
                  className="w-full px-4 py-3 text-sm bg-white border border-[#c3c5d9] rounded-xl text-[#0b1c30] focus:outline-none focus:border-[#0052ff] focus:ring-1 focus:ring-[#0052ff] transition-all"
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
                {errors.gender && (
                  <span className="text-[10px] text-[#ba1a1a] mt-1 block font-medium">{errors.gender.message}</span>
                )}
              </div>

              {/* Height */}
              <div>
                <label className="block text-xs font-geist font-semibold text-[#0b1c30] mb-2">Height (cm)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[#737688]">
                    <Ruler className="h-4 w-4" />
                  </span>
                  <input
                    type="number"
                    step="0.1"
                    {...register('height')}
                    placeholder="175"
                    className="w-full pl-10 pr-4 py-3 text-sm bg-white border border-[#c3c5d9] rounded-xl text-[#0b1c30] placeholder-[#737688] focus:outline-none focus:border-[#0052ff] focus:ring-1 focus:ring-[#0052ff] transition-all"
                  />
                </div>
                {errors.height && (
                  <span className="text-[10px] text-[#ba1a1a] mt-1 block font-medium">{errors.height.message}</span>
                )}
              </div>

              {/* Weight */}
              <div>
                <label className="block text-xs font-geist font-semibold text-[#0b1c30] mb-2">Weight (kg)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[#737688]">
                    <Scale className="h-4 w-4" />
                  </span>
                  <input
                    type="number"
                    step="0.1"
                    {...register('weight')}
                    placeholder="70"
                    className="w-full pl-10 pr-4 py-3 text-sm bg-white border border-[#c3c5d9] rounded-xl text-[#0b1c30] placeholder-[#737688] focus:outline-none focus:border-[#0052ff] focus:ring-1 focus:ring-[#0052ff] transition-all"
                  />
                </div>
                {errors.weight && (
                  <span className="text-[10px] text-[#ba1a1a] mt-1 block font-medium">{errors.weight.message}</span>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 mt-4 text-sm font-geist font-bold text-white rounded-xl bg-[#0052ff] hover:bg-[#003ec7] shadow-md hover:-translate-y-0.5 transition-all flex items-center justify-center space-x-2 active:scale-[0.99] disabled:opacity-50"
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

          <div className="mt-8 text-center text-xs text-[#737688] border-t border-[#e5eeff] pt-6">
            <span>Already have an account? </span>
            <Link to="/login" className="text-[#0052ff] hover:underline font-bold">
              Sign In Here
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
