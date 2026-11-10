# Phase 2 update

For the current playable build and pre-release status, see [RELEASE-CHECKLIST.md](RELEASE-CHECKLIST.md). The notes below document earlier installer and Phase 1 work.

Private 2–4 player sprint rooms are now implemented. See [PHASE-2.md](PHASE-2.md) for current setup, controls, tests and limitations. The historical Phase 1 notes below are retained for asset provenance.

# RUSHLINE — Phase 1: Premium 3D Runner

A serious **local single-player movement prototype** for a planned four-player online endless runner. Three.js handles graphics, but **no visible primitive boxes/capsules are used as placeholder trains, buildings, tracks, obstacles or characters**. Missing assets stop the game at a clear setup screen rather than substituting block art.

> **Status:** Source code and movement unit tests are implemented. The CC0 binary model files are intentionally *not bundled* in this ZIP; the included asset-downloader obtains them from their original providers. The complete 3D runtime has **not been visually tested** in the authoring environment because asset-host downloads and npm registry access were unavailable there. Validate models, clip bindings, texture loading, and presentation on your PC before describing this as production-ready.

## October 2026: Fix for runner download failures (v0.1.2)

If you received **"This operation was aborted"** from both character providers, this installer now first tries **GitHub Contents API** (base64 content), then **jsDelivr CDN**, then **GitHub raw**. On Windows, a failed Node fetch also retries using Windows `curl.exe`. It recovers your existing track, train, barrier and building files.

**Important:** The ZIP does *not* contain the animated character binary; it is downloaded on your PC. External model downloads could not be completed in our project-building environment, so this is not a guarantee that your particular network will allow access.

