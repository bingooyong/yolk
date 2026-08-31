import { useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Accessory } from "./config";
import {
  EGG_VISUAL_GROUND_OFFSET,
  getCharacterPose,
  type CharacterPresentation,
} from "./character-presentation";
import { glowTex } from "./look";
import { getSkin, type Skin } from "./skins";

type Props = {
  color: string;
  accessory?: Accessory;
  skinId?: string;
  isPlayer?: boolean;
  presentation: RefObject<CharacterPresentation>;
};

// Shared low-poly primitives keep all racer variants inexpensive while the
// nested scales give each part a distinct silhouette and material response.
const eggGeo = new THREE.SphereGeometry(0.52, 36, 28);
eggGeo.scale(1.02, 1.26, 0.96);
const unitSphereGeo = new THREE.SphereGeometry(1, 16, 12);
const unitCylinderGeo = new THREE.CylinderGeometry(1, 1, 1, 8, 1);
const unitConeGeo = new THREE.ConeGeometry(1, 1, 6);
const mouthGeo = new THREE.TorusGeometry(0.11, 0.028, 8, 16, Math.PI);

export function EggMesh({
  color,
  accessory = "sprout",
  skinId,
  isPlayer = false,
  presentation,
}: Props) {
  const skin = skinId ? getSkin(skinId) : null;
  const hat = (skin?.hat ?? (skin?.kind === "none" ? undefined : accessory)) as
    Accessory | undefined;
  const glow = useMemo(() => glowTex(), []);
  const dark = useMemo(() => new THREE.Color(color).multiplyScalar(0.66).getStyle(), [color]);
  const shellEdge = useMemo(() => new THREE.Color(color).multiplyScalar(0.5).getStyle(), [color]);
  const group = useRef<THREE.Group>(null);
  const arms = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const pose = getCharacterPose(presentation.current, clock.elapsedTime, skin?.proceduralAnimation ?? "default");
    if (group.current) {
      group.current.position.y = EGG_VISUAL_GROUND_OFFSET + pose.lift;
      group.current.scale.set(pose.scaleX, pose.scaleY, pose.scaleZ);
    }
    if (arms.current) {
      arms.current.rotation.z = pose.armSway;
    }
  });

  return (
    <group ref={group} position={[0, EGG_VISUAL_GROUND_OFFSET, 0]}>
      {isPlayer && (
        <sprite position={[0, 0.05, 0]} scale={[2.25, 2.25, 1]}>
          <spriteMaterial
            map={glow}
            color={color}
            transparent
            opacity={0.42}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </sprite>
      )}

      <group>
        <mesh geometry={eggGeo} castShadow>
          <meshStandardMaterial color={color} roughness={0.34} metalness={0.04} />
        </mesh>

        {/* Lower band reads as a soft clothing-like yolk cup. */}
        <mesh
          geometry={unitSphereGeo}
          position={[0, -0.22, 0.04]}
          scale={[0.51, 0.31, 0.51]}
          castShadow
        >
          <meshStandardMaterial color={dark} roughness={0.52} metalness={0.08} />
        </mesh>
        <mesh geometry={unitSphereGeo} position={[0, -0.23, 0.03]} scale={[0.525, 0.245, 0.525]}>
          <meshStandardMaterial color={shellEdge} roughness={0.68} metalness={0.03} />
        </mesh>
        <mesh geometry={unitSphereGeo} position={[0, 0.08, 0.16]} scale={[0.302, 0.231, 0.168]}>
          <meshPhysicalMaterial
            color="#FFF3EA"
            roughness={0.24}
            metalness={0}
            clearcoat={0.32}
            clearcoatRoughness={0.4}
          />
        </mesh>

        <mesh
          geometry={unitSphereGeo}
          position={[-0.2, -0.52, 0.1]}
          scale={[0.16, 0.08, 0.184]}
          castShadow
        >
          <meshStandardMaterial color={color} roughness={0.4} metalness={0.06} />
        </mesh>
        <mesh
          geometry={unitSphereGeo}
          position={[0.2, -0.52, 0.1]}
          scale={[0.16, 0.08, 0.184]}
          castShadow
        >
          <meshStandardMaterial color={color} roughness={0.4} metalness={0.06} />
        </mesh>

        <group ref={arms}>
          <mesh
            geometry={unitSphereGeo}
            position={[-0.46, -0.08, 0.06]}
            rotation={[0, 0, 0.4]}
            scale={[0.088, 0.16, 0.112]}
          >
            <meshStandardMaterial color={color} roughness={0.37} metalness={0.03} />
          </mesh>
          <mesh
            geometry={unitSphereGeo}
            position={[0.46, -0.08, 0.06]}
            rotation={[0, 0, -0.4]}
            scale={[0.088, 0.16, 0.112]}
          >
            <meshStandardMaterial color={color} roughness={0.37} metalness={0.03} />
          </mesh>
        </group>

        <Face shellColor={color} />

        {hat === "sprout" && skin?.kind !== "crown" && skin?.kind !== "halo" && <Sprout />}
        {hat === "bow" && skin?.kind !== "wings" && <Bow />}
        {hat === "star" && <StarHat />}
        {hat === "leaf" && <Leaf />}
        {hat === "antenna" && <Antenna />}
        {hat === "tuft" && (
          <mesh geometry={unitSphereGeo} position={[0, 0.66, 0]} scale={[0.091, 0.15, 0.091]}>
            <meshStandardMaterial color={color} roughness={0.46} metalness={0.02} />
          </mesh>
        )}

        {skin && <SkinBits skin={skin} presentation={presentation} />}
      </group>
    </group>
  );
}

