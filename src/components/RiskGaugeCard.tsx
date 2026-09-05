import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2, ShieldCheck, AlertTriangle, ShieldAlert, Activity, Info } from 'lucide-react';

interface RiskGaugeCardProps {
  dashLoading: boolean;
  simulatedScore: number;   // 0–100 risk probability %
  simulatedRisk: string;    // 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' | 'UNSCANNED'
  needleAngle?: number;     // legacy optional prop
}

const RISK_CONFIG = {
  LOW:       { label: 'LOW RISK',      color: '#10b981', bg: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-400', icon: ShieldCheck },
  MODERATE:  { label: 'MODERATE RISK', color: '#f59e0b', bg: 'bg-amber-500/10 text-amber-600 border-amber-500/30 dark:bg-amber-500/20 dark:text-amber-400',     icon: Activity },
  HIGH:      { label: 'HIGH RISK',     color: '#f97316', bg: 'bg-orange-500/10 text-orange-600 border-orange-500/30 dark:bg-orange-500/20 dark:text-orange-400', icon: AlertTriangle },
  CRITICAL:  { label: 'CRITICAL RISK', color: '#ef4444', bg: 'bg-rose-500/15 text-rose-600 border-rose-500/40 dark:bg-rose-500/25 dark:text-rose-400 animate-pulse', icon: ShieldAlert },
  UNSCANNED: { label: 'UNSCANNED',     color: '#94a3b8', bg: 'bg-slate-500/10 text-slate-500 border-slate-500/20 dark:bg-slate-500/20 dark:text-slate-400', icon: Activity },
};

const RiskGaugeCard = ({ dashLoading, simulatedScore, simulatedRisk }: RiskGaugeCardProps) => {
  const riskKey = (simulatedRisk || 'UNSCANNED').toUpperCase() as keyof typeof RISK_CONFIG;
  const config = RISK_CONFIG[riskKey] ?? RISK_CONFIG.UNSCANNED;
  const isUnscanned = riskKey === 'UNSCANNED';
  const clampedScore = Math.max(0, Math.min(100, simulatedScore));

  // Animated Count-Up Number (0% -> target score)
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    if (isUnscanned) {
      setDisplayScore(0);
      return;
    }
    let start = 0;
    const end = Math.round(clampedScore);
    const duration = 1200;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + (end - start) * easeOut);
      setDisplayScore(current);
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [clampedScore, isUnscanned]);

  // Target rotation angle from -90deg (0%) to +90deg (100%)
  const targetRotation = isUnscanned ? -90 : -90 + (clampedScore / 100) * 180;

  // Arc calculations for SVG semi-circle (R=85)
  const radius = 85;
  const circumference = Math.PI * radius; // ~267px arc length
  const activeOffset = circumference - (clampedScore / 100) * circumference;

  // Radial Ticks (11 markers)
  const ticks = Array.from({ length: 11 }, (_, i) => {
    const angleDeg = 180 + i * 18;
    const angleRad = (angleDeg * Math.PI) / 180;
    const x1 = 100 + 74 * Math.cos(angleRad);
    const y1 = 102 + 74 * Math.sin(angleRad);
    const x2 = 100 + 81 * Math.cos(angleRad);
    const y2 = 102 + 81 * Math.sin(angleRad);
    return { x1, y1, x2, y2, isMajor: i % 5 === 0 };
  });

  const IconComp = config.icon;

  return (
    <motion.div
      whileHover={{ y: -4, boxShadow: '0px 8px 30px rgba(0, 82, 204, 0.08)' }}
      transition={{ duration: 0.3 }}
      className="bg-white p-6 rounded-2xl flex flex-col justify-between relative overflow-hidden border border-[#c3c5d9] shadow-stitch min-h-[380px] group font-sans"
    >
      {/* Glass Reflection Accent */}
      <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-white/20 pointer-events-none" />

      {/* Glow highlight behind active risk color */}
      <div
        className="absolute -top-12 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full blur-3xl pointer-events-none transition-all duration-700 opacity-25"
        style={{ backgroundColor: config.color }}
      />

      {/* Card Header */}
      <div className="flex items-center justify-between border-b border-[#e5eeff] pb-3.5 z-10">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-[#eff4ff] text-[#0052ff] group-hover:scale-110 transition-transform">
            <Activity className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-geist font-bold uppercase tracking-wider text-[#0b1c30]">
              Risk Classification Centerpiece
            </h3>
            <p className="text-[10px] font-inter text-[#737688] font-normal">
              5 ML Ensemble Predictive Analytics
            </p>
          </div>
        </div>
        <span className="text-[9px] font-mono-data font-bold px-2.5 py-0.5 rounded-full bg-[#eff4ff] text-[#003ec7] border border-[#0052ff]/30 uppercase tracking-wider">
          LIVE TELEMETRY
        </span>
      </div>

      {/* Centerpiece Gauge Visualization Area */}
      <div className="relative w-full flex flex-col items-center justify-center my-auto py-2 z-10">
        {dashLoading ? (
          <div className="flex flex-col items-center justify-center h-56">
            <Loader2 className="h-9 w-9 text-[#0052ff] animate-spin mb-3" />
            <span className="text-xs font-inter text-[#737688] font-medium animate-pulse">Running Clinical Risk Scan...</span>
          </div>
        ) : (
          <>
            {/* SVG Arc Gauge */}
            <div className="relative w-full max-w-[300px] aspect-[2/1.2] flex items-center justify-center">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 200 120">
                <defs>
                  {/* Dynamic Multi-Color Arc Gradient */}
                  <linearGradient id="centerpieceArcGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="35%" stopColor="#f59e0b" />
                    <stop offset="70%" stopColor="#f97316" />
                    <stop offset="100%" stopColor="#ba1a1a" />
                  </linearGradient>

                  {/* Silver Metallic Needle Gradient */}
                  <linearGradient id="metallicNeedleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="50%" stopColor="#c3c5d9" />
                    <stop offset="100%" stopColor="#434656" />
                  </linearGradient>

                  {/* Active Segment Selective Glow Filter */}
                  <filter id="activeSegmentGlow" x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="6" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>

                  {/* Metallic Needle Drop Shadow */}
                  <filter id="needleShadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.3" />
                  </filter>
                </defs>

                {/* Base Track Arc */}
                <path
                  d="M 15 102 A 85 85 0 0 1 185 102"
                  fill="none"
                  stroke="#e5eeff"
                  strokeWidth="14"
                  strokeLinecap="round"
                />

                {/* Colored Arc Fills Left to Right on Load */}
                <motion.path
                  d="M 15 102 A 85 85 0 0 1 185 102"
                  fill="none"
                  stroke="url(#centerpieceArcGradient)"
                  strokeWidth="14"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset: isUnscanned ? circumference : activeOffset }}
                  transition={{ duration: 1.4, ease: [0.34, 1.56, 0.64, 1] }}
                  filter="url(#activeSegmentGlow)"
                />

                {/* Radial Ticks */}
                {ticks.map((t, idx) => (
                  <line
                    key={idx}
                    x1={t.x1}
                    y1={t.y1}
                    x2={t.x2}
                    y2={t.y2}
                    stroke={t.isMajor ? '#737688' : '#e5eeff'}
                    strokeWidth={t.isMajor ? 1.5 : 1}
                  />
                ))}

                {/* MODERATE Label Centered Above Apex */}
                <text x="100" y="8" fontSize="7" fill="#f59e0b" textAnchor="middle" fontWeight="700" letterSpacing="0.6">
                  MODERATE
                </text>

                {/* LOW & HIGH Labels Base Aligned */}
                <text x="15" y="118" fontSize="7" fill="#10b981" textAnchor="middle" fontWeight="700">
                  LOW
                </text>
                <text x="185" y="118" fontSize="7" fill="#ba1a1a" textAnchor="middle" fontWeight="700">
                  HIGH
                </text>

                {/* Metallic Thin Needle Pointer */}
                <motion.g
                  initial={{ rotate: -90 }}
                  animate={{ rotate: targetRotation }}
                  transition={{ duration: 1.4, ease: [0.34, 1.56, 0.64, 1] }}
                  style={{ transformOrigin: '100px 102px' }}
                  filter="url(#needleShadow)"
                >
                  {/* Needle Stem */}
                  <line
                    x1="100"
                    y1="102"
                    x2="100"
                    y2="24"
                    stroke="url(#metallicNeedleGradient)"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />
                  {/* Needle Tip Accent Line */}
                  <line
                    x1="100"
                    y1="24"
                    x2="100"
                    y2="18"
                    stroke={config.color}
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />
                </motion.g>

                {/* Metallic Hub Pivot Point */}
                <circle cx="100" cy="102" r="10" fill={config.color} opacity="0.25" className="animate-ping" />
                <circle cx="100" cy="102" r="7" fill="url(#metallicNeedleGradient)" stroke="#434656" strokeWidth="1" />
                <circle cx="100" cy="102" r="2.5" fill={config.color} />
              </svg>

              {/* Center Animated Score & Subtitle */}
              <div className="absolute top-[50%] left-1/2 -translate-x-1/2 flex flex-col items-center justify-center text-center">
                <div className="flex items-baseline space-x-0.5">
                  <span
                    className="text-5xl font-extrabold font-mono-data tracking-tight transition-colors duration-500 drop-shadow-sm"
                    style={{ color: isUnscanned ? '#737688' : config.color }}
                  >
                    {isUnscanned ? '—' : displayScore}
                  </span>
                  {!isUnscanned && (
                    <span className="text-2xl font-bold font-mono-data" style={{ color: config.color }}>
                      %
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-mono-data font-bold text-[#737688] uppercase tracking-widest -mt-1">
                  10-Yr CVD Risk Score
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Threshold Legend Bar */}
      <div className="z-10 bg-[#f8f9ff] p-2.5 rounded-xl border border-[#e5eeff] mb-3 flex items-center justify-between text-[10px] font-medium text-[#434656]">
        <div className="flex items-center space-x-1 font-geist font-semibold text-[#737688]">
          <Info className="h-3 w-3 text-[#0052ff]" />
          <span>Thresholds:</span>
        </div>
        <div className="flex items-center space-x-3 font-mono-data text-[9.5px]">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-[#10b981]" />
            Low &lt;35%
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-[#f59e0b]" />
            Mod 35-65%
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-[#ba1a1a]" />
            High &gt;65%
          </span>
        </div>
      </div>

      {/* Bottom Status Bar */}
      <div className="border-t border-[#e5eeff] pt-3 flex items-center justify-between z-10">
        <div className="flex items-center space-x-2 text-xs font-inter text-[#434656] font-medium">
          <IconComp className="h-4 w-4" style={{ color: config.color }} />
          <span>Assessed Status</span>
        </div>
        <div
          className={`px-3.5 py-1 rounded-full text-xs font-geist font-bold border transition-all duration-500 shadow-xs flex items-center space-x-1.5 ${config.bg}`}
        >
          <span>{dashLoading ? 'Evaluating...' : config.label}</span>
        </div>
      </div>
    </motion.div>
  );
};

export default React.memo(RiskGaugeCard, (prev, next) => {
  return (
    prev.dashLoading === next.dashLoading &&
    prev.simulatedScore === next.simulatedScore &&
    prev.simulatedRisk === next.simulatedRisk &&
    prev.needleAngle === next.needleAngle
  );
});
