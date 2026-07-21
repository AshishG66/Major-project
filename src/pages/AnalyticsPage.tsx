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
          <Loader2 className="h-10 w-10 text-health-cyan animate-spin" />
          <p className="text-sm text-health-textMuted">Compiling health charts...</p>
        </div>
      </div>
    );
  }

  const logs = logsRes?.logs || [];
  const history = historyRes?.history || [];

  // 1. Process BP data (Systolic & Diastolic)
  // Maps in reverse order (chronological)
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
    <div className="space-y-6">
      
      {/* Header */}
      <div className="glass-panel p-6 rounded-2xl relative shrink-0">
        <h2 className="text-lg font-display font-bold">Health History & Analytics</h2>
        <p className="text-xs text-health-textMuted mt-0.5">Visualize your cardiovascular metrics, blood pressure history, and physical progress charts.</p>
      </div>

      {/* Stats summaries Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-5 rounded-2xl flex items-center space-x-4">
          <div className="h-10 w-10 rounded-xl bg-health-rose/10 text-health-rose flex items-center justify-center">
            <Heart className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-semibold text-health-textMuted">Average Heart Rate</span>
            <p className="text-xl font-bold font-display mt-0.5">{avgHeartRate} bpm</p>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl flex items-center space-x-4">
          <div className="h-10 w-10 rounded-xl bg-health-blue/10 text-health-blue flex items-center justify-center">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-semibold text-health-textMuted">Peak Systolic Pressure</span>
            <p className="text-xl font-bold font-display mt-0.5">{maxBp} mmHg</p>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl flex items-center space-x-4">
          <div className="h-10 w-10 rounded-xl bg-health-cyan/10 text-health-cyan flex items-center justify-center">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-semibold text-health-textMuted">Average Sleep hours</span>
            <p className="text-xl font-bold font-display mt-0.5">{avgSleep} hrs</p>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Blood Pressure Trend Chart */}
        <div className="lg:col-span-7 glass-panel p-6 rounded-2xl flex flex-col relative h-[380px]">
          <h3 className="font-display font-bold text-sm mb-6">Vitals: Blood Pressure Changes</h3>
          <div className="flex-1 min-h-0 w-full text-xxs">
            {bpChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-health-textMuted">
                No prediction scans completed yet to show vitals.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={bpChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSys" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#F43F5E" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorDia" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" stroke="#9CA3AF" fontSize={9} />
                  <YAxis stroke="#9CA3AF" fontSize={9} domain={[40, 200]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#111827', borderColor: 'rgba(255,255,255,0.08)', borderRadius: '12px' }}
                    labelStyle={{ color: '#fff', fontWeight: 'bold', fontSize: '10px' }}
                    itemStyle={{ fontSize: '11px', color: '#ccc' }}
                  />
                  <Area type="monotone" dataKey="systolic" name="Systolic BP" stroke="#F43F5E" fillOpacity={1} fill="url(#colorSys)" strokeWidth={2} />
                  <Area type="monotone" dataKey="diastolic" name="Diastolic BP" stroke="#3B82F6" fillOpacity={1} fill="url(#colorDia)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Steps Tracking Chart */}
        <div className="lg:col-span-5 glass-panel p-6 rounded-2xl flex flex-col relative h-[380px]">
          <h3 className="font-display font-bold text-sm mb-6">Habits: Daily Steps Tracked</h3>
          <div className="flex-1 min-h-0 w-full text-xxs">
            {stepsChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-health-textMuted">
                No logs recorded yet. Add logs on your dashboard.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stepsChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <XAxis dataKey="date" stroke="#9CA3AF" fontSize={9} />
                  <YAxis stroke="#9CA3AF" fontSize={9} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#111827', borderColor: 'rgba(255,255,255,0.08)', borderRadius: '12px' }}
                    labelStyle={{ color: '#fff', fontWeight: 'bold', fontSize: '10px' }}
                    itemStyle={{ fontSize: '11px', color: '#ccc' }}
                  />
                  <Bar dataKey="steps" name="Steps logged" fill="#06B6D4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
