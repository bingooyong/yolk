import { PHYSICS_DT } from "../engine/pipeline.ts";

export const APP_NAME = "蛋黄冲刺";
export const APP_NAME_EN = "Yolk Rush";

export const STEP = PHYSICS_DT;
export const GRAVITY = 28;
export const FALL_GRAVITY = 48;
export const RISE_GRAVITY = 24;
export const TERMINAL_V = 18;
export const MOVE_SPEED = 8.4;
export const AIR_SPEED = 7.4;
export const DASH_SPEED = 16.5;
export const DASH_TIME = 0.28;
export const DASH_COOLDOWN = 0.95;

export const DASH = {
  chargeMax: 0.92,
  tapWindow: 0.14,
  levelAt: [0.16, 0.48, 0.82] as const,
  speed: [12.2, 16.4, 20.2] as const,
  time: [0.16, 0.26, 0.36] as const,
  cooldown: 0.95,
  recover: 0.16,
  fov: [2.2, 4.0, 6.2] as const,
  shake: [0.03, 0.055, 0.08] as const,
  maxSpeed: 21,
  maxTime: 0.4,
} as const;

export const JUMP_FEEL = {
  squash: 0.78,
  stretch: 1.12,
  landSquash: 0.82,
} as const;
export const JUMP_V = 9.5;
export const JUMP_CUT = 0.52;
export const COYOTE = 0.14;
export const JUMP_BUFFER = 0.12;
export const TURN_LERP = 14;
export const KILL_Y = -12;
export const FINISH_Z = -186;
export const START_Z = 6;
export const EGG_RADIUS = 0.5;
export const EGG_HALF = 0.1;
export const EGG_BUMP = 1.05;
export const CAM_DIST = 6.2;
export const CAM_HEIGHT = 2.55;
export const CAM_LOOKAHEAD = 3.4;
export const CAM_PITCH_MIN = -0.32;
export const CAM_PITCH_MAX = 0.48;
export const CAM_RECENTER = 1.7;

export type EggColor = {
  id: string;
  hex: string;
  name: string;
};

export const EGG_COLORS: EggColor[] = [
  { id: "coral", hex: "#E8614A", name: "珊瑚" },
  { id: "mint", hex: "#2DB8A1", name: "薄荷" },
  { id: "sky", hex: "#5BAFE0", name: "晴空" },
  { id: "peach", hex: "#F0A07A", name: "蜜桃" },
  { id: "butter", hex: "#E8C85A", name: "奶黄" },
  { id: "rose", hex: "#E08AA4", name: "玫瑰" },
  { id: "lilac", hex: "#A99AD6", name: "香芋" },
  { id: "slate", hex: "#7A90A8", name: "海盐" },
];

export const BOT_NAMES = ["小团", "糯米", "波波", "豆豆", "泡芙", "麻薯", "蛋蛋"];

export const ACCESSORIES = ["sprout", "bow", "star", "leaf", "antenna", "tuft", "none"] as const;

export type Accessory = (typeof ACCESSORIES)[number];
