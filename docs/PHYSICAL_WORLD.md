# Physical world architecture

## Collision model

Static collisions use a spatial hash of axis-aligned cells. Procedural Midtown buildings register their known footprints directly. Imported GLB scenes use geometry-derived proxies:

- each packed mesh is transformed into world coordinates;
- horizontal road, floor, and roof faces are rejected by their world normal;
- only triangles intersecting a vehicle-height band are retained;
- triangle edges are sampled into overlapping 2D cells;
- cells intersecting a shared metro lane are clipped individually;
- each remaining cell stores a vertical range, allowing a high bridge and a road below it to coexist.

This is deliberately more precise than one bounding box per city and much lighter than running triangle collision every frame.

The two extremely dense single-building archives use source-derived footprint solids instead of reprocessing millions of repeated triangles at startup. They remain physical, while the lighter city, bridge, forest, and tent scenes use the mesh-cell path above. Stunt bumps use their authored GLB dimensions with an analytical curved driving surface.

## Runtime ghost-object audit

Every world-placement path reports its physical implementation after construction. The runtime expects 11 physical GLB roots containing 62 placed instances, covering archive cities, the Great Bridge, expansion scenery, stunt bumps, and Motor Mile vehicles. If a future asset fails to register any collision—or a placement path is accidentally removed—the main menu displays a warning instead of silently presenting a drive-through object.

## Sci-Fi Center repair

The model contains geometry below the authored city base. Grounding it at the absolute lowest vertex lifted the usable walls above the player's collision band. The district now uses its actual structural base (`-11.14` model units), after which the mesh proxy generator produces thousands of façade cells while preserving the arterial lanes.

## Great Bridge repair

The source bridge is Z-up with its length on Y. It is now rotated `-90°` around X, centered along the district, and grounded by its source Z minimum. Its principal deck is approximately 9.93 metres above the water district.

The old build also created a solid box across both bridge mouths. Those blockers were removed. New approach geometry supplies:

- a continuous raised driving surface;
- eased ramps at both ends;
- side barriers with level-aware collision;
- a low east-west causeway below the raised bridge;
- a traffic graph that treats the crossing as grade-separated; and
- separate low and deck-height collision bands.

## Expansion districts

Rally Park at `(0, -1700)` and Apex Autodrome at `(0, 1700)` extend the connected world to 4.2 km. Both receive the same roads, blocks, AI graph, minimap, navigation, race-course, culling, and collision systems as the archive districts.
