import { useEffect, useMemo, useRef, useState, type ComponentType, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Accessory } from "../config";
import {
  EGG_VISUAL_GROUND_OFFSET,
  getCharacterPose,
  type CharacterPresentation,
} from "../character-presentation";
import { glowTex } from "../look";
import { EggMesh } from "../EggMesh";
import {
  DEFAULT_PRESENTATION_PROFILE,
  getSkin,
  isModelSkin,
  type Skin,
  type VisualId,
} from "../skins";
import {
  QualityGateRejectedError,
  clearSkinAssetCache,
  loadSkinAsset,
} from "../../engine/skin-asset/loader";
import { useGameStore } from "../store";
import { BearMesh } from "./BearMesh";
import { KnightMesh } from "./KnightMesh";
import { RabbitMesh } from "./RabbitMesh";
import { RobotMesh } from "./RobotMesh";

/**
 * CharacterVisual — picks the right visual for the requested Skin.
 *
 * Routing order (R7 + Model Pipeline contract):
 *   1. `renderKind: "model"` and a `modelUrl` → load GLB through SkinAssetLoader.
 *      On load failure / Quality Gate rejection / missing scene we fall back
 *      to the procedural EggMesh so gameplay never blocks.
 *   2. Otherwise → `visualId` registry → procedural full-character mesh
 *      (KnightMesh, BearMesh, RabbitMesh, RobotMesh). Falls back to EggMesh for unknown ids.
 *   3. Final safety net → EggMesh (the original procedural character).
 *
 * **Gameplay non-interference (R7)**:
 * - Mounts inside the existing `<group ref={visual}>` driven by
 *   `character-presentation.ts`. Does NOT alter the capsule collider, the
 *   kinematic body, the controller offset, the snap distance, the bounds,
 *   or any movement timing.
 * - `presentationProfile.scale / verticalOffset / rotationOffset /
 *   contactShadowScale` are transform-only and applied to the Model's
 *   root group. They never feed back into physics.
 * - Model-rendered scenes are cloned via `scene.clone()` so the cached
 *   group is not mutated.
 */
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
  rabbit: RabbitMesh,
  robot: RobotMesh,
};

export function CharacterVisual(props: CharacterVisualProps) {
  const skin = getSkin(props.skinId ?? "plain");

  // 1. Model path — GLB Asset Loader with Quality Gate.
  if (isModelSkin(skin.id) && skin.modelUrl) {
    return <ModelVisual skin={skin} {...props} />;
  }

  // 2. Procedural path — visualId → registered mesh.
  const Mesh = SKIN_VISUALS[skin.visualId] ?? EggMesh;
  return <Mesh {...props} />;
}

function ModelVisual({
  skin,
  color,
  accessory,
  isPlayer,
  presentation,
}: CharacterVisualProps & { skin: Skin }) {
  const profile = skin.presentationProfile ?? DEFAULT_PRESENTATION_PROFILE;
  const overrideUrl = useGameStore((s) => s.modelUrlOverrides[skin.id]);
  const modelUrl = overrideUrl ?? skin.modelUrl;
  const [scene, setScene] = useState<THREE.Group | null>(null);
  const [failed, setFailed] = useState(false);
  const group = useRef<THREE.Group>(null);
  const glow = useMemo(() => glowTex(), []);

  useEffect(() => {
    let cancelled = false;
    if (!modelUrl) {
      setFailed(true);
      return;
    }
    setFailed(false);
    setScene(null);
    loadSkinAsset(skin.id, modelUrl)
      .then((g) => {
        if (cancelled) return;
        if (!g) setFailed(true);
        else setScene(g);
      })
      .catch((err: unknown) => {
        if (err instanceof QualityGateRejectedError) {
          console.warn(
            `[CharacterVisual] Skin "${err.skinId}" rejected by Quality Gate (role=${err.role}): ${err.errors.join("; ")}`,
          );
        }
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [skin.id, modelUrl]);

  useEffect(() => {
    return () => clearSkinAssetCache(skin.id);
  }, [skin.id]);

  useFrame(({ clock }) => {
    const pose = getCharacterPose(
      presentation.current,
      clock.elapsedTime,
      skin.proceduralAnimation,
    );
    if (!group.current) return;
    group.current.position.y = EGG_VISUAL_GROUND_OFFSET + pose.lift + profile.verticalOffset;
    group.current.scale.set(
      pose.scaleX * profile.scale,
      pose.scaleY * profile.scale,
      pose.scaleZ * profile.scale,
    );
  });

  if (failed || !scene) {
    return (
      <EggMesh
        color={color}
        accessory={accessory}
        skinId={skin.id}
        isPlayer={isPlayer}
        presentation={presentation}
      />
    );
  }

  const rotOffset = profile.rotationOffset;
  return (
    <group
      ref={group}
      scale={profile.scale}
      position={[0, EGG_VISUAL_GROUND_OFFSET + profile.verticalOffset, 0]}
      rotation={[rotOffset.x, rotOffset.y, rotOffset.z]}
    >
      {isPlayer && (
        <sprite position={[0, 0.08, 0]} scale={[2.1, 2.1, 1]}>
          <spriteMaterial
            map={glow}
            color={color}
            transparent
            opacity={0.32}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </sprite>
      )}
      <primitive object={scene.clone()} />
    </group>
  );
}
