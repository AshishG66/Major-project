import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

interface HeartProps {
  heartRate: number;
  glowIntensity?: number;
  onHoverPart?: (part: string | null) => void;
}

// Preload the GLB so it starts fetching immediately
useGLTF.preload('/beating-heart.glb');

function HeartModel({ heartRate, glowIntensity = 1, onHoverPart }: HeartProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF('/beating-heart.glb');
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);

  // Check for reduced motion preference
  const prefersReducedMotion = useMemo(() => {
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      return false;
    }
  }, []);

  // Clone the scene so multiple instances don't conflict
  const clonedScene = useMemo(() => scene.clone(true), [scene]);

  // Setup animation mixer for the built-in beating animation
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

  useFrame((state, delta) => {
    // Update animation mixer with speed scaled to heart rate
    if (mixerRef.current) {
      const speedFactor = heartRate / 72; // 72 bpm is baseline
      mixerRef.current.timeScale = speedFactor;
      mixerRef.current.update(delta);
    }

    if (groupRef.current && !prefersReducedMotion) {
      const t = state.clock.getElapsedTime();
      // Very slow gentle rotation
      groupRef.current.rotation.y = t * 0.15;
      groupRef.current.position.y = Math.sin(t * 0.6) * 0.02;
    }
  });

  return (
    <group ref={groupRef}>
      <primitive
        object={clonedScene}
        scale={3.0}
        position={[0, -1.2, 0]}
        onPointerOver={(e: any) => {
          e.stopPropagation();
          const name = (e.object?.name || '').toLowerCase();
          if (name.includes('aort')) onHoverPart?.('Aorta');
          else if (name.includes('ventricl')) onHoverPart?.('Ventricles');
          else if (name.includes('pulm')) onHoverPart?.('Pulmonary Artery');
          else if (name.includes('vena') || name.includes('cava')) onHoverPart?.('Vena Cava');
          else onHoverPart?.('Heart');
        }}
        onPointerOut={() => onHoverPart?.(null)}
      />
    </group>
  );
}

export default function ThreeHeart({ heartRate, glowIntensity = 1, onHoverPart }: HeartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [frameloop, setFrameloop] = useState<'always' | 'never'>('always');

  useEffect(() => {
    const handleVisibility = () => {
      setFrameloop(document.hidden ? 'never' : 'always');
    };

    document.addEventListener('visibilitychange', handleVisibility);

    let observer: IntersectionObserver | null = null;
    if (containerRef.current) {
      observer = new IntersectionObserver(
        ([entry]) => {
          setFrameloop(entry.isIntersecting && !document.hidden ? 'always' : 'never');
        },
        { threshold: 0.05 }
      );
      observer.observe(containerRef.current);
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      if (observer) {
        observer.disconnect();
      }
    };
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full max-w-[600px] max-h-[600px] aspect-square mx-auto relative cursor-grab active:cursor-grabbing flex items-center justify-center">
      <Canvas
        frameloop={frameloop}
        camera={{ position: [0, 0, 8], fov: 40 }}
        dpr={[1, 1.5]}
        performance={{ min: 0.5 }}
      >
        <ambientLight intensity={0.8} />
        <directionalLight position={[5, 5, 5]} intensity={1.2} />
        <directionalLight position={[-3, -2, -3]} intensity={0.4} color="#f43f5e" />
        <pointLight position={[0, 3, 2]} intensity={0.6} color="#3b82f6" />

        <HeartModel
          heartRate={heartRate}
          glowIntensity={glowIntensity}
          onHoverPart={onHoverPart}
        />

        <OrbitControls
          enableZoom={false}
          enablePan={false}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI * 3 / 4}
          autoRotate={false}
        />
      </Canvas>
    </div>
  );
}
