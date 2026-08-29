# Design — Skin System 2.0

```
SkinDefinition (catalog)
        │
        ├── visualId  →  SKIN_VISUALS registry
        ├── animationProfile → getCharacterPose
        └── gameplay: none (capsule unchanged)
```

Presentation modes share the live GameCanvas player mesh:

- home: equipped skin
- character/wardrobe: `previewSkinId ?? equipped`
- gameplay: equipped
- gacha reveal: sets preview then equips if new

Wardrobe orbit writes `sim.showcaseYaw`. CameraRig uses it only on the title + character hub.
