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
| `models/decoration-forest.glb` | `49ecf70a1a63850d71d18d5414ce2262fd12cd20` | `ext-rally-forest` | Physical forest groups in Rally Park |
| `models/decoration-tents.glb` | `f1592cf96c3d1f2316950bb891cd3c533f57a84d` | `ext-race-tents` | Physical paddock scenery in Apex Autodrome |
| `models/track-bump.glb` | `52490f369200eed4d4238933f26bc31f60feb23a` | `ext-track-bump` | Driveable stunt bumps in Apex Autodrome |

The local `.glb.b64` files decode byte-for-byte to these upstream GLBs. The build tool strips runtime textures, bakes material colours, applies glTF node transforms, quantizes geometry, and embeds the result into `index.html`.
