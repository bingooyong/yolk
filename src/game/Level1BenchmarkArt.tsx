import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { Platform } from "./levels";
import { createLevel1BenchmarkLayout, type InstancedPlacement } from "./level1-benchmark";

type BenchmarkResources = {
  grassGeometry: THREE.BufferGeometry;
  flowerGeometry: THREE.BufferGeometry;
  rockGeometry: THREE.BufferGeometry;
  caneGeometry: THREE.BufferGeometry;
  gumdropGeometry: THREE.BufferGeometry;
  hillGeometry: THREE.BufferGeometry;
  cloudGeometry: THREE.BufferGeometry;
  chevronGeometry: THREE.BufferGeometry;
  edgeStripGeometry: THREE.BufferGeometry;
  flagGeometry: THREE.BufferGeometry;
  grassMaterial: THREE.Material;
  flowerMaterial: THREE.Material;
  rockMaterial: THREE.Material;
  caneMaterial: THREE.Material;
  gumdropMaterial: THREE.Material;
  hillMaterial: THREE.Material;
  cloudMaterial: THREE.Material;
  chevronMaterial: THREE.Material;
  edgeStripMaterial: THREE.Material;
  edgeFlagMaterial: THREE.Material;
};

function makeChevronGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.42, -0.24);
  shape.lineTo(0, 0.04);
  shape.lineTo(0.42, -0.24);
  shape.lineTo(0.42, 0.06);
  shape.lineTo(0, 0.34);
  shape.lineTo(-0.42, 0.06);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.025,
    bevelEnabled: false,
  });
  geometry.rotateX(-Math.PI / 2);
  geometry.center();
  return geometry;
}

function makeFlagGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.16, -0.24);
  shape.lineTo(0.24, 0);
  shape.lineTo(-0.16, 0.24);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.035,
    bevelEnabled: false,
  });
  geometry.center();
  return geometry;
}

function createBenchmarkResources(): BenchmarkResources {
  return {
    grassGeometry: new THREE.ConeGeometry(0.085, 0.46, 5, 1),
    flowerGeometry: new THREE.DodecahedronGeometry(0.13, 0),
    rockGeometry: new THREE.DodecahedronGeometry(0.34, 0),
    caneGeometry: new THREE.CapsuleGeometry(0.14, 1.05, 4, 10),
    gumdropGeometry: new THREE.SphereGeometry(0.48, 14, 11),
    hillGeometry: new THREE.ConeGeometry(1, 1, 9, 1),
    cloudGeometry: new THREE.SphereGeometry(0.5, 12, 9),
    chevronGeometry: makeChevronGeometry(),
    edgeStripGeometry: new THREE.BoxGeometry(0.14, 0.022, 1),
    flagGeometry: makeFlagGeometry(),
    grassMaterial: new THREE.MeshLambertMaterial({ color: "#71C96F" }),
    flowerMaterial: new THREE.MeshStandardMaterial({
      color: "#FFFFFF",
      roughness: 0.38,
      metalness: 0.04,
    }),
    rockMaterial: new THREE.MeshStandardMaterial({
      color: "#8D9AA4",
      roughness: 0.88,
      metalness: 0.03,
    }),
    caneMaterial: new THREE.MeshStandardMaterial({
      color: "#FF8FB0",
      roughness: 0.26,
      metalness: 0.08,
    }),
    gumdropMaterial: new THREE.MeshStandardMaterial({
      color: "#FFFFFF",
      roughness: 0.24,
      metalness: 0.02,
    }),
    hillMaterial: new THREE.MeshLambertMaterial({ color: "#FFFFFF" }),
    cloudMaterial: new THREE.MeshLambertMaterial({
      color: "#FFFFFF",
      transparent: true,
      opacity: 0.92,
    }),
    chevronMaterial: new THREE.MeshStandardMaterial({
      color: "#FFF6A8",
      emissive: "#FFC94F",
      emissiveIntensity: 0.78,
      roughness: 0.34,
      metalness: 0.05,
    }),
    edgeStripMaterial: new THREE.MeshBasicMaterial({
      color: "#72F4E4",
      transparent: true,
      opacity: 0.88,
    }),
    edgeFlagMaterial: new THREE.MeshStandardMaterial({
      color: "#FFFFFF",
      emissive: "#222222",
      emissiveIntensity: 0.16,
      roughness: 0.42,
      metalness: 0.02,
    }),
  };
}

function disposeBenchmarkResources(resources: BenchmarkResources) {
  for (const value of Object.values(resources)) {
    value.dispose();
  }
}