function Face({ shellColor }: { shellColor: string }) {
  return (
    <group position={[0, 0.08, 0.42]}>
      {/* Dark sockets separate the eyes from the shell before specular reads. */}
      <mesh geometry={unitSphereGeo} position={[-0.15, 0.06, 0.065]} scale={[0.108, 0.122, 0.055]}>
        <meshStandardMaterial color="#241C2C" roughness={0.44} metalness={0.04} />
      </mesh>
      <mesh geometry={unitSphereGeo} position={[0.15, 0.06, 0.065]} scale={[0.108, 0.122, 0.055]}>
        <meshStandardMaterial color="#241C2C" roughness={0.44} metalness={0.04} />
      </mesh>
      <mesh geometry={unitSphereGeo} position={[-0.15, 0.06, 0.08]} scale={[0.085, 0.095, 0.07]}>
        <meshPhysicalMaterial
          color="#FFFDF8"
          roughness={0.16}
          metalness={0}
          clearcoat={0.8}
          clearcoatRoughness={0.12}
        />
      </mesh>
      <mesh geometry={unitSphereGeo} position={[0.15, 0.06, 0.08]} scale={[0.085, 0.095, 0.07]}>
        <meshPhysicalMaterial
          color="#FFFDF8"
          roughness={0.16}
          metalness={0}
          clearcoat={0.8}
          clearcoatRoughness={0.12}
        />
      </mesh>
      <mesh geometry={unitSphereGeo} position={[-0.15, 0.05, 0.125]} scale={[0.055, 0.062, 0.05]}>
        <meshPhysicalMaterial
          color="#17141C"
          roughness={0.1}
          metalness={0.12}
          clearcoat={1}
          clearcoatRoughness={0.08}
        />
      </mesh>
      <mesh geometry={unitSphereGeo} position={[0.15, 0.05, 0.125]} scale={[0.055, 0.062, 0.05]}>
        <meshPhysicalMaterial
          color="#17141C"
          roughness={0.1}
          metalness={0.12}
          clearcoat={1}
          clearcoatRoughness={0.08}
        />
      </mesh>
      {/* Two catches are geometry, not a texture or external asset. */}
      <mesh
        geometry={unitSphereGeo}
        position={[-0.125, 0.083, 0.166]}
        scale={[0.021, 0.024, 0.016]}
      >
        <meshStandardMaterial
          color="#FFFFFF"
          emissive="#FFF8E8"
          emissiveIntensity={0.38}
          roughness={0.08}
          metalness={0}
        />
      </mesh>
      <mesh geometry={unitSphereGeo} position={[0.175, 0.083, 0.166]} scale={[0.021, 0.024, 0.016]}>
        <meshStandardMaterial
          color="#FFFFFF"
          emissive="#FFF8E8"
          emissiveIntensity={0.38}
          roughness={0.08}
          metalness={0}
        />
      </mesh>
      <mesh
        geometry={unitSphereGeo}
        position={[-0.155, 0.165, 0.082]}
        rotation={[0, 0, 0.22]}
        scale={[0.072, 0.022, 0.028]}
      >
        <meshStandardMaterial color={shellColor} roughness={0.42} metalness={0.02} />
      </mesh>
      <mesh
        geometry={unitSphereGeo}
        position={[0.155, 0.165, 0.082]}
        rotation={[0, 0, -0.22]}
        scale={[0.072, 0.022, 0.028]}
      >
        <meshStandardMaterial color={shellColor} roughness={0.42} metalness={0.02} />
      </mesh>
      <mesh geometry={unitSphereGeo} position={[-0.24, -0.06, 0.1]} scale={[0.08, 0.052, 0.036]}>
        <meshStandardMaterial
          color="#FF8A9A"
          roughness={0.85}
          metalness={0}
          transparent
          opacity={0.86}
        />
      </mesh>
      <mesh geometry={unitSphereGeo} position={[0.24, -0.06, 0.1]} scale={[0.08, 0.052, 0.036]}>
        <meshStandardMaterial
          color="#FF8A9A"
          roughness={0.85}
          metalness={0}
          transparent
          opacity={0.86}
        />
      </mesh>
      <mesh geometry={mouthGeo} position={[0, -0.12, 0.14]} rotation={[Math.PI / 2.2, 0, 0]}>
        <meshStandardMaterial color="#17141C" roughness={0.28} metalness={0.05} />
      </mesh>
    </group>
  );
}

