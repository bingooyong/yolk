import { useEffect, useState, type RefObject } from "react";
import * as THREE from "three";
import type { Accessory } from "@/game/config";
import type { CharacterPresentation } from "@/game/character-presentation";
import { EggMesh } from "@/game/EggMesh";
import { getSkin, type Skin } from "@/game/skins";
import {
  DEFAULT_PRESENTATION_PROFILE,
  isModelSkin,
} from "@/game/skins";
import {
  QualityGateRejectedError,
  clearSkinAssetCache,
  loadSkinAsset,
} from "@/engine/skin-asset/loader";

/**
 * CharacterVisual — picks the procedural EggMesh vs the GLB Model path
 * based on `skin.renderKind`.
 *
 * **Gameplay non-interference (R7)**:
 * - This component is purely visual. It mounts INSIDE the `<group ref={visual}>`
 *   already driven by `character-presentation.ts`. It does NOT alter the
 *   capsule collider, the kinematic body, the controller offset, the snap
 *   distance, the bounds, or any movement timing.
 * - On any load / parse / network error the Model path falls back to the
 *   procedural EggMesh so the player never gets a missing character.
 * - `presentationProfile.scale / verticalOffset / rotationOffset /
 *   contactShadowScale` are transform-only and applied to the Model's
 *   root group. They never feed back into physics.
 *
 * The `EggMesh` props (`color`, `accessory`, `isPlayer`, `presentation`)
 * are forwarded unchanged on the fallback path so visual parity is
 * preserved.
 */

type CharacterVisualProps = {
  skinId?: string;
  color: string;
  accessory?: Accessory;
  isPlayer?: boolean;
  presentation: RefObject<CharacterPresentation>;
};

export function CharacterVisual({
  skinId,
  color,
  accessory,
  isPlayer,
  presentation,
}: CharacterVisualProps) {
  const resolvedSkinId = skinId ?? "plain";
  const skin = getSkin(resolvedSkinId);
  if (!isModelSkin(resolvedSkinId) || !skin.modelUrl) {
    return (
      <EggMesh
        color={color}
        accessory={accessory}
        skinId={skinId}
        isPlayer={isPlayer}
        presentation={presentation}
      />
    );
  }
  return (
    <ModelVisual
      skin={skin}
      color={color}
      accessory={accessory}
      isPlayer={isPlayer}
      presentation={presentation}
    />
  );
}

function ModelVisual({
  skin,
  color,
  accessory,
  isPlayer,
  presentation,
}: {
  skin: Skin;
  color: string;
  accessory?: Accessory;
  isPlayer?: boolean;
  presentation: RefObject<CharacterPresentation>;
}) {
  const profile = skin.presentationProfile ?? DEFAULT_PRESENTATION_PROFILE;
  const [scene, setScene] = useState<THREE.Group | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!skin.modelUrl) return;
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
