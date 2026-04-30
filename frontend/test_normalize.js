import * as THREE from 'three';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';
import fs from 'fs';

const loader = new PLYLoader();
loader.setPropertyNameMapping({
  'f_dc_0': 'red',
  'f_dc_1': 'green',
  'f_dc_2': 'blue'
});
const buffer = fs.readFileSync('public/outputs/reconstructions/my_fixed_model.ply');
const geometry = loader.parse(buffer.buffer);
const colors = geometry.attributes.color.array;

let min = Infinity;
let max = -Infinity;
for (let i = 0; i < colors.length; i++) {
  if (colors[i] < min) min = colors[i];
  if (colors[i] > max) max = colors[i];
}

const numPointsToLog = 10;
for (let i = 0; i < numPointsToLog; i++) {
  const r = (colors[i*3] - min) / (max - min);
  const g = (colors[i*3+1] - min) / (max - min);
  const b = (colors[i*3+2] - min) / (max - min);
  console.log(`RGB: ${r.toFixed(2)}, ${g.toFixed(2)}, ${b.toFixed(2)}`);
}
