import React, { useEffect, useState, useRef } from 'react';

export default function CustomCursor() {
  const [isVisible, setIsVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(true); // Default to true to prevent hydration mismatch / mobile lag

  const mousePos = useRef({ x: -100, y: -100 });
  const followerPos = useRef({ x: -100, y: -100 });
  const isHoveredRef = useRef(false);
  
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const animFrameId = useRef<number | null>(null);

  useEffect(() => {
    // 1. Immediately disable on touch, mobile screens, or Capacitor native platform
    const isCapacitor = typeof window !== 'undefined' && Boolean((window as any).Capacitor?.isNativePlatform?.());
    const isTouch = isCapacitor || window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 1024;
    
    if (isTouch) {
      setIsMobile(true);
      return;
    }
    setIsMobile(false);

    const checkMobile = () => {
      const isTouchNow = Boolean((window as any).Capacitor?.isNativePlatform?.()) || 
        window.matchMedia('(pointer: coarse)').matches || 
        window.innerWidth < 1024;
      setIsMobile(isTouchNow);
    };

    window.addEventListener('resize', checkMobile, { passive: true });

    const handleMouseMove = (e: MouseEvent) => {
      mousePos.current = { x: e.clientX, y: e.clientY };
      if (!isVisible) setIsVisible(true);

      const target = e.target as HTMLElement | null;
      if (target) {
        const isInteractive = Boolean(
          target.closest('button, a, input, select, textarea, [role="button"], [data-hover="true"], .cursor-pointer')
        );
        isHoveredRef.current = isInteractive;
      }
    };

    const handleMouseLeave = () => {
      setIsVisible(false);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave, { passive: true });

    const render = () => {
      const ease = 0.18;
      followerPos.current.x += (mousePos.current.x - followerPos.current.x) * ease;
      followerPos.current.y += (mousePos.current.y - followerPos.current.y) * ease;

      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${mousePos.current.x}px, ${mousePos.current.y}px, 0) translate(-50%, -50%)`;
      }

      if (ringRef.current) {
        const scale = isHoveredRef.current ? 1.6 : 1;
        ringRef.current.style.transform = `translate3d(${followerPos.current.x}px, ${followerPos.current.y}px, 0) translate(-50%, -50%) scale(${scale})`;
      }

      animFrameId.current = requestAnimationFrame(render);
    };

    animFrameId.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
    };
  }, []); // Run ONCE on mount

  if (isMobile || !isVisible) return null;

  return (
    <>
      {/* Inner glowing dot */}
      <div
        ref={dotRef}
        className="fixed top-0 left-0 w-2.5 h-2.5 bg-blue-500 rounded-full pointer-events-none z-[9999] shadow-[0_0_10px_#3b82f6]"
        style={{ willChange: 'transform' }}
      />

      {/* Smooth follower ring */}
      <div
        ref={ringRef}
        className="fixed top-0 left-0 w-9 h-9 rounded-full pointer-events-none z-[9998] transition-[border-color,background-color] duration-200 ease-out border border-blue-500/40 bg-blue-500/5 shadow-[0_0_12px_rgba(59,130,246,0.15)]"
        style={{ willChange: 'transform' }}
      />
    </>
  );
}
