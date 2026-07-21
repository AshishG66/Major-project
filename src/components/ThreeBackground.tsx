import React from 'react';

/**
 * Lightweight ambient background using pure CSS gradients and animations.
 * Replaces the heavy Three.js canvas (particles + DNA + heartbeat light)
 * to eliminate GPU overhead and improve frame rates across all pages.
 */
export default function ThreeBackground() {
  return (
    <div className="fixed inset-0 -z-20 pointer-events-none overflow-hidden">
      {/* Subtle radial gradient glow */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at 30% 20%, rgba(59, 130, 246, 0.04) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(244, 63, 94, 0.03) 0%, transparent 60%)',
        }}
      />
      {/* Slow drifting ambient orb - top left */}
      <div
        className="absolute w-[500px] h-[500px] rounded-full opacity-[0.025]"
        style={{
          background: 'radial-gradient(circle, #3b82f6, transparent 70%)',
          top: '-10%',
          left: '-5%',
          animation: 'ambientDrift 25s ease-in-out infinite alternate',
        }}
      />
      {/* Slow drifting ambient orb - bottom right */}
      <div
        className="absolute w-[400px] h-[400px] rounded-full opacity-[0.02]"
        style={{
          background: 'radial-gradient(circle, #f43f5e, transparent 70%)',
          bottom: '-8%',
          right: '-3%',
          animation: 'ambientDrift 30s ease-in-out infinite alternate-reverse',
        }}
      />
    </div>
  );
}
