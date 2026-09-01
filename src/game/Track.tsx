import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  CuboidCollider,
  RigidBody,
  useBeforePhysicsStep,
  type RapierRigidBody,
} from "@react-three/rapier";
import * as THREE from "three";
import { PHYSICS_DT } from "@/engine/pipeline";
import { VISUAL_FOUNDATION } from "@/engine/visualProfile";
import { currentLevel, moverVel, type TrapTileDef, type LowGate } from "./course";
import type { Hammer, Mover, Pendulum, Spinner, WindZone } from "./levels";
import { crateTex, skyTex, stripeTex } from "./look";
import { Level1BenchmarkArt } from "./Level1BenchmarkArt";
import { sim } from "./sim";
import { useGameStore } from "./store";

const _side = new THREE.Color();

type MeadowPadRole = "checkpoint" | "field" | "lift" | "shortcut" | "bounce" | "finish";

function meadowPadRole(platformId: string): MeadowPadRole {
  if (platformId.startsWith("pounce") || platformId.startsWith("risk")) return "shortcut";
  if (platformId === "step1" || platformId === "gapA") return "lift";
  if (platformId === "jelly") return "bounce";
  if (platformId === "start" || platformId === "plaza" || platformId === "path2") return "checkpoint";
  if (platformId === "final") return "finish";
  if (platformId.startsWith("rec")) return "field";
  return "field";
}

function Pad({
  size,
  color,
  role,
  ice,
  metal,
  bounce,
}: {
  size: [number, number, number];
  color: string;
  role?: MeadowPadRole;
  ice?: boolean;
  metal?: boolean;
  bounce?: boolean;
}) {
  const materials = useMemo(() => {
    if (ice && !role) {
      const top = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.16,
        metalness: 0.28,
        emissive: "#9fd4f5",
        emissiveIntensity: 0.12,
      });
      const side = new THREE.MeshLambertMaterial({
        color: _side.set(color).multiplyScalar(0.62),
      });
      return [side, side, top, side, side, side];
    }
    if (metal && !role) {
      const top = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.32,
        metalness: 0.34,
        emissive: "#E8C85A",
        emissiveIntensity: 0.06,
      });
      const side = new THREE.MeshLambertMaterial({
        color: _side.set(color).multiplyScalar(0.58),
      });
      return [side, side, top, side, side, side];
    }
    if (bounce && !role) {
      const top = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.28,
        metalness: 0.02,
        emissive: "#FF9BB4",
        emissiveIntensity: 0.22,
      });
      const side = new THREE.MeshLambertMaterial({
        color: _side.set(color).multiplyScalar(0.62),
      });
      return [side, side, top, side, side, side];
    }
    if (!role) {
      const top = new THREE.MeshLambertMaterial({ color });
      const side = new THREE.MeshLambertMaterial({
        color: _side.set(color).multiplyScalar(0.72),
      });
      return [side, side, top, side, side, side];
    }

    const palette = {
      checkpoint: { top: "#F7DF8A", side: "#C9A450" },
      field: { top: "#7BD9A4", side: "#3D8D69" },
      lift: { top: "#A5EBAD", side: "#54A46B" },
      shortcut: { top: "#F7C36A", side: "#B77A3B" },
      bounce: { top: "#E993AC", side: "#A14D6B" },
      finish: { top: "#FBE49A", side: "#CBA655" },
    }[role];
    const top =
      role === "bounce"
        ? new THREE.MeshStandardMaterial({
            color: palette.top,
            emissive: "#FF9BB4",
            emissiveIntensity: 0.24,
            roughness: 0.29,
            metalness: 0.02,
          })
        : role === "shortcut"
          ? new THREE.MeshStandardMaterial({
              color: palette.top,
              emissive: "#8C5A19",
              emissiveIntensity: 0.1,
              roughness: 0.52,
              metalness: 0.04,
            })
          : new THREE.MeshStandardMaterial({
              color: palette.top,
              roughness: role === "checkpoint" || role === "finish" ? 0.64 : 0.8,
              metalness: 0.03,
            });
    const side = new THREE.MeshLambertMaterial({ color: palette.side });
    return [side, side, top, side, side, side];
  }, [color, role, ice, metal, bounce]);

  useEffect(
    () => () => {
      for (const material of new Set(materials)) material.dispose();
    },
    [materials],
  );

  return (
    <mesh receiveShadow castShadow material={materials}>
      <boxGeometry args={size} />
    </mesh>
  );
}

