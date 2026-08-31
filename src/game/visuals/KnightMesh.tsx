import { useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  EGG_VISUAL_GROUND_OFFSET,
  getCharacterPose,
  type CharacterPresentation,
} from "../character-presentation";
import { glowTex } from "../look";

const shell = new THREE.SphereGeometry(0.52, 32, 24);
shell.scale(1.06, 1.24, 1.0);
const sphere = new THREE.SphereGeometry(1, 16, 14);
const cyl = new THREE.CylinderGeometry(1, 1, 1, 12);
const cone = new THREE.ConeGeometry(1, 1, 8);

type Props = {
  color: string;
  isPlayer?: boolean;
  presentation: RefObject<CharacterPresentation>;
  skinId?: string;
  accessory?: string;
};

export function KnightMesh({ color, isPlayer = false, presentation }: Props) {
  const gold = "#D4B45A";
  const steel = "#8A93A3";
  const dark = "#2A3038";
  const capeColor = color === "#C9A227" ? "#6B2A38" : color;
  const group = useRef<THREE.Group>(null);
  const cape = useRef<THREE.Mesh>(null);
  const glow = useMemo(() => glowTex(), []);

  useFrame(({ clock }) => {
    const pose = getCharacterPose(presentation.current, clock.elapsedTime, "hero");
    if (!group.current) return;
    group.current.position.y = EGG_VISUAL_GROUND_OFFSET + pose.lift;
    group.current.scale.set(pose.scaleX, pose.scaleY, pose.scaleZ);
    if (cape.current) {
      cape.current.rotation.x = 0.18 + Math.sin(clock.elapsedTime * 2.05) * 0.05;
      cape.current.rotation.y = Math.sin(clock.elapsedTime * 1.4) * 0.07;
    }
  });

  return (
    <group ref={group} position={[0, EGG_VISUAL_GROUND_OFFSET, 0]}>
      {isPlayer && (
        <sprite position={[0, 0.08, 0]} scale={[2.1, 2.1, 1]}>
          <spriteMaterial map={glow} color={gold} transparent opacity={0.32} depthWrite={false} blending={THREE.AdditiveBlending} />
        </sprite>
      )}

      <mesh geometry={shell} castShadow>
        <meshStandardMaterial color={steel} metalness={0.74} roughness={0.26} />
      </mesh>

      <mesh geometry={sphere} position={[0, 0.06, 0.18]} scale={[0.34, 0.28, 0.16]} castShadow>
        <meshStandardMaterial color={gold} metalness={0.86} roughness={0.2} />
      </mesh>
      <mesh geometry={cyl} position={[0, 0.02, 0.04]} scale={[0.54, 0.1, 0.5]} castShadow>
        <meshStandardMaterial color={gold} metalness={0.85} roughness={0.22} />
      </mesh>

      <mesh geometry={sphere} position={[0, 0.46, 0.04]} scale={[0.44, 0.32, 0.42]} castShadow>
        <meshStandardMaterial color={dark} metalness={0.58} roughness={0.3} />
      </mesh>
      <mesh geometry={cyl} position={[0, 0.34, 0.22]} rotation={[Math.PI / 2, 0, 0]} scale={[0.32, 0.08, 0.12]}>
        <meshStandardMaterial color={gold} metalness={0.82} roughness={0.18} />
      </mesh>
      <mesh geometry={sphere} position={[0, 0.4, 0.3]} scale={[0.3, 0.14, 0.08]}>
        <meshStandardMaterial color="#0E1218" metalness={0.45} roughness={0.16} />
      </mesh>
      <mesh geometry={sphere} position={[-0.1, 0.4, 0.36]} scale={[0.05, 0.04, 0.03]}>
        <meshPhysicalMaterial color="#C8F4FF" roughness={0.12} metalness={0.1} emissive="#4EC8E8" emissiveIntensity={0.4} />
      </mesh>
      <mesh geometry={sphere} position={[0.1, 0.4, 0.36]} scale={[0.05, 0.04, 0.03]}>
        <meshPhysicalMaterial color="#C8F4FF" roughness={0.12} metalness={0.1} emissive="#4EC8E8" emissiveIntensity={0.4} />
      </mesh>
      <mesh geometry={cone} position={[0, 0.78, 0]} scale={[0.07, 0.26, 0.07]} castShadow>
        <meshStandardMaterial color={gold} metalness={0.82} roughness={0.18} />
      </mesh>
      <mesh geometry={sphere} position={[0, 0.92, 0]} scale={[0.045, 0.045, 0.045]}>
        <meshStandardMaterial color={gold} metalness={0.88} roughness={0.16} />
      </mesh>

      <mesh geometry={sphere} position={[-0.52, 0.2, 0.02]} rotation={[0, 0, 0.55]} scale={[0.18, 0.13, 0.22]} castShadow>
        <meshStandardMaterial color={steel} metalness={0.72} roughness={0.28} />
      </mesh>
      <mesh geometry={sphere} position={[0.52, 0.2, 0.02]} rotation={[0, 0, -0.55]} scale={[0.18, 0.13, 0.22]} castShadow>
        <meshStandardMaterial color={steel} metalness={0.72} roughness={0.28} />
      </mesh>
      <mesh geometry={sphere} position={[-0.58, 0.22, 0.08]} scale={[0.08, 0.06, 0.1]}>
        <meshStandardMaterial color={gold} metalness={0.84} roughness={0.2} />
      </mesh>
      <mesh geometry={sphere} position={[0.58, 0.22, 0.08]} scale={[0.08, 0.06, 0.1]}>
        <meshStandardMaterial color={gold} metalness={0.84} roughness={0.2} />
      </mesh>

      <mesh geometry={sphere} position={[-0.42, -0.12, 0.14]} rotation={[0, 0, 0.5]} scale={[0.1, 0.16, 0.1]} castShadow>
        <meshStandardMaterial color={steel} metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh geometry={sphere} position={[0.42, -0.12, 0.14]} rotation={[0, 0, -0.5]} scale={[0.1, 0.16, 0.1]} castShadow>
        <meshStandardMaterial color={steel} metalness={0.7} roughness={0.3} />
      </mesh>

      <mesh ref={cape} geometry={sphere} position={[0, 0.02, -0.46]} scale={[0.34, 0.52, 0.1]} castShadow>
        <meshStandardMaterial color={capeColor} roughness={0.55} metalness={0.08} />
      </mesh>

      <mesh geometry={sphere} position={[-0.16, -0.56, 0.1]} scale={[0.13, 0.09, 0.18]} castShadow>
        <meshStandardMaterial color={dark} metalness={0.62} roughness={0.32} />
      </mesh>
      <mesh geometry={sphere} position={[0.16, -0.56, 0.1]} scale={[0.13, 0.09, 0.18]} castShadow>
        <meshStandardMaterial color={dark} metalness={0.62} roughness={0.32} />
      </mesh>
    </group>
  );
}
