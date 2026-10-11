import React, { useRef, useMemo, useEffect, useState, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment } from '@react-three/drei';
import { SkeletonUtils } from 'three-stdlib';
import * as THREE from 'three';
import { DigitalTwinSimulationState } from '../types/digitalTwin';
import { useDigitalTwinStore } from '../store/digitalTwinStore';

export interface DigitalTwinProps {
  simulationState?: DigitalTwinSimulationState | null;
  heartRate?: number;
  riskLevel?: 'LOW' | 'MODERATE' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string;
  riskScore?: number;
  systolicBP?: number;
  diastolicBP?: number;
  cholesterol?: number;
  bmi?: number;
  bloodSugar?: number;
  smoking?: boolean;
  age?: number;
  shapFactors?: Array<{ feature: string; impact: string; value?: any }>;
  glowIntensity?: number;
  onHoverPart?: (part: string | null) => void;
  onDebugInfo?: (info: any) => void;
  onBeatPulse?: (phase: number) => void;
}

// Preload the official GLB model (Preserved byte-for-byte)
useGLTF.preload('/beating-heart.glb');

// Risk Color & Visual State Mapping
const RISK_COLORS = {
  LOW: new THREE.Color('#10b981'),        // Healthy Emerald Green
  MODERATE: new THREE.Color('#f59e0b'),   // Amber / Stressed
  MEDIUM: new THREE.Color('#f59e0b'),     // Amber / Stressed
  HIGH: new THREE.Color('#f97316'),       // Deep Orange / High Risk
  CRITICAL: new THREE.Color('#ef4444'),   // Emergency Crimson Red
};

const AURA_COLORS = {
  LOW: '#10b981',
  MODERATE: '#f59e0b',
  MEDIUM: '#f59e0b',
  HIGH: '#f97316',
  CRITICAL: '#ef4444',
};

// Dynamic Camera & OrbitControls Auto-Fitter
function DynamicCameraAndControlsFitter({ modelSphereRadius }: { modelSphereRadius: number }) {
  const { camera, size: canvasSize } = useThree();
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    if (modelSphereRadius <= 0) return;
    const perspCam = camera as THREE.PerspectiveCamera;
    const fovRad = (perspCam.fov * Math.PI) / 360;
    const aspect = canvasSize.width / Math.max(canvasSize.height, 1);
    const fovH = 2 * Math.atan(Math.tan(fovRad) * aspect);
    const minHalfFov = Math.min(fovRad, fovH / 2);

    // Dynamic camera distance formula for exact ~90% panel occupation (prominent centerpiece)
    const fillFactor = 0.90;
    const dist = modelSphereRadius / (Math.sin(minHalfFov) * fillFactor);

    perspCam.position.set(0, 0, dist);
    perspCam.near = Math.max(0.001, dist * 0.01);
    perspCam.far = dist * 30.0;
    perspCam.updateProjectionMatrix();

    if (controlsRef.current) {
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.minDistance = dist * 0.35;
      controlsRef.current.maxDistance = dist * 2.5;
      controlsRef.current.update();
    }
  }, [camera, canvasSize, modelSphereRadius]);

  return (
    <OrbitControls
      ref={controlsRef}
      enableZoom={false}
      enablePan={false}
      enableDamping={true}
      dampingFactor={0.05}
      minPolarAngle={Math.PI / 6}
      maxPolarAngle={(Math.PI * 5) / 6}
      autoRotate={false}
      target={[0, 0, 0]}
    />
  );
}