export function Track() {
  const levelId = useGameStore((s) => s.levelId);
  const raceId = useGameStore((s) => s.raceId);
  const level = currentLevel();
  const isLevel1Benchmark = level.id === "meadow";
  return (
    <group key={`${levelId}-${raceId}`}>
      <SkyDome />
      {level.platforms.map((p) => {
        const kind =
          p.kind === "ice" || p.kind === "bounce" || p.kind === "conveyor" ? p.kind : "platform";
        return (
          <RigidBody key={p.id} type="fixed" colliders={false} position={p.pos} userData={{ kind }}>
            <CuboidCollider args={[p.size[0] / 2, p.size[1] / 2, p.size[2] / 2 + 0.08]} />
            <Pad
              size={p.size}
              color={p.color}
              ice={p.kind === "ice"}
              metal={level.id === "factory" && !p.id.startsWith("rec")}
              bounce={p.kind === "bounce"}
              role={isLevel1Benchmark ? meadowPadRole(p.id) : undefined}
            />
          </RigidBody>
        );
      })}

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
        <BoostRing key={r.id} pos={r.pos} benchmark={isLevel1Benchmark} />
      ))}
      {level.pickups.map((p) => (
        <PickupMesh key={p.id} {...p} benchmark={isLevel1Benchmark} />
      ))}
      {level.gates.map((g) => (
        <CandyLowGate key={g.id} gate={g} />
      ))}
      {level.winds.map((w) => (
        <WindGust key={w.id} {...w} />
      ))}

      {isLevel1Benchmark ? (
        <Level1BenchmarkArt platforms={level.platforms} finishZ={level.finishZ} />
      ) : (
        <>
          <FinishArch z={level.finishZ} />
          <ThemeWorld theme={level.theme.id} finishZ={level.finishZ} />
        </>
      )}
      <CloudFloor />
    </group>
  );
}

