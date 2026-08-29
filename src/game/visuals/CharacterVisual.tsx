import { useEffect, useState, type ComponentType, type RefObject } from "react";
import * as THREE from "three";
import type { Accessory } from "../config";
import type { CharacterPresentation } from "../character-presentation";
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
import { BearMesh } from "./BearMesh";
import { KnightMesh } from "./KnightMesh";

/**
 * CharacterVisual — picks the right visual for the requested Skin.
 *
 * Routing order (R7 + Model Pipeline contract):
 *   1. `renderKind: "model"` and a `modelUrl` → load GLB through SkinAssetLoader.
 *      On load failure / Quality Gate rejection / missing scene we fall back
 *      to the procedural EggMesh so gameplay never blocks.
 *   2. Otherwise → `visualId` registry → procedural full-character mesh
 *      (KnightMesh, BearMesh). Falls back to EggMesh for unknown ids.
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
  const [scene, setScene] = useState<THREE.Group | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!skin.modelUrl) {
      setFailed(true);
      return;
    }
    loadSkinAsset(skin.id, skin.modelUrl)
      .then((g) => {
        if (cancelled) return;
        if (!g) setFailed(true);
        else setScene(g);
      })
      .catch((err: unknown) => {
        // Quality Gate rejections are expected (production assets can be
        // re-graded); log them so developers see the reason in DevTools.
        // Gameplay never blocks — we still fall back to the procedural
        // EggMesh on the path below.
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
  }, [skin.id, skin.modelUrl]);

  // Cleanup the cache entry when the Skin is swapped so we don't hold
  // references to old GLBs forever.
  useEffect(() => {
    return () => clearSkinAssetCache(skin.id);
  }, [skin.id]);

  // Fallback path: load failed or modelUrl missing. NEVER block gameplay.
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

  // presentationProfile is transform-only: scale / verticalOffset /
  // rotationOffset. These compose multiplicatively with the parent
  // `<group ref={visual}>` squash/lean/breath from character-presentation,
  // which is exactly the contract R7 demands.
  const rotOffset = profile.rotationOffset;
  return (
    <group
      scale={profile.scale}
      position-y={profile.verticalOffset}
      rotation={[rotOffset.x, rotOffset.y, rotOffset.z]}
    >
      <primitive object={scene.clone()} />
    </group>
  );
}