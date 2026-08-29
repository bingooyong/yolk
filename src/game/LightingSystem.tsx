import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { Quality } from "@/engine/device";
import { getVisualProfile, VISUAL_FOUNDATION } from "@/engine/visualProfile";
import { skyTex } from "./look";
import { sim } from "./sim";

/**
 * A compact three-point rig plus a procedural gradient environment.
 *
 * The environment is generated once per quality mode from the existing 8×64
 * canvas gradient. No HDR, network asset, or full-screen render pass is used.
 */
function ProceduralEnvironment({ size, intensity }: { size: number; intensity: number }) {
  const { gl, scene } = useThree();

  useEffect(() => {
    const source = skyTex();
    const previousEnvironment = scene.environment;
    const previousIntensity = scene.environmentIntensity;
    const previousMapping = source.mapping;
    const target = new THREE.WebGLCubeRenderTarget(size, {
      generateMipmaps: true,
      minFilter: THREE.LinearMipmapLinearFilter,
      magFilter: THREE.LinearFilter,
    });

    source.mapping = THREE.EquirectangularReflectionMapping;
    target.fromEquirectangularTexture(gl, source);
    source.mapping = previousMapping;

    scene.environment = target.texture;
    scene.environmentIntensity = intensity;

    return () => {
      scene.environment = previousEnvironment;
      scene.environmentIntensity = previousIntensity;
      target.dispose();
    };
  }, [gl, intensity, scene, size]);

  return null;
}

export function LightingSystem({ quality }: { quality: Quality }) {
  const profile = getVisualProfile(quality);
  const light = VISUAL_FOUNDATION.lighting;
  const key = useRef<THREE.DirectionalLight>(null);
  const fill = useRef<THREE.DirectionalLight>(null);
  const rim = useRef<THREE.DirectionalLight>(null);
  const offsets = useMemo(
    () => ({
      key: new THREE.Vector3(...light.key.offset),
      fill: new THREE.Vector3(...light.fill.offset),
      rim: new THREE.Vector3(...light.rim.offset),
    }),
    [light],
  );

  useFrame(() => {
    const player = sim.racers.find((r) => r.isPlayer);
    const lights = [
      [key.current, offsets.key] as const,
      [fill.current, offsets.fill] as const,
      [rim.current, offsets.rim] as const,
    ];

    for (const [directionalLight, offset] of lights) {
      if (!directionalLight) continue;
      const x = player?.x ?? 0;
      const y = player?.y ?? 0.7;
      const z = player?.z ?? 6;
      directionalLight.position.set(x + offset.x, y + offset.y, z + offset.z);
      directionalLight.target.position.set(x, y, z);
      directionalLight.target.updateMatrixWorld();
    }
  });

  const shadowSize = Math.max(profile.shadowMapSize, 1);

  return (
    <>
      <ambientLight intensity={light.ambientIntensity} />
      <hemisphereLight
        color={light.hemisphere.skyColor}
        groundColor={light.hemisphere.groundColor}
        intensity={light.hemisphere.intensity}
      />
      <directionalLight
        ref={key}
        color={light.key.color}
        intensity={light.key.intensity}
        castShadow={profile.shadows}
        shadow-mapSize={[shadowSize, shadowSize]}
        shadow-camera-near={light.shadow.near}
        shadow-camera-far={light.shadow.far}
        shadow-camera-left={-light.shadow.extent}
        shadow-camera-right={light.shadow.extent}
        shadow-camera-top={light.shadow.extent}
        shadow-camera-bottom={-light.shadow.extent}
        shadow-bias={light.shadow.bias}
      >
        <object3D attach="target" />
      </directionalLight>
      <directionalLight ref={fill} color={light.fill.color} intensity={light.fill.intensity}>
        <object3D attach="target" />
      </directionalLight>
      <directionalLight ref={rim} color={light.rim.color} intensity={light.rim.intensity}>
        <object3D attach="target" />
      </directionalLight>
      <ProceduralEnvironment
        size={profile.environmentMapSize}
        intensity={profile.environmentIntensity}
      />
    </>
  );
}
