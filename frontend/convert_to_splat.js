import * as THREE from 'three';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';
import fs from 'fs';

console.log("Starting conversion...");
const buffer = fs.readFileSync('public/outputs/reconstructions/my_fixed_model.ply');

// Read standard PLY manually to extract all fields since PLYLoader drops custom ones
// The header is text, the rest is binary
let header = '';
let offset = 0;
while (true) {
  const lineEnd = buffer.indexOf('\n', offset);
  if (lineEnd === -1) break;
  const line = buffer.toString('utf8', offset, lineEnd).trim();
  offset = lineEnd + 1;
  header += line + '\n';
  if (line === 'end_header') break;
}

console.log("Header parsed.");

// Parse properties
const lines = header.split('\n');
const properties = [];
let numVertices = 0;
for (const line of lines) {
  if (line.startsWith('element vertex ')) {
    numVertices = parseInt(line.split(' ')[2]);
  }
  if (line.startsWith('property ')) {
    const parts = line.split(' ');
    properties.push({ type: parts[1], name: parts[2] });
  }
}

console.log(`Found ${numVertices} vertices with ${properties.length} properties.`);

// Create splat buffer
const splatBuffer = new ArrayBuffer(32 * numVertices);
const splatFloat = new Float32Array(splatBuffer);
const splatUint8 = new Uint8Array(splatBuffer);

const dataView = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

// We need to find the byte offset for each property
let propertyOffsets = {};
let currentOffset = 0;
for (const prop of properties) {
  propertyOffsets[prop.name] = currentOffset;
  currentOffset += 4; // assuming all are float32
}
const stride = currentOffset;

console.log("Extracting colors to find min/max...");
let minColor = Infinity, maxColor = -Infinity;
for (let i = 0; i < numVertices; i++) {
  const baseOffset = offset + i * stride;
  const r = dataView.getFloat32(baseOffset + propertyOffsets['f_dc_0'], true);
  const g = dataView.getFloat32(baseOffset + propertyOffsets['f_dc_1'], true);
  const b = dataView.getFloat32(baseOffset + propertyOffsets['f_dc_2'], true);
  if (r < minColor) minColor = r; if (r > maxColor) maxColor = r;
  if (g < minColor) minColor = g; if (g > maxColor) maxColor = g;
  if (b < minColor) minColor = b; if (b > maxColor) maxColor = b;
}
const colorRange = maxColor - minColor || 1;

console.log("Building splat binary...");
for (let i = 0; i < numVertices; i++) {
  const baseOffset = offset + i * stride;
  
  // Pos
  const x = dataView.getFloat32(baseOffset + propertyOffsets['x'], true);
  const y = dataView.getFloat32(baseOffset + propertyOffsets['y'], true);
  const z = dataView.getFloat32(baseOffset + propertyOffsets['z'], true);
  
  // Scale
  const sx = Math.exp(dataView.getFloat32(baseOffset + propertyOffsets['scale_0'], true));
  const sy = Math.exp(dataView.getFloat32(baseOffset + propertyOffsets['scale_1'], true));
  const sz = Math.exp(dataView.getFloat32(baseOffset + propertyOffsets['scale_2'], true));
  
  // Color
  const r = dataView.getFloat32(baseOffset + propertyOffsets['f_dc_0'], true);
  const g = dataView.getFloat32(baseOffset + propertyOffsets['f_dc_1'], true);
  const b = dataView.getFloat32(baseOffset + propertyOffsets['f_dc_2'], true);
  const cr = Math.floor(Math.max(0, Math.min(1, (r - minColor) / colorRange)) * 255);
  const cg = Math.floor(Math.max(0, Math.min(1, (g - minColor) / colorRange)) * 255);
  const cb = Math.floor(Math.max(0, Math.min(1, (b - minColor) / colorRange)) * 255);
  
  // Opacity
  let opacity = dataView.getFloat32(baseOffset + propertyOffsets['opacity'], true);
  opacity = 1 / (1 + Math.exp(-opacity));
  const ca = Math.floor(opacity * 255);
  
  // Rot
  const rw = dataView.getFloat32(baseOffset + propertyOffsets['rot_0'], true);
  const rx = dataView.getFloat32(baseOffset + propertyOffsets['rot_1'], true);
  const ry = dataView.getFloat32(baseOffset + propertyOffsets['rot_2'], true);
  const rz = dataView.getFloat32(baseOffset + propertyOffsets['rot_3'], true);
  
  // Normalize rot
  let length = Math.sqrt(rw*rw + rx*rx + ry*ry + rz*rz);
  if (length === 0) length = 1;
  const nw = rw / length; const nx = rx / length; const ny = ry / length; const nz = rz / length;
  
  const splatIdx = i * 32;
  splatFloat[splatIdx/4 + 0] = x;
  splatFloat[splatIdx/4 + 1] = y;
  splatFloat[splatIdx/4 + 2] = z;
  splatFloat[splatIdx/4 + 3] = sx;
  splatFloat[splatIdx/4 + 4] = sy;
  splatFloat[splatIdx/4 + 5] = sz;
  
  splatUint8[splatIdx + 24] = cr;
  splatUint8[splatIdx + 25] = cg;
  splatUint8[splatIdx + 26] = cb;
  splatUint8[splatIdx + 27] = ca;
  
  splatUint8[splatIdx + 28] = Math.max(0, Math.min(255, Math.round(nw * 128 + 128)));
  splatUint8[splatIdx + 29] = Math.max(0, Math.min(255, Math.round(nx * 128 + 128)));
  splatUint8[splatIdx + 30] = Math.max(0, Math.min(255, Math.round(ny * 128 + 128)));
  splatUint8[splatIdx + 31] = Math.max(0, Math.min(255, Math.round(nz * 128 + 128)));
}

fs.writeFileSync('public/outputs/reconstructions/my_fixed_model.splat', Buffer.from(splatBuffer));
console.log("Done! Wrote my_fixed_model.splat");
