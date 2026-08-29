# Visual Style Guide

Yolk Rush is an original toy-like egg party race: warm light, saturated but controlled color, compact readable silhouettes, and cheerful course landmarks. It must not copy reference characters, UI, models, textures, logos, fonts, or layout.

## Shape

- Rounded, chunky primary forms; small secondary forms only where they clarify state.
- Character readability survives a 390 px viewport before texture detail does.
- Ground contact, squash/stretch, and anchored shadows agree on one foot position.
- Course props simplify toward readable icons at distance.

## Color

- Theme color stays identifiable in sky, route material, midground props, and accents.
- Warm cream/light values keep characters separate from saturated courses.
- Teal/green belongs to boost/route, red/warm yellow to hazard/energy, cool blue/white to ice.
- Emissive is a semantic cue, not permanent decoration.
- Avoid equal-saturation fields, muddy shadow floors, and pure-black blobs.

## UI and motion

- Chinese-first gameplay copy with stable English product/aria terms.
- HUD states remain compact and safe-area aware at 390×844 and in landscape.
- Motion communicates grounded, airborne, boost, pounce, roll, landing, and finish.
- Damping is frame-rate independent; camera shake is short and subtle.
- Respect reduced-motion paths already present in ceremony/result UI.

## Review questions

1. Can the player, route direction, next hazard, and finish be identified in one frame?
2. Is the character visibly grounded during idle, air, and landing?
3. Does low quality preserve the same composition and information?
4. Was any new asset source or reference material copied?
5. Did the focused visual tests and deterministic title/race smoke pass?
