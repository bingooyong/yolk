import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  CapsuleCollider,
  RigidBody,
  useBeforePhysicsStep,
  useRapier,
  type RapierRigidBody,
} from "@react-three/rapier";
import * as THREE from "three";
import {
  ACCESSORIES,
  AIR_SPEED,
  COYOTE,
  DASH_COOLDOWN,
  DASH_SPEED,
  DASH_TIME,
  EGG_BUMP,
  EGG_HALF,
  EGG_RADIUS,
  FALL_GRAVITY,
  JUMP_BUFFER,
  JUMP_CUT,
  JUMP_V,
  KILL_Y,
  MOVE_SPEED,
  RISE_GRAVITY,
  STEP,
  TERMINAL_V,
  TURN_LERP,
  type Accessory,
} from "./config";
import { currentLevel, moverVel } from "./course";
import { EggMesh } from "./EggMesh";
import { actions, consumeSteerOverride, pollInput } from "./input";
import { sfxBounce, sfxCoin, sfxDash, sfxFinish, sfxHit, sfxJump, sfxLand } from "./audio";
import { addTrauma, ensureRacer, lerpAngle, setFail, sim, type MoveState } from "./sim";
import { useGameStore } from "./store";

type BodyUser = {
  kind?: string;
  moverId?: string;
};

type Props = {
  id: string;
  name: string;
  color: string;
  isPlayer: boolean;
  spawnIndex: number;
  accessory: Accessory;
  skinId?: string;
  lane: number;
};

