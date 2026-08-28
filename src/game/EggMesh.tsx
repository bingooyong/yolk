import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Accessory } from "./config";
import { glowTex, toonRamp } from "./look";
import { getSkin, type Skin } from "./skins";

type Props = {
  color: string;
  accessory?: Accessory;
  skinId?: string;
  squash?: number;
  isPlayer?: boolean;
};

const eggGeo = new THREE.SphereGeometry(0.52, 36, 28);
eggGeo.scale(1.02, 1.26, 0.96);

export function EggMesh({
  color,
  accessory = "sprout",
  skinId,
  squash = 1,
  isPlayer = false,
}: Props) {
  const sy = squash;
  const sx = 1 / Math.sqrt(sy);
  const skin = skinId ? getSkin(skinId) : null;
  const hat = (skin?.hat ?? (skin?.kind === "none" ? undefined : accessory)) as
    | Accessory
    | undefined;
  const ramp = useMemo(() => toonRamp(), []);
  const glow = useMemo(() => glowTex(), []);
  const dark = useMemo(() => new THREE.Color(color).multiplyScalar(0.72).getStyle(), [color]);
  const group = useRef<THREE.Group>(null);
  const arms = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (group.current) {
      group.current.position.y = Math.sin(t * 2.4) * 0.03;
    }
    if (arms.current) {
      arms.current.rotation.z = Math.sin(t * 3.2) * 0.12;
    }
  });

  return (
    <group scale={[sx, sy, sx]}>
      {isPlayer && (
        <sprite position={[0, 0.05, 0]} scale={[2.4, 2.4, 1]}>
          <spriteMaterial
            map={glow}
            color={color}
            transparent
            opacity={0.55}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </sprite>
      )}

      <group ref={group}>
        <mesh geometry={eggGeo} scale={1.085}>
          <meshBasicMaterial color="#1A1424" side={THREE.BackSide} />
        </mesh>

        <mesh geometry={eggGeo} castShadow>
          <meshToonMaterial color={color} gradientMap={ramp} />
        </mesh>
        <mesh position={[0, -0.22, 0.04]} scale={[1.02, 0.62, 1.02]} castShadow>
          <sphereGeometry args={[0.5, 28, 18]} />
          <meshToonMaterial color={dark} gradientMap={ramp} />
        </mesh>
        <mesh position={[0, 0.08, 0.16]} scale={[0.72, 0.55, 0.4]}>
          <sphereGeometry args={[0.42, 18, 12]} />
          <meshToonMaterial color="#FFF3EA" gradientMap={ramp} />
        </mesh>

        <mesh position={[-0.2, -0.52, 0.1]} scale={[1, 0.5, 1.15]} castShadow>
          <sphereGeometry args={[0.16, 14, 10]} />
          <meshToonMaterial color={color} gradientMap={ramp} />
        </mesh>
        <mesh position={[0.2, -0.52, 0.1]} scale={[1, 0.5, 1.15]} castShadow>
          <sphereGeometry args={[0.16, 14, 10]} />
          <meshToonMaterial color={color} gradientMap={ramp} />
        </mesh>

        <group ref={arms}>
          <mesh position={[-0.46, -0.08, 0.06]} rotation={[0, 0, 0.4]} scale={[0.55, 1, 0.7]}>
            <sphereGeometry args={[0.16, 12, 10]} />
            <meshToonMaterial color={color} gradientMap={ramp} />
          </mesh>
          <mesh position={[0.46, -0.08, 0.06]} rotation={[0, 0, -0.4]} scale={[0.55, 1, 0.7]}>
            <sphereGeometry args={[0.16, 12, 10]} />
            <meshToonMaterial color={color} gradientMap={ramp} />
          </mesh>
        </group>

        <Face />

        {hat === "sprout" && skin?.kind !== "crown" && skin?.kind !== "halo" && <Sprout />}
        {hat === "bow" && skin?.kind !== "wings" && <Bow />}
        {hat === "star" && <StarHat />}
        {hat === "leaf" && <Leaf />}
        {hat === "antenna" && <Antenna />}
        {hat === "tuft" && (
          <mesh position={[0, 0.66, 0]} scale={[0.7, 1.15, 0.7]}>
            <sphereGeometry args={[0.13, 12, 10]} />
            <meshToonMaterial color={color} gradientMap={ramp} />
          </mesh>
        )}

        {skin && <SkinBits skin={skin} />}
      </group>
    </group>
  );
}

