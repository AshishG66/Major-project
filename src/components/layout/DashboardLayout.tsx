import React, { useState, useEffect } from 'react';
import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Home, Activity, MessageSquare, Shield, MapPin, BarChart3, LogOut, Menu, X, Bell, Clipboard, ShieldAlert, Sparkles, UserCheck, RefreshCw, Globe, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { usePredictionStore } from '../../store/predictionStore';
import { useWebSockets } from '../../hooks/useWebSockets';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { getActiveDemoPatientId, setActiveDemoPatientId } from '../../utils/demoData';
import { useTranslation } from '../../i18n/LanguageContext';
import { api } from '../../services/api';
import { Language } from '../../i18n/translations';

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<any>;
}

export default function DashboardLayout() {
  useWebSockets(); // Mount real-time websocket synchronization broker
  const queryClient = useQueryClient();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const { user, setAuth, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const { language, setLanguage, t } = useTranslation();

  const [isDemoMode, setIsDemoMode] = useState(localStorage.getItem('demo_mode') === 'true');
  const [activePatientId, setActivePatientId] = useState(getActiveDemoPatientId());

  // Fetch active alerts
  const { data: alertsData, refetch: refetchAlerts } = useQuery({
    queryKey: ['alerts', activePatientId],
    queryFn: () => api.get(`/alerts/${activePatientId}`),
    refetchInterval: 10000,
  });

  const alertsList = alertsData?.alerts || [];
  const activeAlerts = alertsList.filter((a: any) => a.status === 'TRIGGERED');

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      await api.post(`/alerts/${alertId}/acknowledge`);
      refetchAlerts();
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
    }
  };

  useEffect(() => {
    const syncDemoMode = () => {
      setIsDemoMode(localStorage.getItem('demo_mode') === 'true');
    };
    window.addEventListener('demo_mode_changed', syncDemoMode);
    return () => {
      window.removeEventListener('demo_mode_changed', syncDemoMode);
    };
  }, []);

  // Android hardware back button handler
  useEffect(() => {
    let listener: any;
    const setupBackButton = async () => {
      try {
        const { App } = await import('@capacitor/app');
        listener = await App.addListener('backButton', () => {
          if (alertsOpen) {
            setAlertsOpen(false);
          } else if (mobileMenuOpen) {
            setMobileMenuOpen(false);
          } else if (location.pathname !== '/dashboard' && location.pathname !== '/') {
            navigate(-1);
          } else {
            App.exitApp();
          }
        });
      } catch (e) {
        // Running in standard web browser
      }
    };
    setupBackButton();
    return () => {
      if (listener && typeof listener.remove === 'function') {
        listener.remove();
      }
    };
  }, [alertsOpen, mobileMenuOpen, location.pathname, navigate]);

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {}
    localStorage.removeItem('demo_mode');
    localStorage.removeItem('demo_active_patient_id');
    localStorage.removeItem('original_user');
    localStorage.removeItem('original_token');
    usePredictionStore.getState().resetPredictionStore();
    queryClient.clear();
    clearAuth();
    navigate('/login');
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
    queryClient.invalidateQueries();
  };

  const handlePatientChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const patId = e.target.value;
    setActiveDemoPatientId(patId);
    setActivePatientId(patId);

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
    { name: t('dashboard'), path: '/dashboard', icon: Home },
    { name: t('runRiskScan'), path: '/prediction', icon: Activity },
    { name: 'Heart Lab Simulator', path: '/simulator', icon: Heart },
    { name: t('hridayaAiChat'), path: '/chat', icon: MessageSquare },
    { name: t('preventionCoach'), path: '/prevention', icon: Shield },
    { name: t('nearbyServices'), path: '/nearby', icon: MapPin },
    { name: t('healthAnalytics'), path: '/analytics', icon: BarChart3 },
  ];

  if (user?.role === 'DOCTOR' || user?.role === 'ADMIN') {
    navItems.push({ name: t('doctorPortal'), path: '/doctor', icon: Clipboard });
  }
  if (user?.role === 'ADMIN') {
    navItems.push({ name: t('adminConsole'), path: '/admin', icon: ShieldAlert });
  }

  const sidebarVariants = {
    open: { x: 0, transition: { type: 'spring', stiffness: 100, damping: 20 } },
    closed: { x: '-100%', transition: { type: 'spring', stiffness: 100, damping: 20 } }
  };

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30] flex relative overflow-x-hidden font-sans">
      {/* Background Medical Grid & Ambient Light */}
      <div className="fixed inset-0 pointer-events-none medical-grid opacity-60 z-0" />
      <div className="fixed top-0 right-0 w-[600px] h-[600px] bg-gradient-radial from-[#3ee5fe]/10 to-transparent rounded-full blur-3xl pointer-events-none z-0" />

      {/* Persistent Desktop Sidebar (280px) */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-screen w-[280px] bg-white border-r border-[#c3c5d9]/60 p-6 z-30 shrink-0 shadow-stitch">
        {/* Brand Logo & Title */}
        <div className="flex items-center mb-8 pb-5 border-b border-[#e5eeff]">
          <img
            src="/hridayadarpana-logo.png"
            alt="HridayaDarpana"
            className="h-10 w-auto object-contain"
          />
        </div>

        {/* Navigation Modules */}
        <nav className="flex-1 space-y-1.5 overflow-y-auto pr-1">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all group ${
                  isActive
                    ? 'bg-[#eff4ff] text-[#003ec7] font-semibold border-r-4 border-[#0052ff] shadow-xs'
                    : 'text-[#434656] hover:text-[#0b1c30] hover:bg-[#f2f4f6]'
                }`
              }
            >
              <item.icon className="h-5 w-5 group-hover:scale-105 transition-transform text-[#0052ff]" />
              <span className="font-inter text-sm">{item.name}</span>
            </NavLink>
          ))}
        </nav>

        {/* User Account & Logout */}
        <div className="mt-auto border-t border-[#e5eeff] pt-5 space-y-3">
          <div className="flex items-center space-x-3 px-2 py-1">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#0052ff] to-[#3ee5fe] flex items-center justify-center font-geist font-bold text-xs text-white shadow-xs">
              {user?.firstName ? user.firstName[0].toUpperCase() : (user as any)?.name ? (user as any).name[0].toUpperCase() : 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-[#0b1c30] truncate">{user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : (user as any)?.name || user?.email || 'User'}</p>
              <p className="font-mono-data text-[10px] text-[#737688] uppercase tracking-wider">{user?.role || 'USER'} ACCOUNT</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-[#ba1a1a] bg-[#ffdad6]/40 hover:bg-[#ffdad6] transition-colors border border-[#ba1a1a]/20"
          >
            <LogOut className="h-4 w-4" />
            <span>{t('logout')}</span>
          </button>
        </div>
      </aside>

      {/* Mobile Drawer Navigation */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-[#0b1c30] z-40 lg:hidden"
            />
            <motion.aside
              variants={sidebarVariants}
              initial="closed"
              animate="open"
              exit="closed"
              className="fixed inset-y-0 left-0 w-[280px] bg-white border-r border-[#c3c5d9] z-50 p-6 flex flex-col lg:hidden shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#e5eeff]">
                <div className="flex items-center">
                  <img
                    src="/hridayadarpana-logo.png"
                    alt="HridayaDarpana"
                    className="h-8 max-w-[180px] object-contain"
                  />
                </div>
                <button onClick={() => setMobileMenuOpen(false)} className="text-[#434656] hover:text-[#0b1c30]">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <nav className="flex-1 space-y-1.5 overflow-y-auto">
                {navItems.map((item) => (
                  <NavLink
                    key={item.name}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-[#eff4ff] text-[#003ec7] font-bold border-l-4 border-[#0052ff]'
                          : 'text-[#434656] hover:text-[#0b1c30] hover:bg-[#f2f4f6]'
                      }`
                    }
                  >
                    <item.icon className="h-5 w-5 text-[#0052ff]" />
                    <span>{item.name}</span>
                  </NavLink>
                ))}
              </nav>

              <div className="mt-auto border-t border-[#e5eeff] pt-4 space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#0052ff] to-[#3ee5fe] flex items-center justify-center font-geist font-bold text-xs text-white shadow-xs">
                      {user?.firstName ? user.firstName[0].toUpperCase() : (user as any)?.name ? (user as any).name[0].toUpperCase() : 'U'}
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-xs font-semibold text-[#0b1c30] truncate">{user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : (user as any)?.name || user?.email || 'User'}</p>
                      <p className="font-mono-data text-[10px] text-[#737688] uppercase tracking-wider">{user?.role || 'USER'} ACCOUNT</p>
                    </div>
                  </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold text-[#ba1a1a] bg-[#ffdad6]/40 hover:bg-[#ffdad6] transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span>{t('logout')}</span>
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Main Content Canvas (Fluid Layout with 280px left margin) */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-[280px] lg:w-[calc(100%-280px)] min-h-screen relative z-10">
        {/* Top Desktop Command App Bar */}
        <header className="sticky top-0 z-30 flex flex-col md:flex-row md:items-center justify-between bg-white/90 backdrop-blur-md px-6 py-3.5 border-b border-[#c3c5d9]/60 shrink-0 gap-4 shadow-stitch">
          <div className="flex items-center space-x-3">
            <button onClick={() => setMobileMenuOpen(true)} className="lg:hidden text-[#434656] hover:text-[#0b1c30] focus:outline-none">
              <Menu className="h-6 w-6" />
            </button>
            <div>
              <h1 className="text-base lg:text-lg font-geist font-bold text-[#0b1c30] flex items-center gap-2">
                {t('welcomeUser')}, {user?.firstName || (user as any)?.name?.split(' ')[0] || (user?.email ? user.email.split('@')[0] : 'User')}
                {isDemoMode && (
                  <span className="text-[9px] font-mono-data uppercase tracking-widest bg-[#ffdad6] text-[#93000a] border border-[#ba1a1a]/30 px-2 py-0.5 rounded-full font-bold animate-pulse">
                    {t('presentationDemo')}
                  </span>
                )}
              </h1>
              <p className="font-inter text-xs text-[#737688]">Intelligent 3D Digital Twin & ML Cardiovascular SaaS</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 self-end md:self-auto">
            {/* System Status Indicator */}
            <div className="hidden sm:flex items-center space-x-1.5 bg-[#eff4ff] border border-[#c3c5d9]/60 px-3 py-1 rounded-full text-xs font-mono-data text-[#005a3c]">
              <span className="h-2 w-2 rounded-full bg-[#10b981] animate-pulse" />
              <span className="font-semibold text-[11px] uppercase tracking-wide">System Live</span>
            </div>

            {/* Multilingual Switcher */}
            <div className="flex items-center space-x-1 bg-[#f2f4f6] border border-[#c3c5d9]/60 rounded-xl px-2.5 py-1">
              <Globe className="h-3.5 w-3.5 text-[#0052ff]" />
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as Language)}
                className="bg-transparent text-[11px] font-geist font-bold text-[#0b1c30] focus:outline-none cursor-pointer"
              >
                <option value="en">English</option>
                <option value="hi">हिन्दी (Hindi)</option>
                <option value="kn">ಕನ್ನಡ (Kannada)</option>
              </select>
            </div>

            {/* Demo Mode Controller */}
            <div className="flex items-center bg-[#f2f4f6] border border-[#c3c5d9]/60 rounded-xl px-3 py-1 gap-2.5">
              <button
                onClick={handleToggleDemoMode}
                className={`flex items-center space-x-1 text-[10px] font-mono-data font-bold uppercase transition-all px-2.5 py-1 rounded-lg border ${
                  isDemoMode
                    ? 'bg-[#ffdad6] text-[#93000a] border-[#ba1a1a]/30 shadow-xs'
                    : 'bg-white text-[#434656] border-[#c3c5d9] hover:text-[#0b1c30]'
                }`}
              >
                <Sparkles className="h-3 w-3 text-[#0052ff]" />
                <span>{t('demoMode')}: {isDemoMode ? 'ON' : 'OFF'}</span>
              </button>

              {isDemoMode && (
                <div className="flex items-center gap-1.5 border-l border-[#c3c5d9] pl-2.5">
                  <UserCheck className="h-3.5 w-3.5 text-[#0052ff]" />
                  <select
                    value={activePatientId}
                    onChange={handlePatientChange}
                    className="bg-white border border-[#c3c5d9] rounded px-2 py-0.5 text-[10px] font-geist font-bold text-[#003ec7] focus:outline-none cursor-pointer"
                  >
                    <option value="demo-patient-amit">Amit (High Risk)</option>
                    <option value="demo-patient-priya">Priya (Mod Risk)</option>
                    <option value="demo-patient-rohan">Rohan (Low Risk)</option>
                  </select>
                </div>
              )}
            </div>

            {/* Dynamic Alert Center */}
            <div className="relative">
              <button
                onClick={() => setAlertsOpen(!alertsOpen)}
                className="h-9 w-9 rounded-xl bg-white border border-[#c3c5d9] flex items-center justify-center text-[#434656] hover:text-[#0b1c30] hover:bg-[#f2f4f6] relative transition-colors shadow-xs"
              >
                <Bell className="h-4 w-4" />
                {activeAlerts.length > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-[#ba1a1a] text-white text-[9px] font-bold flex items-center justify-center animate-pulse">
                    {activeAlerts.length}
                  </span>
                )}
              </button>

              {/* Alert Center Dropdown */}
              <AnimatePresence>
                {alertsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-[#c3c5d9] rounded-2xl shadow-2xl p-4 z-50"
                  >
                    <div className="flex items-center justify-between border-b border-[#e5eeff] pb-3 mb-3">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="h-4 w-4 text-[#ba1a1a]" />
                        <h3 className="font-geist font-bold text-xs text-[#0b1c30]">{t('alertCenter')}</h3>
                      </div>
                      <span className="font-mono-data text-[10px] text-[#737688] font-semibold">{activeAlerts.length} {t('activeAlerts')}</span>
                    </div>

                    <div className="max-h-64 overflow-y-auto space-y-2.5">
                      {alertsList.length === 0 ? (
                        <p className="text-xs text-[#737688] text-center py-4">{t('noActiveAlerts')}</p>
                      ) : (
                        alertsList.map((alert: any) => (
                          <div
                            key={alert.id}
                            className={`p-3 rounded-xl border text-xs ${
                              alert.level === 'CRITICAL' || alert.level === 'HIGH'
                                ? 'bg-[#ffdad6]/60 border-[#ba1a1a]/30 text-[#93000a]'
                                : alert.level === 'MODERATE'
                                ? 'bg-[#fffbeb] border-[#f59e0b]/30 text-[#92400e]'
                                : 'bg-[#f8f9ff] border-[#c3c5d9] text-[#0b1c30]'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <p className="font-bold text-xs">{alert.title}</p>
                              {alert.status === 'TRIGGERED' ? (
                                <button
                                  onClick={() => handleAcknowledgeAlert(alert.id)}
                                  className="text-[9px] font-bold bg-white px-2 py-0.5 rounded border border-[#c3c5d9] shadow-xs hover:bg-[#f2f4f6]"
                                >
                                  {t('acknowledgeAlert')}
                                </button>
                              ) : (
                                <span className="flex items-center gap-1 text-[9px] font-bold text-[#005a3c]">
                                  <CheckCircle2 className="h-3 w-3" /> {t('alertAcknowledged')}
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-[11px] text-[#434656] leading-tight">{alert.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Profile Avatar Badge */}
            <div className="hidden sm:flex items-center space-x-2.5">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#0052ff] to-[#3ee5fe] flex items-center justify-center font-geist font-bold text-xs text-white shadow-xs">
                {user?.firstName ? user.firstName[0].toUpperCase() : 'U'}
              </div>
            </div>
          </div>
        </header>

        {/* Content Body Container */}
        <main className="flex-1 p-4 lg:p-6 pb-24 lg:pb-6 relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10, scale: 0.995 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.995 }}
              transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
              className="min-h-full w-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Mobile Bottom Navigation Bar (Phones & Small Screens) */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#c3c5d9]/60 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] px-2 py-1.5 flex items-center justify-around">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all min-w-[56px] min-h-[44px] ${
                isActive ? 'text-[#0052ff] font-bold' : 'text-[#737688] hover:text-[#0b1c30]'
              }`
            }
          >
            <Home className="h-5 w-5 mb-0.5" />
            <span className="text-[10px] font-medium tracking-tight">Home</span>
          </NavLink>

          <NavLink
            to="/prediction"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all min-w-[56px] min-h-[44px] ${
                isActive ? 'text-[#0052ff] font-bold' : 'text-[#737688] hover:text-[#0b1c30]'
              }`
            }
          >
            <Activity className="h-5 w-5 mb-0.5" />
            <span className="text-[10px] font-medium tracking-tight">Risk Scan</span>
          </NavLink>

          <NavLink
            to="/chat"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all min-w-[56px] min-h-[44px] ${
                isActive ? 'text-[#0052ff] font-bold' : 'text-[#737688] hover:text-[#0b1c30]'
              }`
            }
          >
            <MessageSquare className="h-5 w-5 mb-0.5" />
            <span className="text-[10px] font-medium tracking-tight">HridayaAI</span>
          </NavLink>

          <NavLink
            to="/prevention"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all min-w-[56px] min-h-[44px] ${
                isActive ? 'text-[#0052ff] font-bold' : 'text-[#737688] hover:text-[#0b1c30]'
              }`
            }
          >
            <Shield className="h-5 w-5 mb-0.5" />
            <span className="text-[10px] font-medium tracking-tight">Prevention</span>
          </NavLink>

          <button
            onClick={() => setMobileMenuOpen(true)}
            className="flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[#737688] hover:text-[#0b1c30] transition-all min-w-[56px] min-h-[44px]"
          >
            <Menu className="h-5 w-5 mb-0.5" />
            <span className="text-[10px] font-medium tracking-tight">More</span>
          </button>
        </div>
      </div>
    </div>
  );
}

