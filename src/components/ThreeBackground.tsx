import React from 'react';

/**
 * Lightweight, GPU-accelerated clinical SaaS ambient background.
 * Uses isolated hardware-composited planes and gentle radial gradients
 * to ensure zero frame drops during desktop vertical scrolling.
 */
export default function ThreeBackground() {
  return (
    <div
      className="fixed inset-0 -z-20 pointer-events-none overflow-hidden bg-slate-50"
      style={{ transform: 'translateZ(0)', contain: 'strict' }}
    >
      {/* Soft Clinical Grid Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-50" />

      {/* Clean Light Gradient Overlay */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 20% 20%, rgba(59, 130, 246, 0.07) 0%, transparent 60%), radial-gradient(ellipse at 80% 70%, rgba(6, 182, 212, 0.05) 0%, transparent 60%)',
        }}
      />

      {/* Floating blurred blob - Top Left (Blue Accent) - Hardware Composited */}
      <div
        className="absolute w-[520px] h-[520px] rounded-full blur-3xl opacity-35"
        style={{
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.14) 0%, rgba(59, 130, 246, 0) 70%)',
          top: '-12%',
          left: '-8%',
          transform: 'translateZ(0)',
          willChange: 'transform',
          animation: 'ambientDrift 22s ease-in-out infinite alternate',
        }}
      />

      {/* Floating blurred blob - Bottom Right (Cyan Accent) - Hardware Composited */}
      <div
        className="absolute w-[460px] h-[460px] rounded-full blur-3xl opacity-25"
        style={{
          background: 'radial-gradient(circle, rgba(6, 182, 212, 0.12) 0%, rgba(6, 182, 212, 0) 70%)',
          bottom: '-10%',
          right: '-6%',
          transform: 'translateZ(0)',
          willChange: 'transform',
          animation: 'ambientDrift 28s ease-in-out infinite alternate-reverse',
        }}
      />

      {/* Center Soft Emerald Orb - Hardware Composited */}
      <div
        className="absolute w-[360px] h-[360px] rounded-full blur-3xl opacity-20"
        style={{
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.08) 0%, transparent 70%)',
          top: '40%',
          left: '35%',
          transform: 'translateZ(0)',
          willChange: 'transform',
          animation: 'auroraMove 30s ease-in-out infinite alternate',
        }}
      />
    </div>
  );
}
