import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Html, Environment } from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";

function Document() {
  const group = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!group.current) return;

    const { x, y } = state.pointer;

    group.current.rotation.y = THREE.MathUtils.lerp(
      group.current.rotation.y,
      x * 0.35,
      0.04
    );

    group.current.rotation.x = THREE.MathUtils.lerp(
      group.current.rotation.x,
      -y * 0.18,
      0.04
    );
  });

  return (
    <Float
      speed={1.5}
      rotationIntensity={0.25}
      floatIntensity={0.8}
    >
      <group ref={group} rotation={[0.08, -0.25, 0.02]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[3.2, 4.2, 0.18]} />
          <meshStandardMaterial
            color="#101936"
            metalness={0.55}
            roughness={0.25}
          />
        </mesh>

        <mesh position={[0, 1.25, 0.11]}>
          <boxGeometry args={[2.45, 0.48, 0.04]} />
          <meshStandardMaterial
            color="#6254ff"
            emissive="#392cff"
            emissiveIntensity={0.7}
          />
        </mesh>

        <mesh position={[0, 0.55, 0.12]}>
          <boxGeometry args={[2.25, 0.08, 0.04]} />
          <meshStandardMaterial color="#7f8dbb" />
        </mesh>

        <mesh position={[0, 0.25, 0.12]}>
          <boxGeometry args={[1.9, 0.08, 0.04]} />
          <meshStandardMaterial color="#53628e" />
        </mesh>

        <mesh position={[0, -0.05, 0.12]}>
          <boxGeometry args={[2.1, 0.08, 0.04]} />
          <meshStandardMaterial color="#53628e" />
        </mesh>

        <mesh position={[0, -0.65, 0.12]}>
          <boxGeometry args={[1.65, 0.55, 0.04]} />
          <meshStandardMaterial
            color="#17254b"
            emissive="#17254b"
            emissiveIntensity={0.4}
          />
        </mesh>

        <Html
          position={[0, 1.25, 0.15]}
          center
          transform
          distanceFactor={5}
        >
          <div
            style={{
              color: "white",
              fontSize: "18px",
              fontWeight: 700,
              letterSpacing: "1px",
              whiteSpace: "nowrap",
              pointerEvents: "none",
            }}
          >
            DOCUMIND AI
          </div>
        </Html>

        <Html
          position={[0, -0.65, 0.15]}
          center
          transform
          distanceFactor={5}
        >
          <div
            style={{
              color: "#91a7ff",
              fontSize: "12px",
              fontWeight: 600,
              whiteSpace: "nowrap",
              pointerEvents: "none",
            }}
          >
            RAG • AI • SEARCH
          </div>
        </Html>
      </group>
    </Float>
  );
}

function AIOrb() {
  const orb = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!orb.current) return;

    orb.current.rotation.x += 0.003;
    orb.current.rotation.y += 0.006;

    const pulse = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.06;
    orb.current.scale.setScalar(pulse);
  });

  return (
    <Float
      speed={2}
      rotationIntensity={0.5}
      floatIntensity={1}
    >
      <mesh ref={orb} position={[2.4, 1.7, 0.3]}>
        <icosahedronGeometry args={[0.38, 2]} />
        <meshStandardMaterial
          color="#8b7cff"
          emissive="#5848ff"
          emissiveIntensity={1.8}
          metalness={0.7}
          roughness={0.15}
        />
      </mesh>
    </Float>
  );
}

function ConnectionLines() {
  const points = [
    new THREE.Vector3(-2.6, 1.5, 0),
    new THREE.Vector3(-1.5, 0.8, 0),
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(1.5, -0.4, 0),
    new THREE.Vector3(2.6, -1.2, 0),
  ];

  const curve = new THREE.CatmullRomCurve3(points);

  return (
    <mesh>
      <tubeGeometry
        args={[curve, 80, 0.012, 8, false]}
      />
      <meshBasicMaterial
        color="#6254ff"
        transparent
        opacity={0.55}
      />
    </mesh>
  );
}

function Scene() {
  return (
    <>
      <ambientLight intensity={1.2} />

      <directionalLight
        position={[4, 5, 6]}
        intensity={2}
      />

      <pointLight
        position={[-4, 2, 3]}
        intensity={5}
        color="#6254ff"
      />

      <pointLight
        position={[4, -2, 2]}
        intensity={4}
        color="#2563eb"
      />

      <ConnectionLines />

      <Document />

      <AIOrb />

      <Environment preset="city" />
    </>
  );
}

export default function DocumentScene() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        minHeight: "520px",
      }}
    >
      <Canvas
        camera={{
          position: [0, 0, 8],
          fov: 42,
        }}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: true,
        }}
      >
        <Scene />
      </Canvas>
    </div>
  );
}