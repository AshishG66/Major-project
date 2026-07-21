import React, { useState, useEffect } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Home, Activity, MessageSquare, Shield, MapPin, BarChart3, LogOut, Menu, X, Bell, Clipboard, ShieldAlert, Sparkles, UserCheck, RefreshCw } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useWebSockets } from '../../hooks/useWebSockets';
import { useQueryClient } from '@tanstack/react-query';
import { getActiveDemoPatientId, setActiveDemoPatientId } from '../../utils/demoData';

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<any>;
}

export default function DashboardLayout() {
  useWebSockets(); // Mount real-time websocket synchronization broker
  const queryClient = useQueryClient();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, setAuth, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  const [isDemoMode, setIsDemoMode] = useState(localStorage.getItem('demo_mode') === 'true');
  const [activePatientId, setActivePatientId] = useState(getActiveDemoPatientId());

  useEffect(() => {
    const syncDemoMode = () => {
      setIsDemoMode(localStorage.getItem('demo_mode') === 'true');
    };
    window.addEventListener('demo_mode_changed', syncDemoMode);
    return () => {
      window.removeEventListener('demo_mode_changed', syncDemoMode);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('demo_mode');
    localStorage.removeItem('demo_active_patient_id');
    localStorage.removeItem('original_user');
    clearAuth();
    navigate('/');
  };

  const handleToggleDemoMode = () => {
    const nextState = !isDemoMode;
    setIsDemoMode(nextState);
    if (nextState) {
      localStorage.setItem('demo_mode', 'true');
      if (user) {
        localStorage.setItem('original_user', JSON.stringify(user));
        localStorage.setItem('original_token', useAuthStore.getState().token || '');
      }
      // Demo accounts have DOCTOR/ADMIN privileges to unlock all tabs for presentation
      setAuth(
        { id: 'demo-patient-amit', email: 'amit.sharma@demo.com', role: 'ADMIN', firstName: 'Amit', lastName: 'Sharma' },
        'demo-token-123'
      );
      setActiveDemoPatientId('demo-patient-amit');
      setActivePatientId('demo-patient-amit');
    } else {
      localStorage.removeItem('demo_mode');
      localStorage.removeItem('demo_active_patient_id');
      const originalUser = localStorage.getItem('original_user');
      const originalToken = localStorage.getItem('original_token');
      if (originalUser && originalToken) {
        setAuth(JSON.parse(originalUser), originalToken);
        localStorage.removeItem('original_user');
        localStorage.removeItem('original_token');
      } else {
        clearAuth();
        navigate('/login');
      }
    }
    // Instantly invalidate query caches to trigger demo data fetching
    queryClient.invalidateQueries();
  };

  const handlePatientChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const patId = e.target.value;
    setActiveDemoPatientId(patId);
    setActivePatientId(patId);

    // Update Auth User name in state for header sync
    const firstNames: Record<string, string> = {
      'demo-patient-amit': 'Amit',
      'demo-patient-priya': 'Priya',
      'demo-patient-rohan': 'Rohan'
    };
    const lastNames: Record<string, string> = {
      'demo-patient-amit': 'Sharma',
      'demo-patient-priya': 'Patel',
      'demo-patient-rohan': 'Verma'
    };

    setAuth(
      {
        id: patId,
        email: `${firstNames[patId].toLowerCase()}@demo.com`,
        role: 'ADMIN',
        firstName: firstNames[patId],
        lastName: lastNames[patId]
      },
      'demo-token-123'
    );

    queryClient.invalidateQueries();
  };

  const navItems: NavItem[] = [
    { name: 'Dashboard', path: '/dashboard', icon: Home },
    { name: 'Run Risk Scan', path: '/prediction', icon: Activity },
    { name: 'HridyaAI Chat', path: '/chat', icon: MessageSquare },
    { name: 'Prevention Coach', path: '/prevention', icon: Shield },
    { name: 'Nearby Services', path: '/nearby', icon: MapPin },
    { name: 'Health Analytics', path: '/analytics', icon: BarChart3 },
  ];

  // Dynamically append portal navigation items based on User Role
  if (user?.role === 'DOCTOR' || user?.role === 'ADMIN') {
    navItems.push({ name: 'Doctor Portal', path: '/doctor', icon: Clipboard });
  }
  if (user?.role === 'ADMIN') {
    navItems.push({ name: 'Admin Console', path: '/admin', icon: ShieldAlert });
  }

  const sidebarVariants = {
    open: { x: 0, transition: { type: 'spring', stiffness: 100, damping: 20 } },
    closed: { x: '-100%', transition: { type: 'spring', stiffness: 100, damping: 20 } }
  };

  return (
    <div className="min-h-screen bg-health-darker text-white flex relative overflow-hidden">
      {/* Background Aurora */}
      <div className="absolute top-[0%] right-[0%] w-[50%] h-[50%] bg-health-blue/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[0%] left-[0%] w-[50%] h-[50%] bg-health-violet/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Desktop Sidebar (Floating Glass Panel) */}
      <aside className="hidden lg:flex flex-col w-64 glass-panel m-4 mr-0 rounded-2xl border-white/5 p-6 z-30 shrink-0">
        {/* Brand Logo */}
        <div className="flex items-center space-x-2.5 mb-8 pb-4 border-b border-white/5">
          <Heart className="h-6 w-6 text-health-rose animate-pulse" />
          <span className="font-display font-bold text-lg tracking-tight bg-gradient-to-r from-health-blue to-health-cyan bg-clip-text text-transparent">
            HridyaDarpan
          </span>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all group ${
                  isActive
                    ? 'bg-gradient-to-r from-health-blue/20 to-health-cyan/10 border-l-2 border-health-blue text-white shadow-glow'
                    : 'text-health-textMuted hover:text-white hover:bg-white/5'
                }`
              }
            >
              <item.icon className="h-5 w-5 group-hover:scale-[1.05] transition-transform" />
              <span>{item.name}</span>
            </NavLink>
          ))}
        </nav>

        {/* User profile section */}
        <div className="mt-auto border-t border-white/5 pt-6 space-y-4">
          <div className="flex items-center space-x-3 px-2">
            <div className="h-8 w-8 rounded-full bg-gradient-to-r from-health-blue to-health-cyan flex items-center justify-center font-display font-semibold text-xs text-white">
              {user?.firstName ? user.firstName[0].toUpperCase() : 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold truncate">{user?.firstName} {user?.lastName}</p>
              <p className="text-[10px] text-health-textMuted truncate uppercase tracking-wider">{user?.role} ACCOUNT</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium text-health-rose/80 hover:text-health-rose hover:bg-health-rose/10 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-black z-40 lg:hidden"
            />
            <motion.aside
              variants={sidebarVariants}
              initial="closed"
              animate="open"
              exit="closed"
              className="fixed inset-y-0 left-0 w-64 bg-health-card border-r border-white/10 z-50 p-6 flex flex-col lg:hidden"
            >
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5">
                <div className="flex items-center space-x-2">
                  <Heart className="h-5 w-5 text-health-rose animate-pulse" />
                  <span className="font-display font-bold text-base bg-gradient-to-r from-health-blue to-health-cyan bg-clip-text text-transparent">
                    HridyaDarpan
                  </span>
                </div>
                <button onClick={() => setMobileMenuOpen(false)} className="text-white/80 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <nav className="flex-1 space-y-2">
                {navItems.map((item) => (
                  <NavLink
                    key={item.name}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-gradient-to-r from-health-blue/20 to-health-cyan/10 border-l-2 border-health-blue text-white shadow-glow'
                          : 'text-health-textMuted hover:text-white hover:bg-white/5'
                      }`
                    }
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.name}</span>
                  </NavLink>
                ))}
              </nav>

              <div className="mt-auto border-t border-white/5 pt-6 space-y-4">
                <div className="flex items-center space-x-3 px-2">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-r from-health-blue to-health-cyan flex items-center justify-center font-display font-semibold text-xs">
                    {user?.firstName ? user.firstName[0].toUpperCase() : 'U'}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-xs font-semibold truncate">{user?.firstName} {user?.lastName}</p>
                    <p className="text-[10px] text-health-textMuted truncate uppercase tracking-wider">{user?.role} ACCOUNT</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium text-health-rose/80 hover:text-health-rose hover:bg-health-rose/10 transition-colors"
                >
                  <LogOut className="h-5 w-5" />
                  <span>Logout</span>
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Workspace */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto p-4 lg:p-6 space-y-6">
        {/* Top App Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between bg-health-card/30 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/5 shrink-0 gap-4">
          <div className="flex items-center space-x-3">
            <button onClick={() => setMobileMenuOpen(true)} className="lg:hidden text-white/80 hover:text-white focus:outline-none">
              <Menu className="h-6 w-6" />
            </button>
            <div>
              <h1 className="text-base lg:text-lg font-semibold text-white/95 flex items-center gap-2">
                Welcome, {user?.firstName || 'User'}
                {isDemoMode && (
                  <span className="text-[9px] uppercase tracking-widest bg-health-rose/15 text-health-rose border border-health-rose/30 px-2 py-0.5 rounded-full font-bold animate-pulse">
                    Presentation Demo
                  </span>
                )}
              </h1>
              <p className="text-[10px] lg:text-xs text-health-textMuted">Let's check your cardiovascular progress today.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 self-end md:self-auto">
            {/* Demo Mode Controller Panel */}
            <div className="flex items-center bg-white/5 border border-white/5 rounded-xl px-3 py-1.5 gap-3.5">
              <button
                onClick={handleToggleDemoMode}
                className={`flex items-center space-x-1 text-[10px] font-bold uppercase transition-all px-2.5 py-1 rounded-lg border ${
                  isDemoMode
                    ? 'bg-health-rose/20 text-health-rose border-health-rose/30 shadow-glow-rose'
                    : 'bg-white/5 text-health-textMuted border-white/10 hover:text-white'
                }`}
              >
                <Sparkles className="h-3 w-3" />
                <span>Demo Mode: {isDemoMode ? 'ON' : 'OFF'}</span>
              </button>

              {isDemoMode && (
                <div className="flex items-center gap-1.5 border-l border-white/10 pl-3">
                  <UserCheck className="h-3.5 w-3.5 text-health-cyan" />
                  <select
                    value={activePatientId}
                    onChange={handlePatientChange}
                    className="bg-health-dark border border-white/10 rounded px-2 py-0.5 text-[10px] font-bold text-health-cyan focus:outline-none cursor-pointer"
                  >
                    <option value="demo-patient-amit">Amit (High Risk)</option>
                    <option value="demo-patient-priya">Priya (Mod Risk)</option>
                    <option value="demo-patient-rohan">Rohan (Low Risk)</option>
                  </select>
                </div>
              )}
            </div>

            {/* Quick static notification alert bell */}
            <button className="h-9 w-9 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 relative transition-colors">
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-health-rose" />
            </button>
            <div className="hidden sm:flex items-center space-x-2.5">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-health-blue to-health-cyan flex items-center justify-center font-display font-semibold text-xs">
                {user?.firstName ? user.firstName[0].toUpperCase() : 'U'}
              </div>
            </div>
          </div>
        </header>

        {/* Content body */}
        <main className="flex-1 min-h-0 relative">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

