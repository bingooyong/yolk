import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Accessory } from "./config";
import { getSkin, type Skin } from "./skins";

type Props = {
  color: string;
  accessory?: Accessory;
  skinId?: string;
  squash?: number;
};

export function EggMesh({ color, accessory = "sprout", skinId, squash = 1 }: Props) {
  const sy = squash;
  const sx = 1 / Math.sqrt(sy);
  const skin = skinId ? getSkin(skinId) : null;
  const hat = (skin?.hat ?? (skin?.kind === "none" ? undefined : accessory)) as Accessory | undefined;
  const parts = useMemo(() => hat, [hat]);

  return (
    <group scale={[sx, sy, sx]}>
      <mesh castShadow>
        <sphereGeometry args={[0.52, 28, 22]} />
        <meshLambertMaterial color={color} />
      </mesh>
      <mesh position={[0, -0.18, 0]} scale={[1.02, 0.72, 1.02]} castShadow>
        <sphereGeometry args={[0.5, 24, 16]} />
        <meshLambertMaterial color={color} />
      </mesh>

      <mesh position={[-0.16, 0.12, 0.4]}>
        <sphereGeometry args={[0.13, 16, 12]} />
        <meshLambertMaterial color="#FFF6EB" />
      </mesh>
      <mesh position={[0.16, 0.12, 0.4]}>
        <sphereGeometry args={[0.13, 16, 12]} />
        <meshLambertMaterial color="#FFF6EB" />
      </mesh>
      <mesh position={[-0.16, 0.12, 0.5]}>
        <sphereGeometry args={[0.07, 12, 10]} />
        <meshLambertMaterial color="#17141C" />
      </mesh>
      <mesh position={[0.16, 0.12, 0.5]}>
        <sphereGeometry args={[0.07, 12, 10]} />
        <meshLambertMaterial color="#17141C" />
      </mesh>
      <mesh position={[-0.13, 0.16, 0.54]}>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshLambertMaterial color="#FFF6EB" />
      </mesh>
      <mesh position={[0.19, 0.16, 0.54]}>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshLambertMaterial color="#FFF6EB" />
      </mesh>

      <mesh position={[-0.22, -0.02, 0.42]} scale={[1, 0.7, 0.5]}>
        <sphereGeometry args={[0.07, 10, 8]} />
        <meshLambertMaterial color="#F0A07A" />
      </mesh>
      <mesh position={[0.22, -0.02, 0.42]} scale={[1, 0.7, 0.5]}>
        <sphereGeometry args={[0.07, 10, 8]} />
        <meshLambertMaterial color="#F0A07A" />
      </mesh>

      <mesh position={[0, -0.08, 0.46]} rotation={[Math.PI / 2.4, 0, 0]}>
        <torusGeometry args={[0.12, 0.025, 8, 14, Math.PI]} />
        <meshLambertMaterial color="#17141C" />
      </mesh>

      <mesh position={[-0.18, -0.48, 0.12]} scale={[1, 0.55, 1.1]}>
        <sphereGeometry args={[0.12, 12, 10]} />
        <meshLambertMaterial color={color} />
      </mesh>
      <mesh position={[0.18, -0.48, 0.12]} scale={[1, 0.55, 1.1]}>
        <sphereGeometry args={[0.12, 12, 10]} />
        <meshLambertMaterial color={color} />
      </mesh>

      {parts === "sprout" && skin?.kind !== "crown" && skin?.kind !== "halo" && (
        <group position={[0.02, 0.52, 0]}>
          <mesh>
            <cylinderGeometry args={[0.03, 0.04, 0.18, 8]} />
            <meshLambertMaterial color="#2DB8A1" />
          </mesh>
          <mesh position={[0.08, 0.12, 0]} rotation={[0, 0, -0.6]}>
            <sphereGeometry args={[0.09, 10, 8]} />
            <meshLambertMaterial color="#3DCFB0" />
          </mesh>
        </group>
      )}
      {parts === "bow" && skin?.kind !== "wings" && (
        <group position={[0, 0.5, 0.05]}>
          <mesh rotation={[0, 0, 0.5]} scale={[1.2, 0.55, 0.4]}>
            <sphereGeometry args={[0.12, 10, 8]} />
            <meshLambertMaterial color="#E08AA4" />
          </mesh>
          <mesh rotation={[0, 0, -0.5]} position={[0.12, 0, 0]} scale={[1.2, 0.55, 0.4]}>
            <sphereGeometry args={[0.12, 10, 8]} />
            <meshLambertMaterial color="#E08AA4" />
          </mesh>
        </group>
      )}
      {parts === "star" && (
        <mesh position={[0, 0.58, 0]}>
          <octahedronGeometry args={[0.12, 0]} />
          <meshLambertMaterial color="#E8C85A" />
        </mesh>
      )}
      {parts === "leaf" && (
        <mesh position={[0.1, 0.54, 0]} rotation={[0, 0, -0.5]} scale={[0.7, 1.2, 0.25]}>
          <sphereGeometry args={[0.14, 10, 8]} />
          <meshLambertMaterial color="#2DB8A1" />
        </mesh>
      )}
      {parts === "antenna" && (
        <group position={[0, 0.5, 0]}>
          <mesh position={[-0.1, 0.12, 0]}>
            <cylinderGeometry args={[0.02, 0.025, 0.28, 6]} />
            <meshLambertMaterial color="#17141C" />
          </mesh>
          <mesh position={[0.1, 0.12, 0]}>
            <cylinderGeometry args={[0.02, 0.025, 0.28, 6]} />
            <meshLambertMaterial color="#17141C" />
          </mesh>
          <mesh position={[-0.1, 0.28, 0]}>
            <sphereGeometry args={[0.06, 10, 8]} />
            <meshLambertMaterial color="#E8614A" />
          </mesh>
          <mesh position={[0.1, 0.28, 0]}>
            <sphereGeometry args={[0.06, 10, 8]} />
            <meshLambertMaterial color="#E8614A" />
          </mesh>
        </group>
      )}
      {parts === "tuft" && (
        <mesh position={[0, 0.54, 0]} scale={[0.7, 1.1, 0.7]}>
          <sphereGeometry args={[0.12, 10, 8]} />
          <meshLambertMaterial color={color} />
        </mesh>
      )}

      {skin && <SkinBits skin={skin} />}
    </group>
  );
}

