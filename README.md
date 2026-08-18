# Midtown Rush — Ultimate Apex Edition

A mobile-first, offline-capable 3D arcade city racer in one playable HTML file.

[Open the game](./index.html)

## Play online

The production build deploys to [GitHub Pages](https://ali1nasser.github.io/Midtown-madness-/) after changes reach `main`. Open that address in the phone's normal Chrome or Samsung Internet browser. Do not use `htmlpreview.github.io` or the ChatGPT Cloud Browser for gameplay; those preview environments may not provide a usable WebGL graphics context.

Repository administrators only need to select **Settings → Pages → Source → GitHub Actions** once. After that, every validated push to `main` publishes the self-contained game automatically.

## What is in this build

- One seamless 4.2 km world with 11 connected districts.
- Midtown plus eight imported archive cities, Rally Park, and Apex Autodrome.
- 165 packed 3D models with no runtime CDN, fetch, or companion asset folder.
- Mesh-derived physical collision for imported GLB cities and scenery.
- A rebuilt Great Bridge with the correct orientation, a raised deck, open entrances, ramps, barriers, grade separation, and bridge-height traffic.
- 35 drivable vehicle styles, including the externally sourced Rally Truck and Apex Motorcycle.
- Physical CC0 forest, race-tent, and track-bump scenery.
- A runtime ghost-object audit covering all 62 placed GLB instances.
- Cruise, Blitz, Checkpoint Race, Circuit, and Cop Blitz modes.
- Traffic, police pursuit, damage, detachable parts, nitro, weather, time of day, water, wind, gamepad, keyboard, and touch controls.

## Run it

Open `index.html` directly in a modern browser. The release file is self-contained and does not require a server.

For mobile, copy `index.html` to the phone and open it in Chrome or Samsung Internet. Use the in-game fullscreen button after the first tap.

## Controls

| Action | Desktop | Mobile |
| --- | --- | --- |
| Steer | A/D or Left/Right | Analog control |
| Accelerate | W or Up | GAS |
| Brake/reverse | S or Down | BRAKE |
| Handbrake | Shift/Space | HANDBRAKE |
| Nitro | N | NITRO |
| Camera | C | Camera in the top control rail |
| Look back | B | Look Back in the top control rail |
| Pause | P/Escape | Pause in the top control rail |

## Physical GLB pipeline

The game does not treat imported city scenes as billboard sprites. At boot it:

1. reconstructs each packed GLB as real `THREE.BufferGeometry`;
2. applies the model's actual scale, rotation, and world transform;
3. selects wall-like triangles at vehicle height;
4. rasterizes those triangles into compact physical collision cells;
5. removes only cells that intrude into a shared driving lane; and
6. registers the remaining cells in the same spatial hash used by Midtown.

This keeps roads open while making individual façades, towers, props, bridge rails, tents, and trees solid.

## External source build

The five new GLBs are stored losslessly as Base64 source payloads under `sources/external/`. Rebuild their compact offline pack with:

```bash
node tools/pack-external.mjs
```

Verify that the embedded pack is reproducible without printing the generated payload:

```bash
node tools/pack-external.mjs --check
```

The script uses only Node.js built-ins. Asset sources, immutable upstream blob IDs, and license details are recorded in [docs/THIRD_PARTY_ASSETS.md](docs/THIRD_PARTY_ASSETS.md).

## Validation

```bash
node tools/pack-external.mjs --check
node tools/validate-build.mjs
```

The validator checks JavaScript parsing, DOM IDs and references, packed-model byte ranges and indices, exact external-pack reproduction, all vehicle/world model mappings, district counts, Great Bridge geometry, and the physical collider regression guards. GitHub Actions runs both checks for every pull request and every push to `main`.