function Face() {
  return (
    <group position={[0, 0.08, 0.42]}>
      <mesh position={[-0.15, 0.06, 0.08]}>
        <sphereGeometry args={[0.155, 18, 14]} />
        <meshBasicMaterial color="#FFFDF8" />
      </mesh>
      <mesh position={[0.15, 0.06, 0.08]}>
        <sphereGeometry args={[0.155, 18, 14]} />
        <meshBasicMaterial color="#FFFDF8" />
      </mesh>
      <mesh position={[-0.15, 0.05, 0.2]}>
        <sphereGeometry args={[0.08, 14, 12]} />
        <meshBasicMaterial color="#17141C" />
      </mesh>
      <mesh position={[0.15, 0.05, 0.2]}>
        <sphereGeometry args={[0.08, 14, 12]} />
        <meshBasicMaterial color="#17141C" />
      </mesh>
      <mesh position={[-0.12, 0.1, 0.255]}>
        <sphereGeometry args={[0.035, 10, 8]} />
        <meshBasicMaterial color="#FFFFFF" />
      </mesh>
      <mesh position={[0.18, 0.1, 0.255]}>
        <sphereGeometry args={[0.035, 10, 8]} />
        <meshBasicMaterial color="#FFFFFF" />
      </mesh>
      <mesh position={[-0.24, -0.06, 0.1]} scale={[1, 0.65, 0.45]}>
        <sphereGeometry args={[0.08, 10, 8]} />
        <meshBasicMaterial color="#FF8A9A" />
      </mesh>
      <mesh position={[0.24, -0.06, 0.1]} scale={[1, 0.65, 0.45]}>
        <sphereGeometry args={[0.08, 10, 8]} />
        <meshBasicMaterial color="#FF8A9A" />
      </mesh>
      <mesh position={[0, -0.12, 0.14]} rotation={[Math.PI / 2.2, 0, 0]}>
        <torusGeometry args={[0.11, 0.028, 8, 16, Math.PI]} />
        <meshBasicMaterial color="#17141C" />
      </mesh>
    </group>
  );
}

function Sprout() {
  return (
    <group position={[0.04, 0.64, 0]}>
      <mesh>
        <cylinderGeometry args={[0.032, 0.042, 0.2, 8]} />
        <meshToonMaterial color="#2DB8A1" gradientMap={toonRamp()} />
      </mesh>
      <mesh position={[0.1, 0.14, 0]} rotation={[0, 0, -0.55]} scale={[1, 0.55, 0.28]}>
        <sphereGeometry args={[0.12, 12, 8]} />
        <meshToonMaterial color="#3DCFB0" gradientMap={toonRamp()} />
      </mesh>
    </group>
  );
}

function Bow() {
  return (
    <group position={[0, 0.62, 0.06]}>
      <mesh rotation={[0, 0, 0.5]} scale={[1.25, 0.55, 0.38]}>
        <sphereGeometry args={[0.13, 12, 8]} />
        <meshToonMaterial color="#E08AA4" gradientMap={toonRamp()} />
      </mesh>
      <mesh rotation={[0, 0, -0.5]} position={[0.13, 0, 0]} scale={[1.25, 0.55, 0.38]}>
        <sphereGeometry args={[0.13, 12, 8]} />
        <meshToonMaterial color="#E08AA4" gradientMap={toonRamp()} />
      </mesh>
    </group>
  );
}

function StarHat() {
  return (
    <mesh position={[0, 0.72, 0]}>
      <octahedronGeometry args={[0.14, 0]} />
      <meshToonMaterial color="#E8C85A" gradientMap={toonRamp()} />
    </mesh>
  );
}

function Leaf() {
  return (
    <mesh position={[0.12, 0.66, 0]} rotation={[0, 0, -0.5]} scale={[0.7, 1.25, 0.22]}>
      <sphereGeometry args={[0.15, 12, 8]} />
      <meshToonMaterial color="#2DB8A1" gradientMap={toonRamp()} />
    </mesh>
  );
}

function Antenna() {
  return (
    <group position={[0, 0.62, 0]}>
      <mesh position={[-0.11, 0.14, 0]}>
        <cylinderGeometry args={[0.02, 0.026, 0.3, 6]} />
        <meshBasicMaterial color="#17141C" />
      </mesh>
      <mesh position={[0.11, 0.14, 0]}>
        <cylinderGeometry args={[0.02, 0.026, 0.3, 6]} />
        <meshBasicMaterial color="#17141C" />
      </mesh>
      <mesh position={[-0.11, 0.3, 0]}>
        <sphereGeometry args={[0.065, 12, 8]} />
        <meshToonMaterial color="#E8614A" gradientMap={toonRamp()} />
      </mesh>
      <mesh position={[0.11, 0.3, 0]}>
        <sphereGeometry args={[0.065, 12, 8]} />
        <meshToonMaterial color="#E8614A" gradientMap={toonRamp()} />
      </mesh>
    </group>
  );
}

