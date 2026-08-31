# PRD — Phase 4 Character Content (Slice 1)

## Problem

The Skin engine can swap meshes. The player still shops in a racetrack screenshot and opens gacha as CSS circles. That is a tech demo, not a character collection.

## Goal

One presentation system. First slice: **Wardrobe is a 3D character viewer.**

Default Yolk + Knight + Bear (Rabbit / Robot already in catalog) must:

- Preview unowned in 3D
- Orbit 360°, pinch-zoom, default front face
- Equip owned → same visual on the title racer (gameplay already uses `CharacterVisual`)

## Out of scope (this slice)

Gacha 3D reveal, Home platform, Victory hero, Meshy/Rodin HTTP, new skins, gacha weights, collabs, animation clip mixer.

## Non-goals

Do not rebuild Provider / Loader / Quality Gate.  
Do not fake AI GLBs. Procedural Knight/Bear = prototype assets.  
Do not branch `EggRacer` on skin id.