// Realistic 3D Arterial Blood Flow Particles System with FlowMode response
function BloodFlowParticles({
  radius,
  heartRate,
  flowMode = 'NORMAL',
}: {
  radius: number;
  heartRate: number;
  flowMode?: 'NORMAL' | 'REDUCED' | 'TURBULENT';
}) {
  const particlesRef = useRef<THREE.Points>(null);
  const isMobile = useMemo(() => {
    return typeof window !== 'undefined' && (window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 768);
  }, []);
  const particleCount = isMobile ? 25 : (flowMode === 'REDUCED' ? 32 : 45);

  const [positions, speedOffsets] = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const speeds = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2.0;
      const height = (Math.random() - 0.5) * radius * 1.5;
      const r = radius * 0.38 + (Math.random() - 0.5) * radius * 0.25;

      pos[i * 3] = Math.cos(angle) * r;
      pos[i * 3 + 1] = height;
      pos[i * 3 + 2] = Math.sin(angle) * r;

      speeds[i] = 0.4 + Math.random() * 0.8;
    }
    return [pos, speeds];
  }, [radius, particleCount]);

  useFrame((state, delta) => {
    if (!particlesRef.current) return;
    const t = state.clock.getElapsedTime();
    // Flow speed scales with heartRate and drops significantly under REDUCED flowMode
    const baseSpeed = flowMode === 'REDUCED' ? 0.045 : 0.12;
    const speedFactor = (heartRate / 60) * 0.75;
    const posAttr = particlesRef.current.geometry.attributes.position as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;

    for (let i = 0; i < particleCount; i++) {
      const spd = speedOffsets[i] * speedFactor;
      arr[i * 3 + 1] += spd * delta * baseSpeed;
      if (arr[i * 3 + 1] > radius * 0.75) {
        arr[i * 3 + 1] = -radius * 0.75;
      }

      const angle = t * spd * 1.1 + i;
      const r = radius * 0.38 + Math.sin(t * 2 + i) * 0.04;
      arr[i * 3] = Math.cos(angle) * r;
      arr[i * 3 + 2] = Math.sin(angle) * r;
    }
    posAttr.needsUpdate = true;
  });

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={radius * 0.04}
        color={flowMode === 'REDUCED' ? '#f59e0b' : '#ef4444'}
        transparent
        opacity={flowMode === 'REDUCED' ? 0.45 : 0.65}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