function TrapTile(t: TrapTileDef) {
  const ref = useRef<RapierRigidBody>(null);
  const armed = useRef(0);
  const dropped = useRef(false);
  const elapsed = useRef(0);
  const tex = useMemo(() => stripeTex(), []);
  useBeforePhysicsStep(() => {
    elapsed.current += PHYSICS_DT;
    const rb = ref.current;
    if (!rb) return;
    if (dropped.current) {
      const cur = rb.translation();
      rb.setNextKinematicTranslation({
        x: cur.x,
        y: cur.y - 16 * PHYSICS_DT,
        z: cur.z,
      });
      return;
    }
    const p = sim.racers.find((r) => r.isPlayer);
    if (
      t.drops &&
      p &&
      Math.abs(p.x - t.pos[0]) < 1.05 &&
      Math.abs(p.z - t.pos[2]) < 1.05 &&
      p.y < 1.6
    ) {
      armed.current += PHYSICS_DT;
    }
    if (armed.current > t.delay) {
      dropped.current = true;
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
  const finishZ = currentLevel().finishZ;
  const midZ = (8 + finishZ) / 2;
  const depth = Math.max(130, 8 - finishZ + 24);
  return (
    <group>
      {([-10.2, 10.2] as const).map((x) => (
        <group key={x}>
          <mesh position={[x, 1.15, midZ]} castShadow>
            <boxGeometry args={[0.55, 2.5, depth]} />
            <meshLambertMaterial color={color} />
          </mesh>
          <mesh position={[x > 0 ? x - 0.3 : x + 0.3, 1.85, midZ]}>
            <boxGeometry args={[0.1, 0.16, depth]} />
            <meshBasicMaterial color={neon} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function WindGust({ pos, size, force }: WindZone) {
  const mag = Math.hypot(force[0], force[2]);
  if (mag < 0.4) return null;
  const yaw = Math.atan2(force[0], force[2]);
  const span = Math.min(size[0] * 0.55, 4.4);
  return (
    <group position={pos} rotation={[0, yaw, 0]}>
      <mesh>
        <boxGeometry args={[span, 0.07, size[2] * 0.88]} />
        <meshBasicMaterial color="#C8F6FF" transparent opacity={0.2} depthWrite={false} />
      </mesh>
      {[-0.28, 0, 0.28].map((t, i) => (
        <mesh key={i} position={[0, 0.62, t * size[2] * 0.32]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.42, 1.35, 3]} />
          <meshBasicMaterial color="#F4FFFF" transparent opacity={0.62} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

function CandyLowGate({ gate }: { gate: LowGate }) {
  const w = Math.min(9.4, gate.size[0] - 0.4);
  const postH = 1.35;
  return (
    <group position={[gate.pos[0], 1.08, gate.pos[2]]}>
      <mesh position={[-w / 2 + 0.28, -0.15, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.28, postH, 8]} />
        <meshLambertMaterial color="#E08AA4" />
      </mesh>
      <mesh position={[w / 2 - 0.28, -0.15, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.28, postH, 8]} />
        <meshLambertMaterial color="#E08AA4" />
      </mesh>
      <mesh position={[0, 0.02, 0]} castShadow>
        <boxGeometry args={[w - 0.4, 0.28, 0.34]} />
        <meshLambertMaterial color="#F3D984" />
      </mesh>
    </group>
  );
}

function SkyDome() {
  const ref = useRef<THREE.Mesh>(null);
  const tex = useMemo(() => skyTex(), []);
  useFrame(({ camera }) => {
    ref.current?.position.copy(camera.position);
  });
  return (
    <mesh ref={ref} renderOrder={-1000} frustumCulled={false} scale={[-1, 1, 1]}>
      <sphereGeometry args={[VISUAL_FOUNDATION.sky.radius, 24, 16]} />
      <meshBasicMaterial map={tex} side={THREE.BackSide} fog={false} depthWrite={false} />
    </mesh>
  );
}

function MovingPad(m: Mover) {
  const ref = useRef<RapierRigidBody>(null);
  const last = useRef(new THREE.Vector3(...m.from));
  const elapsed = useRef(0);
  useBeforePhysicsStep(() => {
    const time = elapsed.current;
    elapsed.current += PHYSICS_DT;
    const rb = ref.current;
    if (!rb) return;
    const u = (Math.sin((time * Math.PI * 2) / m.period + m.phase) + 1) / 2;
    const x = m.from[0] + (m.to[0] - m.from[0]) * u;
    const y = m.from[1] + (m.to[1] - m.from[1]) * u;
    const z = m.from[2] + (m.to[2] - m.from[2]) * u;
    const vx = (x - last.current.x) / PHYSICS_DT;
    const vy = (y - last.current.y) / PHYSICS_DT;
    const vz = (z - last.current.z) / PHYSICS_DT;
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
  const elapsed = useRef(0);
  useBeforePhysicsStep(() => {
    const time = elapsed.current;
    elapsed.current += PHYSICS_DT;
    e.set(0, time * h.speed + h.phase, 0);
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
  const elapsed = useRef(0);
  useBeforePhysicsStep(() => {
    const time = elapsed.current;
    elapsed.current += PHYSICS_DT;
    e.set(0, time * s.speed + s.phase, 0);
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
  const elapsed = useRef(0);
  useBeforePhysicsStep(() => {
    const time = elapsed.current;
    elapsed.current += PHYSICS_DT;
    const a = Math.sin(time * p.speed + p.phase) * 0.85;
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
  benchmark,
}: {
  id: string;
  kind: "coin" | "shield" | "jelly";
  pos: [number, number, number];
  benchmark: boolean;
}) {
  const ref = useRef<THREE.Group>(null);
  const crate = useMemo(() => crateTex(), []);
  const popScale = useRef(1);
  useFrame(({ clock }, delta) => {
    const g = ref.current;
    if (!g) return;
    const gone = sim.taken.has(id);
    if (!benchmark) {
      g.visible = !gone;
    } else {
      popScale.current = gone
        ? Math.max(0, popScale.current - delta * 5.5)
        : Math.min(1, popScale.current + delta * 5);
      g.visible = popScale.current > 0.01;
      g.scale.setScalar(popScale.current);
    }
    if (!g.visible) return;
    g.position.y = pos[1] + Math.sin(clock.elapsedTime * 3 + pos[2]) * 0.1;
    g.rotation.y = clock.elapsedTime * 1.4;
  });
  if (kind === "coin" && benchmark) {
    return (
      <group ref={ref} position={pos}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.31, 0.31, 0.075, 20]} />
          <meshStandardMaterial
            color="#F2C64F"
            emissive="#D89B18"
            emissiveIntensity={0.5}
            metalness={0.78}
            roughness={0.19}
          />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.31, 0.045, 8, 20]} />
          <meshStandardMaterial
            color="#FFF0A5"
            emissive="#FFD666"
            emissiveIntensity={0.72}
            metalness={0.55}
            roughness={0.24}
          />
        </mesh>
      </group>
    );
  }
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
        {benchmark ? (
          <meshStandardMaterial
            color={kind === "jelly" ? "#E993AC" : "#8ED1FF"}
            emissive={kind === "jelly" ? "#FF9BB4" : "#57D9FF"}
            emissiveIntensity={0.34}
            roughness={kind === "jelly" ? 0.24 : 0.35}
            metalness={kind === "jelly" ? 0.02 : 0.18}
          />
        ) : (
          <meshLambertMaterial map={crate} />
        )}
      </mesh>
    </group>
  );
}

function BoostRing({ pos, benchmark }: { pos: [number, number, number]; benchmark: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.y = clock.elapsedTime * 1.6;
  });
  return (
    <mesh ref={ref} position={pos}>
      <torusGeometry args={[0.85, 0.1, 12, 30]} />
      {benchmark ? (
        <meshStandardMaterial
          color="#49E8CD"
          emissive="#22FFC8"
          emissiveIntensity={0.86}
          metalness={0.42}
          roughness={0.17}
        />
      ) : (
        <meshLambertMaterial color="#2DB8A1" emissive="#2DB8A1" emissiveIntensity={0.35} />
      )}
    </mesh>
  );
}

function FinishArch({ z }: { z: number }) {
  const finish = currentLevel().platforms.find((p) => p.kind === "finish");
  const half = Math.max(5.4, (finish?.size[0] ?? 14) / 2 - 1.6);
  const beam = half * 2 + 0.8;
  return (
    <group position={[0, 0, z - 2]}>
      <mesh position={[-half, 2.4, 0]} castShadow>
        <boxGeometry args={[0.7, 4.8, 0.7]} />
        <meshLambertMaterial color="#FFF6EB" />
      </mesh>
      <mesh position={[half, 2.4, 0]} castShadow>
        <boxGeometry args={[0.7, 4.8, 0.7]} />
        <meshLambertMaterial color="#FFF6EB" />
      </mesh>
      <mesh position={[0, 4.8, 0]}>
        <boxGeometry args={[beam, 0.7, 0.7]} />
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
    theme === "ice"
      ? "#8EC8F0"
      : theme === "factory"
        ? "#6A7A90"
        : theme === "sky"
          ? "#E08AA4"
          : theme === "pirate"
            ? "#8B6914"
            : "#3DCFB0";
  const glow =
    theme === "ice"
      ? "#FFFFFF"
      : theme === "sky"
        ? "#FFFFFF"
        : theme === "dessert"
          ? "#E08AA4"
          : theme === "finale"
            ? "#E8C85A"
            : "#FFF6A8";
  const zs = [8, -6, -20, -40, -64, -88, Math.max(finishZ + 8, -60)];
  return (
    <>
      {zs.map((z, i) => (
        <CandyTree key={i} position={[i % 2 === 0 ? -8.2 : 8.2, 0, z]} color={color} glow={glow} />
      ))}
    </>
  );
}

function CloudFloor() {
  const finishZ = currentLevel().finishZ;
  const midZ = (8 + finishZ) / 2;
  const depth = Math.max(280, 8 - finishZ + 80);
  const wide = 160;
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -12, midZ]}>
      <planeGeometry args={[wide, depth]} />
      <meshLambertMaterial color="#6BB8F0" transparent opacity={0.35} />
    </mesh>
  );
}

function ThemeWorld({ theme, finishZ }: { theme: string; finishZ: number }) {
  const cloudRef = useRef<THREE.InstancedMesh>(null);
  const isleRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const cloudColor =
    theme === "ice"
      ? "#F2FBFF"
      : theme === "factory"
        ? "#D8DEE6"
        : theme === "pirate"
          ? "#F4E4C4"
          : theme === "dessert"
            ? "#FFE8F2"
            : theme === "finale"
              ? "#E8EEFF"
              : "#F4FBFF";
  const isleColor =
    theme === "ice"
      ? "#A8D4F0"
      : theme === "factory"
        ? "#6A7A90"
        : theme === "pirate"
          ? "#2E5A8A"
          : theme === "dessert"
            ? "#C47890"
            : theme === "finale"
              ? "#4A68C8"
              : "#7EC8E8";

  useEffect(() => {
    const clouds = cloudRef.current;
    const isles = isleRef.current;
    if (!clouds || !isles) return;
    const nCloud = 28;
    for (let n = 0; n < nCloud; n++) {
      const side = n % 2 === 0 ? -1 : 1;
      dummy.position.set(side * (20 + (n % 5) * 4.5), 1.4 + (n % 4) * 1.7, 14 - n * 6.2);
      dummy.scale.set(2.6 + (n % 3) * 0.6, 1.15 + (n % 2) * 0.35, 2.1 + (n % 4) * 0.45);
      dummy.rotation.set(0, n * 0.37, 0);
      dummy.updateMatrix();
      clouds.setMatrixAt(n, dummy.matrix);
    }
    clouds.instanceMatrix.needsUpdate = true;
    const nIsle = 10;
    for (let n = 0; n < nIsle; n++) {
      const side = n % 2 === 0 ? -1 : 1;
      dummy.position.set(side * (22 + (n % 3) * 3.2), -0.8, 6 - n * 14);
      dummy.scale.set(4.2 + (n % 3), 0.45, 3.4 + (n % 2));
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      isles.setMatrixAt(n, dummy.matrix);
    }
    isles.instanceMatrix.needsUpdate = true;
  }, [dummy, finishZ]);

  return (
    <group>
      <instancedMesh ref={cloudRef} args={[undefined, undefined, 28]} frustumCulled={false}>
        <sphereGeometry args={[1, 8, 6]} />
        <meshLambertMaterial color={cloudColor} transparent opacity={0.7} />
      </instancedMesh>
      <instancedMesh ref={isleRef} args={[undefined, undefined, 10]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshLambertMaterial color={isleColor} transparent opacity={0.55} />
      </instancedMesh>
    </group>
  );
}
