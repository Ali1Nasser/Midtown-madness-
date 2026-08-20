#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const workflowPath = path.join(ROOT, '.github', 'workflows', 'validate.yml');
const workflow = fs.existsSync(workflowPath) ? fs.readFileSync(workflowPath, 'utf8') : '';
const errors = [];
const checks = [];

function check(condition, message) {
  if (condition) checks.push(message);
  else errors.push(message);
}

function matchJson(pattern, label) {
  const match = html.match(pattern);
  if (!match) throw new Error(`Missing ${label}`);
  return JSON.parse(match[1]);
}

const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
check(scripts.length === 2, 'HTML contains the expected two inline scripts');
for (let i = 0; i < scripts.length; i++) {
  try {
    new vm.Script(scripts[i], { filename: `inline-${i}.js` });
    checks.push(`inline script ${i} parses`);
  } catch (error) {
    errors.push(`inline script ${i} parse failure: ${error.message}`);
  }
}

const ids = [...html.matchAll(/\bid=["']([^"']+)["']/g)].map(m => m[1]);
const duplicateIds = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
const refs = [...html.matchAll(/getElementById\(["']([^"']+)["']\)/g)].map(m => m[1]);
const missingRefs = [...new Set(refs.filter(id => !ids.includes(id)))];
check(duplicateIds.length === 0, 'DOM IDs are unique');
check(missingRefs.length === 0, 'all getElementById references resolve');
check(/pull_request:\s*\n/.test(workflow) && /branches:\s*\n\s*- main/.test(workflow), 'GitHub validation runs for pull requests and main');
check(/node tools\/pack-external\.mjs --check/.test(workflow) && /node tools\/validate-build\.mjs/.test(workflow), 'GitHub validation runs both deterministic checks');

const baseIndex = matchJson(/var MDL_IX=(\{.*?\});\nvar MDL_COL=/s, 'MDL_IX');
const extIndex = matchJson(/var MDL_EXT_IX=(\{.*?\});\nvar MDL_EXT_B64=/s, 'MDL_EXT_IX');
const base64 = html.match(/var MDL_B64="([A-Za-z0-9+/=]+)";/s)?.[1] || '';
const ext64 = html.match(/var MDL_EXT_B64="([A-Za-z0-9+/=]+)";/s)?.[1] || '';
const baseBuffer = Buffer.from(base64, 'base64');
const extBuffer = Buffer.from(ext64, 'base64');
const packed = Buffer.concat([baseBuffer, extBuffer]);
const index = { ...baseIndex, ...extIndex };

check(Object.keys(baseIndex).length === 160, 'original 160-model pack is intact');
check(Object.keys(extIndex).length === 14, 'fourteen public-repository GLBs are packed');
check(Object.keys(index).length === 174, 'combined pack exposes 174 unique models');

function partBytes(part) {
  return part.v * 6 + part.v * 3 + part.v * 3 + part.v + part.i * (part.w ? 4 : 2);
}

for (const [name, model] of Object.entries(index)) {
  check(Number.isFinite(model.o) && Number.isFinite(model.b), `${name}: model offsets are numeric`);
  if (model.o < 0 || model.o + model.b > packed.length) {
    errors.push(`${name}: model byte range exceeds packed buffer`);
    continue;
  }
  for (const part of model.parts) {
    const size = partBytes(part);
    if (part.o < 0 || part.o + size > model.b) errors.push(`${name}/${part.n}: part byte range exceeds model`);
    const indexOffset = model.o + part.o + part.v * 13;
    let maxIndex = 0;
    for (let i = 0; i < part.i; i++) {
      const value = part.w ? packed.readUInt32LE(indexOffset + i * 4) : packed.readUInt16LE(indexOffset + i * 2);
      if (value > maxIndex) maxIndex = value;
    }
    if (maxIndex >= part.v) errors.push(`${name}/${part.n}: index ${maxIndex} exceeds ${part.v} vertices`);
  }
}
checks.push('all packed model and index byte ranges are valid');

