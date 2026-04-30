import * as THREE from 'three';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';
import fs from 'fs';

const loader = new PLYLoader();
loader.setPropertyNameMapping({
  'f_rest_0': 'red',
  'f_rest_1': 'green',
  'f_rest_2': 'blue'
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
console.log('f_rest_0-2 Min:', min, 'Max:', max);
