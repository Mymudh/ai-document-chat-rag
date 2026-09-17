import { useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";

export default function AIOrb() {
  const orbRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!orbRef.current || !ringRef.current) return;

    const time = state.clock.elapsedTime;

    orbRef.current.rotation.x = time * 0.35;
    orbRef.current.rotation.y = time * 0.55;
    orbRef.current.rotation.z = time * 0.2;

    const pulse = 1 + Math.sin(time * 2.2) * 0.08;
    orbRef.current.scale.setScalar(pulse);

    ringRef.current.rotation.x = time * 0.45;
    ringRef.current.rotation.y = time * 0.7;
  });

  return (
    <Float
      speed={2}
      rotationIntensity={0.3}
      floatIntensity={1}
    >
      <group position={[2.5, 1.8, 0.5]}>
        <mesh ref={orbRef}>
          <icosahedronGeometry args={[0.42, 3]} />
          <meshStandardMaterial
            color="#7c6cff"
            emissive="#5142ff"
            emissiveIntensity={2}
            metalness={0.65}
            roughness={0.12}
          />
        </mesh>

        <mesh ref={ringRef}>
          <torusGeometry args={[0.62, 0.012, 16, 100]} />
          <meshBasicMaterial
            color="#7d8cff"
            transparent
            opacity={0.7}
          />
        </mesh>

        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.78, 0.008, 16, 100]} />
          <meshBasicMaterial
            color="#4d7cff"
            transparent
            opacity={0.45}
          />
        </mesh>

        <pointLight
          color="#6254ff"
          intensity={4}
          distance={4}
        />
      </group>
    </Float>
  );
}