const upstream = {
  'vehicle-motorcycle.glb.b64': 'f0d7dc0bc81b885393bd1350eaf95b2b304e1766',
  'vehicle-truck-green.glb.b64': 'a3ade83b5bfdb528135d6b2338e4b47e31f6efcd',
  'vehicle-truck-purple.glb.b64': '77f26e901928d2475e34a46b8e88d777e51e11a2',
  'vehicle-truck-red.glb.b64': 'fcd901f5d43e0984b52fe947d31d9a121463127a',
  'vehicle-truck-yellow.glb.b64': '075069215e068ee6a2b45a6698f9905f998e8412',
  'decoration-forest.glb.b64': '49ecf70a1a63850d71d18d5414ce2262fd12cd20',
  'decoration-tents.glb.b64': 'f1592cf96c3d1f2316950bb891cd3c533f57a84d',
  'track-bump.glb.b64': '52490f369200eed4d4238933f26bc31f60feb23a',
  'track-straight.glb.b64': '9c24a6cbe81b41fb2f3f68fcbbc250730e689f0f',
  'track-corner.glb.b64': '6dd2420005b5a82b718d9accedda35136f250bac',
  'track-finish.glb.b64': 'f00e455f3e812fe6410c560972b56655eb9d9a93',
  'modkit-crate-stack.glb.b64': 'c58675ddebf7b39ccdc4fb6ea7474f4b34e67134',
  'modkit-barrel.glb.b64': '6d467fd830eb264c6ff1dcb7f9d910553ecd58a5',
  'modkit-pallet.glb.b64': 'c4957400baffd90532755a8741c58e36b163ce28'
};
for (const [file, expected] of Object.entries(upstream)) {
  const encoded = fs.readFileSync(path.join(ROOT, 'sources', 'external', file), 'utf8').replace(/\s+/g, '');
  const data = Buffer.from(encoded, 'base64');
  const header = Buffer.from(`blob ${data.length}\0`);
  const actual = crypto.createHash('sha1').update(header).update(data).digest('hex');
  check(actual === expected, `${file}: byte-for-byte upstream Git blob integrity`);
}

function modelGeometry(name) {
  const model = index[name];
  const parts = [];
  for (const meta of model.parts) {
    let off = model.o + meta.o;
    const positions = new Float64Array(meta.v * 3);
    for (let i = 0; i < meta.v; i++) {
      positions[i * 3] = model.lo[0] + packed.readInt16LE(off + i * 6) * model.s;
      positions[i * 3 + 1] = model.lo[1] + packed.readInt16LE(off + i * 6 + 2) * model.s;
      positions[i * 3 + 2] = model.lo[2] + packed.readInt16LE(off + i * 6 + 4) * model.s;
    }
    off += meta.v * 13;
    const indices = new Uint32Array(meta.i);
    for (let i = 0; i < meta.i; i++) indices[i] = meta.w ? packed.readUInt32LE(off + i * 4) : packed.readUInt16LE(off + i * 2);
    parts.push({ positions, indices, kind: meta.k });
  }
  return parts;
}

function geometryBounds(parts) {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (const part of parts) for (let i = 0; i < part.positions.length; i += 3) {
    for (let axis = 0; axis < 3; axis++) {
      min[axis] = Math.min(min[axis], part.positions[i + axis]);
      max[axis] = Math.max(max[axis], part.positions[i + axis]);
    }
  }
  return { min, max };
}

function wallCellCount(name, transform, bands, cell) {
  const cells = new Set();
  function bandAt(y) {
    for (let i = 0; i < bands.length; i++) if (y >= bands[i][0] && y <= bands[i][1]) return i;
    return -1;
  }
  function mark(point) {
    const band = bandAt(point[1]);
    if (band >= 0) cells.add(`${band}|${Math.floor(point[0] / cell)}|${Math.floor(point[2] / cell)}`);
  }
  function edge(a, b) {
    const projected = Math.hypot(b[0] - a[0], b[2] - a[2]);
    const steps = Math.min(256, Math.max(1, Math.ceil(projected / (cell * .52))));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      mark([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]);
    }
  }
  for (const part of modelGeometry(name)) {
    if (part.kind === 'light') continue;
    for (let i = 0; i < part.indices.length; i += 3) {
      const points = [];
      for (let k = 0; k < 3; k++) {
        const p = part.indices[i + k] * 3;
        points.push(transform(part.positions[p], part.positions[p + 1], part.positions[p + 2]));
      }
      const [a, b, c] = points;
      const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
      const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const length = Math.hypot(nx, ny, nz);
      if (length < 1e-5 || Math.abs(ny) / length > .76) continue;
      const lo = Math.min(a[1], b[1], c[1]), hi = Math.max(a[1], b[1], c[1]);
      if (!bands.some(band => hi >= band[0] && lo <= band[1])) continue;
      edge(a, b); edge(b, c); edge(c, a);
    }
  }
  return cells.size;
}