// Localized 3D Coronary Perfusion Ring Marker
function LocalizedCoronaryPerfusionMarker({ radius }: { radius: number }) {
  const ringRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (ringRef.current) {
      const pulse = 1.0 + Math.sin(t * 5.0) * 0.15;
      ringRef.current.scale.set(pulse, pulse, pulse);
    }
    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshBasicMaterial;
      if (mat) {
        mat.opacity = 0.25 + Math.sin(t * 5.0) * 0.15;
      }
    }
  });

  return (
    <group position={[radius * 0.14, -radius * 0.04, radius * 0.42]}>
      {/* Subtle pulsing vascular alert ring */}
      <mesh ref={ringRef} rotation={[Math.PI / 4, 0, 0]}>
        <ringGeometry args={[radius * 0.07, radius * 0.11, 32]} />
        <meshBasicMaterial
          color="#f59e0b"
          transparent
          opacity={0.75}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      {/* Localized glow sphere */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[radius * 0.09, 16, 16]} />
        <meshBasicMaterial
          color="#f59e0b"
          transparent
          opacity={0.3}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

// Official GLB Digital Twin Heart Component with Skeletal Animation & BPM Sync
function OfficialGlbDigitalTwinHeart({
  simulationState,
  heartRate = 72,
  riskLevel = 'LOW',
  riskScore = 20,
  systolicBP = 120,
  cholesterol = 190,
  bmi = 24.5,
  smoking = false,
  onHoverPart,
  onDebugInfo,
  onBeatPulse,
  onSphereRadiusComputed,
}: DigitalTwinProps & { onSphereRadiusComputed: (r: number) => void }) {
  const groupRef = useRef<THREE.Group>(null);
  const auraRef = useRef<THREE.Mesh>(null);
  const pulseRingRef = useRef<THREE.Mesh>(null);

  // Preserve existing GLB model
  const { scene, animations } = useGLTF('/beating-heart.glb');
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);

  // Normalize risk category
  const normalizedRisk = useMemo(() => {
    if (simulationState) {
      if (simulationState.severity === 'CRITICAL') return 'CRITICAL';
      if (simulationState.severity === 'HIGH') return 'HIGH';
      if (simulationState.severity === 'MODERATE') return 'MODERATE';
      return 'LOW';
    }
    const r = (riskLevel || '').toUpperCase();
    if (r.includes('CRIT') || riskScore >= 85 || systolicBP >= 165) return 'CRITICAL';
    if (r.includes('HIGH') || riskScore >= 65 || systolicBP >= 140) return 'HIGH';
    if (r.includes('MOD') || r.includes('MED') || riskScore >= 35 || systolicBP >= 130) return 'MODERATE';
    return 'LOW';
  }, [simulationState, riskLevel, riskScore, systolicBP]);

  // Check reduced motion preference
  const prefersReducedMotion = useMemo(() => {
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      return false;
    }
  }, []);

  const materialsRef = useRef<THREE.MeshStandardMaterial[]>([]);
  const coronaryMaterialsRef = useRef<THREE.MeshStandardMaterial[]>([]);
  const targetColorRef = useRef<THREE.Color>(RISK_COLORS[normalizedRisk]);
  const currentColorRef = useRef<THREE.Color>(RISK_COLORS[normalizedRisk].clone());

  // Inspect GLB, Clone Skeleton using SkeletonUtils, Compute BoundingBox & BoundingSphere, Auto-Center at (0,0,0)
  const { clonedScene, boundingSphereRadius, debugReport } = useMemo(() => {
    const cloned = SkeletonUtils.clone(scene) as THREE.Group;
    const mats: THREE.MeshStandardMaterial[] = [];
    const coronaryMats: THREE.MeshStandardMaterial[] = [];

    // Anatomical Color Mapping Table
    const ANATOMICAL_MAP: Record<string, string> = {
      atrium_l: '#DC2626', // Left Atrium: Soft Crimson
      atrium_r: '#FB7185', // Right Atrium: Rose
      ventricle_l: '#B91C1C', // Left Ventricle: Deep Red
      ventricle_r: '#EF4444', // Right Ventricle: Light Red
      aorta: '#F87171', // Aorta: Bright Red
      pulmonary_art: '#3B82F6', // Pulmonary Artery: Blue
      pulmonary_vein: '#F472B6', // Pulmonary Veins: Pink
      vena_cava: '#2563EB', // Vena Cava: Blue
      coronary: '#F59E0B', // Coronary Arteries: Golden
      valve: '#FEF3C7', // Heart Valves: Ivory
      myocardium: '#991B1B', // Myocardium: Dark Red
      epicardium: '#E11D48', // Epicardium: Soft Red
    };

    cloned.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const name = (mesh.name || '').toLowerCase();

        if (mesh.material) {
          const mat = (Array.isArray(mesh.material)
            ? mesh.material[0]
            : mesh.material
          ).clone() as THREE.MeshStandardMaterial;

          // Assign Anatomical Color
          let assignedHex = '#B91C1C';
          const isCoronary = name.includes('coronar') || name.includes('vessel');

          if (name.includes('aort')) assignedHex = ANATOMICAL_MAP.aorta;
          else if (name.includes('pulm') && name.includes('vein')) assignedHex = ANATOMICAL_MAP.pulmonary_vein;
          else if (name.includes('pulm')) assignedHex = ANATOMICAL_MAP.pulmonary_art;
          else if (name.includes('cava') || name.includes('vena')) assignedHex = ANATOMICAL_MAP.vena_cava;
          else if (isCoronary) assignedHex = ANATOMICAL_MAP.coronary;
          else if (name.includes('valve')) assignedHex = ANATOMICAL_MAP.valve;
          else if (name.includes('atrium') && name.includes('left')) assignedHex = ANATOMICAL_MAP.atrium_l;
          else if (name.includes('atrium')) assignedHex = ANATOMICAL_MAP.atrium_r;
          else if (name.includes('ventricle') && name.includes('right')) assignedHex = ANATOMICAL_MAP.ventricle_r;
          else if (name.includes('ventricle')) assignedHex = ANATOMICAL_MAP.ventricle_l;
          else if (name.includes('myo')) assignedHex = ANATOMICAL_MAP.myocardium;
          else if (name.includes('epi')) assignedHex = ANATOMICAL_MAP.epicardium;

          mat.color = new THREE.Color(assignedHex);
          mat.roughness = 0.25; // Organic tissue gloss
          mat.metalness = 0.08;
          mat.envMapIntensity = 1.25;

          mesh.material = mat;
          mats.push(mat);
          if (isCoronary) {
            coronaryMats.push(mat);
          }
        }
      }
    });
    materialsRef.current = mats;
    coronaryMaterialsRef.current = coronaryMats;

    // Reset root transform for exact Box3 computation
    cloned.position.set(0, 0, 0);
    cloned.scale.set(1, 1, 1);
    cloned.rotation.set(0, 0, 0);
    cloned.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(cloned);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const sphere = box.getBoundingSphere(new THREE.Sphere());

    // Auto-center model at (0, 0, 0)
    cloned.position.set(-center.x, -center.y, -center.z);

    const report = {
      hasSkeletalAnimationClips: animations.length > 0,
      clipName: animations[0]?.name || 'N/A',
      clipDuration: animations[0]?.duration || 0,
      tracksCount: animations[0]?.tracks?.length || 0,
      boundingBox: {
        min: [box.min.x.toFixed(6), box.min.y.toFixed(6), box.min.z.toFixed(6)],
        max: [box.max.x.toFixed(6), box.max.y.toFixed(6), box.max.z.toFixed(6)],
        dimensions: [size.x.toFixed(6), size.y.toFixed(6), size.z.toFixed(6)],
      },
      center: [center.x.toFixed(6), center.y.toFixed(6), center.z.toFixed(6)],
      boundingSphereRadius: sphere.radius.toFixed(6),
    };

    return {
      clonedScene: cloned,
      boundingSphereRadius: sphere.radius > 0 ? sphere.radius : 0.1093,
      debugReport: report,
    };
  }, [scene, animations]);

  // Pass sphere radius & debug info to parent & camera fitter
  useEffect(() => {
    onSphereRadiusComputed(boundingSphereRadius);
    onDebugInfo?.(debugReport);
  }, [boundingSphereRadius, debugReport, onSphereRadiusComputed, onDebugInfo]);

  // Setup GLB 63-track AnimationMixer
  useEffect(() => {
    if (animations.length > 0 && !prefersReducedMotion) {
      const mixer = new THREE.AnimationMixer(clonedScene);
      animations.forEach((clip) => {
        const action = mixer.clipAction(clip);
        action.play();
      });
      mixerRef.current = mixer;
      return () => {
        mixer.stopAllAction();
        mixer.uncacheRoot(clonedScene);
      };
    }
  }, [animations, clonedScene, prefersReducedMotion]);

  // Update target color on risk state change
  useEffect(() => {
    targetColorRef.current = RISK_COLORS[normalizedRisk] || RISK_COLORS.LOW;
  }, [normalizedRisk]);

  // Frame loop logic for real-time BPM synchronization, Systole/Diastole phase deformation & simulation states
  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();

    // Lerp color transitions smoothly for real-time patient switching
    currentColorRef.current.lerp(targetColorRef.current, delta * 3.5);

    // 1. Exact BPM Duration Formula & Controlled State Modulation
    const effectiveHR = Math.max(40, Math.min(190, heartRate));
    const baseBeatDuration = 60.0 / effectiveHR;

    const isArrhythmia = simulationState?.beatMode === 'IRREGULAR';
    const isReducedFunction = simulationState?.beatMode === 'WEAK';

    let cardiacPhase = 0;
    let targetTimeScale = effectiveHR / 60.0;
    let ejectionAmplitude = 0.06;

    if (isArrhythmia) {
      // Controlled deterministic 4-beat arrhythmia cadence:
      // beat (1) -> beat (2, premature) -> PAUSE (compensatory) -> beat (3, recovery) -> repeat
      const cycleDuration = baseBeatDuration * 4.0;
      const cycleProgress = (t % cycleDuration) / cycleDuration; // 0.0 to 1.0

      if (cycleProgress < 0.22) {
        // Beat 1: standard beat
        cardiacPhase = cycleProgress / 0.22;
        targetTimeScale = (effectiveHR / 60.0) * 1.15;
      } else if (cycleProgress < 0.40) {
        // Beat 2: premature coupled beat
        cardiacPhase = (cycleProgress - 0.22) / 0.18;
        targetTimeScale = (effectiveHR / 60.0) * 1.35;
      } else if (cycleProgress < 0.70) {
        // Compensatory Pause: resting in diastole, no contraction
        cardiacPhase = 0;
        targetTimeScale = (effectiveHR / 60.0) * 0.18; // Slow idle
      } else {
        // Beat 3: post-pause recovery beat
        cardiacPhase = (cycleProgress - 0.70) / 0.30;
        targetTimeScale = (effectiveHR / 60.0) * 0.95;
      }
    } else if (isReducedFunction) {
      // Reduced Cardiac Function: weaker, slower, less forceful contraction
      cardiacPhase = (t / baseBeatDuration) % 1.0;
      targetTimeScale = (effectiveHR / 60.0) * 0.75;
      const strength = simulationState?.contractionStrength ?? 0.62;
      ejectionAmplitude = 0.06 * strength; // e.g., ~0.037
    } else {
      // Normal Synchronized Cardiac Phase
      cardiacPhase = (t / baseBeatDuration) % 1.0;
      targetTimeScale = effectiveHR / 60.0;
      ejectionAmplitude = 0.06;
    }

    onBeatPulse?.(cardiacPhase);

    // 2. Drive AnimationMixer playback speed based strictly on deterministic timing
    if (mixerRef.current) {
      mixerRef.current.timeScale = THREE.MathUtils.lerp(
        mixerRef.current.timeScale || 1,
        targetTimeScale,
        delta * 6.0
      );
      mixerRef.current.update(delta);
    }

    // 3. Clinically Realistic Physiological Cardiac Phase Deformation & High-BMI Hypertrophy
    if (groupRef.current && !prefersReducedMotion) {
      groupRef.current.rotation.y = t * 0.12;

      // Ventricular Systole non-linear ejection curve
      let ventricularSystoleCurve = 0;
      if (cardiacPhase >= 0.12 && cardiacPhase <= 0.45) {
        const normSystole = (cardiacPhase - 0.12) / (0.45 - 0.12);
        ventricularSystoleCurve = Math.sin(normSystole * Math.PI);
      } else if (cardiacPhase > 0.45 && cardiacPhase <= 0.65) {
        const normRelax = (cardiacPhase - 0.45) / (0.65 - 0.45);
        ventricularSystoleCurve = (1 - normRelax) * 0.3;
      }

      // High BMI LV Hypertrophy Wall Thickness Modulation
      const bmiHypertrophyFactor = bmi > 28 ? (bmi - 28) * 0.008 : 0;

      // Anatomical directional squeeze
      const scaleX = (1.0 + bmiHypertrophyFactor) - ventricularSystoleCurve * ejectionAmplitude * 1.2;
      const scaleY = 1.0 - ventricularSystoleCurve * ejectionAmplitude * 0.8;
      const scaleZ = (1.0 + bmiHypertrophyFactor) - ventricularSystoleCurve * ejectionAmplitude * 1.1;

      groupRef.current.scale.set(scaleX, scaleY, scaleZ);
      groupRef.current.position.y = Math.sin(t * 0.8) * 0.003;
    }

    // 4. SHAP & Patient-Specific Material Emissive Highlighting
    let targetEmissiveIntensity = 0.18;
    if (normalizedRisk === 'CRITICAL') targetEmissiveIntensity = 0.85 + Math.sin(t * 12) * 0.35;
    else if (normalizedRisk === 'HIGH') targetEmissiveIntensity = 0.55 + Math.sin(t * 8) * 0.22;
    else if (normalizedRisk === 'MODERATE') targetEmissiveIntensity = 0.35 + Math.sin(t * 4) * 0.12;
    else targetEmissiveIntensity = 0.18 + Math.sin(t * 2) * 0.05;

    if (systolicBP > 140 || cholesterol > 240) {
      targetEmissiveIntensity += 0.15;
    }

    const curColor = currentColorRef.current;
    const mats = materialsRef.current;
    const lerpRate = Math.min(1, delta * 4.0);

    for (let i = 0; i < mats.length; i++) {
      const mat = mats[i];
      if (smoking) {
        mat.color.lerp(new THREE.Color('#7f1d1d'), delta * 1.5);
      }
      mat.emissive.lerp(curColor, lerpRate);
      mat.emissiveIntensity = THREE.MathUtils.lerp(
        mat.emissiveIntensity || 0,
        targetEmissiveIntensity,
        lerpRate
      );
    }

    // Coronary Specific Emissive Highlight for CORONARY_FLOW_RISK
    if (simulationState?.highlightRegion === 'CORONARY' && coronaryMaterialsRef.current.length > 0) {
      const coronaryPulse = 0.75 + Math.sin(t * 5.0) * 0.35;
      const coronaryAlertColor = new THREE.Color('#f59e0b');
      for (let j = 0; j < coronaryMaterialsRef.current.length; j++) {
        const cmat = coronaryMaterialsRef.current[j];
        cmat.emissive.lerp(coronaryAlertColor, lerpRate * 1.5);
        cmat.emissiveIntensity = THREE.MathUtils.lerp(
          cmat.emissiveIntensity || 0,
          coronaryPulse,
          lerpRate * 1.5
        );
      }
    }

    // 5. Health Aura & Pulse Wave updating
    const auraColorHex = AURA_COLORS[normalizedRisk] || AURA_COLORS.LOW;
    if (auraRef.current) {
      const auraMat = auraRef.current.material as THREE.MeshBasicMaterial;
      if (auraMat) {
        auraMat.color.lerp(new THREE.Color(auraColorHex), delta * 3.5);
        const pulse = Math.sin((t / baseBeatDuration) * Math.PI * 2.0);
        auraMat.opacity = THREE.MathUtils.lerp(
          auraMat.opacity,
          0.12 + Math.max(0, pulse) * (normalizedRisk === 'CRITICAL' ? 0.28 : 0.14),
          delta * 4.0
        );
      }
    }

    if (pulseRingRef.current) {
      const ringMat = pulseRingRef.current.material as THREE.MeshBasicMaterial;
      if (ringMat) {
        ringMat.color.lerp(new THREE.Color(auraColorHex), delta * 3.5);
        const ringPulse = (t / baseBeatDuration) % 1;
        pulseRingRef.current.scale.setScalar(1 + ringPulse * 1.35);
        ringMat.opacity = Math.max(0, (1 - ringPulse) * (normalizedRisk === 'CRITICAL' ? 0.65 : 0.35));
      }
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* 3D Arterial Blood Corpuscle Particle System (FlowMode aware) */}
      <BloodFlowParticles
        radius={boundingSphereRadius}
        heartRate={heartRate}
        flowMode={simulationState?.flowMode || 'NORMAL'}
      />

      {/* Localized Coronary Perfusion Risk Marker when highlightRegion === 'CORONARY' */}
      {simulationState?.highlightRegion === 'CORONARY' && (
        <LocalizedCoronaryPerfusionMarker radius={boundingSphereRadius} />
      )}

      {/* Dynamic 3D Health Aura Glow Mesh */}
      <mesh ref={auraRef} position={[0, 0, 0]}>
        <sphereGeometry args={[boundingSphereRadius * 1.25, 32, 32]} />
        <meshBasicMaterial
          transparent
          opacity={0.15}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Dynamic Pulse Wave Ring */}
      <mesh ref={pulseRingRef} position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[boundingSphereRadius * 1.15, boundingSphereRadius * 1.25, 64]} />
        <meshBasicMaterial
          transparent
          opacity={0.25}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Official GLB Heart Primitive Model centered at (0,0,0) (Unmodified) */}
      <primitive
        object={clonedScene}
        onPointerOver={(e: any) => {
          e.stopPropagation();
          const name = (e.object?.name || '').toLowerCase();
          if (name.includes('aort')) onHoverPart?.('Aorta (Main Arterial Trunk)');
          else if (name.includes('ventricl') || name.includes('muscle')) onHoverPart?.('Ventricles (Pumping Chambers)');
          else if (name.includes('pulm')) onHoverPart?.('Pulmonary Artery (Oxygen Transfer)');
          else if (name.includes('atrium')) onHoverPart?.('Atria (Receiving Chambers)');
          else if (name.includes('valve')) onHoverPart?.('Cardiac Valve System');
          else onHoverPart?.('Coronary Vessel Network');
        }}
        onPointerOut={() => onHoverPart?.(null)}
      />
    </group>
  );
}