If all downloads fail, manually get [Quaternius Animated Human GLB](https://github.com/rana-jatin/avatar-stage/blob/main/demo/public/models/demo-avatar.glb). On that GitHub page click **Download raw file** (download icon). Drag the saved `.glb` file onto `IMPORT-RUNNER.bat` inside your RUSHLINE-Phase-1 folder. Then restart `START-RUSHLINE.bat`. Its license [is documented as CC0 by the mirror](https://github.com/rana-jatin/avatar-stage/blob/main/demo/public/models/MODEL_LICENSE.md). This is a **low-poly temporary animation-testing rig**, not our final premium character.

**Installation for existing owners:** Extract the ZIP into the folder that already contains `RUSHLINE-Phase-1` and let Windows overwrite the game source files, **without deleting `public/assets`**. The ZIP deliberately omits `manifest.json` so it does not overwrite your installed asset paths.

## First run (Windows 10/11)

1. Install **Node.js 22 LTS** (or Node.js >=20.19) from https://nodejs.org/.
2. Extract this ZIP to a folder you own.
3. Double-click **`START-RUSHLINE.bat`**. This installs JavaScript dependencies, downloads the free GLB models/textures, and runs the local development server.
4. Visit the displayed URL (normally http://localhost:5173), click **START SOLO RUN**.

The asset installer now attempts to obtain a **small Quaternius CC0 animated humanoid GLB**, plus CC0 metro, tracks, barrier and skyscraper meshes. A higher-detail character is planned for the art pass. The game will not silently swap them for primitive substitutes.

If download fails (for example, due to third-party provider rate-limits), see "Manual asset download" below.

## Manual commands

```powershell
npm install
npm run assets:download
npm run assets:scan
npm test
npm run dev
```

For a production-style static bundle, after downloading assets run:

```powershell
npm run build
npm run preview
```

## Controls

| Action | PC | Phone |
|---|---|---|
| Switch lane | A/D or ←/→ | Swipe left/right |
| Jump | W, Space or ↑ | Swipe up |
| Duck/slide | S or ↓ | Swipe down |
| Pause/resume | Esc | Pause button |

Finish distance: 600 metres. The route moves from a city boulevard through a station and tunnel into downtown, then crosses a finish arch and shows a podium before the results. After colliding with a train or barrier the runner bumps and runs slowly for three seconds. Best distance is saved locally in your browser. Three graphics presets: Auto, High, Performance.

On a phone, swipe left or right to change lanes, up to jump, and down to roll. A jump pressed just before landing is buffered briefly. The hoverboard power-up uses a separate balanced glide pose and raises speed for its duration. The station and tunnel use locally installed, compressed Poly Haven CC0 props; source downloads are kept in `source-assets/route-source/` and are excluded from the shipped build. Run `node scripts/download-route-assets.mjs` to refresh those originals, then regenerate the optimized GLBs if needed.

## Where the actual free 3D models come from

**All five suggested art assets are declared CC0 (public domain) by their publishers.** The downloader uses direct publisher-hosted or Flockbay-hosted asset links and checks GLB / PNG file signatures before marking an asset installed.

| Use | Exact downloadable model | Publisher / license |
|---|---|---|
| Runner with actual skinned run animation | [Run — Jordan 3D Person, Animated](https://www.innerscene.com/tools/library/3d-parts/run-jordan-3d-person-animated-f10ebd7e) | Innerscene / MakeHuman • CC0 |
| Rail segment | [Track Single Detailed](https://flockbay.com/assets/track-single-detailed/) | Kenney Train Kit • CC0 |
| Train | [Train Electric Subway A](https://flockbay.com/assets/train-electric-subway-a/) | Kenney Train Kit • CC0 |
| Barrier | [Construction Barrier](https://flockbay.com/assets/construction-barrier/) | Kenney City Kit Roads • CC0 |
| City buildings | [Building Skyscraper A](https://flockbay.com/assets/building-skyscraper-a/) | Kenney City Kit Commercial • CC0 |

A practical distinction: **the Jordan character has a real skeletal running animation, but its standard download is described as containing only the run loop**. The jump and duck controls function mechanically; while the required additional rig-compatible clips are not installed, jumps move the animated character vertically and ducks compress the model. This is *not yet* the complete premium parkour animation set. Don't present those controls as motion-captured jump/slide animation.

### Upgrade to 120+ authored locomotion and parkour animations

- [Quaternius Universal Base Characters](https://quaternius.itch.io/universal-base-characters) — CC0 rigged characters and hairstyles (commonly distributed as glTF + textures).
- [Quaternius Universal Animation Library](https://quaternius.itch.io/universal-animation-library) — 120+ CC0 clips.
- [Quaternius Universal Animation Library 2](https://quaternius.itch.io/universal-animation-library-2) — additional CC0 moves including parkour.

**To use these together**, export an animation-merged, rig-matched **single `.glb`** from Blender or a compatible GLB animation merger. Loading an animation file with different skeleton track names is not enough. Once the character GLB contains Run, Jump, Slide/Roll, and Hit clips, the prototype's AnimationMixer detects and crossfades them by clip name automatically. You may need to edit `runnerYaw` in `public/assets/manifest.json` to face away from the camera; `0` and `3.14159` are common alternatives.

### Manual asset download if `npm run assets:download` is blocked

Open the publisher links above on your own PC, download each `.glb`, and place it at the paths listed in `scripts/asset-catalog.mjs`. For Kenney-derived GLBs, also download each link's **colormap.png** and place it inside a `Textures` subdirectory adjacent to the `.glb`, like `public/assets/train/Textures/colormap.png`. This is required because their GLBs reference relative textures.

Or to replace models with **self-contained GLB** files you have downloaded, run:

```powershell
npm run assets:import -- --character "C:\Models\my-animated-runner.glb" --track "C:\Models\track.glb" --train "C:\Models\train.glb" --barrier "C:\Models\barrier.glb" --building "C:\Models\building.glb"
```

Run `npm run assets:scan` after importing. Non-embedded texture references can be copied beside each imported model into `public/assets/custom/Textures`, but to avoid name collisions and missing texture dependencies, **self-contained GLBs are recommended**. For reliable playable animation, the character must contain a clip named something including Run, Jog or Sprint.

## Project structure

```text
index.html                    Menus, HUD and modal screens
src/main.js                   Three.js scene, rig playback, input, camera, tile streaming, collisions
src/logic.js                  Seeded obstacles, lane rules and movement physics
src/style.css                 Premium-style UI, responsive layout
public/assets/manifest.json  Explicit local model file paths; never fallback primitives
scripts/asset-catalog.mjs     Verified source links and asset attribution
scripts/download-assets.mjs  Node.js 22 asset installer with file validation
scripts/import-assets.mjs    Bring your own GLB assets
scripts/scan-assets.mjs      Validate GLB headers, mesh and clip counts
tests/logic.test.mjs          Deterministic gameplay tests
START-RUSHLINE.bat            Windows one-click setup
```

## Deliberately not claimed complete

- Multiplayer rooms / online server / player synchronization are Phase 2.
- Sound design, hit animation, parkour blend trees, coins, and effects need another pass.
- The Kenney meshes are genuinely modeled assets, but their original art direction is **low-poly stylized**, not photorealistic. They are a legally clean foundation; a full commercial art pass will require stronger surface detailing, more unique models, a consistent aesthetic and professional character motion. The game should not be promoted as final premium-quality graphics yet.
- Rigged animation retargeting for third-party animation packs has not been automated in this project.
- Remote artist sites can change their download URLs; asset installer reports errors and points to the source if this happens.

## Licensing and redistribution

The five recommended **art assets** are stated CC0 by their respective publishers. Three.js is MIT licensed. Always check license information again for any third-party upgrades, audio files or character skins. The ZIP contains only our game source and third-party asset references, not downloaded binary assets.

## Fix for the Innerscene runner download failure (v0.1.1)

If the log says `RUNNER — Innerscene ... fetch failed`, the updated installer now:

1. **Recovers all already-downloaded train, track, barrier and building models** from disk and writes each success to the manifest.
2. Tries the original high-detail Innerscene CC0 runner (download provider may block scripted downloads).
3. If that fails, automatically tries a **real rigged and animated Quaternius CC0 humanoid** hosted on GitHub, with Run, Jump, Walk, Idle etc. This lower-detail model is only the movement-validation character; it is **not the final premium character design**. [Verified attribution/license](https://github.com/rana-jatin/avatar-stage/blob/main/demo/public/models/MODEL_LICENSE.md).
4. Never creates primitive placeholder models to mask missing downloads.

If *both* runner sites are blocked, open [Innerscene Jordan](https://www.innerscene.com/tools/library/3d-parts/run-jordan-3d-person-animated-f10ebd7e) in your browser, click **Download GLB**, then **drag the downloaded `.glb` onto `IMPORT-RUNNER.bat`**. Run `START-RUSHLINE.bat` again. You do not have to download the train, tracks or buildings again.

If using the full replacement ZIP with your existing install, **extract it into the parent folder that already contains `RUSHLINE-Phase-1` and overwrite the source files**. Do not delete or overwrite your existing downloaded files inside `RUSHLINE-Phase-1/public/assets/`. The updated installer will rediscover valid previously downloaded GLBs even if the old manifest is blank. The smaller hotfix ZIP is simpler: extract its contents directly into the existing `RUSHLINE-Phase-1` folder (where `package.json` is), overwriting the scripts and launcher.
