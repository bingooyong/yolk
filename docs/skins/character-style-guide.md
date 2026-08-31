# Character style

Round, readable silhouettes. PBR materials. One face. One or two secondary forms (ears, armor, cape). No bloom hiding low mesh detail.

## Prototype vs production

| Class | Today | Animation |
|---|---|---|
| Default yolk + 12 accessories | Production procedural | Transform pose (`getCharacterPose`) |
| Knight / Bear / Rabbit / Robot | **Prototype** procedural full characters | Transform pose (`hero` / `bouncy`) |
| Test GLBs | Lab only | None (transform fallback) |
| Future Meshy/Rodin GLB | Production model | Embedded clips when present; otherwise transform fallback |

Do not ship a primitive mesh as if it were an AI GLB.

## Presentation

- Forward = −Z (same as racers).
- Height matches the yolk capsule; never retune physics to a mesh.
- Wardrobe opens on the **face**.
- Eyes need a highlight if a face exists.
- Contact shadow stays; no black BackSide outline shells.
