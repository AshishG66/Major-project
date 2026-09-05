import React from 'react';

/**
 * Lightweight clinical SaaS ambient background.
 * Features a clean white gradient, subtle animated mesh gradient,
 * soft floating blurred blobs, and minimal grid pattern.
 */
export default function ThreeBackground() {
  return (
    <div className="fixed inset-0 -z-20 pointer-events-none overflow-hidden bg-slate-50">
      {/* Soft Clinical Grid Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-60" />

      {/* Clean Light Gradient Overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at 20% 20%, rgba(59, 130, 246, 0.07) 0%, transparent 60%), radial-gradient(ellipse at 80% 70%, rgba(6, 182, 212, 0.05) 0%, transparent 60%)',
        }}
      />

      {/* Slow floating blurred blob - Top Left (Blue Accent) */}
      <div
        className="absolute w-[600px] h-[600px] rounded-full blur-[100px] opacity-40"
        style={{
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.12) 0%, rgba(59, 130, 246, 0) 70%)',
          top: '-15%',
          left: '-10%',
          animation: 'ambientDrift 22s ease-in-out infinite alternate',
        }}
      />

      {/* Slow floating blurred blob - Bottom Right (Cyan Accent) */}
      <div
        className="absolute w-[500px] h-[500px] rounded-full blur-[90px] opacity-30"
        style={{
          background: 'radial-gradient(circle, rgba(6, 182, 212, 0.1) 0%, rgba(6, 182, 212, 0) 70%)',
          bottom: '-12%',
          right: '-8%',
          animation: 'ambientDrift 28s ease-in-out infinite alternate-reverse',
        }}
      />

      {/* Center Soft Emerald Orb */}
      <div
        className="absolute w-[400px] h-[400px] rounded-full blur-[80px] opacity-25"
        style={{
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.08) 0%, transparent 70%)',
          top: '40%',
          left: '35%',
          animation: 'auroraMove 30s ease-in-out infinite alternate',
        }}
      />
    </div>
  );
}
