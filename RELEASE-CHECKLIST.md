# RUSHLINE release checklist — 18 October 2026

## Implemented and checked

- [x] Three selectable appearances: Classic, Street and City Runner. City Runner is a recolored variant of the matching Ch31 mesh supplied in `Ch31_nonPBR.fbx`.
- [x] Front-facing 3D character selector with arrows, Left/Right keys and drag rotation. No separate dropdown or overlapping decorative text.
- [x] All three characters normalize to the same gameplay height and fit desktop and portrait camera framing in automated geometry checks.
- [x] Modern city scene with Poly Haven facade modules, pure sky HDRI, asphalt and pavement textures, hydrants, bins and seating.
- [x] Solo and 2–4 player race rules, train roof, jump, roll, coins, magnet, high jump, double coins, shield and mystery box.
- [x] Finish dances and local sound effects.
- [x] `npm test` passes 41 tests; `npm run build` succeeds. Asset reference tests cover the sky, building kit, ground maps and street prop dependencies.
- [x] Local Vite server restarted and serving on `http://localhost:5173/` after the Windows FBX file lock interruption.

## Verify before publishing

- [ ] Play through a full run with each character on a desktop and a phone. Inspect the menu, power-ups, collisions, finish dance, and map from the actual browser.
- [ ] Test a multiplayer match across two real devices on the intended host. The current Vite server supports local development and network testing; a public deployment target has not been configured.
- [ ] Confirm the license and redistribution rights for the user-supplied FBX characters and animations. Poly Haven scenery is CC0; individual user-supplied models and sounds are listed in `ASSET-CREDITS.md`.
- [ ] Measure load time and frame rate on the intended target devices. The Street Runner FBX is about 51 MB and the train about 16 MB; the City Runner shares Street Runner's runtime mesh to avoid another 51 MB download.
- [ ] Choose a public host and HTTPS/WebSocket setup if the game should be playable by people outside the local network.

## Commands

```powershell
npm test
npm run build
npm run dev
```

## Loading and character fixes

- [x] Train uses Meshopt compression: 16.76 MB to 2.26 MB; scene triangle count and bounds verified.
- [x] Street/City character embedded textures capped at 1024px: 53.95 MB to 8.59 MB. Original files retained. Geometry, bones and animation tracks unchanged.
- [x] Jump and roll load animation-only JSON (116 KB and 237 KB).
- [x] City model requests run concurrently; solo loads extra characters only when selected.
- [x] Skin normalization measures in model space, independent of a reused visual group's scale or world height. Repeated switching tested.
- [x] Serame head reduced to match body width; neck base overlaps collar and exposed neck color blends into the head.
- [ ] Visual confirmation on the target phone; first-load timing depends on connection speed.

## Readability and neck attachment

- [x] Orange upward jump markers and blue downward clearance markers distinguish hazards by shape and color.
- [x] Teal train approach ramps and roof edges match the shared ramp/roof collision dimensions.
- [x] Coins and power-ups leave a clear band around hazards; coin glints and pickup motion are quieter.
- [x] Serame neck is skinned to chest, neck and head joints. The donor's uneven lower neck edge is shaped into a collar ring, without changing head scale.
- [x] Front/side posed geometry renders checked locally; torso anchoring, character switching, ramp movement and shared race rules tested.
- [ ] Confirm final appearance and playability on a phone in the actual game renderer.
