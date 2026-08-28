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
  TRAP_TILES,
  moverVel,
} from "./course";
import { crateTex, gridTex, skyTex, stripeTex } from "./look";
import { sim } from "./sim";

function checkerTexture() {
  const c = document.createElement("canvas");
  c.width = 8;
  c.height = 8;
  const g = c.getContext("2d")!;
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      g.fillStyle = (x + y) % 2 === 0 ? "#1A3A9A" : "#F4F7FF";
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

function Pad({
  size,
  color,
}: {
  size: [number, number, number];
  color: string;
}) {
  const side = useMemo(() => new THREE.Color(color).multiplyScalar(0.72).getStyle(), [color]);
  return (
    <group>
      <mesh receiveShadow castShadow>
        <boxGeometry args={size} />
        <meshLambertMaterial color={side} />
      </mesh>
      <mesh position={[0, size[1] / 2 + 0.015, 0]} receiveShadow>
        <boxGeometry args={[size[0] - 0.06, 0.05, size[2] - 0.06]} />
        <meshLambertMaterial color={color} />
      </mesh>
    </group>
  );
}

export function Track() {
  const checker = useMemo(() => checkerTexture(), []);
  const floor = useMemo(() => gridTex(), []);
  return (
    <>
      <SkyDome />
      <NeonRails />
      {PLATFORMS.map((p) => (
        <RigidBody
          key={p.id}
          type="fixed"
          colliders={false}
          position={p.pos}
          userData={{ kind: p.kind === "static" ? "platform" : p.kind }}
        >
          <CuboidCollider args={[p.size[0] / 2, p.size[1] / 2, p.size[2] / 2]} />
          <Pad size={p.size} color={p.color} />
        </RigidBody>
      ))}

      <mesh position={[0, 0.04, 8]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[18, 18]} />
        <meshLambertMaterial map={floor} />
      </mesh>
      <mesh position={[0, 0.03, 14]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[10, 4]} />
        <meshLambertMaterial map={checker} />
      </mesh>
      <mesh position={[0, 0.03, -184]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[10, 4]} />
        <meshLambertMaterial map={checker} />
      </mesh>

      {TRAP_TILES.map((t) => (
        <TrapTile key={t.id} {...t} />
      ))}
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

function TrapTile(t: (typeof TRAP_TILES)[number]) {
  const ref = useRef<RapierRigidBody>(null);
  const armed = useRef(0);
  const dropped = useRef(false);
  const tex = useMemo(() => stripeTex(), []);
  useFrame((_, delta) => {
    const rb = ref.current;
    if (!rb || dropped.current) return;
    const p = sim.racers.find((r) => r.isPlayer);
    if (t.drops && p && Math.abs(p.x - t.pos[0]) < 1.05 && Math.abs(p.z - t.pos[2]) < 1.05 && p.y < 1.6) {
      armed.current += delta;
    }
    if (armed.current > t.delay) {
      dropped.current = true;
    }
    if (dropped.current) {
      const cur = rb.translation();
      rb.setNextKinematicTranslation({ x: cur.x, y: cur.y - 16 * delta, z: cur.z });
    }
  });
  return (
    <RigidBody
      ref={ref}
      type="kinematicPosition"
      colliders={false}
      position={t.pos}
      userData={{ kind: "platform" }}
    >
      <CuboidCollider args={[t.size[0] / 2, t.size[1] / 2, t.size[2] / 2]} />
      <mesh receiveShadow castShadow>
        <boxGeometry args={t.size} />
        <meshLambertMaterial map={tex} />
      </mesh>
    </RigidBody>
  );
}

function NeonRails() {
  return (
    <group>
      {([-10.2, 10.2] as const).map((x) => (
        <group key={x}>
          <mesh position={[x, 1.15, -86]} castShadow>
            <boxGeometry args={[0.55, 2.5, 210]} />
            <meshLambertMaterial color="#163A9A" />
          </mesh>
          <mesh position={[x > 0 ? x - 0.3 : x + 0.3, 1.85, -86]}>
            <boxGeometry args={[0.1, 0.16, 210]} />
            <meshBasicMaterial color="#7CF0FF" />
          </mesh>
          <mesh position={[x > 0 ? x - 0.3 : x + 0.3, 0.55, -86]}>
            <boxGeometry args={[0.08, 0.1, 210]} />
            <meshBasicMaterial color="#FF8AD4" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function SkyDome() {
  const tex = useMemo(() => skyTex(), []);
  return (
    <mesh scale={[-1, 1, 1]}>
      <sphereGeometry args={[160, 24, 16]} />
      <meshBasicMaterial map={tex} side={THREE.BackSide} fog={false} />
    </mesh>
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
  const crate = useMemo(() => crateTex(), []);
  useFrame(({ clock }) => {
    const g = ref.current;
    if (!g) return;
    const gone = sim.taken.has(id);
    g.visible = !gone;
    if (gone) return;
    g.position.y = pos[1] + Math.sin(clock.elapsedTime * 3 + pos[2]) * 0.1;
    g.rotation.y = clock.elapsedTime * 1.4;
  });
  if (kind === "coin") {
    return (
      <group ref={ref} position={pos}>
        <mesh>
          <cylinderGeometry args={[0.3, 0.3, 0.08, 20]} />
          <meshLambertMaterial color="#E8C85A" emissive="#E8C85A" emissiveIntensity={0.35} />
        </mesh>
      </group>
    );
  }
  return (
    <group ref={ref} position={pos}>
      <mesh castShadow>
        <boxGeometry args={[0.72, 0.72, 0.72]} />
        <meshLambertMaterial map={crate} />
      </mesh>
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
    <group position={[0, 0, -188]}>
      <mesh position={[0, 6.2, -4]}>
        <boxGeometry args={[18, 12, 0.6]} />
        <meshLambertMaterial color="#142A88" />
      </mesh>
      {[-6, -2, 2, 6].map((x, i) =>
        [2, 5, 8].map((y) => (
          <mesh key={`${x}-${y}`} position={[x + (i % 2) * 0.4, y, -3.6]} rotation={[0, 0, Math.PI / 4]}>
            <boxGeometry args={[1.6, 1.6, 0.2]} />
            <meshBasicMaterial color={((x + y) / 2) % 2 === 0 ? "#5CF0FF" : "#C9A6FF"} />
          </mesh>
        )),
      )}
      <mesh position={[-7.2, 3.2, 0]} castShadow>
        <boxGeometry args={[0.8, 6.4, 0.8]} />
        <meshLambertMaterial color="#F4F7FF" />
      </mesh>
      <mesh position={[7.2, 3.2, 0]} castShadow>
        <boxGeometry args={[0.8, 6.4, 0.8]} />
        <meshLambertMaterial color="#F4F7FF" />
      </mesh>
      <mesh position={[0, 6.4, 0]}>
        <boxGeometry args={[15.2, 0.7, 0.8]} />
        <meshLambertMaterial color="#FF6B8A" />
      </mesh>
    </group>
  );
}

function CandyTree({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 1.6, 0]} castShadow>
        <cylinderGeometry args={[0.28, 0.4, 3.2, 8]} />
        <meshLambertMaterial color="#1A3A9A" />
      </mesh>
      <mesh position={[0, 3.3, 0]}>
        <boxGeometry args={[0.12, 0.12, 1.4]} />
        <meshBasicMaterial color="#7CF0FF" />
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
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -12, -90]}>
      <planeGeometry args={[90, 280]} />
      <meshLambertMaterial color="#6BB8F0" transparent opacity={0.35} />
    </mesh>
  );
}