export function EggRacer({
  id,
  name,
  color,
  isPlayer,
  spawnIndex,
  accessory,
  skinId,
  lane,
}: Props) {

  const body = useRef<RapierRigidBody>(null);
  const visual = useRef<THREE.Group>(null);
  const { world } = useRapier();
  const controller = useRef<ReturnType<typeof world.createCharacterController> | null>(
    null,
  );
  const raceId = useGameStore((s) => s.raceId);

  const local = useRef({
    vy: 0,
    yaw: 0,
    coyote: 0,
    jumpBuf: 0,
    dashT: 0,
    dashCd: 0,
    grounded: false,
    stun: 0,
    squash: 1,
    wp: 0,
    finished: false,
    finishTime: 0,
    invuln: 0,
    bank: 0,
    lastY: 0.72,
    cp: 0,
    rings: new Set<string>(),
    vx: 0,
    vz: 0,
    moveState: "idle" as MoveState,
    landT: 0,
    jumpT: 0,
    surface: "static" as string,
  });

  const spawn = (currentLevel().spawns[spawnIndex] ?? currentLevel().spawns[0]) as [number, number, number];

  useEffect(() => {
    const cc = world.createCharacterController(0.08);
    cc.setApplyImpulsesToDynamicBodies(true);
    cc.setCharacterMass(4);
    cc.enableAutostep(0.38, 0.18, true);
    cc.enableSnapToGround(0.45);
    cc.setMaxSlopeClimbAngle((50 * Math.PI) / 180);
    cc.setMinSlopeSlideAngle((55 * Math.PI) / 180);
    cc.setSlideEnabled(true);
    cc.setUp({ x: 0, y: 1, z: 0 });
    controller.current = cc;
    return () => {
      world.removeCharacterController(cc);
      controller.current = null;
    };
  }, [world]);

  useEffect(() => {
    const L = local.current;
    L.vy = 0;
    L.yaw = 0;
    L.coyote = 0;
    L.jumpBuf = 0;
    L.dashT = 0;
    L.dashCd = 0;
    L.grounded = true;
    L.stun = 0;
    L.squash = 1;
    L.wp = 0;
    L.finished = false;
    L.finishTime = 0;
    L.invuln = 0.35;
    L.bank = 0;
    L.vx = 0;
    L.vz = 0;
    L.moveState = "idle";
    L.landT = 0;
    L.jumpT = 0;
    L.cp = 0;
    L.rings = new Set();
    const p = spawn;
    body.current?.setNextKinematicTranslation({ x: p[0], y: p[1], z: p[2] });
    const r = ensureRacer(id, {
      name,
      color,
      isPlayer,
      x: p[0],
      y: p[1],
      z: p[2],
      yaw: 0,
      speed: 0,
      grounded: true,
      dashCd: 0,
      finished: false,
      finishTime: 0,
      place: 0,
      squash: 1,
    });
    r.x = p[0];
    r.y = p[1];
    r.z = p[2];
    r.yaw = 0;
    r.finished = false;
    r.color = color;
    r.name = name;
  }, [raceId, id, name, color, isPlayer, spawn]);

  const tmpFwd = useMemo(() => new THREE.Vector3(), []);
  const tmpRight = useMemo(() => new THREE.Vector3(), []);

  useBeforePhysicsStep(() => {
    const rb = body.current;
    const cc = controller.current;
    if (!rb || !cc) return;
    const col = rb.numColliders() > 0 ? rb.collider(0) : null;
    if (!col) return;

    const phase = useGameStore.getState().phase;
    const L = local.current;
    const dt = STEP;
    const t = rb.translation();

    if (isPlayer) pollInput();

    let wishX = 0;
    let wishZ = 0;
    let wantJump = false;
    let wantDash = false;

    const canControl = phase === "playing" && !L.finished && L.stun <= 0;

    if (isPlayer && (phase === "playing" || phase === "countdown")) {
      const camYaw = sim.camYaw;
      tmpFwd.set(-Math.sin(camYaw), 0, -Math.cos(camYaw));
      tmpRight.set(Math.cos(camYaw), 0, -Math.sin(camYaw));
      const steer = consumeSteerOverride();
      let mx = actions.moveX;
      let my = actions.moveY;
      if (steer != null) mx -= steer;
      wishX = tmpFwd.x * my + tmpRight.x * mx;
      wishZ = tmpFwd.z * my + tmpRight.z * mx;
      wantJump = actions.jump;
      wantDash = actions.dashPressed;
      if (phase === "countdown") {
        wishX = 0;
        wishZ = 0;
        wantJump = false;
        wantDash = false;
      }
    } else if (!isPlayer && phase === "playing" && !L.finished) {
      const WAYPOINTS = currentLevel().waypoints;
      const wp = WAYPOINTS[Math.min(L.wp, WAYPOINTS.length - 1)];
      if (wp) {
        const tx = wp.x + lane * 0.35;
        const tz = wp.z;
        const dx = tx - t.x;
        const dz = tz - t.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 1.7 && L.wp < WAYPOINTS.length - 1) L.wp += 1;
        if (dist > 0.05) {
          wishX = dx / dist;
          wishZ = dz / dist;
        }
        if (wp.jump && dist < 4.5 && L.grounded) wantJump = true;
        if (wp.dash && dist < 5.5 && L.dashCd <= 0) wantDash = true;
        if (Math.random() < 0.004) wantJump = true;
      }
    }

    if (!canControl && phase !== "countdown") {
      wishX = 0;
      wishZ = 0;
    }

    const wishLen = Math.hypot(wishX, wishZ);
    if (wishLen > 1) {
      wishX /= wishLen;
      wishZ /= wishLen;
    }

    if (wantJump) L.jumpBuf = JUMP_BUFFER;
    else L.jumpBuf = Math.max(0, L.jumpBuf - dt);

    if (L.grounded) L.coyote = COYOTE;
    else L.coyote = Math.max(0, L.coyote - dt);

    L.dashCd = Math.max(0, L.dashCd - dt);
    L.stun = Math.max(0, L.stun - dt);
    L.invuln = Math.max(0, L.invuln - dt);
    if (L.dashT > 0) L.dashT -= dt;

    if (wantDash && L.dashCd <= 0 && !L.finished && phase === "playing") {
      L.dashT = DASH_TIME;
      L.dashCd = DASH_COOLDOWN;
      L.squash = 0.86;
      if (isPlayer) {
        sfxDash();
        addTrauma(0.04);
      }
      if (wishLen < 0.1) {
        wishX = -Math.sin(L.yaw);
        wishZ = -Math.cos(L.yaw);
      }
    }

    const dashing = L.dashT > 0;
    const speed = dashing ? DASH_SPEED : L.grounded ? MOVE_SPEED : AIR_SPEED;
    const ice = L.surface === "ice" && L.grounded;
    const grip = ice ? 1.55 : L.grounded ? 16 : 7;
    const targetVx = wishX * speed;
    const targetVz = wishZ * speed;
    const blend = 1 - Math.exp(-grip * dt);
    L.vx += (targetVx - L.vx) * blend;
    L.vz += (targetVz - L.vz) * blend;
    const hx = L.vx;
    const hz = L.vz;

    if (isPlayer && !actions.jump && L.vy > 1.8) {
      L.vy *= JUMP_CUT;
    }

    if (!L.grounded) {
      L.vy -= (L.vy > 0.3 ? RISE_GRAVITY : FALL_GRAVITY) * dt;
      if (L.vy < -TERMINAL_V) L.vy = -TERMINAL_V;
    } else if (L.vy < 0) L.vy = 0;

    if (L.jumpBuf > 0 && L.coyote > 0) {
      L.vy = JUMP_V;
      L.jumpBuf = 0;
      L.coyote = 0;
      L.grounded = false;
      L.squash = 1.18;
      L.moveState = "jump_start";
      L.jumpT = 0.12;
      if (isPlayer) sfxJump();
    }

    const level = currentLevel();
    for (const w of level.winds) {
      if (
        Math.abs(t.x - w.pos[0]) < w.size[0] / 2 &&
        Math.abs(t.y - w.pos[1]) < w.size[1] / 2 &&
        Math.abs(t.z - w.pos[2]) < w.size[2] / 2
      ) {
        L.vx += w.force[0] * dt;
        L.vy += w.force[1] * dt;
        L.vz += w.force[2] * dt;
      }
    }

    cc.computeColliderMovement(col, { x: hx * dt, y: L.vy * dt, z: hz * dt });
    const mv = cc.computedMovement();

    let bounce = false;
    let conveyor = { x: 0, y: 0, z: 0 };
    let hitHazard = false;
    let hazardN = { x: 0, z: 0 };
    let maxNy = 0;
    L.surface = "static";
    const nCol = cc.numComputedCollisions();
    for (let i = 0; i < nCol; i++) {
      const hit = cc.computedCollision(i);
      if (!hit) continue;
      const other = hit.collider;
      if (!other) continue;
      const parent = other.parent();
      const data = (parent?.userData ?? {}) as BodyUser;
      const ny = hit.normal1.y;
      if (ny > maxNy) maxNy = ny;
      if (data.kind === "bounce" && ny > 0.45) bounce = true;
      if (data.kind === "ice" && ny > 0.45) L.surface = "ice";
      if (data.kind === "conveyor" && ny > 0.45) {
        conveyor = { x: 0, y: 0, z: -3.2 };
      }
      if (data.kind === "platform" && data.moverId && ny > 0.45) {
        const v = moverVel.get(data.moverId);
        if (v) {
          conveyor.x += v.x;
          conveyor.y += v.y;
          conveyor.z += v.z;
        }
      }
      if (data.kind === "hazard" && L.invuln <= 0) {
        hitHazard = true;
        hazardN = { x: hit.normal1.x, z: hit.normal1.z };
      }
    }

    let grounded = cc.computedGrounded() && maxNy > 0.52 && L.vy <= 2.4;
    if (maxNy > 0 && maxNy < 0.5) grounded = false;

    if (bounce) {
      L.vy = 10.4;
      grounded = false;
      L.squash = 1.28;
      if (isPlayer) {
        sfxBounce();
      }
    }

    if (hitHazard) {
      const mag = Math.hypot(hazardN.x, hazardN.z) || 1;
      L.vy = 6.2;
      L.stun = 0.28;
      L.invuln = 0.45;
      mv.x += (hazardN.x / mag) * 0.55;
      mv.z += (hazardN.z / mag) * 0.55;
      if (isPlayer) {
        sfxHit();
        addTrauma(0.1);
        setFail("被机关撞到了 · 看它转完再过");
      }
    }

    const nx0 = t.x + mv.x + conveyor.x * dt;
    const ny = t.y + mv.y + conveyor.y * dt;
    let nx = nx0;
    let nz = t.z + mv.z + conveyor.z * dt;

    for (const other of sim.racers) {
      if (other.id === id || other.finished) continue;
      const dx = nx - other.x;
      const dz = nz - other.z;
      const d = Math.hypot(dx, dz);
      if (d > 0.0001 && d < EGG_BUMP) {
        const push = ((EGG_BUMP - d) / EGG_BUMP) * 0.16;

        nx += (dx / d) * push;
        nz += (dz / d) * push;
      }
    }

    rb.setNextKinematicTranslation({ x: nx, y: ny, z: nz });

    if (grounded && !L.grounded && L.lastY - ny > 0.08) {
      L.squash = 0.82;
      L.landT = 0.12;
      L.moveState = "landing";
      if (isPlayer) {
        sfxLand();
      }
    }
    L.grounded = grounded;
    L.lastY = ny;
    L.jumpT = Math.max(0, L.jumpT - dt);
    L.landT = Math.max(0, L.landT - dt);

    if (L.landT > 0) L.moveState = "landing";
    else if (L.jumpT > 0) L.moveState = "jump_start";
    else if (!grounded) L.moveState = L.vy > 0.4 ? "airborne" : "falling";
    else L.moveState = wishLen > 0.18 ? "running" : "idle";

    if (wishLen > 0.12) {
      const targetYaw = Math.atan2(-wishX, -wishZ);
      L.yaw = lerpAngle(L.yaw, targetYaw, 1 - Math.exp(-TURN_LERP * dt));
    }

    const wantBank = THREE.MathUtils.clamp(-wishX * 0.16, -0.18, 0.18);
    L.bank += (wantBank - L.bank) * (1 - Math.exp(-10 * dt));

    L.squash += (1 - L.squash) * (1 - Math.exp(-10 * dt));

    for (const ring of level.rings) {
      if (L.rings.has(ring.id)) continue;
      const dx = nx - ring.pos[0];
      const dy = ny - ring.pos[1];
      const dz = nz - ring.pos[2];
      if (dx * dx + dy * dy + dz * dz < 1.35 * 1.35) {
        L.rings.add(ring.id);
        L.dashT = Math.max(L.dashT, 0.18);
        if (isPlayer) sfxDash();
      }
    }

    for (const p of level.pickups) {
      if (sim.taken.has(p.id)) continue;
      const dx = nx - p.pos[0];
      const dy = ny - p.pos[1];
      const dz = nz - p.pos[2];
      if (dx * dx + dy * dy + dz * dz < 1.05 * 1.05) {
        sim.taken.add(p.id);
        if (p.kind === "coin" && isPlayer) {
          sim.coinsRun += 5;
          sfxCoin();
        }
        if (p.kind === "shield") L.invuln = Math.max(L.invuln, 2.6);
        if (p.kind === "jelly") L.dashT = Math.max(L.dashT, 0.42);
      }
    }

    if (!L.finished && nz <= level.finishZ && ny > -2) {
      L.finished = true;
      L.finishTime = sim.time;
      if (isPlayer) {
        sfxFinish();
        addTrauma(0.08);
        useGameStore.getState().onPlayerFinish(sim.time);
      }
    }

    if (ny < KILL_Y) {
      const cps = level.checkpoints;
      while (L.cp < cps.length - 1 && nz < cps[L.cp + 1].z) L.cp += 1;
      const cp = cps[L.cp] ?? cps[0];
      rb.setNextKinematicTranslation({
        x: lane * 0.2 + cp.pos[0],
        y: cp.pos[1],
        z: cp.pos[2],
      });
      L.vy = 0;
      L.vx = 0;
      L.vz = 0;
      L.bank = 0;
      L.invuln = 0.6;
      L.stun = 0.2;
      if (isPlayer) {
        sfxHit();
        setFail("掉下去了 · 看准落点再跳");
      }
    }

    const horiz = Math.hypot(hx, hz);
    const r = ensureRacer(id, {
      name,
      color,
      isPlayer,
      x: nx,
      y: ny,
      z: nz,
      yaw: L.yaw,
      speed: horiz,
      grounded: L.grounded,
      dashCd: L.dashCd,
      finished: L.finished,
      finishTime: L.finishTime,
      place: 0,
      squash: L.squash,
    });
    r.x = nx;
    r.y = ny;
    r.z = nz;
    r.yaw = L.yaw;
    r.speed = horiz;
    r.grounded = L.grounded;
    r.dashCd = L.dashCd;
    r.finished = L.finished;
    r.finishTime = L.finishTime;
    r.squash = L.squash;
    r.color = color;

    if (isPlayer) {
      sim.playerYaw = L.yaw;
      sim.playerSpeed = horiz;
      sim.playerDashing = dashing;
      sim.moveState = L.moveState;
      if (phase === "playing" && !L.finished) sim.time += dt;
    }
  });

  useFrame(() => {
    const vis = visual.current;
    if (!vis) return;
    const L = local.current;
    vis.rotation.order = "YXZ";
    vis.rotation.y = L.yaw + Math.PI;
    vis.rotation.x = 0;
    vis.rotation.z = L.bank;
    const s = L.squash;
    vis.scale.set(1 / Math.sqrt(s), s, 1 / Math.sqrt(s));
  });

  return (
    <RigidBody
      ref={body}
      type="kinematicPosition"
      colliders={false}
      position={spawn}
      enabledRotations={[false, false, false]}
      userData={{ kind: "racer", id }}
    >
      <CapsuleCollider args={[EGG_HALF, EGG_RADIUS]} />
      <group ref={visual}>
        <EggMesh color={color} accessory={accessory} skinId={skinId} squash={1} isPlayer={isPlayer} />
      </group>
    </RigidBody>
  );
}

