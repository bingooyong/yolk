import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CuboidCollider, RigidBody, type RapierRigidBody } from "@react-three/rapier";
import * as THREE from "three";
import {
  HAMMERS,
  MOVERS,
  PENDULUMS,
  PICKUPS,
  PLATFORMS,
  RINGS,
  SPINNERS,
  moverVel,
} from "./course";
import { sim } from "./sim";

function checkerTexture() {
  const c = document.createElement("canvas");
  c.width = 8;
  c.height = 8;
  const g = c.getContext("2d")!;
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      g.fillStyle = (x + y) % 2 === 0 ? "#17141C" : "#FFF6EB";
      g.fillRect(x, y, 1, 1);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(10, 6);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function Track() {
  const checker = useMemo(() => checkerTexture(), []);
  return (
    <>
      {PLATFORMS.map((p) => (
        <RigidBody
          key={p.id}
          type="fixed"
          colliders={false}
          position={p.pos}
          userData={{ kind: p.kind === "static" ? "platform" : p.kind }}
        >
          <CuboidCollider args={[p.size[0] / 2, p.size[1] / 2, p.size[2] / 2]} />
          <mesh receiveShadow castShadow>
            <boxGeometry args={p.size} />
            <meshLambertMaterial color={p.color} />
          </mesh>
        </RigidBody>
      ))}

      <mesh position={[0, 0.02, 14]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[12, 4]} />
        <meshLambertMaterial map={checker} />
      </mesh>
      <mesh position={[0, 0.02, -184]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[10, 4]} />
        <meshLambertMaterial map={checker} />
      </mesh>

      {MOVERS.map((m) => (
        <MovingPad key={m.id} {...m} />
      ))}
      {HAMMERS.map((h) => (
        <Hammer key={h.id} {...h} />
      ))}
      {SPINNERS.map((s) => (
        <Spinner key={s.id} {...s} />
      ))}
      {PENDULUMS.map((p) => (
        <Pendulum key={p.id} {...p} />
      ))}
      {RINGS.map((r) => (
        <BoostRing key={r.id} pos={r.pos} />
      ))}
      {PICKUPS.map((p) => (
        <PickupMesh key={p.id} {...p} />
      ))}

      <FinishArch />
      <Decor />
      <CloudFloor />
    </>
  );
}

function MovingPad(m: (typeof MOVERS)[number]) {
  const ref = useRef<RapierRigidBody>(null);
  const last = useRef(new THREE.Vector3(...m.from));
  useFrame(({ clock }) => {
    const rb = ref.current;
    if (!rb) return;
    const u = (Math.sin((clock.elapsedTime * Math.PI * 2) / m.period + m.phase) + 1) / 2;
    const x = m.from[0] + (m.to[0] - m.from[0]) * u;
    const y = m.from[1] + (m.to[1] - m.from[1]) * u;
    const z = m.from[2] + (m.to[2] - m.from[2]) * u;
    const vx = (x - last.current.x) / (1 / 60);
    const vy = (y - last.current.y) / (1 / 60);
    const vz = (z - last.current.z) / (1 / 60);
    last.current.set(x, y, z);
    moverVel.set(m.id, { x: vx, y: vy, z: vz });
    rb.setNextKinematicTranslation({ x, y, z });
  });
  return (
    <RigidBody
      ref={ref}
      type="kinematicPosition"
      colliders={false}
      position={m.from}
      userData={{ kind: "platform", moverId: m.id }}
    >
      <CuboidCollider args={[m.size[0] / 2, m.size[1] / 2, m.size[2] / 2]} />
      <mesh castShadow receiveShadow>
        <boxGeometry args={m.size} />
        <meshLambertMaterial color={m.color} />
      </mesh>
    </RigidBody>
  );
}

function Hammer(h: (typeof HAMMERS)[number]) {
  const ref = useRef<RapierRigidBody>(null);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const e = useMemo(() => new THREE.Euler(), []);
  useFrame(({ clock }) => {
    e.set(0, clock.elapsedTime * h.speed + h.phase, 0);
    q.setFromEuler(e);
    ref.current?.setNextKinematicRotation(q);
  });
  return (
    <group>
      <mesh position={[h.pos[0], h.pos[1] + 0.2, h.pos[2]]} castShadow>
        <cylinderGeometry args={[0.14, 0.16, 2.2, 10]} />
        <meshLambertMaterial color="#FFF6EB" />
      </mesh>
      <RigidBody
        ref={ref}
        type="kinematicPosition"
        colliders={false}
        position={h.pos}
        userData={{ kind: "hazard" }}
      >
        <CuboidCollider args={[h.arm, 0.22, 0.22]} />
        <mesh castShadow>
          <boxGeometry args={[h.arm * 2, 0.44, 0.44]} />
          <meshLambertMaterial color="#E8614A" />
        </mesh>
        <mesh position={[h.arm * 0.92, 0, 0]} castShadow>
          <sphereGeometry args={[0.38, 14, 12]} />
          <meshLambertMaterial color="#E8614A" />
        </mesh>
        <mesh position={[-h.arm * 0.92, 0, 0]} castShadow>
          <sphereGeometry args={[0.38, 14, 12]} />
          <meshLambertMaterial color="#E8614A" />
        </mesh>
      </RigidBody>
    </group>
  );
}

function Spinner(s: (typeof SPINNERS)[number]) {
  const ref = useRef<RapierRigidBody>(null);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const e = useMemo(() => new THREE.Euler(), []);
  useFrame(({ clock }) => {
    e.set(0, clock.elapsedTime * s.speed + s.phase, 0);
    q.setFromEuler(e);
    ref.current?.setNextKinematicRotation(q);
  });
  return (
    <RigidBody
      ref={ref}
      type="kinematicPosition"
      colliders={false}
      position={s.pos}
      userData={{ kind: "hazard" }}
    >
      <CuboidCollider args={[s.arm, 0.16, 0.16]} />
      <CuboidCollider args={[0.16, 0.16, s.arm]} />
      <mesh castShadow>
        <boxGeometry args={[s.arm * 2, 0.32, 0.32]} />
        <meshLambertMaterial color="#E08AA4" />
      </mesh>
      <mesh castShadow>
        <boxGeometry args={[0.32, 0.32, s.arm * 2]} />
        <meshLambertMaterial color="#E08AA4" />
      </mesh>
    </RigidBody>
  );
}

function Pendulum(p: (typeof PENDULUMS)[number]) {
  const ref = useRef<RapierRigidBody>(null);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const e = useMemo(() => new THREE.Euler(), []);
  useFrame(({ clock }) => {
    const a = Math.sin(clock.elapsedTime * p.speed + p.phase) * 0.85;
    e.set(0, 0, a);
    q.setFromEuler(e);
    ref.current?.setNextKinematicRotation(q);
  });
  return (
    <RigidBody
      ref={ref}
      type="kinematicPosition"
      colliders={false}
      position={p.pos}
      userData={{ kind: "hazard" }}
    >
      <CuboidCollider args={[0.16, p.length / 2, 0.16]} position={[0, -p.length / 2, 0]} />
      <mesh position={[0, -p.length / 2, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.08, p.length, 8]} />
        <meshLambertMaterial color="#FFF6EB" />
      </mesh>
      <mesh position={[0, -p.length, 0]} castShadow>
        <sphereGeometry args={[0.48, 14, 12]} />
        <meshLambertMaterial color="#E8614A" />
      </mesh>
    </RigidBody>
  );
}

function PickupMesh({
  id,
  kind,
  pos,
}: {
  id: string;
  kind: "coin" | "shield" | "jelly";
  pos: [number, number, number];
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const g = ref.current;
    if (!g) return;
    const gone = sim.taken.has(id);
    g.visible = !gone;
    if (gone) return;
    g.position.y = pos[1] + Math.sin(clock.elapsedTime * 3 + pos[2]) * 0.12;
    g.rotation.y = clock.elapsedTime * 2.2;
  });
  const color = kind === "coin" ? "#E8C85A" : kind === "shield" ? "#5BAFE0" : "#E08AA4";
  return (
    <group ref={ref} position={pos}>
      {kind === "coin" ? (
        <mesh>
          <cylinderGeometry args={[0.28, 0.28, 0.08, 16]} />
          <meshLambertMaterial color={color} emissive={color} emissiveIntensity={0.2} />
        </mesh>
      ) : (
        <mesh>
          <icosahedronGeometry args={[0.28, 0]} />
          <meshLambertMaterial color={color} emissive={color} emissiveIntensity={0.18} />
        </mesh>
      )}
    </group>
  );
}

