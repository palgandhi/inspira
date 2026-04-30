import fs from 'fs';
const buffer = fs.readFileSync('public/outputs/reconstructions/my_fixed_model.splat');
const floatView = new Float32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 4);

let minX = Infinity, maxX = -Infinity;
let minY = Infinity, maxY = -Infinity;
let minZ = Infinity, maxZ = -Infinity;

for (let i = 0; i < floatView.length; i += 8) {
  const x = floatView[i];
  const y = floatView[i+1];
  const z = floatView[i+2];
  
  if (x < minX) minX = x; if (x > maxX) maxX = x;
  if (y < minY) minY = y; if (y > maxY) maxY = y;
  if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
}

console.log(`X: ${minX.toFixed(2)} to ${maxX.toFixed(2)}`);
console.log(`Y: ${minY.toFixed(2)} to ${maxY.toFixed(2)}`);
console.log(`Z: ${minZ.toFixed(2)} to ${maxZ.toFixed(2)}`);