function SkinBits({ skin }: { skin: Skin }) {
  if (skin.kind === "wings") return <Wings tint={skin.tint} />;
  if (skin.kind === "cape") {
    return (
      <mesh position={[0, -0.08, -0.48]} rotation={[0.42, 0, 0]} scale={[1.05, 1.35, 0.2]} castShadow>
        <sphereGeometry args={[0.46, 12, 10]} />
        <meshLambertMaterial color={skin.tint} />
      </mesh>
    );
  }
  if (skin.kind === "ears") {
    return (
      <group>
        <mesh position={[-0.18, 0.62, 0]} rotation={[0, 0, 0.25]} scale={[0.35, 1, 0.28]} castShadow>
          <sphereGeometry args={[0.22, 10, 8]} />
          <meshLambertMaterial color={skin.tint} />
        </mesh>
        <mesh position={[0.18, 0.62, 0]} rotation={[0, 0, -0.25]} scale={[0.35, 1, 0.28]} castShadow>
          <sphereGeometry args={[0.22, 10, 8]} />
          <meshLambertMaterial color={skin.tint} />
        </mesh>
        <mesh position={[-0.18, 0.58, 0.04]} rotation={[0, 0, 0.25]} scale={[0.18, 0.55, 0.12]}>
          <sphereGeometry args={[0.18, 8, 8]} />
          <meshLambertMaterial color="#E08AA4" />
        </mesh>
        <mesh position={[0.18, 0.58, 0.04]} rotation={[0, 0, -0.25]} scale={[0.18, 0.55, 0.12]}>
          <sphereGeometry args={[0.18, 8, 8]} />
          <meshLambertMaterial color="#E08AA4" />
        </mesh>
      </group>
    );
  }
  if (skin.kind === "halo") {
    return <Halo tint={skin.tint} />;
  }
  if (skin.kind === "crown") {
    return (
      <group position={[0, 0.58, 0]}>
        <mesh>
          <cylinderGeometry args={[0.22, 0.26, 0.16, 6]} />
          <meshLambertMaterial color={skin.tint} />
        </mesh>
        <mesh position={[0, 0.16, 0.18]}>
          <coneGeometry args={[0.07, 0.18, 6]} />
          <meshLambertMaterial color={skin.tint} />
        </mesh>
        <mesh position={[0.16, 0.14, -0.08]}>
          <coneGeometry args={[0.06, 0.14, 6]} />
          <meshLambertMaterial color={skin.tint} />
        </mesh>
        <mesh position={[-0.16, 0.14, -0.08]}>
          <coneGeometry args={[0.06, 0.14, 6]} />
          <meshLambertMaterial color={skin.tint} />
        </mesh>
      </group>
    );
  }
  return null;
}

function Wings({ tint }: { tint: string }) {
  const left = useRef<THREE.Group>(null);
  const right = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const f = Math.sin(clock.elapsedTime * 7.2) * 0.42;
    if (left.current) left.current.rotation.z = -0.35 + f;
    if (right.current) right.current.rotation.z = 0.35 - f;
  });
  return (
    <group>
      <group ref={left} position={[-0.22, 0.08, -0.12]}>
        <mesh position={[-0.38, 0.06, -0.04]} rotation={[0.15, 0.45, 0]} scale={[1, 0.72, 0.16]} castShadow>
          <sphereGeometry args={[0.42, 12, 10]} />
          <meshLambertMaterial color={tint} transparent opacity={0.94} />
        </mesh>
        <mesh position={[-0.58, 0.22, 0]} rotation={[0.05, 0.2, 0]} scale={[0.7, 0.42, 0.12]}>
          <sphereGeometry args={[0.32, 10, 8]} />
          <meshLambertMaterial color={tint} />
        </mesh>
      </group>
      <group ref={right} position={[0.22, 0.08, -0.12]}>
        <mesh position={[0.38, 0.06, -0.04]} rotation={[0.15, -0.45, 0]} scale={[1, 0.72, 0.16]} castShadow>
          <sphereGeometry args={[0.42, 12, 10]} />
          <meshLambertMaterial color={tint} transparent opacity={0.94} />
        </mesh>
        <mesh position={[0.58, 0.22, 0]} rotation={[0.05, -0.2, 0]} scale={[0.7, 0.42, 0.12]}>
          <sphereGeometry args={[0.32, 10, 8]} />
          <meshLambertMaterial color={tint} />
        </mesh>
      </group>
    </group>
  );
}

function Halo({ tint }: { tint: string }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.position.y = 0.78 + Math.sin(clock.elapsedTime * 2.4) * 0.04;
  });
  return (
    <mesh ref={ref} position={[0, 0.78, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[0.3, 0.038, 8, 22]} />
      <meshLambertMaterial color={tint} emissive={tint} emissiveIntensity={0.55} />
    </mesh>
  );
}
