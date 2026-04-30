import fs from 'fs';
const buffer = fs.readFileSync('public/outputs/reconstructions/my_fixed_model.splat');
const floatView = new Float32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 4);

let hasNaN = false;
for (let i = 0; i < floatView.length; i++) {
  if (Number.isNaN(floatView[i]) || !Number.isFinite(floatView[i])) {
    hasNaN = true;
    console.log(`Found invalid float at index ${i}: ${floatView[i]}`);
    break;
  }
}
console.log(`Has NaN/Inf: ${hasNaN}`);
