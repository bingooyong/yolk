import type { ComponentType, RefObject } from "react";
import type { Accessory } from "../config";
import type { CharacterPresentation } from "../character-presentation";
import { EggMesh } from "../EggMesh";
import { getSkin, type VisualId } from "../skins";
import { BearMesh } from "./BearMesh";
import { KnightMesh } from "./KnightMesh";

export type CharacterVisualProps = {
  color: string;
  accessory?: Accessory;
  skinId?: string;
  isPlayer?: boolean;
  presentation: RefObject<CharacterPresentation>;
};

const SKIN_VISUALS: Record<VisualId, ComponentType<CharacterVisualProps>> = {
  yolk: EggMesh,
  knight: KnightMesh,
  bear: BearMesh,
};

export function CharacterVisual(props: CharacterVisualProps) {
  const visualId = getSkin(props.skinId ?? "plain").visualId;
  const Mesh = SKIN_VISUALS[visualId] ?? EggMesh;
  return <Mesh {...props} />;
}
