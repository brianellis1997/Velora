'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import { Suspense, useEffect, useState } from 'react';
import { Avatar as Avatar2D } from './Avatar';

interface Avatar3DProps {
  modelUrl?: string;
  fallbackSrc?: string;
  alt: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isAnimating?: boolean;
  className?: string;
}

const sizeMap = {
  sm: 'w-10 h-10',
  md: 'w-16 h-16',
  lg: 'w-24 h-24',
  xl: 'w-32 h-32',
};

function AvatarModel({ url }: { url: string }) {
  const { scene } = useGLTF(url);

  useEffect(() => {
    if (scene) {
      scene.position.set(0, -1, 0);
      scene.rotation.set(0, 0, 0);
    }
  }, [scene]);

  return <primitive object={scene} scale={1.5} />;
}

function LoadingFallback({ size }: { size: 'sm' | 'md' | 'lg' | 'xl' }) {
  return (
    <div className={`${sizeMap[size]} rounded-full bg-gray-200 animate-pulse flex items-center justify-center`}>
      <span className="text-gray-400 text-xs">...</span>
    </div>
  );
}

export function Avatar3D({
  modelUrl,
  fallbackSrc,
  alt,
  size = 'md',
  isAnimating = false,
  className = '',
}: Avatar3DProps) {
  const [hasWebGL, setHasWebGL] = useState<boolean | null>(null);
  const [modelError, setModelError] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        setHasWebGL(!!gl);
      } catch (e) {
        setHasWebGL(false);
      }
    }
  }, []);

  if (hasWebGL === null) {
    return <LoadingFallback size={size} />;
  }

  if (!hasWebGL || !modelUrl || modelError) {
    return (
      <Avatar2D
        src={fallbackSrc}
        alt={alt}
        size={size}
        className={className}
      />
    );
  }

  return (
    <div className={`${sizeMap[size]} ${className} rounded-full overflow-hidden bg-gradient-to-br from-blue-100 to-purple-100`}>
      <Canvas
        camera={{ position: [0, 0, 2], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
        }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} />
        <directionalLight position={[-5, -5, -5]} intensity={0.3} />

        <Suspense fallback={null}>
          <AvatarModel url={modelUrl} />
        </Suspense>

        <OrbitControls
          enableZoom={false}
          enablePan={false}
          minPolarAngle={Math.PI / 2}
          maxPolarAngle={Math.PI / 2}
          autoRotate={isAnimating}
          autoRotateSpeed={2}
        />
      </Canvas>
    </div>
  );
}