function Sprout() {
  return (
    <group position={[0.04, 0.64, 0]}>
      <mesh geometry={unitCylinderGeo} scale={[0.034, 0.2, 0.042]}>
        <meshStandardMaterial color="#2DB8A1" roughness={0.5} metalness={0.02} />
      </mesh>
      <mesh
        geometry={unitSphereGeo}
        position={[0.1, 0.14, 0]}
        rotation={[0, 0, -0.55]}
        scale={[0.12, 0.066, 0.034]}
      >
        <meshStandardMaterial color="#3DCFB0" roughness={0.42} metalness={0.02} />
      </mesh>
    </group>
  );
}

function Bow() {
  return (
    <group position={[0, 0.62, 0.06]}>
      <mesh geometry={unitSphereGeo} rotation={[0, 0, 0.5]} scale={[0.162, 0.072, 0.049]}>
        <meshPhysicalMaterial
          color="#E08AA4"
          roughness={0.24}
          metalness={0.06}
          sheen={0.55}
          sheenRoughness={0.35}
          sheenColor="#FFD6E4"
        />
      </mesh>
      <mesh
        geometry={unitSphereGeo}
        rotation={[0, 0, -0.5]}
        position={[0.13, 0, 0]}
        scale={[0.162, 0.072, 0.049]}
      >
        <meshPhysicalMaterial
          color="#E08AA4"
          roughness={0.24}
          metalness={0.06}
          sheen={0.55}
          sheenRoughness={0.35}
          sheenColor="#FFD6E4"
        />
      </mesh>
    </group>
  );
}

function StarHat() {
  return (
    <mesh geometry={unitConeGeo} position={[0, 0.72, 0]} scale={[0.18, 0.28, 0.18]}>
      <meshPhysicalMaterial
        color="#E8C85A"
        roughness={0.28}
        metalness={0.62}
        clearcoat={0.45}
        emissive="#8A6B15"
        emissiveIntensity={0.12}
      />
    </mesh>
  );
}

function Leaf() {
  return (
    <mesh
      geometry={unitSphereGeo}
      position={[0.12, 0.66, 0]}
      rotation={[0, 0, -0.5]}
      scale={[0.105, 0.188, 0.033]}
    >
      <meshStandardMaterial color="#2DB8A1" roughness={0.44} metalness={0.02} />
    </mesh>
  );
}