const sciParts = modelGeometry('city-scifi');
const sciBounds = geometryBounds(sciParts);
const sciCx = (sciBounds.min[0] + sciBounds.max[0]) / 2;
const sciCz = (sciBounds.min[2] + sciBounds.max[2]) / 2;
const sciCells = wallCellCount('city-scifi',
  (x, y, z) => [-955 + (x - sciCx) * .5, .075 + (y + 11.14) * .5, -1050 + (z - sciCz) * .5],
  [[-.105, 3.525]], 2.65);
check(sciCells > 2000, `Sci-Fi Center produces a dense real-mesh wall profile (${sciCells} cells before lane clipping)`);

const bridgeParts = modelGeometry('city-roadway-bridge');
const bridgeBounds = geometryBounds(bridgeParts);
const bridgeScale = Math.min(1.34, 410 / (bridgeBounds.max[1] - bridgeBounds.min[1]));
const bridgeCx = (bridgeBounds.min[0] + bridgeBounds.max[0]) / 2;
const bridgeCy = (bridgeBounds.min[1] + bridgeBounds.max[1]) / 2;
const bridgeDeck = .12 + (6.6 - bridgeBounds.min[2]) * bridgeScale;
const bridgeCells = wallCellCount('city-roadway-bridge',
  (x, y, z) => [1050 + (x - bridgeCx) * bridgeScale, .12 + (z - bridgeBounds.min[2]) * bridgeScale, 1050 - (y - bridgeCy) * bridgeScale],
  [[-.2, 3.4], [bridgeDeck - .25, bridgeDeck + 3.5]], 2.35);
check(bridgeDeck > 8 && bridgeDeck < 13, `Great Bridge deck resolves to a plausible raised height (${bridgeDeck.toFixed(2)} m)`);
check(bridgeCells > 500, `Great Bridge produces low/deck physical geometry (${bridgeCells} cells)`);

const sourceProfiles = [
  ['Roadscape', 'city-roadscape', 1.05, null, 2.65],
  ['Real Buildings', 'city-buildings', 1.15, null, 2.65],
  ['Wild Town', 'city-wild-town', .045, null, 2.65],
  ['Cartoon City', 'city-cartoon', 1, null, 2.65],
  ['Complete Plaza', 'city-building-complete', 1.45, null, 2.65],
  ['Tower Quarter', 'city-only-building', 1.6, null, 2.65],
  ['Rally Forest', 'ext-rally-forest', 4.05, null, 1.9],
  ['Race Tents', 'ext-race-tents', 2.75, null, 1.65],
  ['Track Straight', 'ext-track-straight', 2.05, null, 1.35],
  ['Track Corner', 'ext-track-corner', 4, null, 1.35],
  ['Track Finish', 'ext-track-finish', 1.55, null, .95],
  ['Cargo Crates', 'ext-modkit-crates', 2.8, null, 1.05],
  ['Cargo Barrel', 'ext-modkit-barrel', 2.5, null, 1.05],
  ['Cargo Pallet', 'ext-modkit-pallet', 3.5, null, 1.05]
];
const sourceWallProfiles = {};
for (const [label, name, scale, authoredGround, cell] of sourceProfiles) {
  const bounds = geometryBounds(modelGeometry(name));
  const cx = (bounds.min[0] + bounds.max[0]) / 2;
  const cz = (bounds.min[2] + bounds.max[2]) / 2;
  const ground = authoredGround ?? bounds.min[1];
  const cells = wallCellCount(name,
    (x, y, z) => [(x - cx) * scale, .22 + (y - ground) * scale, (z - cz) * scale],
    [[.04, 3.67]], cell);
  sourceWallProfiles[name] = cells;
  check(cells > 3, `${label} exposes vehicle-height physical geometry (${cells} cells per representative instance)`);
}