function BoostRing({ pos }: { pos: [number, number, number] }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.y = clock.elapsedTime * 1.6;
  });
  return (
    <mesh ref={ref} position={pos}>
      <torusGeometry args={[0.85, 0.1, 10, 24]} />
      <meshLambertMaterial color="#2DB8A1" emissive="#2DB8A1" emissiveIntensity={0.35} />
    </mesh>
  );
}

function FinishArch() {
  return (
    <group position={[0, 0, -186]}>
      <mesh position={[-5.2, 2.2, 0]} castShadow>
        <boxGeometry args={[0.7, 4.4, 0.7]} />
        <meshLambertMaterial color="#FFF6EB" />
      </mesh>
      <mesh position={[5.2, 2.2, 0]} castShadow>
        <boxGeometry args={[0.7, 4.4, 0.7]} />
        <meshLambertMaterial color="#FFF6EB" />
      </mesh>
      <mesh position={[0, 4.4, 0]} castShadow>
        <boxGeometry args={[11.2, 0.7, 0.7]} />
        <meshLambertMaterial color="#E8614A" />
      </mesh>
    </group>
  );
}

function CandyTree({ position }: { position: [number, number, number] }) {
  const hue = useMemo(() => ["#E08AA4", "#2DB8A1", "#5BAFE0", "#F0A07A", "#E8C85A"][Math.abs(Math.round(position[0] + position[2])) % 5], [position]);
  return (
    <group position={position}>
      <mesh position={[0, 0.7, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.16, 1.4, 8]} />
        <meshLambertMaterial color="#C4A574" />
      </mesh>
      <mesh position={[0, 1.6, 0]} castShadow>
        <sphereGeometry args={[0.7, 14, 12]} />
        <meshLambertMaterial color={hue} />
      </mesh>
      <mesh position={[0.4, 1.85, 0.1]} castShadow>
        <sphereGeometry args={[0.42, 12, 10]} />
        <meshLambertMaterial color={hue} />
      </mesh>
    </group>
  );
}

function Decor() {
  const trees: [number, number, number][] = [
    [-8.5, 0, 10],
    [8.2, 0, 8],
    [-7.5, 0, 2],
    [7.8, 0, -2],
    [-7.2, 0, -12],
    [7.4, 0, -18],
    [-6.8, 0, -40],
    [7.1, 0, -78],
    [-6.4, 0, -80],
    [7.6, 0, -180],
    [-7.4, 0, -182],
  ];
  return (
    <>
      {trees.map((p, i) => (
        <CandyTree key={i} position={p} />
      ))}
      {[-18, -40, -90, -140, -175].map((z, i) => (
        <mesh key={z} position={[i % 2 === 0 ? -16 : 16, 6 + (i % 3), z]}>
          <sphereGeometry args={[2.4, 12, 10]} />
          <meshLambertMaterial color="#F7FBFF" transparent opacity={0.55} />
        </mesh>
      ))}
    </>
  );
}

function CloudFloor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -11, -90]}>
      <planeGeometry args={[90, 280]} />
      <meshLambertMaterial color="#c5eefc" transparent opacity={0.5} />
    </mesh>
  );
}
