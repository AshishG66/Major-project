import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, ShieldAlert, CheckCircle, Loader2, RefreshCw } from 'lucide-react';
import { api } from '../services/api';

interface AISummaryData {
  greeting: string;
  summary: string[];
  badge: string;
  alert: boolean;
  source: 'gemini' | 'fallback';
}

export default function AIHealthAssistant() {
  const [isOpen, setIsOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AISummaryData | null>(null);

  const fetchSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/ai-summary');
      setData({
        greeting: res.greeting || 'Hello Patient',
        summary: res.summary || [],
        badge: res.badge || 'Unscanned',
        alert: res.alert || false,
        source: res.source || 'fallback',
      });
    } catch (err: any) {
      setError('Could not load AI summary');
      console.error('AI Summary fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const badgeColor = data?.alert
    ? (data.badge || '').includes('High')
      ? 'border-health-rose text-health-rose bg-health-rose/10'
      : 'border-health-amber text-health-amber bg-health-amber/10'
    : 'border-health-emerald text-health-emerald bg-health-emerald/10';

  return (
    <div className="fixed bottom-6 right-6 z-40 max-w-xs w-full pointer-events-auto">
      <AnimatePresence>
        {!isOpen ? (
          <motion.button
            key="chat-trigger"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            onClick={() => setIsOpen(true)}
            className="ml-auto flex items-center justify-center h-12 w-12 rounded-full bg-gradient-to-r from-health-blue to-health-cyan text-white shadow-glow hover:scale-[1.08] transition-transform duration-200 border border-white/10"
          >
            <Sparkles className="h-5 w-5 animate-pulse" />
          </motion.button>
        ) : (
          <motion.div
            key="assistant-card"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="glass-panel-glow p-5 rounded-2xl border-white/10 relative overflow-hidden bg-gradient-to-br from-health-dark/95 via-health-card/95 to-black/90 shadow-2xl"
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-3.5 border-b border-white/5 pb-2.5">
              <div className="flex items-center space-x-2">
                <div className="h-6 w-6 rounded-lg bg-health-blue/15 flex items-center justify-center text-health-blue">
                  <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                </div>
                <span className="font-display font-extrabold text-xs tracking-wider text-white">🤖 HridyaAI</span>
                {data?.source === 'gemini' && (
                  <span className="text-[7px] bg-health-blue/15 text-health-blue border border-health-blue/30 px-1.5 py-0.5 rounded-full font-bold uppercase">Gemini</span>
                )}
              </div>

              <div className="flex items-center space-x-1.5">
                <button
                  onClick={fetchSummary}
                  disabled={loading}
                  className="text-health-textMuted hover:text-white transition-colors disabled:opacity-30"
                  title="Refresh AI Summary"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-health-textMuted hover:text-white transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Content */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-6 space-y-2">
                <Loader2 className="h-6 w-6 text-health-cyan animate-spin" />
                <span className="text-[9px] text-health-textMuted uppercase font-bold tracking-wider">Generating AI insights...</span>
              </div>
            ) : error ? (
              <div className="py-4 text-center">
                <p className="text-[10px] text-health-rose mb-2">{error}</p>
                <button
                  onClick={fetchSummary}
                  className="text-[9px] text-health-cyan font-bold hover:underline"
                >
                  Retry
                </button>
              </div>
            ) : data ? (
              <>
                {/* Greeting */}
                <div className="space-y-1 mb-3">
                  <h4 className="text-xs font-bold text-white/95">{data.greeting}</h4>
                  <div className={`inline-block px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${badgeColor}`}>
                    {data.badge}
                  </div>
                </div>

                {/* Summary list */}
                <div className="space-y-2 mb-4 bg-white/5 border border-white/5 p-3.5 rounded-xl">
                  <div className="text-[9px] uppercase font-bold text-health-textMuted tracking-wider mb-1.5">
                    Today's Health Summary
                  </div>
                  {(data.summary || []).map((pt, idx) => (
                    <p key={idx} className="text-[10px] text-white/85 font-light leading-relaxed">
                      {pt}
                    </p>
                  ))}
                </div>
              </>
            ) : null}

            {/* Footer */}
            <div className="flex items-center justify-between text-[9px] text-health-textMuted">
              <span className="flex items-center space-x-1">
                {data?.alert ? (
                  <ShieldAlert className="h-3 w-3 text-health-rose" />
                ) : (
                  <CheckCircle className="h-3 w-3 text-health-emerald" />
                )}
                <span>{data?.source === 'gemini' ? 'Powered by Gemini AI' : 'Data-driven evaluation'}</span>
              </span>

              <button
                onClick={() => setIsOpen(false)}
                className="font-bold text-health-cyan hover:underline"
              >
                Minimize panel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
