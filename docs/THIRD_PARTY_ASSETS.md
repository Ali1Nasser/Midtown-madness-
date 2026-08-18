# Third-party asset record

This record covers assets newly imported for the physical-world overhaul. The attached source build already contained its own packed model library; those pre-existing 160 entries were preserved without changing their provenance.

## Kenney Starter Kit Racing

- Upstream repository: [KenneyNL/Starter-Kit-Racing](https://github.com/KenneyNL/Starter-Kit-Racing)
- Pinned commit: [f5241ebdf00c25bc951bf4fdb7950bb1b78b4bcc](https://github.com/KenneyNL/Starter-Kit-Racing/tree/f5241ebdf00c25bc951bf4fdb7950bb1b78b4bcc)
- Upstream README: [3D models and sounds are CC0 licensed](https://github.com/KenneyNL/Starter-Kit-Racing/blob/f5241ebdf00c25bc951bf4fdb7950bb1b78b4bcc/README.md)
- Asset license: [Creative Commons CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/)
- Repository code license: MIT; the imported files below are model assets covered by the repository's explicit CC0 asset statement.

| Upstream GLB | Upstream blob SHA | Packed key | Use in this game |
| --- | --- | --- | --- |
| `models/vehicle-motorcycle.glb` | `f0d7dc0bc81b885393bd1350eaf95b2b304e1766` | `ext-motorcycle` | Selectable two-wheel player/traffic vehicle |
| `models/vehicle-truck-green.glb` | `a3ade83b5bfdb528135d6b2338e4b47e31f6efcd` | `ext-rally-truck` | Selectable rally truck and traffic vehicle |
| `models/vehicle-truck-purple.glb` | `77f26e901928d2475e34a46b8e88d777e51e11a2` | `ext-rally-purple` | Selectable Violet Rally player/traffic vehicle |
| `models/vehicle-truck-red.glb` | `fcd901f5d43e0984b52fe947d31d9a121463127a` | `ext-rally-red` | Selectable Redline Rally player/traffic vehicle |
| `models/vehicle-truck-yellow.glb` | `075069215e068ee6a2b45a6698f9905f998e8412` | `ext-rally-yellow` | Selectable Dune Rally player/traffic vehicle |
| `models/decoration-forest.glb` | `49ecf70a1a63850d71d18d5414ce2262fd12cd20` | `ext-rally-forest` | Physical forest groups in Rally Park |
| `models/decoration-tents.glb` | `f1592cf96c3d1f2316950bb891cd3c533f57a84d` | `ext-race-tents` | Physical paddock scenery in Apex Autodrome |
| `models/track-bump.glb` | `52490f369200eed4d4238933f26bc31f60feb23a` | `ext-track-bump` | Driveable stunt bumps in Apex Autodrome |
| `models/track-straight.glb` | `9c24a6cbe81b41fb2f3f68fcbbc250730e689f0f` | `ext-track-straight` | Physical main straight in Mountain Pass |
| `models/track-corner.glb` | `6dd2420005b5a82b718d9accedda35136f250bac` | `ext-track-corner` | Physical corner exhibits in Mountain Pass |
| `models/track-finish.glb` | `f00e455f3e812fe6410c560972b56655eb9d9a93` | `ext-track-finish` | Physical finish gantry in Mountain Pass |

The local `.glb.b64` files decode byte-for-byte to these upstream GLBs. The build tool strips runtime textures, bakes material colours, applies glTF node transforms, quantizes geometry, and embeds the result into `index.html`.

## ModKit modular building and prop pack

- Upstream repository: [JaronKBragg7337/asset-pack-ue-threejs-blender-unity](https://github.com/JaronKBragg7337/asset-pack-ue-threejs-blender-unity)
- Pinned commit: [f5a53eaadbb46fac8e29faabb6c0ac1b6c6d2311](https://github.com/JaronKBragg7337/asset-pack-ue-threejs-blender-unity/tree/f5a53eaadbb46fac8e29faabb6c0ac1b6c6d2311)
- Upstream license: [Creative Commons CC0 1.0 Universal](https://github.com/JaronKBragg7337/asset-pack-ue-threejs-blender-unity/blob/f5a53eaadbb46fac8e29faabb6c0ac1b6c6d2311/LICENSE)
- The repository README states that the full generated asset pack is CC0 and that the GLB exports are intended for three.js.

| Upstream GLB | Upstream blob SHA | Packed key | Use in this game |
| --- | --- | --- | --- |
| `exports/GLTF/SM_Crate_Stack.glb` | `c58675ddebf7b39ccdc4fb6ea7474f4b34e67134` | `ext-modkit-crates` | Eight physical cargo stacks in Freight Harbor |
| `exports/GLTF/SM_Barrel.glb` | `6d467fd830eb264c6ff1dcb7f9d910553ecd58a5` | `ext-modkit-barrel` | Eight physical industrial barrels in Freight Harbor |
| `exports/GLTF/SM_Pallet.glb` | `c4957400baffd90532755a8741c58e36b163ce28` | `ext-modkit-pallet` | Eight physical pallet stacks in Freight Harbor |

These three local `.glb.b64` files also decode byte-for-byte to the pinned upstream Git blobs. No texture, script, or network dependency from the source repository is required at runtime.
