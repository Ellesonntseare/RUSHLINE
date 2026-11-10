# Asset credits

## City buildings and sky (active)

“Modular Urban Apartments Facade” by Poly Haven, CC0: https://polyhaven.com/a/modular_urban_apartments_facade . The 1K glTF facade modules are assembled into several complete apartment buildings with varied heights, roof details, side windows and realistic PBR materials.

“Urban Street 01” HDRI by Andreas Mischok / Poly Haven, CC0: https://polyhaven.com/a/urban_street_01 . The earlier 1K photographic backdrop remains archived in the assets folder.

“Kloppenheim 03 (Pure Sky)” by Greg Zaal and Jarod Guest / Poly Haven, CC0: https://polyhaven.com/a/kloppenheim_03_puresky . Its 1K HDRI is the active clear city sky and reflection source. The earlier Urban Street 01 image remains in the assets folder but is not used by the current map.

“Fire Hydrant” by Gonçalo Felício, “Metal Trash Can” by GurJas Studios, and “Modular Street Seating” by Stuart Attenborrow / Poly Haven, CC0: https://polyhaven.com/a/fire_hydrant , https://polyhaven.com/a/metal_trash_can , https://polyhaven.com/a/modular_street_seating . Their 1K glTF models populate the sidewalk outside the running lanes.

“Asphalt 02” and “Concrete Pavement 02” by Poly Haven, CC0: https://polyhaven.com/a/asphalt_02 and https://polyhaven.com/a/concrete_pavement_02 . Their 1K diffuse, normal and roughness textures cover the roadbed, sidewalks and surrounding ground.

## Coin

“Video game Coin” by Elin (ElinHohler).
Source recorded in the supplied GLB: https://sketchfab.com/3d-models/video-game-coin-062e04afa200434cb3ba96b112faf516
Embedded license declaration: CC BY 4.0 — https://creativecommons.org/licenses/by/4.0/
Changes in RUSHLINE: scale, gold material settings, environment reflections, rotation and hovering motion.

## Temporary character and movements

Running.fbx, Jumping Up.fbx and Falling To Roll.fbx were supplied by the user from different download sources. They contain Boy01 geometry and Mixamo-named skeletons. Source attribution and license documentation have not yet been supplied. Used locally for development; public-release provenance remains to be confirmed.

The files are combined on one temporary rig. Run, Jump and Roll are separate actions. Horizontal root translation is removed so gameplay controls travel. Jump root height is held steady to avoid duplicating the gameplay jump height. Falling To Roll is a roll, not an authored sliding animation.

## Finish celebrations and Street Runner

Hip Hop Dancing.fbx, Twist Dance.fbx, Silly Dancing.fbx, Bboy Uprock Start.fbx, Breakdance Freeze Var 2.fbx and Fast Run.fbx were supplied by the user. The animation files share a 53-track Mixamo skeleton. They were converted into compact animation-only JSON clips and assigned automatically to runners at the finish. Fast Run.fbx provides the Street Runner appearance. Breakdance Freeze Var 2.fbx contains the same Ch31 mesh and is used as a celebration, rather than an identical third skin. Source attribution and license documentation for these FBX files have not yet been supplied.

Ch31_nonPBR.fbx was also supplied by the user. Its mesh and skeleton match Fast Run.fbx exactly, so RUSHLINE derives the City Runner colorway from the shared mesh and reuses the compatible running and finish animations. The supplied file is retained under `source-assets/user-skins/` and is excluded from the web download to avoid a duplicate 51 MB asset. City Runner is a distinct appearance rather than a distinct body. Source attribution and license documentation have not yet been supplied.

## Mystery block

“Mystery Block” by Ludus101, supplied by the user. Source and CC BY 4.0 license are embedded in the GLB: https://sketchfab.com/3d-models/mystery-block-bd37c4b152d246f89f91566ef83decd8 . Scaled and animated as a pickup in RUSHLINE.

## Audio

“Gem collect SFX” by Bobjt, CC0: https://opengameart.org/content/gem-collect-sfx . Used as the coin pickup sound with small pitch variations.

“Music Jingles” by Kenney, CC0: https://kenney.nl/assets/music-jingles . The Steel 07 cue loops during the finish dance and stops when the dance ends.

## Magnet pickup

Custom 3D prop built in code with polished metal poles and glow. A CC0 magnet-orb asset was considered but its host was unavailable during development; no third-party magnet model is redistributed.

## Additional power-ups

High Jump boots, Shield crest and Double Coins display were modeled in code for this game. They use the existing credited coin model where shown. No third-party power-up models are redistributed.

## Train (active)

“Bombardier S Train Carriage - London Underground” by timblewee.
Source recorded in the supplied GLB: https://sketchfab.com/3d-models/bombardier-s-train-carriage-london-underground-09c298622ed74c46bd85d6969396943f
Embedded license declaration: CC BY 4.0 — https://creativecommons.org/licenses/by/4.0/
Used as the track obstacle and traversable roof. It is scaled to one lane; its collision span and roof height are matched to the model.

## Roll-under rail gantry

Custom 3D prop built in code for this game, with modeled metal frame, panel, fasteners, warning stripes, and signal lights. No third-party asset is required.

## Route scenery

The station benches, wall sconces, modular industrial pipes and concrete road barriers are Poly Haven CC0 3D scans. The downloaded meshes and textures were compressed into GLB files for the game. Sources: [Painted Wooden Bench](https://polyhaven.com/a/painted_wooden_bench), [Industrial Wall Sconce](https://polyhaven.com/a/industrial_wall_sconce), [Modular Industrial Pipes 01](https://polyhaven.com/a/modular_industrial_pipes_01), and [Concrete Road Barrier 02](https://polyhaven.com/a/concrete_road_barrier_02). Station platforms, tunnel walls, finish arch and podium are game-specific geometry using the credited ground textures.

## Runner shop

“Hoverboard” by N03L, [BlendSwap asset 19870](https://blendswap.com/blend/19870), licensed [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Its original Blender file is retained in `source-assets/shop/`. For RUSHLINE's Pulse Hoverboard, the scene was reduced to the board meshes, recolored with blue and cyan PBR materials, exported to GLB, and meshopt-compressed. The credited author's model is the board equipped during hoverboard pickups. The shop's Hip Hop, Twist, and Silly finish dances use the animation files supplied by the user and credited above; the shop previews and races play those actual clips.
