import { useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  EGG_VISUAL_GROUND_OFFSET,
  getCharacterPose,
  type CharacterPresentation,
} from "../character-presentation";
import { glowTex } from "../look";

const body = new THREE.SphereGeometry(0.5, 28, 22);
body.scale(1.08, 1.14, 1.02);
const sphere = new THREE.SphereGeometry(1, 16, 14);
const ear = new THREE.SphereGeometry(1, 12, 10);
ear.scale(0.14, 0.38, 0.1);

type Props = {
  color: string;
  isPlayer?: boolean;
  presentation: RefObject<CharacterPresentation>;
  skinId?: string;
  accessory?: string;
};

export function RabbitMesh({ color, isPlayer = false, presentation }: Props) {
  const fur = color || "#F4E4D4";
  const blush = "#E8A8B4";
  const group = useRef<THREE.Group>(null);
  const ears = useRef<THREE.Group>(null);
  const glow = useMemo(() => glowTex(), []);

  useFrame(({ clock }) => {
    const pose = getCharacterPose(presentation.current, clock.elapsedTime, "bouncy");
    if (!group.current) return;
    group.current.position.y = EGG_VISUAL_GROUND_OFFSET + pose.lift;
    group.current.scale.set(pose.scaleX, pose.scaleY, pose.scaleZ);
    if (ears.current) {
      ears.current.rotation.z = Math.sin(clock.elapsedTime * 3.1) * 0.06;
      ears.current.rotation.x = Math.sin(clock.elapsedTime * 2.2) * 0.04;
    }
  });

  return (
    <group ref={group} position={[0, EGG_VISUAL_GROUND_OFFSET, 0]}>
      {isPlayer && (
        <sprite position={[0, 0.06, 0]} scale={[2.15, 2.15, 1]}>
          <spriteMaterial map={glow} color={fur} transparent opacity={0.26} depthWrite={false} blending={THREE.AdditiveBlending} />
        </sprite>
      )}

      <mesh geometry={body} castShadow>
        <meshStandardMaterial color={fur} roughness={0.72} metalness={0.02} />
      </mesh>
      <mesh geometry={sphere} position={[0, -0.08, 0.3]} scale={[0.36, 0.34, 0.22]} castShadow>
        <meshStandardMaterial color="#FFF6EB" roughness={0.55} metalness={0} />
      </mesh>

      <group position={[0, 0.32, 0.1]}>
        <mesh geometry={sphere} scale={[0.34, 0.3, 0.3]} castShadow>
          <meshStandardMaterial color={fur} roughness={0.7} metalness={0.02} />
        </mesh>
        <mesh geometry={sphere} position={[0, -0.04, 0.24]} scale={[0.18, 0.14, 0.14]}>
          <meshStandardMaterial color="#FFF6EB" roughness={0.48} />
        </mesh>
        <mesh geometry={sphere} position={[0, -0.05, 0.36]} scale={[0.05, 0.04, 0.04]}>
          <meshStandardMaterial color="#E08AA4" roughness={0.35} />
        </mesh>
        <mesh geometry={sphere} position={[-0.1, 0.06, 0.22]} scale={[0.08, 0.09, 0.045]}>
          <meshStandardMaterial color="#1A1412" roughness={0.32} />
        </mesh>
        <mesh geometry={sphere} position={[0.1, 0.06, 0.22]} scale={[0.08, 0.09, 0.045]}>
          <meshStandardMaterial color="#1A1412" roughness={0.32} />
        </mesh>
        <mesh geometry={sphere} position={[-0.1, 0.06, 0.255]} scale={[0.06, 0.07, 0.04]}>
          <meshPhysicalMaterial color="#FFFDF8" roughness={0.16} metalness={0} clearcoat={0.7} clearcoatRoughness={0.14} />
        </mesh>
        <mesh geometry={sphere} position={[0.1, 0.06, 0.255]} scale={[0.06, 0.07, 0.04]}>
          <meshPhysicalMaterial color="#FFFDF8" roughness={0.16} metalness={0} clearcoat={0.7} clearcoatRoughness={0.14} />
        </mesh>
        <mesh geometry={sphere} position={[-0.09, 0.05, 0.29]} scale={[0.028, 0.034, 0.018]}>
          <meshStandardMaterial color="#1A1412" roughness={0.28} />
        </mesh>
        <mesh geometry={sphere} position={[0.09, 0.05, 0.29]} scale={[0.028, 0.034, 0.018]}>
          <meshStandardMaterial color="#1A1412" roughness={0.28} />
        </mesh>
        <mesh geometry={sphere} position={[-0.16, -0.02, 0.22]} scale={[0.06, 0.04, 0.03]}>
          <meshStandardMaterial color={blush} roughness={0.6} />
        </mesh>
        <mesh geometry={sphere} position={[0.16, -0.02, 0.22]} scale={[0.06, 0.04, 0.03]}>
          <meshStandardMaterial color={blush} roughness={0.6} />
        </mesh>

        <group ref={ears}>
          <mesh geometry={ear} position={[-0.16, 0.42, -0.02]} rotation={[0.15, 0, -0.18]} castShadow>
            <meshStandardMaterial color={fur} roughness={0.74} />
          </mesh>
          <mesh geometry={ear} position={[0.16, 0.42, -0.02]} rotation={[0.15, 0, 0.18]} castShadow>
            <meshStandardMaterial color={fur} roughness={0.74} />
          </mesh>
          <mesh geometry={ear} position={[-0.16, 0.4, 0.02]} rotation={[0.15, 0, -0.18]} scale={[0.55, 0.82, 0.45]}>
            <meshStandardMaterial color="#F0B8C4" roughness={0.5} />
          </mesh>
          <mesh geometry={ear} position={[0.16, 0.4, 0.02]} rotation={[0.15, 0, 0.18]} scale={[0.55, 0.82, 0.45]}>
            <meshStandardMaterial color="#F0B8C4" roughness={0.5} />
          </mesh>
        </group>
      </group>

      <mesh geometry={sphere} position={[-0.4, -0.14, 0.16]} rotation={[0, 0, 0.4]} scale={[0.12, 0.16, 0.12]} castShadow>
        <meshStandardMaterial color={fur} roughness={0.72} />
      </mesh>
      <mesh geometry={sphere} position={[0.4, -0.14, 0.16]} rotation={[0, 0, -0.4]} scale={[0.12, 0.16, 0.12]} castShadow>
        <meshStandardMaterial color={fur} roughness={0.72} />
      </mesh>
      <mesh geometry={sphere} position={[-0.16, -0.52, 0.12]} scale={[0.13, 0.09, 0.16]} castShadow>
        <meshStandardMaterial color="#E8C8B4" roughness={0.62} />
      </mesh>
      <mesh geometry={sphere} position={[0.16, -0.52, 0.12]} scale={[0.13, 0.09, 0.16]} castShadow>
        <meshStandardMaterial color="#E8C8B4" roughness={0.62} />
      </mesh>
      <mesh geometry={sphere} position={[0, -0.08, -0.5]} scale={[0.12, 0.12, 0.1]} castShadow>
        <meshStandardMaterial color="#FFF6EB" roughness={0.68} />
      </mesh>
    </group>
  );
}
