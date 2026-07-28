import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { Loader2 } from 'lucide-react';
import { api } from '../services/api';
import HealthJourney from './HealthJourney';

interface AnalyticsTabProps {
  bpChartData: any[];
  bmiChartData: any[];
  cholChartData: any[];
  radarData: any[];
  shapWaterfall: any[];
  pctSteps: number;
  pctActive: number;
  pctWater: number;
  pctSleep: number;
  simBmi: number;
  dash: any;
}

export default function AnalyticsTab({
  bpChartData,
  bmiChartData,
  cholChartData,
  radarData,
  shapWaterfall,
  pctSteps,
  pctActive,
  pctWater,
  pctSleep,
  simBmi,
  dash
}: AnalyticsTabProps) {
  const [vitalsTab, setVitalsTab] = useState<'BP' | 'BMI' | 'CHOL' | 'SLEEP'>('BP');

  // Query logs only when tab is mounted
  const { data: logsRes, isLoading: logsLoading } = useQuery({
    queryKey: ['lifestyleLogs'],
    queryFn: () => api.get('/lifestyle'),
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const logs = logsRes?.logs || [];
  const sleepChartData = logs.slice().reverse().map((item: any) => ({
    date: new Date(item.date).toLocaleDateString([], { weekday: 'short' }),
    value: item.sleepHours || 7.0,
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Historical Vitals Diagnostics Panel */}
        <div className="lg:col-span-8 glass-panel p-6 rounded-2xl flex flex-col h-[390px] relative bg-white/80 border border-slate-200/80 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 border-b border-slate-100 pb-3 gap-3">
            <h3 className="font-display font-bold text-xs uppercase tracking-wider text-slate-500">Historical Vitals Diagnostics Panel</h3>
            
            <div className="flex space-x-1.5 text-[10px] font-semibold uppercase">
              {['BP', 'BMI', 'CHOL', 'SLEEP'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setVitalsTab(tab as any)}
                  className={`px-3 py-1.5 rounded-lg border transition-all ${
                    vitalsTab === tab 
                      ? 'bg-blue-50 text-blue-600 border-blue-200 font-bold' 
                      : 'border-slate-200 bg-white text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 min-h-0 w-full text-[10px]">
            {vitalsTab === 'BP' && (
              bpChartData.length === 0 ? <div className="h-full flex items-center justify-center text-slate-500">Run predictive scans to visualize blood pressure.</div> :
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={bpChartData} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                  <defs>
                    <linearGradient id="sysGlow3" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="diaGlow3" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#06B6D4" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" stroke="#64748B" fontSize={9} />
                  <YAxis stroke="#64748B" fontSize={9} domain={[40, 200]} />
                  <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: '12px', color: '#0F172A', boxShadow: '0 4px 12px rgba(15,23,42,0.08)' }} />
                  <Area type="monotone" dataKey="systolic" name="Systolic BP (Red)" stroke="#EF4444" fillOpacity={1} fill="url(#sysGlow3)" strokeWidth={2.5} />
                  <Area type="monotone" dataKey="diastolic" name="Diastolic BP (Cyan)" stroke="#06B6D4" fillOpacity={1} fill="url(#diaGlow3)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}

            {vitalsTab === 'BMI' && (
              <div className="h-full flex flex-col items-center justify-center">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-4 block">Segmented BMI Gauge</span>
                
                <div className="relative w-72 h-10 bg-slate-100 border border-slate-200 rounded-full overflow-hidden flex text-[9px] uppercase font-bold items-center text-center">
                  <div className="w-1/4 h-full bg-blue-50 text-blue-600 border-r border-slate-200 flex items-center justify-center">Underweight</div>
                  <div className="w-1/4 h-full bg-emerald-50 text-emerald-600 border-r border-slate-200 flex items-center justify-center">Normal</div>
                  <div className="w-1/4 h-full bg-amber-50 text-amber-600 border-r border-slate-200 flex items-center justify-center">Overweight</div>
                  <div className="w-1/4 h-full bg-rose-50 text-rose-600 flex items-center justify-center">Obese</div>
                  
                  <div 
                    className="absolute top-0 bottom-0 w-1.5 bg-slate-900 border border-white transition-all duration-1000 ease-out shadow-xs"
                    style={{
                      left: `${
                        simBmi < 18.5 ? (simBmi / 18.5) * 25 :
                        simBmi < 25.0 ? 25 + ((simBmi - 18.5) / 6.5) * 25 :
                        simBmi < 30.0 ? 50 + ((simBmi - 25.0) / 5.0) * 25 :
                        75 + Math.min(25, ((simBmi - 30.0) / 6.0) * 25)
                      }%`
                    }}
                  />
                </div>
                
                <div className="mt-4 text-center">
                  <span className="text-xl font-bold font-display text-slate-900">{simBmi} kg/m²</span>
                  <span className="text-xxs text-slate-500 block mt-1 uppercase font-semibold">
                    Calculated body mass index indicators
                  </span>
                </div>
              </div>
            )}

            {vitalsTab === 'CHOL' && (
              <div className="h-full flex flex-col items-center justify-center">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-2 block">Liquid Wave Cholesterol Meter</span>
                
                <div className="relative h-32 w-32 rounded-full border-4 border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center">
                  <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
                    <g className="transition-all duration-1000 ease-out">
                      <path
                        d="M 0 60 Q 25 55 50 60 T 100 60 L 100 100 L 0 100 Z"
                        fill="rgba(59, 130, 246, 0.25)"
                        style={{
                          transform: `translateY(${Math.max(-50, Math.min(50, 50 - (dash?.predictions?.[0]?.factors?.cholesterol || 190) / 4))}%)`
                        }}
                      />
                    </g>
                  </svg>
                  
                  <div className="relative z-10 text-center flex flex-col items-center">
                    <span className="text-2xl font-bold font-display text-slate-900">{(dash?.predictions?.[0]?.factors?.cholesterol || 190)}</span>
                    <span className="text-[9px] text-slate-500 uppercase font-semibold">mg/dL</span>
                  </div>
                </div>
              </div>
            )}

            {vitalsTab === 'SLEEP' && (
              logsLoading ? <div className="h-full flex items-center justify-center"><Loader2 className="h-6 w-6 text-blue-600 animate-spin" /></div> :
              sleepChartData.length === 0 ? <div className="h-full flex items-center justify-center text-slate-500">No sleep history logged.</div> :
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sleepChartData} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                  <defs>
                    <linearGradient id="sleepGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" stroke="#64748B" fontSize={9} />
                  <YAxis stroke="#64748B" fontSize={9} domain={[4, 12]} />
                  <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: '12px', color: '#0F172A', boxShadow: '0 4px 12px rgba(15,23,42,0.08)' }} />
                  <Area type="monotone" dataKey="value" name="Sleep hours (Indigo)" stroke="#6366F1" fillOpacity={1} fill="url(#sleepGlow)" strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Radar Balance Card */}
        <div className="lg:col-span-4 glass-panel p-6 rounded-2xl flex flex-col justify-between h-[390px] relative bg-white/80 border border-slate-200/80 shadow-sm">
          <h3 className="font-display font-bold text-xs uppercase tracking-wider text-slate-500 mb-2">Vitals Balance Radar</h3>
          
          <div className="flex-1 min-h-0 w-full text-[9px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                <PolarGrid stroke="#E2E8F0" />
                <PolarAngleAxis dataKey="subject" stroke="#64748B" fontSize={8} />
                <PolarRadiusAxis stroke="transparent" domain={[0, 100]} />
                <Radar name="Scored index" dataKey="value" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.15} strokeWidth={1.5} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          
          <span className="text-[8px] text-slate-500 font-light block border-t border-slate-100 pt-2 text-center mt-2 leading-relaxed">
            Multi-factor balance mapping sleep, active inputs, stress, and BMI.
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* SHAP Waterfall Card */}
        <div className="lg:col-span-6 glass-panel p-6 rounded-2xl flex flex-col justify-between h-[310px] bg-white/80 border border-slate-200/80 shadow-sm">
          <div>
            <h4 className="font-display font-bold text-xs uppercase text-rose-600 tracking-wider border-b border-slate-100 pb-2">
              SHAP Waterfall Attribution Weights
            </h4>
            <p className="text-[8px] text-slate-500 mt-1 leading-relaxed">
              Factor contributions offsets relative to simulated cardio risk baseline.
            </p>
          </div>

          <div className="space-y-2 mt-4 flex-grow justify-center flex flex-col">
            {shapWaterfall.map((f, idx) => {
              const isPositive = f.value > 0;
              const absVal = Math.abs(f.value);
              const widthPct = Math.min(100, (absVal / 25) * 100);

              return (
                <div key={idx} className="space-y-0.5 text-[9px]">
                  <div className="flex justify-between font-semibold">
                    <span className="text-slate-800">{f.name}</span>
                    <span className={isPositive ? 'text-rose-600' : 'text-emerald-600'}>
                      {isPositive ? `+${f.value}` : f.value}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex relative border border-slate-200">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${isPositive ? 'bg-rose-500' : 'bg-emerald-500'}`}
                      style={{
                        width: `${widthPct}%`,
                        marginLeft: isPositive ? '50%' : `${50 - widthPct}%`,
                      }}
                    />
                    <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-slate-300" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Activity Rings (Static counters optimization) */}
        <div className="lg:col-span-3 glass-panel p-6 rounded-2xl flex flex-col justify-between h-[310px] relative bg-white/80 border border-slate-200/80 shadow-sm">
          <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Smartwatch Activity Rings</span>

          <div className="flex flex-col items-center justify-center flex-1 mt-4">
            <div className="relative h-28 w-28 shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" stroke="#E2E8F0" strokeWidth="6" fill="transparent" />
                <circle cx="50" cy="50" r="42" stroke="#06B6D4" strokeWidth="6" fill="transparent"
                  strokeDasharray="264" strokeDashoffset={264 - (264 * pctSteps) / 100} strokeLinecap="round" />

                <circle cx="50" cy="50" r="34" stroke="#E2E8F0" strokeWidth="6" fill="transparent" />
                <circle cx="50" cy="50" r="34" stroke="#3B82F6" strokeWidth="6" fill="transparent"
                  strokeDasharray="213" strokeDashoffset={213 - (213 * pctActive) / 100} strokeLinecap="round" />

                <circle cx="50" cy="50" r="26" stroke="#E2E8F0" strokeWidth="6" fill="transparent" />
                <circle cx="50" cy="50" r="26" stroke="#10B981" strokeWidth="6" fill="transparent"
                  strokeDasharray="163" strokeDashoffset={163 - (163 * pctWater) / 100} strokeLinecap="round" />

                <circle cx="50" cy="50" r="18" stroke="#E2E8F0" strokeWidth="6" fill="transparent" />
                <circle cx="50" cy="50" r="18" stroke="#EF4444" strokeWidth="6" fill="transparent"
                  strokeDasharray="113" strokeDashoffset={113 - (113 * pctSleep) / 100} strokeLinecap="round" />
              </svg>
            </div>

            <div className="space-y-1 mt-4 text-[9px] font-semibold w-full px-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
                  <span className="text-slate-700">Steps Target</span>
                </div>
                <span className="text-slate-900">{Math.round(pctSteps)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                  <span className="text-slate-700">Exercise Duration</span>
                </div>
                <span className="text-slate-900">{Math.round(pctActive)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span className="text-slate-700">Water Intake</span>
                </div>
                <span className="text-slate-900">{Math.round(pctWater)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                  <span className="text-slate-700">Sleep Duration</span>
                </div>
                <span className="text-slate-900">{Math.round(pctSleep)}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Health Journey Roadmap Card */}
        <div className="lg:col-span-3 flex flex-col">
          <HealthJourney />
        </div>
      </div>
    </div>
  );
}
