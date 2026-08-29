# Check — Phase 1

- [x] Wardrobe shows Yolk, Knight, Bear
- [x] Locked skins still render in 3D
- [x] Equip disabled when unowned
- [x] Gameplay capsule / jump / pounce / roll / boost unchanged
- [x] No `if (skinId === "bear")` in EggRacer
- [x] typecheck / test:visual / build pass

Source lint is clean except a pre-existing EggRacer `useMemo` warning. Project-wide `npm run lint` also scans untracked iOS `www` bundles and is not a Phase 1 gate.
