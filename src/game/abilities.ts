export type AbilityId = "pounce" | "roll" | "boost" | "grab";
export type AbilityPhase = "ready" | "active" | "cooldown";

export type AbilityDef = {
  id: AbilityId;
  cooldown: number;
  duration: number;
  speed: number;
};

export const ABILITY: Record<AbilityId, AbilityDef> = {
  pounce: { id: "pounce", cooldown: 0.82, duration: 0.22, speed: 14.4 },
  roll: { id: "roll", cooldown: 0.7, duration: 0.32, speed: 11.8 },
  boost: { id: "boost", cooldown: 0.95, duration: 0.26, speed: 16.4 },
  grab: { id: "grab", cooldown: 1.6, duration: 0, speed: 0 },
};

export type AbilitySlot = {
  id: AbilityId;
  phase: AbilityPhase;
  cd: number;
  maxCd: number;
  active: number;
  flash: number;
};

export type AbilitySet = Record<AbilityId, AbilitySlot>;

export function makeAbilities(): AbilitySet {
  const slot = (id: AbilityId): AbilitySlot => ({
    id,
    phase: "ready",
    cd: 0,
    maxCd: ABILITY[id].cooldown,
    active: 0,
    flash: 0,
  });
  return {
    pounce: slot("pounce"),
    roll: slot("roll"),
    boost: slot("boost"),
    grab: slot("grab"),
  };
}

export function tickAbilities(set: AbilitySet, dt: number) {
  for (const id of Object.keys(set) as AbilityId[]) {
    const s = set[id];
    s.flash = Math.max(0, s.flash - dt);
    if (s.phase === "active") {
      s.active = Math.max(0, s.active - dt);
      if (s.active <= 0) {
        s.phase = "cooldown";
        s.cd = s.maxCd;
      }
    } else if (s.phase === "cooldown") {
      s.cd = Math.max(0, s.cd - dt);
      if (s.cd <= 0) {
        s.phase = "ready";
        s.flash = 0.18;
      }
    }
  }
}

export function canUse(set: AbilitySet, id: AbilityId) {
  return set[id].phase === "ready";
}

export function activate(set: AbilitySet, id: AbilityId, duration = ABILITY[id].duration) {
  const s = set[id];
  if (s.phase !== "ready") return false;
  s.phase = "active";
  s.active = duration;
  s.cd = 0;
  return true;
}

export function abilityBusy(set: AbilitySet) {
  return (
    set.pounce.phase === "active" ||
    set.roll.phase === "active" ||
    set.boost.phase === "active"
  );
}

export type AbilityHud = {
  phase: AbilityPhase;
  cd01: number;
  flash: number;
};

export function hudOf(s: AbilitySlot): AbilityHud {
  if (s.phase === "cooldown") return { phase: s.phase, cd01: s.maxCd > 0 ? s.cd / s.maxCd : 0, flash: s.flash };
  if (s.phase === "active") return { phase: s.phase, cd01: 1, flash: s.flash };
  return { phase: "ready", cd01: 0, flash: s.flash };
}
