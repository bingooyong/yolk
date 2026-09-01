import { useEffect, useMemo, useRef, type RefObject } from "react";
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
  DASH,
  DASH_SPEED,
  EGG_BUMP,
  EGG_HALF,
  EGG_RADIUS,
  FALL_GRAVITY,
  JUMP_BUFFER,
  JUMP_CUT,
  JUMP_FEEL,
  JUMP_V,
  KILL_Y,
  MOVE_SPEED,
  RISE_GRAVITY,
  STEP,
  TERMINAL_V,
  TURN_LERP,
  type Accessory,
} from "./config";
import { haptic } from "@/engine/haptics";
import { currentLevel, moverVel } from "./course";
import {
  createCharacterPresentation,
  getContactShadowPose,
  syncCharacterPresentation,
  type CharacterPresentation,
} from "./character-presentation";
import { CharacterVisual } from "./visuals/CharacterVisual";
import { getPresentationMode, PRESENTATION_PROFILES } from "./presentation/profiles";
import { actions, consumeSteerOverride, pollInput } from "./input";
import { contactShadowTex } from "./look";
import {
  sfxBounce,
  sfxCheckpoint,
  sfxCoin,
  sfxDash,
  sfxDashCharge,
  sfxDashMax,
  sfxDashRelease,
  sfxFinish,
  sfxHit,
  sfxJump,
  sfxLand,
  sfxPounce,
  sfxRoll,
} from "./audio";
import {
  ABILITY,
  activate,
  canUse,
  hudOf,
  makeAbilities,
  tickAbilities,
  type AbilitySet,
} from "./abilities";
import {
  addTrauma,
  ensureRacer,
  lerpAngle,
  setFail,
  setHint,
  sim,
  type DashState,
  type MoveState,
} from "./sim";
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
  const spawn = (currentLevel().spawns[spawnIndex] ?? currentLevel().spawns[0]) as [
    number,
    number,
    number,
  ];

  const body = useRef<RapierRigidBody>(null);
  const visual = useRef<THREE.Group>(null);
  const presentation = useRef(
    createCharacterPresentation({ x: spawn[0], y: spawn[1], z: spawn[2] }),
  );
  const { world } = useRapier();
  const controller = useRef<ReturnType<typeof world.createCharacterController> | null>(null);
  const raceId = useGameStore((s) => s.raceId);
  const hub = useGameStore((s) => s.hub);
  const phase = useGameStore((s) => s.phase);
  const revealing = useGameStore((s) => Boolean(s.lastPull) && s.phase === "title");
  const env = PRESENTATION_PROFILES[getPresentationMode(phase, hub, revealing)].environment;
  const showMarker = isPlayer && env.showTrack && !env.showStage;

  const local = useRef({
    vy: 0,
    yaw: 0,
    coyote: 0,
    jumpBuf: 0,
    dashT: 0,
    dashCd: 0,
    dashState: "idle" as DashState,
    dashCharge: 0,
    dashLevel: 0 as 0 | 1 | 2 | 3,
    dashRecover: 0,
    dashDirX: 0,
    dashDirZ: -1,
    chargeBeep: 0,
    maxBeep: false,
    pounceT: 0,
    rollT: 0,
    rollSpin: 0,
    lean: 0,
    abilities: makeAbilities() as AbilitySet,
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
    gateHit: 0,
  });

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
    L.dashState = "idle";
    L.dashCharge = 0;
    L.dashLevel = 0;
    L.dashRecover = 0;
    L.maxBeep = false;
    L.chargeBeep = 0;
    L.pounceT = 0;
    L.rollT = 0;
    L.rollSpin = 0;
    L.lean = 0;
    L.abilities = makeAbilities();
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
    L.gateHit = 0;
    const p = spawn;
    presentation.current = createCharacterPresentation({
      x: p[0],
      y: p[1],
      z: p[2],
    });
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
      const orbit = Math.abs(Math.atan2(Math.sin(sim.lookYaw), Math.cos(sim.lookYaw)));
      const moveYaw = orbit > 1.75 ? L.yaw : sim.camYaw;
      tmpFwd.set(-Math.sin(moveYaw), 0, -Math.cos(moveYaw));
      tmpRight.set(Math.cos(moveYaw), 0, -Math.sin(moveYaw));
      const steer = consumeSteerOverride();
      let mx = actions.moveX;
      const my = actions.moveY;
      if (steer != null) mx -= steer;
      wishX = tmpFwd.x * my + tmpRight.x * mx;
      wishZ = tmpFwd.z * my + tmpRight.z * mx;
      wantJump = actions.jump;
      wantDash = false;
      if (phase === "countdown") {
        wishX = 0;
        wishZ = 0;
        wantJump = false;
      }
    } else if (!isPlayer && phase === "playing" && !L.finished) {
      const WAYPOINTS = currentLevel().waypoints;
      const wp = WAYPOINTS[Math.min(L.wp, WAYPOINTS.length - 1)];
      if (wp) {
        const next = WAYPOINTS[L.wp + 1];
        const aim = wp.jump && next && t.z < wp.z ? next : wp;
        const tx = aim.x + lane * 0.35;
        const tz = aim.z;
        const dx = tx - t.x;
        const dz = tz - t.z;
        const dist = Math.hypot(dx, dz);
        const distWp = Math.hypot(wp.x + lane * 0.35 - t.x, wp.z - t.z);
        if (L.wp < WAYPOINTS.length - 1) {
          if (wp.jump) {
            if (t.z < wp.z - 2.2) L.wp += 1;
          } else if (distWp < 1.7) {
            L.wp += 1;
          }
        }
        if (dist > 0.05) {
          wishX = dx / dist;
          wishZ = dz / dist;
        }
        if (wp.jump && L.grounded) {
          const nd = next ? Math.hypot(next.x + lane * 0.35 - t.x, next.z - t.z) : dist;
          if (nd < 6.4) wantJump = true;
        }
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
    L.dashRecover = Math.max(0, L.dashRecover - dt);
    L.gateHit = Math.max(0, L.gateHit - dt);
    if (L.dashT > 0) L.dashT -= dt;
    L.pounceT = Math.max(0, L.pounceT - dt);
    L.rollT = Math.max(0, L.rollT - dt);
    if (isPlayer) tickAbilities(L.abilities, dt);

    const exclusive =
      L.pounceT > 0 || L.rollT > 0 || L.dashState === "active" || L.dashState === "charging";

    const aimDash = () => {
      if (wishLen < 0.1) {
        wishX = -Math.sin(L.yaw);
        wishZ = -Math.cos(L.yaw);
      }
      L.dashDirX = wishLen < 0.1 ? -Math.sin(L.yaw) : wishX / Math.max(wishLen, 0.001);
      L.dashDirZ = wishLen < 0.1 ? -Math.cos(L.yaw) : wishZ / Math.max(wishLen, 0.001);
    };

    if (isPlayer && phase === "playing" && !L.finished) {
      if (!exclusive && actions.pouncePressed && canUse(L.abilities, "pounce")) {
        activate(L.abilities, "pounce");
        L.pounceT = ABILITY.pounce.duration;
        L.squash = 0.8;
        L.lean = 0.42;
        L.vy = Math.max(L.vy * 0.28, ABILITY.pounce.height);
        L.grounded = false;
        L.coyote = 0;
        aimDash();
        sfxPounce();
        addTrauma(0.03);
        sim.pounces += 1;
      } else if (!exclusive && actions.rollPressed && canUse(L.abilities, "roll")) {
        activate(L.abilities, "roll");
        L.rollT = ABILITY.roll.duration;
        L.rollSpin = 0;
        L.squash = 0.58;
        aimDash();
        sfxRoll();
        addTrauma(0.025);
        sim.rolls += 1;
      }
      if (L.pounceT <= 0 && L.rollT <= 0) {
        stepPlayerDash(L, actions, wishLen, aimDash);
      }
    } else if (wantDash && L.dashCd <= 0 && !L.finished && phase === "playing") {
      fireDash(L, 2, isPlayer);
      aimDash();
    }

    if (L.dashState === "active" && L.dashT <= 0) {
      L.dashState = "recovery";
      L.dashRecover = DASH.recover;
    }
    if (L.dashState === "recovery" && L.dashRecover <= 0) {
      L.dashState = "idle";
      L.dashLevel = 0;
      L.dashCharge = 0;
    }

    const dashing = L.dashState === "active" && L.dashT > 0;
    const pouncing = L.pounceT > 0;
    const rolling = L.rollT > 0;
    const dashSpd = dashing
      ? Math.min(DASH.maxSpeed, DASH.speed[Math.max(0, L.dashLevel - 1)] ?? DASH_SPEED)
      : pouncing
        ? ABILITY.pounce.speed
        : rolling
          ? ABILITY.roll.speed
          : L.grounded
            ? MOVE_SPEED
            : AIR_SPEED;
    const speed = dashSpd;
    const ice = L.surface === "ice" && L.grounded;
    const grip = ice ? 1.55 : L.grounded ? 16 : 7;
    const targetVx = wishX * speed;
    const targetVz = wishZ * speed;
    const blend = 1 - Math.exp(-grip * dt);
    L.vx += (targetVx - L.vx) * blend;
    L.vz += (targetVz - L.vz) * blend;
    if (dashing || pouncing || rolling) {
      L.vx = L.dashDirX * speed;
      L.vz = L.dashDirZ * speed;
    }
    const hx = L.vx;
    const hz = L.vz;

    if (isPlayer && !actions.jump && L.vy > 1.8 && L.pounceT <= 0) {
      L.vy *= JUMP_CUT;
    }

    if (!L.grounded) {
      L.vy -= (L.vy > 0.3 ? RISE_GRAVITY : FALL_GRAVITY) * dt;
      if (L.vy < -TERMINAL_V) L.vy = -TERMINAL_V;
    } else if (L.vy < 0) L.vy = 0;

    if (L.jumpBuf > 0 && L.coyote > 0 && L.pounceT <= 0) {
      L.vy = JUMP_V;
      L.jumpBuf = 0;
      L.coyote = 0;
      L.grounded = false;
      L.squash = JUMP_FEEL.squash;
      L.moveState = "jump_start";
      L.jumpT = 0.14;
      if (isPlayer) {
        sfxJump();
        sim.jumps += 1;
      }
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

    if (dashing && nCol > 0 && maxNy < 0.42) {
      let wall = false;
      let nxn = 0;
      let nzn = 0;
      for (let i = 0; i < nCol; i++) {
        const hit = cc.computedCollision(i);
        if (!hit) continue;
        if (Math.abs(hit.normal1.y) < 0.42) {
          wall = true;
          nxn += hit.normal1.x;
          nzn += hit.normal1.z;
        }
      }
      if (wall) {
        const mag = Math.hypot(nxn, nzn) || 1;
        L.dashT = 0;
        L.dashState = "recovery";
        L.dashRecover = DASH.recover + 0.08;
        L.vx = (nxn / mag) * 3.2;
        L.vz = (nzn / mag) * 3.2;
        L.stun = 0.12;
        L.squash = 0.84;
        if (isPlayer) {
          sfxHit();
          addTrauma(0.07);
        }
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
        setHint("被机关撞到了 · 看它转完再过");
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
      L.squash = JUMP_FEEL.landSquash;
      L.landT = 0.12;
      L.moveState = "landing";
      if (isPlayer) {
        sfxLand();
        haptic("light");
      }
    }
    L.grounded = grounded;
    L.lastY = ny;
    L.jumpT = Math.max(0, L.jumpT - dt);
    L.landT = Math.max(0, L.landT - dt);

    if (L.landT > 0) L.moveState = "landing";
    else if (pouncing) L.moveState = "pounce";
    else if (rolling) L.moveState = "roll";
    else if (dashing) L.moveState = "boost";
    else if (L.jumpT > 0) L.moveState = "jump_start";
    else if (!grounded) L.moveState = L.vy > 0.4 ? "airborne" : "falling";
    else L.moveState = wishLen > 0.18 ? "running" : "idle";

    if (wishLen > 0.12) {
      const targetYaw = Math.atan2(-wishX, -wishZ);
      L.yaw = lerpAngle(L.yaw, targetYaw, 1 - Math.exp(-TURN_LERP * dt));
    }

    const wantBank = THREE.MathUtils.clamp(-wishX * 0.16, -0.18, 0.18);
    L.bank += (wantBank - L.bank) * (1 - Math.exp(-10 * dt));

    if (pouncing) L.lean = 0.48;
    else L.lean += (0 - L.lean) * (1 - Math.exp(-12 * dt));
    if (rolling) L.rollSpin += 18 * dt;
    else L.rollSpin = 0;
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

    if (isPlayer && !L.finished) {
      const cps = level.checkpoints;
      while (L.cp < cps.length - 1 && nz < cps[L.cp + 1].z) {
        L.cp += 1;
        sim.checkpointsHit += 1;
        sfxCheckpoint();
        addTrauma(0.035);
        setHint("检查点");
      }
    }

    if (isPlayer && !rolling && L.gateHit <= 0 && L.invuln <= 0) {
      for (const gate of level.gates) {
        if (
          Math.abs(nx - gate.pos[0]) < gate.size[0] / 2 + 0.42 &&
          Math.abs(ny - gate.pos[1]) < gate.size[1] / 2 + 0.55 &&
          Math.abs(nz - gate.pos[2]) < gate.size[2] / 2 + 0.42
        ) {
          L.gateHit = 0.4;
          L.stun = 0.28;
          L.vx *= 0.2;
          L.vz = 5.2;
          nz = gate.pos[2] + gate.size[2] / 2 + 2.6;
          rb.setNextKinematicTranslation({ x: nx, y: ny, z: nz });
          if (sim.failUntil <= sim.time) sfxHit();
          addTrauma(0.05);
          setHint("矮门要滚过去 · 点滚动");
          break;
        }
      }
    }

    let presentationX = nx;
    let presentationY = ny;
    let presentationZ = nz;
    if (ny < KILL_Y) {
      if (L.finished) {
        presentationY = 0.72;
        presentationZ = Math.min(nz, level.finishZ);
        rb.setNextKinematicTranslation({
          x: presentationX,
          y: presentationY,
          z: presentationZ,
        });
        L.vy = 0;
        L.vx = 0;
        L.vz = 0;
      } else {
      const cps = level.checkpoints;
      while (L.cp < cps.length - 1 && nz < cps[L.cp + 1].z) L.cp += 1;
      const cp = cps[L.cp] ?? cps[0];
      presentationX = lane * 0.2 + cp.pos[0];
      presentationY = cp.pos[1];
      presentationZ = cp.pos[2];
      rb.setNextKinematicTranslation({
        x: presentationX,
        y: presentationY,
        z: presentationZ,
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
    }

    const horiz = Math.hypot(hx, hz);
    syncCharacterPresentation(presentation.current, {
      x: presentationX,
      y: presentationY,
      z: presentationZ,
      moveState: L.moveState,
      grounded: L.grounded,
      horizontalSpeed: Math.hypot(L.vx, L.vz),
      verticalVelocity: L.vy,
      squash: L.squash,
      lean: L.lean,
      bank: L.bank,
      rollSpin: L.rollSpin,
      rollT: L.rollT,
    });

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
      sim.playerDashing = dashing || pouncing;
      sim.dashFov = dashing
        ? DASH.fov[Math.max(0, L.dashLevel - 1)]
        : pouncing
          ? 2.4
          : sim.dashFov * 0.86;
      sim.moveState = L.moveState;
      sim.pad.jumpHeld = actions.jump;
      sim.pad.dashState = L.dashState;
      sim.pad.dashCharge = L.dashCharge;
      sim.pad.dashLevel = L.dashLevel;
      sim.pad.dashCd = L.dashCd;
      sim.pad.pounce = hudOf(L.abilities.pounce);
      sim.pad.roll = hudOf(L.abilities.roll);
      sim.pad.boost = {
        phase: dashing ? "active" : L.dashCd > 0 ? "cooldown" : "ready",
        cd01: L.dashCd > 0 ? Math.min(1, L.dashCd / DASH.cooldown) : 0,
        flash: L.abilities.boost.flash,
      };
      if (phase === "playing" && !L.finished) sim.time += dt;
    }
  });

  useFrame(() => {
    const vis = visual.current;
    if (!vis) return;
    const L = local.current;
    vis.rotation.order = "YXZ";
    vis.rotation.y = L.yaw + Math.PI;
    vis.rotation.x = L.rollT > 0 ? L.rollSpin : L.lean;
    vis.rotation.z = L.bank;
  });

  return (
    <>
      <ContactShadow presentation={presentation} />
      <LandPuff presentation={presentation} />
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
          <FeelTrail color={color} active={isPlayer && showMarker} />
          <CharacterVisual
            color={color}
            accessory={accessory}
            skinId={skinId}
            isPlayer={isPlayer && showMarker}
            presentation={presentation}
          />
        </group>
        {showMarker ? <PlayerMarker color={color} /> : null}
      </RigidBody>
    </>
  );
}

function LandPuff({ presentation }: { presentation: RefObject<CharacterPresentation> }) {
  const mesh = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const ring = mesh.current;
    if (!ring) return;
    const p = presentation.current;
    const on = p.moveState === "landing";
    ring.visible = on;
    if (!on) return;
    const k = Math.max(0.15, p.squash);
    ring.position.set(p.contactX, p.contactY + 0.04, p.contactZ);
    ring.scale.setScalar(1.1 + (1 - k) * 2.4);
    (ring.material as THREE.MeshBasicMaterial).opacity = 0.22 + (1 - k) * 0.25;
  });
  return (
    <mesh ref={mesh} rotation={[-Math.PI / 2, 0, 0]} renderOrder={2} visible={false}>
      <ringGeometry args={[0.28, 0.52, 16]} />
      <meshBasicMaterial color="#FFF6EB" transparent opacity={0.28} depthWrite={false} />
    </mesh>
  );
}

const contactShadowGeo = new THREE.PlaneGeometry(1, 1);

function ContactShadow({ presentation }: { presentation: RefObject<CharacterPresentation> }) {
  const mesh = useRef<THREE.Mesh>(null);
  const texture = useMemo(() => contactShadowTex(), []);

  useFrame(() => {
    const shadow = mesh.current;
    if (!shadow) return;
    const pose = getContactShadowPose(presentation.current);
    shadow.visible = pose.visible;
    if (!pose.visible) return;
    const p = presentation.current;
    shadow.position.set(p.contactX, p.contactY + 0.018, p.contactZ);
    shadow.scale.setScalar(pose.size);
    (shadow.material as THREE.MeshBasicMaterial).opacity = pose.opacity;
  });

  return (
    <mesh ref={mesh} geometry={contactShadowGeo} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
      <meshBasicMaterial
        map={texture}
        color="#221826"
        transparent
        opacity={0}
        depthWrite={false}
        polygonOffset
        polygonOffsetFactor={-2}
        polygonOffsetUnits={-2}
      />
    </mesh>
  );
}

function dashLevelOf(charge: number): 1 | 2 | 3 {
  if (charge >= DASH.levelAt[2]) return 3;
  if (charge >= DASH.levelAt[1]) return 2;
  return 1;
}

type DashBody = {
  dashT: number;
  dashCd: number;
  dashState: DashState;
  dashCharge: number;
  dashLevel: 0 | 1 | 2 | 3;
  dashRecover: number;
  dashDirX: number;
  dashDirZ: number;
  chargeBeep: number;
  maxBeep: boolean;
  squash: number;
};

function fireDash(L: DashBody, level: 1 | 2 | 3, isPlayer: boolean) {
  const lv = level;
  L.dashLevel = lv;
  L.dashState = "active";
  L.dashT = Math.min(DASH.maxTime, DASH.time[lv - 1]);
  L.dashCd = DASH.cooldown;
  L.dashCharge = lv / 3;
  L.squash = JUMP_FEEL.squash;
  L.maxBeep = false;
  if (isPlayer) {
    sfxDashRelease(lv);
    addTrauma(DASH.shake[lv - 1]);
    sim.boosts += 1;
  }
}

function stepPlayerDash(L: DashBody, input: typeof actions, _wishLen: number, aim: () => void) {
  if (L.dashState === "active") return;
  if (input.dashCanceled && (L.dashState === "charging" || L.dashState === "ready")) {
    L.dashState = "idle";
    L.dashCharge = 0;
    L.dashLevel = 0;
    L.maxBeep = false;
    return;
  }
  if (
    (L.dashState === "idle" || (L.dashState === "recovery" && L.dashRecover <= 0)) &&
    input.dashPressed &&
    L.dashCd <= 0
  ) {
    L.dashState = "charging";
    L.dashCharge = 0.06;
    L.dashLevel = 1;
    L.maxBeep = false;
    L.chargeBeep = 0;
    aim();
  }
  if (L.dashState === "charging" || L.dashState === "ready") {
    L.dashCharge = Math.min(1, L.dashCharge + STEP / DASH.chargeMax);
    L.dashLevel = dashLevelOf(L.dashCharge);
    L.squash = 0.94 - L.dashCharge * 0.1;
    if (L.dashCharge >= 1) {
      L.dashState = "ready";
      if (!L.maxBeep) {
        L.maxBeep = true;
        sfxDashMax();
      }
    } else if (L.dashCharge - L.chargeBeep > 0.24) {
      L.chargeBeep = L.dashCharge;
      sfxDashCharge(L.dashLevel);
    }
    if (input.dashReleased) {
      aim();
      fireDash(L, L.dashLevel || 1, true);
    }
  }
}

function FeelTrail({ color, active }: { color: string; active: boolean }) {
  const g = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!g.current) return;
    const on = active && sim.playerDashing;
    g.current.visible = on;
    const s = on ? 0.75 + sim.pad.dashLevel * 0.14 : 0.01;
    g.current.scale.setScalar(s);
  });
  if (!active) return null;
  return (
    <group ref={g} visible={false}>
      {[0.42, 0.82, 1.22].map((z, i) => (
        <mesh key={i} position={[0, 0.04, z]}>
          <sphereGeometry args={[0.36 - i * 0.06, 10, 8]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.3 - i * 0.07}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

function PlayerMarker({ color }: { color: string }) {
  const group = useRef<THREE.Group>(null);
  const ghost = useRef<THREE.Mesh>(null);
  useFrame(({ camera, clock }) => {
    const g = group.current;
    if (!g) return;
    const bob = Math.sin(clock.elapsedTime * 5.2) * 0.07;
    g.position.y = 1.42 + bob;
    g.lookAt(camera.position);
    if (ghost.current) {
      const mat = ghost.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.28;
    }
  });
  return (
    <group ref={group} renderOrder={8}>
      <mesh position={[0, 0, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.16, 0.28, 3]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh ref={ghost} position={[0, 0, 0]} rotation={[Math.PI, 0, 0]} renderOrder={9}>
        <coneGeometry args={[0.2, 0.34, 3]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.28}
          depthTest={false}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

export function RacerField() {
  const colorId = useGameStore((s) => s.colorId);
  const equipped = useGameStore((s) => s.equippedSkin);
  const preview = useGameStore((s) => s.previewSkinId);
  const pulled = useGameStore((s) => s.lastPull?.skin.id);
  const phase = useGameStore((s) => s.phase);
  const hub = useGameStore((s) => s.hub);
  const revealing = Boolean(pulled) && phase === "title";
  const skinId =
    pulled ??
    (phase === "title" && hub === "character" && preview ? preview : equipped);
  const showBots = PRESENTATION_PROFILES[getPresentationMode(phase, hub, revealing)].environment.showBots;
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
      {showBots
        ? bots.map((c, i) => (
            <EggRacer
              key={`${raceId}-bot-${i}`}
              id={`bot-${i}`}
              name={["小团", "糯米", "波波", "豆豆", "泡芙", "麻薯", "蛋蛋"][i]}
              color={c}
              isPlayer={false}
              spawnIndex={i + 1}
              accessory={ACCESSORIES[(i + 1) % ACCESSORIES.length]}
              skinId={["sky_wings", "bunny", "star_cape", "sunset_wings", "halo", "bow", "crown"][i]}
              lane={-3 + i * 0.9}
            />
          ))
        : null}
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
