import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CuboidCollider, RigidBody, type RapierRigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { currentLevel, moverVel, type TrapTileDef } from "./course";
import type { Hammer, Mover, Pendulum, Spinner } from "./levels";
import { crateTex, gridTex, skyTex, stripeTex } from "./look";
import { sim } from "./sim";
import { useGameStore } from "./store";

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
  const levelId = useGameStore((s) => s.levelId);
  const raceId = useGameStore((s) => s.raceId);
  const level = currentLevel();
  const checker = useMemo(() => checkerTexture(), []);
  const floor = useMemo(() => gridTex(), []);
  return (
    <group key={`${levelId}-${raceId}`}>
      <SkyDome />
      <NeonRails color={level.theme.rail} neon={level.theme.neon} />
      {level.platforms.map((p) => {
        const kind =
          p.kind === "ice" || p.kind === "bounce" || p.kind === "conveyor" ? p.kind : "platform";
        return (
          <RigidBody
            key={p.id}
            type="fixed"
            colliders={false}
            position={p.pos}
            userData={{ kind }}
          >
            <CuboidCollider args={[p.size[0] / 2, p.size[1] / 2, p.size[2] / 2]} />
            <Pad size={p.size} color={p.color} />
          </RigidBody>
        );
      })}

      <mesh position={[0, 0.04, level.startZ]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[16, 16]} />
        <meshLambertMaterial map={floor} color={level.theme.ground} />
      </mesh>
      <mesh position={[0, 0.03, level.startZ + 6]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[8, 4]} />
        <meshLambertMaterial map={checker} />
      </mesh>
      <mesh position={[0, 0.03, level.finishZ]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[10, 4]} />
        <meshLambertMaterial map={checker} />
      </mesh>

      {level.traps.map((t) => (
        <TrapTile key={t.id} {...t} />
      ))}
      {level.movers.map((m) => (
        <MovingPad key={m.id} {...m} />
      ))}
      {level.hammers.map((h) => (
        <Hammer key={h.id} {...h} />
      ))}
      {level.spinners.map((s) => (
        <Spinner key={s.id} {...s} />
      ))}
      {level.pendulums.map((p) => (
        <Pendulum key={p.id} {...p} />
      ))}
      {level.rings.map((r) => (
        <BoostRing key={r.id} pos={r.pos} />
      ))}
      {level.pickups.map((p) => (
        <PickupMesh key={p.id} {...p} />
      ))}

      <FinishArch z={level.finishZ} />
      <Decor theme={level.theme.id} finishZ={level.finishZ} />
      <CloudFloor />
    </group>
  );
}

function TrapTile(t: TrapTileDef) {
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

function NeonRails({ color, neon }: { color: string; neon: string }) {
  return (
    <group>
      {([-10.2, 10.2] as const).map((x) => (
        <group key={x}>
          <mesh position={[x, 1.15, -40]} castShadow>
            <boxGeometry args={[0.55, 2.5, 130]} />
            <meshLambertMaterial color={color} />
          </mesh>
          <mesh position={[x > 0 ? x - 0.3 : x + 0.3, 1.85, -40]}>
            <boxGeometry args={[0.1, 0.16, 130]} />
            <meshBasicMaterial color={neon} />
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

function MovingPad(m: Mover) {
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

function Hammer(h: Hammer) {
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

function Spinner(s: Spinner) {
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

function Pendulum(p: Pendulum) {
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

function FinishArch({ z }: { z: number }) {
  return (
    <group position={[0, 0, z - 2]}>
      <mesh position={[-5.4, 2.4, 0]} castShadow>
        <boxGeometry args={[0.7, 4.8, 0.7]} />
        <meshLambertMaterial color="#FFF6EB" />
      </mesh>
      <mesh position={[5.4, 2.4, 0]} castShadow>
        <boxGeometry args={[0.7, 4.8, 0.7]} />
        <meshLambertMaterial color="#FFF6EB" />
      </mesh>
      <mesh position={[0, 4.8, 0]}>
        <boxGeometry args={[11.6, 0.7, 0.7]} />
        <meshLambertMaterial color="#E8614A" />
      </mesh>
    </group>
  );
}

function CandyTree({
  position,
  color,
  glow,
}: {
  position: [number, number, number];
  color: string;
  glow: string;
}) {
  return (
    <group position={position}>
      <mesh position={[0, 1.4, 0]} castShadow>
        <cylinderGeometry args={[0.26, 0.38, 2.8, 8]} />
        <meshLambertMaterial color={color} />
      </mesh>
      <mesh position={[0, 2.9, 0]}>
        <sphereGeometry args={[0.55, 12, 10]} />
        <meshLambertMaterial color={glow} />
      </mesh>
    </group>
  );
}

function Decor({ theme, finishZ }: { theme: string; finishZ: number }) {
  const color =
    theme === "ice" ? "#8EC8F0" : theme === "factory" ? "#6A7A90" : theme === "pirate" ? "#8B6914" : "#3DCFB0";
  const glow =
    theme === "ice" ? "#FFFFFF" : theme === "dessert" ? "#E08AA4" : theme === "finale" ? "#E8C85A" : "#FFF6A8";
  const zs = [8, -6, -20, -40, Math.max(finishZ + 8, -60)];
  return (
    <>
      {zs.map((z, i) => (
        <CandyTree
          key={i}
          position={[i % 2 === 0 ? -8.2 : 8.2, 0, z]}
          color={color}
          glow={glow}
        />
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
