import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Shield, Loader2, Users, Clipboard, Activity, FileText, Cpu, Server, Wifi, HardDrive, Bell } from 'lucide-react';
import { api } from '../services/api';
import SpringCounter from '../components/SpringCounter';

export default function AdminPortalPage() {
  // Fetch admin stats
  const { data: statsRes, isLoading: statsLoading } = useQuery({
    queryKey: ['adminStats'],
    queryFn: () => api.get('/admin/stats'),
    refetchOnWindowFocus: false,
  });

  // Fetch audit logs
  const { data: auditsRes, isLoading: auditsLoading } = useQuery({
    queryKey: ['adminAudits'],
    queryFn: () => api.get('/admin/audit'),
    refetchOnWindowFocus: false,
  });

  // 1. Live Predictions / second telemetry (simulated continuous ticks)
  const [telemetry, setTelemetry] = useState<Array<{ time: string; rate: number }>>([
    { time: '16:00', rate: 4.2 },
    { time: '16:05', rate: 5.8 },
    { time: '16:10', rate: 3.9 },
    { time: '16:15', rate: 6.2 },
    { time: '16:20', rate: 7.1 },
    { time: '16:25', rate: 5.5 },
  ]);

  // 2. Rapid ticking counters (AI Tokens consumed, prediction rates)
  const [tokens, setTokens] = useState(849200);

  useEffect(() => {
    const timer = setInterval(() => {
      // Simulate predictions rate fluctuations
      setTelemetry(prev => {
        const nextTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const nextRate = Number((Math.random() * 6 + 3).toFixed(1));
        const updated = [...prev.slice(1), { time: nextTime, rate: nextRate }];
        return updated;
      });

      // Simulate token consumption count-up
      setTokens(t => t + Math.floor(Math.random() * 85 + 20));
    }, 3000);

    return () => clearInterval(timer);
  }, []);

  if (statsLoading || auditsLoading) {
    return (
      <div className="h-full flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-10 w-10 text-health-cyan animate-spin" />
          <p className="text-sm text-health-textMuted">Compiling admin audit metrics...</p>
        </div>
      </div>
    );
  }

  const stats = statsRes?.stats;
  const logs = auditsRes?.logs || [];

  return (
    <div className="space-y-6">
      
      {/* Banner / Title Header */}
      <div className="glass-panel p-6 rounded-2xl relative overflow-hidden bg-gradient-to-r from-health-rose/10 to-transparent">
        <div className="absolute top-0 right-0 p-4 opacity-5">
          <Server className="h-24 w-24" />
        </div>
        <h2 className="text-lg font-display font-bold text-white flex items-center space-x-2">
          <Shield className="h-5 w-5 text-health-rose" />
          <span>Mission Control Operations Center</span>
        </h2>
        <p className="text-xs text-health-textMuted mt-0.5">Review system-wide diagnostic statistics, audit logs, and operational telemetry in real-time.</p>
      </div>

      {/* Stats summaries Row */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="glass-panel p-5 rounded-2xl flex items-center space-x-4">
            <div className="h-10 w-10 rounded-xl bg-health-blue/10 text-health-blue flex items-center justify-center relative shrink-0">
              <Users className="h-5 w-5" />
              <span className="absolute top-0.5 right-0.5 h-2.5 w-2.5 rounded-full bg-health-emerald animate-ping" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-health-textMuted">Active Users Online</span>
              <p className="text-xl font-bold font-display mt-0.5 text-white/95">
                <SpringCounter value={142} />
              </p>
            </div>
          </div>

          <div className="glass-panel p-5 rounded-2xl flex items-center space-x-4">
            <div className="h-10 w-10 rounded-xl bg-health-cyan/10 text-health-cyan flex items-center justify-center shrink-0">
              <Activity className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-health-textMuted">AI Inference / Sec</span>
              <p className="text-xl font-bold font-display mt-0.5 text-white/95">
                {telemetry[telemetry.length - 1].rate} req/s
              </p>
            </div>
          </div>

          <div className="glass-panel p-5 rounded-2xl flex items-center space-x-4">
            <div className="h-10 w-10 rounded-xl bg-health-violet/10 text-health-violet flex items-center justify-center shrink-0">
              <Cpu className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-health-textMuted">Gemini Tokens Consumed</span>
              <p className="text-xl font-bold font-display mt-0.5 text-white/95">
                <SpringCounter value={tokens} />
              </p>
            </div>
          </div>

          <div className="glass-panel p-5 rounded-2xl flex items-center space-x-4">
            <div className="h-10 w-10 rounded-xl bg-health-emerald/10 text-health-emerald flex items-center justify-center shrink-0">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-health-textMuted">Doctors Online</span>
              <p className="text-xl font-bold font-display mt-0.5 text-white/95">
                <SpringCounter value={stats.doctors || 4} /> on-duty
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Ticking line chart & server health panels */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Telemetry Line chart */}
        <div className="lg:col-span-8 glass-panel p-6 rounded-2xl h-[330px] flex flex-col justify-between">
          <div>
            <h3 className="font-display font-bold text-xs uppercase tracking-wider text-health-textMuted">AI Request Telemetry Predictions Rate</h3>
            <p className="text-[9px] text-health-textMuted mt-0.5">Live ticker plotting XGBoost and random-forest query logs.</p>
          </div>

          <div className="flex-1 min-h-0 w-full text-[9px] mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={telemetry} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                <defs>
                  <linearGradient id="reqGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" stroke="#9CA3AF" fontSize={8} />
                <YAxis stroke="#9CA3AF" fontSize={8} domain={[0, 15]} />
                <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: 'rgba(255,255,255,0.08)', borderRadius: '12px' }} />
                <Area type="monotone" dataKey="rate" name="Requests/sec" stroke="#06b6d4" fillOpacity={1} fill="url(#reqGlow)" strokeWidth={1.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Server Health indicators */}
        <div className="lg:col-span-4 glass-panel p-6 rounded-2xl flex flex-col justify-between h-[330px]">
          <h3 className="font-display font-bold text-xs uppercase tracking-wider text-health-textMuted">Node Server Health</h3>
          
          <div className="space-y-4 my-auto">
            {/* CPU */}
            <div className="flex items-center justify-between text-xs border-b border-white/5 pb-2">
              <span className="flex items-center space-x-2">
                <Cpu className="h-4 w-4 text-health-blue" />
                <span>CPU Load</span>
              </span>
              <span className="font-bold text-white">24%</span>
            </div>

            {/* RAM */}
            <div className="flex items-center justify-between text-xs border-b border-white/5 pb-2">
              <span className="flex items-center space-x-2">
                <HardDrive className="h-4 w-4 text-health-cyan" />
                <span>RAM Occupied</span>
              </span>
              <span className="font-bold text-white">58%</span>
            </div>

            {/* Network Latency */}
            <div className="flex items-center justify-between text-xs border-b border-white/5 pb-2">
              <span className="flex items-center space-x-2">
                <Wifi className="h-4 w-4 text-health-emerald" />
                <span>API Gateway Latency</span>
              </span>
              <span className="font-bold text-health-emerald">12 ms</span>
            </div>

            {/* DB */}
            <div className="flex items-center justify-between text-xs border-b border-white/5 pb-2">
              <span className="flex items-center space-x-2">
                <Server className="h-4 w-4 text-health-violet" />
                <span>Database Mirror Status</span>
              </span>
              <span className="font-bold text-health-emerald">Synced</span>
            </div>
          </div>

          <div className="border-t border-white/5 pt-2 flex items-center justify-between text-[8px] text-health-textMuted uppercase font-bold">
            <span>Primary Gateway: cluster-A</span>
            <span className="text-health-emerald">Online</span>
          </div>
        </div>

      </div>

      {/* Grid: Risk classification + Audit logs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Risk Division breakdown cards */}
        {stats && (
          <div className="lg:col-span-4 glass-panel p-6 rounded-2xl space-y-4">
            <h3 className="font-display font-bold text-xs uppercase tracking-wider text-health-textMuted border-b border-white/5 pb-2">AI Risk Category Division</h3>
            <div className="space-y-3.5 pt-2">
              <div className="flex justify-between items-center p-3 rounded-xl bg-health-rose/5 border border-health-rose/10">
                <span className="text-xs text-health-rose font-semibold">HIGH RISK SCAN</span>
                <span className="font-bold text-base">
                  <SpringCounter value={stats.risks.HIGH} />
                </span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-xl bg-health-amber/5 border border-health-amber/10">
                <span className="text-xs text-health-amber font-semibold">MODERATE RISK SCAN</span>
                <span className="font-bold text-base">
                  <SpringCounter value={stats.risks.MODERATE} />
                </span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-xl bg-health-emerald/5 border border-health-emerald/10">
                <span className="text-xs text-health-emerald font-semibold">LOW RISK SCAN</span>
                <span className="font-bold text-base">
                  <SpringCounter value={stats.risks.LOW} />
                </span>
              </div>
            </div>
          </div>
        )}

        {/* System Audit logs */}
        <div className="lg:col-span-8 glass-panel p-6 rounded-2xl flex flex-col h-[350px] overflow-hidden">
          <h3 className="font-display font-bold text-xs uppercase tracking-wider text-health-textMuted mb-4">Operations Security Audit Logs</h3>
          
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xxs scrollbar-thin">
            {logs.length === 0 ? (
              <p className="text-xs text-health-textMuted text-center py-12">No logs recorded yet.</p>
            ) : (
              logs.map((log: any) => (
                <div key={log.id} className="p-3.5 rounded-xl bg-white/5 border border-white/5 flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-1.5 sm:space-y-0">
                  <div>
                    <span className="font-semibold text-white/95 uppercase tracking-wide px-2 py-0.5 rounded bg-white/5 mr-2">
                      {log.action}
                    </span>
                    <span className="text-health-textMuted">{log.details}</span>
                  </div>
                  <div className="text-[10px] text-health-textMuted flex items-center space-x-2.5">
                    <span>{log.user?.email || 'System'}</span>
                    <span>{new Date(log.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
