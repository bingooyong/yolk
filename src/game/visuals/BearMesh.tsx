import { useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  EGG_VISUAL_GROUND_OFFSET,
  getCharacterPose,
  type CharacterPresentation,
} from "../character-presentation";
import { glowTex } from "../look";

const body = new THREE.SphereGeometry(0.52, 28, 22);
body.scale(1.12, 1.08, 1.06);
const sphere = new THREE.SphereGeometry(1, 16, 14);

type Props = {
  color: string;
  isPlayer?: boolean;
  presentation: RefObject<CharacterPresentation>;
  skinId?: string;
  accessory?: string;
};

export function BearMesh({ color, isPlayer = false, presentation }: Props) {
  const fur = color || "#C47A3A";
  const belly = "#F3D5A8";
  const group = useRef<THREE.Group>(null);
  const glow = useMemo(() => glowTex(), []);

  useFrame(({ clock }) => {
    const pose = getCharacterPose(presentation.current, clock.elapsedTime, "bouncy");
    if (!group.current) return;
    group.current.position.y = EGG_VISUAL_GROUND_OFFSET + pose.lift;
    group.current.scale.set(pose.scaleX, pose.scaleY, pose.scaleZ);
  });

  return (
    <group ref={group} position={[0, EGG_VISUAL_GROUND_OFFSET, 0]}>
      {isPlayer && (
        <sprite position={[0, 0.04, 0]} scale={[2.2, 2.2, 1]}>
          <spriteMaterial map={glow} color={fur} transparent opacity={0.28} depthWrite={false} blending={THREE.AdditiveBlending} />
        </sprite>
      )}

      <mesh geometry={body} scale={1.04}>
        <meshStandardMaterial color="#2A1C18" roughness={0.9} metalness={0} side={THREE.BackSide} />
      </mesh>
      <mesh geometry={body} castShadow>
        <meshStandardMaterial color={fur} roughness={0.8} metalness={0.02} />
      </mesh>
      <mesh geometry={sphere} position={[0, -0.1, 0.32]} scale={[0.4, 0.36, 0.24]} castShadow>
        <meshStandardMaterial color={belly} roughness={0.62} metalness={0} />
      </mesh>

      <group position={[0, 0.3, 0.12]}>
        <mesh geometry={sphere} scale={[0.36, 0.32, 0.32]} castShadow>
          <meshStandardMaterial color={fur} roughness={0.78} metalness={0.02} />
        </mesh>
        <mesh geometry={sphere} position={[0, -0.04, 0.26]} scale={[0.2, 0.16, 0.16]} castShadow>
          <meshStandardMaterial color={belly} roughness={0.5} metalness={0} />
        </mesh>
        <mesh geometry={sphere} position={[0, -0.04, 0.4]} scale={[0.07, 0.055, 0.05]}>
          <meshStandardMaterial color="#2A1C18" roughness={0.4} metalness={0.05} />
        </mesh>
        <mesh geometry={sphere} position={[-0.12, 0.08, 0.24]} scale={[0.09, 0.1, 0.05]}>
          <meshStandardMaterial color="#1A1412" roughness={0.35} />
        </mesh>
        <mesh geometry={sphere} position={[0.12, 0.08, 0.24]} scale={[0.09, 0.1, 0.05]}>
          <meshStandardMaterial color="#1A1412" roughness={0.35} />
        </mesh>
        <mesh geometry={sphere} position={[-0.12, 0.08, 0.28]} scale={[0.07, 0.08, 0.05]}>
          <meshPhysicalMaterial color="#FFFDF8" roughness={0.16} metalness={0} clearcoat={0.7} clearcoatRoughness={0.14} />
        </mesh>
        <mesh geometry={sphere} position={[0.12, 0.08, 0.28]} scale={[0.07, 0.08, 0.05]}>
          <meshPhysicalMaterial color="#FFFDF8" roughness={0.16} metalness={0} clearcoat={0.7} clearcoatRoughness={0.14} />
        </mesh>
        <mesh geometry={sphere} position={[-0.11, 0.07, 0.325]} scale={[0.032, 0.038, 0.02]}>
          <meshStandardMaterial color="#1A1412" roughness={0.28} />
        </mesh>
        <mesh geometry={sphere} position={[0.11, 0.07, 0.325]} scale={[0.032, 0.038, 0.02]}>
          <meshStandardMaterial color="#1A1412" roughness={0.28} />
        </mesh>
        <mesh geometry={sphere} position={[-0.09, 0.1, 0.33]} scale={[0.018, 0.016, 0.01]}>
          <meshBasicMaterial color="#FFFDF8" />
        </mesh>
        <mesh geometry={sphere} position={[0.13, 0.1, 0.33]} scale={[0.018, 0.016, 0.01]}>
          <meshBasicMaterial color="#FFFDF8" />
        </mesh>
        <mesh geometry={sphere} position={[-0.28, 0.26, 0]} scale={[0.13, 0.13, 0.08]} castShadow>
          <meshStandardMaterial color={fur} roughness={0.82} metalness={0} />
        </mesh>
        <mesh geometry={sphere} position={[0.28, 0.26, 0]} scale={[0.13, 0.13, 0.08]} castShadow>
          <meshStandardMaterial color={fur} roughness={0.82} metalness={0} />
        </mesh>
        <mesh geometry={sphere} position={[-0.28, 0.26, 0.02]} scale={[0.07, 0.07, 0.04]}>
          <meshStandardMaterial color="#E8B89A" roughness={0.55} />
        </mesh>
        <mesh geometry={sphere} position={[0.28, 0.26, 0.02]} scale={[0.07, 0.07, 0.04]}>
          <meshStandardMaterial color="#E8B89A" roughness={0.55} />
        </mesh>
      </group>

      <mesh geometry={sphere} position={[-0.44, -0.12, 0.18]} rotation={[0, 0, 0.45]} scale={[0.14, 0.18, 0.14]} castShadow>
        <meshStandardMaterial color={fur} roughness={0.78} />
      </mesh>
      <mesh geometry={sphere} position={[0.44, -0.12, 0.18]} rotation={[0, 0, -0.45]} scale={[0.14, 0.18, 0.14]} castShadow>
        <meshStandardMaterial color={fur} roughness={0.78} />
      </mesh>
      <mesh geometry={sphere} position={[-0.18, -0.52, 0.14]} scale={[0.15, 0.1, 0.18]} castShadow>
        <meshStandardMaterial color="#5A3A28" roughness={0.7} />
      </mesh>
      <mesh geometry={sphere} position={[0.18, -0.52, 0.14]} scale={[0.15, 0.1, 0.18]} castShadow>
        <meshStandardMaterial color="#5A3A28" roughness={0.7} />
      </mesh>
      <mesh geometry={sphere} position={[0, -0.12, -0.52]} scale={[0.1, 0.1, 0.09]} castShadow>
        <meshStandardMaterial color={fur} roughness={0.82} />
      </mesh>
    </group>
  );
}