function StaticInstances({
  placements,
  geometry,
  material,
  renderOrder = 0,
}: {
  placements: InstancedPlacement[];
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  renderOrder?: number;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;

    const matrix = new THREE.Matrix4();
    const rotation = new THREE.Quaternion();
    const position = new THREE.Vector3();
    const scale = new THREE.Vector3();
    const color = new THREE.Color();

    placements.forEach((item, index) => {
      position.set(...item.position);
      rotation.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, item.rotationY);
      scale.set(...item.scale);
      matrix.compose(position, rotation, scale);
      mesh.setMatrixAt(index, matrix);
      if (item.color) mesh.setColorAt(index, color.set(item.color));
    });

    mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [placements]);

  if (placements.length === 0) return null;

  return (
    <instancedMesh
      ref={ref}
      args={[geometry, material, placements.length]}
      castShadow={false}
      receiveShadow={false}
      renderOrder={renderOrder}
    />
  );
}

function BenchmarkGround() {
  return (
    <group>
      {([-16.9, 16.9] as const).map((x) => (
        <mesh key={x} position={[x, -0.08, -32]} receiveShadow={false}>
          <boxGeometry args={[13.2, 0.12, 110]} />
          <meshLambertMaterial color={x < 0 ? "#76CD91" : "#68C383"} />
        </mesh>
      ))}
    </group>
  );
}

export function Level1FinishGate({ z }: { z: number }) {
  const materials = useMemo(
    () => ({
      pillar: new THREE.MeshStandardMaterial({
        color: "#FFF6EB",
        roughness: 0.48,
        metalness: 0.05,
      }),
      cap: new THREE.MeshStandardMaterial({
        color: "#FF6B84",
        roughness: 0.34,
        metalness: 0.04,
      }),
      banner: new THREE.MeshStandardMaterial({
        color: "#FF6B84",
        roughness: 0.36,
        metalness: 0.03,
      }),
      glow: new THREE.MeshBasicMaterial({
        color: "#FFF3B0",
        transparent: true,
        opacity: 0.52,
      }),
    }),
    [],
  );

  useEffect(
    () => () => {
      for (const material of Object.values(materials)) material.dispose();
    },
    [materials],
  );

  return (
    <group position={[0, 0, z]}>
      <mesh position={[0, 0.018, 0]} rotation={[-Math.PI / 2, 0, 0]} material={materials.glow}>
        <planeGeometry args={[10.8, 0.42]} />
      </mesh>
      {([-5.4, 5.4] as const).map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh position={[0, 2.45, 0]} castShadow material={materials.pillar}>
            <cylinderGeometry args={[0.36, 0.46, 4.9, 12]} />
          </mesh>
          <mesh position={[0, 5.05, 0]} castShadow material={materials.cap}>
            <sphereGeometry args={[0.56, 14, 11]} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 4.82, 0]} castShadow material={materials.banner}>
        <boxGeometry args={[11.2, 0.68, 0.3]} />
      </mesh>
      <mesh position={[0, 4.82, 0.18]} material={materials.glow}>
        <boxGeometry args={[10.5, 0.24, 0.035]} />
      </mesh>
    </group>
  );
}

export function Level1BenchmarkArt({
  platforms,
  finishZ,
}: {
  platforms: Platform[];
  finishZ: number;
}) {
  const resources = useMemo(createBenchmarkResources, []);
  const layout = useMemo(
    () => createLevel1BenchmarkLayout(platforms, finishZ),
    [platforms, finishZ],
  );

  useEffect(() => () => disposeBenchmarkResources(resources), [resources]);

  return (
    <group>
      <BenchmarkGround />
      <StaticInstances
        placements={layout.clouds}
        geometry={resources.cloudGeometry}
        material={resources.cloudMaterial}
        renderOrder={-4}
      />
      <StaticInstances
        placements={layout.hills}
        geometry={resources.hillGeometry}
        material={resources.hillMaterial}
        renderOrder={-3}
      />
      <StaticInstances
        placements={layout.gumdrops}
        geometry={resources.gumdropGeometry}
        material={resources.gumdropMaterial}
      />
      <StaticInstances
        placements={layout.candyCanes}
        geometry={resources.caneGeometry}
        material={resources.caneMaterial}
      />
      <StaticInstances
        placements={layout.rocks}
        geometry={resources.rockGeometry}
        material={resources.rockMaterial}
      />
      <StaticInstances
        placements={layout.flowers}
        geometry={resources.flowerGeometry}
        material={resources.flowerMaterial}
      />
      <StaticInstances
        placements={layout.grassTufts}
        geometry={resources.grassGeometry}
        material={resources.grassMaterial}
      />
      <StaticInstances
        placements={layout.routeChevrons}
        geometry={resources.chevronGeometry}
        material={resources.chevronMaterial}
        renderOrder={1}
      />
      <StaticInstances
        placements={layout.edgeLightStrips}
        geometry={resources.edgeStripGeometry}
        material={resources.edgeStripMaterial}
        renderOrder={2}
      />
      <StaticInstances
        placements={layout.edgeFlags}
        geometry={resources.flagGeometry}
        material={resources.edgeFlagMaterial}
        renderOrder={2}
      />
      <Level1FinishGate z={finishZ} />
    </group>
  );
}
