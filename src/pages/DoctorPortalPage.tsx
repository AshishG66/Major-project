import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { User, Clipboard, FileText, CheckCircle, Loader2, Star, Send, ShieldAlert, Sparkles, Clock, AlertTriangle, Calendar, Activity, ShieldCheck, Thermometer } from 'lucide-react';
import { api } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';

export default function DoctorPortalPage() {
  const queryClient = useQueryClient();
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [followUpMsg, setFollowUpMsg] = useState<string | null>(null);

  // Fetch patient directory
  const { data: patientsRes, isLoading: patientsLoading } = useQuery({
    queryKey: ['patientsList'],
    queryFn: () => api.get('/doctor/patients'),
  });

  // Fetch notes of selected patient
  const { data: notesRes, isLoading: notesLoading } = useQuery({
    queryKey: ['patientNotes', selectedPatientId],
    queryFn: () => api.get(`/doctor/notes/${selectedPatientId}`),
    enabled: !!selectedPatientId,
  });

  // Mutation to add doctor note
  const addNoteMutation = useMutation({
    mutationFn: (body: { patientId: string; note: string }) => api.post('/doctor/note', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientNotes', selectedPatientId] });
      setNoteText('');
    }
  });

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim() || !selectedPatientId) return;
    addNoteMutation.mutate({ patientId: selectedPatientId, note: noteText });
  };

  const handleScheduleFollowup = (weeks: number) => {
    setFollowUpMsg(`✅ Follow-up scheduled for this patient in ${weeks} week${weeks > 1 ? 's' : ''}!`);
    setTimeout(() => setFollowUpMsg(null), 3000);
  };

  const patients = patientsRes?.patients || [];
  
  // Sort patient queue by highest risk score/level first
  const sortedPatients = patients.slice().sort((a: any, b: any) => {
    const latestA = a.predictions[0];
    const latestB = b.predictions[0];
    const scoreA = latestA?.riskScore || (latestA?.riskLevel === 'HIGH' ? 85 : latestA?.riskLevel === 'MODERATE' ? 50 : 15);
    const scoreB = latestB?.riskScore || (latestB?.riskLevel === 'HIGH' ? 85 : latestB?.riskLevel === 'MODERATE' ? 50 : 15);
    return scoreB - scoreA;
  });

  const selectedPatient = patients.find((p: any) => p.id === selectedPatientId);
  const notes = notesRes?.notes || [];

  // Compile individual patient AI diagnostic summaries
  const getPatientAISummary = (pat: any) => {
    const factors = pat?.predictions[0]?.factors;
    if (!factors) return "Insufficient vitals logged to compile clinical summary.";
    
    const riskLvl = pat.predictions[0]?.riskLevel;
    const name = `${pat.profile?.firstName} ${pat.profile?.lastName}`;

    let summaryText = `${name} is a ${factors.age}-year-old ${factors.gender.toLowerCase()} displaying `;
    if (riskLvl === 'HIGH') {
      summaryText += `acute cardiovascular strain. Systolic pressure registers at an elevated ${factors.systolicBP} mmHg. Comorbidities include diabetes and cholesterol of ${factors.cholesterol} mg/dL, paired with Left Ventricular Hypertrophy.`;
    } else if (riskLvl === 'MODERATE') {
      summaryText += `borderline cardiac risks. Blood pressure is moderate (${factors.systolicBP}/${factors.diastolicBP} mmHg). Key drivers include elevated lifestyle stress (${factors.stressLevel}/10) and low sleep averages (${factors.sleepDuration || 6.0}h).`;
    } else {
      summaryText += `healthy clinical indices. Metrics maintain standard baselines (BP: ${factors.systolicBP} mmHg, cholesterol: ${factors.cholesterol} mg/dL) with high exercise compliance (${factors.exerciseFrequency} days/week).`;
    }
    return summaryText;
  };

  // Compile Bubble Chart Data from patient directory
  const bubbleChartData = patients.map((pat: any) => {
    const latest = pat.predictions[0];
    const factors = latest?.factors || {};
    return {
      name: `${pat.profile?.firstName} ${pat.profile?.lastName}`,
      age: factors.age || 40,
      riskScore: latest?.riskScore || (latest?.riskLevel === 'HIGH' ? 85 : latest?.riskLevel === 'MODERATE' ? 48 : 12),
      systolic: factors.systolicBP || 120,
    };
  });

  // Capacity indicators
  const capacityMetrics = {
    icuBeds: 82, // alert occupancy
    cardiacWard: 64,
    doctorsDuty: 8,
    emergencyQueue: 3
  };

  // Static calendar appointments
  const followUpAppointments = [
    { date: 'Mon 19', time: '09:30 AM', patient: 'Amit Sharma', type: 'ICU Review' },
    { date: 'Wed 21', time: '11:00 AM', patient: 'Priya Patel', type: 'ECG Check' },
    { date: 'Fri 23', time: '02:15 PM', patient: 'Rohan Verma', type: 'Dietary Audit' }
  ];

  return (
    <div className="glass-panel rounded-2xl border-white/5 flex flex-col lg:flex-row h-[calc(100vh-140px)] overflow-hidden relative">
      
      {/* Patient Directory Sidebar */}
      <div className="w-full lg:w-72 border-r border-white/5 p-4 bg-black/20 h-full flex flex-col shrink-0">
        <div className="px-3 py-2.5 border-b border-white/5 mb-4 shrink-0">
          <h3 className="font-display font-bold text-xs uppercase tracking-wider text-health-textMuted flex items-center justify-between">
            <span>Patient Queue ({sortedPatients.length})</span>
            <span className="text-[8px] bg-health-blue/15 text-health-blue border border-health-blue/30 px-2 py-0.5 rounded-full font-bold">Risk priority</span>
          </h3>
        </div>

        {patientsLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-6 w-6 text-health-cyan animate-spin" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
            {sortedPatients.map((pat: any) => {
              const latestPred = pat.predictions[0];
              const isHigh = latestPred?.riskLevel === 'HIGH';
              const isMod = latestPred?.riskLevel === 'MODERATE';
              
              return (
                <button
                  key={pat.id}
                  onClick={() => setSelectedPatientId(pat.id)}
                  className={`w-full text-left p-3.5 rounded-xl text-xs transition-all block relative border ${
                    selectedPatientId === pat.id
                      ? 'bg-white/10 border-health-blue'
                      : 'bg-white/5 border-white/5 text-health-textMuted hover:text-white hover:bg-white/10'
                  }`}
                >
                  {isHigh && <span className="absolute top-3 right-3 h-2 w-2 rounded-full bg-health-rose animate-ping" />}
                  <div className="font-semibold text-white/95">{pat.profile?.firstName} {pat.profile?.lastName}</div>
                  <div className="flex justify-between items-center text-[10px] text-health-textMuted mt-1">
                    <span className={`font-bold ${isHigh ? 'text-health-rose' : isMod ? 'text-health-amber' : 'text-health-emerald'}`}>
                      {latestPred?.riskLevel || 'UNSCANNED'}
                    </span>
                    <span>Age: {latestPred?.factors?.age || 'N/A'}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Patient review screen */}
      <div className="flex-1 flex flex-col min-w-0 bg-health-card/10 h-full overflow-y-auto scrollbar-thin">
        {!selectedPatientId ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
            <User className="h-10 w-10 text-health-blue/30 animate-pulse" />
            <div>
              <h4 className="font-display font-semibold text-sm mb-1">Prioritized Clinical Dashboard</h4>
              <p className="text-xs text-health-textMuted max-w-sm font-light leading-relaxed">
                Choose a patient from the sorted queue to examine clinical heatmaps, patient bubble indicators, hospital ICU capacities, and logs.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            
            {/* Top Warning Alert Ticker */}
            {selectedPatient.predictions[0]?.riskLevel === 'HIGH' && (
              <div className="p-3 bg-health-rose/10 border border-health-rose/20 rounded-xl flex items-center space-x-3 text-xxs text-health-rose animate-pulse">
                <AlertTriangle className="h-4.5 w-4.5 shrink-0" />
                <span><strong>CRITICAL ALERT:</strong> {selectedPatient.profile?.firstName} {selectedPatient.profile?.lastName} has logged a systolic pressure of {selectedPatient.predictions[0]?.factors?.systolicBP} mmHg. immediate follow-up required.</span>
              </div>
            )}

            {/* Top clinical status overview */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-white/5 pb-4 gap-4">
              <div>
                <h2 className="text-lg font-bold font-display">{selectedPatient.profile?.firstName} {selectedPatient.profile?.lastName}</h2>
                <span className="text-[10px] text-health-textMuted">Care ID: {selectedPatient.id}</span>
              </div>

              {/* Risk prioritization indicator */}
              <div className="flex items-center gap-2">
                {selectedPatient.predictions[0]?.riskLevel === 'HIGH' ? (
                  <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-health-rose/15 text-health-rose border border-health-rose/25 font-bold uppercase text-[10px] shadow-glow-rose">
                    <ShieldAlert className="h-4 w-4 animate-bounce" />
                    <span>Emergency Queue priority</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white/5 text-health-textMuted border border-white/5 font-bold uppercase text-[10px]">
                    <CheckCircle className="h-4 w-4 text-health-emerald" />
                    <span>Clinical parameters stable</span>
                  </div>
                )}
              </div>
            </div>

            {/* AI Automated Summary */}
            <div className="glass-panel p-5 rounded-2xl border-white/5 bg-gradient-to-r from-health-blue/5 to-transparent flex items-start space-x-3">
              <Sparkles className="h-5 w-5 text-health-blue mt-0.5 shrink-0" />
              <div>
                <span className="text-[9px] uppercase font-bold text-health-blue tracking-wider">Automated Clinical AI Synthesis</span>
                <p className="text-xs font-light text-white/95 mt-1 leading-relaxed">
                  "{getPatientAISummary(selectedPatient)}"
                </p>
              </div>
            </div>

            {/* Grid 2-Column: Bubble chart & Heatmap */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Bubble Chart */}
              <div className="glass-panel p-5 rounded-2xl h-[280px] flex flex-col justify-between">
                <h3 className="font-display font-bold text-xs uppercase tracking-wider text-health-textMuted mb-2">Patient Directory Bubble Indicator</h3>
                <div className="flex-1 min-h-0 w-full text-[10px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 0, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis type="number" dataKey="age" name="Age" unit=" yrs" stroke="#9CA3AF" fontSize={8} />
                      <YAxis type="number" dataKey="riskScore" name="Risk Score" unit="%" stroke="#9CA3AF" fontSize={8} />
                      <ZAxis type="number" dataKey="systolic" range={[60, 260]} name="Systolic BP" unit=" mmHg" />
                      <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: '#111827', borderColor: 'rgba(255,255,255,0.08)', borderRadius: '12px' }} />
                      <Scatter name="Patients" data={bubbleChartData} fill="#06b6d4" />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Grid Risk Heatmap */}
              <div className="glass-panel p-5 rounded-2xl h-[280px] flex flex-col justify-between">
                <h3 className="font-display font-bold text-xs uppercase tracking-wider text-health-textMuted mb-2">Cohort Risk Factor Heatmap (BP vs BMI)</h3>
                
                {/* 5x5 Matrix Grid */}
                <div className="grid grid-cols-5 gap-1.5 flex-1 items-stretch py-2 text-[8px] font-bold text-center">
                  {/* Row 1 (High BP) */}
                  <div className="p-2 rounded bg-health-rose/40 text-health-rose border border-health-rose/50 flex flex-col justify-center"><span>BP 160+</span><span className="text-[10px]">3 pts</span></div>
                  <div className="p-2 rounded bg-health-rose/30 text-health-rose border border-health-rose/40 flex flex-col justify-center"><span>BP 150</span><span className="text-[10px]">2 pts</span></div>
                  <div className="p-2 rounded bg-health-rose/30 text-health-rose border border-health-rose/40 flex flex-col justify-center"><span>BP 140</span><span className="text-[10px]">1 pt</span></div>
                  <div className="p-2 rounded bg-health-amber/30 text-health-amber border border-health-amber/40 flex flex-col justify-center"><span>BP 130</span><span className="text-[10px]">0 pts</span></div>
                  <div className="p-2 rounded bg-health-emerald/20 text-health-emerald border border-health-emerald/30 flex flex-col justify-center"><span>BP &lt;120</span><span className="text-[10px]">0 pts</span></div>

                  {/* Row 2 */}
                  <div className="p-2 rounded bg-health-rose/30 text-health-rose border border-health-rose/40 flex flex-col justify-center"><span>BP 150</span><span className="text-[10px]">2 pts</span></div>
                  <div className="p-2 rounded bg-health-rose/30 text-health-rose border border-health-rose/40 flex flex-col justify-center"><span>BP 140</span><span className="text-[10px]">2 pts</span></div>
                  <div className="p-2 rounded bg-health-amber/30 text-health-amber border border-health-amber/40 flex flex-col justify-center"><span>BP 130</span><span className="text-[10px]">1 pt</span></div>
                  <div className="p-2 rounded bg-health-emerald/20 text-health-emerald border border-health-emerald/30 flex flex-col justify-center"><span>BP 125</span><span className="text-[10px]">1 pt</span></div>
                  <div className="p-2 rounded bg-health-emerald/20 text-health-emerald border border-health-emerald/30 flex flex-col justify-center"><span>BP &lt;120</span><span className="text-[10px]">2 pts</span></div>

                  {/* Row 3 */}
                  <div className="p-2 rounded bg-health-rose/30 text-health-rose border border-health-rose/40 flex flex-col justify-center"><span>BP 145</span><span className="text-[10px]">1 pt</span></div>
                  <div className="p-2 rounded bg-health-amber/30 text-health-amber border border-health-amber/40 flex flex-col justify-center"><span>BP 135</span><span className="text-[10px]">0 pts</span></div>
                  <div className="p-2 rounded bg-health-emerald/20 text-health-emerald border border-health-emerald/30 flex flex-col justify-center"><span>BP 125</span><span className="text-[10px]">2 pts</span></div>
                  <div className="p-2 rounded bg-health-emerald/20 text-health-emerald border border-health-emerald/30 flex flex-col justify-center"><span>BP 120</span><span className="text-[10px]">3 pts</span></div>
                  <div className="p-2 rounded bg-health-emerald/20 text-health-emerald border border-health-emerald/30 flex flex-col justify-center"><span>BP &lt;118</span><span className="text-[10px]">4 pts</span></div>
                </div>
                <div className="flex justify-between text-[7px] text-health-textMuted px-1 border-t border-white/5 pt-1.5">
                  <span>Columns: BMI (&lt;18, 22, 26, 30, 35+)</span>
                  <span className="text-health-rose font-bold">Grid matches high density cohorts</span>
                </div>
              </div>

            </div>

            {/* Grid 2-Column: Hospital Capacity & Follow-up Calendar */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Capacity indicators */}
              <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between">
                <div>
                  <h3 className="font-display font-bold text-xs uppercase tracking-wider text-health-textMuted mb-1">Clinical Unit Capacity</h3>
                  <p className="text-[9px] text-health-textMuted leading-relaxed font-light">Occupancy loads mapped across central wards.</p>
                </div>

                <div className="space-y-4 my-3 flex-1 flex flex-col justify-center">
                  {/* ICU */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold">
                      <span>Intensive Care Unit (ICU) Beds</span>
                      <span className="text-health-rose font-bold">{capacityMetrics.icuBeds}% Capacity</span>
                    </div>
                    <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-health-rose rounded-full shadow-glow-rose" style={{ width: `${capacityMetrics.icuBeds}%` }} />
                    </div>
                  </div>

                  {/* Cardiac */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold">
                      <span>Vascular & Cardiac Ward</span>
                      <span className="text-health-amber font-bold">{capacityMetrics.cardiacWard}% Occupancy</span>
                    </div>
                    <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-health-amber rounded-full" style={{ width: `${capacityMetrics.cardiacWard}%` }} />
                    </div>
                  </div>
                </div>

                <div className="border-t border-white/5 pt-2 flex items-center justify-between text-[8px] text-health-textMuted">
                  <span>Emergency Queue pending: 3 critical patients</span>
                  <span className="h-2 w-2 rounded-full bg-health-rose animate-ping" />
                </div>
              </div>

              {/* Follow-up Planner Grid */}
              <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between">
                <h3 className="font-display font-bold text-xs uppercase tracking-wider text-health-textMuted mb-2">Upcoming Follow-up Appointments</h3>
                
                <div className="space-y-2.5 flex-1 flex flex-col justify-center my-2">
                  {followUpAppointments.map((appt, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between text-xxs font-light hover:bg-white/10 transition-all">
                      <div className="flex items-center space-x-3">
                        <div className="h-7 w-7 rounded bg-health-blue/15 text-health-blue flex items-center justify-center font-bold">
                          {appt.date}
                        </div>
                        <div>
                          <p className="font-bold text-white">{appt.patient}</p>
                          <p className="text-[9px] text-health-textMuted">{appt.time}</p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-black/40 text-health-cyan text-[8px] font-bold uppercase">
                        {appt.type}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2.5 border-t border-white/5 pt-2.5">
                  <button onClick={() => handleScheduleFollowup(1)} className="px-3 py-1.5 border border-white/5 hover:border-health-cyan/30 bg-white/5 rounded-lg text-[9px] font-bold flex items-center space-x-1 transition-colors">
                    <Calendar className="h-3 w-3" />
                    <span>1 Week</span>
                  </button>
                  <button onClick={() => handleScheduleFollowup(2)} className="px-3 py-1.5 border border-white/5 hover:border-health-cyan/30 bg-white/5 rounded-lg text-[9px] font-bold flex items-center space-x-1 transition-colors">
                    <Calendar className="h-3 w-3" />
                    <span>2 Weeks</span>
                  </button>
                  {followUpMsg && (
                    <span className="text-[9px] text-health-cyan font-bold flex items-center pl-1 animate-pulse">{followUpMsg}</span>
                  )}
                </div>
              </div>

            </div>

            {/* Doctor note forms & listing */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              
              {/* Form */}
              <div className="glass-panel p-5 rounded-2xl space-y-4">
                <h4 className="font-display font-bold text-xs uppercase tracking-wider text-health-textMuted">Add Clinical Recommendation</h4>
                <form onSubmit={handleAddNote} className="space-y-4">
                  <textarea
                    rows={4}
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Provide lifestyle feedback or therapeutic advice..."
                    className="w-full p-3 text-xs glass-input placeholder-white/20"
                    required
                  />
                  <button
                    type="submit"
                    disabled={addNoteMutation.isPending || !noteText.trim()}
                    className="w-full py-2.5 bg-gradient-to-r from-health-blue to-health-cyan text-xs font-semibold rounded-xl text-white hover:shadow-glow flex items-center justify-center space-x-1.5 transition-all"
                  >
                    {addNoteMutation.isPending ? (
                      <Loader2 className="h-4.5 w-4.5 animate-spin" />
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5" />
                        <span>Submit Note</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Notes List */}
              <div className="glass-panel p-5 rounded-2xl h-[240px] flex flex-col overflow-hidden">
                <h4 className="font-display font-bold text-xs uppercase tracking-wider text-health-textMuted mb-3">Clinical Notes History</h4>
                <div className="flex-1 overflow-y-auto space-y-3 scrollbar-thin">
                  {notesLoading ? (
                    <div className="h-full flex items-center justify-center">
                      <Loader2 className="h-4.5 w-4.5 text-health-textMuted animate-spin" />
                    </div>
                  ) : notes.length === 0 ? (
                    <p className="text-xxs text-health-textMuted py-4 text-center italic font-light">No doctor logs recorded yet.</p>
                  ) : (
                    notes.map((note: any) => (
                      <div key={note.id} className="p-3.5 rounded-xl bg-white/5 border border-white/5 space-y-1.5 text-xxs font-light">
                        <p className="text-white/95 leading-relaxed">{note.note}</p>
                        <div className="flex justify-between items-center text-[10px] text-health-textMuted">
                          <span>By Dr. {note.doctor?.profile?.lastName || 'Vance'}</span>
                          <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

          </div>
        )}
      </div>

    </div>
  );
}
