import React, { useEffect, useRef } from 'react';
import { DerivedECGParams, HeartRhythm } from '../../utils/cardiovascularSimulationEngine';

interface LiveECGCanvasProps {
  ecgParams: DerivedECGParams;
  heartRate: number;
  rhythm: HeartRhythm;
  isBeating?: boolean;
  height?: number;
}

export default function LiveECGCanvas({
  ecgParams,
  heartRate,
  rhythm,
  isBeating = true,
  height = 200,
}: LiveECGCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  // Buffer state for sweeping waveform
  const phaseRef = useRef<number>(0);
  const scanXRef = useRef<number>(0);
  const dataPointsRef = useRef<number[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize handling for high DPR display
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      dataPointsRef.current = new Array(Math.floor(rect.width)).fill(rect.height / 2);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // ECG Voltage Function V(phase) where phase goes from 0 to 1 per beat cycle
    const getECGVoltage = (p: number): number => {
      // p in [0, 1)
      if (rhythm === 'VENTRICULAR_FIBRILLATION') {
        // Chaotic sinusoidal oscillation
        const t = Date.now() / 100;
        return (Math.sin(t * 1.7) * 0.4 + Math.sin(t * 3.1) * 0.3 + (Math.random() - 0.5) * 0.4);
      }

      if (rhythm === 'VENTRICULAR_TACHYCARDIA') {
        // Smooth fast sinusoidal wave
        return Math.sin(p * Math.PI * 2) * 1.2;
      }

      let voltage = 0;

      // Atrial Fibrillation baseline ripple
      if (rhythm === 'ATRIAL_FIBRILLATION') {
        voltage += Math.sin(p * Math.PI * 40) * 0.08 + (Math.random() - 0.5) * 0.06;
      } else {
        // P Wave (Phase ~ 0.10 to 0.22)
        if (p >= 0.10 && p <= 0.22) {
          const pCenter = 0.16;
          const pWidth = 0.06;
          const dist = (p - pCenter) / pWidth;
          voltage += 0.18 * Math.exp(-dist * dist * 4);
        }
      }

      // QRS Complex (Phase ~ 0.35 to 0.48, adjusted by QRS duration)
      const qrsCenter = 0.40;
      const qrsWidthFactor = (ecgParams.qrsDurationMs / 100);

      // Q Dip
      const qStart = qrsCenter - 0.03 * qrsWidthFactor;
      if (p >= qStart && p < qrsCenter - 0.01 * qrsWidthFactor) {
        voltage -= 0.15;
      }

      // R Spike
      const rStart = qrsCenter - 0.015 * qrsWidthFactor;
      const rEnd = qrsCenter + 0.015 * qrsWidthFactor;
      if (p >= rStart && p <= rEnd) {
        const dist = (p - qrsCenter) / (0.015 * qrsWidthFactor);
        voltage += 1.4 * (1 - Math.abs(dist));
      }

      // S Dip
      const sEnd = qrsCenter + 0.04 * qrsWidthFactor;
      if (p > rEnd && p <= sEnd) {
        voltage -= 0.25;
      }

      // ST Segment (Phase ~ 0.48 to 0.58)
      if (p > sEnd && p < 0.58) {
        voltage += ecgParams.stElevationMv;
      }

      // T Wave (Phase ~ 0.58 to 0.82)
      if (p >= 0.58 && p <= 0.82) {
        const tCenter = 0.70;
        const tWidth = 0.10;
        const dist = (p - tCenter) / tWidth;
        voltage += ecgParams.tWaveHeightMv * Math.exp(-dist * dist * 3.5);
      }

      // U Wave (Hypokalemia)
      if (ecgParams.uWavePresent && p >= 0.84 && p <= 0.94) {
        const uCenter = 0.89;
        const dist = (p - uCenter) / 0.05;
        voltage += 0.12 * Math.exp(-dist * dist * 4);
      }

      // PVC ectopic beat every ~4 beats if rhythm === PVC
      if (rhythm === 'PVC' && Math.floor(Date.now() / (60000 / heartRate)) % 4 === 0) {
        if (p >= 0.30 && p <= 0.55) {
          voltage = Math.sin((p - 0.30) / 0.25 * Math.PI) * 1.8 * (p > 0.42 ? -1 : 1);
        }
      }

      // Baseline micro-jitter
      voltage += (Math.random() - 0.5) * 0.03;

      return voltage;
    };

    let lastTime = performance.now();

    const render = (time: number) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const canvasH = rect.height;
      const centerY = canvasH / 2;
      const scaleY = canvasH * 0.28; // Voltage to pixel scaling

      if (isBeating) {
        // Advance ECG phase based on heart rate
        const beatsPerSec = heartRate / 60;
        phaseRef.current = (phaseRef.current + beatsPerSec * dt) % 1;

        // Advance scanhead
        const pixelsPerSec = 160; // Sweep speed
        const prevX = scanXRef.current;
        const nextX = (prevX + pixelsPerSec * dt) % width;
        scanXRef.current = nextX;

        // Sample current voltage
        const v = getECGVoltage(phaseRef.current);
        const pixelY = centerY - v * scaleY;

        // Store into buffer
        const currIdx = Math.floor(nextX);
        if (dataPointsRef.current.length === Math.floor(width)) {
          dataPointsRef.current[currIdx] = pixelY;
          // Erase ahead sweep gap
          for (let g = 1; g <= 16; g++) {
            const gapIdx = (currIdx + g) % Math.floor(width);
            dataPointsRef.current[gapIdx] = centerY;
          }
        }
      }

      // --- DRAW CANVAS ---
      // Background grid
      ctx.fillStyle = '#05111e';
      ctx.fillRect(0, 0, width, canvasH);

      // Minor grid lines (1mm equivalent)
      ctx.lineWidth = 0.5;
      ctx.strokeStyle = '#0d2847';
      const gridSize = 12;
      ctx.beginPath();
      for (let x = 0; x < width; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvasH);
      }
      for (let y = 0; y < canvasH; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      // Major grid lines (5mm equivalent)
      ctx.lineWidth = 1.0;
      ctx.strokeStyle = '#163d6b';
      ctx.beginPath();
      for (let x = 0; x < width; x += gridSize * 5) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvasH);
      }
      for (let y = 0; y < canvasH; y += gridSize * 5) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      // Draw Waveform Line
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = '#10b981';
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = 8;

      ctx.beginPath();
      let isDrawing = false;

      const points = dataPointsRef.current;
      const scanHead = Math.floor(scanXRef.current);

      for (let x = 0; x < points.length; x++) {
        // Skip gap right around scan head
        if (Math.abs(x - scanHead) < 12) {
          isDrawing = false;
          continue;
        }

        const y = points[x] || centerY;
        if (!isDrawing) {
          ctx.moveTo(x, y);
          isDrawing = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
      ctx.shadowBlur = 0; // reset shadow

      // Draw Scanhead Blip
      ctx.fillStyle = '#34d399';
      ctx.beginPath();
      ctx.arc(scanHead, points[scanHead] || centerY, 4, 0, Math.PI * 2);
      ctx.fill();

      animFrameIdRef.current = requestAnimationFrame(render);
    };

    animFrameIdRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [ecgParams, heartRate, rhythm, isBeating]);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-[#1e3a5f] bg-[#05111e] shadow-inner">
      {/* Header Overlay Badges */}
      <div className="absolute top-3 left-4 right-4 z-10 flex items-center justify-between pointer-events-none">
        <div className="flex items-center space-x-2 bg-[#0a1f36]/80 backdrop-blur border border-[#1e3a5f] px-3 py-1 rounded-lg">
          <span className="h-2 w-2 rounded-full bg-[#10b981] animate-ping" />
          <span className="font-mono-data text-xs font-bold text-[#10b981] uppercase tracking-wider">
            LEAD II • LIVE ECG 25mm/s
          </span>
        </div>

        <div className="flex items-center space-x-3 bg-[#0a1f36]/80 backdrop-blur border border-[#1e3a5f] px-3 py-1 rounded-lg text-xs font-mono-data text-[#94a3b8]">
          <span>PR: <strong className="text-white">{ecgParams.prIntervalMs} ms</strong></span>
          <span>QRS: <strong className="text-white">{ecgParams.qrsDurationMs} ms</strong></span>
          <span>QTc: <strong className="text-white">{ecgParams.qtcIntervalMs} ms</strong></span>
          <span>ST: <strong className={ecgParams.stElevationMv !== 0 ? 'text-amber-400' : 'text-white'}>
            {ecgParams.stElevationMv > 0 ? `+${ecgParams.stElevationMv}` : ecgParams.stElevationMv} mV
          </strong></span>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: `${height}px` }}
        className="block"
      />

      {/* Rhythm Name Banner Footer */}
      <div className="bg-[#08182b] border-t border-[#1e3a5f] px-4 py-2 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2">
          <span className="font-mono-data text-[11px] text-[#64748b] uppercase font-semibold">Diagnosis:</span>
          <span className="font-geist font-bold text-emerald-400 tracking-wide">{ecgParams.rhythmTitle}</span>
        </div>
        <p className="text-[11px] text-[#94a3b8] italic truncate max-w-md">{ecgParams.description}</p>
      </div>
    </div>
  );
}
