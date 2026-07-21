import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Clipboard, User, Plus, Clock, Loader2 } from 'lucide-react';
import { api } from '../services/api';

interface DoctorTabProps {
  dash: any;
}

export default function DoctorTab({ dash }: DoctorTabProps) {
  const queryClient = useQueryClient();
  const [familyModalOpen, setFamilyModalOpen] = useState(false);
  const [familyForm, setFamilyForm] = useState({
    name: '',
    relationship: 'SPOUSE',
    email: '',
  });

  // Fetch patient notes only when Tab is mounted
  const { data: notesRes, isLoading: notesLoading } = useQuery({
    queryKey: ['patientNotes', dash?.user?.id],
    queryFn: () => api.get(`/doctor/notes/${dash?.user?.id}`),
    enabled: !!dash?.user?.id,
    refetchOnWindowFocus: false,
    staleTime: 3 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });

  // Fetch care circle family members only when Tab is mounted
  const { data: familyRes, isLoading: familyLoading } = useQuery({
    queryKey: ['familyList'],
    queryFn: () => api.get('/family'),
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const familyMutation = useMutation({
    mutationFn: (body: typeof familyForm) => api.post('/family', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['familyList'] });
      setFamilyModalOpen(false);
      setFamilyForm({ name: '', relationship: 'SPOUSE', email: '' });
    }
  });

  const handleFamilySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    familyMutation.mutate(familyForm);
  };

  const notes = notesRes?.notes || [];
  const family = familyRes?.members || [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Doctor's Care Notes & Plans */}
        <div className="lg:col-span-6 glass-panel p-6 rounded-2xl h-[330px] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
              <h4 className="font-display font-bold text-xs uppercase tracking-wider text-health-textMuted flex items-center gap-1.5">
                <Clipboard className="h-4 w-4 text-health-cyan" />
                <span>Doctor Clinical Recommendations</span>
              </h4>
              <span className="text-[8px] bg-health-cyan/15 text-health-cyan border border-health-cyan/30 px-2 py-0.5 rounded-full font-bold">CARE LOG</span>
            </div>

            <div className="overflow-y-auto max-h-[220px] space-y-3.5 pr-1 scrollbar-thin">
              {notesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-5 w-5 text-health-cyan animate-spin" />
                </div>
              ) : notes.length === 0 ? (
                <div className="text-center py-12 text-xxs text-health-textMuted italic">
                  No physician instructions or RAG clinical recommendations logged yet.
                </div>
              ) : (
                notes.map((n: any) => (
                  <div key={n.id} className="p-3 bg-white/5 border border-white/5 rounded-xl space-y-2">
                    <p className="text-xs font-light leading-relaxed text-white/95">
                      "{n.note}"
                    </p>
                    <div className="flex justify-between items-center text-[8px] text-health-textMuted font-bold uppercase">
                      <span>Dr. {n.doctor?.profile?.lastName || 'Vance'}, MD</span>
                      <span>{new Date(n.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Family & Care Circle List */}
        <div className="lg:col-span-3 glass-panel p-6 rounded-2xl h-[330px] flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-3">
              <h4 className="font-display font-bold text-xs uppercase tracking-wider text-health-textMuted flex items-center gap-1.5">
                <User className="h-4 w-4 text-health-emerald" />
                <span>Care Circle ({family.length})</span>
              </h4>
              <button onClick={() => setFamilyModalOpen(true)} className="text-[10px] font-bold text-health-cyan hover:underline flex items-center space-x-0.5">
                <Plus className="h-3.5 w-3.5" />
                <span>Link</span>
              </button>
            </div>

            <div className="overflow-y-auto max-h-[220px] space-y-2 pr-1 scrollbar-thin">
              {familyLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-5 w-5 text-health-emerald animate-spin" />
                </div>
              ) : family.length === 0 ? (
                <p className="text-xxs text-health-textMuted italic text-center py-12">No linked family profiles.</p>
              ) : (
                family.map((member: any) => {
                  const latestPred = member.linkedUser?.predictions?.[0];
                  const riskLvl = latestPred?.riskLevel || 'LOW';
                  return (
                    <div key={member.id} className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex justify-between items-center text-xs">
                      <div>
                        <p className="font-bold text-white/95">{member.name}</p>
                        <p className="text-[8px] text-health-textMuted font-semibold uppercase">{member.relationship}</p>
                      </div>
                      <span className={`text-[8px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        riskLvl === 'HIGH' ? 'bg-health-rose/15 text-health-rose border border-health-rose/30' :
                        riskLvl === 'MODERATE' ? 'bg-health-amber/15 text-health-amber border border-health-amber/30' :
                        'bg-health-emerald/15 text-health-emerald border border-health-emerald/30'
                      }`}>
                        {riskLvl}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Appointments Calendar Mock */}
        <div className="lg:col-span-3 glass-panel p-6 rounded-2xl h-[330px] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
              <h4 className="font-display font-bold text-xs uppercase tracking-wider text-health-textMuted flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-health-violet" />
                <span>Clinician Schedule</span>
              </h4>
              <span className="text-[8px] bg-health-violet/15 text-health-violet border border-health-violet/30 px-2 py-0.5 rounded-full font-bold">CALENDAR</span>
            </div>

            <div className="space-y-2.5">
              {[
                { date: 'Mon 19', time: '09:30 AM', desc: 'Cardiology Tele-Consult', type: 'ICU Review' },
                { date: 'Wed 21', time: '11:00 AM', desc: 'Follow-up ECG Audit', type: 'ECG Check' },
                { date: 'Fri 23', time: '02:15 PM', desc: 'Dietary Compliance Sync', type: 'Dietary Audit' }
              ].map((apt, idx) => (
                <div key={idx} className="flex space-x-3 items-center p-2.5 rounded-xl bg-white/5 border border-white/5 text-[10px]">
                  <div className="px-2 py-1 bg-health-violet/15 text-health-violet rounded text-center font-bold text-[8.5px] uppercase shrink-0 leading-tight">
                    {apt.date.split(' ')[0]}<br/>
                    <span className="text-[10px]">{apt.date.split(' ')[1]}</span>
                  </div>
                  <div className="overflow-hidden">
                    <p className="font-semibold text-white/95 truncate">{apt.desc}</p>
                    <p className="text-[8px] text-health-textMuted">{apt.time} • {apt.type}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Link Care Member Modal */}
      <AnimatePresence>
        {familyModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }} onClick={() => setFamilyModalOpen(false)} className="absolute inset-0 bg-black" />
            <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }} className="w-full max-w-md glass-panel-glow p-6 rounded-2xl border-white/10 relative z-10">
              <h3 className="font-display font-bold text-base mb-4 border-b border-white/5 pb-3">Link Care Circle Member</h3>
              <form onSubmit={handleFamilySubmit} className="space-y-4">
                <div>
                  <label className="block text-xxs font-medium text-health-textMuted mb-1">Full Name</label>
                  <input type="text" name="name" value={familyForm.name} onChange={(e) => setFamilyForm({ ...familyForm, name: e.target.value })} placeholder="e.g. Priya Patel" className="w-full px-3 py-2 text-xs glass-input" required />
                </div>
                <div>
                  <label className="block text-xxs font-medium text-health-textMuted mb-1">Relationship</label>
                  <select name="relationship" value={familyForm.relationship} onChange={(e) => setFamilyForm({ ...familyForm, relationship: e.target.value })} className="w-full px-3 py-2 text-xs bg-health-dark border border-white/10 rounded-xl focus:outline-none" required>
                    <option value="SPOUSE">Spouse</option>
                    <option value="FATHER">Father</option>
                    <option value="MOTHER">Mother</option>
                    <option value="CHILD">Child</option>
                    <option value="OTHER">Other Care Member</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xxs font-medium text-health-textMuted mb-1">Email Address</label>
                  <input type="email" name="email" value={familyForm.email} onChange={(e) => setFamilyForm({ ...familyForm, email: e.target.value })} placeholder="priya@demo.com" className="w-full px-3 py-2 text-xs glass-input" required />
                </div>
                <div className="flex space-x-3 pt-3">
                  <button type="button" onClick={() => setFamilyModalOpen(false)} className="flex-1 py-2 text-xs border border-white/5 bg-white/5 rounded-xl">Cancel</button>
                  <button type="submit" disabled={familyMutation.isPending} className="flex-1 py-2 text-xs font-semibold bg-gradient-to-r from-health-blue to-health-cyan rounded-xl hover:shadow-glow flex items-center justify-center">
                    {familyMutation.isPending ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <span>Link Profile</span>}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
