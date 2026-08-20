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

Every world-placement path first declares its expected key and instance count, then reports its actual physical implementation after construction. The audit derives its totals from that plan instead of fragile global constants. The current build checks 18 independent GLB roots containing 106 placed instances, covering archive cities, the Great Bridge, all four expansion districts, stunt surfaces, cargo props, track pieces, and Motor Mile vehicles. Missing instances, unexpected roots, or zero-collider “ghosts” produce a main-menu warning.

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

Rally Park at `(0, -1700)`, Apex Autodrome at `(0, 1700)`, Freight Harbor at `(-2350, 0)`, and Mountain Pass at `(2350, 0)` extend the connected world to 5.4 km. All four receive the same roads, blocks, AI graph, minimap, navigation, race-course, culling, and collision systems as the archive districts.

Freight Harbor uses three separately audited ModKit GLB families—crate stacks, barrels, and pallets—on mesh-derived collision. Mountain Pass combines source-authored track straights with safe analytical side barriers, exact-mesh corner exhibits and a physical finish gantry. Flat track-tile ends are intentionally excluded from mesh collision so they cannot become invisible walls across the driving lane.
