import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

export default function ParticleField() {
  const pointsRef = useRef<THREE.Points>(null);

  const particles = useMemo(() => {
    const count = 900;
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const radius = 7 + Math.random() * 5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] =
        radius * Math.sin(phi) * Math.cos(theta);

      positions[i * 3 + 1] =
        radius * Math.sin(phi) * Math.sin(theta);

      positions[i * 3 + 2] =
        radius * Math.cos(phi);
    }

    return positions;
  }, []);

  useFrame((state) => {
    if (!pointsRef.current) return;

    pointsRef.current.rotation.y =
      state.clock.elapsedTime * 0.018;

    pointsRef.current.rotation.x =
      Math.sin(state.clock.elapsedTime * 0.12) * 0.04;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[particles, 3]}
        />
      </bufferGeometry>

      <pointsMaterial
        size={0.035}
        color="#7187ff"
        transparent
        opacity={0.65}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}