function Antenna() {
  return (
    <group position={[0, 0.62, 0]}>
      <mesh geometry={unitCylinderGeo} position={[-0.11, 0.14, 0]} scale={[0.02, 0.3, 0.026]}>
        <meshStandardMaterial color="#17141C" roughness={0.36} metalness={0.35} />
      </mesh>
      <mesh geometry={unitCylinderGeo} position={[0.11, 0.14, 0]} scale={[0.02, 0.3, 0.026]}>
        <meshStandardMaterial color="#17141C" roughness={0.36} metalness={0.35} />
      </mesh>
      <mesh geometry={unitSphereGeo} position={[-0.11, 0.3, 0]} scale={0.065}>
        <meshPhysicalMaterial
          color="#E8614A"
          roughness={0.2}
          metalness={0.02}
          clearcoat={0.8}
          emissive="#FF7355"
          emissiveIntensity={0.18}
        />
      </mesh>
      <mesh geometry={unitSphereGeo} position={[0.11, 0.3, 0]} scale={0.065}>
        <meshPhysicalMaterial
          color="#E8614A"
          roughness={0.2}
          metalness={0.02}
          clearcoat={0.8}
          emissive="#FF7355"
          emissiveIntensity={0.18}
        />
      </mesh>
    </group>
  );
}

function SkinBits({
  skin,
  presentation,
}: {
  skin: Skin;
  presentation: RefObject<CharacterPresentation>;
}) {
  if (skin.kind === "wings") return <Wings tint={skin.tint} presentation={presentation} />;
  if (skin.kind === "cape") return <Cape tint={skin.tint} presentation={presentation} />;
  if (skin.kind === "ears") {
    return (
      <group>
        <mesh
          geometry={unitSphereGeo}
          position={[-0.2, 0.72, 0]}
          rotation={[0, 0, 0.28]}
          scale={[0.084, 0.24, 0.067]}
          castShadow
        >
          <meshStandardMaterial color={skin.tint} roughness={0.46} metalness={0.02} />
        </mesh>
        <mesh
          geometry={unitSphereGeo}
          position={[0.2, 0.72, 0]}
          rotation={[0, 0, -0.28]}
          scale={[0.084, 0.24, 0.067]}
          castShadow
        >
          <meshStandardMaterial color={skin.tint} roughness={0.46} metalness={0.02} />
        </mesh>
        <mesh
          geometry={unitSphereGeo}
          position={[-0.2, 0.68, 0.04]}
          rotation={[0, 0, 0.28]}
          scale={[0.032, 0.099, 0.022]}
        >
          <meshStandardMaterial color="#E08AA4" roughness={0.72} metalness={0} />
        </mesh>
        <mesh
          geometry={unitSphereGeo}
          position={[0.2, 0.68, 0.04]}
          rotation={[0, 0, -0.28]}
          scale={[0.032, 0.099, 0.022]}
        >
          <meshStandardMaterial color="#E08AA4" roughness={0.72} metalness={0} />
        </mesh>
      </group>
    );
  }
  if (skin.kind === "halo") return <Halo tint={skin.tint} presentation={presentation} />;
  if (skin.kind === "crown") {
    return (
      <group position={[0, 0.7, 0]}>
        <mesh geometry={unitCylinderGeo} scale={[0.24, 0.16, 0.28]}>
          <meshPhysicalMaterial
            color={skin.tint}
            roughness={0.18}
            metalness={0.96}
            clearcoat={0.35}
          />
        </mesh>
        <mesh geometry={unitConeGeo} position={[0, 0.16, 0.18]} scale={[0.07, 0.18, 0.07]}>
          <meshPhysicalMaterial color={skin.tint} roughness={0.2} metalness={0.94} />
        </mesh>
        <mesh geometry={unitConeGeo} position={[0.16, 0.14, -0.08]} scale={[0.06, 0.14, 0.06]}>
          <meshPhysicalMaterial color={skin.tint} roughness={0.2} metalness={0.94} />
        </mesh>
        <mesh geometry={unitConeGeo} position={[-0.16, 0.14, -0.08]} scale={[0.06, 0.14, 0.06]}>
          <meshPhysicalMaterial color={skin.tint} roughness={0.2} metalness={0.94} />
        </mesh>
      </group>
    );
  }
  return null;
}

