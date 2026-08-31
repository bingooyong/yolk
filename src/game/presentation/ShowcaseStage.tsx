import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { sim } from "../sim";

const disc = new THREE.CircleGeometry(1.35, 48);
const ring = new THREE.RingGeometry(1.32, 1.48, 48);

export function ShowcaseStage({
  collider = true,
  meadow = false,
}: {
  collider?: boolean;
  meadow?: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: meadow ? "#e2d2b6" : "#2a2430",
        roughness: meadow ? 0.68 : 0.62,
        metalness: 0.08,
      }),
    [meadow],
  );
  const rim = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#c9a227",
        roughness: 0.35,
        metalness: 0.55,
        emissive: "#6a5414",
        emissiveIntensity: 0.25,
      }),
    [],
  );

  useFrame(() => {
    const p = sim.racers.find((r) => r.isPlayer);
    if (!group.current || !p) return;
    group.current.position.set(p.x, 0, p.z);
  });

  return (
    <>
      {collider ? (
        <RigidBody type="fixed" colliders={false}>
          <CuboidCollider args={[60, 0.4, 60]} position={[0, -0.4, 0]} />
        </RigidBody>
      ) : null}
      <group ref={group}>
        <mesh
          geometry={disc}
          material={mat}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.002, 0]}
          receiveShadow
        />
        <mesh geometry={ring} material={rim} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]} />
      </group>
    </>
  );
}
