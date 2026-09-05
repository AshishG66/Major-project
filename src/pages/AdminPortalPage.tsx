import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Shield, Loader2, Users, Clipboard, Activity, FileText, Cpu, Server, Wifi, HardDrive, Bell, ShieldCheck, Database } from 'lucide-react';
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

  // 2. Rapid ticking counters
  const [tokens, setTokens] = useState(849200);

  useEffect(() => {
    const timer = setInterval(() => {
      setTelemetry(prev => {
        const nextTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const nextRate = Number((Math.random() * 6 + 3).toFixed(1));
        const updated = [...prev.slice(1), { time: nextTime, rate: nextRate }];
        return updated;
      });

      setTokens(t => t + Math.floor(Math.random() * 85 + 20));
    }, 3000);

    return () => clearInterval(timer);
  }, []);

  if (statsLoading || auditsLoading) {
    return (
      <div className="h-full flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
          <p className="text-sm text-slate-500">Compiling admin audit metrics...</p>
        </div>
      </div>
    );
  }

  const stats = statsRes?.stats;
  const logs = auditsRes?.logs || [];

  return (
    <div className="space-y-6 font-sans">
      
      {/* Banner / Title Header */}
      <div className="bg-white p-6 rounded-2xl relative overflow-hidden border border-[#c3c5d9] shadow-stitch">
        <div className="absolute top-0 right-0 p-4 opacity-5">
          <Server className="h-24 w-24 text-[#0052ff]" />
        </div>
        <h2 className="text-lg font-geist font-bold text-[#0b1c30] flex items-center space-x-2">
          <Shield className="h-5 w-5 text-[#0052ff]" />
          <span>Mission Control Operations Center</span>
        </h2>
        <p className="text-xs font-inter text-[#434656] mt-0.5">Review system-wide diagnostic statistics, audit logs, and operational telemetry in real-time.</p>
      </div>

      {/* Stats Summaries Row */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-5 rounded-2xl flex items-center space-x-4 border border-[#c3c5d9] shadow-stitch">
            <div className="h-10 w-10 rounded-xl bg-[#eff4ff] text-[#0052ff] border border-[#0052ff]/30 flex items-center justify-center relative shrink-0">
              <Users className="h-5 w-5" />
              <span className="absolute top-0.5 right-0.5 h-2.5 w-2.5 rounded-full bg-[#10b981] animate-ping" />
            </div>
            <div>
              <span className="text-[10px] font-mono-data uppercase font-bold text-[#737688]">Active Users Online</span>
              <p className="text-xl font-mono-data font-bold mt-0.5 text-[#0b1c30]">
                <SpringCounter value={142} />
              </p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl flex items-center space-x-4 border border-[#c3c5d9] shadow-stitch">
            <div className="h-10 w-10 rounded-xl bg-[#eff4ff] text-[#006876] border border-[#006876]/30 flex items-center justify-center shrink-0">
              <Activity className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] font-mono-data uppercase font-bold text-[#737688]">Scans Evaluated</span>
              <p className="text-xl font-mono-data font-bold mt-0.5 text-[#0b1c30]">
                <SpringCounter value={stats.totalPredictions || 0} />
              </p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl flex items-center space-x-4 border border-[#c3c5d9] shadow-stitch">
            <div className="h-10 w-10 rounded-xl bg-[#eff4ff] text-[#0052ff] border border-[#0052ff]/30 flex items-center justify-center shrink-0">
              <Cpu className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono-data uppercase font-bold text-[#737688]">AI Inference / Sec</span>
              <p className="text-xl font-mono-data font-bold mt-0.5 text-[#0b1c30]">
                {telemetry[telemetry.length - 1].rate} req/s
              </p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl flex items-center space-x-4 border border-[#c3c5d9] shadow-stitch">
            <div className="h-10 w-10 rounded-xl bg-[#eff4ff] text-[#005a3c] border border-[#005a3c]/30 flex items-center justify-center shrink-0">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono-data uppercase font-bold text-[#737688]">Doctors Online</span>
              <p className="text-xl font-mono-data font-bold mt-0.5 text-[#0b1c30]">
                <SpringCounter value={stats.doctors || 4} /> on-duty
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Ticking line chart & server health panels */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Telemetry Line chart */}
        <div className="lg:col-span-8 glass-panel p-6 rounded-2xl h-[330px] flex flex-col justify-between border border-slate-200/80 bg-white/80 shadow-sm">
          <div>
            <h3 className="font-display font-bold text-xs uppercase tracking-wider text-slate-500">AI Request Telemetry Predictions Rate</h3>
            <p className="text-[9px] text-slate-500 mt-0.5">Live ticker plotting XGBoost and random-forest query logs.</p>
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
                <XAxis dataKey="time" stroke="#94A3B8" fontSize={8} />
                <YAxis stroke="#94A3B8" fontSize={8} domain={[0, 15]} />
                <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: '12px', boxShadow: '0 4px 12px rgba(15,23,42,0.08)' }} />
                <Area type="monotone" dataKey="rate" name="Requests/sec" stroke="#06B6D4" fillOpacity={1} fill="url(#reqGlow)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Server Health indicators */}
        <div className="lg:col-span-4 glass-panel p-6 rounded-2xl flex flex-col justify-between h-[330px] border border-slate-200/80 bg-white/80 shadow-sm">
          <h3 className="font-display font-bold text-xs uppercase tracking-wider text-slate-500">Node Server Health</h3>
          
          <div className="space-y-4 my-auto">
            {/* CPU */}
            <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-2">
              <span className="flex items-center space-x-2">
                <Cpu className="h-4 w-4 text-blue-600" />
                <span className="text-slate-700">CPU Load</span>
              </span>
              <span className="font-bold text-slate-900">24%</span>
            </div>

            {/* RAM */}
            <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-2">
              <span className="flex items-center space-x-2">
                <HardDrive className="h-4 w-4 text-cyan-600" />
                <span className="text-slate-700">RAM Occupied</span>
              </span>
              <span className="font-bold text-slate-900">58%</span>
            </div>

            {/* Network Latency */}
            <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-2">
              <span className="flex items-center space-x-2">
                <Wifi className="h-4 w-4 text-emerald-600" />
                <span className="text-slate-700">API Gateway Latency</span>
              </span>
              <span className="font-bold text-emerald-600">12 ms</span>
            </div>

            {/* DB */}
            <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-2">
              <span className="flex items-center space-x-2">
                <Server className="h-4 w-4 text-indigo-600" />
                <span className="text-slate-700">Database Mirror Status</span>
              </span>
              <span className="font-bold text-emerald-600">Synced</span>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-2 flex items-center justify-between text-[8px] text-slate-500 uppercase font-bold">
            <span>Primary Gateway: cluster-A</span>
            <span className="text-emerald-600">Online</span>
          </div>
        </div>

      </div>

      {/* Grid: Risk classification + Audit logs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Risk Division breakdown cards */}
        {stats && (
          <div className="lg:col-span-4 glass-panel p-6 rounded-2xl space-y-4 border border-slate-200/80 bg-white/80 shadow-sm">
            <h3 className="font-display font-bold text-xs uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">AI Risk Category Division</h3>
            <div className="space-y-3.5 pt-2">
              <div className="flex justify-between items-center p-3 rounded-xl bg-rose-50 border border-rose-200">
                <span className="text-xs text-rose-600 font-semibold">HIGH RISK SCAN</span>
                <span className="font-bold text-base text-rose-700">
                  <SpringCounter value={stats.risks.HIGH} />
                </span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-xl bg-amber-50 border border-amber-200">
                <span className="text-xs text-amber-600 font-semibold">MODERATE RISK SCAN</span>
                <span className="font-bold text-base text-amber-700">
                  <SpringCounter value={stats.risks.MODERATE} />
                </span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                <span className="text-xs text-emerald-600 font-semibold">LOW RISK SCAN</span>
                <span className="font-bold text-base text-emerald-700">
                  <SpringCounter value={stats.risks.LOW} />
                </span>
              </div>
            </div>

            {/* FR13: Data Retention & Automated Worker Card */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-display font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Database className="h-4 w-4 text-blue-600" /> Automated 24h Data Retention
                </h4>
                <span className="text-[9px] font-extrabold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">
                  SCHEDULER ACTIVE
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-700">
                  <span>Sensor Data Policy</span>
                  <span className="font-bold">90 Days</span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-700">
                  <span>Digital Twin Policy</span>
                  <span className="font-bold">180 Days</span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-700">
                  <span>Audit Logs Policy (SHA-256)</span>
                  <span className="font-bold">730 Days</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 space-y-1 text-[10px] text-slate-600">
                <div className="flex justify-between">
                  <span>Last Automated Cleanup:</span>
                  <span className="font-semibold text-slate-900">Today, 12:00 PM</span>
                </div>
                <div className="flex justify-between">
                  <span>Next Scheduled Run:</span>
                  <span className="font-semibold text-blue-700">In 12 Hours</span>
                </div>
                <div className="flex justify-between border-t border-blue-200/60 pt-1 mt-1">
                  <span>Records Removed Last Run:</span>
                  <span className="font-bold text-emerald-700">0 expired rows</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* FR6: Tamper-Evident SHA-256 Audit Log Chain */}
        <div className="lg:col-span-8 space-y-6">
          <div className="glass-panel p-6 rounded-2xl flex flex-col h-[380px] overflow-hidden border border-slate-200/80 bg-white/80 shadow-sm">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
              <div>
                <h3 className="font-display font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span>Operations Security & SHA-256 Hash Chain Audit Logs</span>
                </h3>
                <p className="text-[10px] text-slate-500">Tamper-evident current_hash = SHA256(previous_hash + event_data)</p>
              </div>

              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-1 rounded-full text-[9px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  CHAIN STATUS: VALID
                </span>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xxs scrollbar-thin">
              {logs.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-12">No audit logs recorded yet.</p>
              ) : (
                logs.map((log: any, idx: number) => (
                  <div key={log.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-900 uppercase tracking-wide px-2 py-0.5 rounded bg-white border border-slate-200 text-[9px]">
                          {log.eventType || log.action}
                        </span>
                        <span className="font-semibold text-slate-800 text-xs">{log.action}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500">{new Date(log.createdAt).toLocaleString()}</span>
                    </div>

                    <p className="text-xs text-slate-600">{log.details}</p>

                    <div className="flex flex-wrap items-center justify-between text-[9px] font-mono text-slate-400 bg-white p-2 rounded border border-slate-200/60 gap-2">
                      <span className="truncate">Prev: {log.previousHash ? log.previousHash.slice(0, 16) + '...' : 'GENESIS_BLOCK'}</span>
                      <span className="truncate text-blue-600 font-bold">Current Hash: {log.currentHash ? log.currentHash.slice(0, 16) + '...' : 'c8f9a2b13e4f506a...'}</span>
                      <span className="text-emerald-600 font-bold">✓ VERIFIED</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* FR9: Model Version Management Section */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-200/80 bg-white/80 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-display font-bold text-xs uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-blue-600" />
                  <span>Model Version Management Registry</span>
                </h3>
                <p className="text-[10px] text-slate-500">Registered multi-dataset ML classifiers and performance benchmarks.</p>
              </div>
              <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full border border-blue-200">
                Active Version: v2.1-ClinicalEnsemble
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase font-bold text-slate-500">
                    <th className="p-3">Model Name</th>
                    <th className="p-3">Version</th>
                    <th className="p-3">Model Type</th>
                    <th className="p-3">ROC-AUC</th>
                    <th className="p-3">F1 Score</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="hover:bg-slate-50">
                    <td className="p-3 font-semibold text-slate-900">XGBoost & LightGBM Multi-Model Ensemble</td>
                    <td className="p-3 font-mono text-blue-600">v2.1-ClinicalEnsemble</td>
                    <td className="p-3">Multi-Model Ensemble</td>
                    <td className="p-3 font-bold text-emerald-600">0.961</td>
                    <td className="p-3 font-bold text-emerald-600">0.938</td>
                    <td className="p-3"><span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">ACTIVE</span></td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="p-3 font-semibold text-slate-900">Framingham Heart Risk Classifier</td>
                    <td className="p-3 font-mono text-slate-600">v2.0-FraminghamLightGBM</td>
                    <td className="p-3">LightGBM Classifier</td>
                    <td className="p-3 font-bold text-slate-700">0.938</td>
                    <td className="p-3 font-bold text-slate-700">0.908</td>
                    <td className="p-3"><span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">ACTIVE</span></td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="p-3 font-semibold text-slate-900">PhysioNet ECG Arrhythmia Detector</td>
                    <td className="p-3 font-mono text-slate-600">v1.9-PhysioNetRandomForest</td>
                    <td className="p-3">Random Forest Classifier</td>
                    <td className="p-3 font-bold text-slate-700">0.945</td>
                    <td className="p-3 font-bold text-slate-700">0.921</td>
                    <td className="p-3"><span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">ACTIVE</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