function Wings({
  tint,
  presentation,
}: {
  tint: string;
  presentation: RefObject<CharacterPresentation>;
}) {
  const left = useRef<THREE.Group>(null);
  const right = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const { wingEnergy } = getCharacterPose(presentation.current, clock.elapsedTime);
    // Idle is a slow breath, not a hover-flap. Extra energy (run / air / boost)
    // adds a bit of beat without shaking the silhouette on the title screen.
    const extra = Math.max(0, wingEnergy - 0.32);
    const f = Math.sin(clock.elapsedTime * (2.1 + extra * 2.8)) * (0.04 + extra * 0.14);
    if (left.current) left.current.rotation.z = -0.34 + f;
    if (right.current) right.current.rotation.z = 0.34 - f;
  });
  return (
    <group>
      <group ref={left} position={[-0.22, 0.1, -0.12]}>
        <mesh
          geometry={unitSphereGeo}
          position={[-0.4, 0.08, -0.04]}
          rotation={[0.15, 0.45, 0]}
          scale={[0.44, 0.317, 0.07]}
          castShadow
        >
          <meshPhysicalMaterial
            color={tint}
            roughness={0.22}
            metalness={0.04}
            transparent
            opacity={0.94}
            sheen={0.7}
            sheenColor="#FFFFFF"
          />
        </mesh>
        <mesh
          geometry={unitSphereGeo}
          position={[-0.6, 0.24, 0]}
          rotation={[0.05, 0.2, 0]}
          scale={[0.238, 0.143, 0.041]}
        >
          <meshPhysicalMaterial
            color={tint}
            roughness={0.26}
            metalness={0.03}
            transparent
            opacity={0.9}
          />
        </mesh>
      </group>
      <group ref={right} position={[0.22, 0.1, -0.12]}>
        <mesh
          geometry={unitSphereGeo}
          position={[0.4, 0.08, -0.04]}
          rotation={[0.15, -0.45, 0]}
          scale={[0.44, 0.317, 0.07]}
          castShadow
        >
          <meshPhysicalMaterial
            color={tint}
            roughness={0.22}
            metalness={0.04}
            transparent
            opacity={0.94}
            sheen={0.7}
            sheenColor="#FFFFFF"
          />
        </mesh>
        <mesh
          geometry={unitSphereGeo}
          position={[0.6, 0.24, 0]}
          rotation={[0.05, -0.2, 0]}
          scale={[0.238, 0.143, 0.041]}
        >
          <meshPhysicalMaterial
            color={tint}
            roughness={0.26}
            metalness={0.03}
            transparent
            opacity={0.9}
          />
        </mesh>
      </group>
    </group>
  );
}

function Cape({
  tint,
  presentation,
}: {
  tint: string;
  presentation: RefObject<CharacterPresentation>;
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const p = presentation.current;
    const active = p.moveState === "boost" || p.moveState === "pounce" || !p.grounded;
    const target = active ? 0.78 : 0.44;
    ref.current.rotation.x += (target - ref.current.rotation.x) * 0.18;
    ref.current.rotation.z = Math.sin(clock.elapsedTime * 7.5) * (active ? 0.075 : 0.025);
  });
  return (
    <group ref={ref} position={[0, -0.08, -0.5]} rotation={[0.44, 0, 0]}>
      <mesh geometry={unitSphereGeo} scale={[0.518, 0.672, 0.086]} castShadow>
        <meshPhysicalMaterial
          color={tint}
          roughness={0.31}
          metalness={0.04}
          sheen={0.65}
          sheenColor="#FFF4D8"
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

function Halo({
  tint,
  presentation,
}: {
  tint: string;
  presentation: RefObject<CharacterPresentation>;
}) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const p = presentation.current;
    const lift = p.grounded ? 0 : 0.045;
    ref.current.position.y = 0.88 + lift + Math.sin(clock.elapsedTime * 2.4) * 0.025;
  });
  return (
    <mesh ref={ref} position={[0, 0.88, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[0.32, 0.04, 8, 24]} />
      <meshPhysicalMaterial
        color={tint}
        roughness={0.16}
        metalness={0.92}
        clearcoat={0.7}
        emissive={tint}
        emissiveIntensity={0.16}
      />
    </mesh>
  );
}
