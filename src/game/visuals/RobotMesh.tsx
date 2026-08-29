import { useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  EGG_VISUAL_GROUND_OFFSET,
  getCharacterPose,
  type CharacterPresentation,
} from "../character-presentation";
import { glowTex } from "../look";

const shell = new THREE.SphereGeometry(0.52, 20, 16);
shell.scale(1.04, 1.18, 1.0);
const sphere = new THREE.SphereGeometry(1, 14, 12);
const cyl = new THREE.CylinderGeometry(1, 1, 1, 10);
const cone = new THREE.ConeGeometry(1, 1, 8);

type Props = {
  color: string;
  isPlayer?: boolean;
  presentation: RefObject<CharacterPresentation>;
  skinId?: string;
  accessory?: string;
};

export function RobotMesh({ color, isPlayer = false, presentation }: Props) {
  const steel = color || "#7A90A8";
  const gold = "#D4B45A";
  const dark = "#1C2228";
  const group = useRef<THREE.Group>(null);
  const antenna = useRef<THREE.Group>(null);
  const glow = useMemo(() => glowTex(), []);

  useFrame(({ clock }) => {
    const pose = getCharacterPose(presentation.current, clock.elapsedTime, "hero");
    if (!group.current) return;
    group.current.position.y = EGG_VISUAL_GROUND_OFFSET + pose.lift;
    group.current.scale.set(pose.scaleX, pose.scaleY, pose.scaleZ);
    if (antenna.current) {
      antenna.current.rotation.z = Math.sin(clock.elapsedTime * 2.6) * 0.08;
    }
  });

  return (
    <group ref={group} position={[0, EGG_VISUAL_GROUND_OFFSET, 0]}>
      {isPlayer && (
        <sprite position={[0, 0.08, 0]} scale={[2.1, 2.1, 1]}>
          <spriteMaterial map={glow} color="#4EC8E8" transparent opacity={0.34} depthWrite={false} blending={THREE.AdditiveBlending} />
        </sprite>
      )}

      <mesh geometry={shell} scale={1.05}>
        <meshStandardMaterial color={dark} roughness={0.7} metalness={0.2} side={THREE.BackSide} />
      </mesh>
      <mesh geometry={shell} castShadow>
        <meshStandardMaterial color={steel} metalness={0.72} roughness={0.28} />
      </mesh>
      <mesh geometry={cyl} position={[0, 0.02, 0.02]} scale={[0.52, 0.12, 0.48]} castShadow>
        <meshStandardMaterial color={gold} metalness={0.85} roughness={0.22} />
      </mesh>
      <mesh geometry={cyl} position={[0, 0.22, 0.42]} rotation={[Math.PI / 2, 0, 0]} scale={[0.34, 0.08, 0.18]}>
        <meshStandardMaterial color={dark} metalness={0.5} roughness={0.22} />
      </mesh>
      <mesh geometry={sphere} position={[-0.1, 0.24, 0.5]} scale={[0.06, 0.05, 0.04]}>
        <meshPhysicalMaterial color="#C8F4FF" roughness={0.12} metalness={0.1} emissive="#4EC8E8" emissiveIntensity={0.7} />
      </mesh>
      <mesh geometry={sphere} position={[0.1, 0.24, 0.5]} scale={[0.06, 0.05, 0.04]}>
        <meshPhysicalMaterial color="#C8F4FF" roughness={0.12} metalness={0.1} emissive="#4EC8E8" emissiveIntensity={0.7} />
      </mesh>

      <group ref={antenna} position={[0, 0.62, 0]}>
        <mesh geometry={cyl} scale={[0.03, 0.22, 0.03]} castShadow>
          <meshStandardMaterial color={steel} metalness={0.75} roughness={0.25} />
        </mesh>
        <mesh geometry={sphere} position={[0, 0.16, 0]} scale={[0.06, 0.06, 0.06]}>
          <meshPhysicalMaterial color="#E8614A" roughness={0.2} metalness={0.3} emissive="#E8614A" emissiveIntensity={0.55} />
        </mesh>
      </group>

      <mesh geometry={cone} position={[-0.48, 0.12, 0]} rotation={[0, 0, 0.7]} scale={[0.12, 0.16, 0.12]} castShadow>
        <meshStandardMaterial color={steel} metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh geometry={cone} position={[0.48, 0.12, 0]} rotation={[0, 0, -0.7]} scale={[0.12, 0.16, 0.12]} castShadow>
        <meshStandardMaterial color={steel} metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh geometry={sphere} position={[-0.5, -0.08, 0.08]} scale={[0.1, 0.14, 0.1]} castShadow>
        <meshStandardMaterial color={dark} metalness={0.6} roughness={0.32} />
      </mesh>
      <mesh geometry={sphere} position={[0.5, -0.08, 0.08]} scale={[0.1, 0.14, 0.1]} castShadow>
        <meshStandardMaterial color={dark} metalness={0.6} roughness={0.32} />
      </mesh>
      <mesh geometry={cyl} position={[-0.18, -0.52, 0.08]} scale={[0.1, 0.1, 0.14]} castShadow>
        <meshStandardMaterial color={dark} metalness={0.65} roughness={0.3} />
      </mesh>
      <mesh geometry={cyl} position={[0.18, -0.52, 0.08]} scale={[0.1, 0.1, 0.14]} castShadow>
        <meshStandardMaterial color={dark} metalness={0.65} roughness={0.3} />
      </mesh>
      <mesh geometry={sphere} position={[0, -0.02, -0.46]} scale={[0.22, 0.28, 0.06]} castShadow>
        <meshStandardMaterial color="#2A3038" metalness={0.55} roughness={0.35} />
      </mesh>
    </group>
  );
}