function SkinBits({ skin }: { skin: Skin }) {
  if (skin.kind === "wings") return <Wings tint={skin.tint} />;
  if (skin.kind === "cape") {
    return (
      <mesh position={[0, -0.08, -0.5]} rotation={[0.42, 0, 0]} scale={[1.08, 1.4, 0.18]} castShadow>
        <sphereGeometry args={[0.48, 14, 10]} />
        <meshToonMaterial color={skin.tint} gradientMap={toonRamp()} />
      </mesh>
    );
  }
  if (skin.kind === "ears") {
    return (
      <group>
        <mesh position={[-0.2, 0.72, 0]} rotation={[0, 0, 0.28]} scale={[0.35, 1, 0.28]} castShadow>
          <sphereGeometry args={[0.24, 12, 8]} />
          <meshToonMaterial color={skin.tint} gradientMap={toonRamp()} />
        </mesh>
        <mesh position={[0.2, 0.72, 0]} rotation={[0, 0, -0.28]} scale={[0.35, 1, 0.28]} castShadow>
          <sphereGeometry args={[0.24, 12, 8]} />
          <meshToonMaterial color={skin.tint} gradientMap={toonRamp()} />
        </mesh>
        <mesh position={[-0.2, 0.68, 0.04]} rotation={[0, 0, 0.28]} scale={[0.18, 0.55, 0.12]}>
          <sphereGeometry args={[0.18, 8, 8]} />
          <meshBasicMaterial color="#E08AA4" />
        </mesh>
        <mesh position={[0.2, 0.68, 0.04]} rotation={[0, 0, -0.28]} scale={[0.18, 0.55, 0.12]}>
          <sphereGeometry args={[0.18, 8, 8]} />
          <meshBasicMaterial color="#E08AA4" />
        </mesh>
      </group>
    );
  }
  if (skin.kind === "halo") return <Halo tint={skin.tint} />;
  if (skin.kind === "crown") {
    return (
      <group position={[0, 0.7, 0]}>
        <mesh>
          <cylinderGeometry args={[0.24, 0.28, 0.16, 6]} />
          <meshToonMaterial color={skin.tint} gradientMap={toonRamp()} />
        </mesh>
        <mesh position={[0, 0.16, 0.18]}>
          <coneGeometry args={[0.07, 0.18, 6]} />
          <meshToonMaterial color={skin.tint} gradientMap={toonRamp()} />
        </mesh>
        <mesh position={[0.16, 0.14, -0.08]}>
          <coneGeometry args={[0.06, 0.14, 6]} />
          <meshToonMaterial color={skin.tint} gradientMap={toonRamp()} />
        </mesh>
        <mesh position={[-0.16, 0.14, -0.08]}>
          <coneGeometry args={[0.06, 0.14, 6]} />
          <meshToonMaterial color={skin.tint} gradientMap={toonRamp()} />
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
      <group ref={left} position={[-0.22, 0.1, -0.12]}>
        <mesh position={[-0.4, 0.08, -0.04]} rotation={[0.15, 0.45, 0]} scale={[1, 0.72, 0.16]} castShadow>
          <sphereGeometry args={[0.44, 14, 10]} />
          <meshToonMaterial color={tint} gradientMap={toonRamp()} transparent opacity={0.94} />
        </mesh>
        <mesh position={[-0.6, 0.24, 0]} rotation={[0.05, 0.2, 0]} scale={[0.7, 0.42, 0.12]}>
          <sphereGeometry args={[0.34, 12, 8]} />
          <meshToonMaterial color={tint} gradientMap={toonRamp()} />
        </mesh>
      </group>
      <group ref={right} position={[0.22, 0.1, -0.12]}>
        <mesh position={[0.4, 0.08, -0.04]} rotation={[0.15, -0.45, 0]} scale={[1, 0.72, 0.16]} castShadow>
          <sphereGeometry args={[0.44, 14, 10]} />
          <meshToonMaterial color={tint} gradientMap={toonRamp()} transparent opacity={0.94} />
        </mesh>
        <mesh position={[0.6, 0.24, 0]} rotation={[0.05, -0.2, 0]} scale={[0.7, 0.42, 0.12]}>
          <sphereGeometry args={[0.34, 12, 8]} />
          <meshToonMaterial color={tint} gradientMap={toonRamp()} />
        </mesh>
      </group>
    </group>
  );
}

function Halo({ tint }: { tint: string }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.position.y = 0.88 + Math.sin(clock.elapsedTime * 2.4) * 0.04;
  });
  return (
    <mesh ref={ref} position={[0, 0.88, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[0.32, 0.04, 8, 24]} />
      <meshBasicMaterial color={tint} />
    </mesh>
  );
}
