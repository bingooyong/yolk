import { Suspense, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, Environment, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { CharacterVisual } from "@/components/CharacterVisual";
import { getSkin, type Skin } from "@/game/skins";
import {
  DEFAULT_PRESENTATION_PROFILE,
  isModelSkin,
} from "@/game/skins";
import { clearSkinAssetCache, loadSkinAsset } from "@/engine/skin-asset/loader";

/**
 * DeveloperSkinPreview — TanStack-Start-free R3F surface for inspecting a
 * single Skin (Model or Procedural) with orbit / zoom / auto-rotate and an
 * asset info panel.
 *
 * Mounted from `src/routes/dev/skin-preview.tsx`, which guards on
 * `import.meta.env.DEV`. The Preview component itself does NOT enforce the
 * dev guard — it is safe to ship in any environment, the route owns the
 * access policy.
 */
type Props = {
  skinId: string;
};

export function DeveloperSkinPreview({ skinId }: Props) {
  const skin = getSkin(skinId);
  return (
    <div className="flex h-dvh w-full flex-col bg-[var(--bg,theme(colors.bg))] text-fg">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex flex-col">
          <h1 className="text-base font-semibold">Skin Preview · {skin.name}</h1>
          <p className="text-xs text-fg-subtle">
            id: <code className="rounded bg-muted px-1">{skin.id}</code> · renderKind:{" "}
            <code className="rounded bg-muted px-1">{skin.renderKind}</code>
            {skin.assetRole ? (
              <>
                {" · role: "}
                <code className="rounded bg-muted px-1">{skin.assetRole}</code>
              </>
            ) : null}
          </p>
        </div>
        <SkinActions skin={skin} />
      </header>
      <main className="grid flex-1 grid-cols-1 gap-3 p-3 lg:grid-cols-[2fr_1fr]">
        <section className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-b from-bg to-bg-subtle">
          <Canvas
            shadows
            camera={{ position: [2.5, 1.5, 3.5], fov: 35 }}
            dpr={[1, 2]}
          >
            <color attach="background" args={["#1b1722"]} />
            <ambientLight intensity={0.4} />
            <directionalLight
              position={[3, 5, 4]}
              intensity={1.2}
              castShadow
              shadow-mapSize-width={1024}
              shadow-mapSize-height={1024}
            />
            <Suspense fallback={null}>
              <PreviewCharacter skin={skin} />
              <Environment preset="city" />
            </Suspense>
            <ContactShadows
              position={[0, -0.5, 0]}
              opacity={0.55}
              scale={5}
              blur={2.4}
              far={2}
            />
            <OrbitControls
              enablePan={false}
              minDistance={1.5}
              maxDistance={8}
              autoRotate
              autoRotateSpeed={0.6}
            />
          </Canvas>
          <PreviewBadge skin={skin} />
        </section>
        <aside className="overflow-y-auto rounded-2xl border border-border p-3">
          <AssetInfoPanel skin={skin} />
        </aside>
      </main>
    </div>
  );
}

function PreviewBadge({ skin }: { skin: Skin }) {
  if (skin.renderKind !== "model") return null;
  if (skin.assetRole !== "test") return null;
  return (
    <div className="pointer-events-none absolute left-3 top-3 max-w-[80%] rounded-full border border-amber-400/40 bg-amber-500/20 px-3 py-1 text-xs text-amber-200">
      Test asset — production characters would require PBR + Animation
    </div>
  );
}

function PreviewCharacter({ skin }: { skin: Skin }) {
  // Reuse the production CharacterVisual with a stable dummy presentation.
  // The Preview never feeds gameplay state into the character — it renders
  // an idle character for inspection only. The visual never enters the
  // physics simulation.
  const presentation = useIdlePresentation();
  return (
    <group position={[0, 0, 0]}>
      <CharacterVisual
        skinId={skin.id}
        color="#FFF6EB"
        isPlayer={false}
        presentation={presentation}
      />
    </group>
  );
}

function useIdlePresentation() {
  // Minimal stub — character-presentation expects a `RefObject<CharacterPresentation>`.
  // The Preview never mutates it; we just need a stable object so CharacterVisual
  // can pass it through unchanged. The actual Model renders from the static
  // presentationProfile transforms alone, so the squash/lean path stays inert.
  const [ref] = useState(() => ({
    current: {
      moveState: "idle" as const,
      grounded: true,
      horizontalSpeed: 0,
      verticalVelocity: 0,
      squash: 1,
      lean: 0,
      bank: 0,
      rollSpin: 0,
      rollT: 0,
      contactX: 0,
      contactY: 0,
      contactZ: 0,
      contactHeight: 0,
      contactValid: false,
    },
  }));
  return ref;
}

function SkinActions({ skin }: { skin: Skin }) {
  return (
    <div className="flex items-center gap-2 text-xs text-fg-subtle">
      <button
        type="button"
        className="rounded-full border border-border px-2 py-1 hover:border-accent"
        onClick={() => clearSkinAssetCache(skin.id)}
      >
        Reload GLB
      </button>
      <span>·</span>
      <span>360° auto-rotate · drag to orbit · scroll to zoom</span>
    </div>
  );
}

function AssetInfoPanel({ skin }: { skin: Skin }) {
  const profile = skin.presentationProfile ?? DEFAULT_PRESENTATION_PROFILE;
  const [manifestInfo, setManifestInfo] = useState<{
    triangleCount?: number;
    fileSizeKB?: number;
    error?: string;
  }>({});

  useEffect(() => {
    if (!isModelSkin(skin.id) || !skin.modelUrl) return;
    let cancelled = false;
    loadSkinAsset(skin.id, skin.modelUrl)
      .then((g) => {
        if (cancelled) return;
        if (!g) {
          setManifestInfo({ error: "GLB failed to load" });
          return;
        }
        let triCount = 0;
        g.traverse((obj: THREE.Object3D) => {
          if (obj instanceof THREE.Mesh && obj.geometry) {
            const idx = obj.geometry.getIndex();
            const pos = obj.geometry.getAttribute("position");
            if (idx) triCount += idx.count / 3;
            else if (pos) triCount += pos.count / 3;
          }
        });
        setManifestInfo({ triangleCount: Math.floor(triCount) });
      })
      .catch((err) => {
        if (!cancelled) setManifestInfo({ error: String(err) });
      });
    return () => {
      cancelled = true;
    };
  }, [skin.id, skin.modelUrl]);

  return (
    <div className="space-y-4 text-sm">
      <section>
        <h2 className="mb-1 text-xs uppercase tracking-wide text-fg-subtle">
          Presentation Profile
        </h2>
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1">
          <dt className="text-fg-subtle">scale</dt>
          <dd>{profile.scale}</dd>
          <dt className="text-fg-subtle">verticalOffset</dt>
          <dd>{profile.verticalOffset}</dd>
          <dt className="text-fg-subtle">rotationOffset.x</dt>
          <dd>{profile.rotationOffset.x}</dd>
          <dt className="text-fg-subtle">rotationOffset.y</dt>
          <dd>{profile.rotationOffset.y}</dd>
          <dt className="text-fg-subtle">rotationOffset.z</dt>
          <dd>{profile.rotationOffset.z}</dd>
          <dt className="text-fg-subtle">contactShadowScale</dt>
          <dd>{profile.contactShadowScale}</dd>
        </dl>
      </section>

      <section>
        <h2 className="mb-1 text-xs uppercase tracking-wide text-fg-subtle">
          Animation
        </h2>
        <p>
          status: <code>{skin.animationProfile?.status ?? "static"}</code>
        </p>
      </section>

      {skin.renderKind === "model" ? (
        <section>
          <h2 className="mb-1 text-xs uppercase tracking-wide text-fg-subtle">
            Asset
          </h2>
          <p>
            <span className="text-fg-subtle">URL</span>{" "}
            <code className="break-all">{skin.modelUrl}</code>
          </p>
          <p>
            <span className="text-fg-subtle">LOD0/1/2</span>{" "}
            <code className="break-all">{skin.lod0 ?? "—"}</code>
          </p>
          {manifestInfo.triangleCount != null ? (
            <p>
              <span className="text-fg-subtle">Triangle Count</span>{" "}
              <code>{manifestInfo.triangleCount}</code>
            </p>
          ) : null}
          {manifestInfo.error ? (
            <p className="text-red-400">{manifestInfo.error}</p>
          ) : null}
        </section>
      ) : (
        <section>
          <h2 className="mb-1 text-xs uppercase tracking-wide text-fg-subtle">
            Asset
          </h2>
          <p>
            <span className="text-fg-subtle">kind</span>{" "}
            <code>{skin.kind}</code>
          </p>
          <p>
            <span className="text-fg-subtle">tint</span>{" "}
            <code>{skin.tint}</code>
          </p>
          {skin.hat ? (
            <p>
              <span className="text-fg-subtle">hat</span>{" "}
              <code>{skin.hat}</code>
            </p>
          ) : null}
        </section>
      )}

      <section>
        <h2 className="mb-1 text-xs uppercase tracking-wide text-fg-subtle">
          Quality Gate
        </h2>
        <p>
          role: <code>{skin.assetRole ?? "production (default)"}</code>
        </p>
        <p className="text-xs text-fg-subtle">
          Run <code>scripts/quality-gate.mjs</code> with the matching{" "}
          <code>--role</code> to view errors and warnings.
        </p>
      </section>
    </div>
  );
}