export default function ThreeHeart({
  simulationState: propSimulationState,
  heartRate = 72,
  riskLevel = 'LOW',
  riskScore = 20,
  systolicBP = 120,
  diastolicBP = 80,
  cholesterol = 190,
  bmi = 24.5,
  bloodSugar = 95,
  smoking = false,
  age = 45,
  shapFactors = [],
  glowIntensity = 1,
  onHoverPart,
  onDebugInfo,
  onBeatPulse,
}: DigitalTwinProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [frameloop, setFrameloop] = useState<'always' | 'never'>('always');
  const [sphereRadius, setSphereRadius] = useState<number>(0.1093);
  const [hoveredPart, setHoveredPart] = useState<string | null>(null);

  // Read centralized Digital Twin simulation state as fallback if not provided via props
  const storeSimulationState = useDigitalTwinStore((s) => s.simulationState);
  const simulationState = propSimulationState || storeSimulationState;

  const handleHoverPartInternal = (part: string | null) => {
    setHoveredPart(part);
    onHoverPart?.(part);
  };

  // Pause rendering when hidden offscreen for 60 FPS optimization
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setFrameloop(entry.isIntersecting ? 'always' : 'never');
      },
      { threshold: 0.1 }
    );

    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const isMobile = useMemo(() => {
    return typeof window !== 'undefined' && (window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 768);
  }, []);

  // Determine state banner text
  const simulationBanner = useMemo(() => {
    if (!simulationState) return null;
    switch (simulationState.condition) {
      case 'CORONARY_FLOW_RISK':
        return {
          label: 'SIMULATED CORONARY FLOW RISK',
          sub: 'CORONARY PERFUSION RESISTANCE SIMULATION',
          color: 'bg-amber-50 text-amber-800 border-amber-300',
          dot: 'bg-amber-500',
        };
      case 'ARRHYTHMIA_RISK':
        return {
          label: 'SIMULATED IRREGULAR RHYTHM',
          sub: 'VARIABLE CONDUCTION CADENCE (BEAT → BEAT → PAUSE)',
          color: 'bg-rose-50 text-rose-800 border-rose-300',
          dot: 'bg-rose-500',
        };
      case 'REDUCED_CARDIAC_FUNCTION':
        return {
          label: 'SIMULATED REDUCED CARDIAC FUNCTION',
          sub: 'DAMPED CONTRACTION AMPLITUDE (0.62x EF LOAD)',
          color: 'bg-purple-50 text-purple-800 border-purple-300',
          dot: 'bg-purple-500',
        };
      case 'NORMAL':
      default:
        return {
          label: 'SYNCHRONIZED BASELINE (NORMAL)',
          sub: 'NORMAL SINUS CONDUCTION & TISSUE PERFUSION',
          color: 'bg-emerald-50 text-emerald-800 border-emerald-300',
          dot: 'bg-emerald-500',
        };
    }
  }, [simulationState]);

  return (
    <div ref={containerRef} className="w-full h-full relative flex items-center justify-center">
      {/* Clinical Medical Digital Twin HUD Overlay */}
      <div className="absolute inset-0 pointer-events-none p-3 flex flex-col justify-between z-10 font-mono text-[9px] uppercase tracking-wider">
        {/* Top Row Badges */}
        <div className="flex justify-between items-start">
          <div className="bg-white/85 backdrop-blur-md border border-slate-200 px-2.5 py-1 rounded-lg text-slate-800 shadow-xs flex items-center space-x-2 pointer-events-auto">
            <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
            <span>HR: <strong className="text-rose-600 font-bold">{heartRate} BPM</strong></span>
          </div>

          {/* Centralized Dynamic Simulation Status Pill */}
          {simulationBanner && (
            <div className={`px-2.5 py-1 rounded-full border shadow-xs flex items-center space-x-1.5 font-bold pointer-events-auto ${simulationBanner.color}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${simulationBanner.dot} animate-ping`} />
              <span>{simulationBanner.label}</span>
            </div>
          )}

          <div className="bg-white/85 backdrop-blur-md border border-slate-200 px-2.5 py-1 rounded-lg text-slate-800 shadow-xs flex items-center space-x-2 pointer-events-auto">
            <span>BP: <strong className="text-blue-600 font-bold">{systolicBP}/{diastolicBP} mmHg</strong></span>
          </div>
        </div>

        {/* Interactive Floating Anatomical Part Tooltip Badge */}
        {hoveredPart && (
          <div className="self-center bg-slate-900/90 backdrop-blur-md text-white border border-slate-700 px-3 py-1.5 rounded-full shadow-lg flex items-center space-x-2 text-[10px] font-sans font-bold tracking-normal pointer-events-auto animate-fadeIn">
            <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
            <span>{hoveredPart}</span>
          </div>
        )}

        {/* Bottom Row Badges */}
        <div className="flex justify-between items-end">
          <div className="bg-white/85 backdrop-blur-md border border-slate-200 px-2.5 py-1 rounded-lg text-slate-800 shadow-xs space-y-0.5 pointer-events-auto">
            <div>SpO₂: <strong className="text-emerald-600 font-bold">98%</strong></div>
            <div>TEMP: <strong className="text-sky-600 font-bold">36.8 °C</strong></div>
          </div>

          {simulationState?.highlightRegion === 'CORONARY' && (
            <div className="self-end bg-amber-500/90 text-white font-mono text-[8px] font-bold px-2 py-0.5 rounded shadow-xs pointer-events-auto">
              SIMULATED CORONARY FLOW RESISTANCE
            </div>
          )}

          <div className="bg-white/85 backdrop-blur-md border border-slate-200 px-2.5 py-1 rounded-lg text-slate-800 shadow-xs flex flex-col items-end pointer-events-auto">
            <span className="text-[8px] text-slate-500 font-semibold">TWIN SCORE</span>
            <span className="text-[10px] font-extrabold text-blue-600">{Math.round(riskScore || 20)}% RISK</span>
          </div>
        </div>
      </div>

      <Canvas
        frameloop={frameloop}
        dpr={isMobile ? 1 : Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 1.5)}
        performance={{ min: 0.5 }}
        camera={{ fov: 42, near: 0.001, far: 100 }}
        gl={{
          antialias: !isMobile,
          powerPreference: 'high-performance',
          alpha: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.15,
        }}
        className="w-full h-full"
      >
        <DynamicCameraAndControlsFitter modelSphereRadius={sphereRadius} />

        {/* Environment HDRI for Realistic PBR Metalness/Roughness Surface Detail */}
        <Suspense fallback={null}>
          <Environment preset="studio" />
        </Suspense>

        {/* Ambient & Professional Soft Rim Lighting (Optimized for Mobile) */}
        <ambientLight intensity={isMobile ? 0.9 : 0.75} />
        <directionalLight position={[5, 8, 5]} intensity={isMobile ? 1.0 : 1.3} color="#ffffff" />
        {!isMobile && (
          <>
            <directionalLight position={[-5, -4, -5]} intensity={0.6} color="#60a5fa" />
            <pointLight position={[0, 3, 4]} intensity={0.9} color="#f87171" />
          </>
        )}
        <pointLight position={[-4, 2, -4]} intensity={isMobile ? 1.0 : 1.4} color="#3b82f6" />

        {/* Official GLB Digital Twin Heart (Skeletal Beating Heart Preserved) */}
        <OfficialGlbDigitalTwinHeart
          simulationState={simulationState}
          heartRate={heartRate}
          riskLevel={riskLevel}
          riskScore={riskScore}
          systolicBP={systolicBP}
          diastolicBP={diastolicBP}
          cholesterol={cholesterol}
          bmi={bmi}
          bloodSugar={bloodSugar}
          smoking={smoking}
          age={age}
          shapFactors={shapFactors}
          glowIntensity={glowIntensity}
          onHoverPart={handleHoverPartInternal}
          onDebugInfo={onDebugInfo}
          onBeatPulse={onBeatPulse}
          onSphereRadiusComputed={setSphereRadius}
        />
      </Canvas>
    </div>
  );
}
