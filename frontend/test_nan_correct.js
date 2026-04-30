import fs from 'fs';
const buffer = fs.readFileSync('public/outputs/reconstructions/my_fixed_model.splat');
const floatView = new Float32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 4);

let hasNaN = false;
for (let i = 0; i < floatView.length; i += 8) {
  for (let j = 0; j < 6; j++) {
    if (Number.isNaN(floatView[i+j]) || !Number.isFinite(floatView[i+j])) {
      hasNaN = true;
      console.log(`Found invalid float at index ${i+j}: ${floatView[i+j]}`);
      break;
    }
  }
}
console.log(`Has NaN/Inf: ${hasNaN}`);
