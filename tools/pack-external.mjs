#!/usr/bin/env node
/**
 * Convert the small, licensed GLB additions in sources/external into the
 * compact vertex format used by index.html. No npm modules are required.
 *
 * By default the script writes JSON to stdout. Use --write to replace the
 * generated MDL_EXT_IX and MDL_EXT_B64 blocks in index.html, or --check to
 * verify that the checked-in single-file build is reproducible.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

const SOURCES = [
  { key: 'ext-motorcycle', file: 'vehicle-motorcycle.glb.b64', vehicle: true },
  { key: 'ext-rally-truck', file: 'vehicle-truck-green.glb.b64', vehicle: true },
  { key: 'ext-rally-purple', file: 'vehicle-truck-purple.glb.b64', vehicle: true },
  { key: 'ext-rally-red', file: 'vehicle-truck-red.glb.b64', vehicle: true },
  { key: 'ext-rally-yellow', file: 'vehicle-truck-yellow.glb.b64', vehicle: true },
  { key: 'ext-rally-forest', file: 'decoration-forest.glb.b64' },
  { key: 'ext-race-tents', file: 'decoration-tents.glb.b64' },
  { key: 'ext-track-bump', file: 'track-bump.glb.b64' },
  { key: 'ext-track-straight', file: 'track-straight.glb.b64' },
  { key: 'ext-track-corner', file: 'track-corner.glb.b64' },
  { key: 'ext-track-finish', file: 'track-finish.glb.b64' },
  { key: 'ext-modkit-crates', file: 'modkit-crate-stack.glb.b64' },
  { key: 'ext-modkit-barrel', file: 'modkit-barrel.glb.b64' },
  { key: 'ext-modkit-pallet', file: 'modkit-pallet.glb.b64' }
];

const COMPONENTS = {
  5120: { bytes: 1, get: 'getInt8', signed: true, max: 127 },
  5121: { bytes: 1, get: 'getUint8', max: 255 },
  5122: { bytes: 2, get: 'getInt16', signed: true, max: 32767 },
  5123: { bytes: 2, get: 'getUint16', max: 65535 },
  5125: { bytes: 4, get: 'getUint32', max: 4294967295 },
  5126: { bytes: 4, get: 'getFloat32', float: true }
};
const WIDTH = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16 };

function parseGlb(buf) {
  if (buf.toString('ascii', 0, 4) !== 'glTF') throw new Error('Not a GLB file');
  if (buf.readUInt32LE(4) !== 2) throw new Error('Only glTF 2.0 is supported');
  let json = null;
  let bin = null;
  for (let off = 12; off + 8 <= buf.length;) {
    const len = buf.readUInt32LE(off);
    const type = buf.readUInt32LE(off + 4);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 0x4e4f534a) json = JSON.parse(data.toString('utf8').replace(/\0+$/g, '').trim());
    if (type === 0x004e4942) bin = data;
    off += 8 + len;
  }
  if (!json || !bin) throw new Error('GLB is missing JSON or BIN data');
  return { json, bin };
}

function accessorReader(doc, bin, accessorIndex) {
  const a = doc.accessors[accessorIndex];
  const view = doc.bufferViews[a.bufferView];
  const info = COMPONENTS[a.componentType];
  const width = WIDTH[a.type];
  if (!info || !width) throw new Error(`Unsupported accessor ${a.componentType}/${a.type}`);
  const stride = view.byteStride || info.bytes * width;
  const start = (view.byteOffset || 0) + (a.byteOffset || 0);
  const dv = new DataView(bin.buffer, bin.byteOffset, bin.byteLength);
  const little = true;
  function value(i, c) {
    const byte = start + i * stride + c * info.bytes;
    let v = dv[info.get](byte, little);
    if (a.normalized && !info.float) {
      if (info.signed) v = Math.max(-1, v / info.max);
      else v /= info.max;
    }
    return v;
  }
  return { accessor: a, width, value };
}

function identity() {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}

function multiply(a, b) {
  const out = new Array(16).fill(0);
  for (let col = 0; col < 4; col++) for (let row = 0; row < 4; row++) {
    let sum = 0;
    for (let k = 0; k < 4; k++) sum += a[k * 4 + row] * b[col * 4 + k];
    out[col * 4 + row] = sum;
  }
  return out;
}

function trsMatrix(node) {
  if (node.matrix) return node.matrix.slice();
  const t = node.translation || [0, 0, 0];
  const q = node.rotation || [0, 0, 0, 1];
  const s = node.scale || [1, 1, 1];
  const [x, y, z, w] = q;
  const x2 = x + x, y2 = y + y, z2 = z + z;
  const xx = x * x2, xy = x * y2, xz = x * z2;
  const yy = y * y2, yz = y * z2, zz = z * z2;
  const wx = w * x2, wy = w * y2, wz = w * z2;
  return [
    (1 - (yy + zz)) * s[0], (xy + wz) * s[0], (xz - wy) * s[0], 0,
    (xy - wz) * s[1], (1 - (xx + zz)) * s[1], (yz + wx) * s[1], 0,
    (xz + wy) * s[2], (yz - wx) * s[2], (1 - (xx + yy)) * s[2], 0,
    t[0], t[1], t[2], 1
  ];
}

function point(m, p) {
  return [
    m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12],
    m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13],
    m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]
  ];
}

function direction(m, n) {
  const v = [
    m[0] * n[0] + m[4] * n[1] + m[8] * n[2],
    m[1] * n[0] + m[5] * n[1] + m[9] * n[2],
    m[2] * n[0] + m[6] * n[1] + m[10] * n[2]
  ];
  const len = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / len, v[1] / len, v[2] / len];
}

function materialColour(doc, primitive) {
  const mat = primitive.material === undefined ? null : doc.materials?.[primitive.material];
  const pbr = mat?.pbrMetallicRoughness;
  const c = pbr?.baseColorFactor || [0.72, 0.75, 0.78, 1];
  return [c[0], c[1], c[2], c[3] ?? 1];
}

function classify(name, materialName, vehicle) {
  const text = `${name || ''} ${materialName || ''}`.toLowerCase();
  if (/wheel|tyre|tire/.test(text)) return 'wheel';
  if (/glass|window|windscreen|windshield/.test(text)) return 'glass';
  if (/light|lamp|emissive|headlight|taillight/.test(text)) return 'light';
  if (/metal|chrome|rim|exhaust/.test(text)) return 'metal';
  if (vehicle && /body|paint|chassis|vehicle|motorcycle|truck/.test(text)) return 'paint';
  return 'solid';
}

function sanitiseName(value) {
  return String(value || 'part').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 72) || 'part';
}

function ensureNormals(part) {
  if (part.hasNormals) return;
  part.normals = new Array(part.positions.length).fill(0);
  for (let i = 0; i < part.indices.length; i += 3) {
    const ia = part.indices[i] * 3, ib = part.indices[i + 1] * 3, ic = part.indices[i + 2] * 3;
    const ax = part.positions[ia], ay = part.positions[ia + 1], az = part.positions[ia + 2];
    const ux = part.positions[ib] - ax, uy = part.positions[ib + 1] - ay, uz = part.positions[ib + 2] - az;
    const vx = part.positions[ic] - ax, vy = part.positions[ic + 1] - ay, vz = part.positions[ic + 2] - az;
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    for (const p of [ia, ib, ic]) {
      part.normals[p] += nx; part.normals[p + 1] += ny; part.normals[p + 2] += nz;
    }
  }
  for (let i = 0; i < part.normals.length; i += 3) {
    const len = Math.hypot(part.normals[i], part.normals[i + 1], part.normals[i + 2]) || 1;
    part.normals[i] /= len; part.normals[i + 1] /= len; part.normals[i + 2] /= len;
  }
}

function extractModel(buf, config) {
  const { json: doc, bin } = parseGlb(buf);
  const groups = new Map();
  const sceneIndex = doc.scene ?? 0;
  const roots = doc.scenes?.[sceneIndex]?.nodes || doc.nodes.map((_, i) => i);

  function appendPrimitive(nodeIndex, primitive, matrix, primitiveIndex) {
    if (primitive.mode !== undefined && primitive.mode !== 4) return;
    if (primitive.attributes?.POSITION === undefined) return;
    const node = doc.nodes[nodeIndex];
    const mesh = doc.meshes[node.mesh];
    const materialName = primitive.material === undefined ? '' : doc.materials?.[primitive.material]?.name || '';
    const sourceName = node.name || mesh.name || `node-${nodeIndex}`;
    const kind = classify(sourceName, materialName, config.vehicle);
    const wheelName = kind === 'wheel' ? sanitiseName(sourceName) : kind;
    const key = kind === 'wheel' ? `${kind}:${wheelName}` : kind;
    let part = groups.get(key);
    if (!part) {
      part = { name: wheelName, kind, positions: [], normals: [], colours: [], paint: [], indices: [], hasNormals: true };
      groups.set(key, part);
    }

    const pos = accessorReader(doc, bin, primitive.attributes.POSITION);
    const nrm = primitive.attributes.NORMAL === undefined ? null : accessorReader(doc, bin, primitive.attributes.NORMAL);
    const col = primitive.attributes.COLOR_0 === undefined ? null : accessorReader(doc, bin, primitive.attributes.COLOR_0);
    const base = materialColour(doc, primitive);
    const first = part.positions.length / 3;

    for (let i = 0; i < pos.accessor.count; i++) {
      const p = point(matrix, [pos.value(i, 0), pos.value(i, 1), pos.value(i, 2)]);
      part.positions.push(p[0], p[1], p[2]);
      if (nrm) {
        const n = direction(matrix, [nrm.value(i, 0), nrm.value(i, 1), nrm.value(i, 2)]);
        part.normals.push(n[0], n[1], n[2]);
      } else {
        part.hasNormals = false;
        part.normals.push(0, 0, 0);
      }
      const cr = col ? col.value(i, 0) : 1;
      const cg = col ? col.value(i, 1) : 1;
      const cb = col ? col.value(i, 2) : 1;
      part.colours.push(cr * base[0], cg * base[1], cb * base[2]);
      part.paint.push(kind === 'paint' ? 1 : 0);
    }

    if (primitive.indices !== undefined) {
      const idx = accessorReader(doc, bin, primitive.indices);
      for (let i = 0; i < idx.accessor.count; i++) part.indices.push(first + idx.value(i, 0));
    } else {
      for (let i = 0; i < pos.accessor.count; i++) part.indices.push(first + i);
    }
  }

  function walk(index, parent) {
    const node = doc.nodes[index];
    const matrix = multiply(parent, trsMatrix(node));
    if (node.mesh !== undefined) {
      const mesh = doc.meshes[node.mesh];
      mesh.primitives.forEach((primitive, pi) => appendPrimitive(index, primitive, matrix, pi));
    }
    for (const child of node.children || []) walk(child, matrix);
  }
  for (const root of roots) walk(root, identity());

  const parts = [...groups.values()].filter(p => p.positions.length && p.indices.length);
  for (const part of parts) ensureNormals(part);
  if (!parts.length) throw new Error(`No triangle geometry in ${config.file}`);
  return parts;
}

function writeInt16LE(array, value) {
  const b = Buffer.allocUnsafe(2); b.writeInt16LE(value); array.push(b);
}

function packModel(parts, absoluteOffset) {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (const part of parts) for (let i = 0; i < part.positions.length; i += 3) {
    for (let a = 0; a < 3; a++) {
      min[a] = Math.min(min[a], part.positions[i + a]);
      max[a] = Math.max(max[a], part.positions[i + a]);
    }
  }
  const centre = min.map((v, i) => (v + max[i]) * 0.5);
  const scale = Math.max(max[0] - min[0], max[1] - min[1], max[2] - min[2], 1e-6) / 65534;
  const chunks = [];
  const metaParts = [];
  let localOffset = 0;

  for (const part of parts) {
    const v = part.positions.length / 3;
    const ic = part.indices.length;
    const wide = v > 65535 || Math.max(...part.indices) > 65535;
    const partChunks = [];
    for (let i = 0; i < part.positions.length; i++) {
      const axis = i % 3;
      const q = Math.max(-32767, Math.min(32767, Math.round((part.positions[i] - centre[axis]) / scale)));
      writeInt16LE(partChunks, q);
    }
    const normalBytes = Buffer.allocUnsafe(part.normals.length);
    for (let i = 0; i < part.normals.length; i++) normalBytes[i] = Math.round(Math.max(-1, Math.min(1, part.normals[i])) * 127) & 255;
    partChunks.push(normalBytes);
    const colourBytes = Buffer.allocUnsafe(part.colours.length);
    for (let i = 0; i < part.colours.length; i++) colourBytes[i] = Math.round(Math.max(0, Math.min(1, part.colours[i])) * 255);
    partChunks.push(colourBytes, Buffer.from(part.paint));
    const indexBytes = Buffer.allocUnsafe(ic * (wide ? 4 : 2));
    for (let i = 0; i < ic; i++) wide ? indexBytes.writeUInt32LE(part.indices[i], i * 4) : indexBytes.writeUInt16LE(part.indices[i], i * 2);
    partChunks.push(indexBytes);
    const packed = Buffer.concat(partChunks);
    metaParts.push({ n: part.name, k: part.kind, v, i: ic, w: wide ? 1 : 0, o: localOffset });
    chunks.push(packed);
    localOffset += packed.length;
  }
  return {
    entry: { lo: centre.map(v => Number(v.toFixed(8))), s: Number(scale.toPrecision(9)), parts: metaParts, o: absoluteOffset, b: localOffset },
    binary: Buffer.concat(chunks),
    bounds: { min, max, size: max.map((v, i) => v - min[i]) }
  };
}

function existingBinaryLength() {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const match = html.match(/var MDL_B64="([A-Za-z0-9+/=]+)";/s);
  if (!match) throw new Error('Could not find MDL_B64 in index.html');
  return Buffer.from(match[1], 'base64').length;
}

const baseOffset = existingBinaryLength();
const index = {};
const binaries = [];
const report = [];
let offset = baseOffset;

for (const source of SOURCES) {
  const encoded = fs.readFileSync(path.join(ROOT, 'sources', 'external', source.file), 'utf8').replace(/\s+/g, '');
  const glb = Buffer.from(encoded, 'base64');
  const parts = extractModel(glb, source);
  const packed = packModel(parts, offset);
  index[source.key] = packed.entry;
  binaries.push(packed.binary);
  offset += packed.binary.length;
  report.push({
    key: source.key,
    sourceBytes: glb.length,
    packedBytes: packed.binary.length,
    vertices: parts.reduce((n, p) => n + p.positions.length / 3, 0),
    triangles: parts.reduce((n, p) => n + p.indices.length / 3, 0),
    parts: packed.entry.parts.map(p => `${p.k}:${p.n}`),
    bounds: packed.bounds
  });
}

const output = { index, base64: Buffer.concat(binaries).toString('base64'), report };

if (process.argv.includes('--write')) {
  const htmlPath = path.join(ROOT, 'index.html');
  let html = fs.readFileSync(htmlPath, 'utf8');
  const indexPattern = /var MDL_EXT_IX=\{.*?\};\nvar MDL_EXT_B64=/s;
  const binaryPattern = /var MDL_EXT_B64="[A-Za-z0-9+/=]+";/s;
  if (!indexPattern.test(html) || !binaryPattern.test(html)) {
    throw new Error('Could not find generated external model blocks in index.html');
  }
  html = html.replace(indexPattern, `var MDL_EXT_IX=${JSON.stringify(output.index)};\nvar MDL_EXT_B64=`);
  html = html.replace(binaryPattern, `var MDL_EXT_B64="${output.base64}";`);
  fs.writeFileSync(htmlPath, html);
  console.log(JSON.stringify({
    ok: true,
    written: path.relative(ROOT, htmlPath),
    models: Object.keys(output.index).length,
    sourceBytes: report.reduce((total, item) => total + item.sourceBytes, 0),
    packedBytes: Buffer.concat(binaries).length
  }, null, 2));
} else if (process.argv.includes('--check')) {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const indexMatch = html.match(/var MDL_EXT_IX=(\{.*?\});\nvar MDL_EXT_B64=/s);
  const binaryMatch = html.match(/var MDL_EXT_B64="([A-Za-z0-9+/=]+)";/s);
  const problems = [];
  if (!indexMatch) problems.push('MDL_EXT_IX is missing from index.html');
  else if (JSON.stringify(JSON.parse(indexMatch[1])) !== JSON.stringify(output.index))
    problems.push('MDL_EXT_IX does not match the reproducible source pack');
  if (!binaryMatch) problems.push('MDL_EXT_B64 is missing from index.html');
  else if (binaryMatch[1] !== output.base64)
    problems.push('MDL_EXT_B64 does not match the reproducible source pack');
  const result = {
    ok: problems.length === 0,
    models: Object.keys(output.index).length,
    packedBytes: Buffer.concat(binaries).length,
    sourceBytes: report.reduce((total, item) => total + item.sourceBytes, 0),
    problems
  };
  console.log(JSON.stringify(result, null, 2));
  if (problems.length) process.exit(1);
} else {
  process.stdout.write(JSON.stringify(output));
}