export function RacerField() {
  const colorId = useGameStore((s) => s.colorId);
  const skinId = useGameStore((s) => s.equippedSkin);
  const raceId = useGameStore((s) => s.raceId);
  const levelId = useGameStore((s) => s.levelId);
  const color = eggHex(colorId);
  const bots = useMemo(() => {
    const n = currentLevel().bots;
    const palette = [
      "#2DB8A1",
      "#5BAFE0",
      "#F0A07A",
      "#E8C85A",
      "#E08AA4",
      "#A99AD6",
      "#7A90A8",
    ].filter((h) => h !== color);
    return palette.slice(0, n);
  }, [color, levelId]);

  return (
    <>
      <EggRacer
        key={`${raceId}-player`}
        id="player"
        name="我"
        color={color}
        isPlayer
        spawnIndex={0}
        accessory="sprout"
        skinId={skinId}
        lane={0}
      />
      {bots.map((c, i) => (
        <EggRacer
          key={`${raceId}-bot-${i}`}
          id={`bot-${i}`}
          name={["小团", "糯米", "波波", "豆豆", "泡芙", "麻薯", "蛋蛋"][i]}
          color={c}
          isPlayer={false}
          spawnIndex={i + 1}
          accessory={ACCESSORIES[(i + 1) % ACCESSORIES.length]}
          skinId={
            ["sky_wings", "bunny", "star_cape", "sunset_wings", "halo", "bow", "crown"][i]
          }
          lane={-3 + i * 0.9}
        />
      ))}
    </>
  );
}

function eggHex(id: string) {
  const map: Record<string, string> = {
    coral: "#E8614A",
    mint: "#2DB8A1",
    sky: "#5BAFE0",
    peach: "#F0A07A",
    butter: "#E8C85A",
    rose: "#E08AA4",
    lilac: "#A99AD6",
    slate: "#7A90A8",
  };
  return map[id] ?? "#E8614A";
}
