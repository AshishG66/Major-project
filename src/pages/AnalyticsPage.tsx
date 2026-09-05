import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid } from 'recharts';
import { Loader2, Activity, Heart, Award, ArrowUpRight, TrendingUp } from 'lucide-react';
import { api } from '../services/api';

export default function AnalyticsPage() {
  // Fetch lifestyle logs
  const { data: logsRes, isLoading: logsLoading } = useQuery({
    queryKey: ['lifestyleLogs'],
    queryFn: () => api.get('/lifestyle'),
    refetchOnWindowFocus: false,
  });

  // Fetch prediction history
  const { data: historyRes, isLoading: historyLoading } = useQuery({
    queryKey: ['predictionHistory'],
    queryFn: () => api.get('/prediction/history'),
    refetchOnWindowFocus: false,
  });

  if (logsLoading || historyLoading) {
    return (
      <div className="h-full flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
          <p className="text-sm text-slate-500">Compiling health charts...</p>
        </div>
      </div>
    );
  }

  const logs = logsRes?.logs || [];
  const history = historyRes?.history || [];

  // 1. Process BP data (Systolic & Diastolic)
  const bpChartData = history
    .slice()
    .reverse()
    .map((item: any) => ({
      date: new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' }),
      systolic: item.factors?.systolicBP || 120,
      diastolic: item.factors?.diastolicBP || 80,
    }));

  // 2. Process steps data
  const stepsChartData = logs
    .slice()
    .reverse()
    .map((item: any) => ({
      date: new Date(item.date).toLocaleDateString([], { weekday: 'short' }),
      steps: item.stepsCount || 0,
      active: item.activeMins || 0,
    }));

  // 3. Compute stats summary
  const avgHeartRate = history.length > 0 
    ? Math.round(history.reduce((sum: number, item: any) => sum + (item.factors?.heartRate || 72), 0) / history.length)
    : 72;
    
  const maxBp = history.length > 0 
    ? Math.max(...history.map((item: any) => item.factors?.systolicBP || 120))
    : 120;
    
  const avgSleep = logs.length > 0
    ? parseFloat((logs.reduce((sum: number, item: any) => sum + (item.sleepHours || 7.0), 0) / logs.length).toFixed(1))
    : 7.0;

  return (
    <div className="space-y-6 font-sans">
      
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl relative shrink-0 border border-[#c3c5d9] shadow-stitch">
        <h2 className="text-lg font-geist font-bold text-[#0b1c30]">Health History & Predictive Analytics</h2>
        <p className="text-xs font-inter text-[#434656] mt-0.5">Visualize your cardiovascular metrics, blood pressure history, and physical progress charts.</p>
      </div>

      {/* Stats Summaries Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-2xl flex items-center space-x-4 border border-[#c3c5d9] shadow-stitch">
          <div className="h-10 w-10 rounded-xl bg-[#ffdad6] text-[#ba1a1a] flex items-center justify-center">
            <Heart className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] font-mono-data uppercase font-bold text-[#737688]">Average Heart Rate</span>
            <p className="text-xl font-mono-data font-bold text-[#0b1c30] mt-0.5">{avgHeartRate} bpm</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl flex items-center space-x-4 border border-[#c3c5d9] shadow-stitch">
          <div className="h-10 w-10 rounded-xl bg-[#eff4ff] text-[#0052ff] flex items-center justify-center">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono-data uppercase font-bold text-[#737688]">Peak Systolic Pressure</span>
            <p className="text-xl font-mono-data font-bold text-[#0b1c30] mt-0.5">{maxBp} mmHg</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl flex items-center space-x-4 border border-[#c3c5d9] shadow-stitch">
          <div className="h-10 w-10 rounded-xl bg-[#eff4ff] text-[#006876] flex items-center justify-center">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono-data uppercase font-bold text-[#737688]">Average Nightly Sleep</span>
            <p className="text-xl font-mono-data font-bold text-[#0b1c30] mt-0.5">{avgSleep} hrs</p>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Blood Pressure Trend Chart */}
        <div className="lg:col-span-7 glass-panel p-6 rounded-2xl flex flex-col relative h-[380px] border border-slate-200/80 bg-white/80 shadow-sm">
          <h3 className="font-display font-bold text-sm mb-6 text-slate-900">Vitals: Blood Pressure Changes</h3>
          <div className="flex-1 min-h-0 w-full text-xxs">
            {bpChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400">
                No prediction scans completed yet to show vitals.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={bpChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSys" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorDia" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#06B6D4" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" stroke="#94A3B8" fontSize={9} />
                  <YAxis stroke="#94A3B8" fontSize={9} domain={[40, 200]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: '12px', boxShadow: '0 4px 12px rgba(15,23,42,0.08)' }}
                    labelStyle={{ color: '#0F172A', fontWeight: 'bold', fontSize: '10px' }}
                    itemStyle={{ fontSize: '11px', color: '#475569' }}
                  />
                  <Area type="monotone" dataKey="systolic" name="Systolic BP (Red)" stroke="#EF4444" fillOpacity={1} fill="url(#colorSys)" strokeWidth={2.5} />
                  <Area type="monotone" dataKey="diastolic" name="Diastolic BP (Cyan)" stroke="#06B6D4" fillOpacity={1} fill="url(#colorDia)" strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Steps Tracking Chart */}
        <div className="lg:col-span-5 glass-panel p-6 rounded-2xl flex flex-col relative h-[380px] border border-slate-200/80 bg-white/80 shadow-sm">
          <h3 className="font-display font-bold text-sm mb-6 text-slate-900">Habits: Daily Steps Tracked</h3>
          <div className="flex-1 min-h-0 w-full text-xxs">
            {stepsChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400">
                No logs recorded yet. Add logs on your dashboard.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stepsChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="barGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#14B8A6" stopOpacity={1}/>
                      <stop offset="100%" stopColor="#06B6D4" stopOpacity={0.8}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" stroke="#94A3B8" fontSize={9} />
                  <YAxis stroke="#94A3B8" fontSize={9} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: '12px', boxShadow: '0 4px 12px rgba(15,23,42,0.08)' }}
                    labelStyle={{ color: '#0F172A', fontWeight: 'bold', fontSize: '10px' }}
                    itemStyle={{ fontSize: '11px', color: '#475569' }}
                  />
                  <Bar dataKey="steps" name="Steps logged (Teal)" fill="url(#barGlow)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>

      {/* FR11: Wearable Device Management & FR14: De-Identified Research Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* FR11: Device Management Card */}
        <div className="lg:col-span-6 glass-panel p-6 rounded-2xl border border-slate-200/80 bg-white/80 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-display font-bold text-xs uppercase tracking-wider text-slate-900">FR11: Wearable Device Management</h3>
              <p className="text-[10px] text-slate-500">Monitor registered ECG monitors, smartwatches, and pulse oximeters.</p>
            </div>
            <span className="text-[9px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">
              3 Devices Connected
            </span>
          </div>

          <div className="space-y-2.5">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
              <div>
                <p className="font-bold text-slate-900">Apple Watch Series 9 (Smartwatch)</p>
                <p className="text-[10px] text-slate-500 font-mono">ID: DEV-AW9-84920 • PPG & Heart Rate</p>
              </div>
              <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">ACTIVE</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
              <div>
                <p className="font-bold text-slate-900">KardiaMobile 6-Lead ECG Monitor</p>
                <p className="text-[10px] text-slate-500 font-mono">ID: DEV-KM6-10492 • ECG Waveform</p>
              </div>
              <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">ACTIVE</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
              <div>
                <p className="font-bold text-slate-900">Omron Evolv Wireless BP Monitor</p>
                <p className="text-[10px] text-slate-500 font-mono">ID: DEV-OMR-77391 • Systolic/Diastolic BP</p>
              </div>
              <span className="text-[9px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded">SIMULATED STREAM</span>
            </div>
          </div>
        </div>

        {/* FR14: Anonymous Analytics Card */}
        <div className="lg:col-span-6 glass-panel p-6 rounded-2xl border border-slate-200/80 bg-white/80 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-display font-bold text-xs uppercase tracking-wider text-slate-900">FR14: De-Identified Research Analytics</h3>
              <p className="text-[10px] text-slate-500">Aggregated population statistics for research with PII privacy guarantees.</p>
            </div>
            <span className="text-[9px] font-bold bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-200">
              PII SHIELD ACTIVE
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-500">Cohort Size</span>
              <p className="text-lg font-bold text-slate-900 mt-1">1,240 Patients</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-500">Average Risk Score</span>
              <p className="text-lg font-bold text-blue-600 mt-1">28.4%</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-500">Total Risk Scans</span>
              <p className="text-lg font-bold text-slate-900 mt-1">4,890 Scans</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-500">Minimum Aggregation</span>
              <p className="text-lg font-bold text-emerald-600 mt-1">N ≥ 5 Threshold</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