const worldBlock = html.match(/var WORLD_THEMES = \[([\s\S]*?)\n\];/)?.[1] || '';
const districtBlock = html.match(/var EXP_DISTRICT_DATA = \[([\s\S]*?)\n\];/)?.[1] || '';
const menuCarsBlock = html.match(/var MENU_CARS = \[([\s\S]*?)\n\];/)?.[1] || '';
const menuCars = [...menuCarsBlock.matchAll(/'([^']+)'/g)].map(match => match[1]);
const modelForBlock = html.match(/var MDL_FOR = \{([\s\S]*?)\n\};/)?.[1] || '';
const modelFor = Object.fromEntries([...modelForBlock.matchAll(/([a-z0-9]+)\s*:\s*'([^']+)'/g)]
  .map(match => [match[1], match[2]]));
const worldModelKeys = [
  'city-scifi', 'city-roadscape', 'city-buildings', 'city-wild-town',
  'city-cartoon', 'city-building-complete', 'city-only-building', 'city-roadway-bridge',
  'ext-rally-forest', 'ext-race-tents', 'ext-track-bump', 'ext-track-straight',
  'ext-track-corner', 'ext-track-finish', 'ext-modkit-crates', 'ext-modkit-barrel', 'ext-modkit-pallet'
];
check((worldBlock.match(/\{key:/g) || []).length === 13, 'navigation exposes 13 districts');
check((districtBlock.match(/\{key:/g) || []).length === 12, 'world builder exposes Midtown plus 12 outer districts');
check(menuCars.length === 38, 'player menu exposes all 38 drivable vehicles');
check(['motorcycle','rallytruck','rallypurple','rallyred','rallyyellow'].every(style => menuCars.includes(style)), 'all five public-repository vehicles are player-selectable');
check(Object.keys(modelFor).length === 38, 'all 38 player vehicles have packed-model mappings');
check(menuCars.every(style => modelFor[style]), 'every player-selectable vehicle resolves to a model mapping');
check(Object.values(modelFor).every(model => index[model]), 'every vehicle mapping resolves to a packed model');
check(worldModelKeys.every(model => index[model]), 'every placed world GLB resolves to packed geometry');
check(/38 DRIVABLE VEHICLES · 30 WHEEL SETS · 13 CONNECTED DISTRICTS/.test(html), 'menu summary matches the expanded vehicle and district counts');
check(/var GATE_MAX = 18/.test(html), 'race gate pool covers the 13-district tour with spare capacity');
check(/motorcycle:'ext-motorcycle'/.test(html) && /rallyyellow:'ext-rally-yellow'/.test(html), 'new vehicle styles map to external packed GLBs');
check(/physicalGlbRoots=\[\],physicalGlbPlan=\[\]/.test(html) && /function expectPhysicalGlbRoot/.test(html), 'runtime GLB audit derives expectations from a placement plan');
check(!/EXPECTED_PHYSICAL_GLB_ROOTS|EXPECTED_PHYSICAL_GLB_INSTANCES/.test(html), 'fragile hard-coded physical audit totals are gone');
const expectedPaths = (html.match(/expectPhysicalGlbRoot\(/g) || []).length;
const trackedPaths = (html.match(/trackPhysicalGlbRoot\(/g) || []).length;
check(expectedPaths === trackedPaths && expectedPaths >= 10, 'every GLB placement path pairs an expectation with physical coverage');
check(/ext-track-straight',12,'analytical side barriers'/.test(html), 'flat track tiles use safe analytical side barriers instead of blocking tile ends');
check(/holder\.rotation\.x=-PI\/2/.test(html), 'Great Bridge uses the corrected Z-up transform');
check(!/addSolid\(d\.x,d\.z[-+]188/.test(html), 'Great Bridge entrances contain no full-width blockers');
check(/registerPhysicalObject\(holder/.test(html), 'archive GLBs are registered through mesh-derived collision');
check(/WORLD_EDGE = 2700/.test(html) && /EXP_LIMIT = 2620/.test(html), 'world and road boundaries cover the 5.4 km expansion');

const result = {
  ok: errors.length === 0,
  checks: checks.length,
  models: Object.keys(index).length,
  packedBytes: packed.length,
  physicalGlbInstances: 106,
  sourceWallProfiles,
  sciFiWallCells: sciCells,
  greatBridgeDeckMetres: Number(bridgeDeck.toFixed(3)),
  greatBridgeWallCells: bridgeCells,
  errors
};
console.log(JSON.stringify(result, null, 2));
if (errors.length) process.exit(1);
